/**
 * Admin Users API Route
 * GET /api/admin/users - List all users (admin only)
 * POST /api/admin/users - Create new user (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import type { D1Database } from '@cloudflare/workers-types';
import { getSession, requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db/vehicles';
import {
  listUsers,
  createUser,
  emailExists,
  getUserByIdPublic,
} from '@/lib/db/users';
import type { CreateUserInput } from '@/types/user';
import { isAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if admin
    if (!isAdmin(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get D1 database binding
    const db = getDb();

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    // List users
    const users = await listUsers(db);

    return NextResponse.json({
      success: true,
      users,
      total: users.length,
    });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if admin
    if (!isAdmin(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get D1 database binding
    const db = getDb();

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    const body: CreateUserInput = await request.json();

    // Validate required fields
    if (!body.email || !body.password || !body.role) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['admin', 'sales', 'ops'];
    if (!validRoles.includes(body.role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const exists = await emailExists(db, body.email);
    if (exists) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 409 }
      );
    }

    // Create user
    const newUser = await createUser(db, body);

    // Return user without password hash
    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
