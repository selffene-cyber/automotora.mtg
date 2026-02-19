// ============================================================
// Payment Database Queries
// MTG Automotora - Handles all payment transaction operations
// ============================================================

import type { D1Database } from '@cloudflare/workers-types';

/**
 * Get database instance (uses global process.env.DB pattern)
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

// ============================================================
// Tipos
// ============================================================

export interface PaymentTransaction {
  id: string;
  entity_type: 'reservation' | 'auction_deposit' | 'auction_winner';
  entity_id: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  payment_id: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  idempotency_key: string;
  metadata: string | null;
  provider: 'webpay' | 'mercadopago' | 'mock';
  webhook_payload: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuctionPaymentAttempt {
  id: string;
  auction_id: string;
  payment_transaction_id: string | null;
  amount: number;
  provider: 'webpay' | 'mercadopago' | 'mock';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  payment_url: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CreatePaymentTransactionInput {
  entity_type: 'reservation' | 'auction_deposit' | 'auction_winner';
  entity_id: string;
  amount: number;
  currency?: string;
  payment_method?: string;
  provider?: 'webpay' | 'mercadopago' | 'mock';
  idempotency_key: string;
  metadata?: Record<string, any>;
}

export interface CreateAuctionPaymentAttemptInput {
  auction_id: string;
  amount: number;
  provider?: 'webpay' | 'mercadopago' | 'mock';
  expires_at?: string;
}

// ============================================================
// Payment Transaction Queries
// ============================================================

/**
 nueva transaccion de pago
 */
export async function createPaymentTransaction(
  data: CreatePaymentTransactionInput
): Promise<PaymentTransaction> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO payment_transactions (
      id, entity_type, entity_id, amount, currency, payment_method,
      provider, idempotency_key, metadata, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).bind(
    id,
    data.entity_type,
    data.entity_id,
    data.amount,
    data.currency || 'CLP',
    data.payment_method || null,
    data.provider || 'mock',
    data.idempotency_key,
    data.metadata ? JSON.stringify(data.metadata) : null,
    now,
    now
  ).run();

  return getPaymentById(id) as Promise<PaymentTransaction>;
}

/**
 * Obtiene una transaccion de pago por ID
 */
export async function getPaymentById(id: string): Promise<PaymentTransaction | null> {
  const db = getDb();
  
  const payment = await db.prepare(
    'SELECT * FROM payment_transactions WHERE id = ?'
  ).bind(id).first<PaymentTransaction>();

  return payment;
}

/**
 * Obtiene una transaccion de pago por idempotency_key
 */
export async function getPaymentByIdempotencyKey(
  key: string
): Promise<PaymentTransaction | null> {
  const db = getDb();
  
  const payment = await db.prepare(
    'SELECT * FROM payment_transactions WHERE idempotency_key = ?'
  ).bind(key).first<PaymentTransaction>();

  return payment;
}

/**
 * Obtiene pagos de deposito por auction_id
 */
export async function getPaymentByAuction(auctionId: string): Promise<PaymentTransaction | null> {
  const db = getDb();
  
  const payment = await db.prepare(
    'SELECT * FROM payment_transactions WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT 1'
  ).bind('auction_deposit', auctionId).first<PaymentTransaction>();

  return payment;
}

/**
 * Confirma un pago (actualiza status a completed)
 */
export async function confirmPayment(
  id: string,
  webhookPayload?: Record<string, any>
): Promise<PaymentTransaction | null> {
  const db = getDb();
  const now = new Date().toISOString();

  await db.prepare(`
    UPDATE payment_transactions 
    SET status = 'completed', 
        confirmed_at = ?,
        webhook_payload = ?,
        updated_at = ?
    WHERE id = ?
  `).bind(
    now,
    webhookPayload ? JSON.stringify(webhookPayload) : null,
    now,
    id
  ).run();

  return getPaymentById(id);
}

/**
 * Marca un pago como fallido
 */
export async function failPayment(
  id: string,
  webhookPayload?: Record<string, any>
): Promise<PaymentTransaction | null> {
  const db = getDb();
  const now = new Date().toISOString();

  await db.prepare(`
    UPDATE payment_transactions 
    SET status = 'failed', 
        webhook_payload = ?,
        updated_at = ?
    WHERE id = ?
  `).bind(
    webhookPayload ? JSON.stringify(webhookPayload) : null,
    now,
    id
  ).run();

  return getPaymentById(id);
}

/**
 * Obtiene todos los pagos de un tipo
 */
export async function getPaymentsByEntity(
  entityType: 'reservation' | 'auction_deposit' | 'auction_winner',
  entityId: string
): Promise<PaymentTransaction[]> {
  const db = getDb();
  
  const payments = await db.prepare(
    'SELECT * FROM payment_transactions WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC'
  ).bind(entityType, entityId).all<PaymentTransaction>();

  return payments.results || [];
}

// ============================================================
// Auction Payment Attempt Queries
// ============================================================

/**
 * Crea un intento de pago para una auction
 */
export async function createAuctionPaymentAttempt(
  data: CreateAuctionPaymentAttemptInput
): Promise<AuctionPaymentAttempt> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Default expiration: 30 minutes
  const expiresAt = data.expires_at || new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await db.prepare(`
    INSERT INTO auction_payment_attempts (
      id, auction_id, amount, provider, status, expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
  `).bind(
    id,
    data.auction_id,
    data.amount,
    data.provider || 'mock',
    expiresAt,
    now,
    now
  ).run();

  return getAuctionPaymentAttemptById(id) as Promise<AuctionPaymentAttempt>;
}

/**
 * Obtiene un intento de pago por ID
 */
export async function getAuctionPaymentAttemptById(
  id: string
): Promise<AuctionPaymentAttempt | null> {
  const db = getDb();
  
  const attempt = await db.prepare(
    'SELECT * FROM auction_payment_attempts WHERE id = ?'
  ).bind(id).first<AuctionPaymentAttempt>();

  return attempt;
}

/**
 * Obtiene el ultimo intento de pago de una auction
 */
export async function getLatestAuctionPaymentAttempt(
  auctionId: string
): Promise<AuctionPaymentAttempt | null> {
  const db = getDb();
  
  const attempt = await db.prepare(
    'SELECT * FROM auction_payment_attempts WHERE auction_id = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(auctionId).first<AuctionPaymentAttempt>();

  return attempt;
}

/**
 * Actualiza un intento de pago
 */
export async function updateAuctionPaymentAttempt(
  id: string,
  data: Partial<{
    payment_transaction_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
    payment_url: string;
    expires_at: string;
    completed_at: string;
  }>
): Promise<AuctionPaymentAttempt | null> {
  const db = getDb();
  const now = new Date().toISOString();

  const updates: string[] = ['updated_at = ?'];
  const params: (string | null)[] = [now];
  let paramIndex = 2;

  if (data.payment_transaction_id !== undefined) {
    updates.push(`payment_transaction_id = $${paramIndex}`);
    params.push(data.payment_transaction_id);
    paramIndex++;
  }

  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    params.push(data.status);
    paramIndex++;
  }

  if (data.payment_url !== undefined) {
    updates.push(`payment_url = $${paramIndex}`);
    params.push(data.payment_url);
    paramIndex++;
  }

  if (data.expires_at !== undefined) {
    updates.push(`expires_at = $${paramIndex}`);
    params.push(data.expires_at);
    paramIndex++;
  }

  if (data.completed_at !== undefined) {
    updates.push(`completed_at = $${paramIndex}`);
    params.push(data.completed_at);
    paramIndex++;
  }

  params.push(id);

  await db.prepare(
    `UPDATE auction_payment_attempts SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return getAuctionPaymentAttemptById(id);
}

/**
 * Marca un intento de pago como completado
 */
export async function completeAuctionPaymentAttempt(
  id: string,
  paymentTransactionId: string
): Promise<AuctionPaymentAttempt | null> {
  const db = getDb();
  const now = new Date().toISOString();

  await db.prepare(`
    UPDATE auction_payment_attempts 
    SET status = 'completed', 
        payment_transaction_id = ?,
        completed_at = ?,
        updated_at = ?
    WHERE id = ?
  `).bind(
    paymentTransactionId,
    now,
    now,
    id
  ).run();

  return getAuctionPaymentAttemptById(id);
}

/**
 * Obtiene intentos de pago expirados
 */
export async function getExpiredAuctionPaymentAttempts(): Promise<AuctionPaymentAttempt[]> {
  const db = getDb();
  
  const attempts = await db.prepare(`
    SELECT * FROM auction_payment_attempts 
    WHERE status = 'pending' AND expires_at < datetime('now')
  `).all<AuctionPaymentAttempt>();

  return attempts.results || [];
}
