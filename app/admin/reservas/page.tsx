// ============================================================
// Reservations Admin Page - MTG Automotora
// Table of all reservations with status management
// ============================================================

'use client';

import React, { useEffect, useState } from 'react';
import { 
  Search, 
  MoreVertical, 
  Phone, 
  Mail,
  Car,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchAdminReservations, updateReservationStatus } from '@/lib/api/admin';
import { formatPriceCLP } from '@/lib/api/catalog';
import type { Reservation, ReservationStatus } from '@/types/reservation';

// Status configuration
const statusConfig: Record<ReservationStatus, { variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'; label: string }> = {
  pending_payment: { variant: 'warning', label: 'Pendiente de Pago' },
  paid: { variant: 'info', label: 'Pagado' },
  confirmed: { variant: 'success', label: 'Confirmado' },
  expired: { variant: 'secondary', label: 'Expirado' },
  cancelled: { variant: 'destructive', label: 'Cancelado' },
  refunded: { variant: 'secondary', label: 'Reembolsado' },
};

const statusTabs = [
  { value: 'all', label: 'Todos' },
  { value: 'pending_payment', label: 'Pendientes' },
  { value: 'paid', label: 'Pagados' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'cancelled', label: 'Cancelados' },
];

export default function ReservationsAdminPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadReservations();
  }, [activeTab, search]);

  async function loadReservations() {
    setLoading(true);
    try {
      const filters: any = { limit: 100 };
      
      if (activeTab !== 'all') {
        filters.status = [activeTab];
      }
      
      if (search) {
        filters.customer_phone = search;
      }

      const data = await fetchAdminReservations(filters);
      setReservations(data.reservations || []);
    } catch (error) {
      console.error('Failed to load reservations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(reservation: Reservation, newStatus: ReservationStatus) {
    setActionLoading(true);
    try {
      await updateReservationStatus(reservation.id, newStatus);
      loadReservations();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Failed to update reservation:', error);
    } finally {
      setActionLoading(false);
    }
  }

  function openDetails(reservation: Reservation) {
    setSelectedReservation(reservation);
    setDetailsOpen(true);
  }

  // Format date
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  // Check if expired
  function isExpired(expiresAt: string) {
    return new Date(expiresAt) < new Date();
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reservas</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las reservas yAbonos de vehículos
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Cargando...</p>
                  </div>
                </div>
              ) : reservations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservations.map((reservation) => (
                      <TableRow 
                        key={reservation.id} 
                        className="cursor-pointer"
                        onClick={() => openDetails(reservation)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {reservation.customer_name}
                          </div>
                          <div className="flex flex-col gap-1 mt-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {reservation.customer_phone}
                            </div>
                            {reservation.customer_email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {reservation.customer_email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {reservation.vehicle ? (
                            <div>
                              <p className="text-sm">
                                {reservation.vehicle.brand} {reservation.vehicle.model}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {reservation.vehicle.year}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatPriceCLP(reservation.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[reservation.status]?.variant || 'secondary'}>
                            {statusConfig[reservation.status]?.label || reservation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {isExpired(reservation.expires_at) && reservation.status === 'pending_payment' ? (
                              <span className="text-destructive text-sm">Expirado</span>
                            ) : (
                              <span className="text-sm">{formatDate(reservation.expires_at)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(reservation.created_at)}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetails(reservation)}>
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {reservation.status === 'pending_payment' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleStatusChange(reservation, 'paid')}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Confirmar Pago
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusChange(reservation, 'cancelled')}
                                    className="text-destructive"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancelar
                                  </DropdownMenuItem>
                                </>
                              )}
                              {reservation.status === 'paid' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(reservation, 'confirmed')}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Confirmar Reserva
                                </DropdownMenuItem>
                              )}
                              {(reservation.status === 'paid' || reservation.status === 'confirmed') && (
                                <DropdownMenuItem 
                                  onClick={() => handleStatusChange(reservation, 'refunded')}
                                  className="text-destructive"
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Reembolsar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No hay reservas</h3>
                  <p className="text-muted-foreground mt-1">
                    Las reservas aparecerán aquí cuando se realicen
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reservation details dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles de la Reserva</DialogTitle>
            <DialogDescription>
              Información completa de la reserva
            </DialogDescription>
          </DialogHeader>
          
          {selectedReservation && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-lg">Reserva #{selectedReservation.id.slice(0, 8)}</p>
                  <Badge variant={statusConfig[selectedReservation.status]?.variant || 'secondary'}>
                    {statusConfig[selectedReservation.status]?.label}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedReservation.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{selectedReservation.customer_phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedReservation.customer_email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto</p>
                  <p className="font-medium">{formatPriceCLP(selectedReservation.amount)}</p>
                </div>
              </div>

              {selectedReservation.vehicle && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Vehículo</p>
                  <p className="font-medium">
                    {selectedReservation.vehicle.brand} {selectedReservation.vehicle.model} {selectedReservation.vehicle.year}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatPriceCLP(selectedReservation.vehicle.price)}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Creado</p>
                  <p className="font-medium text-sm">{formatDate(selectedReservation.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expira</p>
                  <p className="font-medium text-sm">{formatDate(selectedReservation.expires_at)}</p>
                </div>
              </div>

              {selectedReservation.payment_id && (
                <div>
                  <p className="text-sm text-muted-foreground">ID de Pago</p>
                  <p className="font-medium text-sm">{selectedReservation.payment_id}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {selectedReservation.status === 'pending_payment' && (
                  <>
                    <Button 
                      onClick={() => handleStatusChange(selectedReservation, 'paid')}
                      disabled={actionLoading}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirmar Pago
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => handleStatusChange(selectedReservation, 'cancelled')}
                      disabled={actionLoading}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </>
                )}
                {selectedReservation.status === 'paid' && (
                  <Button 
                    onClick={() => handleStatusChange(selectedReservation, 'confirmed')}
                    disabled={actionLoading}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmar Reserva
                  </Button>
                )}
                {(selectedReservation.status === 'paid' || selectedReservation.status === 'confirmed') && (
                  <Button 
                    variant="outline"
                    onClick={() => handleStatusChange(selectedReservation, 'refunded')}
                    disabled={actionLoading}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reembolsar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
