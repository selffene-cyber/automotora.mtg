// ============================================================
// Consignments API Client - MTG Automotora
// Client-side functions for consignment operations
// ============================================================

import type {
  Consignment,
  ConsignmentFilters,
  PaginatedConsignments,
  CreateConsignmentInput,
  ConsignmentStatus,
} from '@/types/consignment';

// ============================================================
// Public API
// ============================================================

/**
 * Submit a new consignment request (public)
 */
export async function submitConsignment(
  data: CreateConsignmentInput
): Promise<{ consignment: Consignment }> {
  const response = await fetch('/api/consignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error al enviar la consignación' }));
    throw new Error(error.error || 'Error al enviar la consignación');
  }

  return response.json();
}

// ============================================================
// Admin API
// ============================================================

const ADMIN_BASE = '/api/admin/consignments';

/**
 * Fetch consignments with filters (admin)
 */
export async function getAdminConsignments(
  filters?: ConsignmentFilters
): Promise<PaginatedConsignments> {
  const params = new URLSearchParams();

  if (filters?.status?.length) {
    params.append('status', filters.status.join(','));
  }
  if (filters?.brand?.length) {
    filters.brand.forEach(b => params.append('brand', b));
  }
  if (filters?.owner_phone) params.append('owner_phone', filters.owner_phone);
  if (filters?.created_after) params.append('created_after', filters.created_after);
  if (filters?.created_before) params.append('created_before', filters.created_before);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());

  const response = await fetch(`${ADMIN_BASE}?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error al obtener consignaciones' }));
    throw new Error(error.error || 'Error al obtener consignaciones');
  }

  return response.json();
}

/**
 * Fetch a single consignment by ID (admin)
 */
export async function getConsignment(id: string): Promise<Consignment> {
  const response = await fetch(`${ADMIN_BASE}/${id}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Consignación no encontrada' }));
    throw new Error(error.error || 'Error al obtener consignación');
  }

  return response.json();
}

/**
 * Update consignment status via action (admin)
 * Actions: take, approve, reject, publish, unpublish
 */
export async function updateConsignmentStatus(
  id: string,
  action: 'take' | 'approve' | 'reject' | 'publish' | 'unpublish',
  options?: { reason?: string; create_vehicle?: boolean }
): Promise<Consignment> {
  const response = await fetch(`${ADMIN_BASE}/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...options }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error al actualizar consignación' }));
    throw new Error(error.error || 'Error al actualizar consignación');
  }

  return response.json();
}

/**
 * Update consignment data (admin)
 */
export async function updateConsignment(
  id: string,
  data: Partial<CreateConsignmentInput>
): Promise<Consignment> {
  const response = await fetch(`${ADMIN_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error al actualizar consignación' }));
    throw new Error(error.error || 'Error al actualizar consignación');
  }

  return response.json();
}

/**
 * Add photo to consignment (admin)
 */
export async function addConsignmentPhoto(
  id: string,
  url: string,
  position?: number
): Promise<void> {
  const response = await fetch(`${ADMIN_BASE}/${id}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, position }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error al subir foto' }));
    throw new Error(error.error || 'Error al subir foto');
  }
}

/**
 * Delete photo from consignment (admin)
 */
export async function deleteConsignmentPhoto(
  id: string,
  photoId: string
): Promise<void> {
  const response = await fetch(
    `${ADMIN_BASE}/${id}/photos?photoId=${photoId}`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error al eliminar foto' }));
    throw new Error(error.error || 'Error al eliminar foto');
  }
}

/**
 * Fetch consignment stats (admin)
 */
export async function getConsignmentStats(): Promise<{
  total: number;
  received: number;
  under_review: number;
  approved: number;
  rejected: number;
  published: number;
}> {
  const response = await fetch(`${ADMIN_BASE}?limit=0`);

  if (!response.ok) {
    return { total: 0, received: 0, under_review: 0, approved: 0, rejected: 0, published: 0 };
  }

  const data = await response.json();
  
  // If the API returns stats directly
  if (data.stats) return data.stats;

  // Otherwise compute from list
  const all = data.consignments || [];
  return {
    total: data.total || all.length,
    received: all.filter((c: Consignment) => c.status === 'received').length,
    under_review: all.filter((c: Consignment) => c.status === 'under_review').length,
    approved: all.filter((c: Consignment) => c.status === 'approved').length,
    rejected: all.filter((c: Consignment) => c.status === 'rejected').length,
    published: all.filter((c: Consignment) => c.status === 'published').length,
  };
}

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
