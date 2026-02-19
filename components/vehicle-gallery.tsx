// ============================================================
// Componente de Galería de Fotos de Vehículo
// MTG Automotora - Diseño Minimalista
// ============================================================

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { VehiclePhoto } from '@/types/vehicle';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VehicleGalleryProps {
  photos: VehiclePhoto[];
  vehicleName: string;
  className?: string;
}

/**
 * Galería de fotos para la ficha de vehículo
 * Diseño: Minimalista, profesional, con thumbnails y lightbox
 */
export function VehicleGallery({ photos, vehicleName, className }: VehicleGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Ordenar fotos por posición
  const sortedPhotos = [...photos].sort((a, b) => a.position - b.position);
  const mainImage = sortedPhotos[selectedIndex]?.url || '/images/vehicle-placeholder.svg';

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? sortedPhotos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === sortedPhotos.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index);
  };

  const openLightbox = () => {
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  // Si no hay fotos, mostrar placeholder
  if (!photos || photos.length === 0) {
    return (
      <div className={cn("relative aspect-[16/10] bg-muted rounded-lg overflow-hidden", className)}>
        <Image
          src="/images/vehicle-placeholder.svg"
          alt={`${vehicleName} - Imagen no disponible`}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Imagen principal */}
      <div className="relative aspect-[16/10] bg-muted rounded-lg overflow-hidden group">
        <Image
          src={mainImage}
          alt={`${vehicleName} - Imagen ${selectedIndex + 1}`}
          fill
          className="object-cover cursor-pointer transition-transform duration-300 hover:scale-105"
          priority
          onClick={openLightbox}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
        />
        
        {/* Botón de expandir */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-4 right-4 h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm"
          onClick={openLightbox}
        >
          <Maximize2 className="h-5 w-5" />
          <span className="sr-only">Ampliar imagen</span>
        </Button>

        {/* Contador de fotos */}
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-background/90 backdrop-blur-sm rounded-full text-sm font-medium">
          {selectedIndex + 1} / {sortedPhotos.length}
        </div>

        {/* Navegación con flechas (solo desktop) */}
        {sortedPhotos.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Imagen anterior</span>
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm"
              onClick={handleNext}
            >
              <ChevronRight className="h-5 w-5" />
              <span className="sr-only">Imagen siguiente</span>
            </Button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {sortedPhotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {sortedPhotos.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => handleThumbnailClick(index)}
              className={cn(
                "relative flex-shrink-0 w-20 h-14 rounded-md overflow-hidden transition-all duration-200",
                "border-2",
                selectedIndex === index 
                  ? "border-primary shadow-sm" 
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <Image
                src={photo.url}
                alt={`${vehicleName} - Miniatura ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Botón cerrar */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-12 w-12 rounded-full"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
            <span className="sr-only">Cerrar</span>
          </Button>

          {/* Navegación en lightbox */}
          {sortedPhotos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 h-14 w-14 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevious();
                }}
              >
                <ChevronLeft className="h-8 w-8" />
                <span className="sr-only">Anterior</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 h-14 w-14 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
              >
                <ChevronRight className="h-8 w-8" />
                <span className="sr-only">Siguiente</span>
              </Button>
            </>
          )}

          {/* Imagen en lightbox */}
          <div 
            className="relative w-full max-w-5xl max-h-[85vh] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={mainImage}
              alt={`${vehicleName} - Imagen ${selectedIndex + 1}`}
              width={1200}
              height={800}
              className="object-contain w-full h-full max-h-[85vh]"
              priority
            />
            
            {/* Indicador de posición */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-background/80 backdrop-blur-sm rounded-full text-sm font-medium">
              {selectedIndex + 1} / {sortedPhotos.length}
            </div>
          </div>

          {/* Thumbnails en lightbox */}
          {sortedPhotos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-background/80 backdrop-blur-sm rounded-lg max-w-[90vw] overflow-x-auto">
              {sortedPhotos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIndex(index);
                  }}
                  className={cn(
                    "relative flex-shrink-0 w-16 h-12 rounded overflow-hidden transition-all",
                    "border-2",
                    selectedIndex === index 
                      ? "border-primary" 
                      : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <Image
                    src={photo.url}
                    alt={`Miniatura ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VehicleGallery;
