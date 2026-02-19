// ============================================================
// API Route - Admin: Gestión de Consignación Individual
// GET /api/admin/consignations/[id]
// PATCH /api/admin/consignations/[id]
// POST /api/admin/consignations/[id]
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  getConsignmentById, 
  updateConsignment, 
  updateConsignmentStatus,
  getConsignmentPhotos 
} from '@/lib/db/consignments';
import { 
  logConsignmentStatusChange, 
  logConsignmentApproval, 
  logConsignmentRejection,
  logConsignmentPublication,
  logConsignmentUpdate,
  getConsignmentAuditHistory 
} from '@/lib/core/audit';
import { UpdateConsignmentInput, ConsignmentStatus, isValidConsignmentStatus } from '@/types/consignment';
import { createVehicle, generateSlug, slugExists, addVehiclePhoto, getVehiclePhotos } from '@/lib/db/vehicles';
import { canTransitionConsignment, isTerminalConsignment } from '@/lib/core/state-machine';
import { z } from 'zod';

// ============================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================

/**
 * Schema para actualizar consignación
 */
const updateConsignmentSchema = z.object({
  vehicle_id: z.string().uuid().nullable().optional(),
  owner_name: z.string().min(2).max(100).optional(),
  owner_email: z.string().email().nullable().optional(),
  owner_phone: z.string().min(8).max(20).optional(),
  brand: z.string().min(1).max(50).optional(),
  model: z.string().min(1).max(50).optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  expected_price: z.number().positive().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.string().optional(),
  reviewed_by: z.string().uuid().nullable().optional(),
  reviewed_at: z.string().datetime().nullable().optional(),
});

/**
 * Schema para acciones de estado
 */
const actionSchema = z.object({
  action: z.enum(['take', 'approve', 'reject', 'publish', 'unpublish']),
  reason: z.string().max(500).optional(),
  create_vehicle: z.boolean().optional(), // Para approve/publish - crear vehículo
});

// ============================================================
// HELPERS
// ============================================================

/**
 * Crea un vehículo desde los datos de la consignación
 */
async function createVehicleFromConsignment(
  consignmentId: string,
  userId: string
): Promise<string> {
  const consignment = await getConsignmentById(consignmentId);
  if (!consignment) {
    throw new Error('Consignación no encontrada');
  }

  // Generar slug único
  let slug = generateSlug(consignment.brand, consignment.model, consignment.year);
  let slugCount = 0;
  while (await slugExists(slug)) {
    slug = generateSlug(consignment.brand, consignment.model, consignment.year) + `-${++slugCount}`;
  }

  // Crear vehículo
  const vehicle = await createVehicle({
    slug,
    brand: consignment.brand,
    model: consignment.model,
    year: consignment.year,
    price: consignment.expected_price || 0,
    created_by: userId,
  });

  // Copiar fotos de la consignación al vehículo
  const photos = await getConsignmentPhotos(consignmentId);
  for (const photo of photos) {
    await addVehiclePhoto(vehicle.id, photo.url, photo.position);
  }

  // Actualizar la consignación con el vehicle_id
  await updateConsignment(consignmentId, {
    vehicle_id: vehicle.id,
  });

  console.log(`[Consignment] Vehículo ${vehicle.id} creado desde consignación ${consignmentId}`);

  return vehicle.id;
}

// ============================================================
// GET - Obtener consignación por ID
// ============================================================

/**
 * GET - Obtiene una consignación por su ID
 * 
 * Query params:
 * - include_audit: boolean - incluir historial de auditoría
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validar que sea un UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de consignación inválido' },
        { status: 400 }
      );
    }

    const consignment = await getConsignmentById(id);

    if (!consignment) {
      return NextResponse.json(
        { success: false, error: 'Consignación no encontrada' },
        { status: 404 }
      );
    }

    // Obtener historial de auditoría si se solicita
    const { searchParams } = new URL(request.url);
    const includeAudit = searchParams.get('include_audit') === 'true';
    
    let auditHistory = null;
    if (includeAudit) {
      auditHistory = await getConsignmentAuditHistory(id);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...consignment,
        audit_history: auditHistory,
      },
    });
  } catch (error) {
    console.error('Error fetching consignment:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la consignación' },
      { status: 500 }
    );
  }
}

// ============================================================
// PATCH - Actualizar consignación
// ============================================================

/**
 * PATCH - Actualiza una consignación
 * 
 * Request body (campos opcionales):
 * {
 *   owner_name?: string,
 *   owner_email?: string | null,
 *   owner_phone?: string,
 *   brand?: string,
 *   model?: string,
 *   year?: number,
 *   expected_price?: number | null,
 *   notes?: string | null,
 *   status?: string,
 *   reviewed_by?: string | null,
 *   reviewed_at?: string | null
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validar que sea un UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de consignación inválido' },
        { status: 400 }
      );
    }

    // Verificar que la consignación existe
    const existingConsignment = await getConsignmentById(id);
    if (!existingConsignment) {
      return NextResponse.json(
        { success: false, error: 'Consignación no encontrada' },
        { status: 404 }
      );
    }

    // Validar status si se proporciona
    if (body.status && !isValidConsignmentStatus(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Estado de consignación inválido' },
        { status: 400 }
      );
    }

    // Validar con Zod
    const validationResult = updateConsignmentSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e: { message: string }) => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Preparar datos para actualización
    const updateData: UpdateConsignmentInput = {};

    if (data.owner_name !== undefined) updateData.owner_name = data.owner_name;
    if (data.owner_email !== undefined) updateData.owner_email = data.owner_email;
    if (data.owner_phone !== undefined) updateData.owner_phone = data.owner_phone;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.year !== undefined) updateData.year = data.year;
    if (data.expected_price !== undefined) updateData.expected_price = data.expected_price;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.vehicle_id !== undefined) updateData.vehicle_id = data.vehicle_id;
    if (data.reviewed_by !== undefined) updateData.reviewed_by = data.reviewed_by;
    if (data.reviewed_at !== undefined) updateData.reviewed_at = data.reviewed_at;

    // Actualizar la consignación
    const updated = await updateConsignment(id, updateData);

    // Si se cambió el status, registrar auditoría
    if (data.status && data.status !== existingConsignment.status) {
      await logConsignmentStatusChange(
        id,
        existingConsignment.status,
        data.status as ConsignmentStatus,
        'admin' // En producción, obtener de sesión
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Consignación actualizada',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating consignment:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar la consignación' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST - Acciones de consignación
// ============================================================

/**
 * POST - Ejecuta acciones sobre la consignación
 * 
 * Request body:
 * {
 *   action: 'take' | 'approve' | 'reject' | 'publish' | 'unpublish',
 *   reason?: string, // Para reject
 *   create_vehicle?: boolean // Para approve/publish
 * }
 * 
 * Acciones:
 * - take: received -> under_review
 * - approve: under_review -> approved (opcional: create_vehicle)
 * - reject: under_review -> rejected
 * - publish: approved -> published (opcional: create_vehicle si no existe)
 * - unpublish: approved -> under_review
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validar que sea un UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de consignación inválido' },
        { status: 400 }
      );
    }

    // Validar acción con Zod
    const validationResult = actionSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e: { message: string }) => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const { action, reason, create_vehicle } = validationResult.data;
    const userId = 'admin'; // En producción, obtener de sesión

    // Obtener consignación actual
    const consignment = await getConsignmentById(id);
    if (!consignment) {
      return NextResponse.json(
        { success: false, error: 'Consignación no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que no esté en estado terminal para acciones que cambian estado
    if (isTerminalConsignment(consignment.status) && action !== 'take') {
      return NextResponse.json(
        { success: false, error: 'La consignación está en estado terminal y no puede ser modificada' },
        { status: 400 }
      );
    }

    // ============================================================
    // PROCESAR ACCIÓN
    // ============================================================
    let newStatus: ConsignmentStatus | null = null;
    let vehicleId: string | null = null;
    let message = '';

    switch (action) {
      case 'take':
        // received -> under_review
        if (consignment.status !== 'received') {
          return NextResponse.json(
            { success: false, error: 'Solo se puede tomar una consignación en estado "received"' },
            { status: 400 }
          );
        }
        newStatus = 'under_review';
        message = 'Consignación tomada para revisión';
        break;

      case 'approve':
        // under_review -> approved
        if (consignment.status !== 'under_review') {
          return NextResponse.json(
            { success: false, error: 'Solo se puede aprobar una consignación en estado "under_review"' },
            { status: 400 }
          );
        }
        newStatus = 'approved';
        message = 'Consignación aprobada';

        // Crear vehículo si se solicita
        if (create_vehicle) {
          try {
            vehicleId = await createVehicleFromConsignment(id, userId);
            await logConsignmentApproval(id, vehicleId, userId);
            message = `Consignación aprobada y vehículo creado`;
          } catch (vehicleError) {
            console.error('Error creating vehicle:', vehicleError);
            // Continuar con la aprobación aunque falle la creación del vehículo
          }
        }
        break;

      case 'reject':
        // under_review -> rejected
        if (consignment.status !== 'under_review') {
          return NextResponse.json(
            { success: false, error: 'Solo se puede rechazar una consignación en estado "under_review"' },
            { status: 400 }
          );
        }
        newStatus = 'rejected';
        message = `Consignación rechazada${reason ? `: ${reason}` : ''}`;
        
        // Registrar rechazo
        await logConsignmentRejection(id, userId, reason || null);
        break;

      case 'publish':
        // approved -> published
        if (consignment.status !== 'approved') {
          return NextResponse.json(
            { success: false, error: 'Solo se puede publicar una consignación en estado "approved"' },
            { status: 400 }
          );
        }
        newStatus = 'published';
        message = 'Consignación publicada';

        // Crear vehículo si no existe y se solicita
        if (!consignment.vehicle_id && create_vehicle) {
          try {
            vehicleId = await createVehicleFromConsignment(id, userId);
          } catch (vehicleError) {
            console.error('Error creating vehicle:', vehicleError);
          }
        }

        // Publicar el vehículo si existe
        if (consignment.vehicle_id) {
          const { updateVehicleStatus } = await import('@/lib/db/vehicles');
          await updateVehicleStatus(consignment.vehicle_id, 'published');
        }

        await logConsignmentPublication(id, userId);
        break;

      case 'unpublish':
        // approved -> under_review
        if (consignment.status !== 'approved') {
          return NextResponse.json(
            { success: false, error: 'Solo se puede despublicar una consignación en estado "approved"' },
            { status: 400 }
          );
        }
        newStatus = 'under_review';
        message = 'Consignación despublicada y vuelta a revisión';

        // Ocultar el vehículo si existe
        if (consignment.vehicle_id) {
          const { updateVehicleStatus } = await import('@/lib/db/vehicles');
          await updateVehicleStatus(consignment.vehicle_id, 'hidden');
        }
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Acción no válida' },
          { status: 400 }
        );
    }

    // Validar transición de estado
    if (newStatus && !canTransitionConsignment(consignment.status, newStatus)) {
      return NextResponse.json(
        { success: false, error: `Transición no permitida: ${consignment.status} -> ${newStatus}` },
        { status: 400 }
      );
    }

    // Actualizar estado
    if (newStatus) {
      await updateConsignmentStatus(id, newStatus, userId);
    }

    // Obtener consignación actualizada
    const updatedConsignment = await getConsignmentById(id);

    return NextResponse.json({
      success: true,
      message,
      data: {
        ...updatedConsignment,
        created_vehicle_id: vehicleId,
      },
    });

  } catch (error) {
    console.error('Error processing consignment action:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar la acción' },
      { status: 500 }
    );
  }
}
