// Admin Raffle Tickets API
// GET /api/admin/raffles/[id]/tickets - Get all tickets for a raffle

import { NextRequest, NextResponse } from 'next/server';
import { getRaffleTickets, getRaffleById, getRaffleStats } from '@/lib/db/raffles';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const paymentStatus = searchParams.get('payment_status') || undefined;

    // Check raffle exists
    const raffle = await getRaffleById(id);
    if (!raffle) {
      return NextResponse.json(
        { error: 'Rifa no encontrada' },
        { status: 404 }
      );
    }

    // Get all tickets
    let tickets = await getRaffleTickets(id);

    // Filter by payment status if specified
    if (paymentStatus) {
      tickets = tickets.filter(t => t.payment_status === paymentStatus);
    }

    // Get stats
    const stats = await getRaffleStats(id);

    return NextResponse.json({
      tickets,
      stats,
      raffle: {
        id: raffle.id,
        name: raffle.name,
        ticket_price: raffle.ticket_price
      }
    });
  } catch (error) {
    console.error('[Admin Raffle Tickets API] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener los tickets' },
      { status: 500 }
    );
  }
}
