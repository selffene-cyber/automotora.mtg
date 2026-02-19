// ============================================================
// API Route - Admin: Gestión de fotos de consignación
// GET /api/admin/consignations/[id]/photos
// POST /api/admin/consignations/[id]/photos
// DELETE /api/admin/consignations/[id]/photos
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  getConsignmentById, 
  getConsignmentPhotos, 
  addConsignmentPhoto, 
  deleteConsignmentPhoto 
} from '@/lib/db/consignments';
import { z } from 'zod';

// ============================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================

/**
 * Schema para agregar foto
 */
const addPhotoSchema = z.object({
  url: z.string().url('URL inválida'),
  position: z.number().int().min(0).optional(),
});

/**
 * Schema para eliminar foto
 */
const deletePhotoSchema = z.object({
  photoId: z.string().uuid('ID de foto inválido'),
});

// ============================================================
// HELPERS
// ============================================================

/**
 * Valida que el ID sea un UUID válido
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ============================================================
// GET - Obtener fotos de consignación
// ============================================================

/**
 * GET - Obtiene las fotos de una consignación
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validar UUID
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de consignación inválido' },
        { status: 400 }
      );
    }

    // Verificar que la consignación exista
    const consignment = await getConsignmentById(id);
    if (!consignment) {
      return NextResponse.json(
        { success: false, error: 'Consignación no encontrada' },
        { status: 404 }
      );
    }

    const photos = await getConsignmentPhotos(id);

    return NextResponse.json({
      success: true,
      data: photos,
    });
  } catch (error) {
    console.error('Error fetching consignment photos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener las fotos' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST - Agregar foto a consignación
// ============================================================

/**
 * POST - Agrega una foto a la consignación
 * 
 * Request body:
 * {
 *   url: string (required) - URL de la imagen,
 *   position?: number - posición de la foto en la galería
 * }
 * 
 * El URL puede ser:
 * - Una URL externa (validada)
 * - Una ruta de R2 (ej: /r2/photos/consignment-uuid/filename.jpg)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validar UUID
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de consignación inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validar con Zod
    const validationResult = addPhotoSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e: { message: string }) => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const { url, position } = validationResult.data;

    // Verificar que la consignación exista
    const consignment = await getConsignmentById(id);
    if (!consignment) {
      return NextResponse.json(
        { success: false, error: 'Consignación no encontrada' },
        { status: 404 }
      );
    }

    // Agregar la foto
    const photo = await addConsignmentPhoto(id, url, position);

    console.log(`[Consignment] Foto agregada a consignación ${id}: ${photo.id}`);

    return NextResponse.json({
      success: true,
      message: 'Foto agregada exitosamente',
      data: photo,
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding consignment photo:', error);
    return NextResponse.json(
      { success: false, error: 'Error al agregar la foto' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE - Eliminar foto de consignación
// ============================================================

/**
 * DELETE - Elimina una foto de la consignación
 * 
 * Request body:
 * {
 *   photoId: string (required) - ID de la foto a eliminar
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validar UUID de consignación
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de consignación inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validar con Zod
    const validationResult = deletePhotoSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e: { message: string }) => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const { photoId } = validationResult.data;

    // Verificar que la consignación exista
    const consignment = await getConsignmentById(id);
    if (!consignment) {
      return NextResponse.json(
        { success: false, error: 'Consignación no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la foto pertenece a esta consignación
    const photos = await getConsignmentPhotos(id);
    const photoExists = photos.some(p => p.id === photoId);
    
    if (!photoExists) {
      return NextResponse.json(
        { success: false, error: 'Foto no encontrada en esta consignación' },
        { status: 404 }
      );
    }

    // Eliminar la foto
    const success = await deleteConsignmentPhoto(photoId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Error al eliminar la foto' },
        { status: 500 }
      );
    }

    console.log(`[Consignment] Foto eliminada de consignación ${id}: ${photoId}`);

    return NextResponse.json({
      success: true,
      message: 'Foto eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error deleting consignment photo:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar la foto' },
      { status: 500 }
    );
  }
}
