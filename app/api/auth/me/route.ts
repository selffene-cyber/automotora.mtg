/**
 * Auth Me API Route
 * GET /api/auth/me
 * Returns current authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Try to get session
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
