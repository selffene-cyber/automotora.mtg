// Auction Guards
// Business logic validation for auction operations

import type { D1Database } from '@cloudflare/workers-types';
import type { Auction, AuctionStatus } from '@/types/auction';

/**
 * Obtiene la hora actual del servidor (UTC)
 * Utilizada para evitar ataques de clock drift
 */
export async function getServerTime(): Promise<Date> {
  // En Cloudflare Workers, usamos Date.now() del servidor
  // que es más confiable que el tiempo del cliente
  return new Date(Date.now());
}

/**
 * Versión síncrona para casos donde no se puede usar async
 * Útil para validaciones rápidas en cliente (con fallback)
 */
export function getServerTimeSync(): Date {
  return new Date();
}

/**
 * Check if auction is currently active
 * Active means: status is 'active' AND current time is between start_time and end_time
 * @param serverTime - Optional server time for validation (prevents clock drift)
 */
export function isAuctionActive(auction: Auction, serverTime?: Date): boolean {
  if (auction.status !== 'active') {
    return false;
  }

  const now = serverTime || new Date();
  const startTime = new Date(auction.start_time);
  const endTime = new Date(auction.end_time);

  return now >= startTime && now <= endTime;
}

/**
 * Check if auction has ended (past end_time)
 * @param serverTime - Optional server time for validation (prevents clock drift)
 */
export function hasAuctionEnded(auction: Auction, serverTime?: Date): boolean {
  const now = serverTime || new Date();
  const endTime = new Date(auction.end_time);
  return now > endTime;
}

/**
 * Check if auction has started (past or at start_time)
 * @param serverTime - Optional server time for validation (prevents clock drift)
 */
export function hasAuctionStarted(auction: Auction, serverTime?: Date): boolean {
  const now = serverTime || new Date();
  const startTime = new Date(auction.start_time);
  return now >= startTime;
}

/**
 * Check if a bid amount is valid for the auction
 * Returns: { valid: boolean, error?: string, minAmount?: number }
 */
export function canPlaceBid(
  auction: Auction, 
  bidAmount: number,
  currentHighestBid: number | null
): { valid: boolean; error?: string; minAmount?: number } {
  // Check auction status
  if (auction.status !== 'active') {
    return { 
      valid: false, 
      error: 'La subasta no está activa' 
    };
  }

  // Check if auction has started
  if (!hasAuctionStarted(auction)) {
    return { 
      valid: false, 
      error: 'La subasta aún no ha comenzado' 
    };
  }

  // Check if auction has ended
  if (hasAuctionEnded(auction)) {
    return { 
      valid: false, 
      error: 'La subasta ha terminado' 
    };
  }

  // Calculate minimum bid amount
  const minAmount = currentHighestBid 
    ? currentHighestBid + auction.min_increment 
    : auction.starting_price;

  // Check bid amount
  if (bidAmount < minAmount) {
    return { 
      valid: false, 
      error: `El monto mínimo de puja es $${minAmount.toLocaleString('es-CL')}`,
      minAmount 
    };
  }

  return { valid: true, minAmount };
}

/**
 * Check if bid increment is valid
 */
export function isValidBidIncrement(
  currentHighest: number | null,
  bidAmount: number,
  minIncrement: number
): boolean {
  if (!currentHighest) {
    return true; // First bid is always valid
  }
  return bidAmount >= currentHighest + minIncrement;
}

/**
 * Check if user can perform action on auction (admin)
 */
export function canPerformAction(
  auction: Auction,
  action: 'start' | 'cancel' | 'close' | 'extend'
): { allowed: boolean; error?: string } {
  switch (action) {
    case 'start':
      if (auction.status !== 'scheduled') {
        return { allowed: false, error: 'Solo se pueden iniciar subastas programadas' };
      }
      if (!hasAuctionStarted(auction)) {
        return { allowed: false, error: 'La fecha de inicio aún no ha llegado' };
      }
      return { allowed: true };

    case 'cancel':
      if (!['scheduled', 'active'].includes(auction.status)) {
        return { allowed: false, error: 'Solo se pueden cancelar subastas programadas o activas' };
      }
      return { allowed: true };

    case 'close':
      if (auction.status !== 'active') {
        return { allowed: false, error: 'Solo se pueden cerrar subastas activas' };
      }
      if (!hasAuctionEnded(auction)) {
        return { allowed: false, error: 'La subasta aún no ha terminado' };
      }
      return { allowed: true };

    case 'extend':
      if (auction.status === 'closed_won' || auction.status === 'closed_failed' || 
          auction.status === 'cancelled' || auction.status === 'expired') {
        return { allowed: false, error: 'No se puede extender una subasta cerrada' };
      }
      return { allowed: true };

    default:
      return { allowed: false, error: 'Acción desconocida' };
  }
}

/**
 * Get auction status display name
 */
export function getAuctionStatusLabel(status: AuctionStatus): string {
  const labels: Record<AuctionStatus, string> = {
    scheduled: 'Programada',
    active: 'En Vivo',
    ended_pending_payment: 'Esperando Pago',
    closed_won: 'Vendida',
    closed_failed: 'Sin Venta',
    cancelled: 'Cancelada',
    expired: 'Expirada',
    ended_no_bids: 'Sin Pujas',
  };
  return labels[status] || status;
}

/**
 * Get auction status color (for UI)
 */
export function getAuctionStatusColor(status: AuctionStatus): string {
  const colors: Record<AuctionStatus, string> = {
    scheduled: 'blue',
    active: 'green',
    ended_pending_payment: 'yellow',
    closed_won: 'green',
    closed_failed: 'red',
    cancelled: 'gray',
    expired: 'gray',
    ended_no_bids: 'gray',
  };
  return colors[status] || 'gray';
}

/**
 * Calculate time remaining until auction ends
 * @param serverTime - Optional server time for calculation (prevents clock drift)
 */
export function getTimeRemaining(auction: Auction, serverTime?: Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
} {
  const now = serverTime || new Date();
  const endTime = new Date(auction.end_time);
  const diff = endTime.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isExpired: false };
}

/**
 * Valida que la subasta esté activa usando tiempo del servidor
 * Previene ataques de clock drift donde el cliente manipula su tiempo local
 * 
 * @param auction - La subasta a validar
 * @param db - Instancia de D1 para obtener tiempo del servidor
 * @returns Resultado de la validación
 */
export async function validateAuctionWithServerTime(
  auction: Auction,
  db: D1Database
): Promise<{ valid: boolean; error?: string; serverTime?: string }> {
  // Obtener tiempo del servidor de base de datos
  const timeResult = await db.prepare(
    "SELECT datetime('now') as server_time"
  ).first<{ server_time: string }>();

  const serverTime = timeResult ? new Date(timeResult.server_time) : new Date(Date.now());
  const serverTimeISO = serverTime.toISOString();

  // Validar estado
  if (auction.status !== 'active') {
    return { valid: false, error: 'La subasta no está activa', serverTime: serverTimeISO };
  }

  // Validar tiempo usando hora del servidor
  const startTime = new Date(auction.start_time);
  const endTime = new Date(auction.end_time);

  if (serverTime < startTime) {
    return { valid: false, error: 'La subasta aún no ha comenzado', serverTime: serverTimeISO };
  }

  if (serverTime > endTime) {
    return { valid: false, error: 'La subasta ha terminado', serverTime: serverTimeISO };
  }

  return { valid: true, serverTime: serverTimeISO };
}
