'use client';

import { Search, Calendar, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface HowItWorksProps {
  className?: string;
}

const steps = [
  {
    icon: Search,
    number: '01',
    title: 'Explora',
    description: 'Navega por nuestro catálogo de vehículos disponibles. Filtra por marca, modelo, año y precio.',
  },
  {
    icon: Calendar,
    number: '02',
    title: 'Reserva / Oferta',
    description: 'Reserva con abono tu vehículo favorito o participa en subastas para obtener las mejores ofertas.',
  },
  {
    icon: CheckCircle2,
    number: '03',
    title: 'Agenda / Compra',
    description: 'Programa tu visita para ver el vehículo o completa tu compra de forma segura y transparente.',
  },
];

/**
 * HowItWorks - 3 step cards with icons
 * Hover micro-animation, clear separation
 */
export function HowItWorks({ className }: HowItWorksProps) {
  return (
    <section className={cn("py-12 md:py-16 bg-neutral-50/50", className)}>
      <div className="container px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-balance text-[#1A4B8F]">
            ¿Cómo funciona?
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Comprar tu próximo vehículo nunca ha sido tan fácil
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, index) => (
            <Card 
              key={index}
              className="group relative border-neutral-200 bg-white transition-all duration-200 hover:shadow-md hover:border-[#0084FF]/20 hover:-translate-y-1"
            >
              {/* Connector Line - Desktop */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 lg:-right-8 w-8 lg:w-16 h-0.5 bg-neutral-200 group-hover:bg-[#0084FF]/30 transition-colors" />
              )}
              
              <CardContent className="p-6 text-center">
                {/* Step Number */}
                <div className="text-xs font-medium text-muted-foreground mb-4">
                  Paso {step.number}
                </div>

                {/* Icon */}
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0084FF]/10 text-[#0084FF] mb-4 transition-all duration-200 group-hover:bg-[#0084FF] group-hover:text-white group-hover:scale-110">
                  <step.icon className="h-8 w-8" />
                </div>

                {/* Title */}
                <h3 className="font-semibold text-lg tracking-tight text-[#1A4B8F] mb-2">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
