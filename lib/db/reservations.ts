// ============================================================
// Capa de consultas D1 para reservas
// MTG Automotora - Plataforma MVP
// ============================================================

import { D1Database } from '@cloudflare/workers-types';
import type { 
  Reservation, 
  ReservationFilters, 
  CreateReservationInput,
  ReservationStats
} from '@/types/reservation';
import { isActiveReservationStatus } from '@/types/reservation';

/**
 * Obtiene el binding de D1 para usar en las consultas
 * En Cloudflare Pages con Edge runtime, el binding está en process.env.DB
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
 * Tiempo de expiración por defecto: 48 horas
 */
const DEFAULT_TTL_HOURS = 48;

/**
 * Construye la consulta SQL y parámetros basados en filtros
 */
function buildFiltersQuery(filters: ReservationFilters): {
  sql: string;
  params: (string | number)[];
} {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Filtro por status
  if (filters.status && filters.status.length > 0) {
    const placeholders = filters.status.map(() => '?').join(', ');
    conditions.push(`status IN (${placeholders})`);
    params.push(...filters.status);
  }

  // Filtro por vehicle_id
  if (filters.vehicle_id) {
    conditions.push('vehicle_id = ?');
    params.push(filters.vehicle_id);
  }

  // Filtro por customer_phone
  if (filters.customer_phone) {
    conditions.push('customer_phone = ?');
    params.push(filters.customer_phone);
  }

  // Filtro por fecha de creación (desde)
  if (filters.created_after) {
    conditions.push('created_at >= ?');
    params.push(filters.created_after);
  }

  // Filtro por fecha de creación (hasta)
  if (filters.created_before) {
    conditions.push('created_at <= ?');
    params.push(filters.created_before);
  }

  let sql = 'SELECT * FROM reservations';
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  // Orden por fecha de creación descendente
  sql += ' ORDER BY created_at DESC';

  // Paginación
  const limit = filters.limit || 20;
  const offset = filters.offset || 0;
  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return { sql, params };
}

/**
 * Obtiene reservas con filtros y paginación
 */
export async function getReservations(
  filters: ReservationFilters
): Promise<{ reservations: Reservation[], total: number }> {
  const db = getDb();
  
  const { sql, params } = buildFiltersQuery(filters);

  // Consulta para obtener reservas
  const stmt = db.prepare(sql);
  const result = await stmt.bind(...params).all<Reservation>();

  // Consulta para obtener el total sin paginación
  const countSql = sql.replace(/LIMIT \? OFFSET \?$/, '').replace('SELECT *', 'SELECT COUNT(*) as count');
  const countStmt = db.prepare(countSql);
  const countResult = await countStmt.bind(...params.slice(0, -2)).first<{ count: number }>();

  // Obtener datos del vehículo para cada reserva
  const reservations = result.results || [];
  const reservationsWithVehicle = await Promise.all(
    reservations.map(async (reservation: Reservation) => {
      const vehicleStmt = db.prepare(
        'SELECT id, brand, model, year, slug, price FROM vehicles WHERE id = ?'
      );
      const vehicleResult = await vehicleStmt.bind(reservation.vehicle_id).first<{
        id: string;
        brand: string;
        model: string;
        year: number;
        slug: string;
        price: number;
      }>();
      
      return {
        ...reservation,
        vehicle: vehicleResult || undefined
      };
    })
  );

  return {
    reservations: reservationsWithVehicle,
    total: countResult?.count || 0
  };
}

/**
 * Obtiene una reserva por su ID con datos del vehículo
 */
export async function getReservationById(id: string): Promise<Reservation | null> {
  const db = getDb();
  
  const stmt = db.prepare('SELECT * FROM reservations WHERE id = ?');
  const result = await stmt.bind(id).first<Reservation>();

  if (!result) return null;

  // Obtener datos del vehículo
  const vehicleStmt = db.prepare(
    'SELECT id, brand, model, year, slug, price FROM vehicles WHERE id = ?'
  );
  const vehicleResult = await vehicleStmt.bind(result.vehicle_id).first<{
    id: string;
    brand: string;
    model: string;
    year: number;
    slug: string;
    price: number;
  }>();

  return {
    ...result,
    vehicle: vehicleResult || undefined
  };
}

/**
 * Obtiene una reserva por su idempotency_key
 */
export async function getReservationByIdempotencyKey(key: string): Promise<Reservation | null> {
  const db = getDb();
  
  const stmt = db.prepare('SELECT * FROM reservations WHERE idempotency_key = ?');
  const result = await stmt.bind(key).first<Reservation>();

  if (!result) return null;

  // Obtener datos del vehículo
  const vehicleStmt = db.prepare(
    'SELECT id, brand, model, year, slug, price FROM vehicles WHERE id = ?'
  );
  const vehicleResult = await vehicleStmt.bind(result.vehicle_id).first<{
    id: string;
    brand: string;
    model: string;
    year: number;
    slug: string;
    price: number;
  }>();

  return {
    ...result,
    vehicle: vehicleResult || undefined
  };
}

/**
 * Crea una nueva reserva
 * TTL: 48 horas por defecto
 */
export async function createReservation(
  data: CreateReservationInput,
  userId?: string | null
): Promise<Reservation> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Calcular fecha de expiración (48 horas)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + DEFAULT_TTL_HOURS);
  const expiresAtStr = expiresAt.toISOString();

  const stmt = db.prepare(`
    INSERT INTO reservations (
      id, vehicle_id, user_id, customer_name, customer_email, 
      customer_phone, amount, status, idempotency_key, expires_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    id,
    data.vehicle_id,
    userId || null,
    data.customer_name,
    data.customer_email || null,
    data.customer_phone,
    data.amount,
    'pending_payment',
    data.idempotency_key,
    expiresAtStr,
    now,
    now
  );

  return getReservationById(id) as Promise<Reservation>;
}

/**
 * Actualiza el status de una reserva
 */
export async function updateReservationStatus(
  id: string,
  status: string
): Promise<Reservation | null> {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE reservations SET status = ?, updated_at = ? WHERE id = ?
  `);

  await stmt.bind(status, now, id);

  return getReservationById(id);
}

/**
 * Confirma el pago de una reserva (webhook)
 */
export async function confirmPayment(
  id: string,
  paymentId: string
): Promise<Reservation | null> {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE reservations SET 
      status = 'paid', 
      payment_id = ?, 
      updated_at = ? 
    WHERE id = ?
  `);

  await stmt.bind(paymentId, now, id);

  return getReservationById(id);
}

/**
 * Confirma manualmente una reserva (después de pago verificado)
 */
export async function confirmReservation(id: string): Promise<Reservation | null> {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE reservations SET status = 'confirmed', updated_at = ? WHERE id = ?
  `);

  await stmt.bind(now, id);

  return getReservationById(id);
}

/**
 * Cancela una reserva manualmente
 */
export async function cancelReservation(id: string): Promise<Reservation | null> {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE reservations SET status = 'cancelled', updated_at = ? WHERE id = ?
  `);

  await stmt.bind(now, id);

  return getReservationById(id);
}

/**
 * Marca una reserva como expirada
 */
export async function expireReservation(id: string): Promise<Reservation | null> {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE reservations SET status = 'expired', updated_at = ? WHERE id = ?
  `);

  await stmt.bind(now, id);

  return getReservationById(id);
}

/**
 * Reembolsa una reserva
 */
export async function refundReservation(id: string): Promise<Reservation | null> {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE reservations SET status = 'refunded', updated_at = ? WHERE id = ?
  `);

  await stmt.bind(now, id);

  return getReservationById(id);
}

/**
 * Obtiene la reserva activa para un vehículo
 * (si existe una reserva no expirada y no cancelada)
 */
export async function getActiveReservationForVehicle(
  vehicleId: string
): Promise<Reservation | null> {
  const db = getDb();
  
  const stmt = db.prepare(`
    SELECT * FROM reservations 
    WHERE vehicle_id = ? 
    AND status IN ('pending_payment', 'paid', 'confirmed')
    AND expires_at > ?
    ORDER BY created_at DESC
    LIMIT 1
  `);
  
  const result = await stmt.bind(vehicleId, new Date().toISOString()).first<Reservation>();

  if (!result) return null;

  // Obtener datos del vehículo
  const vehicleStmt = db.prepare(
    'SELECT id, brand, model, year, slug, price FROM vehicles WHERE id = ?'
  );
  const vehicleResult = await vehicleStmt.bind(result.vehicle_id).first<{
    id: string;
    brand: string;
    model: string;
    year: number;
    slug: string;
    price: number;
  }>();

  return {
    ...result,
    vehicle: vehicleResult || undefined
  };
}

/**
 * Obtiene estadísticas de reservas
 */
export async function getReservationStats(): Promise<ReservationStats> {
  const db = getDb();
  
  // Total de reservas por status
  const statusStmt = db.prepare(`
    SELECT 
      status,
      COUNT(*) as count
    FROM reservations
    GROUP BY status
  `);
  const statusResult = await statusStmt.all<{ status: string; count: number }>();

  // Total de dinero recolectado (solo status paid y confirmed)
  const amountStmt = db.prepare(`
    SELECT 
      COALESCE(SUM(amount), 0) as total
    FROM reservations
    WHERE status IN ('paid', 'confirmed')
  `);
  const amountResult = await amountStmt.first<{ total: number }>();

  // Inicializar stats
  const stats: ReservationStats = {
    total: 0,
    pending_payment: 0,
    paid: 0,
    confirmed: 0,
    expired: 0,
    cancelled: 0,
    refunded: 0,
    total_amount_collected: amountResult?.total || 0
  };

  // Mapear resultados
  for (const row of statusResult.results || []) {
    stats.total += row.count;
    switch (row.status) {
      case 'pending_payment':
        stats.pending_payment = row.count;
        break;
      case 'paid':
        stats.paid = row.count;
        break;
      case 'confirmed':
        stats.confirmed = row.count;
        break;
      case 'expired':
        stats.expired = row.count;
        break;
      case 'cancelled':
        stats.cancelled = row.count;
        break;
      case 'refunded':
        stats.refunded = row.count;
        break;
    }
  }

  return stats;
}

/**
 * Expirar todas las reservas pendientes que han excedido su tiempo
 */
export async function expireOldReservations(): Promise<number> {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE reservations 
    SET status = 'expired', updated_at = ?
    WHERE status IN ('pending_payment', 'paid')
    AND expires_at < ?
  `);

  const result = await stmt.bind(now, now).run();

  return result.success ? (result.meta?.changes || 0) : 0;
}

/**
 * Verifica si existe una reserva con el mismo idempotency_key
 */
export async function idempotencyKeyExists(key: string): Promise<boolean> {
  const db = getDb();
  
  const stmt = db.prepare('SELECT COUNT(*) as count FROM reservations WHERE idempotency_key = ?');
  const result = await stmt.bind(key).first<{ count: number }>();
  
  return (result?.count || 0) > 0;
}
