// ============================================================
// Anti-Sniping Module para Subastas MTG Automotora
// Previene pujas de último segundo ampliando el tiempo
// ============================================================

import type { D1Database } from '@cloudflare/workers-types';

// Configuración anti-sniping
const SNIPING_WINDOW_MIN = 2; // Minutos antes del cierre para considerar sniping
const EXTEND_BY_MIN = 2; // Minutos a extender
const MAX_TOTAL_EXTEND_MIN = 10; // Extensión máxima total permitida

/**
 * Obtiene el binding de D1
 * In Cloudflare Pages with Edge runtime, process.env.DB is a D1Database object
 */
function getDb(): D1Database {
  const db = process.env.DB;
  
  if (!db) {
    throw new Error('D1 Database binding (DB) not found. Make sure:\n' +
      '1. You are using Edge runtime (export const runtime = "edge")\n' +
      '2. For local dev, use: npx @cloudflare/next-on-pages/cli dev\n' +
      '3. The wrangler.toml has [[d1_databases]] binding = "DB"');
  }
  
  return db as unknown as D1Database;
}

/**
 * Resultado de verificación anti-sniping
 */
export interface AntiSnipingResult {
  extended: boolean;
  newEndTime?: string;
  previousEndTime?: string;
  reason?: string;
}

/**
 * Verifica si una puja está dentro de la ventana de sniping
 * y extiende el tiempo de la subasta si es necesario
 * 
 * @param auctionId - ID de la subasta
 * @param bidId - ID de la puja (para auditoría)
 * @returns Resultado con información de extensión
 */
export async function checkAndExtendAuctionEndTime(
  auctionId: string,
  bidId: string
): Promise<AntiSnipingResult> {
  const db = getDb();
  const now = new Date();

  // Obtener la subasta actual
  const auction = await db.prepare(
    'SELECT id, end_time, status FROM auctions WHERE id = ?'
  ).bind(auctionId).first<{ id: string; end_time: string; status: string }>();

  if (!auction) {
    return { extended: false, reason: 'auction_not_found' };
  }

  // Verificar que la subasta esté activa
  if (auction.status !== 'active') {
    return { extended: false, reason: 'auction_not_active' };
  }

  const endTime = new Date(auction.end_time);
  const timeRemainingMin = (endTime.getTime() - now.getTime()) / (1000 * 60);

  // Si la subasta ya terminó, no extender
  if (timeRemainingMin <= 0) {
    return { extended: false, reason: 'auction_ended', previousEndTime: auction.end_time };
  }

  // Verificar si estamos dentro de la ventana de sniping
  if (timeRemainingMin <= SNIPING_WINDOW_MIN) {
    // Verificar si ya hubo una extensión reciente (para evitar extensiones duplicadas)
    const recentExtensions = await countRecentExtensions(auctionId, 1); // 1 minuto
    if (recentExtensions > 0) {
      console.log(`[AntiSniping] Subasta ${auctionId} ya tuvo extensión reciente, skipping`);
      return {
        extended: false,
        previousEndTime: auction.end_time,
        newEndTime: auction.end_time,
        reason: 'recent_extension_exists'
      };
    }

    // Calcular nueva hora de cierre
    const newEndTime = new Date(endTime.getTime() + EXTEND_BY_MIN * 60 * 1000);
    
    // ACTUALIZACIÓN ATÓMICA con optimistic lock
    // Solo actualizamos si el end_time no ha cambiado (previene race conditions)
    const result = await db.prepare(
      `UPDATE auctions 
       SET end_time = ?, updated_at = ? 
       WHERE id = ? AND end_time = ?`
    ).bind(
      newEndTime.toISOString(),
      now.toISOString(),
      auctionId,
      auction.end_time // Optimistic lock: solo actualiza si no ha cambiado
    ).run();

    // Verificar si la actualización fue exitosa
    if (result.meta.changes === 0) {
      // Otra puja ya extendió la subasta - no duplicamos la extensión
      console.log(`[AntiSniping] Subasta ${auctionId} ya fue extendida por otra puja, skipping`);
      return {
        extended: false,
        previousEndTime: auction.end_time,
        newEndTime: auction.end_time, // Mantenemos el original
        reason: 'already_extended_by_other_bid'
      };
    }

    // Registrar en auditoría
    await logAntiSnipingExtension(
      auctionId,
      bidId,
      auction.end_time,
      newEndTime.toISOString(),
      timeRemainingMin
    );

    console.log(`[AntiSniping] Subasta ${auctionId} extendida de ${auction.end_time} a ${newEndTime.toISOString()} (puja ${bidId} a ${timeRemainingMin.toFixed(2)} min del cierre)`);

    return {
      extended: true,
      previousEndTime: auction.end_time,
      newEndTime: newEndTime.toISOString(),
      reason: 'sniping_detected'
    };
  }

  return { extended: false, reason: 'no_sniping' };
}

/**
 * Registra la extensión anti-sniping en audit_logs
 */
async function logAntiSnipingExtension(
  auctionId: string,
  bidId: string,
  oldEndTime: string,
  newEndTime: string,
  remainingMin: number
): Promise<void> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO audit_logs (id, user_id, entity_type, entity_id, action, old_value, new_value, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    null, // user_id - sistema
    'auction',
    auctionId,
    'anti_sniping_extend',
    JSON.stringify({ old_end_time: oldEndTime, bid_id: bidId, remaining_min: remainingMin.toFixed(2) }),
    JSON.stringify({ new_end_time: newEndTime, extended_min: EXTEND_BY_MIN }),
    now
  ).run();
}

/**
 * Obtiene el historial de extensiones anti-sniping de una subasta
 */
export async function getAntiSnipingHistory(
  auctionId: string,
  limit: number = 20
): Promise<Array<{
  id: string;
  old_value: string;
  new_value: string;
  created_at: string;
}>> {
  const db = getDb();

  const result = await db.prepare(`
    SELECT id, old_value, new_value, created_at 
    FROM audit_logs 
    WHERE entity_type = 'auction' AND entity_id = ? AND action = 'anti_sniping_extend'
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(auctionId, limit).all<{
    id: string;
    old_value: string;
    new_value: string;
    created_at: string;
  }>();

  return result.results || [];
}

/**
 * Cuenta las extensiones anti-sniping en los últimos X minutos
 * Útil para evitar extensiones duplicadas en ráfagas de pujas
 */
export async function countRecentExtensions(
  auctionId: string,
  withinMinutes: number = 2
): Promise<number> {
  const db = getDb();
  const cutoffTime = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString();

  const result = await db.prepare(`
    SELECT COUNT(*) as count 
    FROM audit_logs 
    WHERE entity_type = 'auction' 
      AND entity_id = ? 
      AND action = 'anti_sniping_extend'
      AND created_at > ?
  `).bind(auctionId, cutoffTime).first<{ count: number }>();

  return result?.count || 0;
}

/**
 * Calcula el tiempo restante formateado para显示
 */
export function formatTimeRemaining(endTime: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isSniping: boolean;
} {
  const now = new Date();
  const end = new Date(endTime);
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, isSniping: false };
  }

  const diffMin = diffMs / (1000 * 60);
  const days = Math.floor(diffMin / (24 * 60));
  const hours = Math.floor((diffMin % (24 * 60)) / 60);
  const minutes = Math.floor(diffMin % 60);
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    isSniping: diffMin <= SNIPING_WINDOW_MIN
  };
}

/**
 * Valida si una puja puede ser aceptada basada en el tiempo
 */
export async function validateBidTime(
  auctionId: string
): Promise<{ valid: boolean; reason?: string; endTime?: string }> {
  const db = getDb();
  const now = new Date();

  const auction = await db.prepare(
    'SELECT end_time, status FROM auctions WHERE id = ?'
  ).bind(auctionId).first<{ end_time: string; status: string }>();

  if (!auction) {
    return { valid: false, reason: 'auction_not_found' };
  }

  if (auction.status !== 'active') {
    return { valid: false, reason: 'auction_not_active', endTime: auction.end_time };
  }

  const endTime = new Date(auction.end_time);
  if (now > endTime) {
    return { valid: false, reason: 'ended', endTime: auction.end_time };
  }

  return { valid: true, endTime: auction.end_time };
}
