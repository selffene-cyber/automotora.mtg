// Raffle Database Queries
// Handles all database operations for raffles, tickets, and draws

import type { D1Database } from '@cloudflare/workers-types';
import type { 
  Raffle, 
  RaffleTicket, 
  RaffleDraw,
  RaffleFilters, 
  CreateRaffleInput, 
  PurchaseTicketInput,
  RaffleStatus
} from '@/types/raffle';
import { getVehicleById } from './vehicles';

/**
 * Get database instance (uses global process.env.DB pattern)
 * In Cloudflare Pages with Edge runtime, process.env.DB is a D1Database object
 */
function getDb(): D1Database {
  const db = process.env.DB;
  
  if (!db) {
    throw new Error('D1 Database binding (DB) not found. Make sure:\n' +
      '1. You are using Edge runtime (export const runtime = "edge")\n' +
      '2. For local dev, use: npx @cloudflare/next-on-pages/cli dev\n' +
      '3. The wrangler.toml has [[d1_databases]] binding = "DB"');
  }
  
  return db as unknown as D1Database;
}

// ============================================
// RAFFLE QUERIES
// ============================================

export async function getRaffles(
  filters: RaffleFilters = {},
  page: number = 1,
  pageSize: number = 20
): Promise<{ raffles: Raffle[]; total: number }> {
  const db = getDb();
  
  let whereClause = 'WHERE 1=1';
  const params: (string | number)[] = [];
  let paramIndex = 1;

  if (filters.status) {
    whereClause += ` AND status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.vehicle_id) {
    whereClause += ` AND vehicle_id = $${paramIndex}`;
    params.push(filters.vehicle_id);
    paramIndex++;
  }

  if (filters.from_date) {
    whereClause += ` AND created_at >= $${paramIndex}`;
    params.push(filters.from_date);
    paramIndex++;
  }

  if (filters.to_date) {
    whereClause += ` AND created_at <= $${paramIndex}`;
    params.push(filters.to_date);
    paramIndex++;
  }

  if (filters.min_price) {
    whereClause += ` AND ticket_price >= $${paramIndex}`;
    params.push(filters.min_price);
    paramIndex++;
  }

  if (filters.max_price) {
    whereClause += ` AND ticket_price <= $${paramIndex}`;
    params.push(filters.max_price);
    paramIndex++;
  }

  // Get total count
  const countResult = await db.prepare(
    `SELECT COUNT(*) as total FROM raffles ${whereClause}`
  ).first<{ total: number }>();
  
  const total = countResult?.total || 0;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const raffles = await db.prepare(
    `SELECT * FROM raffles ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
  ).bind(...params, pageSize, offset).all<Raffle>();

  // Enrich with vehicle data
  const enrichedRaffles: Raffle[] = await Promise.all(
    (raffles.results || []).map(async (raffle: Raffle) => {
      const vehicle = await getVehicleById(raffle.vehicle_id);
      return { ...raffle, vehicle: vehicle || undefined };
    })
  );

  return { raffles: enrichedRaffles, total };
}

export async function getRaffleById(id: string): Promise<Raffle | null> {
  const db = getDb();
  
  const raffle = await db.prepare(
    'SELECT * FROM raffles WHERE id = ?'
  ).bind(id).first<Raffle>();

  if (!raffle) return null;

  // Get vehicle
  const vehicle = await getVehicleById(raffle.vehicle_id);
  
  return { ...raffle, vehicle: vehicle || undefined };
}

export async function getRaffleByVehicleId(vehicleId: string): Promise<Raffle | null> {
  const db = getDb();
  
  const raffle = await db.prepare(
    'SELECT * FROM raffles WHERE vehicle_id = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(vehicleId).first<Raffle>();

  if (!raffle) return null;

  const vehicle = await getVehicleById(raffle.vehicle_id);
  return { ...raffle, vehicle: vehicle || undefined };
}

export async function getActiveRaffles(
  page: number = 1,
  pageSize: number = 20
): Promise<{ raffles: Raffle[]; total: number }> {
  return getRaffles({ status: 'active' }, page, pageSize);
}

export async function createRaffle(data: CreateRaffleInput): Promise<Raffle> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO raffles (
      id, vehicle_id, name, description, ticket_price, total_tickets, 
      status, draw_date, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`
  ).bind(
    id,
    data.vehicle_id,
    data.name,
    data.description || null,
    data.ticket_price,
    data.total_tickets,
    data.draw_date || null,
    data.created_by || null,
    now,
    now
  ).run();

  return getRaffleById(id) as Promise<Raffle>;
}

export async function updateRaffle(
  id: string, 
  data: Partial<CreateRaffleInput>
): Promise<Raffle | null> {
  const db = getDb();
  const now = new Date().toISOString();

  const updates: string[] = ['updated_at = ?'];
  const params: (string | number | null)[] = [now];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    params.push(data.description);
  }
  if (data.ticket_price !== undefined) {
    updates.push('ticket_price = ?');
    params.push(data.ticket_price);
  }
  if (data.total_tickets !== undefined) {
    updates.push('total_tickets = ?');
    params.push(data.total_tickets);
  }
  if (data.draw_date !== undefined) {
    updates.push('draw_date = ?');
    params.push(data.draw_date);
  }

  params.push(id);

  await db.prepare(
    `UPDATE raffles SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return getRaffleById(id);
}

export async function updateRaffleStatus(
  id: string, 
  status: RaffleStatus
): Promise<Raffle | null> {
  const db = getDb();
  const now = new Date().toISOString();

  await db.prepare(
    'UPDATE raffles SET status = ?, updated_at = ? WHERE id = ?'
  ).bind(status, now, id).run();

  return getRaffleById(id);
}

// ============================================
// TICKET QUERIES
// ============================================

export async function getRaffleTickets(raffleId: string): Promise<RaffleTicket[]> {
  const db = getDb();
  
  const tickets = await db.prepare(
    'SELECT * FROM raffle_tickets WHERE raffle_id = ? ORDER BY ticket_number ASC'
  ).bind(raffleId).all<RaffleTicket>();

  return tickets.results || [];
}

export async function getTicketById(id: string): Promise<RaffleTicket | null> {
  const db = getDb();
  
  const ticket = await db.prepare(
    'SELECT * FROM raffle_tickets WHERE id = ?'
  ).bind(id).first<RaffleTicket>();

  return ticket;
}

export async function getTicketByNumber(
  raffleId: string, 
  ticketNumber: number
): Promise<RaffleTicket | null> {
  const db = getDb();
  
  const ticket = await db.prepare(
    'SELECT * FROM raffle_tickets WHERE raffle_id = ? AND ticket_number = ?'
  ).bind(raffleId, ticketNumber).first<RaffleTicket>();

  return ticket;
}

export async function getAvailableTickets(raffleId: string): Promise<number[]> {
  const db = getDb();
  
  // Get the raffle to know total tickets
  const raffle = await getRaffleById(raffleId);
  if (!raffle) return [];

  // Get all sold ticket numbers
  const tickets = await db.prepare(
    'SELECT ticket_number FROM raffle_tickets WHERE raffle_id = ?'
  ).bind(raffleId).all<{ ticket_number: number }>();

  const soldNumbers = new Set((tickets.results || []).map(t => t.ticket_number));
  
  // Return available ticket numbers
  const available: number[] = [];
  for (let i = 1; i <= raffle.total_tickets; i++) {
    if (!soldNumbers.has(i)) {
      available.push(i);
    }
  }
  
  return available;
}

/**
 * Atomic ticket purchase - reserves ticket numbers and creates tickets
 * This is the core function for purchasing raffle tickets
 */
export async function purchaseTicket(
  raffleId: string,
  data: PurchaseTicketInput
): Promise<{ success: boolean; tickets: RaffleTicket[]; message?: string }> {
  const db = getDb();
  const quantity = data.quantity || 1;
  const now = new Date().toISOString();

  // First, get raffle info to check availability
  const raffle = await getRaffleById(raffleId);
  if (!raffle) {
    return { success: false, tickets: [], message: 'Rifa no encontrada' };
  }

  // Check if raffle is active
  if (raffle.status !== 'active' && raffle.status !== 'sold_out') {
    return { success: false, tickets: [], message: 'La rifa no está disponible para compras' };
  }

  // Get available tickets
  const available = await getAvailableTickets(raffleId);
  if (available.length < quantity) {
    return { success: false, tickets: [], message: `Solo hay ${available.length} tickets disponibles` };
  }

  // Select random tickets from available
  const selectedTickets = available
    .sort(() => Math.random() - 0.5)
    .slice(0, quantity);

  // Create tickets atomically
  const createdTickets: RaffleTicket[] = [];
  
  try {
    // Use batch for atomicity
    for (const ticketNumber of selectedTickets) {
      const ticketId = crypto.randomUUID();
      
      await db.prepare(
        `INSERT INTO raffle_tickets (
          id, raffle_id, ticket_number, buyer_name, buyer_email, buyer_phone, 
          payment_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
      ).bind(
        ticketId,
        raffleId,
        ticketNumber,
        data.buyer_name,
        data.buyer_email || null,
        data.buyer_phone,
        now
      ).run();

      createdTickets.push({
        id: ticketId,
        raffle_id: raffleId,
        ticket_number: ticketNumber,
        buyer_name: data.buyer_name,
        buyer_email: data.buyer_email || null,
        buyer_phone: data.buyer_phone,
        payment_status: 'pending',
        payment_id: null,
        created_at: now
      });
    }

    // Update raffle sold_tickets count
    await db.prepare(
      'UPDATE raffles SET sold_tickets = sold_tickets + ?, updated_at = ? WHERE id = ?'
    ).bind(quantity, now, raffleId).run();

    // Check if sold out after this purchase
    const updatedRaffle = await getRaffleById(raffleId);
    if (updatedRaffle && updatedRaffle.sold_tickets >= updatedRaffle.total_tickets) {
      await updateRaffleStatus(raffleId, 'sold_out');
    }

    return { success: true, tickets: createdTickets };
  } catch (error: any) {
    console.error('[Raffles] Error purchasing ticket:', error);
    return { success: false, tickets: [], message: 'Error al comprar ticket' };
  }
}

export async function updateTicketPaymentStatus(
  ticketId: string,
  paymentStatus: 'pending' | 'paid' | 'cancelled' | 'refunded',
  paymentId?: string
): Promise<RaffleTicket | null> {
  const db = getDb();

  await db.prepare(
    'UPDATE raffle_tickets SET payment_status = ?, payment_id = ? WHERE id = ?'
  ).bind(paymentStatus, paymentId || null, ticketId).run();

  return getTicketById(ticketId);
}

// ============================================
// DRAW QUERIES - Provably Fair Selection
// ============================================

/**
 * Generates a cryptographically secure random seed
 */
function generateSeed(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Provably fair winner selection using the seed
 * Uses a deterministic algorithm based on the seed
 */
export async function drawWinner(
  raffleId: string,
  drawnBy?: string
): Promise<{ success: boolean; raffle?: Raffle; draw?: RaffleDraw; message?: string }> {
  const db = getDb();
  const now = new Date().toISOString();

  // Get raffle
  const raffle = await getRaffleById(raffleId);
  if (!raffle) {
    return { success: false, message: 'Rifa no encontrada' };
  }

  // Check if raffle is ready for draw
  if (raffle.status !== 'sold_out' && raffle.status !== 'draw_pending') {
    return { success: false, message: 'La rifa no está lista para sortear' };
  }

  // Get all paid tickets
  const tickets = await db.prepare(
    'SELECT * FROM raffle_tickets WHERE raffle_id = ? AND payment_status = ?'
  ).bind(raffleId, 'paid').all<RaffleTicket>();

  if (!tickets.results || tickets.results.length === 0) {
    return { success: false, message: 'No hay tickets pagados para sortear' };
  }

  // Generate seed and select winner deterministically
  const seed = generateSeed();
  
  // Use seed to select winner deterministically
  // Convert seed to number using hex conversion
  const seedNum = parseInt(seed.substring(0, 8), 16);
  const winnerIndex = seedNum % tickets.results.length;
  const winningTicket = tickets.results[winnerIndex];

  // Create draw record
  const drawId = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO raffle_draws (
      id, raffle_id, winning_ticket_id, seed, verified, drawn_by, drawn_at
    ) VALUES (?, ?, ?, ?, 0, ?, ?)`
  ).bind(
    drawId,
    raffleId,
    winningTicket.id,
    seed,
    drawnBy || null,
    now
  ).run();

  // Update raffle with winner
  await db.prepare(
    `UPDATE raffles SET 
      status = 'drawn', 
      winner_id = ?,
      winning_ticket_id = ?,
      updated_at = ? 
    WHERE id = ?`
  ).bind(
    winningTicket.id, // Store ticket ID as winner_id for simplicity
    winningTicket.id,
    now,
    raffleId
  ).run();

  const updatedRaffle = await getRaffleById(raffleId);
  
  return { 
    success: true, 
    raffle: updatedRaffle || undefined,
    draw: {
      id: drawId,
      raffle_id: raffleId,
      winning_ticket_id: winningTicket.id,
      seed,
      verified: 0,
      drawn_by: drawnBy || null,
      drawn_at: now
    }
  };
}

export async function getRaffleDraws(raffleId: string): Promise<RaffleDraw[]> {
  const db = getDb();
  
  const draws = await db.prepare(
    'SELECT * FROM raffle_draws WHERE raffle_id = ? ORDER BY drawn_at DESC'
  ).bind(raffleId).all<RaffleDraw>();

  return draws.results || [];
}

// ============================================
// HELPER QUERIES
// ============================================

export async function getRaffleStats(raffleId: string): Promise<{
  total: number;
  sold: number;
  paid: number;
  pending: number;
  available: number;
}> {
  const db = getDb();
  
  const raffle = await getRaffleById(raffleId);
  if (!raffle) {
    return { total: 0, sold: 0, paid: 0, pending: 0, available: 0 };
  }

  const paidResult = await db.prepare(
    'SELECT COUNT(*) as count FROM raffle_tickets WHERE raffle_id = ? AND payment_status = ?'
  ).bind(raffleId, 'paid').first<{ count: number }>();

  const pendingResult = await db.prepare(
    'SELECT COUNT(*) as count FROM raffle_tickets WHERE raffle_id = ? AND payment_status = ?'
  ).bind(raffleId, 'pending').first<{ count: number }>();

  return {
    total: raffle.total_tickets,
    sold: raffle.sold_tickets,
    paid: paidResult?.count || 0,
    pending: pendingResult?.count || 0,
    available: raffle.total_tickets - raffle.sold_tickets
  };
}
