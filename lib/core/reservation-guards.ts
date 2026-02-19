// ============================================================
// Funciones de guarda para transiciones de estado de reservas
// MTG Automotora - Plataforma MVP
// ============================================================

import type { ReservationStatus } from '@/types/reservation';

/**
 * Estados de reserva que se consideran "activos"
 */
const ACTIVE_STATUSES: ReservationStatus[] = ['pending_payment', 'paid', 'confirmed'];

/**
 * Estados terminal de reserva (no pueden cambiar)
 */
const TERMINAL_STATUSES: ReservationStatus[] = ['confirmed', 'cancelled', 'refunded'];

/**
 * Verifica si el status actual permite transición a 'paid'
 * Solo pending_payment puede pasar a paid
 */
export function canTransitionToPaid(currentStatus: ReservationStatus): boolean {
  return currentStatus === 'pending_payment';
}

/**
 * Verifica si el status actual permite transición a 'confirmed'
 * Solo paid puede pasar a confirmed
 */
export function canTransitionToConfirmed(currentStatus: ReservationStatus): boolean {
  return currentStatus === 'paid';
}

/**
 * Verifica si el status actual permite transición a 'expired'
 * Solo pending_payment y paid pueden expirar
 */
export function canTransitionToExpired(currentStatus: ReservationStatus): boolean {
  return currentStatus === 'pending_payment' || currentStatus === 'paid';
}

/**
 * Verifica si el status actual permite cancelación
 * No se puede cancelar si ya está cancelado o reembolsado
 */
export function canCancel(currentStatus: ReservationStatus): boolean {
  return currentStatus !== 'cancelled' && currentStatus !== 'refunded';
}

/**
 * Verifica si el status actual permite reembolso
 * Solo paid o confirmed pueden reembolsarse
 */
export function canRefund(currentStatus: ReservationStatus): boolean {
  return currentStatus === 'paid' || currentStatus === 'confirmed';
}

/**
 * Verifica si la reserva está en estado activo
 * (no es terminal: confirmed, cancelled o refunded)
 */
export function isActive(status: ReservationStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/**
 * Verifica si la reserva está en estado terminal
 */
export function isTerminal(status: ReservationStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Verifica si la reserva ha expirado (basado en fecha)
 */
export function isExpired(expiresAt: string): boolean {
  const now = new Date();
  const expires = new Date(expiresAt);
  return now > expires;
}

/**
 * Valida si una transición de status es válida
 */
export function isValidStatusTransition(
  currentStatus: ReservationStatus,
  newStatus: ReservationStatus
): boolean {
  // Mismo status siempre es válido (no-op)
  if (currentStatus === newStatus) return true;

  // Transiciones válidas
  const validTransitions: Record<ReservationStatus, ReservationStatus[]> = {
    'pending_payment': ['paid', 'expired', 'cancelled'],
    'paid': ['confirmed', 'expired', 'cancelled', 'refunded'],
    'confirmed': ['refunded'],
    'expired': [],
    'cancelled': [],
    'refunded': []
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Obtiene el siguiente status válido para una operación
 */
export function getNextStatusForOperation(
  operation: 'pay' | 'confirm' | 'cancel' | 'expire' | 'refund',
  currentStatus: ReservationStatus
): ReservationStatus | null {
  switch (operation) {
    case 'pay':
      return canTransitionToPaid(currentStatus) ? 'paid' : null;
    case 'confirm':
      return canTransitionToConfirmed(currentStatus) ? 'confirmed' : null;
    case 'cancel':
      return canCancel(currentStatus) ? 'cancelled' : null;
    case 'expire':
      return canTransitionToExpired(currentStatus) ? 'expired' : null;
    case 'refund':
      return canRefund(currentStatus) ? 'refunded' : null;
    default:
      return null;
  }
}
