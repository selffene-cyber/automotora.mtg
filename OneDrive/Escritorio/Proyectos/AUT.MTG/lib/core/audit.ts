// ============================================================
// Funciones de auditoría para el sistema
// MTG Automotora - Plataforma MVP
// ============================================================

import { D1Database } from '@cloudflare/workers-types';
import { ConsignmentStatus } from '@/types/consignment';

/**
 * Obtiene el binding de D1 para usar en las consultas
 * In Cloudflare Pages with Edge runtime, process.env.DB is a D1Database object
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
 * Tipos de acciones de auditoría disponibles
 */
export type AuditAction = 'created' | 'updated' | 'deleted' | 'status_changed' | 'approved' | 'bid_placed' | 'winner_determined';

/**
 * Registra un cambio de estado en una entidad
 */
async function logAudit(
  userId: string | null,
  entityType: string,
  entityId: string,
  action: AuditAction,
  oldValue: string | null,
  newValue: string | null
): Promise<void> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO audit_logs (id, user_id, entity_type, entity_id, action, old_value, new_value, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(id, userId, entityType, entityId, action, oldValue, newValue, now);
}

// ============================================================
// AUDIT FUNCTIONS FOR CONSIGNMENTS - Funciones de Auditoría para Consignaciones
// ============================================================

/**
 * Registra un cambio de estado en una consignación
 * Logs a status change in a consignment
 * 
 * @param consignmentId - ID de la consignación
 * @param oldStatus - Estado anterior
 * @param newStatus - Estado nuevo
 * @param userId - ID del usuario que realizó el cambio (opcional)
 */
export async function logConsignmentStatusChange(
  consignmentId: string,
  oldStatus: ConsignmentStatus,
  newStatus: ConsignmentStatus,
  userId: string | null = null
): Promise<void> {
  await logAudit(
    userId,
    'consignment',
    consignmentId,
    'status_changed',
    oldStatus,
    newStatus
  );

  console.log(`[Audit] Consignment ${consignmentId} status changed: ${oldStatus} -> ${newStatus} by user ${userId || 'system'}`);
}

/**
 * Registra la aprobación de una consignación y creación de vehículo asociado
 * Logs consignment approval and associated vehicle creation
 * 
 * @param consignmentId - ID de la consignación aprobada
 * @param vehicleId - ID del vehículo creado
 * @param userId - ID del usuario que aprobó
 */
export async function logConsignmentApproval(
  consignmentId: string,
  vehicleId: string,
  userId: string | null = null
): Promise<void> {
  // Registrar aprobación de consignación
  await logAudit(
    userId,
    'consignment',
    consignmentId,
    'approved',
    null,
    vehicleId // new_value contains the created vehicle ID
  );

  // Registrar creación del vehículo
  await logAudit(
    userId,
    'vehicle',
    vehicleId,
    'created',
    null,
    consignmentId // new_value references the source consignment
  );

  console.log(`[Audit] Consignment ${consignmentId} approved, vehicle ${vehicleId} created by user ${userId || 'system'}`);
}

/**
 * Registra la creación de una nueva consignación
 * Logs creation of a new consignment
 * 
 * @param consignmentId - ID de la consignación creada
 * @param userId - ID del usuario que creó (null si es público)
 */
export async function logConsignmentCreated(
  consignmentId: string,
  userId: string | null = null
): Promise<void> {
  await logAudit(
    userId,
    'consignment',
    consignmentId,
    'created',
    null,
    null
  );

  console.log(`[Audit] Consignment ${consignmentId} created by user ${userId || 'public'}`);
}

/**
 * Registra la actualización de una consignación
 * Logs update of a consignment
 * 
 * @param consignmentId - ID de la consignación actualizada
 * @param userId - ID del usuario que realizó la actualización
 * @param field - Campo actualizado
 * @param oldValue - Valor anterior
 * @param newValue - Valor nuevo
 */
export async function logConsignmentUpdate(
  consignmentId: string,
  userId: string | null,
  field: string,
  oldValue: string | null,
  newValue: string | null
): Promise<void> {
  await logAudit(
    userId,
    'consignment',
    consignmentId,
    'updated',
    oldValue ? `${field}:${oldValue}` : null,
    newValue ? `${field}:${newValue}` : null
  );

  console.log(`[Audit] Consignment ${consignmentId} updated: ${field} changed by user ${userId || 'system'}`);
}

/**
 * Registra el rechazo de una consignación
 * Logs rejection of a consignment
 * 
 * @param consignmentId - ID de la consignación rechazada
 * @param userId - ID del usuario que rechazó
 * @param reason - Razón del rechazo (opcional)
 */
export async function logConsignmentRejection(
  consignmentId: string,
  userId: string | null,
  reason: string | null = null
): Promise<void> {
  await logAudit(
    userId,
    'consignment',
    consignmentId,
    'status_changed',
    null,
    reason ? `rejected:${reason}` : 'rejected'
  );

  console.log(`[Audit] Consignment ${consignmentId} rejected by user ${userId || 'system'}: ${reason || 'no reason provided'}`);
}

/**
 * Registra la publicación de una consignación
 * Logs publication of a consignment
 * 
 * @param consignmentId - ID de la consignación publicada
 * @param userId - ID del usuario que publicó
 */
export async function logConsignmentPublication(
  consignmentId: string,
  userId: string | null = null
): Promise<void> {
  await logAudit(
    userId,
    'consignment',
    consignmentId,
    'status_changed',
    'approved',
    'published'
  );

  console.log(`[Audit] Consignment ${consignmentId} published by user ${userId || 'system'}`);
}

// ============================================================
// AUDIT QUERY HELPERS - Ayudantes de Consulta de Auditoría
// ============================================================

/**
 * Obtiene el historial de auditoria de una consignación
 * Gets audit history for a consignment
 * 
 * @param consignmentId - ID de la consignación
 * @param limit - Límite de registros (default 50)
 */
export async function getConsignmentAuditHistory(
  consignmentId: string,
  limit: number = 50
): Promise<Array<{
  id: string;
  user_id: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}>> {
  const db = getDb();
  
  const stmt = db.prepare(`
    SELECT id, user_id, action, old_value, new_value, created_at 
    FROM audit_logs 
    WHERE entity_type = 'consignment' AND entity_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  
  const result = await stmt.bind(consignmentId, limit).all<{
    id: string;
    user_id: string | null;
    action: string;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
  }>();

  return result.results || [];
}

/**
 * Obtiene el historial de auditoria de un vehículo
 * Gets audit history for a vehicle
 * 
 * @param vehicleId - ID del vehículo
 * @param limit - Límite de registros (default 50)
 */
export async function getVehicleAuditHistory(
  vehicleId: string,
  limit: number = 50
): Promise<Array<{
  id: string;
  user_id: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}>> {
  const db = getDb();
  
  const stmt = db.prepare(`
    SELECT id, user_id, action, old_value, new_value, created_at 
    FROM audit_logs 
    WHERE entity_type = 'vehicle' AND entity_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  
  const result = await stmt.bind(vehicleId, limit).all<{
    id: string;
    user_id: string | null;
    action: string;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
  }>();

  return result.results || [];
}

/**
 * Obtiene auditoria por usuario
 * Gets audit logs by user
 * 
 * @param userId - ID del usuario
 * @param limit - Límite de registros (default 50)
 */
export async function getAuditByUser(
  userId: string,
  limit: number = 50
): Promise<Array<{
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}>> {
  const db = getDb();
  
  const stmt = db.prepare(`
    SELECT id, entity_type, entity_id, action, old_value, new_value, created_at 
    FROM audit_logs 
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  
  const result = await stmt.bind(userId, limit).all<{
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
  }>();

  return result.results || [];
}

// ============================================================
// AUDIT FUNCTIONS FOR AUCTIONS - Funciones de Auditoría para Subastas
// ============================================================

/**
 * Registra un cambio de estado en una subasta
 * Logs a status change in an auction
 * 
 * @param auctionId - ID de la subasta
 * @param userId - ID del usuario que realiza el cambio
 * @param oldStatus - Estado anterior
 * @param newStatus - Nuevo estado
 */
export async function logAuctionStatusChange(
  auctionId: string,
  userId: string | null,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  await logAudit(
    userId,
    'auction',
    auctionId,
    'status_changed',
    oldStatus,
    newStatus
  );

  console.log(`[Audit] Auction ${auctionId} status changed from ${oldStatus} to ${newStatus} by user ${userId || 'system'}`);
}

/**
 * Registra una puja placed en una subasta
 * Logs a bid placed on an auction
 * 
 * @param auctionId - ID de la subasta
 * @param userId - ID del usuario que realiza la puja (puede ser null para pujas anónimas)
 * @param bidAmount - Monto de la puja
 * @param bidderName - Nombre del pujador
 */
export async function logBidPlaced(
  auctionId: string,
  userId: string | null,
  bidAmount: number,
  bidderName: string
): Promise<void> {
  await logAudit(
    userId,
    'auction',
    auctionId,
    'bid_placed',
    null,
    JSON.stringify({ amount: bidAmount, bidder: bidderName })
  );

  console.log(`[Audit] Bid of ${bidAmount} placed on auction ${auctionId} by ${bidderName}`);
}

/**
 * Registra la determinación de un ganador en una subasta
 * Logs winner determination for an auction
 * 
 * @param auctionId - ID de la subasta
 * @param userId - ID del usuario que realiza la acción
 * @param winnerId - ID del ganador
 * @param winningBid - Monto de la puja ganadora
 */
export async function logWinnerDetermined(
  auctionId: string,
  userId: string | null,
  winnerId: string | null,
  winningBid: number
): Promise<void> {
  await logAudit(
    userId,
    'auction',
    auctionId,
    'winner_determined',
    null,
    JSON.stringify({ winner_id: winnerId, winning_bid: winningBid })
  );

  console.log(`[Audit] Winner determined for auction ${auctionId}: winner=${winnerId}, bid=${winningBid}`);
}

/**
 * Registra la creación de una subasta
 * Logs auction creation
 * 
 * @param auctionId - ID de la subasta
 * @param userId - ID del usuario que crea la subasta
 * @param vehicleId - ID del vehículo
 * @param startingPrice - Precio inicial
 */
export async function logAuctionCreated(
  auctionId: string,
  userId: string | null,
  vehicleId: string,
  startingPrice: number
): Promise<void> {
  await logAudit(
    userId,
    'auction',
    auctionId,
    'created',
    null,
    JSON.stringify({ vehicle_id: vehicleId, starting_price: startingPrice })
  );

  console.log(`[Audit] Auction ${auctionId} created by user ${userId || 'system'} for vehicle ${vehicleId}`);
}

/**
 * Obtiene el historial de auditoria de una subasta
 * Gets audit history for an auction
 * 
 * @param auctionId - ID de la subasta
 * @param limit - Límite de registros (default 50)
 */
export async function getAuctionAuditHistory(
  auctionId: string,
  limit: number = 50
): Promise<Array<{
  id: string;
  user_id: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}>> {
  const db = getDb();
  
  const stmt = db.prepare(`
    SELECT id, user_id, action, old_value, new_value, created_at 
    FROM audit_logs 
    WHERE entity_type = 'auction' AND entity_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  
  const result = await stmt.bind(auctionId, limit).all<{
    id: string;
    user_id: string | null;
    action: string;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
  }>();

  return result.results || [];
}
