// Admin Rifas Page
// Management interface for raffles

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Raffle {
  id: string;
  name: string;
  ticket_price: number;
  total_tickets: number;
  sold_tickets: number;
  status: string;
  draw_date: string | null;
  created_at: string;
  vehicle?: {
    brand: string;
    model: string;
    year: number;
  };
}

export default function AdminRifasPage() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    vehicle_id: '',
    name: '',
    description: '',
    ticket_price: 0,
    total_tickets: 100,
    draw_date: ''
  });

  useEffect(() => {
    fetchRaffles();
  }, [filter]);

  async function fetchRaffles() {
    try {
      const url = filter 
        ? `/api/admin/raffles?status=${filter}`
        : '/api/admin/raffles';
      const res = await fetch(url);
      const data = await res.json();
      setRaffles(data.raffles || []);
    } catch (err) {
      console.error('Error fetching raffles:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/admin/raffles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ticket_price: Number(formData.ticket_price),
          total_tickets: Number(formData.total_tickets),
          activate: true
        })
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({
          vehicle_id: '',
          name: '',
          description: '',
          ticket_price: 0,
          total_tickets: 100,
          draw_date: ''
        });
        fetchRaffles();
      }
    } catch (err) {
      console.error('Error creating raffle:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(raffleId: string, action: string) {
    try {
      const res = await fetch(`/api/admin/raffles/${raffleId}?action=${action}`, {
        method: 'POST'
      });
      
      if (res.ok) {
        fetchRaffles();
      }
    } catch (err) {
      console.error('Error:', err);
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      sold_out: 'bg-yellow-100 text-yellow-800',
      draw_pending: 'bg-blue-100 text-blue-800',
      drawn: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800'
    };
    
    const labels: Record<string, string> = {
      draft: 'Borrador',
      active: 'Activa',
      sold_out: 'Agotada',
      draw_pending: 'Sorteo pendiente',
      drawn: 'Sorteada',
      cancelled: 'Cancelada',
      expired: 'Expirada'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Rifas</h1>
            <p className="text-sm text-muted-foreground">Administra las rifas y sorteos</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90"
          >
            + Nueva Rifa
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex gap-2">
          {['', 'draft', 'active', 'sold_out', 'drawn'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === status 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {status === '' ? 'Todas' : 
               status === 'draft' ? 'Borrador' :
               status === 'active' ? 'Activas' :
               status === 'sold_out' ? 'Agotadas' :
               status === 'drawn' ? 'Sorteadas' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : raffles.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No hay rifas</h3>
            <p className="text-muted-foreground mb-4">Crea tu primera rifa para comenzar</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-primary hover:underline"
            >
              Crear rifa
            </button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nombre</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Vehículo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Precio</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tickets</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fecha</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {raffles.map((raffle) => (
                  <tr key={raffle.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link 
                        href={`/rifas/${raffle.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {raffle.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {raffle.vehicle ? (
                        `${raffle.vehicle.year} ${raffle.vehicle.brand} ${raffle.vehicle.model}`
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      ${raffle.ticket_price.toLocaleString('es-CL')}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {raffle.sold_tickets}/{raffle.total_tickets}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(raffle.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {raffle.draw_date 
                        ? new Date(raffle.draw_date).toLocaleDateString('es-CL')
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {raffle.status === 'draft' && (
                          <button
                            onClick={() => handleAction(raffle.id, 'activate')}
                            className="text-sm text-green-600 hover:underline"
                          >
                            Activar
                          </button>
                        )}
                        {(raffle.status === 'active' || raffle.status === 'sold_out') && (
                          <button
                            onClick={() => handleAction(raffle.id, 'draw')}
                            className="text-sm text-primary hover:underline"
                          >
                            Sortear
                          </button>
                        )}
                        {raffle.status !== 'drawn' && raffle.status !== 'cancelled' && (
                          <button
                            onClick={() => handleAction(raffle.id, 'cancel')}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-foreground mb-4">Nueva Rifa</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  Vehículo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  placeholder="ID del vehículo"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  Nombre de la rifa *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  placeholder="Ej: Sorteo Mazda CX-5"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  rows={3}
                  placeholder="Descripción opcional..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Precio ticket *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.ticket_price}
                    onChange={(e) => setFormData({ ...formData, ticket_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    placeholder="5000"
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Total tickets *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.total_tickets}
                    onChange={(e) => setFormData({ ...formData, total_tickets: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  Fecha del sorteo
                </label>
                <input
                  type="datetime-local"
                  value={formData.draw_date}
                  onChange={(e) => setFormData({ ...formData, draw_date: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-md text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Creando...' : 'Crear Rifa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
