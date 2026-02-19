// Rifas Page - Public
// Shows list of active raffles

import Link from 'next/link';
import Image from 'next/image';

// Mock data for demonstration - in production this would come from API
interface RaffleCardProps {
  raffle: {
    id: string;
    name: string;
    description: string | null;
    ticket_price: number;
    total_tickets: number;
    sold_tickets: number;
    vehicle?: {
      brand: string;
      model: string;
      year: number;
      price: number;
      photos: string[];
    };
  };
}

function RaffleCard({ raffle }: RaffleCardProps) {
  const ticketsAvailable = raffle.total_tickets - raffle.sold_tickets;
  const soldPercentage = (raffle.sold_tickets / raffle.total_tickets) * 100;

  return (
    <Link 
      href={`/rifas/${raffle.id}`}
      className="block group"
    >
      <div className="bg-card border border-border rounded-lg overflow-hidden transition-all hover:shadow-lg">
        {/* Vehicle Image */}
        <div className="relative h-48 bg-muted">
          {raffle.vehicle?.photos?.[0] ? (
            <Image
              src={raffle.vehicle.photos[0]}
              alt={raffle.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          
          {/* Price Badge */}
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
            ${raffle.ticket_price.toLocaleString('es-CL')}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
            {raffle.name}
          </h3>
          
          {raffle.vehicle && (
            <p className="text-sm text-muted-foreground mb-3">
              {raffle.vehicle.year} {raffle.vehicle.brand} {raffle.vehicle.model}
            </p>
          )}

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {raffle.sold_tickets} / {raffle.total_tickets} tickets
              </span>
              <span className="text-primary font-medium">
                {soldPercentage.toFixed(0)}% vendido
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${soldPercentage}%` }}
              />
            </div>
          </div>

          {/* CTA */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {ticketsAvailable} disponibles
            </span>
            <span className="text-primary font-medium group-hover:underline">
              Comprar ticket →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function RifasPage() {
  // In production, fetch from API
  const raffles: any[] = [];
  const isLoading = false;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold tracking-tight text-balance mb-2">
            Rifas MTG
          </h1>
          <p className="text-lg text-primary-foreground/80">
            Participa y gana vehículos exclusivos
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          // Loading skeleton
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-lg overflow-hidden animate-pulse">
                <div className="h-48 bg-muted" />
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-2 bg-muted rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : raffles.length === 0 ? (
          // Empty state
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No hay rifas disponibles
            </h3>
            <p className="text-muted-foreground">
              Vuelve pronto para ver nuevas rifas
            </p>
          </div>
        ) : (
          // Raffles grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {raffles.map((raffle) => (
              <RaffleCard key={raffle.id} raffle={raffle} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
