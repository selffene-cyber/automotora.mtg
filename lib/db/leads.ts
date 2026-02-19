// ============================================================
// Capa de consultas D1 para Leads
// MTG Automotora - Plataforma MVP
// ============================================================

import { D1Database } from '@cloudflare/workers-types';
import {
  Lead,
  LeadFilters,
  CreateLeadInput,
  UpdateLeadInput,
  LeadStatus,
  PaginatedLeads,
  LeadStats,
} from '@/types/lead';

/**
 * Obtiene el binding de D1 para usar en las consultas
 * En Cloudflare Pages con Edge runtime, el binding está en process.env.DB
 */
function getDb(): D1Database {
  const db = process.env.DB;
  
  if (!db) {
    throw new Error('D1 Database binding (DB) not found. Make sure:\n' +
      '1. You are using Edge runtime (export const runtime = "edge")\n' +
      '2. For local dev, use: npx @cloudflare/next-on-pages/cli dev\n' +
      '3. The wrangler.toml has [[d1_databases]] binding = "DB"');
  }
  
  return db as unknown as D1Database;
}

/**
 * Construye la consulta SQL y parámetros basados en filtros
 */
function buildFiltersQuery(filters: LeadFilters): {
  sql: string;
  params: (string | number)[];
} {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Filtro por status
  if (filters.status && filters.status.length > 0) {
    const placeholders = filters.status.map(() => '?').join(', ');
    conditions.push(`l.status IN (${placeholders})`);
    params.push(...filters.status);
  }

  // Filtro por source
  if (filters.source && filters.source.length > 0) {
    const placeholders = filters.source.map(() => '?').join(', ');
    conditions.push(`l.source IN (${placeholders})`);
    params.push(...filters.source);
  }

  // Filtro por usuario asignado
  if (filters.assigned_to) {
    conditions.push('l.assigned_to = ?');
    params.push(filters.assigned_to);
  }

  // Filtro por vehículo
  if (filters.vehicle_id) {
    conditions.push('l.vehicle_id = ?');
    params.push(filters.vehicle_id);
  }

  // Búsqueda por nombre, email o teléfono
  if (filters.search) {
    conditions.push('(l.name LIKE ? OR l.email LIKE ? OR l.phone LIKE ?)');
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  return { sql: whereClause, params };
}

/**
 * Obtiene una lista de leads con filtros y paginación
 */
export async function getLeads(filters: LeadFilters): Promise<PaginatedLeads> {
  const db = getDb();

  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const { sql: whereClause, params } = buildFiltersQuery(filters);

  // Query para obtener los leads con información relacionada
  const query = `
    SELECT
      l.id,
      l.vehicle_id,
      l.name,
      l.email,
      l.phone,
      l.source,
      l.status,
      l.notes,
      l.assigned_to,
      l.created_at,
      l.updated_at,
      v.id as v_id,
      v.brand as v_brand,
      v.model as v_model,
      v.year as v_year,
      v.slug as v_slug,
      u.id as u_id,
      u.name as u_name,
      u.email as u_email
    FROM leads l
    LEFT JOIN vehicles v ON l.vehicle_id = v.id
    LEFT JOIN users u ON l.assigned_to = u.id
    ${whereClause}
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM leads l
    ${whereClause}
  `;

  // Ejecutar ambas consultas
  const [leadsResult, countResult] = await Promise.all([
    db.prepare(query).bind(...params, limit, offset),
    db.prepare(countQuery).bind(...params),
  ]);

  const leads = await leadsResult.all<Lead>();
  const count = await countResult.first<{ total: number }>();

  // Mapear resultados a la estructura de Lead
  const mappedLeads: Lead[] = leads.results?.map((row: any) => ({
    id: row.id,
    vehicle_id: row.vehicle_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    source: row.source,
    status: row.status,
    notes: row.notes,
    assigned_to: row.assigned_to,
    created_at: row.created_at,
    updated_at: row.updated_at,
    vehicle: row.v_id ? {
      id: row.v_id,
      brand: row.v_brand,
      model: row.v_model,
      year: row.v_year,
      slug: row.v_slug,
    } : undefined,
    assigned_user: row.u_id ? {
      id: row.u_id,
      name: row.u_name,
      email: row.u_email,
    } : undefined,
  })) ?? [];

  return {
    leads: mappedLeads,
    total: count?.total ?? 0,
    limit,
    offset,
  };
}

/**
 * Obtiene un lead por su ID con información del vehículo
 */
export async function getLeadById(id: string): Promise<Lead | null> {
  const db = getDb();

  const query = `
    SELECT
      l.id,
      l.vehicle_id,
      l.name,
      l.email,
      l.phone,
      l.source,
      l.status,
      l.notes,
      l.assigned_to,
      l.created_at,
      l.updated_at,
      v.id as v_id,
      v.brand as v_brand,
      v.model as v_model,
      v.year as v_year,
      v.slug as v_slug,
      u.id as u_id,
      u.name as u_name,
      u.email as u_email
    FROM leads l
    LEFT JOIN vehicles v ON l.vehicle_id = v.id
    LEFT JOIN users u ON l.assigned_to = u.id
    WHERE l.id = ?
  `;

  const result = await db.prepare(query).bind(id).first<any>();

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    vehicle_id: result.vehicle_id,
    name: result.name,
    email: result.email,
    phone: result.phone,
    source: result.source,
    status: result.status,
    notes: result.notes,
    assigned_to: result.assigned_to,
    created_at: result.created_at,
    updated_at: result.updated_at,
    vehicle: result.v_id ? {
      id: result.v_id,
      brand: result.v_brand,
      model: result.v_model,
      year: result.v_year,
      slug: result.v_slug,
    } : undefined,
    assigned_user: result.u_id ? {
      id: result.u_id,
      name: result.u_name,
      email: result.u_email,
    } : undefined,
  };
}

/**
 * Crea un nuevo lead
 */
export async function createLead(data: CreateLeadInput): Promise<Lead> {
  const db = getDb();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const query = `
    INSERT INTO leads (
      id,
      vehicle_id,
      name,
      email,
      phone,
      source,
      status,
      notes,
      assigned_to,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await db.prepare(query).bind(
    id,
    data.vehicle_id ?? null,
    data.name,
    data.email ?? null,
    data.phone,
    data.source,
    'new', // Status inicial
    data.notes ?? null,
    data.assigned_to ?? null,
    now,
    now
  );

  // Retornar el lead creado
  const lead = await getLeadById(id);
  if (!lead) {
    throw new Error('Error al crear el lead');
  }

  return lead;
}

/**
 * Actualiza un lead existente
 */
export async function updateLead(id: string, data: UpdateLeadInput): Promise<Lead | null> {
  const db = getDb();

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }

  if (data.email !== undefined) {
    updates.push('email = ?');
    params.push(data.email ?? null);
  }

  if (data.phone !== undefined) {
    updates.push('phone = ?');
    params.push(data.phone);
  }

  if (data.source !== undefined) {
    updates.push('source = ?');
    params.push(data.source);
  }

  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
  }

  if (data.notes !== undefined) {
    updates.push('notes = ?');
    params.push(data.notes ?? null);
  }

  if (data.assigned_to !== undefined) {
    updates.push('assigned_to = ?');
    params.push(data.assigned_to ?? null);
  }

  // Siempre actualizar updated_at
  updates.push('updated_at = ?');
  params.push(new Date().toISOString());

  // Agregar el ID al final
  params.push(id);

  const query = `
    UPDATE leads
    SET ${updates.join(', ')}
    WHERE id = ?
  `;

  await db.prepare(query).bind(...params);

  // Retornar el lead actualizado
  return await getLeadById(id);
}

/**
 * Actualiza solo el status de un lead
 */
export async function updateLeadStatus(id: string, status: LeadStatus): Promise<Lead | null> {
  const db = getDb();

  const now = new Date().toISOString();

  const query = `
    UPDATE leads
    SET status = ?, updated_at = ?
    WHERE id = ?
  `;

  await db.prepare(query).bind(status, now, id);

  return await getLeadById(id);
}

/**
 * Asigna un lead a un usuario
 */
export async function assignLead(id: string, userId: string): Promise<Lead | null> {
  const db = getDb();

  const now = new Date().toISOString();

  const query = `
    UPDATE leads
    SET assigned_to = ?, updated_at = ?
    WHERE id = ?
  `;

  await db.prepare(query).bind(userId, now, id);

  return await getLeadById(id);
}

/**
 * Obtiene estadísticas de los leads
 */
export async function getLeadStats(): Promise<LeadStats> {
  const db = getDb();

  const query = `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
      SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted,
      SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
      SUM(CASE WHEN status = 'closed_won' THEN 1 ELSE 0 END) as closed_won,
      SUM(CASE WHEN status = 'closed_lost' THEN 1 ELSE 0 END) as closed_lost
    FROM leads
  `;

  const result = await db.prepare(query).first<{
    total: number;
    new_count: number;
    contacted: number;
    scheduled: number;
    closed_won: number;
    closed_lost: number;
  }>();

  return {
    total: result?.total ?? 0,
    new: result?.new_count ?? 0,
    contacted: result?.contacted ?? 0,
    scheduled: result?.scheduled ?? 0,
    closed_won: result?.closed_won ?? 0,
    closed_lost: result?.closed_lost ?? 0,
  };
}
