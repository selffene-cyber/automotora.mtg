// Admin Auction API Routes
// GET /api/admin/auctions - List all auctions (admin)
// POST /api/admin/auctions - Create auction

import { NextRequest, NextResponse } from 'next/server';
import { getAuctions, createAuction, getAuctionStats } from '@/lib/db/auctions';
import type { CreateAuctionInput, AuctionFilters } from '@/types/auction';

/**
 * GET - List all auctions for admin (all statuses)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    
    // Build filters from query params
    const filters: AuctionFilters = {};
    
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status') as any;
    }
    if (searchParams.get('vehicle_id')) {
      filters.vehicle_id = searchParams.get('vehicle_id')!;
    }
    if (searchParams.get('from_date')) {
      filters.from_date = searchParams.get('from_date')!;
    }
    if (searchParams.get('to_date')) {
      filters.to_date = searchParams.get('to_date')!;
    }
    if (searchParams.get('min_price')) {
      filters.min_price = parseInt(searchParams.get('min_price')!);
    }
    if (searchParams.get('max_price')) {
      filters.max_price = parseInt(searchParams.get('max_price')!);
    }

    const { auctions, total } = await getAuctions(filters, page, pageSize);

    // Enrich with bid stats
    const auctionsWithStats = await Promise.all(
      auctions.map(async (auction) => {
        const stats = await getAuctionStats(auction.id);
        return {
          ...auction,
          highest_bid: stats.highest_bid,
          bid_count: stats.bid_count,
        };
      })
    );

    return NextResponse.json({
      auctions: auctionsWithStats,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Error fetching auctions:', error);
    return NextResponse.json(
      { error: 'Error fetching auctions' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new auction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get user from cookie header (set by middleware)
    const cookieHeader = request.headers.get('cookie');
    let createdBy: string | undefined;
    if (cookieHeader) {
      const match = cookieHeader.match(/mtg_session=([^;]+)/);
      if (match) {
        try {
          const session = JSON.parse(atob(match[1]));
          createdBy = session.userId;
        } catch (e) {
          // Invalid session
        }
      }
    }
    
    // Validate required fields
    const requiredFields = ['vehicle_id', 'starting_price', 'start_time', 'end_time'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate dates
    const startTime = new Date(body.start_time);
    const endTime = new Date(body.end_time);
    
    if (startTime >= endTime) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    const auctionData: CreateAuctionInput = {
      vehicle_id: body.vehicle_id,
      starting_price: parseInt(body.starting_price),
      min_increment: body.min_increment ? parseInt(body.min_increment) : 10000,
      start_time: body.start_time,
      end_time: body.end_time,
      created_by: createdBy,
    };

    const auction = await createAuction(auctionData);

    return NextResponse.json({
      success: true,
      auction,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating auction:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating auction' },
      { status: 500 }
    );
  }
}
