// ============================================================
// API Route - Admin: Gestión de fotos de vehículo
// POST /api/admin/vehicles/[id]/photos
// DELETE /api/admin/vehicles/[id]/photos
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getVehicleById, getVehiclePhotos, addVehiclePhoto, deleteVehiclePhoto } from '@/lib/db/vehicles';

/**
 * GET - Obtiene las fotos de un vehículo
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

    // Verificar que el vehículo exista
    const vehicle = await getVehicleById(id);
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    const photos = await getVehiclePhotos(id);

    return NextResponse.json({
      success: true,
      data: photos
    });
  } catch (error) {
    console.error('Error fetching vehicle photos:', error);
    return NextResponse.json(
      { error: 'Error al obtener las fotos' },
      { status: 500 }
    );
  }
}

/**
 * POST - Agrega una foto al vehículo
 * body: { url: string, position?: number }
 */
export async function POST(
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

    // Validar URL requerida
    if (!body.url) {
      return NextResponse.json(
        { error: 'URL de la imagen es requerida' },
        { status: 400 }
      );
    }

    // Validar que sea una URL válida
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json(
        { error: 'URL de imagen inválida' },
        { status: 400 }
      );
    }

    // Verificar que el vehículo exista
    const vehicle = await getVehicleById(id);
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    const photo = await addVehiclePhoto(id, body.url, body.position);

    return NextResponse.json({
      success: true,
      message: 'Foto agregada exitosamente',
      data: photo
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding vehicle photo:', error);
    return NextResponse.json(
      { error: 'Error al agregar la foto' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Elimina una foto del vehículo
 * body: { photoId: string }
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

    const body = await request.json();

    // Validar photoId requerida
    if (!body.photoId) {
      return NextResponse.json(
        { error: 'ID de la foto es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el vehículo exista
    const vehicle = await getVehicleById(id);
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    const success = await deleteVehiclePhoto(body.photoId);

    if (!success) {
      return NextResponse.json(
        { error: 'Foto no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Foto eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting vehicle photo:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la foto' },
      { status: 500 }
    );
  }
}
