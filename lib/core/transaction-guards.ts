// Guardias de transacción atómica para prevenir double-booking
// Atomic transaction guards to prevent double-booking

import type { D1Database } from '@cloudflare/workers-types';

// ============================================
// RESERVATION GUARDS - Guardias de Reservación
// ============================================

/**
 * Verifica si existe una reservación activa para un vehículo
 * Checks if there's an active reservation for a vehicle
 * 
 * @param db - Base de datos D1
 * @param vehicleId - ID del vehículo
 * @returns true si existe reservación activa
 */
export async function checkActiveReservation(
  db: D1Database, 
  vehicleId: string
): Promise<boolean> {
  const result = await db.prepare(`
    SELECT id FROM reservations 
    WHERE vehicle_id = ? 
    AND status IN ('pending_payment', 'paid', 'confirmed')
    LIMIT 1
  `).bind(vehicleId).first<{ id: string }>();
  
  return !!result;
}

// ============================================
// AUCTION GUARDS - Guardias de Subasta
// ============================================

/**
 * Verifica si existe una subasta activa para un vehículo
 * Checks if there's an active auction for a vehicle
 * 
 * @param db - Base de datos D1
 * @param vehicleId - ID del vehículo
 * @returns true si existe subasta activa
 */
export async function checkActiveAuction(
  db: D1Database, 
  vehicleId: string
): Promise<boolean> {
  const result = await db.prepare(`
    SELECT id FROM auctions 
    WHERE vehicle_id = ? 
    AND status IN ('scheduled', 'active', 'ended_pending_payment')
    LIMIT 1
  `).bind(vehicleId).first<{ id: string }>();
  
  return !!result;
}

/**
 * Verifica si hay una subasta activa para un vehículo (alias de checkActiveAuction)
 * Checks if there is an active auction for a vehicle (alias for checkActiveAuction)
 * 
 * @param db - Base de datos D1
 * @param vehicleId - ID del vehículo
 * @returns true si existe subasta activa
 */
export async function isAuctionActiveForVehicle(
  db: D1Database, 
  vehicleId: string
): Promise<boolean> {
  return checkActiveAuction(db, vehicleId);
}

// ============================================
// COMBINED AVAILABILITY GUARD - Guardia Combinada de Disponibilidad
// ============================================

/**
 * Resultado de verificación de disponibilidad
 * Availability check result
 */
export interface VehicleAvailability {
  available: boolean;
  reason?: string;
  vehicleStatus?: string;
  hasActiveReservation?: boolean;
  hasActiveAuction?: boolean;
}

/**
 * Verifica la disponibilidad completa de un vehículo para reservación/venta
 * Checks complete availability of a vehicle for reservation/sale
 * 
 * Valida:
 * 1. Que el vehículo exista
 * 2. Que esté en estado published
 * 3. Que no tenga reservaciones activas
 * 4. Que no tenga subastas activas
 * 
 * @param db - Base de datos D1
 * @param vehicleId - ID del vehículo
 * @returns Objeto con disponibilidad y razón si no está disponible
 */
export async function isVehicleAvailable(
  db: D1Database, 
  vehicleId: string
): Promise<VehicleAvailability> {
  // 1. Verificar que el vehículo exista y obtener su estado
  const vehicle = await db.prepare(`
    SELECT status FROM vehicles WHERE id = ?
  `).bind(vehicleId).first<{ status: string }>();
  
  if (!vehicle) {
    return { 
      available: false, 
      reason: 'Vehículo no encontrado' 
    };
  }
  
  // 2. Verificar estado del vehículo
  if (vehicle.status !== 'published') {
    return { 
      available: false, 
      reason: `Vehículo no está disponible (estado: ${vehicle.status})`,
      vehicleStatus: vehicle.status
    };
  }
  
  // 3. Verificar reservación activa
  const hasReservation = await checkActiveReservation(db, vehicleId);
  if (hasReservation) {
    return { 
      available: false, 
      reason: 'Vehículo tiene reservación activa',
      vehicleStatus: vehicle.status,
      hasActiveReservation: true
    };
  }
  
  // 4. Verificar subasta activa
  const hasAuction = await checkActiveAuction(db, vehicleId);
  if (hasAuction) {
    return { 
      available: false, 
      reason: 'Vehículo tiene subasta activa',
      vehicleStatus: vehicle.status,
      hasActiveAuction: true
    };
  }
  
  // Vehículo disponible
  return { 
    available: true,
    vehicleStatus: vehicle.status
  };
}

/**
 * Verifica si un vehículo puede ser publicado
 * Checks if a vehicle can be published
 * 
 * @param db - Base de datos D1
 * @param vehicleId - ID del vehículo
 * @returns Objeto con disponibilidad y razón si no puede publicarse
 */
export async function canVehicleBePublished(
  db: D1Database,
  vehicleId: string
): Promise<VehicleAvailability> {
  const vehicle = await db.prepare(`
    SELECT status FROM vehicles WHERE id = ?
  `).bind(vehicleId).first<{ status: string }>();
  
  if (!vehicle) {
    return { 
      available: false, 
      reason: 'Vehículo no encontrado' 
    };
  }
  
  // Solo puede publicarse desde draft o hidden
  if (vehicle.status !== 'draft' && vehicle.status !== 'hidden') {
    return { 
      available: false, 
      reason: `No se puede publicar desde estado: ${vehicle.status}`,
      vehicleStatus: vehicle.status
    };
  }
  
  // Verificar que no tenga conflictos
  const hasReservation = await checkActiveReservation(db, vehicleId);
  if (hasReservation) {
    return { 
      available: false, 
      reason: 'Vehículo tiene reservación activa',
      vehicleStatus: vehicle.status,
      hasActiveReservation: true
    };
  }
  
  const hasAuction = await checkActiveAuction(db, vehicleId);
  if (hasAuction) {
    return { 
      available: false, 
      reason: 'Vehículo tiene subasta activa',
      vehicleStatus: vehicle.status,
      hasActiveAuction: true
    };
  }
  
  return { 
    available: true,
    vehicleStatus: vehicle.status
  };
}

// ============================================
// BID GUARDS - Guardias de Pujas
// ============================================

/**
 * Verifica si un usuario puede pujar en una subasta
 * Checks if a user can bid on an auction
 * 
 * @param db - Base de datos D1
 * @param auctionId - ID de la subasta
 * @param userId - ID del usuario
 * @returns Objeto con disponibilidad y razón
 */
export async function canUserBid(
  db: D1Database,
  auctionId: string,
  userId: string
): Promise<{ canBid: boolean; reason?: string }> {
  // Obtener subasta
  const auction = await db.prepare(`
    SELECT id, status, current_bid, minimum_increment, end_time
    FROM auctions 
    WHERE id = ?
  `).bind(auctionId).first<{
    id: string;
    status: string;
    current_bid: number;
    minimum_increment: number;
    end_time: string;
  }>();
  
  if (!auction) {
    return { canBid: false, reason: 'Subasta no encontrada' };
  }
  
  // Solo subastas activas aceptan pujas
  if (auction.status !== 'active') {
    return { canBid: false, reason: `Subasta no está activa (estado: ${auction.status})` };
  }
  
  // Verificar que no haya expirado
  if (new Date(auction.end_time) < new Date()) {
    return { canBid: false, reason: 'La subasta ha expirado' };
  }
  
  // Obtener última puja del usuario
  const lastBid = await db.prepare(`
    SELECT amount FROM bids 
    WHERE auction_id = ? AND user_id = ?
    ORDER BY amount DESC LIMIT 1
  `).bind(auctionId, userId).first<{ amount: number }>();
  
  // El usuario ya está ganando la subasta
  if (lastBid && lastBid.amount === auction.current_bid) {
    return { canBid: false, reason: 'Ya tienes la puja más alta' };
  }
  
  return { canBid: true };
}

/**
 * Calcula el monto mínimo para una nueva puja
 * Calculates minimum amount for a new bid
 * 
 * @param currentBid - Puja actual
 * @param minimumIncrement - Incremento mínimo
 * @param userLastBid - Última puja del usuario (opcional)
 * @returns Monto mínimo para pujar
 */
export function calculateMinimumBid(
  currentBid: number,
  minimumIncrement: number,
  userLastBid?: number
): number {
  if (userLastBid && userLastBid > 0) {
    // Si el usuario ya pujo, debe superar su última puja + incremento
    return userLastBid + minimumIncrement;
  }
  // Si es primera puja, debe superar la puja actual + incremento
  return currentBid + minimumIncrement;
}

// ============================================
// EXPORT DEFAULT GUARD - Exportar guardia por defecto
// ============================================

export default {
  checkActiveReservation,
  checkActiveAuction,
  isAuctionActiveForVehicle,
  isVehicleAvailable,
  canVehicleBePublished,
  canUserBid,
  calculateMinimumBid
};
