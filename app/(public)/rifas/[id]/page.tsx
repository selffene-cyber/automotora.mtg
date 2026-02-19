// Raffle Detail Page - Public
// Shows raffle details and allows ticket purchase

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Raffle {
  id: string;
  name: string;
  description: string | null;
  ticket_price: number;
  total_tickets: number;
  sold_tickets: number;
  status: string;
  draw_date: string | null;
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year: number;
    price: number;
    photos: string[];
    slug: string;
  };
}

interface Ticket {
  id: string;
  ticket_number: number;
}

export default function RaffleDetailPage({ params }: { params: { id: string } }) {
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [purchasedTickets, setPurchasedTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState('');
  
  // Form state
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');

  useEffect(() => {
    fetchRaffle();
  }, [params.id]);

  async function fetchRaffle() {
    try {
      const res = await fetch(`/api/raffles/${params.id}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setRaffle(data.raffle);
      }
    } catch (err) {
      setError('Error al cargar la rifa');
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    setPurchasing(true);
    setError('');

    try {
      const res = await fetch(`/api/raffles/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          buyer_phone: buyerPhone,
          quantity
        })
      });

      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setPurchasedTickets(data.tickets);
        // Refresh raffle data
        fetchRaffle();
      }
    } catch (err) {
      setError('Error al procesar la compra');
    } finally {
      setPurchasing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (error && !raffle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link href="/rifas" className="text-primary hover:underline">
            ← Volver a rifas
          </Link>
        </div>
      </div>
    );
  }

  if (!raffle) return null;

  const ticketsAvailable = raffle.total_tickets - raffle.sold_tickets;
  const soldPercentage = (raffle.sold_tickets / raffle.total_tickets) * 100;
  const totalPrice = raffle.ticket_price * quantity;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back link */}
        <Link href="/rifas" className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center">
          ← Volver a rifas
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Vehicle Image */}
          <div>
            <div className="relative h-80 md:h-96 bg-muted rounded-lg overflow-hidden">
              {raffle.vehicle?.photos?.[0] ? (
                <Image
                  src={raffle.vehicle.photos[0]}
                  alt={raffle.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Vehicle Details */}
            {raffle.vehicle && (
              <div className="mt-6">
                <Link 
                  href={`/vehiculos/${raffle.vehicle.slug}`}
                  className="text-primary hover:underline"
                >
                  <h2 className="text-2xl font-bold text-foreground">
                    {raffle.vehicle.year} {raffle.vehicle.brand} {raffle.vehicle.model}
                  </h2>
                </Link>
                <p className="text-lg text-muted-foreground mt-1">
                  Valor mercado: ${raffle.vehicle.price.toLocaleString('es-CL')}
                </p>
              </div>
            )}

            {/* Description */}
            {raffle.description && (
              <div className="mt-6">
                <h3 className="font-semibold text-foreground mb-2">Descripción</h3>
                <p className="text-muted-foreground">{raffle.description}</p>
              </div>
            )}
          </div>

          {/* Right: Raffle Info & Purchase */}
          <div>
            <div className="bg-card border border-border rounded-lg p-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">{raffle.name}</h1>
              
              {/* Status */}
              <div className="mb-4">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  raffle.status === 'active' ? 'bg-green-100 text-green-800' :
                  raffle.status === 'sold_out' ? 'bg-yellow-100 text-yellow-800' :
                  raffle.status === 'drawn' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {raffle.status === 'active' ? 'Activa' :
                   raffle.status === 'sold_out' ? 'Agotada' :
                   raffle.status === 'drawn' ? 'Sorteada' :
                   raffle.status}
                </span>
              </div>

              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    {raffle.sold_tickets} / {raffle.total_tickets} tickets vendidos
                  </span>
                  <span className="text-primary font-medium">
                    {soldPercentage.toFixed(0)}%
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${soldPercentage}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {ticketsAvailable} tickets disponibles
                </p>
              </div>

              {/* Draw Date */}
              {raffle.draw_date && (
                <div className="mb-6 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Fecha del sorteo</p>
                  <p className="font-medium text-foreground">
                    {new Date(raffle.draw_date).toLocaleDateString('es-CL', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}

              {/* Purchased Tickets Success */}
              {purchasedTickets.length > 0 && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">✅ Compra exitosa</h3>
                  <p className="text-green-700 text-sm mb-2">
                    Tus números de ticket:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {purchasedTickets.map((t) => (
                      <span key={t.id} className="bg-green-100 text-green-800 px-3 py-1 rounded font-mono">
                        #{t.ticket_number.toString().padStart(3, '0')}
                      </span>
                    ))}
                  </div>
                  <p className="text-green-700 text-sm mt-2">
                    Total pagado: ${totalPrice.toLocaleString('es-CL')}
                  </p>
                </div>
              )}

              {/* Purchase Form */}
              {raffle.status === 'active' && ticketsAvailable > 0 && purchasedTickets.length === 0 && (
                <form onSubmit={handlePurchase} className="space-y-4">
                  <h3 className="font-semibold text-foreground">Comprar Tickets</h3>
                  
                  {/* Quantity */}
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">
                      Cantidad de tickets
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded border border-border flex items-center justify-center hover:bg-muted"
                      >
                        -
                      </button>
                      <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(ticketsAvailable, quantity + 1))}
                        className="w-10 h-10 rounded border border-border flex items-center justify-center hover:bg-muted"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                      placeholder="Juan Pérez"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      required
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                      placeholder="+56 9 1234 5678"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                      placeholder="juan@email.com"
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                  )}

                  {/* Total & Submit */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-muted-foreground">Total a pagar</span>
                      <span className="text-2xl font-bold text-foreground">
                        ${totalPrice.toLocaleString('es-CL')}
                      </span>
                    </div>
                    <button
                      type="submit"
                      disabled={purchasing || !buyerName || !buyerPhone}
                      className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {purchasing ? 'Procesando...' : `Comprar ${quantity} ticket${quantity > 1 ? 's' : ''}`}
                    </button>
                  </div>
                </form>
              )}

              {/* Not available message */}
              {(raffle.status !== 'active' || ticketsAvailable === 0) && purchasedTickets.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>
                    {raffle.status === 'drawn' 
                      ? 'Esta rifa ya fue sorteada' 
                      : ticketsAvailable === 0 
                        ? 'Todos los tickets han sido vendidos'
                        : 'Esta rifa no está disponible para compra'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
