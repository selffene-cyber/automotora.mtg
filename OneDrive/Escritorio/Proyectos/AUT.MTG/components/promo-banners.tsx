'use client';

import Link from 'next/link';
import { Calendar, TrendingUp, Gavel, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PromoBannersProps {
  className?: string;
}

const banners = [
  {
    icon: Calendar,
    title: 'Reserva con abono y agenda visita',
    description: 'Asegura tu vehículo favorito con un abono y programa tu visita para verlo en persona.',
    link: '/reservas',
    color: 'bg-blue-500',
  },
  {
    icon: TrendingUp,
    title: 'Vende tu auto en consignación',
    description: 'Maximiza el valor de tu vehículo con nuestra red de compradores qualifiés.',
    link: '/vender',
    color: 'bg-emerald-500',
  },
  {
    icon: Gavel,
    title: 'Subastas seguras con depósito',
    description: 'Participa en subastas transparentes con système de depósito garantizado.',
    link: '/subastas',
    color: 'bg-purple-500',
  },
];

/**
 * PromoBanners - Three wide banner cards with icons
 * Soft background (bg-blue-50), subtle border, glass effect
 */
export function PromoBanners({ className }: PromoBannersProps) {
  return (
    <section className={cn("py-12 md:py-16", className)}>
      <div className="container px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {banners.map((banner, index) => (
            <Card 
              key={index}
              className="group relative overflow-hidden border border-neutral-200 bg-blue-50/50 backdrop-blur-sm transition-all duration-200 hover:shadow-md hover:border-[#0084FF]/20 hover:bg-blue-50"
            >
              <CardContent className="p-6">
                {/* Icon */}
                <div className={cn(
                  "inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4 text-white",
                  banner.color
                )}>
                  <banner.icon className="h-6 w-6" />
                </div>

                {/* Title */}
                <h3 className="font-semibold text-lg tracking-tight text-[#1A4B8F] mb-2">
                  {banner.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4">
                  {banner.description}
                </p>

                {/* CTA */}
                <Button 
                  asChild 
                  variant="link" 
                  className="p-0 h-auto text-[#0084FF] hover:text-[#0084FF]/80"
                >
                  <Link href={banner.link} className="flex items-center gap-1">
                    Ver más
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>

                {/* Decorative gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PromoBanners;
