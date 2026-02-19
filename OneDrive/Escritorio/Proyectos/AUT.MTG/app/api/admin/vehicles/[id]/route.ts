// ============================================================
// API Route - Admin: Vehículo individual
// GET /api/admin/vehicles/[id]
// PATCH /api/admin/vehicles/[id]
// DELETE /api/admin/vehicles/[id]
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getVehicleById, updateVehicle, updateVehicleStatus, deleteVehicle } from '@/lib/db/vehicles';
import { UpdateVehicleInput, VehicleStatus } from '@/types/vehicle';

/**
 * GET - Obtiene un vehículo por su ID (admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      );
    }

    const vehicle = await getVehicleById(id);

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    console.error('Error fetching vehicle by ID:', error);
    return NextResponse.json(
      { error: 'Error al obtener el vehículo' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Actualiza un vehículo existente
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Verificar que el vehículo exista
    const existingVehicle = await getVehicleById(id);
    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    // Validar año si se proporciona
    if (body.year !== undefined) {
      const currentYear = new Date().getFullYear();
      if (body.year < 1900 || body.year > currentYear + 1) {
        return NextResponse.json(
          { error: `El año debe estar entre 1900 y ${currentYear + 1}` },
          { status: 400 }
        );
      }
    }

    // Validar precio si se proporciona
    if (body.price !== undefined && body.price < 0) {
      return NextResponse.json(
        { error: 'El precio no puede ser negativo' },
        { status: 400 }
      );
    }

    // Validar transmisión si se proporciona
    if (body.transmission && !['manual', 'auto', null].includes(body.transmission)) {
      return NextResponse.json(
        { error: 'La transmisión debe ser "manual", "auto" o null' },
        { status: 400 }
      );
    }

    // Validar status si se proporciona
    const validStatuses: VehicleStatus[] = ['draft', 'published', 'reserved', 'sold', 'hidden', 'archived'];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Status inválido. Estados válidos: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updateData: UpdateVehicleInput = {
      slug: body.slug,
      brand: body.brand,
      model: body.model,
      year: body.year,
      price: body.price,
      mileage_km: body.mileage_km,
      transmission: body.transmission,
      fuel_type: body.fuel_type,
      region: body.region,
      city: body.city,
      status: body.status,
      description: body.description
    };

    // Filtrar valores undefined
    const filteredData: UpdateVehicleInput = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    ) as UpdateVehicleInput;

    const vehicle = await updateVehicle(id, filteredData);

    return NextResponse.json({
      success: true,
      message: 'Vehículo actualizado exitosamente',
      data: vehicle
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el vehículo' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Archiva un vehículo (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el vehículo exista
    const existingVehicle = await getVehicleById(id);
    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    // No permitir eliminar si ya está archivado
    if (existingVehicle.status === 'archived') {
      return NextResponse.json(
        { error: 'El vehículo ya está archivado' },
        { status: 400 }
      );
    }

    const success = await deleteVehicle(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Error al archivar el vehículo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vehículo archivado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Error al archivar el vehículo' },
      { status: 500 }
    );
  }
}
