// Raffle Detail API
// GET /api/raffles/[id] - Get raffle details
// POST /api/raffles/[id] - Purchase tickets

import { NextRequest, NextResponse } from 'next/server';
import { 
  getRaffleById, 
  getRaffleTickets, 
  getRaffleStats,
  purchaseTicket,
  getAvailableTickets 
} from '@/lib/db/raffles';
import type { PurchaseTicketInput } from '@/types/raffle';

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

    // Get stats
    const stats = await getRaffleStats(id);

    return NextResponse.json({
      raffle,
      tickets_sold: stats.sold,
      tickets_available: stats.available,
      total_tickets: stats.total
    });
  } catch (error) {
    console.error('[Raffle Detail API] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener la rifa' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    // Validate raffle exists
    const raffle = await getRaffleById(id);
    if (!raffle) {
      return NextResponse.json(
        { error: 'Rifa no encontrada' },
        { status: 404 }
      );
    }

    // Parse body
    const body = await request.json();
    const { buyer_name, buyer_email, buyer_phone, quantity } = body;

    // Validate required fields
    if (!buyer_name || !buyer_phone) {
      return NextResponse.json(
        { error: 'Nombre y teléfono son requeridos' },
        { status: 400 }
      );
    }

    // Check availability first
    const available = await getAvailableTickets(id);
    const purchaseQuantity = quantity || 1;
    
    if (available.length < purchaseQuantity) {
      return NextResponse.json(
        { error: `Solo hay ${available.length} tickets disponibles` },
        { status: 400 }
      );
    }

    // Purchase tickets
    const input: PurchaseTicketInput = {
      raffle_id: id,
      buyer_name,
      buyer_email,
      buyer_phone,
      quantity: purchaseQuantity
    };

    const result = await purchaseTicket(id, input);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || 'Error al comprar ticket' },
        { status: 400 }
      );
    }

    // Get updated stats
    const stats = await getRaffleStats(id);

    return NextResponse.json({
      success: true,
      tickets: result.tickets,
      tickets_sold: stats.sold,
      tickets_available: stats.available,
      total_price: raffle.ticket_price * purchaseQuantity
    });
  } catch (error) {
    console.error('[Raffle Purchase API] Error:', error);
    return NextResponse.json(
      { error: 'Error al procesar la compra' },
      { status: 500 }
    );
  }
}
