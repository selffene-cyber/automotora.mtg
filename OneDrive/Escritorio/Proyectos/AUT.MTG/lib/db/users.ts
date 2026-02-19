/**
 * User Database Queries for MTG Platform
 * D1 database operations for user management
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { User, AuthUser, CreateUserInput, UpdateUserInput, UserRole } from '@/types/user';

export type { User, AuthUser, CreateUserInput, UpdateUserInput, UserRole };

/**
 * Get user by ID (internal use - includes password hash)
 */
export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?').bind(id);
  const result = await stmt.first<User>();

  return result || null;
}

/**
 * Get user by ID - public version (excludes password hash)
 */
export async function getUserByIdPublic(db: D1Database, id: string): Promise<AuthUser | null> {
  const stmt = db.prepare(
    'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?'
  ).bind(id);
  const result = await stmt.first<AuthUser & { created_at: string; updated_at: string }>();

  if (!result) return null;

  return {
    id: result.id,
    email: result.email,
    name: result.name,
    role: result.role,
  };
}

/**
 * Get user by email (for login)
 */
export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?').bind(email);
  const result = await stmt.first<User>();

  return result || null;
}

/**
 * Create new user
 */
export async function createUser(db: D1Database, data: CreateUserInput): Promise<User> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Hash password
  const { hashPassword } = await import('@/lib/auth');
  const passwordHash = await hashPassword(data.password);

  const stmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    data.email.toLowerCase().trim(),
    passwordHash,
    data.name?.trim() || null,
    data.role,
    now,
    now
  );

  await stmt.run();

  return {
    id,
    email: data.email.toLowerCase().trim(),
    password_hash: passwordHash,
    name: data.name?.trim() || null,
    role: data.role,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update user
 */
export async function updateUser(
  db: D1Database,
  id: string,
  data: UpdateUserInput
): Promise<User | null> {
  const existing = await getUserById(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (data.email !== undefined) {
    updates.push('email = ?');
    values.push(data.email.toLowerCase().trim());
  }

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name?.trim() || null);
  }

  if (data.role !== undefined) {
    updates.push('role = ?');
    values.push(data.role);
  }

  if (data.password !== undefined) {
    const { hashPassword } = await import('@/lib/auth');
    const passwordHash = await hashPassword(data.password);
    updates.push('password_hash = ?');
    values.push(passwordHash);
  }

  if (updates.length === 0) return existing;

  updates.push('updated_at = ?');
  values.push(now);
  values.push(id);

  const stmt = db.prepare(`
    UPDATE users SET ${updates.join(', ')} WHERE id = ?
  `).bind(...values);

  await stmt.run();

  return getUserById(db, id);
}

/**
 * Deactivate user (soft delete)
 * Note: We don't actually delete users, just mark them inactive
 * For now, this is a placeholder - you could add an 'active' column
 */
export async function deactivateUser(db: D1Database, id: string): Promise<boolean> {
  const now = new Date().toISOString();

  // For now, we'll just return success
  // In a full implementation, you'd add an 'active' column
  const stmt = db.prepare(`
    UPDATE users SET updated_at = ? WHERE id = ?
  `).bind(now, id);

  const result = await stmt.run();
  return result.success;
}

/**
 * List all users (for admin)
 */
export async function listUsers(db: D1Database): Promise<AuthUser[]> {
  const stmt = db.prepare(`
    SELECT id, email, name, role, created_at, updated_at 
    FROM users 
    ORDER BY created_at DESC
  `);

  const results = await stmt.all<AuthUser & { created_at: string; updated_at: string }>();

  return (results.results || []).map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }));
}

/**
 * Check if email exists
 */
export async function emailExists(db: D1Database, email: string): Promise<boolean> {
  const stmt = db.prepare('SELECT 1 FROM users WHERE email = ?').bind(email.toLowerCase().trim());
  const result = await stmt.first();
  return !!result;
}

/**
 * Check if email exists (excluding specific user)
 */
export async function emailExistsExcludingUser(
  db: D1Database,
  email: string,
  excludeId: string
): Promise<boolean> {
  const stmt = db.prepare(
    'SELECT 1 FROM users WHERE email = ? AND id != ?'
  ).bind(email.toLowerCase().trim(), excludeId);
  const result = await stmt.first();
  return !!result;
}
