// ============================================================
// API de Reservas - Admin
// MTG Automotora - Plataforma MVP
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getReservations, createReservation, getReservationStats } from '@/lib/db/reservations';
import type { ReservationFilters, CreateReservationInput } from '@/types/reservation';

/**
 * GET /api/admin/reservations
 * Lista todas las reservas con filtros
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parsear filtros
    const filters: ReservationFilters = {
      status: searchParams.get('status')?.split(',').filter(Boolean) as ReservationFilters['status'],
      vehicle_id: searchParams.get('vehicle_id') || undefined,
      customer_phone: searchParams.get('customer_phone') || undefined,
      created_after: searchParams.get('created_after') || undefined,
      created_before: searchParams.get('created_before') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    const { reservations, total } = await getReservations(filters);

    // También obtener estadísticas
    const stats = await getReservationStats();

    return NextResponse.json({
      reservations,
      total,
      limit: filters.limit,
      offset: filters.offset,
      stats
    });

  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: 'Error al obtener las reservas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/reservations
 * Crea una reserva manualmente (admin)
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateReservationInput & { user_id?: string } = await request.json();

    // Validar campos requeridos
    if (!body.vehicle_id || !body.customer_name || !body.customer_phone || !body.amount || !body.idempotency_key) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: vehicle_id, customer_name, customer_phone, amount, idempotency_key' },
        { status: 400 }
      );
    }

    // Verificar que el vehículo existe
    const { getVehicleById } = await import('@/lib/db/vehicles');
    const vehicle = await getVehicleById(body.vehicle_id);
    
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    // Verificar idempotency key
    const { idempotencyKeyExists } = await import('@/lib/db/reservations');
    const existingKey = await idempotencyKeyExists(body.idempotency_key);
    if (existingKey) {
      return NextResponse.json(
        { error: 'Ya existe una reserva con esta clave de idempotencia' },
        { status: 409 }
      );
    }

    // Crear la reserva con usuario admin (si se proporciona)
    const { createReservation } = await import('@/lib/db/reservations');
    const reservation = await createReservation(body, body.user_id || null);

    return NextResponse.json({
      success: true,
      reservation
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { error: 'Error al crear la reserva' },
      { status: 500 }
    );
  }
}
