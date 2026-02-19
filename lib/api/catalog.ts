// ============================================================
// API Client para el Catálogo de Vehículos
// MTG Automotora - Plataforma MVP
// ============================================================

import { Vehicle, VehicleFilters, PaginatedVehicles } from '@/types/vehicle';

/**
 * Construye los query params para la API
 */
function buildQueryParams(filters: VehicleFilters): string {
  const params = new URLSearchParams();

  if (filters.brand && filters.brand.length > 0) {
    params.set('brand', filters.brand.join(','));
  }
  if (filters.model && filters.model.length > 0) {
    params.set('model', filters.model.join(','));
  }
  if (filters.status && filters.status.length > 0) {
    params.set('status', filters.status.join(','));
  }
  if (filters.year_min !== undefined) {
    params.set('year_min', filters.year_min.toString());
  }
  if (filters.year_max !== undefined) {
    params.set('year_max', filters.year_max.toString());
  }
  if (filters.price_min !== undefined) {
    params.set('price_min', filters.price_min.toString());
  }
  if (filters.price_max !== undefined) {
    params.set('price_max', filters.price_max.toString());
  }
  if (filters.mileage_min !== undefined) {
    params.set('mileage_min', filters.mileage_min.toString());
  }
  if (filters.mileage_max !== undefined) {
    params.set('mileage_max', filters.mileage_max.toString());
  }
  if (filters.region) {
    params.set('region', filters.region);
  }
  if (filters.city) {
    params.set('city', filters.city);
  }
  if (filters.search) {
    params.set('search', filters.search);
  }
  if (filters.limit !== undefined) {
    params.set('limit', filters.limit.toString());
  }
  if (filters.offset !== undefined) {
    params.set('offset', filters.offset.toString());
  }

  return params.toString();
}

/**
 * Obtiene vehículos con filtros y paginación
 */
export async function fetchVehicles(filters: VehicleFilters = {}): Promise<{
  vehicles: Vehicle[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}> {
  const queryParams = buildQueryParams(filters);
  const url = `/api/vehicles${queryParams ? `?${queryParams}` : ''}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Error al obtener los vehículos');
  }

  const result = await response.json();
  return result;
}

/**
 * Obtiene un vehículo por su slug
 */
export async function fetchVehicleBySlug(slug: string): Promise<Vehicle | null> {
  const response = await fetch(`/api/vehicles/${slug}`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('Error al obtener el vehículo');
  }

  const result = await response.json();
  return result.data || null;
}

/**
 * Formatea un número como precio en pesos chilenos
 */
export function formatPriceCLP(price: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Formatea el kilometraje
 */
export function formatMileage(mileage: number | null): string {
  if (mileage === null || mileage === undefined) {
    return 'No especificado';
  }
  return new Intl.NumberFormat('es-CL').format(mileage) + ' km';
}

/**
 * Obtiene el texto de transmisión
 */
export function getTransmissionLabel(transmission: string | null): string {
  if (!transmission) return 'No especificado';
  
  const labels: Record<string, string> = {
    'manual': 'Manual',
    'auto': 'Automático',
    'semi_auto': 'Semi Automático',
    'cvt': 'CVT',
  };
  
  return labels[transmission.toLowerCase()] || transmission;
}

/**
 * Obtiene el texto de tipo de combustible
 */
export function getFuelTypeLabel(fuelType: string | null): string {
  if (!fuelType) return 'No especificado';
  
  const labels: Record<string, string> = {
    'gasoline': 'Gasolina',
    'diesel': 'Diésel',
    'electric': 'Eléctrico',
    'hybrid': 'Híbrido',
    'hybrid_diesel': 'Híbrido Diésel',
    'lng': 'GNL',
    'cng': 'GNC',
    'other': 'Otro',
  };
  
  return labels[fuelType.toLowerCase()] || fuelType;
}

/**
 * Obtiene la URL de la imagen principal de un vehículo
 */
export function getVehicleMainImage(vehicle: Vehicle): string {
  if (vehicle.photos && vehicle.photos.length > 0) {
    // Ordenar por posición y devolver la primera
    const sortedPhotos = [...vehicle.photos].sort((a, b) => a.position - b.position);
    return sortedPhotos[0].url;
  }
  // Imagen placeholder si no hay fotos
  return '/images/vehicle-placeholder.svg';
}


