// ============================================================
// Página de Catálogo Público de Vehículos
// MTG Automotora - Diseño Minimalista (Vercel/Linear Style)
// ============================================================

import { Suspense } from 'react';
import { Metadata } from 'next';
import { fetchVehicles } from '@/lib/api/catalog';
import { VehicleFilters } from '@/types/vehicle';
import { CatalogContent } from './catalog-content';

export const metadata: Metadata = {
  title: 'Catálogo de Vehículos | MTG Automotora',
  description: 'Explora nuestro catálogo de vehículos disponibles. Encuentra tu próximo auto al mejor precio en Chile.',
  keywords: 'vehículos, autos, catalogo, Chile, comprar auto, MTG Automotora',
  openGraph: {
    title: 'Catálogo de Vehículos | MTG Automotora',
    description: 'Explora nuestro catálogo de vehículos disponibles',
    type: 'website',
  },
};

// Parámetros de la página
interface CatalogPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Página de catálogo público
 * Server Component que fetchea los datos iniciales
 */
export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  // Parsear parámetros de búsqueda
  const params = await searchParams;
  
  const filters: VehicleFilters = {
    status: ['published'],
    brand: typeof params.brand === 'string' ? params.brand.split(',').filter(Boolean) : [],
    model: typeof params.model === 'string' ? params.model.split(',').filter(Boolean) : [],
    year_min: params.year_min ? parseInt(params.year_min as string) : undefined,
    year_max: params.year_max ? parseInt(params.year_max as string) : undefined,
    price_min: params.price_min ? parseInt(params.price_min as string) : undefined,
    price_max: params.price_max ? parseInt(params.price_max as string) : undefined,
    region: typeof params.region === 'string' ? params.region : undefined,
    city: typeof params.city === 'string' ? params.city : undefined,
    search: typeof params.search === 'string' ? params.search : undefined,
    limit: params.limit ? parseInt(params.limit as string) : 12,
    offset: params.offset ? parseInt(params.offset as string) : 0,
  };

  // Fetch inicial de vehículos
  let vehiclesData = {
    vehicles: [] as any[],
    pagination: {
      total: 0,
      limit: 12,
      offset: 0,
      hasMore: false,
    },
  };

  try {
    vehiclesData = await fetchVehicles(filters);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    // Continuamos con datos vacíos
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-muted/50 to-background border-b">
        <div className="container px-4 py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-balance">
              Catálogo de Vehículos
            </h1>
            <p className="text-lg text-muted-foreground text-balance">
              Encuentra el vehículo perfecto para ti. 
              Amplio inventario de autos disponibles al mejor precio.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container px-4 py-8">
        <Suspense fallback={<CatalogSkeleton />}>
          <CatalogContent 
            initialVehicles={vehiclesData.vehicles}
            initialPagination={vehiclesData.pagination}
            initialFilters={filters}
          />
        </Suspense>
      </section>
    </div>
  );
}

/**
 * Skeleton de carga para la página
 */
function CatalogSkeleton() {
  return (
    <div className="space-y-8">
      {/* Filters skeleton */}
      <div className="h-12 w-full bg-muted animate-pulse rounded" />
      
      {/* Results count skeleton */}
      <div className="h-6 w-48 bg-muted animate-pulse rounded" />
      
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[380px] bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
      
      {/* Pagination skeleton */}
      <div className="h-12 w-full flex justify-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-10 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}
