// ============================================================
// API: Public Lead Submission
// MTG Automotora - Plataforma MVP
// Descripcion: Endpoint público para que clientes envíen leads
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createLead } from '@/lib/db/leads';
import { CreateLeadInput, isValidLeadSource } from '@/types/lead';

// Enable Edge runtime for Cloudflare Pages D1 bindings
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * POST - Customer submits lead from vehicle page
 * 
 * Request body:
 * {
 *   vehicle_id?: string,
 *   name: string,
 *   phone: string,
 *   email?: string,
 *   source?: LeadSource (default: 'form'),
 *   notes?: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   lead: Lead
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

    // Preparar datos del lead
    const leadData: CreateLeadInput = {
      vehicle_id: body.vehicle_id,
      name: body.name.trim(),
      email: body.email?.trim() || undefined,
      phone: body.phone.trim(),
      source: body.source || 'form', // Default: formulario web
      notes: body.notes?.trim() || undefined,
    };

    // Crear el lead
    const lead = await createLead(leadData);

    return NextResponse.json({
      success: true,
      message: 'Lead enviado exitosamente',
      lead: {
        id: lead.id,
        name: lead.name,
        status: lead.status,
        created_at: lead.created_at,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

/**
 * GET - Info about lead submission endpoint
 * 
 * Returns allowed methods and required fields
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'Lead Submission',
    description: 'API pública para enviar leads desde el sitio web',
    methods: {
      POST: {
        description: 'Crear un nuevo lead',
        required_fields: ['name', 'phone'],
        optional_fields: ['vehicle_id', 'email', 'source', 'notes'],
        sources: ['whatsapp', 'form', 'referral', 'call', 'social', 'other'],
      },
    },
  });
}
