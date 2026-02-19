// ============================================================
// Auctions Admin Page - MTG Automotora
// Management table for all auctions
// ============================================================

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Car,
  Gavel,
  Clock,
  Play,
  XCircle,
  CheckCircle,
  Eye,
  RefreshCw,
  AlertCircle
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
import { getAdminAuctions, updateAuctionStatus, formatPriceCLP, getAuctionStatusColor, getAuctionStatusLabel } from '@/lib/api/auctions';
import type { Auction, AuctionStatus, AuctionWithBids } from '@/types/auction';

// Status configuration
const statusConfig: Record<AuctionStatus, { variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'; label: string }> = {
  scheduled: { variant: 'info', label: 'Programada' },
  active: { variant: 'success', label: 'En Vivo' },
  ended_pending_payment: { variant: 'warning', label: 'Pendiente de Pago' },
  closed_won: { variant: 'success', label: 'Cerrada - Ganda' },
  closed_failed: { variant: 'destructive', label: 'Cerrada - Sin Pago' },
  cancelled: { variant: 'destructive', label: 'Cancelada' },
  expired: { variant: 'warning', label: 'Expirada' },
  ended_no_bids: { variant: 'secondary', label: 'Sin Pujas' },
};

const statusTabs = [
  { value: 'all', label: 'Todos' },
  { value: 'scheduled', label: 'Programadas' },
  { value: 'active', label: 'En Vivo' },
  { value: 'ended_pending_payment', label: 'Pendiente Pago' },
  { value: 'closed_won', label: 'Cerradas' },
];

export default function AuctionsAdminPage() {
  const [auctions, setAuctions] = useState<(Auction & { highest_bid: number | null; bid_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedAuction, setSelectedAuction] = useState<Auction & { highest_bid: number | null; bid_count: number } | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending_payment: 0,
    closed: 0,
  });

  useEffect(() => {
    loadAuctions();
  }, [activeTab, search]);

  async function loadAuctions() {
    setLoading(true);
    try {
      const filters: any = { limit: 100 };
      
      if (activeTab !== 'all') {
        filters.status = activeTab;
      }

      const data = await getAdminAuctions(filters);
      let filteredAuctions = data.auctions || [];
      
      // Client-side search filter
      if (search) {
        filteredAuctions = filteredAuctions.filter((a) => 
          a.vehicle?.brand?.toLowerCase().includes(search.toLowerCase()) ||
          a.vehicle?.model?.toLowerCase().includes(search.toLowerCase()) ||
          a.id.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      setAuctions(filteredAuctions);
      
      // Calculate stats
      const allData = data.auctions || [];
      setStats({
        total: allData.length,
        active: allData.filter(a => a.status === 'active').length,
        pending_payment: allData.filter(a => a.status === 'ended_pending_payment').length,
        closed: allData.filter(a => ['closed_won', 'closed_failed', 'cancelled', 'expired', 'ended_no_bids'].includes(a.status)).length,
      });
    } catch (error) {
      console.error('Failed to load auctions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(auctionId: string, action: 'start' | 'cancel' | 'close') {
    if (!confirm(`¿Estás seguro de que quieres ${action === 'start' ? 'iniciar' : action === 'cancel' ? 'cancelar' : 'cerrar'} esta subasta?`)) {
      return;
    }

    setActionLoading(true);
    try {
      await updateAuctionStatus(auctionId, action);
      await loadAuctions();
    } catch (error) {
      console.error('Failed to update auction:', error);
      alert('Error al actualizar la subasta');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subastas</h1>
          <p className="text-muted-foreground">
            Gestiona todas las subastas de vehículos
          </p>
        </div>
        <Button asChild>
          <Link href="/subastas/nuevo">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Subasta
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Subastas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En Vivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending_payment}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cerradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.closed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Search */}
      <div className="flex items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList>
            {statusTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehículo</TableHead>
                <TableHead>Precio Inicial</TableHead>
                <TableHead>Máxima Oferta</TableHead>
                <TableHead>Pujas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Fin</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : auctions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                    <p>No hay subastas</p>
                  </TableCell>
                </TableRow>
              ) : (
                auctions.map((auction) => (
                  <TableRow key={auction.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Car className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {auction.vehicle ? `${auction.vehicle.brand} ${auction.vehicle.model}` : 'Vehículo'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {auction.vehicle?.year} • {auction.vehicle?.region}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatPriceCLP(auction.starting_price)}</TableCell>
                    <TableCell>
                      <span className={auction.highest_bid ? 'font-bold text-green-600' : ''}>
                        {auction.highest_bid ? formatPriceCLP(auction.highest_bid) : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{auction.bid_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getAuctionStatusColor(auction.status as AuctionStatus)}>
                        {getAuctionStatusLabel(auction.status as AuctionStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {new Date(auction.end_time).toLocaleDateString('es-CL')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/subastas/${auction.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalle
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {auction.status === 'scheduled' && (
                            <DropdownMenuItem 
                              onClick={() => handleAction(auction.id, 'start')}
                              disabled={actionLoading}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Iniciar Subasta
                            </DropdownMenuItem>
                          )}
                          {auction.status === 'active' && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => handleAction(auction.id, 'close')}
                                disabled={actionLoading}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Cerrar Subasta
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleAction(auction.id, 'cancel')}
                                disabled={actionLoading}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancelar
                              </DropdownMenuItem>
                            </>
                          )}
                          {['active', 'scheduled'].includes(auction.status) && (
                            <DropdownMenuItem 
                              onClick={() => handleAction(auction.id, 'cancel')}
                              disabled={actionLoading}
                              className="text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancelar Subasta
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
