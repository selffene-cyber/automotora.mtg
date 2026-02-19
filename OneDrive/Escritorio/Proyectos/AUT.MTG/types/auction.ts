// Auction Types for MTG Automotora
// Defines interfaces and types for the auction module

import type { Vehicle } from './vehicle';
import type { User } from './user';

// Auction Status
export type AuctionStatus = 
  | 'scheduled'      // Auction is scheduled to start
  | 'active'         // Auction is currently live
  | 'ended_pending_payment' // Auction ended, winner must pay
  | 'closed_won'     // Winner completed payment
  | 'closed_failed'  // Winner failed to pay
  | 'cancelled'      // Auction was cancelled
  | 'expired'        // Auction expired without winner
  | 'ended_no_bids'; // Auction ended with no bids

// Auction Interface
export interface Auction {
  id: string;
  vehicle_id: string;
  starting_price: number;
  min_increment: number;
  start_time: string;
  end_time: string;
  status: AuctionStatus;
  winner_id: string | null;
  winner_bid_id: string | null;
  payment_expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  vehicle?: Vehicle | null;
  winner?: User | null;
  winner_bid?: Bid | null;
}

// Bid Interface
export interface Bid {
  id: string;
  auction_id: string;
  user_id: string | null;
  bidder_name: string;
  bidder_phone: string;
  bidder_email: string | null;
  amount: number;
  is_winner: number; // 0 or 1
  created_at: string;
  // Joined fields
  user?: User;
}

// Create Auction Input
export interface CreateAuctionInput {
  vehicle_id: string;
  starting_price: number;
  min_increment?: number;
  start_time: string;
  end_time: string;
  created_by?: string;
}

// Update Auction Input
export interface UpdateAuctionInput {
  starting_price?: number;
  min_increment?: number;
  start_time?: string;
  end_time?: string;
}

// Create Bid Input
export interface CreateBidInput {
  auction_id: string;
  user_id?: string;
  bidder_name: string;
  bidder_phone: string;
  bidder_email?: string;
  amount: number;
}

// Auction Action Types (for admin operations)
export type AuctionAction = 
  | 'start'      // Start the auction (scheduled -> active)
  | 'cancel'     // Cancel the auction
  | 'close'      // Close and determine winner
  | 'extend';    // Extend the auction end time

// Auction Filters (for queries)
export interface AuctionFilters {
  status?: AuctionStatus;
  vehicle_id?: string;
  from_date?: string;
  to_date?: string;
  min_price?: number;
  max_price?: number;
}

// Auction with latest bid (for public display)
export interface AuctionWithBids extends Auction {
  highest_bid: number | null;
  bid_count: number;
  latest_bid?: Bid;
}

// API Response Types
export interface AuctionListResponse {
  auctions: AuctionWithBids[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuctionDetailResponse {
  auction: Auction;
  bids: Bid[];
  highest_bid: number | null;
  bid_count: number;
}
