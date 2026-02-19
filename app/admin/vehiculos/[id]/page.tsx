// ============================================================
// Edit Vehicle Page - MTG Automotora
// Form to edit an existing vehicle with photo upload
// ============================================================

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  Upload,
  X,
  Trash2,
  Car,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  fetchVehicleById, 
  updateVehicle, 
  updateVehicleStatus,
  addVehiclePhoto,
  deleteVehiclePhoto 
} from '@/lib/api/admin';
import { generateSlug } from '@/lib/utils';
import type { Vehicle, UpdateVehicleInput, VehicleStatus } from '@/types/vehicle';

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

// Status configuration
const statusConfig: Record<VehicleStatus, { variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'; label: string }> = {
  draft: { variant: 'secondary', label: 'Borrador' },
  published: { variant: 'success', label: 'Publicado' },
  reserved: { variant: 'warning', label: 'Reservado' },
  sold: { variant: 'info', label: 'Vendido' },
  hidden: { variant: 'secondary', label: 'Oculto' },
  archived: { variant: 'destructive', label: 'Archivado' },
};

export default function EditVehiclePage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  const [formData, setFormData] = useState<UpdateVehicleInput>({});
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  useEffect(() => {
    loadVehicle();
  }, [vehicleId]);

  async function loadVehicle() {
    setLoading(true);
    try {
      const data = await fetchVehicleById(vehicleId);
      setVehicle(data);
      setFormData({
        brand: data.brand,
        model: data.model,
        year: data.year,
        price: data.price,
        mileage_km: data.mileage_km,
        transmission: data.transmission,
        fuel_type: data.fuel_type,
        region: data.region,
        city: data.city,
        description: data.description,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar vehículo');
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (field: keyof UpdateVehicleInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent, newStatus?: VehicleStatus) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const dataToSend = {
        ...formData,
        ...(newStatus && { status: newStatus }),
      };

      await updateVehicle(vehicleId, dataToSend);
      
      // Show success and reload
      await loadVehicle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar vehículo');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: VehicleStatus) => {
    setSaving(true);
    try {
      await updateVehicleStatus(vehicleId, newStatus);
      await loadVehicle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar estado');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhoto = async () => {
    if (!newPhotoUrl.trim()) return;
    
    setSaving(true);
    try {
      await addVehiclePhoto(vehicleId, newPhotoUrl.trim());
      setNewPhotoUrl('');
      await loadVehicle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar foto');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    setSaving(true);
    try {
      await deleteVehiclePhoto(vehicleId, photoId);
      await loadVehicle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar foto');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Vehículo no encontrado</h2>
        <Link href="/admin/vehiculos">
          <Button className="mt-4">Volver a vehículos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/vehiculos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {vehicle.brand} {vehicle.model}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={statusConfig[vehicle.status]?.variant || 'secondary'}>
              {statusConfig[vehicle.status]?.label || vehicle.status}
            </Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{vehicle.year}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {vehicle.status === 'draft' && (
            <Button variant="outline" onClick={() => handleStatusChange('published')}>
              <Eye className="mr-2 h-4 w-4" />
              Publicar
            </Button>
          )}
          {vehicle.status === 'published' && (
            <Button variant="outline" onClick={() => handleStatusChange('draft')}>
              <EyeOff className="mr-2 h-4 w-4" />
              Despublicar
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e)}>
        <div className="space-y-6">
          {/* Photos */}
          <Card>
            <CardHeader>
              <CardTitle>Fotos</CardTitle>
              <CardDescription>
                Gestiona las fotos del vehículo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {vehicle.photos?.map((photo, index) => (
                  <div key={photo.id} className="relative group aspect-video rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={photo.url} 
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button 
                        variant="destructive" 
                        size="icon"
                        onClick={() => handleDeletePhoto(photo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {index === 0 && (
                      <Badge className="absolute top-2 left-2" variant="default">
                        Principal
                      </Badge>
                    )}
                  </div>
                ))}
                
                {/* Add photo */}
                <div className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 min-h-[120px]">
                  <Input
                    placeholder="URL de imagen"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    className="mb-2"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleAddPhoto}
                    disabled={!newPhotoUrl.trim() || saving}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

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
                    value={formData.brand || ''}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo *</Label>
                  <Input
                    id="model"
                    value={formData.model || ''}
                    onChange={(e) => handleChange('model', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Año *</Label>
                  <Select
                    value={(formData.year || currentYear).toString()}
                    onValueChange={(value) => handleChange('year', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                    value={formData.mileage_km || ''}
                    onChange={(e) => handleChange('mileage_km', parseInt(e.target.value) || null)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Descripción del vehículo..."
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
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
