// Admin Raffle Detail API
// GET /api/admin/raffles/[id] - Get raffle details
// PUT /api/admin/raffles/[id] - Update raffle
// POST /api/admin/raffles/[id]/draw - Draw winner

import { NextRequest, NextResponse } from 'next/server';
import { 
  getRaffleById, 
  updateRaffle, 
  updateRaffleStatus,
  drawWinner,
  getRaffleDraws,
  getRaffleStats
} from '@/lib/db/raffles';
import { canTransitionRaffle, isValidRaffleState } from '@/lib/core/state-machine';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const raffle = await getRaffleById(id);

    if (!raffle) {
      return NextResponse.json(
        { error: 'Rifa no encontrada' },
        { status: 404 }
      );
    }

    // Get stats and draws
    const stats = await getRaffleStats(id);
    const draws = await getRaffleDraws(id);

    return NextResponse.json({
      raffle,
      stats,
      draws
    });
  } catch (error) {
    console.error('[Admin Raffle Detail API] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener la rifa' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    const raffle = await getRaffleById(id);
    if (!raffle) {
      return NextResponse.json(
        { error: 'Rifa no encontrada' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, ticket_price, total_tickets, draw_date } = body;

    // Update raffle
    const updated = await updateRaffle(id, {
      name,
      description,
      ticket_price,
      total_tickets,
      draw_date
    });

    return NextResponse.json({ raffle: updated });
  } catch (error) {
    console.error('[Admin Raffle Detail API] Error updating:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la rifa' },
      { status: 500 }
    );
  }
}

// Action routes
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    const raffle = await getRaffleById(id);
    if (!raffle) {
      return NextResponse.json(
        { error: 'Rifa no encontrada' },
        { status: 404 }
      );
    }

    // Handle different actions
    switch (action) {
      case 'activate':
        if (!canTransitionRaffle(raffle.status, 'active')) {
          return NextResponse.json(
            { error: 'No se puede activar la rifa en su estado actual' },
            { status: 400 }
          );
        }
        const activated = await updateRaffleStatus(id, 'active');
        return NextResponse.json({ raffle: activated });

      case 'cancel':
        if (!canTransitionRaffle(raffle.status, 'cancelled')) {
          return NextResponse.json(
            { error: 'No se puede cancelar la rifa en su estado actual' },
            { status: 400 }
          );
        }
        const cancelled = await updateRaffleStatus(id, 'cancelled');
        return NextResponse.json({ raffle: cancelled });

      case 'draw':
        // Draw winner
        const drawResult = await drawWinner(id);
        if (!drawResult.success) {
          return NextResponse.json(
            { error: drawResult.message || 'Error al realizar el sorteo' },
            { status: 400 }
          );
        }
        return NextResponse.json({
          raffle: drawResult.raffle,
          draw: drawResult.draw
        });

      default:
        return NextResponse.json(
          { error: 'Acción no válida. Use: activate, cancel, draw' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Admin Raffle Action API] Error:', error);
    return NextResponse.json(
      { error: 'Error al procesar la acción' },
      { status: 500 }
    );
  }
}
