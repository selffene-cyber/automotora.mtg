/**
 * Auth Logout API Route
 * POST /api/auth/logout
 */

import { NextResponse } from 'next/server';
import { clearAuthResponse } from '@/lib/auth';

export async function POST() {
  try {
    const authResponse = clearAuthResponse();

    // Create response
    const response = NextResponse.json({
      success: true,
    });

    // Clear cookie
    response.cookies.set(
      authResponse.cookie.name,
      authResponse.cookie.value,
      authResponse.cookie.options
    );

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
