// ============================================================
// Tipos para el módulo de Catálogo de Vehículos
// MTG Automotora - Plataforma MVP
// ============================================================

/**
 * Estados posibles de un vehículo en el sistema
 */
export type VehicleStatus = 
  | 'draft' 
  | 'published' 
  | 'reserved' 
  | 'sold' 
  | 'hidden' 
  | 'archived';

/**
 * Interfaz principal de vehículo
 */
export interface Vehicle {
  id: string;
  slug: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage_km: number | null;
  transmission: string | null;
  fuel_type: string | null;
  region: string | null;
  city: string | null;
  status: VehicleStatus;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  photos?: VehiclePhoto[];
}

/**
 * Fotos asociadas a un vehículo
 */
export interface VehiclePhoto {
  id: string;
  vehicle_id: string;
  url: string;
  position: number;
  created_at: string;
}

/**
 * Filtros para listado de vehículos
 */
export interface VehicleFilters {
  status?: VehicleStatus[];
  brand?: string[];
  model?: string[];
  year_min?: number;
  year_max?: number;
  price_min?: number;
  price_max?: number;
  mileage_min?: number;
  mileage_max?: number;
  region?: string;
  city?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Datos para crear un nuevo vehículo
 */
export interface CreateVehicleInput {
  slug: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage_km?: number | null;
  transmission?: string | null;
  fuel_type?: string | null;
  region?: string | null;
  city?: string | null;
  description?: string | null;
  created_by?: string | null;
}

/**
 * Datos para actualizar un vehículo
 */
export interface UpdateVehicleInput {
  slug?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  mileage_km?: number | null;
  transmission?: string | null;
  fuel_type?: string | null;
  region?: string | null;
  city?: string | null;
  status?: VehicleStatus;
  description?: string | null;
}

/**
 * Respuesta paginada de vehículos
 */
export interface PaginatedVehicles {
  vehicles: Vehicle[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Datos para agregar foto a vehículo
 */
export interface AddPhotoInput {
  url: string;
  position?: number;
}

/**
 * Tipo para transmitir tipo de combustible
 */
export type FuelType = 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'hybrid_diesel' | 'lng' | 'cng' | 'other';

/**
 * Tipo para transmisión
 */
export type TransmissionType = 'manual' | 'auto' | 'semi_auto' | 'cvt';
