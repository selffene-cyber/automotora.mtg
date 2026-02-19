// Public Auction API Routes
// GET /api/auctions - List active auctions (public)

import { NextResponse } from 'next/server';
import { getAuctions, getAuctionStats } from '@/lib/db/auctions';

// Enable Edge runtime for Cloudflare Pages D1 bindings
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    
    // Only show active auctions to public
    const { auctions, total } = await getAuctions(
      { status: 'active' },
      page,
      pageSize
    );

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
