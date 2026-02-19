/**
 * Auth Login API Route
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import type { D1Database } from '@cloudflare/workers-types';
import { getDb } from '@/lib/db/vehicles';
import { getUserByEmail } from '@/lib/db/users';
import { verifyPassword, createAuthResponse } from '@/lib/auth';
import type { LoginCredentials } from '@/types/user';

// Enable Edge runtime for Cloudflare Pages D1 bindings
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get D1 database binding
    const db = getDb();

    // Parse request body
    const body: LoginCredentials = await request.json();

    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user by email
    const user = await getUserByEmail(db, body.email.toLowerCase().trim());

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(body.password, user.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create auth response with cookie
    const authResponse = await createAuthResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      user: authResponse.user,
    });

    // Set cookie
    response.cookies.set(
      authResponse.cookie.name,
      authResponse.cookie.value,
      authResponse.cookie.options
    );

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
