// ============================================================
// Componente de Tarjeta de Vehículo
// MTG Automotora - Diseño Minimalista (Vercel/Linear Style)
// ============================================================

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  formatPriceCLP, 
  formatMileage, 
  getTransmissionLabel, 
  getFuelTypeLabel,
  getVehicleMainImage 
} from '@/lib/api/catalog';
import { Vehicle } from '@/types/vehicle';
import { 
  Car, 
  Gauge, 
  Fuel, 
  Settings,
  MapPin,
  ArrowRight,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VehicleCardProps {
  vehicle: Vehicle;
  className?: string;
}

/**
 * Tarjeta de vehículo para el catálogo público
 * Diseño: Minimalista, fino, profesional
 */
export function VehicleCard({ vehicle, className }: VehicleCardProps) {
  const mainImage = getVehicleMainImage(vehicle);

  return (
    <Card className={cn(
      "group overflow-hidden border-input shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20",
      className
    )}>
      {/* Imagen del vehículo */}
      <Link href={`/vehiculos/${vehicle.slug}`} className="block relative aspect-[16/10] overflow-hidden bg-muted">
        <Image
          src={mainImage}
          alt={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {/* Badge de estado */}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-xs font-medium">
            {vehicle.year}
          </Badge>
        </div>
        {/* Botón de favorito */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/90"
        >
          <Heart className="h-4 w-4" />
          <span className="sr-only">Agregar a favoritos</span>
        </Button>
      </Link>

      {/* Contenido */}
      <CardContent className="p-4 space-y-3">
        {/* Título */}
        <div className="space-y-1">
          <h3 className="font-semibold text-lg tracking-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {vehicle.brand} {vehicle.model}
          </h3>
          <p className="text-sm text-muted-foreground">
            {vehicle.year}
          </p>
        </div>

        {/* Precio */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {formatPriceCLP(vehicle.price)}
          </p>
        </div>

        {/* Características */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {/* Kilometraje */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Gauge className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{formatMileage(vehicle.mileage_km)}</span>
          </div>
          
          {/* Transmisión */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Settings className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{getTransmissionLabel(vehicle.transmission)}</span>
          </div>
          
          {/* Combustible */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Fuel className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{getFuelTypeLabel(vehicle.fuel_type)}</span>
          </div>
          
          {/* Ubicación */}
          {vehicle.region && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{vehicle.region}</span>
            </div>
          )}
        </div>
      </CardContent>

      {/* Footer con acción */}
      <CardFooter className="p-4 pt-0">
        <Button 
          asChild 
          className="w-full group-hover:bg-primary/90 transition-colors"
        >
          <Link href={`/vehiculos/${vehicle.slug}`} className="flex items-center justify-center gap-2">
            Ver Detalles
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Skeleton para carga de tarjeta de vehículo
 */
export function VehicleCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden border-input shadow-sm", className)}>
      {/* Imagen skeleton */}
      <div className="aspect-[16/10] bg-muted animate-pulse" />
      
      {/* Contenido skeleton */}
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
        </div>
        
        <div className="pt-2 border-t border-border/50">
          <div className="h-7 w-1/2 bg-muted animate-pulse rounded" />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="h-4 bg-muted animate-pulse rounded" />
          <div className="h-4 bg-muted animate-pulse rounded" />
          <div className="h-4 bg-muted animate-pulse rounded" />
          <div className="h-4 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
      </CardFooter>
    </Card>
  );
}

export default VehicleCard;
