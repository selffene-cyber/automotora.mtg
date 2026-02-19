// ============================================================
// API de Depósito para Subastas
// MTG Automotora - Endpoint para iniciar pago de depósito
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuctionById } from '@/lib/db/auctions';
import { getDb } from '@/lib/db/vehicles';
import { getPaymentByAuction } from '@/lib/db/payments';
import { initiateAuctionDeposit } from '@/lib/core/auction-transactions';

// Enable Edge runtime for Cloudflare Pages D1 bindings
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auctions/[id]/deposit
 * Inicia el proceso de pago de depósito para una subasta
 * 
 * Body:
 * {
 *   provider: 'webpay' | 'mercadopago' | 'mock' (opcional, default: 'mock')
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const auctionId = resolvedParams.id;

    // Validar que el ID de la subasta existe
    if (!auctionId) {
      return NextResponse.json(
        { error: 'ID de subasta requerido' },
        { status: 400 }
      );
    }

    // Obtener el cuerpo de la petición
    let body: { provider?: 'webpay' | 'mercadopago' | 'mock' } = {};
    try {
      body = await request.json();
    } catch {
      // Si no hay body, usar valores por defecto
    }

    const provider = body.provider || 'mock';

    // Obtener la subasta
    const auction = await getAuctionById(auctionId);
    if (!auction) {
      return NextResponse.json(
        { error: 'Subasta no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la subasta está en estado correcto
    if (auction.status !== 'ended_pending_payment') {
      return NextResponse.json(
        { 
          error: `La subasta no acepta depósitos en su estado actual: ${auction.status}`,
          current_status: auction.status,
          allowed_status: 'ended_pending_payment'
        },
        { status: 400 }
      );
    }

    // Verificar si ya existe un pago completado
    const existingPayment = await getPaymentByAuction(auctionId);
    if (existingPayment && existingPayment.status === 'completed') {
      return NextResponse.json(
        { 
          error: 'Ya existe un pago confirmado para esta subasta',
          payment: {
            id: existingPayment.id,
            status: existingPayment.status,
            amount: existingPayment.amount,
            confirmed_at: existingPayment.confirmed_at
          }
        },
        { status: 409 }
      );
    }

    // Iniciar el proceso de depósito
    const db = getDb();
    const result = await initiateAuctionDeposit(
      db,
      auctionId,
      provider
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      message: 'Depósito iniciado correctamente',
      data: {
        auction_id: auctionId,
        payment_id: result.paymentId,
        idempotency_key: result.idempotencyKey,
        amount: (auction as any).final_price || auction.starting_price,
        currency: 'CLP',
        provider,
        payment_url: result.paymentUrl,
        expires_at: result.expiresAt,
        status: 'pending'
      }
    });

  } catch (error: any) {
    console.error('[Deposit API] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auctions/[id]/deposit
 * Obtiene el estado del depósito de una subasta
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const auctionId = resolvedParams.id;

    if (!auctionId) {
      return NextResponse.json(
        { error: 'ID de subasta requerido' },
        { status: 400 }
      );
    }

    // Obtener la subasta
    const auction = await getAuctionById(auctionId);
    if (!auction) {
      return NextResponse.json(
        { error: 'Subasta no encontrada' },
        { status: 404 }
      );
    }

    // Obtener el pago existente (si hay)
    const payment = await getPaymentByAuction(auctionId);

    // Verificar si la subasta acepta depósitos
    const canDeposit = auction.status === 'ended_pending_payment' && 
      (!payment || payment.status !== 'completed');

    return NextResponse.json({
      success: true,
      data: {
        auction_id: auctionId,
        auction_status: auction.status,
        can_deposit: canDeposit,
        payment: payment ? {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          provider: payment.provider,
          idempotency_key: payment.idempotency_key,
          confirmed_at: payment.confirmed_at,
          created_at: payment.created_at
        } : null,
        payment_expires_at: auction.payment_expires_at,
        final_price: (auction as any).final_price || auction.starting_price
      }
    });

  } catch (error: any) {
    console.error('[Deposit API] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
