// ============================================================
// API Route - Admin: Gestión de Leads
// GET /api/admin/leads
// POST /api/admin/leads
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getLeads, createLead, getLeadStats } from '@/lib/db/leads';
import { LeadFilters, CreateLeadInput, isValidLeadStatus, isValidLeadSource, LeadStatus, LeadSource } from '@/types/lead';

/**
 * GET - Lista todos los leads con filtros
 * 
 * Query params:
 * - status: filter by status (comma-separated)
 * - source: filter by source (comma-separated)
 * - assigned_to: filter by user ID
 * - vehicle_id: filter by vehicle ID
 * - search: search in name, email, phone
 * - limit: pagination limit (default 20)
 * - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parsear filtros
    const filters: LeadFilters = {
      status: (searchParams.get('status')?.split(',').filter(Boolean) as LeadStatus[] | undefined) || undefined,
      source: (searchParams.get('source')?.split(',').filter(Boolean) as LeadSource[] | undefined) || undefined,
      assigned_to: searchParams.get('assigned_to') || undefined,
      vehicle_id: searchParams.get('vehicle_id') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    // Obtener leads
    const result = await getLeads(filters);

    // Obtener estadísticas
    const stats = await getLeadStats();

    return NextResponse.json({
      success: true,
      data: result.leads,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.leads.length < result.total,
      },
      stats,
    });
  } catch (error) {
    console.error('Error fetching admin leads:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener los leads' },
      { status: 500 }
    );
  }
}

/**
 * POST - Crea un nuevo lead manualmente
 * 
 * Request body:
 * {
 *   vehicle_id?: string,
 *   name: string (required),
 *   email?: string,
 *   phone: string (required),
 *   source: LeadSource,
 *   status?: LeadStatus (default: 'new'),
 *   notes?: string,
 *   assigned_to?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar campos requeridos
    if (!body.name || !body.phone) {
      return NextResponse.json(
        { success: false, error: 'Nombre y teléfono son requeridos' },
        { status: 400 }
      );
    }

    // Validar status si se proporciona
    if (body.status && !isValidLeadStatus(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Status de lead inválido' },
        { status: 400 }
      );
    }

    // Validar source si se proporciona
    if (body.source && !isValidLeadSource(body.source)) {
      return NextResponse.json(
        { success: false, error: 'Fuente de lead inválida' },
        { status: 400 }
      );
    }

    // Validar que vehicle_id sea un UUID válido si se proporciona
    if (body.vehicle_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(body.vehicle_id)) {
        return NextResponse.json(
          { success: false, error: 'ID de vehículo inválido' },
          { status: 400 }
        );
      }
    }

    // Validar que assigned_to sea un UUID válido si se proporciona
    if (body.assigned_to) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(body.assigned_to)) {
        return NextResponse.json(
          { success: false, error: 'ID de usuario inválido' },
          { status: 400 }
        );
      }
    }

    // Preparar datos del lead
    const leadData: CreateLeadInput = {
      vehicle_id: body.vehicle_id,
      name: body.name.trim(),
      email: body.email?.trim() || undefined,
      phone: body.phone.trim(),
      source: body.source || 'other',
      notes: body.notes?.trim() || undefined,
      assigned_to: body.assigned_to,
    };

    // Crear el lead
    const lead = await createLead(leadData);

    // Si se especificó un status diferente a 'new', actualizarlo
    if (body.status && body.status !== 'new') {
      const { updateLeadStatus } = await import('@/lib/db/leads');
      await updateLeadStatus(lead.id, body.status);
    }

    return NextResponse.json({
      success: true,
      message: 'Lead creado exitosamente',
      data: lead,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear el lead' },
      { status: 500 }
    );
  }
}
