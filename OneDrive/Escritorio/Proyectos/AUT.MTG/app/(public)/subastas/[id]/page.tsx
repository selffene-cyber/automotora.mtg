// ============================================================
// Página de Detalle de Subasta
// MTG Automotora - Diseño Minimalista (Vercel/Linear Style)
// ============================================================

'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getAuction, placeBid, formatPriceCLP, getTimeRemaining, getAuctionStatusColor, getAuctionStatusLabel } from '@/lib/api/auctions';
import type { Auction, Bid, AuctionStatus } from '@/types/auction';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  Gavel, 
  TrendingUp, 
  Car, 
  ChevronLeft, 
  Phone, 
  Mail, 
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  MapPin,
  Gauge,
  Fuel,
  Cog
} from 'lucide-react';

// ============================================================
// Tipos
// ============================================================

interface AuctionDetailPageProps {
  params: Promise<{ id: string }>;
}

// ============================================================
// Componentes
// ============================================================

/**
 * Componente de countdown timer
 */
function CountdownTimer({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(endTime));
  const [showSnipingAlert, setShowSnipingAlert] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = getTimeRemaining(endTime);
      setTimeLeft(remaining);
      
      // Mostrar alerta cuando quedan menos de 2 minutos
      if (!remaining.isExpired && remaining.isSniping && !showSnipingAlert) {
        setShowSnipingAlert(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, showSnipingAlert]);

  if (timeLeft.isExpired) {
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-800">
        Subasta Finalizada
      </Badge>
    );
  }

  // Mostrar alerta de sniping cuando queda poco tiempo
  const isSniping = timeLeft.isSniping;

  const timeUnits = [
    { label: 'Días', value: timeLeft.days },
    { label: 'Horas', value: timeLeft.hours },
    { label: 'Min', value: timeLeft.minutes },
    { label: 'Seg', value: timeLeft.seconds },
  ];

  return (
    <div className="flex gap-3">
      {timeUnits.map((unit, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="bg-muted rounded-lg px-3 py-2 min-w-[50px] text-center">
            <span className="text-2xl font-bold tabular-nums">
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
 * Formulario de puja
 */
function BidForm({ 
  auctionId, 
  currentBid, 
  minIncrement,
  onSuccess 
}: { 
  auctionId: string; 
  currentBid: number;
  minIncrement: number;
  onSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bidAmount, setBidAmount] = useState(currentBid + minIncrement);
  const [formData, setFormData] = useState({
    bidder_name: '',
    bidder_phone: '',
    bidder_email: '',
  });
  const [antiSnipingAlert, setAntiSnipingAlert] = useState<{show: boolean; newEndTime?: string}>({ show: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAntiSnipingAlert({ show: false });

    try {
      const response = await fetch(`/api/auctions/${auctionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_id: auctionId,
          amount: bidAmount,
          bidder_name: formData.bidder_name,
          bidder_phone: formData.bidder_phone,
          bidder_email: formData.bidder_email || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.error_message || 'Error al realizar la puja');
      }

      // Si la puja fue exitosa, verificar si hubo extensión anti-sniping
      if (data.anti_sniping?.extended) {
        setAntiSnipingAlert({ 
          show: true, 
          newEndTime: data.anti_sniping.new_end_time 
        });
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Error al realizar la puja');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
          <div>
            <h3 className="font-semibold text-green-800">¡Puja Realizada!</h3>
            <p className="text-sm text-green-700">
              Tu puja de {formatPriceCLP(bidAmount)} ha sido registrada exitosamente.
            </p>
          </div>
          {antiSnipingAlert?.show && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
              <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                ¡Tiempo extendido!
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Tu puja extendió la subasta. Nueva hora de cierre: {antiSnipingAlert.newEndTime ? new Date(antiSnipingAlert.newEndTime).toLocaleTimeString('es-CL') : 'actualizada'}
              </p>
            </div>
          )}
          <Button onClick={() => { setSuccess(false); setAntiSnipingAlert({ show: false }); }} variant="outline">
            Realizar otra puja
          </Button>
        </CardContent>
      </Card>
    );
  }

  const quickBidAmounts = [
    currentBid + minIncrement,
    currentBid + (minIncrement * 2),
    currentBid + (minIncrement * 3),
    currentBid + (minIncrement * 5),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel className="h-5 w-5" />
          Realizar Puja
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="bidder_name">Nombre completo *</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="bidder_name"
                placeholder="Juan Pérez"
                className="pl-10"
                value={formData.bidder_name}
                onChange={(e) => setFormData({ ...formData, bidder_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bidder_phone">Teléfono *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="bidder_phone"
                placeholder="+56 9 1234 5678"
                className="pl-10"
                value={formData.bidder_phone}
                onChange={(e) => setFormData({ ...formData, bidder_phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bidder_email">Email (opcional)</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="bidder_email"
                type="email"
                placeholder="juan@email.com"
                className="pl-10"
                value={formData.bidder_email}
                onChange={(e) => setFormData({ ...formData, bidder_email: e.target.value })}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Tu oferta</Label>
            <div className="text-3xl font-bold text-center py-2">
              ${bidAmount.toLocaleString('es-CL')}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Mínimo: {formatPriceCLP(currentBid + minIncrement)}
            </p>
          </div>

          {/* Quick bid buttons */}
          <div className="grid grid-cols-2 gap-2">
            {quickBidAmounts.slice(0, 4).map((amount) => (
              <Button
                key={amount}
                type="button"
                variant={bidAmount === amount ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBidAmount(amount)}
              >
                {formatPriceCLP(amount)}
              </Button>
            ))}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Gavel className="h-4 w-4 mr-2" />
                Confirmar Puja
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Lista de pujas
 */
function BidHistory({ bids }: { bids: Bid[] }) {
  if (bids.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Gavel className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No hay pujas aún</p>
        <p className="text-sm">¡Sé el primero en pujar!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bids.map((bid, index) => (
        <div 
          key={bid.id} 
          className={`flex items-center justify-between p-3 rounded-lg ${
            index === 0 ? 'bg-green-50 border border-green-200' : 'bg-muted/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              index === 0 ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {index + 1}
            </div>
            <div>
              <p className="font-medium">{bid.bidder_name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(bid.created_at).toLocaleString('es-CL')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`font-bold ${index === 0 ? 'text-green-700' : ''}`}>
              {formatPriceCLP(bid.amount)}
            </p>
            {index === 0 && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                Mayor oferta
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Página Principal
// ============================================================

export default function AuctionDetailPage({ params }: AuctionDetailPageProps) {
  const resolvedParams = use(params);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [highestBid, setHighestBid] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isPolling, setIsPolling] = useState(true);
  const [antiSnipingAlert, setAntiSnipingAlert] = useState<{show: boolean; newEndTime?: string}>({ show: false });

  const fetchAuction = async () => {
    try {
      const data = await getAuction(resolvedParams.id);
      setAuction(data.auction);
      setBids(data.bids || []);
      setHighestBid(data.highest_bid);
      setLastUpdate(new Date());
      
      // Detectar si la subasta terminó
      if (data.auction.status !== 'active') {
        setIsPolling(false);
      }
    } catch (err: any) {
      console.error('Error fetching auction:', err);
      setError(err.message || 'Error al cargar la subasta');
    } finally {
      setLoading(false);
    }
  };

  // Polling para actualizar datos de la subasta cada 5 segundos
  useEffect(() => {
    fetchAuction();
    
    if (!isPolling) return;

    const interval = setInterval(() => {
      fetchAuction();
    }, 5000); // 5 segundos

    return () => clearInterval(interval);
  }, [resolvedParams.id, isPolling]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="aspect-video" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container px-4 py-8">
          <Button asChild variant="ghost" className="mb-6">
            <Link href="/subastas">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Volver a Subastas
            </Link>
          </Button>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Subasta no encontrada</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button asChild>
              <Link href="/subastas">Ver todas las subastas</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentBid = highestBid || auction.starting_price;
  const minIncrement = auction.min_increment;
  const isActive = auction.status === 'active';
  const hasEnded = auction.status !== 'active' && auction.status !== 'scheduled';
  const isPendingPayment = auction.status === 'ended_pending_payment';

  // Función para iniciar el pago del depósito
  const handleDepositPayment = async () => {
    setPaymentLoading(true);
    setPaymentError(null);
    setPaymentStatus('processing');

    try {
      const response = await fetch(`/api/auctions/${auction.id}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar el pago');
      }

      // Si es mock, procesar directamente
      if (data.data?.payment_url?.includes('mock=true')) {
        // Simular el webhook
        const webhookPayload = {
          idempotency_key: data.data.idempotency_key,
          payment_id: data.data.payment_id,
          status: 'completed',
          amount: data.data.amount,
          metadata: { entity_type: 'auction_deposit', auction_id: auction.id }
        };

        await fetch('/api/webhooks/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        });

        setPaymentStatus('success');
        // Recargar la auction
        fetchAuction();
      } else {
        // Redirigir al gateway de pago
        window.location.href = data.data.payment_url;
      }
    } catch (err: any) {
      console.error('Error initiating deposit payment:', err);
      setPaymentError(err.message || 'Error al procesar el pago');
      setPaymentStatus('error');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container px-4 py-4">
          <Button asChild variant="ghost" className="-ml-4">
            <Link href="/subastas">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Volver a Subastas
            </Link>
          </Button>
        </div>
      </div>

      <div className="container px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Vehicle Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Gallery */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              {auction.vehicle?.photos && auction.vehicle.photos.length > 0 ? (
                <Image
                  src={auction.vehicle.photos[0].url}
                  alt={`${auction.vehicle.brand} ${auction.vehicle.model}`}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Car className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              <div className="absolute top-4 left-4">
                <Badge className={getAuctionStatusColor(auction.status as AuctionStatus)}>
                  {getAuctionStatusLabel(auction.status as AuctionStatus)}
                </Badge>
              </div>
            </div>

            {/* Vehicle Info */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {auction.vehicle ? `${auction.vehicle.brand} ${auction.vehicle.model}` : 'Vehículo en Subasta'}
              </h1>
              <p className="text-muted-foreground text-lg mt-1">
                Año {auction.vehicle?.year}
              </p>
            </div>

            {/* Vehicle Specs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Características</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {auction.vehicle?.year && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Año</p>
                        <p className="font-medium">{auction.vehicle.year}</p>
                      </div>
                    </div>
                  )}
                  {auction.vehicle?.mileage_km && (
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Kilometraje</p>
                        <p className="font-medium">{auction.vehicle.mileage_km.toLocaleString('es-CL')} km</p>
                      </div>
                    </div>
                  )}
                  {auction.vehicle?.transmission && (
                    <div className="flex items-center gap-2">
                      <Cog className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Transmisión</p>
                        <p className="font-medium capitalize">{auction.vehicle.transmission}</p>
                      </div>
                    </div>
                  )}
                  {auction.vehicle?.fuel_type && (
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Combustible</p>
                        <p className="font-medium capitalize">{auction.vehicle.fuel_type}</p>
                      </div>
                    </div>
                  )}
                  {auction.vehicle?.region && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Ubicación</p>
                        <p className="font-medium">{auction.vehicle.region}{auction.vehicle.city && `, ${auction.vehicle.city}`}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {auction.vehicle?.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Descripción</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {auction.vehicle.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Bid History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Historial de Pujas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BidHistory bids={bids} />
              </CardContent>
            </Card>

            {/* Terms */}
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg">Términos y Condiciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• La puja más alta al finalizar la subasta será el ganador.</p>
                <p>• El ganador tiene 48 horas para completar el pago.</p>
p                <p>• El vehículo se entrega una vez confirmado el pago.</p>
                <p>• MTG Automotora actúa como intermediario en todas las transacciones.</p>
                <p>• Consulta con un asesor para más información.</p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Bidding Panel */}
          <div className="space-y-6">
            {/* Current Bid Card */}
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Precio Actual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-4xl font-bold text-primary text-center">
                  {formatPriceCLP(currentBid)}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Precio inicial:</span>
                  <span>{formatPriceCLP(auction.starting_price)}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Incremento mínimo:</span>
                  <span>{formatPriceCLP(minIncrement)}</span>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Tiempo restante
                  </p>
                  <CountdownTimer endTime={auction.end_time} />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total de pujas:</span>
                  <span className="font-medium">{bids.length}</span>
                </div>
              </CardContent>

              {isActive && (
                <CardFooter>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => {
                      document.getElementById('bid-form')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <Gavel className="h-4 w-4 mr-2" />
                    Pujar Ahora
                  </Button>
                </CardFooter>
              )}

              {isPendingPayment && auction.status !== 'closed_won' && (
                <CardFooter className="flex-col gap-3">
                  {paymentStatus === 'success' ? (
                    <div className="w-full bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="font-semibold text-green-800">¡Pago Confirmado!</p>
                      <p className="text-sm text-green-700">Tu reserva ha sido confirmada</p>
                    </div>
                  ) : (
                    <>
                      {paymentError && (
                        <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                          {paymentError}
                        </div>
                      )}
                      <div className="text-center mb-2">
                        <p className="text-sm text-muted-foreground">Tiempo para completar el pago:</p>
                        {auction.payment_expires_at && (
                          <CountdownTimer endTime={auction.payment_expires_at} />
                        )}
                      </div>
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={handleDepositPayment}
                        disabled={paymentLoading}
                      >
                        {paymentLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Pagar Depósito
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Al pagar, reservaras el vehículo por 30 días
                      </p>
                    </>
                  )}
                </CardFooter>
              )}

              {hasEnded && !isPendingPayment && (
                <CardFooter>
                  <div className="w-full text-center text-muted-foreground">
                    <p>La subasta ha finalizado</p>
                  </div>
                </CardFooter>
              )}
            </Card>

            {/* Bid Form */}
            {isActive && (
              <div id="bid-form">
                <BidForm 
                  auctionId={auction.id}
                  currentBid={currentBid}
                  minIncrement={minIncrement}
                  onSuccess={fetchAuction}
                />
              </div>
            )}

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">¿Necesitas ayuda?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <a 
                  href="https://wa.me/56912345678" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  <span>+56 9 1234 5678</span>
                </a>
                <a 
                  href="mailto:contacto@mastg.cl"
                  className="flex items-center gap-3 text-sm hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  <span>contacto@mastg.cl</span>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
