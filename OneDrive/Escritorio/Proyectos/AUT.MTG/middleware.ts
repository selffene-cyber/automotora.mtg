/**
 * MTG Platform Middleware
 * Protects admin routes and handles authentication
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'mtg_session';

// Routes that require admin authentication
const ADMIN_ROUTES = ['/admin'];
const ADMIN_API_ROUTES = ['/api/admin'];

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/admin/login',
  '/admin/login/',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/vehicles',
  '/api/leads',
  '/api/reservations',
];

/**
 * Decode session token (simple base64 JSON)
 */
function decodeSessionToken(token: string): {
  userId: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
} | null {
  try {
    const decoded = atob(token);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Check if route requires admin authentication
 */
function isAdminRoute(pathname: string): boolean {
  // Check exact matches first
  if (ADMIN_ROUTES.includes(pathname)) return true;

  // Check if pathname starts with any admin route
  for (const route of ADMIN_ROUTES) {
    if (pathname.startsWith(route)) return true;
  }

  return false;
}

/**
 * Check if API route requires admin authentication
 */
function isAdminApiRoute(pathname: string): boolean {
  for (const route of ADMIN_API_ROUTES) {
    if (pathname.startsWith(route)) return true;
  }
  return false;
}

/**
 * Check if route is public (no auth required)
 */
function isPublicRoute(pathname: string): boolean {
  // Check exact matches
  if (PUBLIC_ROUTES.includes(pathname)) return true;

  // Check for public API patterns
  if (pathname.startsWith('/api/vehicles')) return true;
  if (pathname.startsWith('/api/leads')) return true;
  if (pathname.startsWith('/api/reservations')) return true;

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for non-admin routes
  if (!isAdminRoute(pathname) && !isAdminApiRoute(pathname)) {
    return NextResponse.next();
  }

  // Skip if already public route
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Get session cookie
  const sessionCookie = request.cookies.get(COOKIE_NAME);

  if (!sessionCookie?.value) {
    // No session - redirect to login or return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Decode and verify token
  const payload = decodeSessionToken(sessionCookie.value);

  if (!payload) {
    // Invalid token - clear cookie and redirect
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
      response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
      return response;
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    // Token expired - clear cookie and redirect
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json(
        { success: false, error: 'Token expired' },
        { status: 401 }
      );
      response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
      return response;
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Check role for admin routes
  if (isAdminRoute(pathname) || isAdminApiRoute(pathname)) {
    if (payload.role !== 'admin') {
      // Not admin - redirect or return 403
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, error: 'Forbidden - Admin access required' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Add user info to headers for API routes
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.userId);
    response.headers.set('x-user-email', payload.email);
    response.headers.set('x-user-role', payload.role);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};
