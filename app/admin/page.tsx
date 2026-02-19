// ============================================================
// Admin Dashboard Home - MTG Automotora
// Stats cards and quick actions
// ============================================================

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Car, 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  ArrowRight,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { fetchDashboardStats, type DashboardStats } from '@/lib/api/admin';
import { formatPriceCLP } from '@/lib/api/catalog';
import type { Lead } from '@/types/lead';
import type { Reservation } from '@/types/reservation';
import type { Vehicle } from '@/types/vehicle';

// Stats card component
function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend,
  href 
}: { 
  title: string;
  value: number;
  icon: React.ElementType;
  description?: string;
  trend?: { value: number; positive: boolean };
  href?: string;
}) {
  return (
    <Link href={href || '#'}>
      <Card className="transition-all hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold mt-2">{value}</p>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
              {trend && (
                <div className={`flex items-center mt-2 text-sm ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp className={`h-4 w-4 mr-1 ${!trend.positive && 'rotate-180'}`} />
                  {trend.value}% vs mes anterior
                </div>
              )}
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'; label: string }> = {
    // Vehicle statuses
    draft: { variant: 'secondary', label: 'Borrador' },
    published: { variant: 'success', label: 'Publicado' },
    reserved: { variant: 'warning', label: 'Reservado' },
    sold: { variant: 'info', label: 'Vendido' },
    hidden: { variant: 'secondary', label: 'Oculto' },
    // Lead statuses
    new: { variant: 'default', label: 'Nuevo' },
    contacted: { variant: 'warning', label: 'Contactado' },
    scheduled: { variant: 'info', label: 'Agenda' },
    closed_won: { variant: 'success', label: 'Cerrado' },
    closed_lost: { variant: 'destructive', label: 'Perdido' },
    // Reservation statuses
    pending_payment: { variant: 'warning', label: 'Pendiente' },
    paid: { variant: 'info', label: 'Pagado' },
    confirmed: { variant: 'success', label: 'Confirmado' },
    expired: { variant: 'secondary', label: 'Expirado' },
    cancelled: { variant: 'destructive', label: 'Cancelado' },
    refunded: { variant: 'secondary', label: 'Reembolsado' },
  };

  const { variant, label } = config[status] || { variant: 'secondary', label: status };

  return <Badge variant={variant}>{label}</Badge>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const statsData = await fetchDashboardStats();
        setStats(statsData);

        // Fetch recent leads
        const leadsRes = await fetch('/api/admin/leads?limit=5');
        if (leadsRes.ok) {
          const leadsData = await leadsRes.json();
          setRecentLeads(leadsData.leads || []);
        }

        // Fetch recent reservations
        const reservationsRes = await fetch('/api/admin/reservations?limit=5');
        if (reservationsRes.ok) {
          const reservationsData = await reservationsRes.json();
          setRecentReservations(reservationsData.reservations || []);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido al panel de administración de MTG Automotora
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Vehículos"
          value={stats?.vehicles.total || 0}
          icon={Car}
          href="/admin/vehiculos"
        />
        <StatsCard
          title="Vehículos Publicados"
          value={stats?.vehicles.published || 0}
          icon={Eye}
          href="/admin/vehiculos"
        />
        <StatsCard
          title="Leads Nuevos"
          value={stats?.leads.new || 0}
          icon={Users}
          description="requieren atención"
          href="/admin/leads"
        />
        <StatsCard
          title="Reservas Activas"
          value={stats?.reservations.pending || 0}
          icon={Calendar}
          description="pendientes de pago"
          href="/admin/reservas"
        />
      </div>

      {/* Quick actions */}
      <div className="flex gap-4 flex-wrap">
        <Link href="/admin/vehiculos/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Vehículo
          </Button>
        </Link>
        <Link href="/admin/leads">
          <Button variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Ver Leads
          </Button>
        </Link>
        <Link href="/admin/reservas">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Ver Reservas
          </Button>
        </Link>
      </div>

      {/* Recent activity tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Leads Recientes</CardTitle>
              <CardDescription>Últimos leads registrados</CardDescription>
            </div>
            <Link href="/admin/leads">
              <Button variant="ghost" size="sm">
                Ver todos <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentLeads.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.vehicle ? (
                          <span className="text-sm">
                            {lead.vehicle.brand} {lead.vehicle.model}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={lead.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay leads recientes</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reservations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Reservas Recientes</CardTitle>
              <CardDescription>Últimas reservas realizadas</CardDescription>
            </div>
            <Link href="/admin/reservas">
              <Button variant="ghost" size="sm">
                Ver todas <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentReservations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentReservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{reservation.customer_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {reservation.customer_phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {reservation.vehicle ? (
                          <span className="text-sm">
                            {reservation.vehicle.brand} {reservation.vehicle.model}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatPriceCLP(reservation.amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={reservation.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay reservas recientes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vehículos por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Borrador</span>
                <Badge variant="secondary">{stats?.vehicles.draft || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Publicados</span>
                <Badge variant="success">{stats?.vehicles.published || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Reservados</span>
                <Badge variant="warning">{stats?.vehicles.reserved || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Vendidos</span>
                <Badge variant="info">{stats?.vehicles.sold || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Nuevos</span>
                <Badge>{stats?.leads.new || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Contactados</span>
                <Badge variant="warning">{stats?.leads.contacted || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Agenda</span>
                <Badge variant="info">{stats?.leads.scheduled || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Cerrados</span>
                <Badge variant="success">{stats?.leads.closed_won || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reservas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Pendientes</span>
                <Badge variant="warning">{stats?.reservations.pending || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Pagadas</span>
                <Badge variant="info">{stats?.reservations.paid || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Confirmadas</span>
                <Badge variant="success">{stats?.reservations.confirmed || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
