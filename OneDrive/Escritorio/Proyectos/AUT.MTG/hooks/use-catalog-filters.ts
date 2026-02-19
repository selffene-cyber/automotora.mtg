// ============================================================
// Hook para gestionar filtros del catálogo
// MTG Automotora - Plataforma MVP
// ============================================================

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { VehicleFilters } from '@/types/vehicle';

/**
 * Estado inicial de los filtros
 */
const DEFAULT_FILTERS: VehicleFilters = {
  status: ['published'],
  brand: [],
  model: [],
  year_min: undefined,
  year_max: undefined,
  price_min: undefined,
  price_max: undefined,
  region: undefined,
  city: undefined,
  search: undefined,
  limit: 12,
  offset: 0,
};

/**
 * Opciones de regiones de Chile
 */
export const REGIONES_CHILE = [
  { value: 'arica', label: 'Arica y Parinacota' },
  { value: 'tarapaca', label: 'Tarapacá' },
  { value: 'antofagasta', label: 'Antofagasta' },
  { value: 'atacama', label: 'Atacama' },
  { value: 'coquimbo', label: 'Coquimbo' },
  { value: 'valparaiso', label: 'Valparaíso' },
  { value: 'metropolitana', label: 'Metropolitana' },
  { value: 'ohiggins', label: "O'Higgins" },
  { value: 'maule', label: 'Maule' },
  { value: 'nuble', label: 'Ñuble' },
  { value: 'biobio', label: 'Biobío' },
  { value: 'araucania', label: 'La Araucanía' },
  { value: 'losrios', label: 'Los Ríos' },
  { value: 'loslagos', label: 'Los Lagos' },
  { value: 'aysen', label: 'Aysén' },
  { value: 'magallanes', label: 'Magallanes' },
];

/**
 * Hook para gestionar filtros del catálogo con sincronización de URL
 */
export function useCatalogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Estado de filtros
  const [filters, setFilters] = useState<VehicleFilters>(DEFAULT_FILTERS);
  const [isInitialized, setIsInitialized] = useState(false);

  // Inicializar filtros desde URL
  useEffect(() => {
    const urlFilters: VehicleFilters = {
      status: ['published'],
      brand: searchParams.get('brand')?.split(',').filter(Boolean) || [],
      model: searchParams.get('model')?.split(',').filter(Boolean) || [],
      year_min: searchParams.get('year_min') ? parseInt(searchParams.get('year_min')!) : undefined,
      year_max: searchParams.get('year_max') ? parseInt(searchParams.get('year_max')!) : undefined,
      price_min: searchParams.get('price_min') ? parseInt(searchParams.get('price_min')!) : undefined,
      price_max: searchParams.get('price_max') ? parseInt(searchParams.get('price_max')!) : undefined,
      region: searchParams.get('region') || undefined,
      city: searchParams.get('city') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 12,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    setFilters(urlFilters);
    setIsInitialized(true);
  }, []);

  // Sincronizar filtros con URL
  const updateURL = useCallback((newFilters: VehicleFilters) => {
    const params = new URLSearchParams();

    if (newFilters.brand && newFilters.brand.length > 0) {
      params.set('brand', newFilters.brand.join(','));
    }
    if (newFilters.model && newFilters.model.length > 0) {
      params.set('model', newFilters.model.join(','));
    }
    if (newFilters.year_min !== undefined) {
      params.set('year_min', newFilters.year_min.toString());
    }
    if (newFilters.year_max !== undefined) {
      params.set('year_max', newFilters.year_max.toString());
    }
    if (newFilters.price_min !== undefined) {
      params.set('price_min', newFilters.price_min.toString());
    }
    if (newFilters.price_max !== undefined) {
      params.set('price_max', newFilters.price_max.toString());
    }
    if (newFilters.region) {
      params.set('region', newFilters.region);
    }
    if (newFilters.city) {
      params.set('city', newFilters.city);
    }
    if (newFilters.search) {
      params.set('search', newFilters.search);
    }
    if (newFilters.limit && newFilters.limit !== 12) {
      params.set('limit', newFilters.limit.toString());
    }
    if (newFilters.offset && newFilters.offset !== 0) {
      params.set('offset', newFilters.offset.toString());
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [pathname, router]);

  // Actualizar un filtro específico
  const setFilter = useCallback(<K extends keyof VehicleFilters>(
    key: K,
    value: VehicleFilters[K]
  ) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value, offset: 0 }; // Resetear offset al cambiar filtros
      return newFilters;
    });
  }, []);

  // Actualizar múltiples filtros
  const setFiltersBulk = useCallback((newFilters: Partial<VehicleFilters>) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters, offset: 0 }; // Resetear offset
      return updated;
    });
  }, []);

  // Limpiar todos los filtros
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  // Cambiar página
  const goToPage = useCallback((page: number) => {
    const limit = filters.limit || 12;
    const offset = (page - 1) * limit;
    setFilters(prev => ({ ...prev, offset }));
  }, [filters.limit]);

  // Siguiente página
  const nextPage = useCallback(() => {
    const limit = filters.limit || 12;
    const offset = (filters.offset || 0) + limit;
    setFilters(prev => ({ ...prev, offset }));
  }, [filters.limit, filters.offset]);

  // Página anterior
  const prevPage = useCallback(() => {
    const limit = filters.limit || 12;
    const offset = Math.max(0, (filters.offset || 0) - limit);
    setFilters(prev => ({ ...prev, offset }));
  }, [filters.limit, filters.offset]);

  // Contar filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.brand && filters.brand.length > 0) count++;
    if (filters.model && filters.model.length > 0) count++;
    if (filters.year_min !== undefined || filters.year_max !== undefined) count++;
    if (filters.price_min !== undefined || filters.price_max !== undefined) count++;
    if (filters.region) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  return {
    filters,
    isInitialized,
    setFilter,
    setFiltersBulk,
    clearFilters,
    goToPage,
    nextPage,
    prevPage,
    activeFiltersCount,
    updateURL,
  };
}

export type { VehicleFilters };
