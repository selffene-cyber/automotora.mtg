// ============================================================
// Capa de consultas D1 para consignaciones
// MTG Automotora - Plataforma MVP
// ============================================================

import { D1Database } from '@cloudflare/workers-types';
import { 
  Consignment, 
  ConsignmentFilters, 
  CreateConsignmentInput, 
  UpdateConsignmentInput, 
  ConsignmentStatus,
  ConsignmentPhoto 
} from '@/types/consignment';

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
function buildFiltersQuery(filters: ConsignmentFilters): {
  sql: string;
  params: (string | number)[];
} {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Filtro por status
  if (filters.status && filters.status.length > 0) {
    const placeholders = filters.status.map(() => '?').join(', ');
    conditions.push(`status IN (${placeholders})`);
    params.push(...filters.status);
  }

  // Filtro por marca
  if (filters.brand && filters.brand.length > 0) {
    const placeholders = filters.brand.map(() => '?').join(', ');
    conditions.push(`brand IN (${placeholders})`);
    params.push(...filters.brand);
  }

  // Filtro por modelo
  if (filters.model && filters.model.length > 0) {
    const placeholders = filters.model.map(() => '?').join(', ');
    conditions.push(`model IN (${placeholders})`);
    params.push(...filters.model);
  }

  // Filtro por año mínimo
  if (filters.year_min !== undefined) {
    conditions.push('year >= ?');
    params.push(filters.year_min);
  }

  // Filtro por año máximo
  if (filters.year_max !== undefined) {
    conditions.push('year <= ?');
    params.push(filters.year_max);
  }

  // Filtro por precio esperado mínimo
  if (filters.expected_price_min !== undefined) {
    conditions.push('expected_price >= ?');
    params.push(filters.expected_price_min);
  }

  // Filtro por precio esperado máximo
  if (filters.expected_price_max !== undefined) {
    conditions.push('expected_price <= ?');
    params.push(filters.expected_price_max);
  }

  // Filtro por teléfono del propietario
  if (filters.owner_phone) {
    conditions.push('owner_phone = ?');
    params.push(filters.owner_phone);
  }

  // Filtro por fecha de creación desde
  if (filters.created_after) {
    conditions.push('created_at >= ?');
    params.push(filters.created_after);
  }

  // Filtro por fecha de creación hasta
  if (filters.created_before) {
    conditions.push('created_at <= ?');
    params.push(filters.created_before);
  }

  let sql = 'SELECT * FROM consignments';
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  // Orden por fecha de creación descendente
  sql += ' ORDER BY created_at DESC';

  // Paginación
  const limit = filters.limit || 20;
  const offset = filters.offset || 0;
  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return { sql, params };
}

/**
 * Obtiene consignaciones con filtros y paginación
 */
export async function getConsignments(filters: ConsignmentFilters): Promise<{ consignments: Consignment[], total: number }> {
  const db = getDb();
  
  const { sql, params } = buildFiltersQuery(filters);

  // Consulta para obtener consignaciones
  const stmt = db.prepare(sql);
  const result = await stmt.bind(...params).all<Consignment>();

  // Consulta para obtener el total sin paginación
  const countSql = sql.replace(/LIMIT \? OFFSET \?$/, '').replace('SELECT *', 'SELECT COUNT(*) as count');
  const countStmt = db.prepare(countSql);
  const countResult = await countStmt.bind(...params.slice(0, -2)).first<{ count: number }>();

  // Obtener fotos para cada consignación
  const consignments = result.results || [];
  const consignmentsWithPhotos = await Promise.all(
    consignments.map(async (consignment: Consignment) => {
      const photosStmt = db.prepare(
        'SELECT * FROM consignment_photos WHERE consignment_id = ? ORDER BY position ASC'
      );
      const photosResult = await photosStmt.bind(consignment.id).all<ConsignmentPhoto>();
      return {
        ...consignment,
        photos: photosResult.results || []
      };
    })
  );

  return {
    consignments: consignmentsWithPhotos,
    total: countResult?.count || 0
  };
}

/**
 * Obtiene una consignación por su ID
 */
export async function getConsignmentById(id: string): Promise<Consignment | null> {
  const db = getDb();
  
  const stmt = db.prepare('SELECT * FROM consignments WHERE id = ?');
  const result = await stmt.bind(id).first<Consignment>();

  if (!result) return null;

  // Obtener fotos
  const photosStmt = db.prepare(
    'SELECT * FROM consignment_photos WHERE consignment_id = ? ORDER BY position ASC'
  );
  const photosResult = await photosStmt.bind(id).all<ConsignmentPhoto>();

  // Obtener datos del vehículo si existe
  let vehicle = null;
  if (result.vehicle_id) {
    const vehicleStmt = db.prepare(
      'SELECT id, slug, price FROM vehicles WHERE id = ?'
    );
    const vehicleResult = await vehicleStmt.bind(result.vehicle_id).first<{ id: string, slug: string, price: number }>();
    vehicle = vehicleResult;
  }

  // Obtener datos del revisor si existe
  let reviewer = null;
  if (result.reviewed_by) {
    const userStmt = db.prepare(
      'SELECT id, name FROM users WHERE id = ?'
    );
    const userResult = await userStmt.bind(result.reviewed_by).first<{ id: string, name: string }>();
    reviewer = userResult;
  }

  return {
    ...result,
    photos: photosResult.results || [],
    vehicle: vehicle || undefined,
    reviewer: reviewer || undefined
  };
}

/**
 * Crea una nueva consignación (público - submission)
 */
export async function createConsignment(data: CreateConsignmentInput): Promise<Consignment> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO consignments (
      id, owner_name, owner_email, owner_phone, brand, model, year, 
      expected_price, notes, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    id,
    data.owner_name,
    data.owner_email || null,
    data.owner_phone,
    data.brand,
    data.model,
    data.year,
    data.expected_price || null,
    data.notes || null,
    'received', // Status inicial
    now,
    now
  );

  return getConsignmentById(id) as Promise<Consignment>;
}

/**
 * Actualiza una consignación existente (admin)
 */
export async function updateConsignment(id: string, data: UpdateConsignmentInput): Promise<Consignment | null> {
  const db = getDb();
  const now = new Date().toISOString();

  // Construir query dinámicamente
  const updates: string[] = ['updated_at = ?'];
  const params: (string | number | null)[] = [now];

  if (data.vehicle_id !== undefined) {
    updates.push('vehicle_id = ?');
    params.push(data.vehicle_id);
  }
  if (data.owner_name !== undefined) {
    updates.push('owner_name = ?');
    params.push(data.owner_name);
  }
  if (data.owner_email !== undefined) {
    updates.push('owner_email = ?');
    params.push(data.owner_email);
  }
  if (data.owner_phone !== undefined) {
    updates.push('owner_phone = ?');
    params.push(data.owner_phone);
  }
  if (data.brand !== undefined) {
    updates.push('brand = ?');
    params.push(data.brand);
  }
  if (data.model !== undefined) {
    updates.push('model = ?');
    params.push(data.model);
  }
  if (data.year !== undefined) {
    updates.push('year = ?');
    params.push(data.year);
  }
  if (data.expected_price !== undefined) {
    updates.push('expected_price = ?');
    params.push(data.expected_price);
  }
  if (data.notes !== undefined) {
    updates.push('notes = ?');
    params.push(data.notes);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
  }
  if (data.reviewed_by !== undefined) {
    updates.push('reviewed_by = ?');
    params.push(data.reviewed_by);
  }
  if (data.reviewed_at !== undefined) {
    updates.push('reviewed_at = ?');
    params.push(data.reviewed_at);
  }

  params.push(id);

  const sql = `UPDATE consignments SET ${updates.join(', ')} WHERE id = ?`;
  const stmt = db.prepare(sql);
  await stmt.bind(...params);

  return getConsignmentById(id);
}

/**
 * Actualiza el estado de una consignación con validación de transición
 */
export async function updateConsignmentStatus(
  id: string, 
  status: ConsignmentStatus, 
  reviewedBy?: string
): Promise<Consignment | null> {
  const db = getDb();
  const now = new Date().toISOString();

  // Obtener estado actual
  const currentStmt = db.prepare('SELECT status FROM consignments WHERE id = ?');
  const currentResult = await currentStmt.bind(id).first<{ status: ConsignmentStatus }>();

  if (!currentResult) {
    return null;
  }

  // Importar función de validación de estado
  const { canTransitionConsignment } = await import('@/lib/core/state-machine');
  
  // Validar transición
  if (!canTransitionConsignment(currentResult.status, status)) {
    console.warn(`[Consignment] Transición no permitida: ${currentResult.status} -> ${status}`);
    throw new Error(`Transición de estado no permitida: ${currentResult.status} -> ${status}`);
  }

  // Construir query de actualización
  const updates: string[] = ['status = ?', 'updated_at = ?'];
  const params: (string | null)[] = [status, now];

  // Si es una transición que requiere revisión (approved o rejected)
  if (status === 'approved' || status === 'rejected') {
    updates.push('reviewed_by = ?', 'reviewed_at = ?');
    params.push(reviewedBy || null, now);
  }

  params.push(id);

  const sql = `UPDATE consignments SET ${updates.join(', ')} WHERE id = ?`;
  const stmt = db.prepare(sql);
  await stmt.bind(...params);

  return getConsignmentById(id);
}

/**
 * Obtiene todas las fotos de una consignación
 */
export async function getConsignmentPhotos(consignmentId: string): Promise<ConsignmentPhoto[]> {
  const db = getDb();
  
  const stmt = db.prepare(
    'SELECT * FROM consignment_photos WHERE consignment_id = ? ORDER BY position ASC'
  );
  const result = await stmt.bind(consignmentId).all<ConsignmentPhoto>();

  return result.results || [];
}

/**
 * Agrega una foto a una consignación
 */
export async function addConsignmentPhoto(
  consignmentId: string, 
  url: string, 
  position?: number
): Promise<ConsignmentPhoto> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Si no se especifica posición, obtener la última y sumar 1
  let photoPosition = position;
  if (photoPosition === undefined) {
    const lastPhotoStmt = db.prepare(
      'SELECT MAX(position) as max_pos FROM consignment_photos WHERE consignment_id = ?'
    );
    const lastPhotoResult = await lastPhotoStmt.bind(consignmentId).first<{ max_pos: number | null }>();
    photoPosition = (lastPhotoResult?.max_pos ?? -1) + 1;
  }

  const stmt = db.prepare(`
    INSERT INTO consignment_photos (id, consignment_id, url, position, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  await stmt.bind(id, consignmentId, url, photoPosition, now);

  const photoStmt = db.prepare('SELECT * FROM consignment_photos WHERE id = ?');
  const result = await photoStmt.bind(id).first<ConsignmentPhoto>();

  return result!;
}

/**
 * Elimina una foto de una consignación
 */
export async function deleteConsignmentPhoto(photoId: string): Promise<boolean> {
  const db = getDb();
  
  const stmt = db.prepare('DELETE FROM consignment_photos WHERE id = ?');
  const result = await stmt.bind(photoId).run();

  return result.success;
}

/**
 * Obtiene consignaciones para admin (todos los estados)
 */
export async function getAdminConsignments(filters: ConsignmentFilters): Promise<{ consignments: Consignment[], total: number }> {
  return getConsignments(filters);
}

/**
 * Obtiene estadísticas de consignaciones por estado
 */
export async function getConsignmentStats(): Promise<{
  total: number;
  received: number;
  under_review: number;
  approved: number;
  rejected: number;
  published: number;
}> {
  const db = getDb();
  
  const stmt = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as received,
      SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published
    FROM consignments
  `);
  
  const result = await stmt.first<{
    total: number;
    received: number;
    under_review: number;
    approved: number;
    rejected: number;
    published: number;
  }>();

  return result || {
    total: 0,
    received: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    published: 0
  };
}

/**
 * Busca consignaciones por teléfono de propietario (para verificar duplicados)
 */
export async function findConsignmentByPhone(ownerPhone: string): Promise<Consignment | null> {
  const db = getDb();
  
  const stmt = db.prepare(`
    SELECT * FROM consignments 
    WHERE owner_phone = ? 
    ORDER BY created_at DESC 
    LIMIT 1
  `);
  const result = await stmt.bind(ownerPhone).first<Consignment>();

  if (!result) return null;

  // Obtener fotos
  const photosStmt = db.prepare(
    'SELECT * FROM consignment_photos WHERE consignment_id = ? ORDER BY position ASC'
  );
  const photosResult = await photosStmt.bind(result.id).all<ConsignmentPhoto>();

  return {
    ...result,
    photos: photosResult.results || []
  };
}
