// Funciones de transacción atómica con validación de estado
// Atomic transaction functions with state validation

import type { D1Database } from '@cloudflare/workers-types';
import { 
  canTransitionVehicle, 
  isArchived, 
  isActiveReservation,
  canTransitionReservation 
} from './state-machine';
import { 
  isVehicleAvailable, 
  checkActiveReservation,
  checkActiveAuction 
} from './transaction-guards';

// ============================================
// TYPES - Tipos
// ============================================

/**
 * Resultado de operación atómica
 * Atomic operation result
 */
export interface AtomicResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Datos para crear una reservación
 * Data for creating a reservation
 */
export interface ReservationData {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  amount: number;
  idempotency_key: string;
}

// ============================================
// RESERVATION TRANSACTIONS - Transacciones de Reservación
// ============================================

/**
 * Crea una reservación de forma atómica
 * Creates a reservation atomically
 * 
 * Proceso:
 * 1. Verifica disponibilidad del vehículo
 * 2. Crea la reservación
 * 3. Actualiza el estado del vehículo a reserved
 * 
 * @param db - Base de datos D1
 * @param vehicleId - ID del vehículo
 * @param reservationData - Datos de la reservación
 * @returns Resultado con ID de reservación o error
 */
export async function atomicCreateReservation(
  db: D1Database,
  vehicleId: string,
  reservationData: ReservationData
): Promise<AtomicResult<{ reservationId: string }>> {
  
  // 1. Verificar disponibilidad en una sola consulta
  const availability = await isVehicleAvailable(db, vehicleId);
  if (!availability.available) {
    console.warn(`[AtomicTransaction] Vehicle not available: ${availability.reason}`);
    return { 
      success: false, 
      error: availability.reason 
    };
  }
  
  // 2. Crear reservación y actualizar vehículo atómicamente
  // Usamos batch para atomicidad en D1
  const reservationId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 horas
  
  try {
    await db.batch([
      // Insertar reservación
      db.prepare(`
        INSERT INTO reservations (
          id, vehicle_id, customer_name, customer_phone, customer_email, 
          amount, status, idempotency_key, expires_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?, datetime('now'), datetime('now'))
      `).bind(
        reservationId,
        vehicleId,
        reservationData.customer_name,
        reservationData.customer_phone,
        reservationData.customer_email || null,
        reservationData.amount,
        reservationData.idempotency_key,
        expiresAt
      ),
      // Actualizar estado del vehículo
      db.prepare(`
        UPDATE vehicles SET status = 'reserved', updated_at = datetime('now') 
        WHERE id = ?
      `).bind(vehicleId)
    ]);
    
    console.log(`[AtomicTransaction] Reservation created: ${reservationId} for vehicle: ${vehicleId}`);
    return { 
      success: true, 
      data: { reservationId } 
    };
  } catch (error: any) {
    // Verificar si es error de constraint único (idempotency_key)
    if (error.message?.includes('UNIQUE constraint')) {
      return { 
        success: false, 
        error: 'Ya existe una reserva con esta clave de idempotencia' 
      };
    }
    console.error(`[AtomicTransaction] Error creating reservation:`, error);
    throw error;
  }
}

/**
 * Confirma el pago de una reservación de forma atómica
 * Confirms payment for a reservation atomically
 * 
 * @param db - Base de datos D1
 * @param reservationId - ID de la reservación
 * @param paymentId - ID del pago
 * @returns Resultado de la operación
 */
export async function atomicConfirmPayment(
  db: D1Database,
  reservationId: string,
  paymentId: string
): Promise<AtomicResult> {
  // Obtener reservación actual
  const reservation = await db.prepare(`
    SELECT r.id, r.status, r.vehicle_id 
    FROM reservations r 
    WHERE r.id = ?
  `).bind(reservationId).first<{ id: string; status: string; vehicle_id: string }>();
  
  if (!reservation) {
    return { 
      success: false, 
      error: 'Reserva no encontrada' 
    };
  }
  
  // Validar transición de estado
  if (!canTransitionReservation(reservation.status, 'paid')) {
    return { 
      success: false, 
      error: `La reservación no puede ser pagada desde estado: ${reservation.status}` 
    };
  }
  
  // Actualización atómica
  await db.batch([
    // Actualizar reservación
    db.prepare(`
      UPDATE reservations 
      SET status = 'paid', payment_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(paymentId, reservationId),
    // El vehículo ya debería estar en reserved
    db.prepare(`
      UPDATE vehicles SET status = 'reserved', updated_at = datetime('now')
      WHERE id = ?
    `).bind(reservation.vehicle_id)
  ]);
  
  console.log(`[AtomicTransaction] Payment confirmed for reservation: ${reservationId}`);
  return { success: true };
}

/**
 * Confirma manualmente una reservación
 * Manually confirms a reservation
 * 
 * @param db - Base de datos D1
 * @param reservationId - ID de la reservación
 * @returns Resultado de la operación
 */
export async function atomicConfirmReservation(
  db: D1Database,
  reservationId: string
): Promise<AtomicResult> {
  const reservation = await db.prepare(`
    SELECT r.id, r.status, r.vehicle_id 
    FROM reservations r 
    WHERE r.id = ?
  `).bind(reservationId).first<{ id: string; status: string; vehicle_id: string }>();
  
  if (!reservation) {
    return { success: false, error: 'Reserva no encontrada' };
  }
  
  if (!canTransitionReservation(reservation.status, 'confirmed')) {
    return { 
      success: false, 
      error: `No se puede confirmar desde estado: ${reservation.status}` 
    };
  }
  
  await db.prepare(`
    UPDATE reservations SET status = 'confirmed', updated_at = datetime('now')
    WHERE id = ?
  `).bind(reservationId).run();
  
  return { success: true };
}

/**
 * Cancela una reservación de forma atómica
 * Cancels a reservation atomically
 * 
 * @param db - Base de datos D1
 * @param reservationId - ID de la reservación
 * @returns Resultado de la operación
 */
export async function atomicCancelReservation(
  db: D1Database,
  reservationId: string
): Promise<AtomicResult> {
  const reservation = await db.prepare(`
    SELECT r.id, r.status, r.vehicle_id 
    FROM reservations r 
    WHERE r.id = ?
  `).bind(reservationId).first<{ id: string; status: string; vehicle_id: string }>();
  
  if (!reservation) {
    return { success: false, error: 'Reserva no encontrada' };
  }
  
  if (!canTransitionReservation(reservation.status, 'cancelled')) {
    return { 
      success: false, 
      error: `No se puede cancelar desde estado: ${reservation.status}` 
    };
  }
  
  // Actualización atómica
  await db.batch([
    // Cancelar reservación
    db.prepare(`
      UPDATE reservations SET status = 'cancelled', updated_at = datetime('now')
      WHERE id = ?
    `).bind(reservationId),
    // Liberar vehículo
    db.prepare(`
      UPDATE vehicles SET status = 'published', updated_at = datetime('now')
      WHERE id = ? AND status = 'reserved'
    `).bind(reservation.vehicle_id)
  ]);
  
  console.log(`[AtomicTransaction] Reservation cancelled: ${reservationId}`);
  return { success: true };
}

/**
 * Expira una reservación por tiempo
 * Expires a reservation by time
 * 
 * @param db - Base de datos D1
 * @param reservationId - ID de la reservación
 * @returns Resultado de la operación
 */
export async function atomicExpireReservation(
  db: D1Database,
  reservationId: string
): Promise<AtomicResult> {
  const reservation = await db.prepare(`
    SELECT r.id, r.status, r.vehicle_id 
    FROM reservations r 
    WHERE r.id = ?
  `).bind(reservationId).first<{ id: string; status: string; vehicle_id: string }>();
  
  if (!reservation) {
    return { success: false, error: 'Reserva no encontrada' };
  }
  
  // Solo se pueden expirar reservaciones activas
  if (!isActiveReservation(reservation.status)) {
    return { success: false, error: 'La reservación no está activa' };
  }
  
  await db.batch([
    // Expirar reservación
    db.prepare(`
      UPDATE reservations SET status = 'expired', updated_at = datetime('now')
      WHERE id = ?
    `).bind(reservationId),
    // Liberar vehículo de vuelta a published
    db.prepare(`
      UPDATE vehicles SET status = 'published', updated_at = datetime('now')
      WHERE id = ? AND status = 'reserved'
    `).bind(reservation.vehicle_id)
  ]);
  
  console.log(`[AtomicTransaction] Reservation expired: ${reservationId}`);
  return { success: true };
}

// ============================================
// VEHICLE TRANSACTIONS - Transacciones de Vehículo
// ============================================

/**
 * Archiva un vehículo de forma atómica
 * Archives a vehicle atomically
 * 
 * @param db - Base de datos D1
 * @param vehicleId - ID del vehículo
 * @param adminUserId - ID del usuario administrador
 * @returns Resultado de la operación
 */
export async function atomicArchiveVehicle(
  db: D1Database,
  vehicleId: string,
  adminUserId: string
): Promise<AtomicResult> {
  // Obtener vehículo
  const vehicle = await db.prepare(`
    SELECT status FROM vehicles WHERE id = ?
  `).bind(vehicleId).first<{ status: string }>();
  
  if (!vehicle) {
    return { success: false, error: 'Vehículo no encontrado' };
  }
  
  // Validar transición
  if (!canTransitionVehicle(vehicle.status, 'archived')) {
    return { 
      success: false, 
      error: `No se puede archivar desde estado: ${vehicle.status}` 
    };
  }
  
  if (isArchived(vehicle.status)) {
    return { success: false, error: 'Vehículo ya está archivado' };
  }
  
  // Verificar reservación activa
  const hasActiveReservation = await checkActiveReservation(db, vehicleId);
  if (hasActiveReservation) {
    return { 
      success: false, 
      error: 'No se puede archivar con reservación activa' 
    };
  }
  
  // Archivar vehículo
  await db.prepare(`
    UPDATE vehicles SET status = 'archived', updated_at = datetime('now')
    WHERE id = ?
  `).bind(vehicleId).run();
  
  console.log(`[AtomicTransaction] Vehicle archived: ${vehicleId} by admin: ${adminUserId}`);
  return { success: true };
}

/**
 * Publica un vehículo de forma atómica
 * Publishes a vehicle atomically
 * 
 * @param db - Base de datos D1
 * @param vehicleId - ID del vehículo
 * @returns Resultado de la operación
 */
export async function atomicPublishVehicle(
  db: D1Database,
  vehicleId: string
): Promise<AtomicResult> {
  const vehicle = await db.prepare(`
    SELECT status FROM vehicles WHERE id = ?
  `).bind(vehicleId).first<{ status: string }>();
  
  if (!vehicle) {
    return { success: false, error: 'Vehículo no encontrado' };
  }
  
  if (!canTransitionVehicle(vehicle.status, 'published')) {
    return { 
      success: false, 
      error: `No se puede publicar desde estado: ${vehicle.status}` 
    };
  }
  
  // Verificar conflictos
  const hasReservation = await checkActiveReservation(db, vehicleId);
  if (hasReservation) {
    return { 
      success: false, 
      error: 'Vehículo tiene reservación activa' 
    };
  }
  
  const hasAuction = await checkActiveAuction(db, vehicleId);
  if (hasAuction) {
    return { 
      success: false, 
      error: 'Vehículo tiene subasta activa' 
    };
  }
  
  await db.prepare(`
    UPDATE vehicles SET status = 'published', updated_at = datetime('now')
    WHERE id = ?
  `).bind(vehicleId).run();
  
  console.log(`[AtomicTransaction] Vehicle published: ${vehicleId}`);
  return { success: true };
}

/**
 * Marca un vehículo como vendido de forma atómica
 * Marks a vehicle as sold atomically
 * 
 * @param db - Base de datos D1
 * @param vehicleId - ID del vehículo
 * @returns Resultado de la operación
 */
export async function atomicMarkVehicleSold(
  db: D1Database,
  vehicleId: string
): Promise<AtomicResult> {
  const vehicle = await db.prepare(`
    SELECT status FROM vehicles WHERE id = ?
  `).bind(vehicleId).first<{ status: string }>();
  
  if (!vehicle) {
    return { success: false, error: 'Vehículo no encontrado' };
  }
  
  if (!canTransitionVehicle(vehicle.status, 'sold')) {
    return { 
      success: false, 
      error: `No se puede marcar como vendido desde estado: ${vehicle.status}` 
    };
  }
  
  await db.prepare(`
    UPDATE vehicles SET status = 'sold', updated_at = datetime('now')
    WHERE id = ?
  `).bind(vehicleId).run();
  
  console.log(`[AtomicTransaction] Vehicle marked as sold: ${vehicleId}`);
  return { success: true };
}

// ============================================
// EXPORT ALL - Exportar todo
// ============================================

export default {
  atomicCreateReservation,
  atomicConfirmPayment,
  atomicConfirmReservation,
  atomicCancelReservation,
  atomicExpireReservation,
  atomicArchiveVehicle,
  atomicPublishVehicle,
  atomicMarkVehicleSold
};