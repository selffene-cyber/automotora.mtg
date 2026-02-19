-- Auction Module Migration
-- Version: 0004_add_auctions.sql
-- Description: Creates auction and bids tables for the auction module

-- Auctions table
CREATE TABLE IF NOT EXISTS auctions (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  starting_price INTEGER NOT NULL,
  min_increment INTEGER DEFAULT 10000,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','active','ended_pending_payment','closed_won','closed_failed','cancelled','expired','ended_no_bids')),
  winner_id TEXT NULL,
  winner_bid_id TEXT NULL,
  payment_expires_at TEXT NULL,
  created_by TEXT NULL REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Bids table
CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL REFERENCES auctions(id),
  user_id TEXT NULL,
  bidder_name TEXT NOT NULL,
  bidder_phone TEXT NOT NULL,
  bidder_email TEXT NULL,
  amount INTEGER NOT NULL,
  is_winner INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for auctions
CREATE INDEX IF NOT EXISTS idx_auctions_vehicle_id ON auctions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions(end_time);

-- Indexes for bids
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON bids(amount DESC);
