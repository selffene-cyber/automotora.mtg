// ============================================================
// Componente de Información del Vehículo
// MTG Automotora - Diseño Minimalista
// ============================================================

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Vehicle } from '@/types/vehicle';
import { 
  formatPriceCLP, 
  formatMileage, 
  getTransmissionLabel, 
  getFuelTypeLabel 
} from '@/lib/api/catalog';
import { cn } from '@/lib/utils';
import { 
  Car, 
  Gauge, 
  Fuel, 
  Settings, 
  MapPin, 
  Calendar,
  Tag
} from 'lucide-react';

interface VehicleInfoProps {
  vehicle: Vehicle;
  className?: string;
}

/**
 * Componente que muestra la información técnica del vehículo
 * Diseño: Minimalista, profesional con iconos
 */
export function VehicleInfo({ vehicle, className }: VehicleInfoProps) {
  const vehicleTitle = `${vehicle.brand} ${vehicle.model} ${vehicle.year}`;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Título y precio principal */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          {vehicleTitle}
        </h1>
        <p className="text-4xl md:text-5xl font-bold tracking-tight text-primary">
          {formatPriceCLP(vehicle.price)}
        </p>
      </div>

      {/* Características principales */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 tracking-tight">Características</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {/* Año */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Año</p>
                <p className="font-semibold">{vehicle.year}</p>
              </div>
            </div>

            {/* Kilometraje */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Gauge className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kilometraje</p>
                <p className="font-semibold">{formatMileage(vehicle.mileage_km)}</p>
              </div>
            </div>

            {/* Transmisión */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transmisión</p>
                <p className="font-semibold">{getTransmissionLabel(vehicle.transmission)}</p>
              </div>
            </div>

            {/* Combustible */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Fuel className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Combustible</p>
                <p className="font-semibold">{getFuelTypeLabel(vehicle.fuel_type)}</p>
              </div>
            </div>

            {/* Ubicación */}
            {(vehicle.region || vehicle.city) && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ubicación</p>
                  <p className="font-semibold">
                    {[vehicle.city, vehicle.region].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Marca */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Marca</p>
                <p className="font-semibold">{vehicle.brand}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Descripción */}
      {vehicle.description && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 tracking-tight">Descripción</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {vehicle.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tags/Badges adicionales */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="flex items-center gap-1.5 py-1.5">
          <Tag className="h-3.5 w-3.5" />
          {vehicle.brand}
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1.5 py-1.5">
          {vehicle.model}
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1.5 py-1.5">
          {vehicle.year}
        </Badge>
        {vehicle.transmission && (
          <Badge variant="outline" className="flex items-center gap-1.5 py-1.5">
            {getTransmissionLabel(vehicle.transmission)}
          </Badge>
        )}
        {vehicle.fuel_type && (
          <Badge variant="outline" className="flex items-center gap-1.5 py-1.5">
            {getFuelTypeLabel(vehicle.fuel_type)}
          </Badge>
        )}
      </div>
    </div>
  );
}

export default VehicleInfo;
