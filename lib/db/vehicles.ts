// ============================================================
// Capa de consultas D1 para vehículos
// MTG Automotora - Plataforma MVP
// ============================================================

import { D1Database } from '@cloudflare/workers-types';
import { 
  Vehicle, 
  VehicleFilters, 
  CreateVehicleInput, 
  UpdateVehicleInput, 
  VehicleStatus,
  VehiclePhoto 
} from '@/types/vehicle';

/**
 * Obtiene el binding de D1 para usar en las consultas
 * En Cloudflare Pages con Edge runtime, el binding está en process.env.DB
 */
export function getDb(): D1Database {
  const db = process.env.DB;
  
  if (!db) {
    throw new Error('D1 Database binding (DB) not found. Make sure:\n' +
      '1. You are using Edge runtime (export const runtime = "edge")\n' +
      '2. For local dev, use: npx @cloudflare/next-on-pages/cli dev\n' +
      '3. The wrangler.toml has [[d1_databases]] binding = "DB"');
  }
  
  // In Cloudflare Pages with Edge runtime, process.env.DB is a D1Database object
  return db as unknown as D1Database;
}

/**
 * Construye la consulta SQL y parámetros basados en filtros
 */
function buildFiltersQuery(filters: VehicleFilters, includePhotos: boolean = false): {
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

  // Filtro por precio mínimo
  if (filters.price_min !== undefined) {
    conditions.push('price >= ?');
    params.push(filters.price_min);
  }

  // Filtro por precio máximo
  if (filters.price_max !== undefined) {
    conditions.push('price <= ?');
    params.push(filters.price_max);
  }

  // Filtro por región
  if (filters.region) {
    conditions.push('region = ?');
    params.push(filters.region);
  }

  // Filtro por ciudad
  if (filters.city) {
    conditions.push('city = ?');
    params.push(filters.city);
  }

  // Búsqueda por texto (marca, modelo, descripción)
  if (filters.search) {
    conditions.push('(brand LIKE ? OR model LIKE ? OR description LIKE ?)');
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  let sql = 'SELECT * FROM vehicles';
  
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
 * Obtiene vehículos con filtros y paginación
 * Solo devuelve vehículos publicados para uso público
 */
export async function getVehicles(filters: VehicleFilters): Promise<{ vehicles: Vehicle[], total: number }> {
  const db = getDb();
  
  // Por defecto, solo vehículos publicados para público
  const publicFilters: VehicleFilters = {
    ...filters,
    status: filters.status || ['published']
  };

  const { sql, params } = buildFiltersQuery(publicFilters);

  // Consulta para obtener vehículos
  const stmt = db.prepare(sql);
  const result = await stmt.bind(...params).all<Vehicle>();

  // Consulta para obtener el total sin paginación
  const countSql = sql.replace(/LIMIT \? OFFSET \?$/, '').replace('SELECT *', 'SELECT COUNT(*) as count');
  const countStmt = db.prepare(countSql);
  const countResult = await countStmt.bind(...params.slice(0, -2)).first<{ count: number }>();

  // Obtener fotos para cada vehículo
  const vehicles = result.results || [];
  const vehiclesWithPhotos = await Promise.all(
    vehicles.map(async (vehicle: Vehicle) => {
      const photosStmt = db.prepare(
        'SELECT * FROM vehicle_photos WHERE vehicle_id = ? ORDER BY position ASC'
      );
      const photosResult = await photosStmt.bind(vehicle.id).all<VehiclePhoto>();
      return {
        ...vehicle,
        photos: photosResult.results || []
      };
    })
  );

  return {
    vehicles: vehiclesWithPhotos,
    total: countResult?.count || 0
  };
}

/**
 * Obtiene un vehículo por su ID
 */
export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const db = getDb();
  
  const stmt = db.prepare('SELECT * FROM vehicles WHERE id = ?');
  const result = await stmt.bind(id).first<Vehicle>();

  if (!result) return null;

  // Obtener fotos
  const photosStmt = db.prepare(
    'SELECT * FROM vehicle_photos WHERE vehicle_id = ? ORDER BY position ASC'
  );
  const photosResult = await photosStmt.bind(id).all<VehiclePhoto>();

  return {
    ...result,
    photos: photosResult.results || []
  };
}

/**
 * Obtiene un vehículo por su slug (para URLs SEO)
 */
export async function getVehicleBySlug(slug: string): Promise<Vehicle | null> {
  const db = getDb();
  
  const stmt = db.prepare('SELECT * FROM vehicles WHERE slug = ?');
  const result = await stmt.bind(slug).first<Vehicle>();

  if (!result) return null;

  // Obtener fotos
  const photosStmt = db.prepare(
    'SELECT * FROM vehicle_photos WHERE vehicle_id = ? ORDER BY position ASC'
  );
  const photosResult = await photosStmt.bind(result.id).all<VehiclePhoto>();

  return {
    ...result,
    photos: photosResult.results || []
  };
}

/**
 * Crea un nuevo vehículo (solo admins)
 */
export async function createVehicle(data: CreateVehicleInput): Promise<Vehicle> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO vehicles (
      id, slug, brand, model, year, price, mileage_km, 
      transmission, fuel_type, region, city, status, description, 
      created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    id,
    data.slug,
    data.brand,
    data.model,
    data.year,
    data.price,
    data.mileage_km || null,
    data.transmission || null,
    data.fuel_type || null,
    data.region || null,
    data.city || null,
    'draft',
    data.description || null,
    data.created_by || null,
    now,
    now
  );

  return getVehicleById(id) as Promise<Vehicle>;
}

/**
 * Actualiza un vehículo existente (solo admins)
 */
export async function updateVehicle(id: string, data: UpdateVehicleInput): Promise<Vehicle | null> {
  const db = getDb();
  const now = new Date().toISOString();

  // Construir query dinámicamente
  const updates: string[] = ['updated_at = ?'];
  const params: (string | number | null)[] = [now];

  if (data.slug !== undefined) {
    updates.push('slug = ?');
    params.push(data.slug);
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
  if (data.price !== undefined) {
    updates.push('price = ?');
    params.push(data.price);
  }
  if (data.mileage_km !== undefined) {
    updates.push('mileage_km = ?');
    params.push(data.mileage_km);
  }
  if (data.transmission !== undefined) {
    updates.push('transmission = ?');
    params.push(data.transmission);
  }
  if (data.fuel_type !== undefined) {
    updates.push('fuel_type = ?');
    params.push(data.fuel_type);
  }
  if (data.region !== undefined) {
    updates.push('region = ?');
    params.push(data.region);
  }
  if (data.city !== undefined) {
    updates.push('city = ?');
    params.push(data.city);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    params.push(data.description);
  }

  params.push(id);

  const sql = `UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?`;
  const stmt = db.prepare(sql);
  await stmt.bind(...params);

  return getVehicleById(id);
}

/**
 * Actualiza el estado de un vehículo
 */
export async function updateVehicleStatus(id: string, status: VehicleStatus): Promise<Vehicle | null> {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE vehicles SET status = ?, updated_at = ? WHERE id = ?
  `);

  await stmt.bind(status, now, id);

  return getVehicleById(id);
}

/**
 * Elimina (soft delete) un vehículo - lo marca como archivado
 */
export async function deleteVehicle(id: string): Promise<boolean> {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE vehicles SET status = 'archived', updated_at = ? WHERE id = ?
  `);

  const result = await stmt.bind(now, id).run();

  return result.success;
}

/**
 * Obtiene todas las fotos de un vehículo
 */
export async function getVehiclePhotos(vehicleId: string): Promise<VehiclePhoto[]> {
  const db = getDb();
  
  const stmt = db.prepare(
    'SELECT * FROM vehicle_photos WHERE vehicle_id = ? ORDER BY position ASC'
  );
  const result = await stmt.bind(vehicleId).all<VehiclePhoto>();

  return result.results || [];
}

/**
 * Agrega una foto a un vehículo
 */
export async function addVehiclePhoto(vehicleId: string, url: string, position?: number): Promise<VehiclePhoto> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Si no se especifica posición, obtener la última y sumar 1
  let photoPosition = position;
  if (photoPosition === undefined) {
    const lastPhotoStmt = db.prepare(
      'SELECT MAX(position) as max_pos FROM vehicle_photos WHERE vehicle_id = ?'
    );
    const lastPhotoResult = await lastPhotoStmt.bind(vehicleId).first<{ max_pos: number | null }>();
    photoPosition = (lastPhotoResult?.max_pos ?? -1) + 1;
  }

  const stmt = db.prepare(`
    INSERT INTO vehicle_photos (id, vehicle_id, url, position, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  await stmt.bind(id, vehicleId, url, photoPosition, now);

  const photoStmt = db.prepare('SELECT * FROM vehicle_photos WHERE id = ?');
  const result = await photoStmt.bind(id).first<VehiclePhoto>();

  return result!;
}

/**
 * Elimina una foto de un vehículo
 */
export async function deleteVehiclePhoto(photoId: string): Promise<boolean> {
  const db = getDb();
  
  const stmt = db.prepare('DELETE FROM vehicle_photos WHERE id = ?');
  const result = await stmt.bind(photoId).run();

  return result.success;
}

/**
 * Obtiene vehículos para admin (todos los estados)
 */
export async function getAdminVehicles(filters: VehicleFilters): Promise<{ vehicles: Vehicle[], total: number }> {
  const db = getDb();
  
  // Para admin, no filtramos por status por defecto (trae todos)
  const adminFilters: VehicleFilters = {
    ...filters
  };

  const { sql, params } = buildFiltersQuery(adminFilters);

  // Consulta para obtener vehículos
  const stmt = db.prepare(sql);
  const result = await stmt.bind(...params).all<Vehicle>();

  // Consulta para obtener el total
  const countSql = sql.replace(/LIMIT \? OFFSET \?$/, '').replace('SELECT *', 'SELECT COUNT(*) as count');
  const countStmt = db.prepare(countSql);
  const countResult = await countStmt.bind(...params.slice(0, -2)).first<{ count: number }>();

  // Obtener fotos para cada vehículo
  const vehicles = result.results || [];
  const vehiclesWithPhotos = await Promise.all(
    vehicles.map(async (vehicle: Vehicle) => {
      const photosStmt = db.prepare(
        'SELECT * FROM vehicle_photos WHERE vehicle_id = ? ORDER BY position ASC'
      );
      const photosResult = await photosStmt.bind(vehicle.id).all<VehiclePhoto>();
      return {
        ...vehicle,
        photos: photosResult.results || []
      };
    })
  );

  return {
    vehicles: vehiclesWithPhotos,
    total: countResult?.count || 0
  };
}

/**
 * Genera un slug único para un vehículo
 */
export function generateSlug(brand: string, model: string, year: number): string {
  const timestamp = Date.now().toString(36);
  return `${brand.toLowerCase()}-${model.toLowerCase().replace(/\s+/g, '-')}-${year}-${timestamp}`;
}

/**
 * Verifica si un slug ya existe
 */
export async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  const db = getDb();
  
  let sql = 'SELECT COUNT(*) as count FROM vehicles WHERE slug = ?';
  const params: string[] = [slug];
  
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  
  const stmt = db.prepare(sql);
  const result = await stmt.bind(...params).first<{ count: number }>();
  
  return (result?.count || 0) > 0;
}