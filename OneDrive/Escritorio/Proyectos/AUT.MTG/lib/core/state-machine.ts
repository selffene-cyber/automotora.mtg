// Máquina de estados centralizada para validación atómica de transiciones
// Enterprise-level integrity guarantee

// No import needed - pure TypeScript logic

// ============================================
// STATE DEFINITIONS - Definiciones de Estados
// ============================================

// Estados de vehículo permitidos
export const VEHICLE_STATES = ['draft', 'published', 'reserved', 'sold', 'hidden', 'archived'] as const;
export type VehicleState = typeof VEHICLE_STATES[number];

// Estados activos de vehículo (visibles en catálogo público)
export const ACTIVE_VEHICLE_STATES = ['published'] as const;
export type ActiveVehicleState = typeof ACTIVE_VEHICLE_STATES[number];

// Estados de reservación activos
export const ACTIVE_RESERVATION_STATES = ['pending_payment', 'paid', 'confirmed'] as const;
export type ActiveReservationState = typeof ACTIVE_RESERVATION_STATES[number];

// Estados terminal de reservación (no hay salida)
export const TERMINAL_RESERVATION_STATES = ['cancelled', 'refunded', 'expired'] as const;
export type TerminalReservationState = typeof TERMINAL_RESERVATION_STATES[number];

// ============================================
// TRANSITION MATRICS - Matrices de Transición
// ============================================

// Transiciones válidas de vehículo: currentState -> [allowedNextStates]
const VEHICLE_TRANSITIONS: Record<VehicleState, VehicleState[]> = {
  draft: ['published', 'hidden'],
  published: ['reserved', 'hidden', 'sold'],
  reserved: ['published', 'sold', 'hidden'],
  sold: ['archived'], // Solo camino a archived
  hidden: ['published', 'draft', 'archived'],
  archived: [], // Terminal - sin transiciones salientes
};

// Transiciones de reservación en orden progresivo
const RESERVATION_PROGRESSIVE_ORDER = ['pending_payment', 'paid', 'confirmed'] as const;

// ============================================
// GUARD FUNCTIONS - Funciones de Guardia
// ============================================

/**
 * Valida si una transición de estado de vehículo es permitida
 * Validates if a vehicle state transition is allowed
 * 
 * @param currentStatus - Estado actual del vehículo
 * @param newStatus - Estado nuevo al que se desea transitar
 * @returns true si la transición es válida
 */
export function canTransitionVehicle(currentStatus: string, newStatus: string): boolean {
  // Validar que ambos estados existan
  if (!VEHICLE_STATES.includes(currentStatus as VehicleState)) {
    console.warn(`[StateMachine] Estado de vehículo inválido: ${currentStatus}`);
    return false;
  }
  if (!VEHICLE_STATES.includes(newStatus as VehicleState)) {
    console.warn(`[StateMachine] Estado de vehículo inválido: ${newStatus}`);
    return false;
  }
  
  // Verificar si la transición está permitida
  const allowedTransitions = VEHICLE_TRANSITIONS[currentStatus as VehicleState];
  const isAllowed = allowedTransitions?.includes(newStatus as VehicleState) ?? false;
  
  if (!isAllowed) {
    console.warn(`[StateMachine] Transición no permitida: ${currentStatus} -> ${newStatus}`);
  }
  
  return isAllowed;
}

/**
 * Verifica si un vehículo está en estado activo (visible en catálogo)
 * Checks if vehicle is in active state (visible in catalog)
 */
export function isActiveVehicle(status: string): boolean {
  return ACTIVE_VEHICLE_STATES.includes(status as ActiveVehicleState);
}

/**
 * Verifica si un vehículo está archivado
 * Checks if vehicle is archived
 */
export function isArchived(status: string): boolean {
  return status === 'archived';
}

/**
 * Verifica si un vehículo está en estado de venta (reserved o sold)
 * Checks if vehicle is in sale state
 */
export function isInSaleProcess(status: string): boolean {
  return status === 'reserved' || status === 'sold';
}

/**
 * Verifica si una reservación está activa
 * Checks if reservation is active
 */
export function isActiveReservation(status: string): boolean {
  return ACTIVE_RESERVATION_STATES.includes(status as ActiveReservationState);
}

/**
 * Verifica si una reservación está en estado terminal
 * Checks if reservation is in terminal state
 */
export function isTerminalReservation(status: string): boolean {
  return TERMINAL_RESERVATION_STATES.includes(status as TerminalReservationState);
}

/**
 * Valida si una transición de estado de reservación es permitida
 * Validates if a reservation state transition is allowed
 * 
 * @param currentStatus - Estado actual de la reservación
 * @param newStatus - Estado nuevo al que se desea transitar
 * @returns true si la transición es válida
 */
export function canTransitionReservation(currentStatus: string, newStatus: string): boolean {
  // Transiciones progresivas (adelante en la cadena)
  const currentIdx = RESERVATION_PROGRESSIVE_ORDER.indexOf(currentStatus as any);
  const newIdx = RESERVATION_PROGRESSIVE_ORDER.indexOf(newStatus as any);
  
  if (currentIdx >= 0 && newIdx >= 0 && newIdx > currentIdx) {
    return true;
  }
  
  // Estados terminal solo pueden transicionar a sí mismos
  if (TERMINAL_RESERVATION_STATES.includes(currentStatus as TerminalReservationState)) {
    return currentStatus === newStatus;
  }
  
  // Transiciones manuales a estados terminal
  if (newStatus === 'cancelled' || newStatus === 'refunded') {
    return !TERMINAL_RESERVATION_STATES.includes(currentStatus as TerminalReservationState);
  }
  
  // Transición de confirmado a paid (caso especial para pagos confirmados)
  if (currentStatus === 'confirmed' && newStatus === 'paid') {
    return true;
  }
  
  return false;
}

/**
 * Obtiene los estados siguientes permitidos para un vehículo
 * Gets allowed next states for a vehicle
 */
export function getAllowedVehicleTransitions(currentStatus: string): string[] {
  if (!VEHICLE_STATES.includes(currentStatus as VehicleState)) {
    return [];
  }
  return VEHICLE_TRANSITIONS[currentStatus as VehicleState] || [];
}

/**
 * Obtiene los estados siguientes permitidos para una reservación
 * Gets allowed next states for a reservation
 */
export function getAllowedReservationTransitions(currentStatus: string): string[] {
  // Si está en progreso, puede avanzar
  const currentIdx = RESERVATION_PROGRESSIVE_ORDER.indexOf(currentStatus as any);
  if (currentIdx >= 0) {
    return RESERVATION_PROGRESSIVE_ORDER.slice(currentIdx + 1);
  }
  
  // Si es terminal, solo puede stay
  if (TERMINAL_RESERVATION_STATES.includes(currentStatus as TerminalReservationState)) {
    return [currentStatus];
  }
  
  // Puede cancelar o reembolsar si no está en terminal
  return ['cancelled', 'refunded'];
}

// ============================================
// STATE VALIDATION HELPERS - Ayudantes de Validación
// ============================================

/**
 * Valida que un estado de vehículo sea válido
 * Validates that a vehicle state is valid
 */
export function isValidVehicleState(state: string): state is VehicleState {
  return VEHICLE_STATES.includes(state as VehicleState);
}

/**
 * Valida que un estado de reservación sea válido
 * Validates that a reservation state is valid
 */
export function isValidReservationState(state: string): boolean {
  return (
    ACTIVE_RESERVATION_STATES.includes(state as ActiveReservationState) ||
    TERMINAL_RESERVATION_STATES.includes(state as TerminalReservationState)
  );
}

/**
 * Obtiene el color semántico para un estado de vehículo
 * Gets semantic color for vehicle state (for UI)
 */
export function getVehicleStateColor(state: string): string {
  switch (state) {
    case 'draft': return 'bg-gray-100 text-gray-800';
    case 'published': return 'bg-green-100 text-green-800';
    case 'reserved': return 'bg-yellow-100 text-yellow-800';
    case 'sold': return 'bg-blue-100 text-blue-800';
    case 'hidden': return 'bg-orange-100 text-orange-800';
    case 'archived': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Obtiene el label legible para un estado de vehículo
 * Gets readable label for vehicle state
 */
export function getVehicleStateLabel(state: string): string {
  switch (state) {
    case 'draft': return 'Borrador';
    case 'published': return 'Publicado';
    case 'reserved': return 'Reservado';
    case 'sold': return 'Vendido';
    case 'hidden': return 'Oculto';
    case 'archived': return 'Archivado';
    default: return state;
  }
}

/**
 * Obtiene el label legible para un estado de reservación
 * Gets readable label for reservation state
 */
export function getReservationStateLabel(state: string): string {
  switch (state) {
    case 'pending_payment': return 'Pendiente de pago';
    case 'paid': return 'Pagado';
    case 'confirmed': return 'Confirmado';
    case 'cancelled': return 'Cancelado';
    case 'refunded': return 'Reembolsado';
    case 'expired': return 'Expirado';
    default: return state;
  }
}

// ============================================
// CONSIGNMENT STATE MACHINE - Máquina de Estados de Consignaciones
// ============================================

// Estados de consignación permitidos
export const CONSIGNMENT_STATES = ['received', 'under_review', 'approved', 'rejected', 'published'] as const;
export type ConsignmentState = typeof CONSIGNMENT_STATES[number];

// Estados activos de consignación (en proceso)
export const ACTIVE_CONSIGNMENT_STATES = ['received', 'under_review', 'approved'] as const;
export type ActiveConsignmentState = typeof ACTIVE_CONSIGNMENT_STATES[number];

// Estados terminal de consignación (no hay salida)
export const TERMINAL_CONSIGNMENT_STATES = ['rejected', 'published'] as const;
export type TerminalConsignmentState = typeof TERMINAL_CONSIGNMENT_STATES[number];

// Transiciones válidas de consignación: currentState -> [allowedNextStates]
const CONSIGNMENT_TRANSITIONS: Record<ConsignmentState, ConsignmentState[]> = {
  received: ['under_review'],
  under_review: ['approved', 'rejected'],
  approved: ['published', 'under_review'], // allow unpublish back to under_review
  rejected: [], // Terminal - sin transiciones salientes
  published: [], // Terminal - sin transiciones salientes
};

// Transiciones con nombre (acciones)
export const CONSIGNMENT_ACTIONS = {
  take: 'received -> under_review',
  approve: 'under_review -> approved',
  reject: 'under_review -> rejected',
  publish: 'approved -> published',
  unpublish: 'approved -> under_review',
} as const;

// ============================================
// CONSIGNMENT GUARD FUNCTIONS - Funciones de Guardia para Consignaciones
// ============================================

/**
 * Valida si una transición de estado de consignación es permitida
 * Validates if a consignment state transition is allowed
 * 
 * @param currentStatus - Estado actual de la consignación
 * @param newStatus - Estado nuevo al que se desea transitar
 * @returns true si la transición es válida
 */
export function canTransitionConsignment(currentStatus: string, newStatus: string): boolean {
  // Validar que ambos estados existan
  if (!CONSIGNMENT_STATES.includes(currentStatus as ConsignmentState)) {
    console.warn(`[StateMachine] Estado de consignación inválido: ${currentStatus}`);
    return false;
  }
  if (!CONSIGNMENT_STATES.includes(newStatus as ConsignmentState)) {
    console.warn(`[StateMachine] Estado de consignación inválido: ${newStatus}`);
    return false;
  }
  
  // Verificar si la transición está permitida
  const allowedTransitions = CONSIGNMENT_TRANSITIONS[currentStatus as ConsignmentState];
  const isAllowed = allowedTransitions?.includes(newStatus as ConsignmentState) ?? false;
  
  if (!isAllowed) {
    console.warn(`[StateMachine] Transición no permitida: ${currentStatus} -> ${newStatus}`);
  }
  
  return isAllowed;
}

/**
 * Verifica si una consignación está en estado terminal
 * Checks if consignment is in terminal state
 */
export function isTerminalConsignment(status: string): boolean {
  return TERMINAL_CONSIGNMENT_STATES.includes(status as TerminalConsignmentState);
}

/**
 * Verifica si una consignación está en estado activo (en proceso)
 * Checks if consignment is in active state (in process)
 */
export function isActiveConsignment(status: string): boolean {
  return ACTIVE_CONSIGNMENT_STATES.includes(status as ActiveConsignmentState);
}

/**
 * Obtiene los estados siguientes permitidos para una consignación
 * Gets allowed next states for a consignment
 */
export function getAllowedConsignmentTransitions(currentStatus: string): string[] {
  if (!CONSIGNMENT_STATES.includes(currentStatus as ConsignmentState)) {
    return [];
  }
  return CONSIGNMENT_TRANSITIONS[currentStatus as ConsignmentState] || [];
}

/**
 * Valida que un estado de consignación sea válido
 * Validates that a consignment state is valid
 */
export function isValidConsignmentState(state: string): state is ConsignmentState {
  return CONSIGNMENT_STATES.includes(state as ConsignmentState);
}

/**
 * Obtiene el label legible para un estado de consignación
 * Gets readable label for consignment state
 */
export function getConsignmentStateLabel(state: string): string {
  switch (state) {
    case 'received': return 'Recibido';
    case 'under_review': return 'En revisión';
    case 'approved': return 'Aprobado';
    case 'rejected': return 'Rechazado';
    case 'published': return 'Publicado';
    default: return state;
  }
}

/**
 * Obtiene el color semántico para un estado de consignación (para UI)
 * Gets semantic color for consignment state (for UI)
 */
export function getConsignmentStateColor(state: string): string {
  switch (state) {
    case 'received': return 'bg-blue-100 text-blue-800';
    case 'under_review': return 'bg-yellow-100 text-yellow-800';
    case 'approved': return 'bg-green-100 text-green-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    case 'published': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

// ============================================
// AUCTION STATE MACHINE - Máquina de Estados de Subastas
// ============================================

// Estados de subasta permitidos
export const AUCTION_STATES = ['scheduled', 'active', 'ended_pending_payment', 'closed_won', 'closed_failed', 'cancelled', 'expired', 'ended_no_bids'] as const;
export type AuctionState = typeof AUCTION_STATES[number];

// Estados activos de subasta (aceptando pujas)
export const ACTIVE_AUCTION_STATES = ['scheduled', 'active'] as const;
export type ActiveAuctionState = typeof ACTIVE_AUCTION_STATES[number];

// Estados terminal de subasta (no hay salida)
export const TERMINAL_AUCTION_STATES = ['closed_won', 'closed_failed', 'cancelled', 'expired', 'ended_no_bids'] as const;
export type TerminalAuctionState = typeof TERMINAL_AUCTION_STATES[number];

// Transiciones válidas de subasta: currentState -> [allowedNextStates]
const AUCTION_TRANSITIONS: Record<AuctionState, AuctionState[]> = {
  scheduled: ['active', 'cancelled'],
  active: ['ended_pending_payment', 'cancelled'],
  ended_pending_payment: ['closed_won', 'closed_failed', 'cancelled'],
  closed_won: [], // Terminal - sin transiciones salientes
  closed_failed: [], // Terminal - sin transiciones salientes
  cancelled: [], // Terminal - sin transiciones salientes
  expired: [], // Terminal - sin transiciones salientes
  ended_no_bids: [], // Terminal - sin transiciones salientes
};

// ============================================
// AUCTION GUARD FUNCTIONS - Funciones de Guardia para Subastas
// ============================================

/**
 * Valida si una transición de estado de subasta es permitida
 * Validates if an auction state transition is allowed
 * 
 * @param currentStatus - Estado actual de la subasta
 * @param newStatus - Estado nuevo al que se desea transitar
 * @returns true si la transición es válida
 */
export function canTransitionAuction(currentStatus: string, newStatus: string): boolean {
  // Validar que ambos estados existan
  if (!AUCTION_STATES.includes(currentStatus as AuctionState)) {
    console.warn(`[StateMachine] Estado de subasta inválido: ${currentStatus}`);
    return false;
  }
  if (!AUCTION_STATES.includes(newStatus as AuctionState)) {
    console.warn(`[StateMachine] Estado de subasta inválido: ${newStatus}`);
    return false;
  }
  
  // Verificar si la transición está permitida
  const allowedTransitions = AUCTION_TRANSITIONS[currentStatus as AuctionState];
  const isAllowed = allowedTransitions?.includes(newStatus as AuctionState) ?? false;
  
  if (!isAllowed) {
    console.warn(`[StateMachine] Transición no permitida: ${currentStatus} -> ${newStatus}`);
  }
  
  return isAllowed;
}

/**
 * Verifica si una subasta está en estado terminal
 * Checks if auction is in terminal state
 */
export function isTerminalAuction(status: string): boolean {
  return TERMINAL_AUCTION_STATES.includes(status as TerminalAuctionState);
}

/**
 * Verifica si una subasta está en estado activo (aceptando pujas)
 * Checks if auction is in active state (accepting bids)
 */
export function isActiveAuction(status: string): boolean {
  return ACTIVE_AUCTION_STATES.includes(status as ActiveAuctionState);
}

/**
 * Obtiene los estados siguientes permitidos para una subasta
 * Gets allowed next states for an auction
 */
export function getAllowedAuctionTransitions(currentStatus: string): string[] {
  if (!AUCTION_STATES.includes(currentStatus as AuctionState)) {
    return [];
  }
  return AUCTION_TRANSITIONS[currentStatus as AuctionState] || [];
}

/**
 * Valida que un estado de subasta sea válido
 * Validates that an auction state is valid
 */
export function isValidAuctionState(state: string): state is AuctionState {
  return AUCTION_STATES.includes(state as AuctionState);
}

/**
 * Obtiene el label legible para un estado de subasta
 * Gets readable label for auction state
 */
export function getAuctionStateLabel(state: string): string {
  switch (state) {
    case 'scheduled': return 'Programada';
    case 'active': return 'Activa';
    case 'ended_pending_payment': return 'Esperando pago';
    case 'closed_won': return 'Cerrada (ganada)';
    case 'closed_failed': return 'Cerrada (fallida)';
    case 'cancelled': return 'Cancelada';
    case 'expired': return 'Expirada';
    case 'ended_no_bids': return 'Sin ofertas';
    default: return state;
  }
}

/**
 * Obtiene el color semántico para un estado de subasta (para UI)
 * Gets semantic color for auction state (for UI)
 */
export function getAuctionStateColor(state: string): string {
  switch (state) {
    case 'scheduled': return 'bg-blue-100 text-blue-800';
    case 'active': return 'bg-green-100 text-green-800';
    case 'ended_pending_payment': return 'bg-yellow-100 text-yellow-800';
    case 'closed_won': return 'bg-purple-100 text-purple-800';
    case 'closed_failed': return 'bg-red-100 text-red-800';
    case 'cancelled': return 'bg-gray-100 text-gray-800';
    case 'expired': return 'bg-orange-100 text-orange-800';
    case 'ended_no_bids': return 'bg-gray-100 text-gray-600';
    default: return 'bg-gray-100 text-gray-800';
  }
}

// ============================================
// RAFFLE STATE MACHINE - Máquina de Estados de Rifas
// ============================================

// Estados de rifa permitidos
export const RAFFLE_STATES = ['draft', 'active', 'sold_out', 'draw_pending', 'drawn', 'cancelled', 'expired'] as const;
export type RaffleState = typeof RAFFLE_STATES[number];

// Estados activos de rifa (aceptando compras de tickets)
export const ACTIVE_RAFFLE_STATES = ['draft', 'active', 'sold_out'] as const;
export type ActiveRaffleState = typeof ACTIVE_RAFFLE_STATES[number];

// Estados terminal de rifa (no hay salida)
export const TERMINAL_RAFFLE_STATES = ['drawn', 'cancelled', 'expired'] as const;
export type TerminalRaffleState = typeof TERMINAL_RAFFLE_STATES[number];

// Transiciones válidas de rifa: currentState -> [allowedNextStates]
const RAFFLE_TRANSITIONS: Record<RaffleState, RaffleState[]> = {
  draft: ['active', 'cancelled'],
  active: ['sold_out', 'cancelled', 'expired'],
  sold_out: ['draw_pending', 'cancelled'],
  draw_pending: ['drawn', 'cancelled'],
  drawn: [], // Terminal - sin transiciones salientes
  cancelled: [], // Terminal - sin transiciones salientes
  expired: [], // Terminal - sin transiciones salientes
};

// ============================================
// RAFFLE GUARD FUNCTIONS - Funciones de Guardia para Rifas
// ============================================

/**
 * Valida si una transición de estado de rifa es permitida
 * Validates if a raffle state transition is allowed
 * 
 * @param currentStatus - Estado actual de la rifa
 * @param newStatus - Estado nuevo al que se desea transitar
 * @returns true si la transición es válida
 */
export function canTransitionRaffle(currentStatus: string, newStatus: string): boolean {
  // Validar que ambos estados existan
  if (!RAFFLE_STATES.includes(currentStatus as RaffleState)) {
    console.warn(`[StateMachine] Estado de rifa inválido: ${currentStatus}`);
    return false;
  }
  if (!RAFFLE_STATES.includes(newStatus as RaffleState)) {
    console.warn(`[StateMachine] Estado de rifa inválido: ${newStatus}`);
    return false;
  }
  
  // Verificar si la transición está permitida
  const allowedTransitions = RAFFLE_TRANSITIONS[currentStatus as RaffleState];
  const isAllowed = allowedTransitions?.includes(newStatus as RaffleState) ?? false;
  
  if (!isAllowed) {
    console.warn(`[StateMachine] Transición no permitida: ${currentStatus} -> ${newStatus}`);
  }
  
  return isAllowed;
}

/**
 * Verifica si una rifa está en estado terminal
 * Checks if raffle is in terminal state
 */
export function isTerminalRaffle(status: string): boolean {
  return TERMINAL_RAFFLE_STATES.includes(status as TerminalRaffleState);
}

/**
 * Verifica si una rifa está en estado activo (aceptando tickets)
 * Checks if raffle is in active state (accepting tickets)
 */
export function isActiveRaffle(status: string): boolean {
  return ACTIVE_RAFFLE_STATES.includes(status as ActiveRaffleState);
}

/**
 * Obtiene los estados siguientes permitidos para una rifa
 * Gets allowed next states for a raffle
 */
export function getAllowedRaffleTransitions(currentStatus: string): string[] {
  if (!RAFFLE_STATES.includes(currentStatus as RaffleState)) {
    return [];
  }
  return RAFFLE_TRANSITIONS[currentStatus as RaffleState] || [];
}

/**
 * Valida que un estado de rifa sea válido
 * Validates that a raffle state is valid
 */
export function isValidRaffleState(state: string): state is RaffleState {
  return RAFFLE_STATES.includes(state as RaffleState);
}

/**
 * Obtiene el label legible para un estado de rifa
 * Gets readable label for raffle state
 */
export function getRaffleStateLabel(state: string): string {
  switch (state) {
    case 'draft': return 'Borrador';
    case 'active': return 'Activa';
    case 'sold_out': return 'Agotada';
    case 'draw_pending': return 'Sorteo pendiente';
    case 'drawn': return 'Sorteada';
    case 'cancelled': return 'Cancelada';
    case 'expired': return 'Expirada';
    default: return state;
  }
}

/**
 * Obtiene el color semántico para un estado de rifa (para UI)
 * Gets semantic color for raffle state (for UI)
 */
export function getRaffleStateColor(state: string): string {
  switch (state) {
    case 'draft': return 'bg-gray-100 text-gray-800';
    case 'active': return 'bg-green-100 text-green-800';
    case 'sold_out': return 'bg-yellow-100 text-yellow-800';
    case 'draw_pending': return 'bg-blue-100 text-blue-800';
    case 'drawn': return 'bg-purple-100 text-purple-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    case 'expired': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
