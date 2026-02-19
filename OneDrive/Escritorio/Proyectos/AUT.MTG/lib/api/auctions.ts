// ============================================================
// Auctions API Client - MTG Automotora
// Client-side functions for auction operations
// ============================================================

import type {
  Auction,
  AuctionWithBids,
  Bid,
  AuctionFilters,
  AuctionStatus,
  CreateAuctionInput,
  CreateBidInput,
  AuctionListResponse,
  AuctionDetailResponse,
} from '@/types/auction';

// ============================================================
// Public API
// ============================================================

const PUBLIC_BASE = '/api/auctions';

/**
 * Get active auctions (public listing)
 */
export async function getAuctions(
  filters?: AuctionFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<AuctionListResponse> {
  const params = new URLSearchParams();
  
  if (filters?.status) params.append('status', filters.status);
  if (filters?.vehicle_id) params.append('vehicle_id', filters.vehicle_id);
  if (filters?.min_price) params.append('min_price', filters.min_price.toString());
  if (filters?.max_price) params.append('max_price', filters.max_price.toString());
  if (page > 1) params.append('page', page.toString());
  if (pageSize !== 20) params.append('pageSize', pageSize.toString());

  const response = await fetch(`${PUBLIC_BASE}?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error al obtener subastas' }));
    throw new Error(error.error || 'Error al obtener subastas');
  }

  return response.json();
}

/**
 * Get active auctions only
 */
export async function getActiveAuctions(
  page: number = 1,
  pageSize: number = 20
): Promise<AuctionListResponse> {
  return getAuctions({ status: 'active' }, page, pageSize);
}

/**
 * Get a single auction by ID (public)
 */
export async function getAuction(id: string): Promise<AuctionDetailResponse> {
  const response = await fetch(`${PUBLIC_BASE}/${id}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Subasta no encontrada' }));
    throw new Error(error.error || 'Error al obtener subasta');
  }

  return response.json();
}

/**
 * Place a bid on an auction (public)
 */
export async function placeBid(data: CreateBidInput): Promise<{ bid: Bid; success: boolean }> {
  const response = await fetch(`${PUBLIC_BASE}/${data.auction_id}/bids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error al realizar puja' }));
    throw new Error(error.error || 'Error al realizar puja');
  }

  return response.json();
}

// ============================================================
// Admin API
// ============================================================

const ADMIN_BASE = '/api/admin/auctions';

/**
 * Fetch auctions with filters (admin)
 */
export async function getAdminAuctions(
  filters?: AuctionFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{
  auctions: (Auction & { highest_bid: number | null; bid_count: number })[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const params = new URLSearchParams();
  
  if (filters?.status) params.append('status', filters.status);
  if (filters?.vehicle_id) params.append('vehicle_id', filters.vehicle_id);
  if (filters?.from_date) params.append('from_date', filters.from_date);
  if (filters?.to_date) params.append('to_date', filters.to_date);
  if (filters?.min_price) params.append('min_price', filters.min_price.toString());
  if (filters?.max_price) params.append('max_price', filters.max_price.toString());
  if (page > 1) params.append('page', page.toString());
  if (pageSize !== 20) params.append('pageSize', pageSize.toString());

  const response = await fetch(`${ADMIN_BASE}?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error al obtener subastas' }));
    throw new Error(error.error || 'Error al obtener subastas');
  }

  return response.json();
}

/**
 * Fetch a single auction by ID (admin)
 */
export async function getAuctionAdmin(id: string): Promise<Auction> {
  const response = await fetch(`${ADMIN_BASE}/${id}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Subasta no encontrada' }));
    throw new Error(error.error || 'Error al obtener subasta');
  }

  return response.json();
}

/**
 * Create a new auction (admin)
 */
export async function createAuction(data: CreateAuctionInput): Promise<{ success: boolean; auction: Auction }> {
  const response = await fetch(ADMIN_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error al crear subasta' }));
    throw new Error(error.error || 'Error al crear subasta');
  }

  return response.json();
}

/**
 * Update auction (admin)
 */
export async function updateAuction(
  id: string,
  data: Partial<CreateAuctionInput>
): Promise<Auction> {
  const response = await fetch(`${ADMIN_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error al actualizar subasta' }));
    throw new Error(error.error || 'Error al actualizar subasta');
  }

  return response.json();
}

/**
 * Perform admin action on auction
 * Actions: start, cancel, close, extend
 */
export async function updateAuctionStatus(
  id: string,
  action: 'start' | 'cancel' | 'close' | 'extend',
  options?: { end_time?: string }
): Promise<Auction> {
  const response = await fetch(`${ADMIN_BASE}/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...options }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error al actualizar estado' }));
    throw new Error(error.error || 'Error al actualizar estado');
  }

  return response.json();
}

/**
 * Fetch auction bids (admin)
 */
export async function getAuctionBids(auctionId: string): Promise<Bid[]> {
  const response = await fetch(`${ADMIN_BASE}/${auctionId}/bids`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error al obtener pujas' }));
    throw new Error(error.error || 'Error al obtener pujas');
  }

  return response.json();
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Format price as CLP
 */
export function formatPriceCLP(price: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Calculate time remaining until end time
 * Includes isSniping flag when less than 2 minutes remain
 */
export function getTimeRemaining(endTime: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isSniping: boolean;
} {
  const now = new Date().getTime();
  const end = new Date(endTime).getTime();
  const diff = end - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, isSniping: false };
  }

  const diffMinutes = diff / (1000 * 60);
  const isSniping = diffMinutes <= 2; // Ventana de 2 minutos para anti-sniping
  
  const days = Math.floor(diffMinutes / (24 * 60));
  const hours = Math.floor((diffMinutes % (24 * 60)) / 60);
  const minutes = Math.floor(diffMinutes % 60);
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isExpired: false, isSniping };
}

/**
 * Get auction status badge color
 */
export function getAuctionStatusColor(status: AuctionStatus): string {
  const colors: Record<AuctionStatus, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    ended_pending_payment: 'bg-yellow-100 text-yellow-800',
    closed_won: 'bg-emerald-100 text-emerald-800',
    closed_failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    expired: 'bg-orange-100 text-orange-800',
    ended_no_bids: 'bg-slate-100 text-slate-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get auction status label in Spanish
 */
export function getAuctionStatusLabel(status: AuctionStatus): string {
  const labels: Record<AuctionStatus, string> = {
    scheduled: 'Programada',
    active: 'En Vivo',
    ended_pending_payment: 'Pendiente de Pago',
    closed_won: 'Cerrada - Ganda',
    closed_failed: 'Cerrada - Sin Pago',
    cancelled: 'Cancelada',
    expired: 'Expirada',
    ended_no_bids: 'Sin Pujas',
  };
  return labels[status] || status;
}
