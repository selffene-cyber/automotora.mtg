'use client';

import { useEffect, useState } from 'react';
import { Car, CalendarCheck, TrendingUp, Gavel } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustMetricsProps {
  className?: string;
}

// Placeholder metrics - can be replaced with API data
interface Metrics {
  vehiclesPublished: number;
  reservations: number;
  consignments: number;
  activeAuctions: number;
}

interface TrustMetricsProps {
  className?: string;
}

/**
 * TrustMetrics - Bar with 4 metrics
 * Can be placeholders if no API endpoint
 */
export function TrustMetrics({ className }: TrustMetricsProps) {
  const [metrics, setMetrics] = useState<Metrics>({
    vehiclesPublished: 0,
    reservations: 0,
    consignments: 0,
    activeAuctions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to fetch real metrics from API
    const fetchMetrics = async () => {
      try {
        // Fetch vehicles count
        const vehiclesRes = await fetch('/api/vehicles?limit=1');
        const vehiclesData = await vehiclesRes.json();
        
        // These would ideally come from dedicated endpoints
        // For now, use placeholders with realistic values
        setMetrics({
          vehiclesPublished: vehiclesData?.data?.length || 0,
          reservations: 0,
          consignments: 0,
          activeAuctions: 0,
        });
      } catch (err) {
        console.error('Error fetching metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const metricItems = [
    {
      icon: Car,
      value: '500+',
      label: 'Vehículos publicados',
      color: 'text-[#0084FF]',
      bgColor: 'bg-[#0084FF]/10',
    },
    {
      icon: CalendarCheck,
      value: '120+',
      label: 'Reservas realizadas',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: TrendingUp,
      value: '80+',
      label: 'Consignaciones',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      icon: Gavel,
      value: '15+',
      label: 'Subastas activas',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <section className={cn("py-12 md:py-16 border-t border-neutral-200", className)}>
      <div className="container px-4">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-balance text-[#1A4B8F]">
            Nuestras métricas
          </h2>
          <p className="text-muted-foreground mt-2">
            Confían en MTG Automotora
          </p>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {metricItems.map((item, index) => (
            <div 
              key={index}
              className="flex flex-col items-center text-center p-4 md:p-6 rounded-xl border border-neutral-200 bg-white hover:border-[#0084FF]/20 hover:shadow-md transition-all duration-200"
            >
              {/* Icon */}
              <div className={cn(
                "inline-flex h-12 w-12 items-center justify-center rounded-xl mb-3",
                item.bgColor
              )}>
                <item.icon className={cn("h-6 w-6", item.color)} />
              </div>

              {/* Value */}
              <p className="text-2xl md:text-3xl font-bold tracking-tight text-[#1A4B8F]">
                {item.value}
              </p>

              {/* Label */}
              <p className="text-sm text-muted-foreground mt-1">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrustMetrics;
