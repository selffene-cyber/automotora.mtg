// ============================================================
// API Route - Vehículo individual por slug (público)
// GET /api/vehicles/[id]
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getVehicleBySlug } from '@/lib/db/vehicles';

// Enable Edge runtime for Cloudflare Pages D1 bindings
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * GET - Obtiene un vehículo por su slug
 * Solo devuelve vehículos con status = 'published'
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const slug = params.id;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug es requerido' },
        { status: 400 }
      );
    }

    const vehicle = await getVehicleBySlug(slug);

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el vehículo esté publicado
    if (vehicle.status !== 'published') {
      return NextResponse.json(
        { error: 'Vehículo no disponible' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    console.error('Error fetching vehicle by slug:', error);
    return NextResponse.json(
      { error: 'Error al obtener el vehículo' },
      { status: 500 }
    );
  }
}
