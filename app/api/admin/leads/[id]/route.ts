// ============================================================
// API Route - Admin: Gestión de Lead Individual
// GET /api/admin/leads/[id]
// PATCH /api/admin/leads/[id]
// DELETE /api/admin/leads/[id]
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getLeadById, updateLead, updateLeadStatus, assignLead } from '@/lib/db/leads';
import { UpdateLeadInput, isValidLeadStatus, isValidLeadSource } from '@/types/lead';

/**
 * GET - Obtiene un lead por su ID
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
        { success: false, error: 'ID de lead inválido' },
        { status: 400 }
      );
    }

    const lead = await getLeadById(id);

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener el lead' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Actualiza un lead
 * 
 * Request body (campos opcionales):
 * {
 *   name?: string,
 *   email?: string,
 *   phone?: string,
 *   source?: LeadSource,
 *   status?: LeadStatus,
 *   notes?: string,
 *   assigned_to?: string | null (null para desasignar)
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
        { success: false, error: 'ID de lead inválido' },
        { status: 400 }
      );
    }

    // Verificar que el lead existe
    const existingLead = await getLeadById(id);
    if (!existingLead) {
      return NextResponse.json(
        { success: false, error: 'Lead no encontrado' },
        { status: 404 }
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

    // Validar que assigned_to sea un UUID válido si se proporciona (o null para desasignar)
    if (body.assigned_to !== undefined && body.assigned_to !== null) {
      if (body.assigned_to && !uuidRegex.test(body.assigned_to)) {
        return NextResponse.json(
          { success: false, error: 'ID de usuario inválido' },
          { status: 400 }
        );
      }
    }

    // Si solo se quiere cambiar el status, usar función optimizada
    if (body.status && Object.keys(body).length === 1) {
      const updatedLead = await updateLeadStatus(id, body.status);
      return NextResponse.json({
        success: true,
        message: 'Status actualizado',
        data: updatedLead,
      });
    }

    // Si solo se quiere asignar, usar función optimizada
    if (body.assigned_to !== undefined && Object.keys(body).length === 1) {
      if (body.assigned_to === null) {
        // Desasignar
        const updatedLead = await assignLead(id, '');
        return NextResponse.json({
          success: true,
          message: 'Lead desasignado',
          data: updatedLead,
        });
      }
      const updatedLead = await assignLead(id, body.assigned_to);
      return NextResponse.json({
        success: true,
        message: 'Lead asignado',
        data: updatedLead,
      });
    }

    // Preparar datos para actualización
    const updateData: UpdateLeadInput = {};

    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }

    if (body.email !== undefined) {
      updateData.email = body.email?.trim() || null;
    }

    if (body.phone !== undefined) {
      updateData.phone = body.phone.trim();
    }

    if (body.source !== undefined) {
      updateData.source = body.source;
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes?.trim() || null;
    }

    if (body.assigned_to !== undefined) {
      updateData.assigned_to = body.assigned_to;
    }

    // Actualizar el lead
    const updatedLead = await updateLead(id, updateData);

    return NextResponse.json({
      success: true,
      message: 'Lead actualizado',
      data: updatedLead,
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar el lead' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Elimina (archiva) un lead
 * 
 * Actualmente solo marca como archived internamente
 * No hay status 'archived' en la definición, pero我们可以
 * cambiar el status a 'closed_lost' o implementar lógica adicional
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validar que sea un UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de lead inválido' },
        { status: 400 }
      );
    }

    // Verificar que el lead existe
    const existingLead = await getLeadById(id);
    if (!existingLead) {
      return NextResponse.json(
        { success: false, error: 'Lead no encontrado' },
        { status: 404 }
      );
    }

    // Por ahora, cambiar el status a 'closed_lost' en lugar de eliminar
    // Esto cumple con la regla de no eliminar leads
    const updatedLead = await updateLeadStatus(id, 'closed_lost');

    return NextResponse.json({
      success: true,
      message: 'Lead archivado (marcado como perdido)',
      data: updatedLead,
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar el lead' },
      { status: 500 }
    );
  }
}
