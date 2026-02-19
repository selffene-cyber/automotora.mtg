// ============================================================
// Componente de Formulario de Contacto (Lead)
// MTG Automotora - Diseño Minimalista
// ============================================================

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Send, Loader2, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';

interface LeadFormProps {
  vehicleId?: string;
  vehicleName?: string;
  className?: string;
  onSuccess?: () => void;
}

/**
 * Formulario de contacto para leads
 * Diseño: Minimalista, profesional
 */
export function LeadForm({ 
  vehicleId, 
  vehicleName, 
  className,
  onSuccess 
}: LeadFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          source: 'form',
          notes: vehicleName 
            ? `Consulta sobre: ${vehicleName}. ${formData.notes}`
            : formData.notes
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar la consulta');
      }

      setIsSuccess(true);
      setFormData({ name: '', phone: '', email: '', notes: '' });
      
      if (onSuccess) {
        onSuccess();
      }

      // Reset success state after 5 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 5000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className={cn("border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800", className)}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center py-4">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
              ¡Consulta enviada exitosamente!
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Nos pondremos en contacto contigo a la brevedad.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-input shadow-sm", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Contáctanos
        </CardTitle>
        <CardDescription>
          Déjanos tu contacto y te responderemos a la brevedad
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Tu nombre completo"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full"
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              Teléfono <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+56 9 XXXX XXXX"
              value={formData.phone}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full"
            />
          </div>

          {/* Email (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          {/* Mensaje */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Mensaje <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder={vehicleName 
                ? `Estoy interesado en el ${vehicleName}...` 
                : '¿En qué podemos ayudarte?'
              }
              value={formData.notes}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full min-h-[100px] resize-none"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Consulta
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default LeadForm;
