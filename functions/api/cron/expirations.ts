// Manejador de cron para expiraciones automáticas
// Cron handler for automatic expirations

import { atomicExpireReservation } from '../../../lib/core/atomic-transactions';
import type { D1Database } from '@cloudflare/workers-types';

// ============================================
// AUCTION CRON FUNCTIONS - Funciones de Cron para Subastas
// ============================================

/**
 * Cierra subastas que han terminado y transiciona a ended_pending_payment
 * Closes auctions that have ended and transitions to ended_pending_payment
 * 
 * @param db - Base de datos D1
 * @returns Número de subastas cerradas
 */
export async function closeEndedAuctions(db: D1Database): Promise<number> {
  let closedCount = 0;
  
  // Buscar subastas activas que hayan terminado
  const endedAuctions = await db.prepare(`
    SELECT id, status, vehicle_id 
    FROM auctions 
    WHERE status = 'active' 
    AND end_time < datetime('now')
  `).all<{ id: string; status: string; vehicle_id: string }>();
  
  console.log(`[Cron] Found ${endedAuctions.results?.length || 0} ended auctions to close`);
  
  for (const auction of (endedAuctions.results || [])) {
    try {
      // Buscar la puja más alta
      const highestBid = await db.prepare(`
        SELECT user_id, amount 
        FROM bids 
        WHERE auction_id = ?
        ORDER BY amount DESC 
        LIMIT 1
      `).bind(auction.id).first<{ user_id: string; amount: number }>();
      
      if (highestBid) {
        // Cambiar a estado pendiente de pago
        const paymentExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        
        await db.prepare(`
          UPDATE auctions 
          SET status = 'ended_pending_payment', 
              winner_id = ?,
              final_price = ?,
              payment_expires_at = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `).bind(
          highestBid.user_id,
          highestBid.amount,
          paymentExpiresAt,
          auction.id
        ).run();
        
        // Reservar el vehículo
        await db.prepare(`
          UPDATE vehicles SET status = 'reserved', updated_at = datetime('now')
          WHERE id = ?
        `).bind(auction.vehicle_id).run();
        
        console.log(`[Cron] Auction ${auction.id} ended with winner: ${highestBid.user_id}`);
      } else {
        // Sin ofertas - marcar como cerrada sin venta
        await db.prepare(`
          UPDATE auctions 
          SET status = 'ended_no_bids',
              updated_at = datetime('now')
          WHERE id = ?
        `).bind(auction.id).run();
        
        // Devolver vehículo a publicado
        await db.prepare(`
          UPDATE vehicles SET status = 'published', updated_at = datetime('now')
          WHERE id = ?
        `).bind(auction.vehicle_id).run();
        
        console.log(`[Cron] Auction ${auction.id} ended with no bids`);
      }
      
      closedCount++;
    } catch (error: any) {
      console.error(`[Cron] Error closing auction ${auction.id}:`, error);
    }
  }
  
  return closedCount;
}

/**
 * Procesa pagos de ganadores de subastas
 * Processes payments from auction winners
 * 
 * @param db - Base de datos D1
 * @returns Número de pagos procesados
 */
export async function processAuctionPayments(db: D1Database): Promise<number> {
  // Esta función se llamaría desde el webhook de pago
  // cuando se confirma el pago del depósito del ganador
  // Por ahora retorna 0 ya que el procesamiento es vía webhook
  console.log('[Cron] processAuctionPayments called - payments handled via webhook');
  return 0;
}

/**
 * Expira pagos de subastas que no recibieron depósito
 * Expires auction payments that didn't receive deposit
 * 
 * @param db - Base de datos D1
 * @returns Número de pagos expirados
 */
export async function expireAuctionPayments(db: D1Database): Promise<number> {
  let expiredCount = 0;
  
  // Buscar pagos de subasta expirados
  const expiredAuctionPayments = await db.prepare(`
    SELECT id, vehicle_id 
    FROM auctions 
    WHERE status = 'ended_pending_payment' 
    AND payment_expires_at < datetime('now')
  `).all<{ id: string; vehicle_id: string }>();
  
  console.log(`[Cron] Found ${expiredAuctionPayments.results?.length || 0} expired auction payments`);
  
  // Procesar cada pago expirado
  for (const auction of (expiredAuctionPayments.results || [])) {
    try {
      // Buscar al mejor postor
      const highestBid = await db.prepare(`
        SELECT user_id, amount 
        FROM bids 
        WHERE auction_id = ?
        ORDER BY amount DESC 
        LIMIT 1
      `).bind(auction.id).first<{ user_id: string; amount: number }>();
      
      if (highestBid) {
        // Crear reserva expirada para el mejor postor (referencia)
        await db.prepare(`
          INSERT INTO reservations (
            id, vehicle_id, customer_name, customer_phone, customer_email,
            amount, status, idempotency_key, expires_at, created_at, updated_at
          )
          VALUES (?, ?, 'Mejor postor', 'no disponible', 'no disponible', ?, 'expired', ?, datetime('now'), datetime('now'), datetime('now'))
        `).bind(
          crypto.randomUUID(),
          auction.vehicle_id,
          highestBid.amount,
          `auction_${auction.id}_expired`
        ).run();
      }
      
      // Actualizar estado de la subasta a closed_failed
      await db.prepare(`
        UPDATE auctions SET status = 'closed_failed', updated_at = datetime('now')
        WHERE id = ?
      `).bind(auction.id).run();
      
      // Devolver vehículo a publicado
      await db.prepare(`
        UPDATE vehicles SET status = 'published', updated_at = datetime('now')
        WHERE id = ?
      `).bind(auction.vehicle_id).run();
      
      expiredCount++;
      console.log(`[Cron] Expired auction payment: ${auction.id}`);
    } catch (error: any) {
      console.error(`[Cron] Error processing auction ${auction.id}:`, error);
    }
  }
  
  return expiredCount;
}

/**
 * Handler de cron para procesar expiraciones
 * Cron handler for processing expirations
 * 
 * Este handler se ejecuta cada 5 minutos via cron trigger
 * Processes:
 * 1. Reservas pendientes de pago expiradas
 * 2. Pagos de subasta expirados
 * 3. Actualiza estados de subastas finalizadas
 */
export async function onRequest(context: { env: any }) {
  const db = context.env.DB;
  
  if (!db) {
    console.error('[Cron] Database not available');
    return new Response(JSON.stringify({ error: 'Database not available' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const results = {
    reservationsExpired: 0,
    auctionPaymentsExpired: 0,
    auctionsClosed: 0,
    errors: [] as string[]
  };
  
  try {
    // ============================================
    // 1. EXPIRAR RESERVACIONES PENDIENTES
    // ============================================
    
    // Buscar reservaciones pendientes de pago expiradas
    const expiredReservations = await db.prepare(`
      SELECT id, vehicle_id 
      FROM reservations 
      WHERE status = 'pending_payment' 
      AND expires_at < datetime('now')
    `).all();
    
    console.log(`[Cron] Found ${expiredReservations.results?.length || 0} expired reservations`);
    
    // Procesar cada reservación expirada
    for (const res of (expiredReservations.results || [])) {
      try {
        const result = await atomicExpireReservation(db, res.id);
        if (result.success) {
          results.reservationsExpired++;
          console.log(`[Cron] Expired reservation: ${res.id}`);
        } else {
          results.errors.push(`Failed to expire reservation ${res.id}: ${result.error}`);
        }
      } catch (error: any) {
        results.errors.push(`Error expiring reservation ${res.id}: ${error.message}`);
        console.error(`[Cron] Error expiring reservation:`, error);
      }
    }
    
    // ============================================
    // 2. EXPIRAR PAGOS DE SUBASTA PENDIENTES
    // ============================================
    
    // Usar función expireAuctionPayments
    const auctionPaymentsExpired = await expireAuctionPayments(db);
    results.auctionPaymentsExpired = auctionPaymentsExpired;
    
    // ============================================
    // 3. CERRAR SUBASTAS EXPIRADAS
    // ============================================
    
    // Usar función closeEndedAuctions
    const auctionsClosed = await closeEndedAuctions(db);
    results.auctionsClosed = auctionsClosed;
    
    // ============================================
    // RESPUESTA
    // ============================================
    
    console.log('[Cron] Expiration processing completed:', results);
    
    return new Response(JSON.stringify({
      success: true,
      processed: {
        reservationsExpired: results.reservationsExpired,
        auctionPaymentsExpired: results.auctionPaymentsExpired,
        auctionsClosed: results.auctionsClosed
      },
      errors: results.errors.length > 0 ? results.errors : undefined,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('[Cron] Fatal error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Exportar como export const runtime = 'edge' para Cloudflare Workers
export const runtime = 'edge';
