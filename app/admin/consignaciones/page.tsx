// ============================================================
// Admin: Gestión de Consignaciones
// MTG Automotora - Panel Administrativo
// ============================================================

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  MoreVertical,
  Phone,
  Mail,
  Car,
  User,
  Eye,
  CheckCircle,
  XCircle,
  ArrowRight,
  Loader2,
  Package,
  Clock,
  FileCheck,
  Ban,
  Globe,
  ChevronRight,
  ImageIcon,
  CalendarDays,
  DollarSign,
  RefreshCw,
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
  TableRow,
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
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  getAdminConsignments,
  getConsignment,
  updateConsignmentStatus,
  formatPriceCLP,
} from '@/lib/api/consignments';
import type {
  Consignment,
  ConsignmentStatus,
} from '@/types/consignment';
import {
  getConsignmentStatusLabel,
  getConsignmentStatusColor,
} from '@/types/consignment';

// ============================================================
// Status Configuration
// ============================================================

const statusConfig: Record<
  ConsignmentStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  received: { label: 'Recibido', color: 'bg-blue-500', icon: Package },
  under_review: { label: 'En Revisión', color: 'bg-yellow-500', icon: Clock },
  approved: { label: 'Aprobado', color: 'bg-green-500', icon: FileCheck },
  rejected: { label: 'Rechazado', color: 'bg-red-500', icon: Ban },
  published: { label: 'Publicado', color: 'bg-purple-500', icon: Globe },
};

const statusTabs = [
  { value: 'all', label: 'Todos' },
  { value: 'received', label: 'Recibidos' },
  { value: 'under_review', label: 'En Revisión' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'published', label: 'Publicados' },
  { value: 'rejected', label: 'Rechazados' },
];

// ============================================================
// Main Page Component
// ============================================================

export default function ConsignacionesAdminPage() {
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail sheet
  const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Action dialog
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'take' | 'approve' | 'reject' | 'publish' | null;
    consignment: Consignment | null;
    reason: string;
    loading: boolean;
  }>({
    open: false,
    action: null,
    consignment: null,
    reason: '',
    loading: false,
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    received: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    published: 0,
  });

  // ============================================================
  // Data Fetching
  // ============================================================

  const loadConsignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusFilter =
        activeTab === 'all' ? undefined : [activeTab as ConsignmentStatus];

      const data = await getAdminConsignments({
        status: statusFilter,
        limit: 50,
        offset: 0,
      });

      setConsignments(data.consignments || []);
      setTotal(data.total || 0);

      // Calculate stats from all data
      if (activeTab === 'all') {
        const all = data.consignments || [];
        setStats({
          total: data.total || all.length,
          received: all.filter((c: Consignment) => c.status === 'received').length,
          under_review: all.filter((c: Consignment) => c.status === 'under_review').length,
          approved: all.filter((c: Consignment) => c.status === 'approved').length,
          rejected: all.filter((c: Consignment) => c.status === 'rejected').length,
          published: all.filter((c: Consignment) => c.status === 'published').length,
        });
      }
    } catch (error) {
      console.error('Error loading consignments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadConsignments();
  }, [loadConsignments]);

  // ============================================================
  // Detail View
  // ============================================================

  const openDetail = async (consignment: Consignment) => {
    setIsDetailOpen(true);
    setIsDetailLoading(true);
    try {
      const detail = await getConsignment(consignment.id);
      setSelectedConsignment(detail);
    } catch {
      setSelectedConsignment(consignment);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // ============================================================
  // Actions
  // ============================================================

  const openActionDialog = (
    action: 'take' | 'approve' | 'reject' | 'publish',
    consignment: Consignment
  ) => {
    setActionDialog({
      open: true,
      action,
      consignment,
      reason: '',
      loading: false,
    });
  };

  const executeAction = async () => {
    if (!actionDialog.action || !actionDialog.consignment) return;

    setActionDialog(prev => ({ ...prev, loading: true }));

    try {
      await updateConsignmentStatus(
        actionDialog.consignment.id,
        actionDialog.action,
        {
          reason: actionDialog.reason || undefined,
          create_vehicle: actionDialog.action === 'publish' ? true : undefined,
        }
      );

      // Refresh list
      await loadConsignments();

      // Close dialog
      setActionDialog({
        open: false,
        action: null,
        consignment: null,
        reason: '',
        loading: false,
      });

      // Refresh detail if open
      if (isDetailOpen && selectedConsignment?.id === actionDialog.consignment.id) {
        const updated = await getConsignment(actionDialog.consignment.id);
        setSelectedConsignment(updated);
      }
    } catch (error) {
      console.error('Error executing action:', error);
    } finally {
      setActionDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const getActionLabel = (action: string | null) => {
    switch (action) {
      case 'take': return 'Tomar Consignación';
      case 'approve': return 'Aprobar Consignación';
      case 'reject': return 'Rechazar Consignación';
      case 'publish': return 'Aprobar y Publicar';
      default: return 'Confirmar';
    }
  };

  const getActionDescription = (action: string | null) => {
    switch (action) {
      case 'take': return 'La consignación pasará a estado "En Revisión" y quedará asignada a ti.';
      case 'approve': return 'La consignación será aprobada. Podrás publicarla después.';
      case 'reject': return 'La consignación será rechazada. Puedes indicar un motivo.';
      case 'publish': return 'Se creará un vehículo en el catálogo y se publicará automáticamente.';
      default: return '';
    }
  };

  // ============================================================
  // Filtered consignments
  // ============================================================

  const filteredConsignments = searchQuery
    ? consignments.filter(
        c =>
          c.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.owner_phone.includes(searchQuery)
      )
    : consignments;

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight">
            Consignaciones
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las solicitudes de consignación de vehículos
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadConsignments}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-input shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-input shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Recibidos
            </p>
            <p className="text-2xl font-bold mt-1">{stats.received}</p>
          </CardContent>
        </Card>
        <Card className="border-input shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              En Revisión
            </p>
            <p className="text-2xl font-bold mt-1">{stats.under_review}</p>
          </CardContent>
        </Card>
        <Card className="border-input shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Aprobados
            </p>
            <p className="text-2xl font-bold mt-1">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card className="border-input shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              Publicados
            </p>
            <p className="text-2xl font-bold mt-1">{stats.published}</p>
          </CardContent>
        </Card>
        <Card className="border-input shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Rechazados
            </p>
            <p className="text-2xl font-bold mt-1">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, marca, modelo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs + Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {statusTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando...</span>
            </div>
          ) : filteredConsignments.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No hay consignaciones</p>
            </div>
          ) : (
            <div className="border border-input rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Propietario</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead className="hidden md:table-cell">Precio Esperado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConsignments.map(consignment => (
                    <ConsignmentRow
                      key={consignment.id}
                      consignment={consignment}
                      onView={() => openDetail(consignment)}
                      onAction={(action) => openActionDialog(action, consignment)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {isDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : selectedConsignment ? (
            <ConsignmentDetail
              consignment={selectedConsignment}
              onAction={(action) => {
                setIsDetailOpen(false);
                openActionDialog(action, selectedConsignment);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={open => {
          if (!open) {
            setActionDialog(prev => ({ ...prev, open: false }));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getActionLabel(actionDialog.action)}</DialogTitle>
            <DialogDescription>
              {getActionDescription(actionDialog.action)}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.consignment && (
            <div className="py-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Vehículo:</span>{' '}
                <span className="font-medium">
                  {actionDialog.consignment.brand} {actionDialog.consignment.model}{' '}
                  {actionDialog.consignment.year}
                </span>
              </p>
              <p className="text-sm mt-1">
                <span className="text-muted-foreground">Propietario:</span>{' '}
                <span className="font-medium">{actionDialog.consignment.owner_name}</span>
              </p>
            </div>
          )}

          {(actionDialog.action === 'reject' || actionDialog.action === 'approve') && (
            <div className="space-y-2">
              <Label htmlFor="action-reason">
                {actionDialog.action === 'reject' ? 'Motivo del rechazo' : 'Observaciones'}
                {actionDialog.action === 'reject' && (
                  <span className="text-muted-foreground"> (opcional)</span>
                )}
              </Label>
              <Textarea
                id="action-reason"
                placeholder={
                  actionDialog.action === 'reject'
                    ? 'Indica el motivo del rechazo...'
                    : 'Observaciones adicionales...'
                }
                value={actionDialog.reason}
                onChange={e =>
                  setActionDialog(prev => ({ ...prev, reason: e.target.value }))
                }
                className="min-h-[80px] resize-none"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog(prev => ({ ...prev, open: false }))}
              disabled={actionDialog.loading}
            >
              Cancelar
            </Button>
            <Button
              variant={actionDialog.action === 'reject' ? 'destructive' : 'default'}
              onClick={executeAction}
              disabled={actionDialog.loading}
            >
              {actionDialog.loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                getActionLabel(actionDialog.action)
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Consignment Table Row
// ============================================================

function ConsignmentRow({
  consignment,
  onView,
  onAction,
}: {
  consignment: Consignment;
  onView: () => void;
  onAction: (action: 'take' | 'approve' | 'reject' | 'publish') => void;
}) {
  const config = statusConfig[consignment.status];
  const createdDate = new Date(consignment.created_at).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <TableRow className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={onView}>
      {/* Owner */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{consignment.owner_name}</p>
            <p className="text-xs text-muted-foreground truncate">{consignment.owner_phone}</p>
          </div>
        </div>
      </TableCell>

      {/* Vehicle */}
      <TableCell>
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium">
            {consignment.brand} {consignment.model}
          </span>
          <span className="text-xs text-muted-foreground">{consignment.year}</span>
        </div>
      </TableCell>

      {/* Price */}
      <TableCell className="hidden md:table-cell">
        <span className="text-sm">
          {consignment.expected_price
            ? formatPriceCLP(consignment.expected_price)
            : '—'}
        </span>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge
          variant="secondary"
          className={`text-xs ${getConsignmentStatusColor(consignment.status)}`}
        >
          {config.label}
        </Badge>
      </TableCell>

      {/* Date */}
      <TableCell className="hidden sm:table-cell">
        <span className="text-xs text-muted-foreground">{createdDate}</span>
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>
              <Eye className="mr-2 h-4 w-4" />
              Ver detalle
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {consignment.status === 'received' && (
              <>
                <DropdownMenuItem onClick={() => onAction('take')}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Tomar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAction('reject')}
                  className="text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rechazar
                </DropdownMenuItem>
              </>
            )}

            {consignment.status === 'under_review' && (
              <>
                <DropdownMenuItem onClick={() => onAction('approve')}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Aprobar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction('publish')}>
                  <Globe className="mr-2 h-4 w-4" />
                  Aprobar y Publicar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAction('reject')}
                  className="text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rechazar
                </DropdownMenuItem>
              </>
            )}

            {consignment.status === 'approved' && (
              <DropdownMenuItem onClick={() => onAction('publish')}>
                <Globe className="mr-2 h-4 w-4" />
                Publicar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// ============================================================
// Consignment Detail View
// ============================================================

function ConsignmentDetail({
  consignment,
  onAction,
}: {
  consignment: Consignment;
  onAction: (action: 'take' | 'approve' | 'reject' | 'publish') => void;
}) {
  const config = statusConfig[consignment.status];
  const StatusIcon = config.icon;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          {consignment.brand} {consignment.model} {consignment.year}
        </DialogTitle>
        <DialogDescription>
          Consignación #{consignment.id.slice(0, 8).toUpperCase()}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Status */}
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className={`${getConsignmentStatusColor(consignment.status)} text-sm px-3 py-1`}
          >
            <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
            {config.label}
          </Badge>
          {consignment.reviewed_at && (
            <span className="text-xs text-muted-foreground">
              Revisado: {new Date(consignment.reviewed_at).toLocaleDateString('es-CL')}
            </span>
          )}
        </div>

        <Separator />

        {/* Owner Info */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Propietario
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{consignment.owner_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a
                href={`tel:${consignment.owner_phone}`}
                className="text-sm text-primary hover:underline"
              >
                {consignment.owner_phone}
              </a>
            </div>
            {consignment.owner_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${consignment.owner_email}`}
                  className="text-sm text-primary hover:underline"
                >
                  {consignment.owner_email}
                </a>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Vehicle Info */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Vehículo
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Marca</p>
              <p className="text-sm font-medium">{consignment.brand}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Modelo</p>
              <p className="text-sm font-medium">{consignment.model}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Año</p>
              <p className="text-sm font-medium">{consignment.year}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Precio Esperado</p>
              <p className="text-sm font-medium">
                {consignment.expected_price
                  ? formatPriceCLP(consignment.expected_price)
                  : 'No especificado'}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {consignment.notes && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Notas
              </h4>
              <p className="text-sm bg-accent/50 rounded-lg p-3">{consignment.notes}</p>
            </div>
          </>
        )}

        {/* Photos */}
        {consignment.photos && consignment.photos.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Fotos ({consignment.photos.length})
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {consignment.photos.map(photo => (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-lg overflow-hidden border border-input"
                  >
                    <img
                      src={photo.url}
                      alt="Foto consignación"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Audit Trail */}
        <Separator />
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Historial
          </h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>
                Creado: {new Date(consignment.created_at).toLocaleString('es-CL')}
              </span>
            </div>
            {consignment.reviewed_at && (
              <div className="flex items-center gap-2">
                <FileCheck className="h-3.5 w-3.5" />
                <span>
                  Revisado: {new Date(consignment.reviewed_at).toLocaleString('es-CL')}
                  {consignment.reviewer && ` por ${consignment.reviewer.name}`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Actualizado: {new Date(consignment.updated_at).toLocaleString('es-CL')}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {(consignment.status === 'received' ||
          consignment.status === 'under_review' ||
          consignment.status === 'approved') && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-2">
              {consignment.status === 'received' && (
                <>
                  <Button size="sm" onClick={() => onAction('take')}>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Tomar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onAction('reject')}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rechazar
                  </Button>
                </>
              )}
              {consignment.status === 'under_review' && (
                <>
                  <Button size="sm" onClick={() => onAction('approve')}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Aprobar
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onAction('publish')}>
                    <Globe className="mr-2 h-4 w-4" />
                    Aprobar y Publicar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onAction('reject')}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rechazar
                  </Button>
                </>
              )}
              {consignment.status === 'approved' && (
                <Button size="sm" onClick={() => onAction('publish')}>
                  <Globe className="mr-2 h-4 w-4" />
                  Publicar
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
