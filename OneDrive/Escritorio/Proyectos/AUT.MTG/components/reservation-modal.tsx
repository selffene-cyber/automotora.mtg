// ============================================================
// Componente de Modal de Reserva
// MTG Automotora - Diseño Minimalista
// ============================================================

'use client';

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { formatPriceCLP } from '@/lib/api/catalog';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  Clock, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Wallet
} from 'lucide-react';
import type { Vehicle } from '@/types/vehicle';

interface ReservationModalProps {
  vehicle: Vehicle;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const DEPOSIT_AMOUNT = 100000; // Monto mínimo de reserva: $100.000 CLP

/**
 * Modal para crear una reserva de vehículo
 * Diseño: Minimalista, profesional
 */
export function ReservationModal({ 
  vehicle, 
  isOpen, 
  onClose,
  className 
}: ReservationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservationData, setReservationData] = useState<{
    id?: string;
    expires_at?: string;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    accept_terms: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleTermsChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, accept_terms: checked }));
    setError(null);
  };

  const generateIdempotencyKey = () => {
    return `res_${vehicle.id}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.accept_terms) {
      setError('Debes aceptar los términos y condiciones');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicle_id: vehicle.id,
          customer_name: formData.customer_name,
          customer_email: formData.customer_email || undefined,
          customer_phone: formData.customer_phone,
          amount: DEPOSIT_AMOUNT,
          idempotency_key: generateIdempotencyKey()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Si ya existe una reserva activa
        if (response.status === 409 && data.existingReservation) {
          throw new Error('Este vehículo ya tiene una reserva activa. Por favor, contacta a nuestro equipo.');
        }
        throw new Error(data.error || 'Error al crear la reserva');
      }

      setReservationData({
        id: data.reservation?.id,
        expires_at: data.payment?.expires_at
      });
      setIsSuccess(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form after closing
    setTimeout(() => {
      setIsSuccess(false);
      setError(null);
      setReservationData(null);
      setFormData({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        accept_terms: false
      });
    }, 300);
    onClose();
  };

  const vehicleTitle = `${vehicle.brand} ${vehicle.model} ${vehicle.year}`;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn("sm:max-w-[500px] max-h-[90vh] overflow-y-auto", className)}>
        {!isSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Reservar {vehicleTitle}
              </DialogTitle>
              <DialogDescription>
                Completa el formulario para realizar una reserva con abono
              </DialogDescription>
            </DialogHeader>

            {/* Vehicle summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Vehículo</span>
                <span className="font-medium">{vehicleTitle}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Precio</span>
                <span className="font-semibold text-primary">
                  {formatPriceCLP(vehicle.price)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Abono requerido</span>
                <span className="font-bold text-lg">
                  {formatPriceCLP(DEPOSIT_AMOUNT)}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="customer_name">
                  Nombre completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customer_name"
                  name="customer_name"
                  placeholder="Tu nombre completo"
                  value={formData.customer_name}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="customer_phone">
                  Teléfono <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customer_phone"
                  name="customer_phone"
                  type="tel"
                  placeholder="+56 9 XXXX XXXX"
                  value={formData.customer_phone}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Email (opcional) */}
              <div className="space-y-2">
                <Label htmlFor="customer_email">
                  Email <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="customer_email"
                  name="customer_email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={formData.customer_email}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>

              {/* Términos y condiciones */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="accept_terms"
                  checked={formData.accept_terms}
                  onCheckedChange={handleTermsChange}
                  disabled={isLoading}
                />
                <label
                  htmlFor="accept_terms"
                  className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                >
                  Acepto los{' '}
                  <a href="/terminos" className="text-primary hover:underline" target="_blank">
                    términos y condiciones
                  </a>
                  {' '}y autorizo el proceso de reserva
                </label>
              </div>

              {/* Info box */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-sm">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  La reserva tiene una validez de 48 horas. El vehículo quedará reservado 
                  una vez confirmado el pago del abono.
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isLoading}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isLoading || !formData.accept_terms}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-2 h-4 w-4" />
                      Continuar al pago
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          /* Success State */
          <div className="py-6">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                ¡Reserva creada exitosamente!
              </h3>
              <p className="text-muted-foreground mb-6">
                Tu reserva ha sido creada. Por favor, completa el pago del abono 
                de {formatPriceCLP(DEPOSIT_AMOUNT)} para confirmar.
              </p>

              {/* Reservation details */}
              <div className="w-full bg-muted/50 rounded-lg p-4 space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    La reserva expira en 48 horas
                  </span>
                </div>
                {reservationData?.id && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Reserva:</span>
                    <span className="font-mono text-xs">{reservationData.id}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button className="w-full" onClick={handleClose}>
                  Entendido
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReservationModal;
