// ============================================================
// Componente de Contenido del Catálogo (Client Component)
// MTG Automotora - Diseño Minimalista
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Vehicle, VehicleFilters } from '@/types/vehicle';
import { fetchVehicles } from '@/lib/api/catalog';
import { useCatalogFilters } from '@/hooks/use-catalog-filters';
import { VehicleCard, VehicleCardSkeleton } from '@/components/vehicle-card';
import { CatalogFilters, ActiveFilters } from '@/components/catalog-filters';
import { Button } from '@/components/ui/button';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { 
  AlertCircle, 
  CarFront,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CatalogContentProps {
  initialVehicles: Vehicle[];
  initialPagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  initialFilters: VehicleFilters;
}

/**
 * Componente de contenido del catálogo
 * Maneja la interacción con filtros, paginación y carga de datos
 */
export function CatalogContent({
  initialVehicles,
  initialPagination,
  initialFilters,
}: CatalogContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Estado de vehículos y carga
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [pagination, setPagination] = useState(initialPagination);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hook de filtros
  const {
    filters,
    setFiltersBulk,
    clearFilters,
    goToPage,
    nextPage,
    prevPage,
    activeFiltersCount,
  } = useCatalogFilters();

  // Sincronizar filtros con URL
  useEffect(() => {
    const newFilters = {
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
    setFiltersBulk(newFilters);
  }, []);

  // Cargar vehículos cuando cambian los filtros
  useEffect(() => {
    const loadVehicles = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchVehicles(filters);
        setVehicles(result.vehicles);
        setPagination(result.pagination);
      } catch (err) {
        console.error('Error loading vehicles:', err);
        setError('Error al cargar los vehículos. Por favor, intenta de nuevo.');
      } finally {
        setIsLoading(false);
      }
    };

    loadVehicles();
  }, [filters]);

  // Actualizar URL cuando cambian los filtros
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.brand && filters.brand.length > 0) {
      params.set('brand', filters.brand.join(','));
    }
    if (filters.model && filters.model.length > 0) {
      params.set('model', filters.model.join(','));
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
    if (filters.region) {
      params.set('region', filters.region);
    }
    if (filters.search) {
      params.set('search', filters.search);
    }
    if (filters.limit && filters.limit !== 12) {
      params.set('limit', filters.limit.toString());
    }
    if (filters.offset && filters.offset !== 0) {
      params.set('offset', filters.offset.toString());
    }

    const queryString = params.toString();
    router.replace(queryString ? `?${queryString}` : window.location.pathname, { scroll: false });
  }, [filters, router]);

  // Calcular número de páginas
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  // Manejar cambio de filtro
  const handleFilterChange = useCallback((newFilters: Partial<VehicleFilters>) => {
    setFiltersBulk(newFilters);
  }, [setFiltersBulk]);

  // Manejar limpiar filtros
  const handleClearFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  // Manejar remover filtro específico
  const handleRemoveFilter = useCallback((key: keyof VehicleFilters) => {
    const filterUpdates: Partial<VehicleFilters> = {};
    
    if (key === 'brand' || key === 'model') {
      filterUpdates[key] = [];
    } else if (key === 'price_min' || key === 'price_max') {
      filterUpdates.price_min = undefined;
      filterUpdates.price_max = undefined;
    } else if (key === 'year_min' || key === 'year_max') {
      filterUpdates.year_min = undefined;
      filterUpdates.year_max = undefined;
    } else {
      filterUpdates[key] = undefined;
    }
    
    setFiltersBulk(filterUpdates);
  }, [setFiltersBulk]);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar de filtros - Desktop */}
      <aside className="hidden lg:block w-72 flex-shrink-0">
        <CatalogFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          activeFiltersCount={activeFiltersCount}
        />
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 min-w-0">
        {/* Filtros activos */}
        <div className="mb-6">
          <ActiveFilters
            filters={filters}
            onRemoveFilter={handleRemoveFilter}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Resultados */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            {pagination.total === 0 ? (
              'No se encontraron vehículos'
            ) : (
              <>
                Mostrando{' '}
                <span className="font-medium text-foreground">
                  {pagination.offset + 1}
                </span>
                {' '}-{' '}
                <span className="font-medium text-foreground">
                  {Math.min(pagination.offset + pagination.limit, pagination.total)}
                </span>
                {' '}
                de{' '}
                <span className="font-medium text-foreground">
                  {pagination.total}
                </span>
                {' '}
                vehículos
              </>
            )}
          </p>
        </div>

        {/* Grid de vehículos */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <VehicleCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">
              Error al cargar los vehículos
            </p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CarFront className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No se encontraron vehículos
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              No hay vehículos que coincidan con los filtros seleccionados. 
              Prueba cambiando los filtros o explora nuestro catálogo completo.
            </p>
            <Button variant="outline" onClick={handleClearFilters}>
              Ver todos los vehículos
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-12">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                </PaginationItem>
                
                {/* Números de página */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        isActive={currentPage === pageNum}
                        onClick={() => goToPage(pageNum)}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={nextPage}
                    disabled={!pagination.hasMore}
                    className="gap-1"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </main>
    </div>
  );
}

export default CatalogContent;
