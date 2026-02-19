// ============================================================
// New Vehicle Form - MTG Automotora
// Form to create a new vehicle
// ============================================================

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  Car
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createVehicle } from '@/lib/api/admin';
import { generateSlug } from '@/lib/utils';
import type { CreateVehicleInput } from '@/types/vehicle';

// Years for select
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 30 }, (_, i) => (currentYear - i).toString());

// Transmission options
const transmissionOptions = [
  { value: 'manual', label: 'Manual' },
  { value: 'auto', label: 'Automático' },
  { value: 'semi_auto', label: 'Semi-Automático' },
  { value: 'cvt', label: 'CVT' },
];

// Fuel type options
const fuelOptions = [
  { value: 'gasoline', label: 'Bencina' },
  { value: 'diesel', label: 'Diésel' },
  { value: 'electric', label: 'Eléctrico' },
  { value: 'hybrid', label: 'Híbrido' },
  { value: 'hybrid_diesel', label: 'Híbrido Diésel' },
  { value: 'lng', label: 'GNL' },
  { value: 'cng', label: 'GNC' },
  { value: 'other', label: 'Otro' },
];

// Regions of Chile
const regions = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana de Santiago',
  "O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'La Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes y la Antártica Chilena',
];

export default function NewVehiclePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateVehicleInput>({
    slug: '',
    brand: '',
    model: '',
    year: parseInt(currentYear.toString()),
    price: 0,
    mileage_km: null,
    transmission: null,
    fuel_type: null,
    region: null,
    city: null,
    description: null,
  });

  // Auto-generate slug from brand, model, and year
  const generateAutoSlug = () => {
    if (formData.brand && formData.model) {
      const slug = generateSlug(
        `${formData.brand}-${formData.model}-${formData.year}`
      );
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleChange = (field: keyof CreateVehicleInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent, publish: boolean = false) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Generate slug if not provided
      if (!formData.slug) {
        generateAutoSlug();
        formData.slug = generateSlug(
          `${formData.brand}-${formData.model}-${formData.year}`
        );
      }

      const dataToSend = {
        ...formData,
        status: publish ? 'published' as const : 'draft' as const,
      };

      const vehicle = await createVehicle(dataToSend);
      
      // Redirect to edit page
      router.push(`/admin/vehiculos/${vehicle.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear vehículo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/vehiculos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Vehículo</h1>
          <p className="text-muted-foreground mt-1">
            Completa los datos del vehículo
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)}>
        <div className="space-y-6">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle>Información Basic</CardTitle>
              <CardDescription>
                Datos principales del vehículo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca *</Label>
                  <Input
                    id="brand"
                    placeholder="Ej: Toyota"
                    value={formData.brand}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    onBlur={generateAutoSlug}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo *</Label>
                  <Input
                    id="model"
                    placeholder="Ej: Hilux"
                    value={formData.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    onBlur={generateAutoSlug}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Año *</Label>
                  <Select
                    value={formData.year.toString()}
                    onValueChange={(value) => {
                      handleChange('year', parseInt(value));
                      setTimeout(generateAutoSlug, 0);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar año" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Precio (CLP) *</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="15000000"
                    value={formData.price || ''}
                    onChange={(e) => handleChange('price', parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mileage">Kilometraje</Label>
                  <Input
                    id="mileage"
                    type="number"
                    placeholder="0"
                    value={formData.mileage_km || ''}
                    onChange={(e) => handleChange('mileage_km', parseInt(e.target.value) || null)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transmission">Transmisión</Label>
                  <Select
                    value={formData.transmission || ''}
                    onValueChange={(value) => handleChange('transmission', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {transmissionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fuel">Tipo de Combustible</Label>
                  <Select
                    value={formData.fuel_type || ''}
                    onValueChange={(value) => handleChange('fuel_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle>Ubicación</CardTitle>
              <CardDescription>
                Ciudad y región donde se encuentra el vehículo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="region">Región</Label>
                  <Select
                    value={formData.region || ''}
                    onValueChange={(value) => handleChange('region', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar región" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    placeholder="Ej: Santiago"
                    value={formData.city || ''}
                    onChange={(e) => handleChange('city', e.target.value || null)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Descripción</CardTitle>
              <CardDescription>
                Detalles adicionales del vehículo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Describe el vehículo, características especiales, equipamiento, etc."
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value || null)}
                rows={5}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Link href="/admin/vehiculos">
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </Link>
            <Button 
              type="submit" 
              variant="secondary"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar como Borrador
            </Button>
            <Button 
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(e as any, true);
              }}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Guardar y Publicar
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
