// ============================================================
// Test Setup and Helper Utilities
// MTG Automotora - Validation Tests
// ============================================================

import type { D1Database } from '@cloudflare/workers-types';

/**
 * Interface for test database operations
 */
export interface TestDb extends D1Database {
  // Extended test methods
  reset(): Promise<void>;
  seed(): Promise<void>;
}

/**
 * Gets the test database instance
 * In development, uses the actual DB. In tests, uses mock.
 */
export function getTestDb(): D1Database {
  // In Cloudflare Pages / Workers context, DB is available via env
  if (typeof process !== 'undefined' && process.env.DB) {
    return process.env.DB as unknown as D1Database;
  }
  
  // For local testing, return mock
  throw new Error('Test database not available. Set DB environment variable.');
}

/**
 * Cleans up all test data from the database
 * Use with caution - deletes all data!
 */
export async function cleanupTestData(db: D1Database): Promise<void> {
  // Delete in order to respect foreign key constraints
  await db.prepare('DELETE FROM bids').run();
  await db.prepare('DELETE FROM auctions').run();
  await db.prepare('DELETE FROM reservations').run();
  await db.prepare('DELETE FROM leads').run();
  await db.prepare('DELETE FROM vehicle_photos').run();
  await db.prepare('DELETE FROM vehicles').run();
  await db.prepare('DELETE FROM users').run();
}

/**
 * Creates a test vehicle in the database
 */
export async function createTestVehicle(
  db: D1Database,
  options: {
    id?: string;
    brand?: string;
    model?: string;
    year?: number;
    price?: number;
    status?: string;
    slug?: string;
  } = {}
): Promise<string> {
  const id = options.id || crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO vehicles (
      id, brand, model, year, price, status, slug,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    options.brand || 'Toyota',
    options.model || 'Corolla',
    options.year || 2023,
    options.price || 15000000,
    options.status || 'draft',
    options.slug || `toyota-corolla-${Date.now()}`,
    now,
    now
  ).run();
  
  return id;
}

/**
 * Creates a test reservation in the database
 */
export async function createTestReservation(
  db: D1Database,
  options: {
    id?: string;
    vehicleId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    amount?: number;
    status?: string;
    idempotencyKey?: string;
    expiresAt?: string;
  } = {}
): Promise<string> {
  const id = options.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const expiresAt = options.expiresAt || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  
  await db.prepare(`
    INSERT INTO reservations (
      id, vehicle_id, customer_name, customer_phone, customer_email,
      amount, status, idempotency_key, expires_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    options.vehicleId || crypto.randomUUID(),
    options.customerName || 'Test Customer',
    options.customerPhone || '+56912345678',
    options.customerEmail || 'test@example.com',
    options.amount || 100000,
    options.status || 'pending_payment',
    options.idempotencyKey || crypto.randomUUID(),
    expiresAt,
    now,
    now
  ).run();
  
  return id;
}

/**
 * Creates a test user in the database
 */
export async function createTestUser(
  db: D1Database,
  options: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
  } = {}
): Promise<string> {
  const id = options.id || crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO users (
      id, email, name, role, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `).bind(
    id,
    options.email || `test-${Date.now()}@example.com`,
    options.name || 'Test User',
    options.role || 'admin',
    now
  ).run();
  
  return id;
}

/**
 * Assertion helper for tests
 */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Asserts that two values are equal
 */
export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message || 'Values not equal'}\n  Expected: ${expected}\n  Actual: ${actual}`
    );
  }
}

/**
 * Waits for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Runs a function with retry logic
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
  } = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts || 3;
  const delayMs = options.delayMs || 100;
  
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await wait(delayMs * attempt);
      }
    }
  }
  
  throw lastError;
}
