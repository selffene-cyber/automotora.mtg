// ============================================================
// Admin API Client - MTG Automotora
// Client-side functions for admin operations
// ============================================================

import type { 
  Vehicle, 
  VehicleFilters, 
  PaginatedVehicles,
  CreateVehicleInput,
  UpdateVehicleInput 
} from '@/types/vehicle';
import type { 
  Lead, 
  LeadFilters, 
  PaginatedLeads,
  LeadStats,
  UpdateLeadInput 
} from '@/types/lead';
import type { 
  Reservation, 
  ReservationFilters, 
  PaginatedReservations,
  ReservationStats 
} from '@/types/reservation';

// Base API URL
const API_BASE = '/api/admin';

// ============================================================
// Vehicle Admin Functions
// ============================================================

/**
 * Fetch vehicles with filters (admin view - includes all statuses)
 */
export async function fetchAdminVehicles(
  filters?: VehicleFilters
): Promise<PaginatedVehicles> {
  const params = new URLSearchParams();
  
  if (filters?.status?.length) {
    filters.status.forEach(s => params.append('status', s));
  }
  if (filters?.brand?.length) {
    filters.brand.forEach(b => params.append('brand', b));
  }
  if (filters?.search) params.append('search', filters.search);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());

  const response = await fetch(`${API_BASE}/vehicles?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch vehicles' }));
    throw new Error(error.error || 'Failed to fetch vehicles');
  }
  
  return response.json();
}

/**
 * Fetch a single vehicle by ID
 */
export async function fetchVehicleById(id: string): Promise<Vehicle> {
  const response = await fetch(`${API_BASE}/vehicles/${id}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Vehicle not found' }));
    throw new Error(error.error || 'Failed to fetch vehicle');
  }
  
  return response.json();
}

/**
 * Create a new vehicle
 */
export async function createVehicle(data: CreateVehicleInput): Promise<Vehicle> {
  const response = await fetch(`${API_BASE}/vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create vehicle' }));
    throw new Error(error.error || 'Failed to create vehicle');
  }
  
  return response.json();
}

/**
 * Update an existing vehicle
 */
export async function updateVehicle(
  id: string, 
  data: UpdateVehicleInput
): Promise<Vehicle> {
  const response = await fetch(`${API_BASE}/vehicles/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update vehicle' }));
    throw new Error(error.error || 'Failed to update vehicle');
  }
  
  return response.json();
}

/**
 * Delete a vehicle
 */
export async function deleteVehicle(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/vehicles/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete vehicle' }));
    throw new Error(error.error || 'Failed to delete vehicle');
  }
}

/**
 * Update vehicle status (publish/unpublish)
 */
export async function updateVehicleStatus(
  id: string, 
  status: Vehicle['status']
): Promise<Vehicle> {
  return updateVehicle(id, { status });
}

/**
 * Add photo to vehicle
 */
export async function addVehiclePhoto(
  vehicleId: string, 
  url: string,
  position?: number
): Promise<void> {
  const response = await fetch(`${API_BASE}/vehicles/${vehicleId}/photos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, position }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to add photo' }));
    throw new Error(error.error || 'Failed to add photo');
  }
}

/**
 * Delete photo from vehicle
 */
export async function deleteVehiclePhoto(
  vehicleId: string, 
  photoId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/vehicles/${vehicleId}/photos?photoId=${photoId}`, 
    { method: 'DELETE' }
  );
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete photo' }));
    throw new Error(error.error || 'Failed to delete photo');
  }
}

// ============================================================
// Lead Admin Functions
// ============================================================

/**
 * Fetch leads with filters
 */
export async function fetchAdminLeads(
  filters?: LeadFilters
): Promise<PaginatedLeads> {
  const params = new URLSearchParams();
  
  if (filters?.status?.length) {
    filters.status.forEach(s => params.append('status', s));
  }
  if (filters?.source?.length) {
    filters.source.forEach(s => params.append('source', s));
  }
  if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);
  if (filters?.vehicle_id) params.append('vehicle_id', filters.vehicle_id);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());

  const response = await fetch(`${API_BASE}/leads?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch leads' }));
    throw new Error(error.error || 'Failed to fetch leads');
  }
  
  return response.json();
}

/**
 * Fetch lead statistics
 */
export async function fetchLeadStats(): Promise<LeadStats> {
  const response = await fetch(`${API_BASE}/leads/stats`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch lead stats' }));
    throw new Error(error.error || 'Failed to fetch lead stats');
  }
  
  return response.json();
}

/**
 * Fetch a single lead by ID
 */
export async function fetchLeadById(id: string): Promise<Lead> {
  const response = await fetch(`${API_BASE}/leads/${id}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Lead not found' }));
    throw new Error(error.error || 'Failed to fetch lead');
  }
  
  return response.json();
}

/**
 * Update a lead
 */
export async function updateLead(
  id: string, 
  data: UpdateLeadInput
): Promise<Lead> {
  const response = await fetch(`${API_BASE}/leads/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update lead' }));
    throw new Error(error.error || 'Failed to update lead');
  }
  
  return response.json();
}

/**
 * Update lead status (move in pipeline)
 */
export async function updateLeadStatus(
  id: string, 
  status: Lead['status']
): Promise<Lead> {
  return updateLead(id, { status });
}

// ============================================================
// Reservation Admin Functions
// ============================================================

/**
 * Fetch reservations with filters
 */
export async function fetchAdminReservations(
  filters?: ReservationFilters
): Promise<PaginatedReservations> {
  const params = new URLSearchParams();
  
  if (filters?.status?.length) {
    filters.status.forEach(s => params.append('status', s));
  }
  if (filters?.vehicle_id) params.append('vehicle_id', filters.vehicle_id);
  if (filters?.customer_phone) params.append('customer_phone', filters.customer_phone);
  if (filters?.created_after) params.append('created_after', filters.created_after);
  if (filters?.created_before) params.append('created_before', filters.created_before);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());

  const response = await fetch(`${API_BASE}/reservations?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch reservations' }));
    throw new Error(error.error || 'Failed to fetch reservations');
  }
  
  return response.json();
}

/**
 * Fetch reservation statistics
 */
export async function fetchReservationStats(): Promise<ReservationStats> {
  const response = await fetch(`${API_BASE}/reservations/stats`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch reservation stats' }));
    throw new Error(error.error || 'Failed to fetch reservation stats');
  }
  
  return response.json();
}

/**
 * Fetch a single reservation by ID
 */
export async function fetchReservationById(id: string): Promise<Reservation> {
  const response = await fetch(`${API_BASE}/reservations/${id}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Reservation not found' }));
    throw new Error(error.error || 'Failed to fetch reservation');
  }
  
  return response.json();
}

/**
 * Update reservation status
 */
export async function updateReservationStatus(
  id: string, 
  status: Reservation['status']
): Promise<Reservation> {
  const response = await fetch(`${API_BASE}/reservations/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update reservation' }));
    throw new Error(error.error || 'Failed to update reservation');
  }
  
  return response.json();
}

// ============================================================
// Dashboard Stats
// ============================================================

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  vehicles: {
    total: number;
    published: number;
    reserved: number;
    sold: number;
    draft: number;
  };
  leads: {
    total: number;
    new: number;
    contacted: number;
    scheduled: number;
    closed_won: number;
    closed_lost: number;
  };
  reservations: {
    total: number;
    pending: number;
    paid: number;
    confirmed: number;
  };
}

/**
 * Fetch dashboard statistics
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    const [vehiclesRes, leadsRes, reservationsRes] = await Promise.all([
      fetch(`${API_BASE}/vehicles?limit=1`),
      fetch(`${API_BASE}/leads?limit=1`),
      fetch(`${API_BASE}/reservations?limit=1`),
    ]);

    // Get full lists for stats calculation (in production, add dedicated stats endpoints)
    const [vehiclesData, leadsData, reservationsData] = await Promise.all([
      vehiclesRes.ok ? fetch(`${API_BASE}/vehicles`).then(r => r.json()).catch(() => ({ vehicles: [], total: 0 })) : { vehicles: [], total: 0 },
      leadsRes.ok ? fetch(`${API_BASE}/leads`).then(r => r.json()).catch(() => ({ leads: [], total: 0 })) : { leads: [], total: 0 },
      reservationsRes.ok ? fetch(`${API_BASE}/reservations`).then(r => r.json()).catch(() => ({ reservations: [], total: 0 })) : { reservations: [], total: 0 },
    ]);

    const vehicles = vehiclesData.vehicles || [];
    const leads = leadsData.leads || [];
    const reservations = reservationsData.reservations || [];

    return {
      vehicles: {
        total: vehicles.length,
        published: vehicles.filter((v: Vehicle) => v.status === 'published').length,
        reserved: vehicles.filter((v: Vehicle) => v.status === 'reserved').length,
        sold: vehicles.filter((v: Vehicle) => v.status === 'sold').length,
        draft: vehicles.filter((v: Vehicle) => v.status === 'draft').length,
      },
      leads: {
        total: leads.length,
        new: leads.filter((l: Lead) => l.status === 'new').length,
        contacted: leads.filter((l: Lead) => l.status === 'contacted').length,
        scheduled: leads.filter((l: Lead) => l.status === 'scheduled').length,
        closed_won: leads.filter((l: Lead) => l.status === 'closed_won').length,
        closed_lost: leads.filter((l: Lead) => l.status === 'closed_lost').length,
      },
      reservations: {
        total: reservations.length,
        pending: reservations.filter((r: Reservation) => r.status === 'pending_payment').length,
        paid: reservations.filter((r: Reservation) => r.status === 'paid').length,
        confirmed: reservations.filter((r: Reservation) => r.status === 'confirmed').length,
      },
    };
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return {
      vehicles: { total: 0, published: 0, reserved: 0, sold: 0, draft: 0 },
      leads: { total: 0, new: 0, contacted: 0, scheduled: 0, closed_won: 0, closed_lost: 0 },
      reservations: { total: 0, pending: 0, paid: 0, confirmed: 0 },
    };
  }
}
