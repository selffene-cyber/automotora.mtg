// Auction Audit API Routes
// GET /api/admin/auctions/[id]/audit - Get audit logs for an auction

import { NextResponse } from 'next/server';
import type { D1Database } from '@cloudflare/workers-types';
import { getAuctionById } from '@/lib/db/auctions';
import { getDb } from '@/lib/db/vehicles';

// Enable Edge runtime for Cloudflare Pages D1 bindings
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Obtiene el binding de D1
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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Verificar que la subasta existe
    const auction = await getAuctionById(id);
    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

    const db = getDb();
    
    // Obtener logs de auditoría para esta subasta
    const auditLogs = await db.prepare(`
      SELECT id, user_id, action, old_value, new_value, created_at 
      FROM audit_logs 
      WHERE entity_type = 'auction' AND entity_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `).bind(id).all() as { results: Array<{
      id: string;
      user_id: string | null;
      action: string;
      old_value: string | null;
      new_value: string | null;
      created_at: string;
    }> };

    // También obtener logs de rate limit relacionados
    const rateLimitLogs = await db.prepare(`
      SELECT id, action, old_value, new_value, created_at 
      FROM audit_logs 
      WHERE entity_type = 'rate_limit' AND entity_id LIKE ?
      ORDER BY created_at DESC
      LIMIT 50
    `).bind(`%${id}%`).all() as { results: Array<{
      id: string;
      action: string;
      old_value: string | null;
      new_value: string | null;
      created_at: string;
    }> };

    return NextResponse.json({
      logs: auditLogs.results || [],
      rate_limit_logs: rateLimitLogs.results || [],
    });
  } catch (error) {
    console.error('Error fetching auction audit:', error);
    return NextResponse.json(
      { error: 'Error fetching audit logs' },
      { status: 500 }
    );
  }
}
