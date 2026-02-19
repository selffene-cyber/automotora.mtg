// ============================================================
// Página de Detalle de Vehículo (Vehicle Detail Page)
// MTG Automotora - Diseño Minimalista
// ============================================================

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchVehicleBySlug } from '@/lib/api/catalog';
import { VehicleGallery } from '@/components/vehicle-gallery';
import { VehicleInfo } from '@/components/vehicle-info';
import { VehicleCTA } from '@/components/vehicle-cta';
import { LeadForm } from '@/components/lead-form';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { 
  Home, 
  Car, 
  ChevronRight 
} from 'lucide-react';
import Link from 'next/link';

interface VehiclePageProps {
  params: Promise<{ id: string }>;
}

/**
 * Genera los metadatos dinámicos para SEO
 */
export async function generateMetadata({ 
  params 
}: VehiclePageProps): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const vehicle = await fetchVehicleBySlug(id);
    
    if (!vehicle) {
      return {
        title: 'Vehículo no encontrado - MTG Automotora',
        description: 'El vehículo que buscas no está disponible.',
      };
    }

    const vehicleTitle = `${vehicle.brand} ${vehicle.model} ${vehicle.year}`;
    const formattedPrice = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(vehicle.price);

    return {
      title: `${vehicleTitle} - ${formattedPrice} | MTG Automotora`,
      description: `${vehicleTitle} en venta. ${vehicle.mileage_km ? `${vehicle.mileage_km.toLocaleString()} km, ` : ''}${vehicle.transmission || ''} ${vehicle.fuel_type || ''}. ${vehicle.description?.substring(0, 150) || 'Contáctanos para más información.'}`,
      openGraph: {
        title: vehicleTitle,
        description: `Precio: ${formattedPrice}`,
        type: 'website',
        url: `/vehiculos/${vehicle.slug}`,
        siteName: 'MTG Automotora',
      },
      alternates: {
        canonical: `/vehiculos/${vehicle.slug}`,
      },
    };
  } catch (error) {
    return {
      title: 'Vehículo - MTG Automotora',
    };
  }
}

/**
 * Página de detalle de vehículo
 * Diseño: Minimalista, profesional, responsive
 */
export default async function VehiclePage({ params }: VehiclePageProps) {
  const { id } = await params;
  
  // Obtener vehículo por slug
  const vehicle = await fetchVehicleBySlug(id);

  // Si no existe o no está publicado, mostrar 404
  if (!vehicle) {
    notFound();
  }

  const vehicleTitle = `${vehicle.brand} ${vehicle.model} ${vehicle.year}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b border-border/50 bg-muted/30">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link 
              href="/" 
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Inicio</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link 
              href="/catalogo" 
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Car className="h-4 w-4" />
              <span>Catálogo</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium truncate max-w-[200px]">
              {vehicle.brand} {vehicle.model}
            </span>
          </nav>
        </div>
      </div>

      {/* Hero / Title Section */}
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-balance">
            {vehicleTitle}
          </h1>
          <p className="text-muted-foreground mt-1">
            Ficha técnica y información de contacto
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Gallery & Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Photo Gallery */}
            <section>
              <h2 className="sr-only">Galería de fotos</h2>
              <VehicleGallery 
                photos={vehicle.photos || []}
                vehicleName={vehicleTitle}
              />
            </section>

            {/* Vehicle Information */}
            <section>
              <h2 className="sr-only">Información del vehículo</h2>
              <VehicleInfo vehicle={vehicle} />
            </section>

            {/* Lead Form Section */}
            <section>
              <Separator className="my-8" />
              <div className="max-w-md">
                <LeadForm 
                  vehicleId={vehicle.id}
                  vehicleName={vehicleTitle}
                />
              </div>
            </section>
          </div>

          {/* Right Column - CTA */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <VehicleCTA vehicle={vehicle} />
            </div>
          </div>
        </div>
      </div>

      {/* SEO Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: vehicleTitle,
            description: vehicle.description || `Vehículo ${vehicleTitle} en venta`,
            offers: {
              '@type': 'Offer',
              price: vehicle.price,
              priceCurrency: 'CLP',
              availability: vehicle.status === 'published' 
                ? 'https://schema.org/InStock' 
                : 'https://schema.org/OutOfStock',
            },
            brand: {
              '@type': 'Brand',
              name: vehicle.brand,
            },
            vehicleModel: vehicle.model,
            vehicleModelDate: vehicle.year.toString(),
          }),
        }}
      />
    </div>
  );
}
