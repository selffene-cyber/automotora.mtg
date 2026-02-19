// ============================================================
// Componente de Formulario de Consignación
// MTG Automotora - Diseño Minimalista Premium
// ============================================================

'use client';

import { useState, useCallback, useRef } from 'react';
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
import { cn } from '@/lib/utils';
import { submitConsignment } from '@/lib/api/consignments';
import {
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  ImageIcon,
  Car,
} from 'lucide-react';

// ============================================================
// Marcas populares en Chile
// ============================================================
const BRANDS = [
  'Chevrolet', 'Citroën', 'Chery', 'DFSK', 'Fiat', 'Ford',
  'Great Wall', 'Honda', 'Hyundai', 'JAC', 'Jeep', 'Kia',
  'Mazda', 'Mercedes-Benz', 'MG', 'Mitsubishi', 'Nissan',
  'Peugeot', 'Renault', 'Subaru', 'Suzuki', 'Toyota',
  'Volkswagen', 'Volvo', 'Otra',
];

interface ConsignmentFormProps {
  className?: string;
  onSuccess?: (consignmentId: string) => void;
}

interface PhotoPreview {
  file: File;
  preview: string;
}

/**
 * Formulario de consignación pública
 * Diseño: Minimalista, profesional, mobile-first
 */
export function ConsignmentForm({ className, onSuccess }: ConsignmentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [consignmentId, setConsignmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [formData, setFormData] = useState({
    owner_name: '',
    owner_phone: '',
    owner_email: '',
    brand: '',
    model: '',
    year: '',
    mileage_km: '',
    expected_price: '',
    notes: '',
  });

  const [photos, setPhotos] = useState<PhotoPreview[]>([]);

  // ============================================================
  // Handlers
  // ============================================================

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleBrandChange = (value: string) => {
    setFormData(prev => ({ ...prev, brand: value }));
    setError(null);
  };

  // Photo handling
  const addPhotos = useCallback((files: FileList | File[]) => {
    const newPhotos: PhotoPreview[] = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) continue;
      if (photos.length + newPhotos.length >= 10) break;

      newPhotos.push({
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setPhotos(prev => [...prev, ...newPhotos]);
  }, [photos.length]);

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addPhotos(e.target.files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addPhotos(e.dataTransfer.files);
    }
  };

  // ============================================================
  // Submit
  // ============================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validation
    if (!formData.owner_name.trim()) {
      setError('El nombre es requerido');
      setIsLoading(false);
      return;
    }
    if (!formData.owner_phone.trim()) {
      setError('El teléfono es requerido');
      setIsLoading(false);
      return;
    }
    if (!formData.brand) {
      setError('La marca es requerida');
      setIsLoading(false);
      return;
    }
    if (!formData.model.trim()) {
      setError('El modelo es requerido');
      setIsLoading(false);
      return;
    }
    if (!formData.year || isNaN(Number(formData.year))) {
      setError('El año es requerido');
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        owner_name: formData.owner_name.trim(),
        owner_phone: formData.owner_phone.trim(),
        owner_email: formData.owner_email.trim() || undefined,
        brand: formData.brand,
        model: formData.model.trim(),
        year: Number(formData.year),
        expected_price: formData.expected_price
          ? Number(formData.expected_price)
          : undefined,
        mileage_km: formData.mileage_km
          ? Number(formData.mileage_km)
          : undefined,
        notes: formData.notes.trim() || undefined,
      };

      const result = await submitConsignment(payload);
      const newId = result.consignment?.id || 'N/A';

      setConsignmentId(newId);
      setIsSuccess(true);

      // Clean up photo previews
      photos.forEach(p => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      setFormData({
        owner_name: '',
        owner_phone: '',
        owner_email: '',
        brand: '',
        model: '',
        year: '',
        mileage_km: '',
        expected_price: '',
        notes: '',
      });

      if (onSuccess) {
        onSuccess(newId);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al procesar la solicitud'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // Success State
  // ============================================================

  if (isSuccess) {
    return (
      <Card
        className={cn(
          'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800',
          className
        )}
      >
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col items-center text-center py-6">
            <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-green-800 dark:text-green-200">
              ¡Solicitud enviada exitosamente!
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-2 max-w-md">
              Tu solicitud de consignación ha sido recibida. Nuestro equipo la
              revisará y te contactaremos a la brevedad.
            </p>
            {consignmentId && consignmentId !== 'N/A' && (
              <div className="mt-4 px-4 py-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <p className="text-xs text-green-600 dark:text-green-400">
                  Código de seguimiento
                </p>
                <p className="text-sm font-mono font-semibold text-green-800 dark:text-green-200">
                  {consignmentId.slice(0, 8).toUpperCase()}
                </p>
              </div>
            )}
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => {
                setIsSuccess(false);
                setConsignmentId(null);
              }}
            >
              Enviar otra solicitud
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Form
  // ============================================================

  return (
    <Card className={cn('border-input shadow-sm', className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <Car className="h-5 w-5" />
          Datos de tu vehículo
        </CardTitle>
        <CardDescription>
          Completa el formulario y nos pondremos en contacto contigo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ---- Datos del propietario ---- */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Tus datos
            </h4>

            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="owner_name">
                Nombre completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="owner_name"
                name="owner_name"
                placeholder="Juan Pérez"
                value={formData.owner_name}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>

            {/* Teléfono */}
            <div className="space-y-2">
              <Label htmlFor="owner_phone">
                Teléfono <span className="text-destructive">*</span>
              </Label>
              <Input
                id="owner_phone"
                name="owner_phone"
                type="tel"
                placeholder="+56 9 XXXX XXXX"
                value={formData.owner_phone}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="owner_email">
                Email{' '}
                <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="owner_email"
                name="owner_email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={formData.owner_email}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full"
              />
            </div>
          </div>

          {/* ---- Datos del vehículo ---- */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Datos del vehículo
            </h4>

            {/* Marca */}
            <div className="space-y-2">
              <Label htmlFor="brand">
                Marca <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.brand}
                onValueChange={handleBrandChange}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una marca" />
                </SelectTrigger>
                <SelectContent>
                  {BRANDS.map(brand => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Modelo */}
            <div className="space-y-2">
              <Label htmlFor="model">
                Modelo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="model"
                name="model"
                placeholder="Ej: Corolla, Tucson, CX-5..."
                value={formData.model}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>

            {/* Año */}
            <div className="space-y-2">
              <Label htmlFor="year">
                Año <span className="text-destructive">*</span>
              </Label>
              <Input
                id="year"
                name="year"
                type="number"
                placeholder={`Ej: ${new Date().getFullYear()}`}
                min={1990}
                max={new Date().getFullYear() + 1}
                value={formData.year}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>

            {/* Kilometraje */}
            <div className="space-y-2">
              <Label htmlFor="mileage_km">
                Kilómetros{' '}
                <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="mileage_km"
                name="mileage_km"
                type="number"
                placeholder="Ej: 50.000 km"
                min={0}
                value={formData.mileage_km}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full"
              />
            </div>

            {/* Precio esperado */}
            <div className="space-y-2">
              <Label htmlFor="expected_price">
                Precio esperado (CLP){' '}
                <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="expected_price"
                name="expected_price"
                type="number"
                placeholder="Ej: 12000000"
                min={0}
                value={formData.expected_price}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full"
              />
            </div>
          </div>

          {/* ---- Fotos ---- */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Fotos del vehículo{' '}
              <span className="text-muted-foreground font-normal normal-case">
                (opcional, máx. 10)
              </span>
            </h4>

            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-input hover:border-primary/50 hover:bg-accent/50',
                isLoading && 'pointer-events-none opacity-50'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
                disabled={isLoading}
              />
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  Arrastra fotos aquí
                </span>{' '}
                o haz clic para seleccionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG o WebP • Máximo 10 fotos
              </p>
            </div>

            {/* Photo previews */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden border border-input group"
                  >
                    <img
                      src={photo.preview}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ---- Notas ---- */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notas adicionales{' '}
              <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Kilometraje, estado general, equipamiento especial..."
              value={formData.notes}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full min-h-[100px] resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando solicitud...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Solicitud de Consignación
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default ConsignmentForm;
