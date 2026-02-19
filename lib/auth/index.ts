/**
 * Auth Utilities for MTG Platform
 * Password hashing, JWT token management, session handling
 */

import { cookies } from 'next/headers';
import type { AuthUser, TokenPayload, UserRole } from '@/types/user';

// Environment variables
const AUTH_SECRET = process.env.AUTH_SECRET || 'mtg-secret-key-change-in-production';
const COOKIE_NAME = 'mtg_session';

// Token expiration (7 days)
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000;

/**
 * Simple hash function for passwords
 * Uses Web Crypto API - SHA-256 with salt
 * Note: For production, consider using bcrypt via serverless-compatible approach
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${salt}:${hashHex}`;
}

/**
 * Verify password against stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;

    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return hash === hashHex;
  } catch {
    return false;
  }
}

/**
 * Create JWT token for user
 */
export function createToken(user: AuthUser): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: now + Math.floor(TOKEN_EXPIRY / 1000),
    iat: now,
  };

  // Simple base64 encoding (not full JWT for simplicity)
  // For production, use proper JWT library
  const encoded = btoa(JSON.stringify(payload));
  return encoded;
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = atob(token);
    const payload: TokenPayload = JSON.parse(decoded);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Create session cookie value
 */
export function createSessionToken(user: AuthUser): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + Math.floor(TOKEN_EXPIRY / 1000),
    iat: Math.floor(Date.now() / 1000),
  };

  return btoa(JSON.stringify(payload));
}

/**
 * Decode session token
 */
export function decodeSessionToken(token: string): TokenPayload | null {
  try {
    const decoded = atob(token);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Get session from request cookie
 */
export async function getSession(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    const payload = decodeSessionToken(sessionCookie.value);

    if (!payload) {
      return null;
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    return {
      id: payload.userId,
      email: payload.email,
      name: null, // Name not stored in token for performance
      role: payload.role,
    };
  } catch {
    return null;
  }
}

/**
 * Require authentication - returns user or throws error
 */
export async function requireAuth(roles?: UserRole[]): Promise<AuthUser> {
  const user = await getSession();

  if (!user) {
    throw new Error('Unauthorized');
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    throw new Error('Forbidden');
  }

  return user;
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  if (requiredRoles.length === 0) return true;
  return requiredRoles.includes(userRole);
}

/**
 * Check if user is admin
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

/**
 * Get session cookie options
 */
export function getCookieOptions() {
  return {
    name: COOKIE_NAME,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: TOKEN_EXPIRY / 1000,
    },
  };
}

/**
 * Create authenticated response with cookie
 */
export async function createAuthResponse(user: AuthUser) {
  const token = createSessionToken(user);

  return {
    success: true,
    user,
    cookie: {
      name: COOKIE_NAME,
      value: token,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: TOKEN_EXPIRY / 1000,
      },
    },
  };
}

/**
 * Clear auth response (logout)
 */
export function clearAuthResponse() {
  return {
    success: true,
    cookie: {
      name: COOKIE_NAME,
      value: '',
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 0,
      },
    },
  };
}

export { COOKIE_NAME, TOKEN_EXPIRY };
