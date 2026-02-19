// Auction Database Queries
// Handles all database operations for auctions and bids

import type { D1Database } from '@cloudflare/workers-types';
import type { 
  Auction, 
  Bid, 
  AuctionFilters, 
  CreateAuctionInput, 
  CreateBidInput,
  AuctionStatus 
} from '@/types/auction';
import { getVehicleById } from './vehicles';
import { getUserById } from './users';
import { checkAndExtendAuctionEndTime, validateBidTime } from '@/lib/core/anti-sniping';
import type { RateLimitResult } from '@/lib/core/rate-limit';

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

// Auction Queries

export async function getAuctions(
  filters: AuctionFilters = {},
  page: number = 1,
  pageSize: number = 20
): Promise<{ auctions: Auction[]; total: number }> {
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
    whereClause += ` AND start_time >= $${paramIndex}`;
    params.push(filters.from_date);
    paramIndex++;
  }

  if (filters.to_date) {
    whereClause += ` AND end_time <= $${paramIndex}`;
    params.push(filters.to_date);
    paramIndex++;
  }

  if (filters.min_price) {
    whereClause += ` AND starting_price >= $${paramIndex}`;
    params.push(filters.min_price);
    paramIndex++;
  }

  if (filters.max_price) {
    whereClause += ` AND starting_price <= $${paramIndex}`;
    params.push(filters.max_price);
    paramIndex++;
  }

  // Get total count
  const countResult = await db.prepare(
    `SELECT COUNT(*) as total FROM auctions ${whereClause}`
  ).first() as { total: number } | null;
  
  const total = countResult?.total || 0;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const auctions = await db.prepare(
    `SELECT * FROM auctions ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
  ).bind(...params, pageSize, offset).all() as { results: Auction[] };

  // Enrich with vehicle data
  const enrichedAuctions: Auction[] = await Promise.all(
    (auctions.results || []).map(async (auction: Auction) => {
      const vehicle = await getVehicleById(auction.vehicle_id);
      return { ...auction, vehicle };
    })
  );

  return { auctions: enrichedAuctions, total };
}

export async function getAuctionById(id: string): Promise<Auction | null> {
  const db = getDb();
  
  const auction = await db.prepare(
    'SELECT * FROM auctions WHERE id = ?'
  ).bind(id).first() as Auction | null;

  if (!auction) return null;

  // Get vehicle
  const vehicle = await getVehicleById(auction.vehicle_id);
  
  // Get winner if exists
  let winner = null;
  if (auction.winner_id) {
    winner = await getUserById(db, auction.winner_id);
  }

  return { ...auction, vehicle, winner };
}

export async function getAuctionByVehicleId(vehicleId: string): Promise<Auction | null> {
  const db = getDb();
  
  const auction = await db.prepare(
    'SELECT * FROM auctions WHERE vehicle_id = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(vehicleId).first() as Auction | null;

  if (!auction) return null;

  const vehicle = await getVehicleById(auction.vehicle_id);
  return { ...auction, vehicle };
}

export async function getActiveAuctions(
  page: number = 1,
  pageSize: number = 20
): Promise<{ auctions: Auction[]; total: number }> {
  return getAuctions({ status: 'active' }, page, pageSize);
}

export async function createAuction(data: CreateAuctionInput): Promise<Auction> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO auctions (
      id, vehicle_id, starting_price, min_increment, 
      start_time, end_time, status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)`
  ).bind(
    id,
    data.vehicle_id,
    data.starting_price,
    data.min_increment || 10000,
    data.start_time,
    data.end_time,
    data.created_by || null,
    now,
    now
  ).run();

  return getAuctionById(id) as Promise<Auction>;
}

export async function updateAuctionStatus(
  id: string, 
  status: AuctionStatus,
  additionalFields: Partial<Auction> = {}
): Promise<Auction | null> {
  const db = getDb();
  const now = new Date().toISOString();

  // Build dynamic update query
  const updates: string[] = ['status = ?', 'updated_at = ?'];
  const params: (string | null)[] = [status, now];

  if (additionalFields.winner_id !== undefined) {
    updates.push('winner_id = ?');
    params.push(additionalFields.winner_id);
  }

  if (additionalFields.winner_bid_id !== undefined) {
    updates.push('winner_bid_id = ?');
    params.push(additionalFields.winner_bid_id);
  }

  if (additionalFields.payment_expires_at !== undefined) {
    updates.push('payment_expires_at = ?');
    params.push(additionalFields.payment_expires_at);
  }

  params.push(id);

  await db.prepare(
    `UPDATE auctions SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return getAuctionById(id);
}

export async function updateAuction(
  id: string,
  data: Partial<CreateAuctionInput>
): Promise<Auction | null> {
  const db = getDb();
  const updates: string[] = ['updated_at = ?'];
  const params: (string | number | null)[] = [new Date().toISOString()];
  let paramIndex = 2;

  if (data.starting_price !== undefined) {
    updates.push(`starting_price = $${paramIndex}`);
    params.push(data.starting_price);
    paramIndex++;
  }

  if (data.min_increment !== undefined) {
    updates.push(`min_increment = $${paramIndex}`);
    params.push(data.min_increment);
    paramIndex++;
  }

  if (data.start_time !== undefined) {
    updates.push(`start_time = $${paramIndex}`);
    params.push(data.start_time);
    paramIndex++;
  }

  if (data.end_time !== undefined) {
    updates.push(`end_time = $${paramIndex}`);
    params.push(data.end_time);
    paramIndex++;
  }

  params.push(id);

  await db.prepare(
    `UPDATE auctions SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return getAuctionById(id);
}

// Bid Queries

export async function getBidsByAuctionId(
  auctionId: string,
  limit: number = 100,
  offset: number = 0
): Promise<Bid[]> {
  const db = getDb();
  
  const bids = await db.prepare(
    'SELECT * FROM bids WHERE auction_id = ? ORDER BY amount DESC LIMIT ? OFFSET ?'
  ).bind(auctionId, limit, offset).all<Bid>();

  return bids.results || [];
}

export async function getHighestBid(auctionId: string): Promise<Bid | null> {
  const db = getDb();
  
  const bid = await db.prepare(
    'SELECT * FROM bids WHERE auction_id = ? ORDER BY amount DESC LIMIT 1'
  ).bind(auctionId).first<Bid>();

  return bid;
}

export async function placeBid(data: CreateBidInput): Promise<{ bid: Bid; is_winner: boolean }> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Get auction to validate bid
  const auction = await getAuctionById(data.auction_id);
  if (!auction) {
    throw new Error('Auction not found');
  }

  // Get current highest bid
  const highestBid = await getHighestBid(data.auction_id);
  const minAmount = highestBid 
    ? highestBid.amount + auction.min_increment 
    : auction.starting_price;

  // Validate bid amount
  if (data.amount < minAmount) {
    throw new Error(`Bid must be at least ${minAmount}`);
  }

  // Check auction status
  if (auction.status !== 'active') {
    throw new Error('Auction is not active');
  }

  // Check if auction has ended
  const nowDate = new Date();
  const endTime = new Date(auction.end_time);
  if (nowDate > endTime) {
    throw new Error('Auction has ended');
  }

  // Mark previous winner as not winner
  if (highestBid) {
    await db.prepare(
      'UPDATE bids SET is_winner = 0 WHERE id = ?'
    ).bind(highestBid.id).run();
  }

  // Insert new bid
  await db.prepare(
    `INSERT INTO bids (
      id, auction_id, user_id, bidder_name, 
      bidder_phone, bidder_email, amount, is_winner, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
  ).bind(
    id,
    data.auction_id,
    data.user_id || null,
    data.bidder_name,
    data.bidder_phone,
    data.bidder_email || null,
    data.amount,
    now
  ).run();

  // Get the created bid
  const bid = await db.prepare(
    'SELECT * FROM bids WHERE id = ?'
  ).bind(id).first<Bid>();

  return { bid: bid!, is_winner: true };
}

// ============================================================
// Atomic Bid Placement with Anti-Sniping
// ============================================================

/**
 * Resultado de puja atómica
 */
export interface AtomicBidResult {
  success: boolean;
  bid?: Bid;
  is_winner?: boolean;
  error_code?: string;
  error_message?: string;
  anti_sniping?: {
    extended: boolean;
    new_end_time?: string;
  };
}

/**
 * Realiza una puja atómica con todas las validaciones y anti-sniping
 * Incluye validaciones de tiempo, monto, y extensión anti-sniping
 * 
 * @param data - Datos de la puja
 * @param rateLimitResult - Resultado de verificación de rate limit (opcional)
 * @returns Resultado atómico de la puja
 */
export async function atomicPlaceBid(
  data: CreateBidInput,
  rateLimitResult?: RateLimitResult
): Promise<AtomicBidResult> {
  const db = getDb();
  const bidId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    // 1. Validar rate limit si se proporciona
    if (rateLimitResult && !rateLimitResult.allowed) {
      await logBidRejection(data.auction_id, bidId, 'rate_limited', {
        reason: rateLimitResult.reason,
        resetAt: rateLimitResult.resetAt
      });
      
      return {
        success: false,
        error_code: 'rate_limited',
        error_message: `Límite de peticiones alcanzado. Intenta de nuevo después de ${rateLimitResult.resetAt}`
      };
    }

    // 2. Validar tiempo de la subasta
    const timeValidation = await validateBidTime(data.auction_id);
    if (!timeValidation.valid) {
      let errorCode = 'ended';
      let errorMessage = 'La subasta ha terminado';

      if (timeValidation.reason === 'auction_not_found') {
        errorCode = 'auction_not_found';
        errorMessage = 'Subasta no encontrada';
      } else if (timeValidation.reason === 'auction_not_active') {
        errorCode = 'auction_not_active';
        errorMessage = 'La subasta no está activa';
      } else if (timeValidation.reason === 'ended') {
        errorCode = 'ended';
        errorMessage = 'La subasta ha terminado';
      }

      await logBidRejection(data.auction_id, bidId, errorCode, {
        end_time: timeValidation.endTime
      });

      return {
        success: false,
        error_code: errorCode,
        error_message: errorMessage
      };
    }

    // 3. Obtener datos de la subasta para validar monto
    const auction = await db.prepare(
      'SELECT * FROM auctions WHERE id = ?'
    ).bind(data.auction_id).first<Auction>();

    if (!auction || auction.status !== 'active') {
      await logBidRejection(data.auction_id, bidId, 'auction_not_active', {
        status: auction?.status || 'not_found'
      });

      return {
        success: false,
        error_code: 'auction_not_active',
        error_message: 'La subasta no está activa'
      };
    }

    // 4. Obtener la puja más alta actual
    const highestBid = await db.prepare(
      'SELECT * FROM bids WHERE auction_id = ? ORDER BY amount DESC LIMIT 1'
    ).bind(data.auction_id).first<Bid>();

    const minAmount = highestBid 
      ? highestBid.amount + auction.min_increment 
      : auction.starting_price;

    // 5. Validar monto de puja
    if (data.amount < minAmount) {
      await logBidRejection(data.auction_id, bidId, 'invalid_amount', {
        bid_amount: data.amount,
        min_required: minAmount,
        current_highest: highestBid?.amount || null
      });

      return {
        success: false,
        error_code: 'invalid_amount',
        error_message: `El monto mínimo para pujar es ${minAmount.toLocaleString('es-CL')}`
      };
    }

    // 6. Verificar anti-sniping (extiende si es necesario)
    const antiSnipingResult = await checkAndExtendAuctionEndTime(data.auction_id, bidId);

    // 7. Ejecutar inserción de puja y actualización de ganadores anteriores
    // Marcar puja anterior como no ganadora
    if (highestBid) {
      await db.prepare(
        'UPDATE bids SET is_winner = 0 WHERE id = ?'
      ).bind(highestBid.id).run();
    }

    // Insertar nueva puja
    await db.prepare(
      `INSERT INTO bids (
        id, auction_id, user_id, bidder_name, 
        bidder_phone, bidder_email, amount, is_winner, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
    ).bind(
      bidId,
      data.auction_id,
      data.user_id || null,
      data.bidder_name,
      data.bidder_phone,
      data.bidder_email || null,
      data.amount,
      now
    ).run();

    // 8. Obtener la puja creada
    const bid = await db.prepare(
      'SELECT * FROM bids WHERE id = ?'
    ).bind(bidId).first<Bid>();

    // 9. Registrar éxito en auditoría
    await logBidSuccess(data.auction_id, bid!, {
      previous_highest: highestBid?.amount || null,
      anti_sniping_extended: antiSnipingResult.extended,
      new_end_time: antiSnipingResult.newEndTime
    });

    console.log(`[AtomicBid] Puja exitosa ${bidId} en subasta ${data.auction_id}: ${data.amount}`);

    return {
      success: true,
      bid: bid!,
      is_winner: true,
      anti_sniping: {
        extended: antiSnipingResult.extended,
        new_end_time: antiSnipingResult.newEndTime
      }
    };

  } catch (error: any) {
    console.error('[AtomicBid] Error en puja atómica:', error);
    
    await logBidRejection(data.auction_id, bidId, 'internal_error', {
      error: error.message
    });

    return {
      success: false,
      error_code: 'internal_error',
      error_message: 'Error interno al procesar la puja'
    };
  }
}

/**
 * Registra rechazo de puja en auditoría
 */
async function logBidRejection(
  auctionId: string,
  bidId: string,
  reason: string,
  details: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO audit_logs (id, user_id, entity_type, entity_id, action, old_value, new_value, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    null,
    'auction',
    auctionId,
    'bid_rejected',
    JSON.stringify({ bid_id: bidId, reason }),
    JSON.stringify(details),
    now
  ).run();

  console.log(`[AtomicBid] Puja ${bidId} rechazada en ${auctionId}: ${reason}`);
}

/**
 * Registra éxito de puja en auditoría
 */
async function logBidSuccess(
  auctionId: string,
  bid: Bid,
  details: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO audit_logs (id, user_id, entity_type, entity_id, action, old_value, new_value, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    bid.user_id,
    'auction',
    auctionId,
    'bid_placed',
    null,
    JSON.stringify({ bid_id: bid.id, amount: bid.amount, ...details }),
    now
  ).run();
}

export async function determineWinner(auctionId: string): Promise<{ auction: Auction; bid: Bid } | null> {
  // Get highest bid
  const highestBid = await getHighestBid(auctionId);
  
  if (!highestBid) {
    // No bids - mark as ended_no_bids
    await updateAuctionStatus(auctionId, 'ended_no_bids');
    return null;
  }

  // Calculate payment expiration (48 hours)
  const paymentExpires = new Date();
  paymentExpires.setHours(paymentExpires.getHours() + 48);

  // Update auction with winner
  const auction = await updateAuctionStatus(auctionId, 'ended_pending_payment', {
    winner_id: highestBid.user_id,
    winner_bid_id: highestBid.id,
    payment_expires_at: paymentExpires.toISOString()
  });

  return { auction: auction!, bid: highestBid };
}

export async function getAuctionStats(auctionId: string): Promise<{
  highest_bid: number | null;
  bid_count: number;
  has_bids: boolean;
}> {
  const db = getDb();
  
  const stats = await db.prepare(
    `SELECT 
      MAX(amount) as highest_bid,
      COUNT(*) as bid_count
    FROM bids 
    WHERE auction_id = ?`
  ).bind(auctionId).first<{ highest_bid: number | null; bid_count: number }>();

  return {
    highest_bid: stats?.highest_bid || null,
    bid_count: stats?.bid_count || 0,
    has_bids: (stats?.bid_count || 0) > 0
  };
}

// Get auctions that need to be processed (expired, etc.)
export async function getAuctionsNeedingProcessing(): Promise<Auction[]> {
  const db = getDb();
  const now = new Date().toISOString();

  // Get active auctions that have ended
  const auctions = await db.prepare(
    `SELECT * FROM auctions 
    WHERE status = 'active' AND end_time <= ?
    ORDER BY end_time ASC`
  ).bind(now).all<Auction>();

  return auctions.results || [];
}
