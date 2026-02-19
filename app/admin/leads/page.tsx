// ============================================================
// Leads Admin Page - MTG Automotora
// Kanban/Table view of leads with pipeline management
// ============================================================

'use client';

import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Phone, 
  Mail,
  Car,
  User,
  ChevronRight
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { fetchAdminLeads, updateLeadStatus } from '@/lib/api/admin';
import type { Lead, LeadStatus } from '@/types/lead';

// Status configuration
const statusConfig: Record<LeadStatus, { variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'; label: string; color: string }> = {
  new: { variant: 'default', label: 'Nuevo', color: 'bg-blue-500' },
  contacted: { variant: 'warning', label: 'Contactado', color: 'bg-yellow-500' },
  scheduled: { variant: 'info', label: 'Agendado', color: 'bg-purple-500' },
  closed_won: { variant: 'success', label: 'Cerrado', color: 'bg-green-500' },
  closed_lost: { variant: 'destructive', label: 'Perdido', color: 'bg-red-500' },
};

const statusTabs = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: 'Nuevos' },
  { value: 'contacted', label: 'Contactados' },
  { value: 'scheduled', label: 'Agendados' },
  { value: 'closed_won', label: 'Cerrados' },
  { value: 'closed_lost', label: 'Perdidos' },
];

// Source labels
const sourceLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  form: 'Formulario',
  referral: 'Referido',
  call: 'Llamada',
  social: 'Redes Sociales',
  other: 'Otro',
};

export default function LeadsAdminPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    loadLeads();
  }, [activeTab, search]);

  async function loadLeads() {
    setLoading(true);
    try {
      const filters: any = { limit: 100 };
      
      if (activeTab !== 'all') {
        filters.status = [activeTab];
      }
      
      if (search) {
        filters.search = search;
      }

      const data = await fetchAdminLeads(filters);
      setLeads(data.leads || []);
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(lead: Lead, newStatus: LeadStatus) {
    try {
      await updateLeadStatus(lead.id, newStatus);
      loadLeads();
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  }

  function openDetails(lead: Lead) {
    setSelectedLead(lead);
    setNote(lead.notes || '');
    setDetailsOpen(true);
  }

  // Group leads by status for kanban view
  const leadsByStatus = leads.reduce((acc, lead) => {
    if (!acc[lead.status]) acc[lead.status] = [];
    acc[lead.status].push(lead);
    return acc;
  }, {} as Record<string, Lead[]>);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona el pipeline de prospectos
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={viewMode === 'table' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('table')}
          >
            Tabla
          </Button>
          <Button 
            variant={viewMode === 'kanban' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            Kanban
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar leads..."
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
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Cargando...</p>
              </div>
            </div>
          ) : viewMode === 'table' ? (
            <Card>
              <CardContent className="p-0">
                {leads.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead>Vehículo</TableHead>
                        <TableHead>Fuente</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((lead) => (
                        <TableRow key={lead.id} className="cursor-pointer" onClick={() => openDetails(lead)}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {lead.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </div>
                              {lead.email && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  {lead.email}
                                </div>
                              )}
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
                            <Badge variant="outline">
                              {sourceLabels[lead.source] || lead.source}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusConfig[lead.status]?.variant || 'secondary'}>
                              {statusConfig[lead.status]?.label || lead.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(lead.created_at).toLocaleDateString('es-CL')}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDetails(lead)}>
                                  Ver detalles
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {lead.status !== 'new' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(lead, 'new')}>
                                    Marcar como Nuevo
                                  </DropdownMenuItem>
                                )}
                                {lead.status !== 'contacted' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(lead, 'contacted')}>
                                    Marcar como Contactado
                                  </DropdownMenuItem>
                                )}
                                {lead.status !== 'scheduled' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(lead, 'scheduled')}>
                                    Agendar
                                  </DropdownMenuItem>
                                )}
                                {lead.status !== 'closed_won' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(lead, 'closed_won')}>
                                    Cerrar Ganado
                                  </DropdownMenuItem>
                                )}
                                {lead.status !== 'closed_lost' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(lead, 'closed_lost')}>
                                    Cerrar Perdido
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
                    <User className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No hay leads</h3>
                    <p className="text-muted-foreground mt-1">
                      Los leads aparecerán aquí cuando se registren
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            // Kanban view
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {(['new', 'contacted', 'scheduled', 'closed_won', 'closed_lost'] as LeadStatus[]).map((status) => (
                <div key={status} className="space-y-3">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${statusConfig[status]?.color}`} />
                      <span className="font-medium text-sm">
                        {statusConfig[status]?.label}
                      </span>
                    </div>
                    <Badge variant="secondary">
                      {leadsByStatus[status]?.length || 0}
                    </Badge>
                  </div>
                  <div className="space-y-2 min-h-[200px]">
                    {leadsByStatus[status]?.map((lead) => (
                      <Card 
                        key={lead.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => openDetails(lead)}
                      >
                        <CardContent className="p-3">
                          <p className="font-medium text-sm">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.phone}</p>
                          {lead.vehicle && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {lead.vehicle.brand} {lead.vehicle.model}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Lead details dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles del Lead</DialogTitle>
            <DialogDescription>
              Información del prospecto
            </DialogDescription>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-lg">{selectedLead.name}</p>
                  <Badge variant={statusConfig[selectedLead.status]?.variant || 'secondary'}>
                    {statusConfig[selectedLead.status]?.label}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Teléfono</Label>
                  <p className="font-medium">{selectedLead.phone}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedLead.email || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fuente</Label>
                  <p className="font-medium">{sourceLabels[selectedLead.source] || selectedLead.source}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Vehículo</Label>
                  <p className="font-medium">
                    {selectedLead.vehicle 
                      ? `${selectedLead.vehicle.brand} ${selectedLead.vehicle.model}` 
                      : '-'}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Notas</Label>
                <Textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Agregar notas..."
                  rows={3}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedLead.status !== 'new' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      handleStatusChange(selectedLead, 'new');
                      setDetailsOpen(false);
                    }}
                  >
                    Nuevo
                  </Button>
                )}
                {selectedLead.status !== 'contacted' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      handleStatusChange(selectedLead, 'contacted');
                      setDetailsOpen(false);
                    }}
                  >
                    Contactado
                  </Button>
                )}
                {selectedLead.status !== 'scheduled' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      handleStatusChange(selectedLead, 'scheduled');
                      setDetailsOpen(false);
                    }}
                  >
                    Agendado
                  </Button>
                )}
                {selectedLead.status !== 'closed_won' && (
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={() => {
                      handleStatusChange(selectedLead, 'closed_won');
                      setDetailsOpen(false);
                    }}
                  >
                    Cerrado Ganado
                  </Button>
                )}
                {selectedLead.status !== 'closed_lost' && (
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => {
                      handleStatusChange(selectedLead, 'closed_lost');
                      setDetailsOpen(false);
                    }}
                  >
                    Cerrado Perdido
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
