// ============================================================
// Webhook de Pago
// MTG Automotora - Maneja notificaciones del gateway de pago
// Soporta: Reservas y Depósitos de Subastas
// ============================================================

import { NextRequest, NextResponse } from 'next/server'; 
import { 
  getReservationByIdempotencyKey, 
  confirmPayment,
  updateReservationStatus 
} from '@/lib/db/reservations';
import { getDb } from '@/lib/db/vehicles';
import { updateVehicleStatus } from '@/lib/db/vehicles';
import { canTransitionToPaid, isExpired } from '@/lib/core/reservation-guards';
import { getPaymentByIdempotencyKey, confirmPayment as confirmPaymentTransaction, getPaymentByAuction } from '@/lib/db/payments';
import { confirmAuctionWinner } from '@/lib/core/auction-transactions';
import { getAuctionById } from '@/lib/db/auctions';

// Enable Edge runtime for Cloudflare Pages D1 bindings
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Interfaz para el payload del webhook
 */
interface PaymentWebhookPayload {
  idempotency_key: string;
  payment_id: string;
  status: 'completed' | 'failed' | 'pending' | 'refunded';
  amount: number;
  currency?: string;
  metadata?: {
    vehicle_id?: string;
    reservation_id?: string;
    auction_id?: string;
    entity_type?: 'reservation' | 'auction_deposit';
  };
}

/**
 * Maneja el webhook para depósitos de subastas
 */
async function handleAuctionDepositWebhook(
  payload: PaymentWebhookPayload,
  existingPayment: any
) {
  // Extraer auction_id del idempotency_key o metadata
  const auctionId = payload.metadata?.auction_id || 
    payload.idempotency_key.split('_')[2];

  if (!auctionId) {
    return NextResponse.json(
      { error: 'ID de subasta no proporcionado' },
      { status: 400 }
    );
  }

  console.log('[Auction Deposit] Processing payment for auction:', auctionId);

  // Obtener la subasta para usar en todos los casos
  const auction = await getAuctionById(auctionId);

  // Verificar si el pago ya fue procesado (idempotency)
  if (existingPayment && existingPayment.status === 'completed') {
    console.log('[Auction Deposit] Payment already confirmed, returning 200 OK');
    return NextResponse.json({
      success: true,
      message: 'Pago ya confirmado (idempotent)',
      payment_id: existingPayment.id,
      status: 'completed'
    });
  }

  // Procesar según el estado del pago
  switch (payload.status) {
    case 'completed':
      // Confirmar el pago en la tabla de transacciones
      if (existingPayment) {
        await confirmPaymentTransaction(existingPayment.id, payload);
      }

      // Confirmar el ganador de la subasta (crea reserva + actualiza estados)
      const db = getDb();
      const winnerResult = await confirmAuctionWinner(db, auctionId, payload.idempotency_key);

      if (!winnerResult.success) {
        console.error('[Auction Deposit] Error confirming winner:', winnerResult.error);
        return NextResponse.json(
          { error: winnerResult.error },
          { status: 400 }
        );
      }

      console.log('[Auction Deposit] Winner confirmed:', winnerResult.reservation?.id);

      return NextResponse.json({
        success: true,
        auction_id: auctionId,
        payment_id: payload.payment_id,
        status: 'payment_completed',
        reservation: winnerResult.reservation,
        winner_confirmed: true
      });

     case 'failed':
      // El pago falló
      if (existingPayment) {
        await confirmPaymentTransaction(existingPayment.id, payload);
      }

      if (auction) {
        // Devolver vehículo a publicado
        await updateVehicleStatus(auction.vehicle_id, 'published');
      }

      console.log('[Auction Deposit] Payment failed for auction:', auctionId);

      return NextResponse.json({
        success: true,
        auction_id: auctionId,
        status: 'payment_failed'
      });

    case 'pending':
      console.log('[Auction Deposit] Payment pending for auction:', auctionId);
      return NextResponse.json({
        success: true,
        auction_id: auctionId,
        status: 'payment_pending'
      });

    case 'refunded':
      // El pago fue reembolsado
      if (existingPayment) {
        await confirmPaymentTransaction(existingPayment.id, payload);
      }

      if (auction) {
        await updateVehicleStatus(auction.vehicle_id, 'published');
      }

      return NextResponse.json({
        success: true,
        auction_id: auctionId,
        status: 'refunded'
      });

    default:
      return NextResponse.json(
        { error: 'Estado de pago desconocido' },
        { status: 400 }
      );
  }
}

/**
 * POST /api/webhooks/payment
 * Maneja notificaciones del gateway de pago
 * 
 * IMPORTANTE: 
 * - Solo confPayments con status 'completed' cambian el estado
 * - Se valida idempotency key para evitar procesamientos duplicados
 * - Soporta tanto reservas como depósitos de subastas
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar que es una petición legítima (en producción, verificar signature)
    const signature = request.headers.get('x-webhook-signature');
    if (!signature) {
      console.warn('Webhook sin firma');
      // En desarrollo permitimos sin firma, en producción requerir
    }

    const payload: PaymentWebhookPayload = await request.json();

    // Validar campos requeridos
    if (!payload.idempotency_key || !payload.payment_id || !payload.status) {
      return NextResponse.json(
        { error: 'Payload inválido: faltan campos requeridos' },
        { status: 400 }
      );
    }

    console.log('Webhook de pago recibido:', {
      idempotency_key: payload.idempotency_key,
      payment_id: payload.payment_id,
      status: payload.status,
      amount: payload.amount,
      metadata: payload.metadata
    });

    // Determinar el tipo de entidad
    const entityType = payload.metadata?.entity_type || 
      (payload.idempotency_key.startsWith('auction_deposit_') ? 'auction_deposit' : 'reservation');

    // ============================================
    // MANEJO DE DEPOSITO DE SUBASTA
    // ============================================
    if (entityType === 'auction_deposit' || payload.idempotency_key.startsWith('auction_deposit_')) {
      // Buscar si existe la transacción de pago
      const existingPayment = await getPaymentByIdempotencyKey(payload.idempotency_key);
      return await handleAuctionDepositWebhook(payload, existingPayment);
    }

    // ============================================
    // MANEJO DE RESERVA (original)
    // ============================================

    // Buscar la reserva por idempotency key
    const reservation = await getReservationByIdempotencyKey(payload.idempotency_key);

    if (!reservation) {
      console.warn('Reserva no encontrada para idempotency_key:', payload.idempotency_key);
      // En producción, retornar 200 para no reintentar
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la reserva no ha expirado
    if (isExpired(reservation.expires_at)) {
      console.warn('Reserva expirada:', reservation.id);
      return NextResponse.json(
        { error: 'Reserva expirada' },
        { status: 400 }
      );
    }

    // Verificar si la transición es válida
    if (!canTransitionToPaid(reservation.status)) {
      console.warn('Transición inválida:', reservation.status, '-> paid');
      return NextResponse.json(
        { 
          error: 'La reserva no puede recibir pagos en su estado actual',
          current_status: reservation.status 
        },
        { status: 400 }
      );
    }

    // Procesar según el estado del pago
    switch (payload.status) {
      case 'completed':
        // Confirmar el pago
        const updatedReservation = await confirmPayment(
          reservation.id,
          payload.payment_id
        );

        // Actualizar estado del vehículo a 'reserved'
        if (updatedReservation) {
          await updateVehicleStatus(reservation.vehicle_id, 'reserved');
          
          console.log('Pago confirmado para reserva:', reservation.id);
          
          return NextResponse.json({
            success: true,
            reservation_id: reservation.id,
            payment_id: payload.payment_id,
            status: 'paid',
            vehicle_status: 'reserved'
          });
        }
        break;

      case 'failed':
        // El pago falló, marcar la reserva como cancelada
        await updateReservationStatus(reservation.id, 'cancelled');
        
        // Liberar el vehículo
        await updateVehicleStatus(reservation.vehicle_id, 'published');
        
        console.log('Pago fallido para reserva:', reservation.id);

        return NextResponse.json({
          success: true,
          reservation_id: reservation.id,
          status: 'payment_failed',
          vehicle_status: 'published'
        });

      case 'pending':
        // El pago está pendiente, no hacemos nada
        console.log('Pago pendiente para reserva:', reservation.id);

        return NextResponse.json({
          success: true,
          reservation_id: reservation.id,
          status: 'payment_pending'
        });

      case 'refunded':
        // El pago fue reembolsado
        await updateReservationStatus(reservation.id, 'refunded');
        
        // Liberar el vehículo
        await updateVehicleStatus(reservation.vehicle_id, 'published');
        
        console.log('Pago reembolsado para reserva:', reservation.id);

        return NextResponse.json({
          success: true,
          reservation_id: reservation.id,
          status: 'refunded',
          vehicle_status: 'published'
        });

      default:
        console.warn('Estado de pago desconocido:', payload.status);
        return NextResponse.json(
          { error: 'Estado de pago desconocido' },
          { status: 400 }
        );
    }

    return NextResponse.json(
      { error: 'Error procesando el webhook' },
      { status: 500 }
    );

  } catch (error) {
    console.error('Error procesando webhook de pago:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/payment
 * Health check para el webhook
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Payment webhook endpoint is running',
    timestamp: new Date().toISOString()
  });
}
