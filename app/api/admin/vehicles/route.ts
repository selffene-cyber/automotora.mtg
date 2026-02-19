// ============================================================
// API Route - Admin: Listado y creación de vehículos
// GET /api/admin/vehicles
// POST /api/admin/vehicles
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminVehicles, createVehicle, generateSlug, slugExists } from '@/lib/db/vehicles';
import { VehicleFilters, CreateVehicleInput } from '@/types/vehicle';

/**
 * GET - Lista todos los vehículos para admin (todos los estados)
 * Incluye vehículos draft, hidden, etc.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parsear filtros
    const filters: VehicleFilters = {
      brand: searchParams.get('brand')?.split(',').filter(Boolean),
      model: searchParams.get('model')?.split(',').filter(Boolean),
      status: searchParams.get('status')?.split(',').filter(Boolean) as any,
      
      year_min: searchParams.get('year_min') ? parseInt(searchParams.get('year_min')!) : undefined,
      year_max: searchParams.get('year_max') ? parseInt(searchParams.get('year_max')!) : undefined,
      price_min: searchParams.get('price_min') ? parseInt(searchParams.get('price_min')!) : undefined,
      price_max: searchParams.get('price_max') ? parseInt(searchParams.get('price_max')!) : undefined,
      
      region: searchParams.get('region') || undefined,
      city: searchParams.get('city') || undefined,
      search: searchParams.get('search') || undefined,
      
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    const result = await getAdminVehicles(filters);

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
    console.error('Error fetching admin vehicles:', error);
    return NextResponse.json(
      { error: 'Error al obtener los vehículos' },
      { status: 500 }
    );
  }
}

/**
 * POST - Crea un nuevo vehículo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar campos requeridos
    const requiredFields = ['brand', 'model', 'year', 'price'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Campos requeridos faltantes: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Generar slug si no se proporciona
    let slug = body.slug;
    if (!slug) {
      slug = generateSlug(body.brand, body.model, body.year);
    }

    // Verificar que el slug no exista
    if (await slugExists(slug)) {
      return NextResponse.json(
        { error: 'Ya existe un vehículo con este slug' },
        { status: 409 }
      );
    }

    // Validar año
    const currentYear = new Date().getFullYear();
    if (body.year < 1900 || body.year > currentYear + 1) {
      return NextResponse.json(
        { error: `El año debe estar entre 1900 y ${currentYear + 1}` },
        { status: 400 }
      );
    }

    // Validar precio
    if (body.price < 0) {
      return NextResponse.json(
        { error: 'El precio no puede ser negativo' },
        { status: 400 }
      );
    }

    // Validar transmisión si se proporciona
    if (body.transmission && !['manual', 'auto'].includes(body.transmission)) {
      return NextResponse.json(
        { error: 'La transmisión debe ser "manual" o "auto"' },
        { status: 400 }
      );
    }

    const vehicleData: CreateVehicleInput = {
      slug,
      brand: body.brand,
      model: body.model,
      year: body.year,
      price: body.price,
      mileage_km: body.mileage_km,
      transmission: body.transmission,
      fuel_type: body.fuel_type,
      region: body.region,
      city: body.city,
      description: body.description,
      created_by: body.created_by || null
    };

    const vehicle = await createVehicle(vehicleData);

    return NextResponse.json({
      success: true,
      message: 'Vehículo creado exitosamente',
      data: vehicle
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Error al crear el vehículo' },
      { status: 500 }
    );
  }
}
