// ============================================================
// New Auction Form - MTG Automotora
// Form to create a new auction
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Loader2,
  Car,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  createAuction, 
  formatPriceCLP 
} from '@/lib/api/auctions';
import { fetchVehicles } from '@/lib/api/catalog';
import type { Vehicle, VehicleStatus } from '@/types/vehicle';

// ============================================================
// Componentes
// ============================================================

/**
 * Componente de selector de fecha y hora
 */
function DateTimeInput({ 
  label, 
  value, 
  onChange,
  min 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
  min?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
      />
    </div>
  );
}

// ============================================================
// Página Principal
// ============================================================

export default function NewAuctionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    vehicle_id: '',
    starting_price: '',
    min_increment: '10000',
    start_time: '',
    end_time: '',
  });

  // Calculate default times
  useEffect(() => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 hours
    const endTime = new Date(now.getTime() + 72 * 60 * 60 * 1000); // +72 hours

    // Format for datetime-local input
    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setFormData(prev => ({
      ...prev,
      start_time: formatDateTime(startTime),
      end_time: formatDateTime(endTime),
    }));
  }, []);

  // Fetch published vehicles
  useEffect(() => {
    async function loadVehicles() {
      try {
        setVehiclesLoading(true);
        const data = await fetchVehicles({
          status: ['published'],
          limit: 100,
        });
        setVehicles(data.vehicles || []);
      } catch (err) {
        console.error('Error loading vehicles:', err);
      } finally {
        setVehiclesLoading(false);
      }
    }

    loadVehicles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.vehicle_id) {
      setError('Selecciona un vehículo');
      return;
    }
    if (!formData.starting_price || parseInt(formData.starting_price) <= 0) {
      setError('Ingresa un precio inicial válido');
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      setError('Selecciona fecha y hora de inicio y término');
      return;
    }

    const startDate = new Date(formData.start_time);
    const endDate = new Date(formData.end_time);
    
    if (startDate >= endDate) {
      setError('La fecha de término debe ser posterior a la de inicio');
      return;
    }

    setLoading(true);
    try {
      await createAuction({
        vehicle_id: formData.vehicle_id,
        starting_price: parseInt(formData.starting_price),
        min_increment: formData.min_increment ? parseInt(formData.min_increment) : 10000,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
      });
      
      setSuccess(true);
      
      // Redirect after short delay
      setTimeout(() => {
        router.push('/subastas');
      }, 1500);
    } catch (err: any) {
      console.error('Error creating auction:', err);
      setError(err.message || 'Error al crear la subasta');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <div>
              <h2 className="text-xl font-semibold">¡Subasta Creada!</h2>
              <p className="text-muted-foreground mt-2">
                La subasta ha sido programada exitosamente.
              </p>
            </div>
            <Button onClick={() => router.push('/subastas')}>
              Ver Subastas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container px-4 py-4">
          <Button asChild variant="ghost" className="-ml-4">
            <Link href="/subastas">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Subastas
            </Link>
          </Button>
        </div>
      </div>

      <div className="container px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Page Title */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nueva Subasta</h1>
            <p className="text-muted-foreground mt-1">
              Programa una nueva subasta de vehículo
            </p>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles de la Subasta</CardTitle>
              <CardDescription>
                Selecciona el vehículo y configura los parámetros de la subasta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Vehicle Selection */}
                <div className="space-y-2">
                  <Label htmlFor="vehicle_id">Vehículo *</Label>
                  <Select
                    value={formData.vehicle_id}
                    onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
                    disabled={vehiclesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={vehiclesLoading ? "Cargando vehículos..." : "Selecciona un vehículo"} />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4" />
                            <span>{vehicle.brand} {vehicle.model} ({vehicle.year})</span>
                            <span className="text-muted-foreground">- {formatPriceCLP(vehicle.price)}</span>
                          </div>
                        </SelectItem>
                      ))}
                      {vehicles.length === 0 && !vehiclesLoading && (
                        <div className="p-4 text-center text-muted-foreground">
                          No hay vehículos publicados disponibles
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Solo se muestran vehículos con estado "Publicado"
                  </p>
                </div>

                {/* Starting Price */}
                <div className="space-y-2">
                  <Label htmlFor="starting_price">Precio Inicial (CLP) *</Label>
                  <Input
                    id="starting_price"
                    type="number"
                    placeholder="5000000"
                    value={formData.starting_price}
                    onChange={(e) => setFormData({ ...formData, starting_price: e.target.value })}
                    min="0"
                    step="10000"
                  />
                </div>

                {/* Minimum Increment */}
                <div className="space-y-2">
                  <Label htmlFor="min_increment">Incremento Mínimo (CLP)</Label>
                  <Input
                    id="min_increment"
                    type="number"
                    placeholder="10000"
                    value={formData.min_increment}
                    onChange={(e) => setFormData({ ...formData, min_increment: e.target.value })}
                    min="1000"
                    step="1000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Monto mínimo que se debe incrementar en cada puja
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Time */}
                  <DateTimeInput
                    label="Fecha y Hora de Inicio *"
                    value={formData.start_time}
                    onChange={(value) => setFormData({ ...formData, start_time: value })}
                    min={new Date().toISOString().slice(0, 16)}
                  />

                  {/* End Time */}
                  <DateTimeInput
                    label="Fecha y Hora de Término *"
                    value={formData.end_time}
                    onChange={(value) => setFormData({ ...formData, end_time: value })}
                    min={formData.start_time}
                  />
                </div>

                {/* Summary */}
                {formData.starting_price && formData.start_time && formData.end_time && (
                  <Card className="bg-muted/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Resumen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Precio inicial:</span>
                        <span className="font-medium">{formatPriceCLP(parseInt(formData.starting_price) || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Incremento mínimo:</span>
                        <span className="font-medium">{formatPriceCLP(parseInt(formData.min_increment) || 10000)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Primera puja mínima:</span>
                        <span className="font-medium text-green-600">
                          {formatPriceCLP((parseInt(formData.starting_price) || 0) + (parseInt(formData.min_increment) || 10000))}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Submit Button */}
                <div className="flex gap-4">
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    size="lg"
                    disabled={loading || vehiclesLoading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Subasta
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => router.push('/subastas')}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
