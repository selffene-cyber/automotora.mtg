// ============================================================
// Vehicles Admin Page - MTG Automotora
// Table of all vehicles with status filters and actions
// ============================================================

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Car
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
import { fetchAdminVehicles, updateVehicleStatus, deleteVehicle } from '@/lib/api/admin';
import { formatPriceCLP, getVehicleMainImage } from '@/lib/api/catalog';
import type { Vehicle, VehicleStatus, PaginatedVehicles } from '@/types/vehicle';

// Status configuration
const statusConfig: Record<VehicleStatus, { variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'; label: string }> = {
  draft: { variant: 'secondary', label: 'Borrador' },
  published: { variant: 'success', label: 'Publicado' },
  reserved: { variant: 'warning', label: 'Reservado' },
  sold: { variant: 'info', label: 'Vendido' },
  hidden: { variant: 'secondary', label: 'Oculto' },
  archived: { variant: 'destructive', label: 'Archivado' },
};

const statusTabs = [
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'published', label: 'Publicados' },
  { value: 'reserved', label: 'Reservados' },
  { value: 'sold', label: 'Vendidos' },
];

export default function VehiclesAdminPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  useEffect(() => {
    loadVehicles();
  }, [activeTab, search]);

  async function loadVehicles() {
    setLoading(true);
    try {
      const filters: any = { limit: 100 };
      
      if (activeTab !== 'all') {
        filters.status = [activeTab];
      }
      
      if (search) {
        filters.search = search;
      }

      const data = await fetchAdminVehicles(filters);
      setVehicles(data.vehicles || []);
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(vehicle: Vehicle, newStatus: VehicleStatus) {
    try {
      await updateVehicleStatus(vehicle.id, newStatus);
      loadVehicles();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  async function handleDelete() {
    if (!vehicleToDelete) return;
    
    try {
      await deleteVehicle(vehicleToDelete.id);
      setDeleteDialogOpen(false);
      setVehicleToDelete(null);
      loadVehicles();
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
    }
  }

  function openDeleteDialog(vehicle: Vehicle) {
    setVehicleToDelete(vehicle);
    setDeleteDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehículos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona el inventario de vehículos
          </p>
        </div>
        <Link href="/admin/vehiculos/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Vehículo
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar vehículos..."
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
              ) : vehicles.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Año</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-md bg-muted overflow-hidden flex-shrink-0">
                              {vehicle.photos && vehicle.photos.length > 0 ? (
                                <img 
                                  src={getVehicleMainImage(vehicle)}
                                  alt={`${vehicle.brand} ${vehicle.model}`}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Car className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {vehicle.brand} {vehicle.model}
                              </p>
                              {vehicle.city && (
                                <p className="text-sm text-muted-foreground">
                                  {vehicle.city}, {vehicle.region}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{vehicle.year}</TableCell>
                        <TableCell className="font-medium">
                          {formatPriceCLP(vehicle.price)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[vehicle.status]?.variant || 'secondary'}>
                            {statusConfig[vehicle.status]?.label || vehicle.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(vehicle.created_at).toLocaleDateString('es-CL')}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/vehiculos/${vehicle.id}`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/vehiculos/${vehicle.slug}`} target="_blank">
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver en sitio
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {vehicle.status === 'draft' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(vehicle, 'published')}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Publicar
                                </DropdownMenuItem>
                              )}
                              {vehicle.status === 'published' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(vehicle, 'draft')}>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  Despublicar
                                </DropdownMenuItem>
                              )}
                              {vehicle.status === 'published' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(vehicle, 'reserved')}>
                                  Reservar
                                </DropdownMenuItem>
                              )}
                              {vehicle.status === 'reserved' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(vehicle, 'sold')}>
                                  Marcar como vendido
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(vehicle)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Car className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No hay vehículos</h3>
                  <p className="text-muted-foreground mt-1">
                    Crea tu primer vehículo para comenzar
                  </p>
                  <Link href="/admin/vehiculos/nuevo">
                    <Button className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Nuevo Vehículo
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Vehículo</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este vehículo? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          {vehicleToDelete && (
            <div className="py-4">
              <p className="font-medium">
                {vehicleToDelete.brand} {vehicleToDelete.model} {vehicleToDelete.year}
              </p>
              <p className="text-muted-foreground">
                {formatPriceCLP(vehicleToDelete.price)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
