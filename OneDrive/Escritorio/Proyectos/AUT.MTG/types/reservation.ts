// ============================================================
// Tipos para el módulo de Reservas
// MTG Automotora - Plataforma MVP
// ============================================================

/**
 * Estados posibles de una reserva
 */
export type ReservationStatus = 
  | 'pending_payment' 
  | 'paid' 
  | 'confirmed' 
  | 'expired' 
  | 'cancelled' 
  | 'refunded';

/**
 * Interfaz principal de reserva
 */
export interface Reservation {
  id: string;
  vehicle_id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  amount: number; // Moneda: CLP
  status: ReservationStatus;
  payment_id: string | null;
  idempotency_key: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  // Datos del vehículo (JOIN)
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year: number;
    slug: string;
    price: number;
  };
}

/**
 * Datos para crear una nueva reserva
 */
export interface CreateReservationInput {
  vehicle_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  amount: number;
  idempotency_key: string;
}

/**
 * Datos para actualizar una reserva
 */
export interface UpdateReservationInput {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  amount?: number;
  status?: ReservationStatus;
}

/**
 * Filtros para listar reservas
 */
export interface ReservationFilters {
  status?: ReservationStatus[];
  vehicle_id?: string;
  customer_phone?: string;
  created_after?: string;
  created_before?: string;
  limit?: number;
  offset?: number;
}

/**
 * Respuesta paginada de reservas
 */
export interface PaginatedReservations {
  reservations: Reservation[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Estadísticas de reservas
 */
export interface ReservationStats {
  total: number;
  pending_payment: number;
  paid: number;
  confirmed: number;
  expired: number;
  cancelled: number;
  refunded: number;
  total_amount_collected: number;
}

/**
 * Valores válidos para status de reserva
 */
export const RESERVATION_STATUS_VALUES: ReservationStatus[] = [
  'pending_payment',
  'paid',
  'confirmed',
  'expired',
  'cancelled',
  'refunded'
];

/**
 * Estados de reserva que se consideran "activos"
 */
export const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  'pending_payment',
  'paid',
  'confirmed'
];

/**
 * Estados terminal de reserva (no pueden cambiar)
 */
export const TERMINAL_RESERVATION_STATUSES: ReservationStatus[] = [
  'confirmed',
  'cancelled',
  'refunded'
];

/**
 * Función para validar status de reserva
 */
export function isValidReservationStatus(status: string): status is ReservationStatus {
  return RESERVATION_STATUS_VALUES.includes(status as ReservationStatus);
}

/**
 * Función para verificar si un status es activo
 */
export function isActiveReservationStatus(status: ReservationStatus): boolean {
  return ACTIVE_RESERVATION_STATUSES.includes(status);
}

/**
 * Función para verificar si un status es terminal
 */
export function isTerminalReservationStatus(status: ReservationStatus): boolean {
  return TERMINAL_RESERVATION_STATUSES.includes(status);
}
