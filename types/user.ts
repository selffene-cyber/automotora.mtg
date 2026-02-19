/**
 * User Types for MTG Platform
 * Defines user roles, authentication types, and related interfaces
 */

export type UserRole = 'admin' | 'sales' | 'ops';

/**
 * User entity from database
 * Contains all user fields including password_hash
 */
export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/**
 * Public user info (excludes sensitive data)
 * Used for API responses
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

/**
 * Login credentials input
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Input for creating a new user
 */
export interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
  role: UserRole;
}

/**
 * Input for updating a user
 */
export interface UpdateUserInput {
  email?: string;
  password?: string;
  name?: string;
  role?: UserRole;
}

/**
 * JWT Token payload
 */
export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
  iat: number;
}

/**
 * Session data stored in cookie
 */
export interface SessionData {
  token: string;
  user: AuthUser;
}

/**
 * API Response types
 */
export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export interface UsersListResponse {
  success: boolean;
  users: AuthUser[];
  total?: number;
}
