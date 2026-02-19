// Public Raffles API
// GET /api/raffles - List active raffles

import { NextRequest, NextResponse } from 'next/server';
import { getActiveRaffles, getRaffleById } from '@/lib/db/raffles';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Get active raffles for public display
    const { raffles, total } = await getActiveRaffles(page, pageSize);

    // Transform to include stats
    const rafflesWithStats = raffles.map(raffle => ({
      ...raffle,
      tickets_sold: raffle.sold_tickets,
      tickets_available: raffle.total_tickets - raffle.sold_tickets
    }));

    return NextResponse.json({
      raffles: rafflesWithStats,
      total,
      page,
      pageSize
    });
  } catch (error) {
    console.error('[Raffles API] Error fetching raffles:', error);
    return NextResponse.json(
      { error: 'Error al obtener las rifas' },
      { status: 500 }
    );
  }
}
