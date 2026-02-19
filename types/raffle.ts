// Raffle Types for MTG Automotora
// Defines interfaces and types for the raffle module

import type { Vehicle } from './vehicle';
import type { User } from './user';

// Raffle Status
export type RaffleStatus = 
  | 'draft'         // Raffle is being prepared
  | 'active'        // Raffle is active for ticket purchases
  | 'sold_out'      // All tickets sold
  | 'draw_pending'  // Ready for draw, waiting for admin to trigger
  | 'drawn'         // Winner has been drawn
  | 'cancelled'     // Raffle was cancelled
  | 'expired';      // Raffle expired without winner

// Raffle Interface
export interface Raffle {
  id: string;
  vehicle_id: string;
  name: string;
  description: string | null;
  ticket_price: number;
  total_tickets: number;
  sold_tickets: number;
  status: RaffleStatus;
  draw_date: string | null;
  winner_id: string | null;
  winning_ticket_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  vehicle?: Vehicle;
  winner?: User;
}

// Raffle Ticket Interface
export interface RaffleTicket {
  id: string;
  raffle_id: string;
  ticket_number: number;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string;
  payment_status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  payment_id: string | null;
  created_at: string;
  // Joined fields
  raffle?: Raffle;
}

// Raffle Draw Interface
export interface RaffleDraw {
  id: string;
  raffle_id: string;
  winning_ticket_id: string | null;
  seed: string;
  verified: number; // 0 or 1
  drawn_by: string | null;
  drawn_at: string;
  // Joined fields
  raffle?: Raffle;
  winning_ticket?: RaffleTicket;
}

// Create Raffle Input
export interface CreateRaffleInput {
  vehicle_id: string;
  name: string;
  description?: string;
  ticket_price: number;
  total_tickets: number;
  draw_date?: string;
  created_by?: string;
}

// Update Raffle Input
export interface UpdateRaffleInput {
  name?: string;
  description?: string;
  ticket_price?: number;
  total_tickets?: number;
  draw_date?: string;
}

// Purchase Ticket Input
export interface PurchaseTicketInput {
  raffle_id: string;
  buyer_name: string;
  buyer_email?: string;
  buyer_phone: string;
  quantity?: number; // Number of tickets to purchase
}

// Raffle Action Types (for admin operations)
export type RaffleAction = 
  | 'activate'      // Activate the raffle (draft -> active)
  | 'cancel'       // Cancel the raffle
  | 'trigger_draw' // Trigger the draw (active/sold_out -> draw_pending -> drawn)
  | 'close';       // Close the raffle after draw

// Raffle Filters (for queries)
export interface RaffleFilters {
  status?: RaffleStatus;
  vehicle_id?: string;
  from_date?: string;
  to_date?: string;
  min_price?: number;
  max_price?: number;
}

// Raffle with ticket info (for public display)
export interface RaffleWithTickets extends Raffle {
  tickets_sold: number;
  tickets_available: number;
}

// API Response Types
export interface RaffleListResponse {
  raffles: RaffleWithTickets[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RaffleDetailResponse {
  raffle: Raffle;
  tickets: RaffleTicket[];
  tickets_sold: number;
  tickets_available: number;
}

export interface TicketPurchaseResponse {
  success: boolean;
  tickets: RaffleTicket[];
  message?: string;
}
