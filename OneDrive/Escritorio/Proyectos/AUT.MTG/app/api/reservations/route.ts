// ============================================================
// API de Reservas - Público
// MTG Automotora - Plataforma MVP
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createReservation, getReservationByIdempotencyKey, idempotencyKeyExists, getActiveReservationForVehicle } from '@/lib/db/reservations';
import { getVehicleById } from '@/lib/db/vehicles';
import type { CreateReservationInput } from '@/types/reservation';

// Enable Edge runtime for Cloudflare Pages D1 bindings
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * POST /api/reservations
 * Crea una nueva reserva
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateReservationInput = await request.json();

    // Validar campos requeridos
    if (!body.vehicle_id || !body.customer_name || !body.customer_phone || !body.amount || !body.idempotency_key) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: vehicle_id, customer_name, customer_phone, amount, idempotency_key' },
        { status: 400 }
      );
    }

    // Validar monto mínimo (ej: 100000 CLP)
    if (body.amount < 100000) {
      return NextResponse.json(
        { error: 'El monto mínimo de reserva es de $100.000 CLP' },
        { status: 400 }
      );
    }

    // Verificar idempotency key para evitar duplicados
    const existingKey = await idempotencyKeyExists(body.idempotency_key);
    if (existingKey) {
      const existing = await getReservationByIdempotencyKey(body.idempotency_key);
      return NextResponse.json(
        { 
          error: 'Ya existe una reserva con esta clave de idempotencia',
          reservation: existing
        },
        { status: 409 }
      );
    }

    // Verificar que el vehículo existe y está publicado
    const vehicle = await getVehicleById(body.vehicle_id);
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    if (vehicle.status !== 'published') {
      return NextResponse.json(
        { error: 'El vehículo no está disponible para reserva. Estado actual: ' + vehicle.status },
        { status: 400 }
      );
    }

    // Verificar si el vehículo ya tiene una reserva activa
    const activeReservation = await getActiveReservationForVehicle(body.vehicle_id);
    if (activeReservation) {
      return NextResponse.json(
        { 
          error: 'El vehículo ya tiene una reserva activa',
          existingReservation: {
            id: activeReservation.id,
            status: activeReservation.status,
            expires_at: activeReservation.expires_at
          }
        },
        { status: 409 }
      );
    }

    // Crear la reserva
    const reservation = await createReservation(body);

    // TODO: Aquí se integraría con el gateway de pago
    // Por ahora, retornamos los datos para iniciar el pago
    const paymentData = {
      reservation_id: reservation.id,
      amount: reservation.amount,
      vehicle: {
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        slug: vehicle.slug
      },
      expires_at: reservation.expires_at,
      // En una implementación real, aquí se retornaría la URL del gateway
      payment_gateway_url: `/checkout/${reservation.id}`,
      instructions: 'Por favor, completa el pago dentro de las 48 horas para confirmar tu reserva.'
    };

    return NextResponse.json({
      success: true,
      reservation,
      payment: paymentData
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { error: 'Error al crear la reserva' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reservations
 * Consulta el estado de una reserva por idempotency_key o phone
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idempotencyKey = searchParams.get('idempotency_key');
    const phone = searchParams.get('phone');

    if (!idempotencyKey && !phone) {
      return NextResponse.json(
        { error: 'Debe proporcionar idempotency_key o phone' },
        { status: 400 }
      );
    }

    let reservation = null;

    if (idempotencyKey) {
      reservation = await getReservationByIdempotencyKey(idempotencyKey);
    }

    if (!reservation && phone) {
      // Buscar por teléfono (devolver la más reciente)
      const { getReservations } = await import('@/lib/db/reservations');
      const result = await getReservations({ 
        customer_phone: phone, 
        limit: 1 
      });
      reservation = result.reservations[0] || null;
    }

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    // Calcular tiempo restante
    const now = new Date();
    const expires = new Date(reservation.expires_at);
    const hoursRemaining = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60)));

    return NextResponse.json({
      reservation: {
        id: reservation.id,
        status: reservation.status,
        amount: reservation.amount,
        expires_at: reservation.expires_at,
        hours_remaining: hoursRemaining,
        vehicle: reservation.vehicle
      }
    });

  } catch (error) {
    console.error('Error fetching reservation:', error);
    return NextResponse.json(
      { error: 'Error al consultar la reserva' },
      { status: 500 }
    );
  }
}
