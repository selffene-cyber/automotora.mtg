// ============================================================
// MTG Automotora - Lead Types
// Descripcion: Tipos para el modulo de Leads (CRM)
// ============================================================

// Estados del lead en el pipeline de ventas
export type LeadStatus = 'new' | 'contacted' | 'scheduled' | 'closed_won' | 'closed_lost';

// Fuentes de donde proviene el lead
export type LeadSource = 'whatsapp' | 'form' | 'referral' | 'call' | 'social' | 'other';

// Interface principal de Lead
export interface Lead {
  id: string;
  vehicle_id: string | null;
  name: string;
  email: string | null;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  // Información del vehículo si se hace JOIN
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year: number;
    slug: string;
  };
  // Información del usuario asignado (si se hace JOIN)
  assigned_user?: {
    id: string;
    name: string;
    email: string;
  };
}

// Input para crear un nuevo lead
export interface CreateLeadInput {
  vehicle_id?: string;
  name: string;
  email?: string;
  phone: string;
  source: LeadSource;
  notes?: string;
  assigned_to?: string;
}

// Input para actualizar un lead
export interface UpdateLeadInput {
  name?: string;
  email?: string;
  phone?: string;
  source?: LeadSource;
  status?: LeadStatus;
  notes?: string;
  assigned_to?: string;
}

// Filtros para listar leads
export interface LeadFilters {
  status?: LeadStatus[];
  source?: LeadSource[];
  assigned_to?: string;
  vehicle_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Respuesta paginada de leads
export interface PaginatedLeads {
  leads: Lead[];
  total: number;
  limit: number;
  offset: number;
}

// Estadisticas del pipeline de leads
export interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  scheduled: number;
  closed_won: number;
  closed_lost: number;
}

// Valores validos para status y source
export const LEAD_STATUS_VALUES: LeadStatus[] = ['new', 'contacted', 'scheduled', 'closed_won', 'closed_lost'];
export const LEAD_SOURCE_VALUES: LeadSource[] = ['whatsapp', 'form', 'referral', 'call', 'social', 'other'];

// Funcion para validar status
export function isValidLeadStatus(status: string): status is LeadStatus {
  return LEAD_STATUS_VALUES.includes(status as LeadStatus);
}

// Funcion para validar source
export function isValidLeadSource(source: string): source is LeadSource {
  return LEAD_SOURCE_VALUES.includes(source as LeadSource);
}
