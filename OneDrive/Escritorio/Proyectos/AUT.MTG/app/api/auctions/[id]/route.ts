// Auction Detail API Routes - Hardened Version
// GET /api/auctions/[id] - Get auction details with bids
// POST /api/auctions/[id] - Place a bid (with rate limiting and atomic operations)

import { NextResponse } from 'next/server';
import { 
  getAuctionById, 
  getBidsByAuctionId, 
  getAuctionStats, 
  atomicPlaceBid 
} from '@/lib/db/auctions';
import { checkBidRateLimit } from '@/lib/core/rate-limit';
import type { CreateBidInput } from '@/types/auction';

/**
 * Extrae la IP del cliente de la request
 */
function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const auction = await getAuctionById(id);
    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

    const bids = await getBidsByAuctionId(id);
    const stats = await getAuctionStats(id);

    return NextResponse.json({
      auction,
      bids,
      highest_bid: stats.highest_bid,
      bid_count: stats.bid_count,
    });
  } catch (error) {
    console.error('Error fetching auction:', error);
    return NextResponse.json(
      { error: 'Error fetching auction' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const clientIP = getClientIP(request);
    
    // Verificar que la subasta existe (sin colocar la puja todavía)
    const auction = await getAuctionById(id);
    if (!auction) {
      return NextResponse.json(
        { 
          error: 'Auction not found',
          error_code: 'auction_not_found'
        },
        { status: 404 }
      );
    }

    // Parsear datos de la puja
    const body = await request.json();
    
    // Validar campos requeridos
    if (!body.bidder_name || !body.bidder_phone || !body.amount) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: bidder_name, bidder_phone, amount',
          error_code: 'missing_fields'
        },
        { status: 400 }
      );
    }

    // Validar monto
    const bidAmount = parseInt(body.amount);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      return NextResponse.json(
        { 
          error: 'Invalid bid amount',
          error_code: 'invalid_amount'
        },
        { status: 400 }
      );
    }

    // Preparar datos de la puja
    const bidData: CreateBidInput = {
      auction_id: id,
      user_id: body.user_id || null,
      bidder_name: body.bidder_name,
      bidder_phone: body.bidder_phone,
      bidder_email: body.bidder_email || null,
      amount: bidAmount,
    };

    // Verificar rate limiting (IP + usuario + subasta)
    const rateLimitResult = await checkBidRateLimit(
      clientIP,
      body.user_id || null,
      id
    );

    if (!rateLimitResult.allowed) {
      console.warn(`[Bid API] Rate limit exceeded for IP: ${clientIP}, reasons: ${rateLimitResult.reasons.join(', ')}`);
      
      return NextResponse.json(
        {
          error: 'Has excedido el límite de pujas. Por favor, espera un momento.',
          error_code: 'rate_limited',
          reasons: rateLimitResult.reasons,
          retry_after: rateLimitResult.results[0]?.resetAt
        },
        { status: 429 }
      );
    }

    // Ejecutar puja atómica (incluye todas las validaciones y anti-sniping)
    const result = await atomicPlaceBid(bidData, rateLimitResult.results[0]);

    if (!result.success) {
      // Devolver error según el código
      const statusMap: Record<string, number> = {
        'auction_not_found': 404,
        'auction_not_active': 400,
        'ended': 400,
        'invalid_amount': 400,
        'rate_limited': 429,
        'internal_error': 500
      };

      const status = statusMap[result.error_code || 'internal_error'] || 400;

      return NextResponse.json(
        {
          error: result.error_message || 'Error al procesar puja',
          error_code: result.error_code,
          success: false
        },
        { status }
      );
    }

    // Obtener datos actualizados
    const updatedAuction = await getAuctionById(id);
    const bids = await getBidsByAuctionId(id);
    const stats = await getAuctionStats(id);

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      bid: result.bid,
      auction: updatedAuction,
      bids,
      highest_bid: stats.highest_bid,
      bid_count: stats.bid_count,
      anti_sniping: result.anti_sniping
    });

  } catch (error: any) {
    console.error('Error placing bid:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        error_code: 'internal_error'
      },
      { status: 500 }
    );
  }
}
