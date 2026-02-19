// ============================================================
// Componente de CTA (Call to Action) para Vehículo
// MTG Automotora - Diseño Minimalista
// ============================================================

'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPriceCLP } from '@/lib/api/catalog';
import { cn } from '@/lib/utils';
import { 
  MessageCircle, 
  Calendar, 
  Phone,
  AlertCircle 
} from 'lucide-react';
import type { Vehicle } from '@/types/vehicle';
import { ReservationModal } from './reservation-modal';

interface VehicleCTAProps {
  vehicle: Vehicle;
  whatsappNumber?: string;
  className?: string;
}

// Número de WhatsApp por defecto (se puede configurar en variables de entorno)
const DEFAULT_WHATSAPP = '56912345678';

const DEPOSIT_AMOUNT = 100000;

/**
 * Componente de acciones CTA para la ficha de vehículo
 * Incluye botón de WhatsApp, Reservar y estado del vehículo
 */
export function VehicleCTA({ 
  vehicle, 
  whatsappNumber = DEFAULT_WHATSAPP,
  className 
}: VehicleCTAProps) {
  const [isReservationOpen, setIsReservationOpen] = useState(false);

  // Determinar si el vehículo está disponible
  const isAvailable = vehicle.status === 'published';
  const isReservedOrSold = vehicle.status === 'reserved' || vehicle.status === 'sold';

  // Generar mensaje de WhatsApp
  const getWhatsAppMessage = () => {
    const message = `Hola, estoy interesado en el ${vehicle.brand} ${vehicle.model} ${vehicle.year} (${formatPriceCLP(vehicle.price)}). ¿Está disponible?`;
    return encodeURIComponent(message);
  };

  // Generar link de WhatsApp
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${getWhatsAppMessage()}`;

  const vehicleTitle = `${vehicle.brand} ${vehicle.model} ${vehicle.year}`;

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardContent className="p-6">
          {/* Estado del vehículo */}
          {!isAvailable && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">
                  {vehicle.status === 'reserved' && 'Vehículo reservado'}
                  {vehicle.status === 'sold' && 'Vehículo vendido'}
                  {vehicle.status === 'draft' && 'En revisión'}
                  {vehicle.status === 'hidden' && 'No disponible'}
                  {(!vehicle.status || vehicle.status === 'archived') && 'No disponible'}
                </span>
              </div>
            </div>
          )}

          {/* Título del vehículo */}
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            {vehicleTitle}
          </h2>
          <p className="text-3xl font-extrabold text-primary mb-6">
            {formatPriceCLP(vehicle.price)}
          </p>

          {/* Botones de acción */}
          {isReservedOrSold ? (
            /* Estado no disponible */
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-muted text-center">
                <p className="text-muted-foreground font-medium">
                  {vehicle.status === 'reserved' 
                    ? 'Este vehículo se encuentra reservado actualmente.'
                    : 'Este vehículo ya ha sido vendido.'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Te invitamos a ver nuestro catálogo completo.
                </p>
              </div>
              <Button 
                asChild 
                className="w-full" 
                variant="outline"
              >
                <a href="/catalogo">
                  Ver otros vehículos
                </a>
              </Button>
            </div>
          ) : (
            /* Estado disponible */
            <div className="space-y-3">
              {/* Botón WhatsApp */}
              <Button 
                asChild 
                className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <a 
                  href={whatsappLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>Contactar por WhatsApp</span>
                </a>
              </Button>

              {/* Botón Reservar */}
              <Button 
                onClick={() => setIsReservationOpen(true)}
                className="w-full h-14 text-lg"
                size="lg"
              >
                <Calendar className="mr-2 h-5 w-5" />
                <span>Reservar con {formatPriceCLP(DEPOSIT_AMOUNT)}</span>
              </Button>

              {/* Información adicional */}
              <p className="text-xs text-center text-muted-foreground">
                Al reservar, el vehículo queda reservado por 48 horas mientras completas el pago
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información de contacto */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Información de contacto</h3>
          <div className="space-y-3">
            <a 
              href={`tel:${whatsappNumber}`}
              className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="h-5 w-5" />
              <span>+56 {whatsappNumber.slice(2)}</span>
            </a>
            <div className="flex items-center gap-3 text-muted-foreground">
              <MessageCircle className="h-5 w-5" />
              <span>Responderemos en horario comercial</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de reserva */}
      <ReservationModal
        vehicle={vehicle}
        isOpen={isReservationOpen}
        onClose={() => setIsReservationOpen(false)}
      />
    </div>
  );
}

export default VehicleCTA;
