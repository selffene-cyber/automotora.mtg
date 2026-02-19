// Admin Raffles API
// GET /api/admin/raffles - List all raffles
// POST /api/admin/raffles - Create new raffle

import { NextRequest, NextResponse } from 'next/server';
import { getRaffles, createRaffle, updateRaffleStatus } from '@/lib/db/raffles';
import { getVehicleById } from '@/lib/db/vehicles';
import { canTransitionRaffle, isValidRaffleState } from '@/lib/core/state-machine';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') || undefined;

    const { raffles, total } = await getRaffles(
      { status: status as any },
      page,
      pageSize
    );

    return NextResponse.json({
      raffles,
      total,
      page,
      pageSize
    });
  } catch (error) {
    console.error('[Admin Raffles API] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener las rifas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      vehicle_id, 
      name, 
      description, 
      ticket_price, 
      total_tickets, 
      draw_date,
      activate 
    } = body;

    // Validate required fields
    if (!vehicle_id || !name || !ticket_price || !total_tickets) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: vehicle_id, name, ticket_price, total_tickets' },
        { status: 400 }
      );
    }

    // Validate vehicle exists
    const vehicle = await getVehicleById(vehicle_id);
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 400 }
      );
    }

    // Create raffle
    const raffle = await createRaffle({
      vehicle_id,
      name,
      description,
      ticket_price,
      total_tickets,
      draw_date
    });

    // If activate is true, activate immediately
    if (activate) {
      const canActivate = canTransitionRaffle(raffle.status, 'active');
      if (canActivate) {
        const activated = await updateRaffleStatus(raffle.id, 'active');
        return NextResponse.json({ raffle: activated });
      }
    }

    return NextResponse.json({ raffle }, { status: 201 });
  } catch (error) {
    console.error('[Admin Raffles API] Error creating:', error);
    return NextResponse.json(
      { error: 'Error al crear la rifa' },
      { status: 500 }
    );
  }
}
