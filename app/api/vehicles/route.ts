// ============================================================
// API Route - Listado público de vehículos
// GET /api/vehicles
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getVehicles } from '@/lib/db/vehicles';
import { VehicleFilters } from '@/types/vehicle';

// Enable Edge runtime for Cloudflare Pages D1 bindings
export const runtime = 'edge';

export const dynamic = 'force-dynamic';

/**
 * GET - Lista vehículos publicados con filtros
 * Solo devuelve vehículos con status = 'published'
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parsear filtros desde query params
    const filters: VehicleFilters = {
      // Arrays - separados por coma
      brand: searchParams.get('brand')?.split(',').filter(Boolean),
      model: searchParams.get('model')?.split(',').filter(Boolean),
      status: searchParams.get('status')?.split(',').filter(Boolean) as any,
      
      // Rangos numéricos
      year_min: searchParams.get('year_min') ? parseInt(searchParams.get('year_min')!) : undefined,
      year_max: searchParams.get('year_max') ? parseInt(searchParams.get('year_max')!) : undefined,
      price_min: searchParams.get('price_min') ? parseInt(searchParams.get('price_min')!) : undefined,
      price_max: searchParams.get('price_max') ? parseInt(searchParams.get('price_max')!) : undefined,
      
      // Strings exactos
      region: searchParams.get('region') || undefined,
      city: searchParams.get('city') || undefined,
      search: searchParams.get('search') || undefined,
      
      // Paginación
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    // Validar parámetros
    if (filters.limit && (filters.limit < 1 || filters.limit > 100)) {
      return NextResponse.json(
        { error: 'El límite debe estar entre 1 y 100' },
        { status: 400 }
      );
    }

    if (filters.offset && filters.offset < 0) {
      return NextResponse.json(
        { error: 'El offset no puede ser negativo' },
        { status: 400 }
      );
    }

    // Solo vehículos publicados para público
    const result = await getVehicles(filters);

    return NextResponse.json({
      success: true,
      data: result.vehicles,
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: filters.offset! + result.vehicles.length < result.total
      }
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Error al obtener los vehículos' },
      { status: 500 }
    );
  }
}
