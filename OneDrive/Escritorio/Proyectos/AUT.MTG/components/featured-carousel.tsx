'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPriceCLP, getVehicleMainImage } from '@/lib/api/catalog';
import { Vehicle } from '@/types/vehicle';
import { cn } from '@/lib/utils';

interface FeaturedCarouselProps {
  className?: string;
}

/**
 * FeaturedCarousel - Horizontal carousel with cheapest vehicles
 * Fetches from /api/vehicles?sort=price&limit=10
 */
export function FeaturedCarousel({ className }: FeaturedCarouselProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch('/api/vehicles?sort=price&limit=10');
        const data = await response.json();
        
        if (data.success && data.data) {
          setVehicles(data.data);
        } else {
          setVehicles([]);
        }
      } catch (err) {
        console.error('Error fetching vehicles:', err);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('featured-carousel');
    if (!container) return;

    const scrollAmount = container.offsetWidth * 0.8;
    container.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  };

  if (loading) {
    return (
      <section className={cn("py-12 md:py-16", className)}>
        <div className="container px-4">
          <div className="flex items-center gap-2 mb-8">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1A4B8F]">
              Más Baratos
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[280px] md:w-[300px]">
                <Card className="overflow-hidden border-input shadow-sm">
                  <Skeleton className="aspect-[16/10] w-full" />
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-7 w-1/2" />
                    <div className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-4" />
                      <Skeleton className="h-4" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (vehicles.length === 0) {
    return null;
  }

  return (
    <section className={cn("py-12 md:py-16 bg-neutral-50/50", className)}>
      <div className="container px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1A4B8F]">
              Más Baratos
            </h2>
          </div>
          
          {/* Navigation Arrows - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full border-neutral-200 hover:border-[#0084FF] hover:bg-[#0084FF]/5"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full border-neutral-200 hover:border-[#0084FF] hover:bg-[#0084FF]/5"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Carousel Container */}
        <div
          id="featured-carousel"
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide scroll-smooth"
        >
          {vehicles.map((vehicle) => {
            const mainImage = getVehicleMainImage(vehicle);
            
            return (
              <div
                key={vehicle.id}
                className="flex-shrink-0 w-[260px] md:w-[280px] snap-start"
              >
                <Card className="group overflow-hidden border-input shadow-sm transition-all duration-200 hover:shadow-md hover:border-[#0084FF]/20 hover:-translate-y-1">
                  {/* Image */}
                  <Link 
                    href={`/vehiculos/${vehicle.slug}`}
                    className="block relative aspect-[16/10] overflow-hidden bg-muted"
                  >
                    <Image
                      src={mainImage}
                      alt={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="280px"
                    />
                    {/* Opportunity Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/90 text-white text-xs font-medium backdrop-blur-sm">
                        <Sparkles className="h-3 w-3" />
                        Oportunidad
                      </span>
                    </div>
                  </Link>

                  {/* Content */}
                  <CardContent className="p-4 space-y-3">
                    {/* Title */}
                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm md:text-base tracking-tight text-foreground line-clamp-1 group-hover:text-[#0084FF] transition-colors">
                        {vehicle.brand} {vehicle.model}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {vehicle.year}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xl font-bold tracking-tight text-foreground">
                        {formatPriceCLP(vehicle.price)}
                      </p>
                    </div>

                    {/* Specs */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{vehicle.mileage_km?.toLocaleString('es-CL')} km</span>
                      <span>{vehicle.transmission === 'automatic' ? 'Automático' : 'Manual'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FeaturedCarousel;
