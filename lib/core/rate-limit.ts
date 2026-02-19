// ============================================================
// Rate Limiting Module para Subastas MTG Automotora
// Limitador basado en D1 para prevenir spam de pujas
// ============================================================

import type { D1Database } from '@cloudflare/workers-types';

// Configuración de límites por defecto
const DEFAULT_LIMIT = 5; // Número máximo de acciones
const DEFAULT_WINDOW_SEC = 60; // Ventana de tiempo en segundos
const DEFAULT_TTL_HOURS = 24; // TTL por defecto para registros de rate limit

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
 * Tipos de limitación disponibles
 */
export type RateLimitType = 'bid' | 'bid_per_auction' | 'ip' | 'user';

/**
 * Configuración de rate limit
 */
export interface RateLimitConfig {
  limit: number;
  windowSec: number;
  type: RateLimitType;
}

/**
 * Resultado de verificación de rate limit
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  reason?: string;
}

/**
 * Pre-defined rate limit configs
 */
export const RATE_LIMIT_CONFIGS: Record<RateLimitType, RateLimitConfig> = {
  bid: { limit: 10, windowSec: 60, type: 'bid' }, // 10 pujas por minuto global
  bid_per_auction: { limit: 5, windowSec: 60, type: 'bid_per_auction' }, // 5 pujas por minuto por subasta
  ip: { limit: 20, windowSec: 60, type: 'ip' }, // 20 requests por minuto por IP
  user: { limit: 10, windowSec: 60, type: 'user' }, // 10 actions por minuto por usuario
};

/**
 * Genera la clave única para el rate limit
 */
function generateKey(
  type: RateLimitType,
  identifier: string,
  auctionId?: string
): string {
  if (type === 'bid_per_auction' && auctionId) {
    return `rate_limit:${type}:${auctionId}:${identifier}`;
  }
  return `rate_limit:${type}:${identifier}`;
}

/**
 * Obtiene el timestamp actual truncado a la ventana de tiempo
 */
function getWindowTimestamp(windowSec: number): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.floor(now / windowSec) * windowSec;
}

/**
 * Verifica si una acción está permitida bajo el rate limit
 * 
 * @param identifier - Identificador único (IP, user ID, etc.)
 * @param config - Configuración de rate limit
 * @param auctionId - ID de la subasta (para bid_per_auction)
 * @returns Resultado de la verificación
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  auctionId?: string
): Promise<RateLimitResult> {
  // Posible cleanup automático (10% de probabilidad)
  await maybeCleanup();

  const db = getDb();
  const key = generateKey(config.type, identifier, auctionId);
  const windowTimestamp = getWindowTimestamp(config.windowSec);
  const resetTimestamp = windowTimestamp + config.windowSec;
  const resetAt = new Date(resetTimestamp * 1000).toISOString();

  // Usar D1 para verificar y actualizar atómicamente
  // Primero intentamos obtener el registro existente
  const existing = await db.prepare(
    'SELECT count, window_timestamp FROM rate_limits WHERE `key` = ? AND window_timestamp = ?'
  ).bind(key, windowTimestamp).first() as { count: number; window_timestamp: number } | null;

  if (existing) {
    if (existing.count >= config.limit) {
      // Rate limit excedido
      await logRateLimitEvent(key, identifier, config.type, false, existing.count);
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        reason: 'rate_limit_exceeded'
      };
    }

    // Incrementar el contador
    await db.prepare(
      'UPDATE rate_limits SET count = count + 1 WHERE `key` = ? AND window_timestamp = ?'
    ).bind(key, windowTimestamp).run();

    await logRateLimitEvent(key, identifier, config.type, true, existing.count + 1);

    return {
      allowed: true,
      remaining: config.limit - existing.count - 1,
      resetAt
    };
  }

  // Crear nuevo registro con TTL
  const expiresAt = new Date(Date.now() + DEFAULT_TTL_HOURS * 60 * 60 * 1000).toISOString();
  await db.prepare(
    'INSERT INTO rate_limits (`key`, identifier, type, count, window_timestamp, expires_at, created_at) VALUES (?, ?, ?, 1, ?, ?, ?)'
  ).bind(
    key,
    identifier,
    config.type,
    windowTimestamp,
    expiresAt,
    new Date().toISOString()
  ).run();

  await logRateLimitEvent(key, identifier, config.type, true, 1);

  return {
    allowed: true,
    remaining: config.limit - 1,
    resetAt
  };
}

/**
 * Verifica rate limit para pujas (múltiples configuraciones)
 * 
 * @param ip - Dirección IP del cliente
 * @param userId - ID del usuario (opcional)
 * @param auctionId - ID de la subasta
 * @returns Resultado con todas las verificaciones
 */
export async function checkBidRateLimit(
  ip: string,
  userId: string | null,
  auctionId: string
): Promise<{
  allowed: boolean;
  results: RateLimitResult[];
  reasons: string[];
}> {
  const results: RateLimitResult[] = [];
  const reasons: string[] = [];

  // Verificar por IP
  const ipResult = await checkRateLimit(ip, RATE_LIMIT_CONFIGS.ip);
  results.push(ipResult);
  if (!ipResult.allowed) reasons.push('ip_rate_limit');

  // Verificar por usuario si está autenticado
  if (userId) {
    const userResult = await checkRateLimit(userId, RATE_LIMIT_CONFIGS.user);
    results.push(userResult);
    if (!userResult.allowed) reasons.push('user_rate_limit');
  }

  // Verificar por subasta
  const auctionResult = await checkRateLimit(
    userId || ip,
    RATE_LIMIT_CONFIGS.bid_per_auction,
    auctionId
  );
  results.push(auctionResult);
  if (!auctionResult.allowed) reasons.push('auction_rate_limit');

  const allowed = results.every(r => r.allowed);

  return { allowed, results, reasons };
}

/**
 * Registra eventos de rate limit en auditoría
 */
async function logRateLimitEvent(
  key: string,
  identifier: string,
  type: string,
  allowed: boolean,
  count: number
): Promise<void> {
  const db = getDb();
  
  // Solo loguear rechazos o cada 10 intentos
  if (allowed && count % 10 !== 0) return;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO audit_logs (id, user_id, entity_type, entity_id, action, old_value, new_value, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    null, // sistema
    'rate_limit',
    key,
    allowed ? 'rate_limit_check' : 'rate_limit_rejected',
    JSON.stringify({ identifier, type }),
    JSON.stringify({ allowed, count }),
    now
  ).run();
}

/**
 * Limpia registros de rate limit antiguos
 * Puede ser llamado por cron job o manualmente
 * Usa expires_at para cleanup eficiente
 */
export async function cleanupRateLimits(): Promise<number> {
  const db = getDb();
  const now = new Date().toISOString();

  // Eliminar registros que han expirado
  const result = await db.prepare(
    'DELETE FROM rate_limits WHERE expires_at IS NOT NULL AND expires_at < ?'
  ).bind(now).run();

  // También eliminar registros old sin expires_at (backup cleanup)
  const cutoff = Math.floor(Date.now() / 1000) - (24 * 60 * 60); // 24 horas
  const oldResult = await db.prepare(
    'DELETE FROM rate_limits WHERE window_timestamp < ? AND expires_at IS NULL'
  ).bind(cutoff).run();

  return (result.meta.changes || 0) + (oldResult.meta.changes || 0);
}

/**
 * Limpia automáticamente registros old en cada verificación
 * Ejecuta cleanup con probabilidad del 10% para no afectar rendimiento
 */
async function maybeCleanup(): Promise<void> {
  // 10% de probabilidad de cleanup en cada llamada
  if (Math.random() < 0.1) {
    try {
      await cleanupRateLimits();
    } catch (error) {
      // Silenciar errores de cleanup para no afectar operaciones
      console.error('[RateLimit] Cleanup error:', error);
    }
  }
}

/**
 * Obtiene el estado actual del rate limit (para debugging)
 */
export async function getRateLimitStatus(
  identifier: string,
  type: RateLimitType,
  auctionId?: string
): Promise<{
  currentCount: number;
  limit: number;
  windowSec: number;
  resetAt: string;
} | null> {
  const db = getDb();
  const key = generateKey(type, identifier, auctionId);
  const config = RATE_LIMIT_CONFIGS[type];
  const windowTimestamp = getWindowTimestamp(config.windowSec);

  const record = await db.prepare(
    'SELECT count FROM rate_limits WHERE `key` = ? AND window_timestamp = ?'
  ).bind(key, windowTimestamp).first() as { count: number } | null;

  if (!record) {
    return {
      currentCount: 0,
      limit: config.limit,
      windowSec: config.windowSec,
      resetAt: new Date((windowTimestamp + config.windowSec) * 1000).toISOString()
    };
  }

  return {
    currentCount: record.count,
    limit: config.limit,
    windowSec: config.windowSec,
    resetAt: new Date((windowTimestamp + config.windowSec) * 1000).toISOString()
  };
}
