// ============================================================
// Auction Transactions - Atomic Operations
// MTG Automotora - Handles atomic transactions for auction winner confirmation
// ============================================================

import type { D1Database } from '@cloudflare/workers-types';
import type { Auction, AuctionStatus } from '@/types/auction';
import { getAuctionById, updateAuctionStatus } from '@/lib/db/auctions';
import { updateVehicleStatus } from '@/lib/db/vehicles';
import { 
  getPaymentByIdempotencyKey, 
  confirmPayment as confirmPaymentTransaction,
  getPaymentByAuction 
} from '@/lib/db/payments';

/**
 * Interfaz para el resultado de confirmar ganador
 */
export interface ConfirmWinnerResult {
  success: boolean;
  error?: string;
  reservation?: any;
  auction?: Auction;
}

/**
 * Confirma el pago del ganador de una subasta
 * Esta función debe ejecutarse dentro de una transacción atómica
 * 
 * @param db - Instancia de la base de datos D1
 * @param auctionId - ID de la subasta
 * @param paymentId - ID del pago confirmado
 * @returns Resultado de la operación
 */
export async function confirmAuctionWinner(
  db: D1Database,
  auctionId: string,
  paymentId: string
): Promise<ConfirmWinnerResult> {
  try {
    // 1. Obtener la subasta
    const auction = await getAuctionById(auctionId);
    if (!auction) {
      return { success: false, error: 'Subasta no encontrada' };
    }

    // 2. Verificar que la subasta está en estado pending_payment
    if (auction.status !== 'ended_pending_payment') {
      return { 
        success: false, 
        error: `La subasta no está en estado pendiente de pago. Estado actual: ${auction.status}` 
      };
    }

    // 3. Verificar que el pago está confirmado
    const payment = await getPaymentByIdempotencyKey(paymentId);
    if (!payment) {
      return { success: false, error: 'Pago no encontrado' };
    }

    if (payment.status !== 'completed') {
      return { success: false, error: 'El pago no está confirmado' };
    }

    // 4. Obtener la puja ganadora
    const winnerBid = await db.prepare(`
      SELECT * FROM bids 
      WHERE auction_id = ? AND is_winner = 1
      LIMIT 1
    `).bind(auctionId).first<any>();

    if (!winnerBid) {
      return { success: false, error: 'No se encontró la puja ganadora' };
    }

    // 5. Obtener información del ganador (puede ser user_id o datos del bidder)
    const winnerId = winnerBid.user_id || winnerBid.bidder_email || 'guest';
    const winnerName = winnerBid.bidder_name;
    const winnerPhone = winnerBid.bidder_phone;
    const winnerEmail = winnerBid.bidder_email;

    // 6. Generar reservation_id
    const reservationId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 7. Crear la reservación para el ganador
    // Usar el mismo amount del highest bid como monto de la reserva
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reservationAmount = (auction as any).final_price || winnerBid.amount;

    await db.prepare(`
      INSERT INTO reservations (
        id, vehicle_id, customer_name, customer_phone, customer_email,
        amount, status, source, idempotency_key, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'confirmed', 'auction_winner', ?, datetime('now', '+30 days'), ?, ?)
    `).bind(
      reservationId,
      auction.vehicle_id,
      winnerName,
      winnerPhone,
      winnerEmail || null,
      reservationAmount,
      `auction_${auctionId}_confirmed`,
      now,
      now
    ).run();

    // 8. Actualizar la subasta a estado closed_won
    await db.prepare(`
      UPDATE auctions 
      SET status = 'closed_won', 
          updated_at = ?
      WHERE id = ?
    `).bind(now, auctionId).run();

    // 9. Actualizar el vehículo a estado reserved (permanece reservado)
    await db.prepare(`
      UPDATE vehicles 
      SET status = 'reserved', 
          updated_at = ?
      WHERE id = ?
    `).bind(now, auction.vehicle_id).run();

    // 10. Registrar en audit_logs (si existe la tabla)
    try {
      await db.prepare(`
        INSERT INTO audit_logs (
          id, action, entity_type, entity_id, user_id, details, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        'auction_winner_confirmed',
        'auction',
        auctionId,
        winnerId,
        JSON.stringify({
          payment_id: paymentId,
          reservation_id: reservationId,
          amount: reservationAmount,
          winner_name: winnerName,
          winner_phone: winnerPhone
        }),
        now
      ).run();
    } catch (auditError) {
      // No fallar la transacción si el log falla
      console.warn('Failed to create audit log:', auditError);
    }

    // Obtener la subasta actualizada
    const updatedAuction = await getAuctionById(auctionId);

    return {
      success: true,
      reservation: {
        id: reservationId,
        vehicle_id: auction.vehicle_id,
        customer_name: winnerName,
        customer_phone: winnerPhone,
        customer_email: winnerEmail,
        amount: reservationAmount,
        status: 'confirmed',
        source: 'auction_winner'
      },
      auction: updatedAuction || undefined
    };

  } catch (error: any) {
    console.error('[confirmAuctionWinner] Error:', error);
    return { success: false, error: error.message || 'Error al confirmar el ganador' };
  }
}

/**
 * Cancela una subasta por falta de pago del ganador
 * 
 * @param db - Instancia de la base de datos D1
 * @param auctionId - ID de la subasta
 * @returns Resultado de la operación
 */
export async function cancelAuctionByNoPayment(
  db: D1Database,
  auctionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Obtener la subasta
    const auction = await getAuctionById(auctionId);
    if (!auction) {
      return { success: false, error: 'Subasta no encontrada' };
    }

    // 2. Verificar que la subasta está en estado pending_payment
    if (auction.status !== 'ended_pending_payment') {
      return { 
        success: false, 
        error: `La subasta no está en estado pendiente de pago. Estado actual: ${auction.status}` 
      };
    }

    const now = new Date().toISOString();

    // 3. Actualizar la subasta a estado closed_failed
    await db.prepare(`
      UPDATE auctions 
      SET status = 'closed_failed', 
          updated_at = ?
      WHERE id = ?
    `).bind(now, auctionId).run();

    // 4. Devolver el vehículo a publicado
    await db.prepare(`
      UPDATE vehicles 
      SET status = 'published', 
          updated_at = ?
      WHERE id = ?
    `).bind(now, auction.vehicle_id).run();

    // 5. Registrar en audit_logs
    try {
      await db.prepare(`
        INSERT INTO audit_logs (
          id, action, entity_type, entity_id, details, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        'auction_payment_expired',
        'auction',
        auctionId,
        JSON.stringify({
          reason: 'Winner did not complete payment within deadline',
          previous_status: 'ended_pending_payment',
          new_status: 'closed_failed'
        }),
        now
      ).run();
    } catch (auditError) {
      console.warn('Failed to create audit log:', auditError);
    }

    return { success: true };

  } catch (error: any) {
    console.error('[cancelAuctionByNoPayment] Error:', error);
    return { success: false, error: error.message || 'Error al cancelar la subasta' };
  }
}

/**
 * Inicia el proceso de depósito para una subasta
 * Crea la transacción de pago y el intento de pago
 * 
 * @param db - Instancia de la base de datos D1
 * @param auctionId - ID de la subasta
 * @param provider - Proveedor de pago (webpay, mercadopago, mock)
 * @returns Resultado con la información de pago
 */
export async function initiateAuctionDeposit(
  db: D1Database,
  auctionId: string,
  provider: 'webpay' | 'mercadopago' | 'mock' = 'mock'
): Promise<{
  success: boolean;
  error?: string;
  paymentId?: string;
  idempotencyKey?: string;
  paymentUrl?: string;
  expiresAt?: string;
}> {
  try {
    // 1. Obtener la subasta
    const auction = await getAuctionById(auctionId);
    if (!auction) {
      return { success: false, error: 'Subasta no encontrada' };
    }

    // 2. Verificar estado de la subasta
    if (auction.status !== 'ended_pending_payment') {
      return { 
        success: false, 
        error: `La subasta no acepta depósitos en su estado actual: ${auction.status}` 
      };
    }

    // 3. Verificar que no exista ya un pago completado
    const existingPayment = await getPaymentByAuction(auctionId);
    if (existingPayment && existingPayment.status === 'completed') {
      return { success: false, error: 'Ya existe un pago confirmado para esta subasta' };
    }

    // 4. Obtener el monto (precio final o puja más alta)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const amount = (auction as any).final_price || auction.starting_price;

    // 5. Generar idempotency_key único
    const idempotencyKey = `auction_deposit_${auctionId}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const paymentId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    // 6. Calcular expiración (30 minutos para completar el pago)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // 7. Crear la transacción de pago
    await db.prepare(`
      INSERT INTO payment_transactions (
        id, entity_type, entity_id, amount, currency, provider,
        idempotency_key, status, created_at, updated_at
      ) VALUES (?, 'auction_deposit', ?, ?, 'CLP', ?, ?, 'pending', ?, ?)
    `).bind(
      paymentId,
      auctionId,
      amount,
      provider,
      idempotencyKey,
      now,
      now
    ).run();

    // 8. Crear el intento de pago
    const attemptId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO auction_payment_attempts (
        id, auction_id, payment_transaction_id, amount, provider,
        status, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).bind(
      attemptId,
      auctionId,
      paymentId,
      amount,
      provider,
      expiresAt,
      now,
      now
    ).run();

    // 9. Generar URL de pago (simulada para mock)
    // En producción, esto redirigiría al gateway real
    const paymentUrl = provider === 'mock' 
      ? `/api/webhooks/payment?mock=true&idempotency_key=${idempotencyKey}&status=completed`
      : `https://payment-gateway.example.com/pay/${paymentId}`;

    // 10. Actualizar el intento con la URL de pago
    await db.prepare(`
      UPDATE auction_payment_attempts 
      SET payment_url = ?, updated_at = ?
      WHERE id = ?
    `).bind(paymentUrl, now, attemptId).run();

    return {
      success: true,
      paymentId,
      idempotencyKey,
      paymentUrl,
      expiresAt
    };

  } catch (error: any) {
    console.error('[initiateAuctionDeposit] Error:', error);
    return { success: false, error: error.message || 'Error al iniciar el depósito' };
  }
}
