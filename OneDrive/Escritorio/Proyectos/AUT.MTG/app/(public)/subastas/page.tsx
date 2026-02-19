// ============================================================
// Página de Subastas Públicas
// MTG Automotora - Diseño Minimalista (Vercel/Linear Style)
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getActiveAuctions, formatPriceCLP, getTimeRemaining, getAuctionStatusColor, getAuctionStatusLabel } from '@/lib/api/auctions';
import type { AuctionWithBids, AuctionStatus } from '@/types/auction';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Gavel, Clock, TrendingUp, Car, ChevronRight, Loader2 } from 'lucide-react';

// ============================================================
// Componentes
// ============================================================

/**
 * Componente de countdown timer
 */
function CountdownTimer({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(endTime));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(endTime));
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  if (timeLeft.isExpired) {
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-800">
        Subasta Finalizada
      </Badge>
    );
  }

  const timeUnits = [
    { label: 'días', value: timeLeft.days },
    { label: 'horas', value: timeLeft.hours },
    { label: 'min', value: timeLeft.minutes },
    { label: 'seg', value: timeLeft.seconds },
  ];

  return (
    <div className="flex gap-2">
      {timeUnits.map((unit, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="bg-muted rounded px-2 py-1 min-w-[40px] text-center">
            <span className="text-lg font-bold tabular-nums">
              {String(unit.value).padStart(2, '0')}
            </span>
          </div>
          <span className="text-xs text-muted-foreground mt-1">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Tarjeta de Subasta
 */
function AuctionCard({ auction }: { auction: AuctionWithBids }) {
  const currentBid = auction.highest_bid || auction.starting_price;
  const hasBids = auction.bid_count > 0;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group border-input">
      {/* Imagen del vehículo */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {auction.vehicle?.photos && auction.vehicle.photos.length > 0 ? (
          <Image
            src={auction.vehicle.photos[0].url}
            alt={`${auction.vehicle.brand} ${auction.vehicle.model}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Car className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Badge de estado */}
        <div className="absolute top-3 left-3">
          <Badge className={getAuctionStatusColor(auction.status as AuctionStatus)}>
            {getAuctionStatusLabel(auction.status as AuctionStatus)}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-2 space-y-2">
        {/* Título del vehículo */}
        <h3 className="font-bold text-lg line-clamp-1">
          {auction.vehicle ? `${auction.vehicle.brand} ${auction.vehicle.model}` : 'Vehículo en Subasta'}
        </h3>
        
        {/* Información del vehículo */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{auction.vehicle?.year}</span>
          {auction.vehicle?.mileage_km && (
            <>
              <span>•</span>
              <span>{auction.vehicle.mileage_km.toLocaleString('es-CL')} km</span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-2 space-y-4">
        {/* Precio actual */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Precio Actual</p>
          <p className="text-2xl font-bold text-primary">
            {formatPriceCLP(currentBid)}
          </p>
          {hasBids && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {auction.bid_count} {auction.bid_count === 1 ? 'puja' : 'pujas'}
            </p>
          )}
        </div>

        <Separator />

        {/* Countdown */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Tiempo restante
          </p>
          <CountdownTimer endTime={auction.end_time} />
        </div>
      </CardContent>

      <CardFooter>
        <Button asChild className="w-full" size="lg">
          <Link href={`/subastas/${auction.id}`}>
            <Gavel className="h-4 w-4 mr-2" />
            Pujar Ahora
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Skeleton de carga para tarjeta de subasta
 */
function AuctionCardSkeleton() {
  return (
    <Card className="overflow-hidden border-input">
      <Skeleton className="aspect-video" />
      <CardHeader className="pb-2 space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="pb-2 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}

/**
 * Stats de subastas
 */
function AuctionStats({ auctions }: { auctions: AuctionWithBids[] }) {
  const totalBids = auctions.reduce((sum, a) => sum + a.bid_count, 0);
  const totalValue = auctions.reduce((sum, a) => {
    const currentBid = a.highest_bid || a.starting_price;
    return sum + currentBid;
  }, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-muted/50 rounded-lg p-4 text-center">
        <p className="text-3xl font-bold text-primary">{auctions.length}</p>
        <p className="text-sm text-muted-foreground">Subastas Activas</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-4 text-center">
        <p className="text-3xl font-bold text-primary">{totalBids}</p>
        <p className="text-sm text-muted-foreground">Total Pujas</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-4 text-center">
        <p className="text-3xl font-bold text-primary">{formatPriceCLP(totalValue)}</p>
        <p className="text-sm text-muted-foreground">Valor Total</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-4 text-center">
        <p className="text-3xl font-bold text-primary">
          {auctions.length > 0 ? formatPriceCLP(Math.round(totalValue / auctions.length)) : '$0'}
        </p>
        <p className="text-sm text-muted-foreground">Precio Promedio</p>
      </div>
    </div>
  );
}

// ============================================================
// Página Principal
// ============================================================

export default function SubastasPage() {
  const [auctions, setAuctions] = useState<AuctionWithBids[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAuctions() {
      try {
        setLoading(true);
        const data = await getActiveAuctions();
        setAuctions(data.auctions || []);
      } catch (err) {
        console.error('Error fetching auctions:', err);
        setError('Error al cargar las subastas');
      } finally {
        setLoading(false);
      }
    }

    fetchAuctions();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-muted/50 to-background border-b">
        <div className="container px-4 py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Gavel className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-balance">
              Subastas MTG
            </h1>
            <p className="text-lg text-muted-foreground text-balance">
              Participa en nuestras subastas de vehículos. 
              Encuentra increíbles oportunidades y haz tu oferta ahora.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {!loading && !error && auctions.length > 0 && (
        <section className="container px-4 py-8">
          <AuctionStats auctions={auctions} />
        </section>
      )}

      {/* Main Content */}
      <section className="container px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Subastas en Vivo</h2>
            <p className="text-muted-foreground">
              {loading ? 'Cargando...' : `${auctions.length} subastas disponibles`}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <AuctionCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && auctions.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <Gavel className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-xl font-semibold">No hay subastas activas</h3>
            <p className="text-muted-foreground">
              Actualmente no hay subastas en vivo. Vuelve pronto o explora nuestro catálogo.
            </p>
            <Button asChild>
              <Link href="/catalogo">
                Ver Catálogo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}

        {/* Auctions Grid */}
        {!loading && !error && auctions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        )}

        {/* Load More / CTA */}
        {!loading && !error && auctions.length > 0 && (
          <div className="mt-12 text-center space-y-4">
            <Separator />
            <div className="py-8">
              <h3 className="text-xl font-semibold mb-2">¿Tienes un vehículo para subastar?</h3>
              <p className="text-muted-foreground mb-4">
                Consigna tu vehículo con MTG y reaches a miles de compradores.
              </p>
              <Button asChild variant="outline">
                <Link href="/vender">
                  Consignar mi Vehículo
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
