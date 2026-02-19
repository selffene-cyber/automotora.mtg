// Admin Auction Detail API Routes
// GET /api/admin/auctions/[id] - Get auction details
// PATCH /api/admin/auctions/[id] - Update auction
// POST /api/admin/auctions/[id] - Perform action (start, cancel, close)

import { NextRequest, NextResponse } from 'next/server';
import { 
  getAuctionById, 
  getBidsByAuctionId, 
  getAuctionStats,
  updateAuction,
  updateAuctionStatus,
  determineWinner
} from '@/lib/db/auctions';
import type { CreateAuctionInput, AuctionAction } from '@/types/auction';

/**
 * GET - Get auction details with all bids
 */
export async function GET(
  request: NextRequest,
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

/**
 * PATCH - Update auction details
 */
export async function PATCH(
  request: NextRequest,
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

    const body = await request.json();
    
    // Fields that can be updated
    const updateData: Partial<CreateAuctionInput> = {};
    
    if (body.starting_price !== undefined) {
      updateData.starting_price = parseInt(body.starting_price);
    }
    if (body.min_increment !== undefined) {
      updateData.min_increment = parseInt(body.min_increment);
    }
    if (body.start_time !== undefined) {
      updateData.start_time = body.start_time;
    }
    if (body.end_time !== undefined) {
      updateData.end_time = body.end_time;
    }

    // Can't update if auction is already active or ended
    if (auction.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Can only update scheduled auctions' },
        { status: 400 }
      );
    }

    const updatedAuction = await updateAuction(id, updateData);

    return NextResponse.json({
      success: true,
      auction: updatedAuction,
    });
  } catch (error: any) {
    console.error('Error updating auction:', error);
    return NextResponse.json(
      { error: error.message || 'Error updating auction' },
      { status: 500 }
    );
  }
}

/**
 * POST - Perform auction actions (start, cancel, close)
 */
export async function POST(
  request: NextRequest,
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

    const body = await request.json();
    const action = body.action as AuctionAction;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action parameter' },
        { status: 400 }
      );
    }

    let updatedAuction;
    const now = new Date();
    
    switch (action) {
      case 'start':
        // Can only start scheduled auctions
        if (auction.status !== 'scheduled') {
          return NextResponse.json(
            { error: 'Can only start scheduled auctions' },
            { status: 400 }
          );
        }
        // Check if start time has arrived
        const startTime = new Date(auction.start_time);
        if (now < startTime) {
          return NextResponse.json(
            { error: 'Auction start time has not arrived yet' },
            { status: 400 }
          );
        }
        updatedAuction = await updateAuctionStatus(id, 'active');
        break;

      case 'cancel':
        // Can cancel scheduled or active auctions
        if (!['scheduled', 'active'].includes(auction.status)) {
          return NextResponse.json(
            { error: 'Can only cancel scheduled or active auctions' },
            { status: 400 }
          );
        }
        updatedAuction = await updateAuctionStatus(id, 'cancelled');
        break;

      case 'close':
        // Determine winner and close auction
        if (auction.status !== 'active') {
          return NextResponse.json(
            { error: 'Can only close active auctions' },
            { status: 400 }
          );
        }
        // Check if end time has passed
        const endTime = new Date(auction.end_time);
        if (now < endTime) {
          return NextResponse.json(
            { error: 'Auction has not ended yet' },
            { status: 400 }
          );
        }
        const result = await determineWinner(id);
        if (result) {
          updatedAuction = result.auction;
        } else {
          updatedAuction = await getAuctionById(id);
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const stats = await getAuctionStats(id);
    const bids = await getBidsByAuctionId(id);

    return NextResponse.json({
      success: true,
      auction: updatedAuction,
      highest_bid: stats.highest_bid,
      bid_count: stats.bid_count,
      bids,
    });
  } catch (error: any) {
    console.error('Error performing auction action:', error);
    return NextResponse.json(
      { error: error.message || 'Error performing auction action' },
      { status: 500 }
    );
  }
}
