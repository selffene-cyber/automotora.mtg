// ============================================================
// API Route - Admin: Gestión de Consignaciones
// GET /api/admin/consignments
// POST /api/admin/consignments
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  getAdminConsignments, 
  createConsignment, 
  getConsignmentStats 
} from '@/lib/db/consignments';
import { logConsignmentCreated } from '@/lib/core/audit';
import { ConsignmentFilters, ConsignmentStatus, isValidConsignmentStatus } from '@/types/consignment';
import { createVehicle, generateSlug, slugExists } from '@/lib/db/vehicles';
import { z } from 'zod';

// ============================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================

/**
 * Schema para crear consignación manualmente (admin)
 */
const createConsignmentAdminSchema = z.object({
  // Datos requeridos del propietario
  owner_name: z.string().min(2).max(100),
  owner_phone: z.string().min(8).max(20),
  owner_email: z.string().email().optional().or(z.literal('')),
  
  // Datos del vehículo
  brand: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  expected_price: z.number().positive().optional(),
  notes: z.string().max(2000).optional(),
  
  // Estado inicial (opcional, por defecto 'received')
  status: z.string().optional(),
});

// ============================================================
// GET - Lista consignaciones (admin)
// ============================================================

/**
 * GET - Lista todos los consignaciones con filtros
 * 
 * Query params:
 * - status: filter by status (comma-separated)
 * - brand: filter by brand (comma-separated)
 * - model: filter by model (comma-separated)
 * - year_min: filter by year >= value
 * - year_max: filter by year <= value
 * - expected_price_min: filter by price >= value
 * - expected_price_max: filter by price <= value
 * - search: search in owner_name, owner_phone, brand, model
 * - limit: pagination limit (default 20)
 * - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parsear filtros
    const statusParam = searchParams.get('status');
    const brandParam = searchParams.get('brand');
    const modelParam = searchParams.get('model');

    const filters: ConsignmentFilters = {
      status: statusParam ? statusParam.split(',').filter(Boolean) as ConsignmentStatus[] : undefined,
      brand: brandParam ? brandParam.split(',').filter(Boolean) : undefined,
      model: modelParam ? modelParam.split(',').filter(Boolean) : undefined,
      year_min: searchParams.get('year_min') ? parseInt(searchParams.get('year_min')!) : undefined,
      year_max: searchParams.get('year_max') ? parseInt(searchParams.get('year_max')!) : undefined,
      expected_price_min: searchParams.get('expected_price_min') ? parseInt(searchParams.get('expected_price_min')!) : undefined,
      expected_price_max: searchParams.get('expected_price_max') ? parseInt(searchParams.get('expected_price_max')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    // Validar estados
    if (filters.status) {
      for (const s of filters.status) {
        if (!isValidConsignmentStatus(s)) {
          return NextResponse.json(
            { success: false, error: `Estado inválido: ${s}` },
            { status: 400 }
          );
        }
      }
    }

    // Obtener consignaciones
    const result = await getAdminConsignments(filters);
    
    // Obtener estadísticas
    const stats = await getConsignmentStats();
    
    // Calcular paginación
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    return NextResponse.json({
      success: true,
      data: result.consignments,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.consignments.length < result.total,
      },
      stats,
    });
  } catch (error) {
    console.error('Error fetching admin consignments:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener las consignaciones' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST - Crear consignación manualmente (admin)
// ============================================================

/**
 * POST - Crea una nueva consignación manualmente
 * 
 * Request body:
 * {
 *   owner_name: string (required),
 *   owner_phone: string (required),
 *   owner_email?: string,
 *   brand: string (required),
 *   model: string (required),
 *   year: number (required),
 *   expected_price?: number,
 *   notes?: string,
 *   status?: string (default: 'received')
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ============================================================
    // VALIDACIÓN CON ZOD
    // ============================================================
    const validationResult = createConsignmentAdminSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e: { message: string }) => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Validar status si se proporciona
    if (data.status && !isValidConsignmentStatus(data.status)) {
      return NextResponse.json(
        { success: false, error: 'Estado de consignación inválido' },
        { status: 400 }
      );
    }

    // ============================================================
    // CREAR CONSIGNACIÓN
    // ============================================================
    const consignment = await createConsignment({
      owner_name: data.owner_name,
      owner_email: data.owner_email || undefined,
      owner_phone: data.owner_phone,
      brand: data.brand,
      model: data.model,
      year: data.year,
      expected_price: data.expected_price || undefined,
      notes: data.notes || undefined,
    });

    // Si se especificó un status diferente a 'received', actualizarlo
    if (data.status && data.status !== 'received') {
      const { updateConsignmentStatus } = await import('@/lib/db/consignments');
      await updateConsignmentStatus(consignment.id, data.status as ConsignmentStatus);
    }

    // ============================================================
    // REGISTRAR AUDITORÍA
    // ============================================================
    // Obtener usuario de la sesión (si está disponible)
    // Por ahora usamos 'admin' como placeholder
    await logConsignmentCreated(consignment.id, 'admin');

    console.log(`[Consignment] Consignación creada por admin: ${consignment.id}`);

    return NextResponse.json({
      success: true,
      message: 'Consignación creada exitosamente',
      data: consignment,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating consignment:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear la consignación' },
      { status: 500 }
    );
  }
}
