-- Raffle Module Migration
-- Version: 0008_add_raffles.sql
-- Description: Creates raffles, raffle_tickets, and raffle_draws tables for the raffle module

-- Raffles table
CREATE TABLE IF NOT EXISTS raffles (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  name TEXT NOT NULL,
  description TEXT,
  ticket_price INTEGER NOT NULL,
  total_tickets INTEGER NOT NULL,
  sold_tickets INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','sold_out','draw_pending','drawn','cancelled','expired')),
  draw_date TEXT,
  winner_id TEXT NULL,
  winning_ticket_id TEXT NULL,
  created_by TEXT NULL REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Raffle tickets table
CREATE TABLE IF NOT EXISTS raffle_tickets (
  id TEXT PRIMARY KEY,
  raffle_id TEXT NOT NULL REFERENCES raffles(id),
  ticket_number INTEGER NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  buyer_phone TEXT NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending','paid','cancelled','refunded')),
  payment_id TEXT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(raffle_id, ticket_number)
);

-- Raffle draws table (audit trail for draws)
CREATE TABLE IF NOT EXISTS raffle_draws (
  id TEXT PRIMARY KEY,
  raffle_id TEXT NOT NULL REFERENCES raffles(id),
  winning_ticket_id TEXT NULL,
  seed TEXT NOT NULL,
  verified INTEGER DEFAULT 0,
  drawn_by TEXT NULL REFERENCES users(id),
  drawn_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for raffles
CREATE INDEX IF NOT EXISTS idx_raffles_vehicle_id ON raffles(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_raffles_status ON raffles(status);
CREATE INDEX IF NOT EXISTS idx_raffles_draw_date ON raffles(draw_date);

-- Indexes for raffle tickets
CREATE INDEX IF NOT EXISTS idx_raffle_tickets_raffle_id ON raffle_tickets(raffle_id);
CREATE INDEX IF NOT EXISTS idx_raffle_tickets_ticket_number ON raffle_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_raffle_tickets_payment_status ON raffle_tickets(payment_status);

-- Indexes for raffle draws
CREATE INDEX IF NOT EXISTS idx_raffle_draws_raffle_id ON raffle_draws(raffle_id);
