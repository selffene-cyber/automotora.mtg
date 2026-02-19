// ============================================================
// Tipos para el módulo de Consignaciones
// MTG Automotora - Plataforma MVP
// ============================================================

/**
 * Estados posibles de una consignación
 */
export type ConsignmentStatus = 
  | 'received' 
  | 'under_review' 
  | 'approved' 
  | 'rejected' 
  | 'published';

/**
 * Interfaz principal de consignación
 */
export interface Consignment {
  id: string;
  vehicle_id: string | null;
  owner_name: string;
  owner_email: string | null;
  owner_phone: string;
  brand: string;
  model: string;
  year: number;
  expected_price: number | null;
  notes: string | null;
  status: ConsignmentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Datos relacionados
  photos?: ConsignmentPhoto[];
  vehicle?: {
    id: string;
    slug: string;
    price: number;
  };
  reviewer?: {
    id: string;
    name: string;
  };
}

/**
 * Fotos asociadas a una consignación
 */
export interface ConsignmentPhoto {
  id: string;
  consignment_id: string;
  url: string;
  position: number;
  created_at: string;
}

/**
 * Datos para crear una nueva consignación (público)
 */
export interface CreateConsignmentInput {
  owner_name: string;
  owner_email?: string;
  owner_phone: string;
  brand: string;
  model: string;
  year: number;
  expected_price?: number | null;
  notes?: string | null;
}

/**
 * Datos para actualizar una consignación (admin)
 */
export interface UpdateConsignmentInput {
  vehicle_id?: string | null;
  owner_name?: string;
  owner_email?: string | null;
  owner_phone?: string;
  brand?: string;
  model?: string;
  year?: number;
  expected_price?: number | null;
  notes?: string | null;
  status?: ConsignmentStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
}

/**
 * Filtros para listar consignaciones
 */
export interface ConsignmentFilters {
  status?: ConsignmentStatus[];
  brand?: string[];
  model?: string[];
  year_min?: number;
  year_max?: number;
  expected_price_min?: number;
  expected_price_max?: number;
  owner_phone?: string;
  created_after?: string;
  created_before?: string;
  limit?: number;
  offset?: number;
}

/**
 * Respuesta paginada de consignaciones
 */
export interface PaginatedConsignments {
  consignments: Consignment[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Datos para agregar foto a consignación
 */
export interface AddConsignmentPhotoInput {
  url: string;
  position?: number;
}

/**
 * Valores válidos para status de consignación
 */
export const CONSIGNMENT_STATUS_VALUES: ConsignmentStatus[] = [
  'received',
  'under_review',
  'approved',
  'rejected',
  'published'
];

/**
 * Estados de consignación que están en revisión
 */
export const REVIEW_CONSIGNMENT_STATUSES: ConsignmentStatus[] = [
  'under_review'
];

/**
 * Estados terminal de consignación (no pueden cambiar)
 */
export const TERMINAL_CONSIGNMENT_STATUSES: ConsignmentStatus[] = [
  'rejected',
  'published'
];

/**
 * Estados de consignación activos (en proceso)
 */
export const ACTIVE_CONSIGNMENT_STATUSES: ConsignmentStatus[] = [
  'received',
  'under_review',
  'approved'
];

/**
 * Función para validar status de consignación
 */
export function isValidConsignmentStatus(status: string): status is ConsignmentStatus {
  return CONSIGNMENT_STATUS_VALUES.includes(status as ConsignmentStatus);
}

/**
 * Función para verificar si un status está en revisión
 */
export function isReviewConsignmentStatus(status: ConsignmentStatus): boolean {
  return REVIEW_CONSIGNMENT_STATUSES.includes(status);
}

/**
 * Función para verificar si un status es terminal
 */
export function isTerminalConsignmentStatus(status: ConsignmentStatus): boolean {
  return TERMINAL_CONSIGNMENT_STATUSES.includes(status);
}

/**
 * Función para verificar si un status es activo
 */
export function isActiveConsignmentStatus(status: ConsignmentStatus): boolean {
  return ACTIVE_CONSIGNMENT_STATUSES.includes(status);
}

/**
 * Obtiene el label legible para un estado de consignación
 */
export function getConsignmentStatusLabel(status: ConsignmentStatus): string {
  switch (status) {
    case 'received': return 'Recibido';
    case 'under_review': return 'En revisión';
    case 'approved': return 'Aprobado';
    case 'rejected': return 'Rechazado';
    case 'published': return 'Publicado';
    default: return status;
  }
}

/**
 * Obtiene el color semántico para un estado de consignación (para UI)
 */
export function getConsignmentStatusColor(status: ConsignmentStatus): string {
  switch (status) {
    case 'received': return 'bg-blue-100 text-blue-800';
    case 'under_review': return 'bg-yellow-100 text-yellow-800';
    case 'approved': return 'bg-green-100 text-green-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    case 'published': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
