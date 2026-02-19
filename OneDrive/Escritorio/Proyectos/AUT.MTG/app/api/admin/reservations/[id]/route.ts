// ============================================================
// API de Reserva Individual - Admin
// MTG Automotora - Plataforma MVP
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  getReservationById, 
  updateReservationStatus,
  confirmReservation,
  cancelReservation,
  refundReservation,
  expireReservation,
  confirmPayment
} from '@/lib/db/reservations';
import { updateVehicleStatus } from '@/lib/db/vehicles';
import { isValidStatusTransition } from '@/lib/core/reservation-guards';
import type { ReservationStatus } from '@/types/reservation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/reservations/[id]
 * Obtiene los detalles de una reserva
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const reservation = await getReservationById(id);

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ reservation });

  } catch (error) {
    console.error('Error fetching reservation:', error);
    return NextResponse.json(
      { error: 'Error al obtener la reserva' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/reservations/[id]
 * Actualiza el estado de una reserva (override manual)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: { status?: ReservationStatus; payment_id?: string } = await request.json();

    // Obtener la reserva actual
    const currentReservation = await getReservationById(id);
    if (!currentReservation) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    // Si solo se proporciona payment_id (confirmar pago manualmente)
    if (body.payment_id && !body.status) {
      const updated = await confirmPayment(id, body.payment_id);
      
      // Actualizar estado del vehículo a 'reserved'
      await updateVehicleStatus(currentReservation.vehicle_id, 'reserved');
      
      return NextResponse.json({
        success: true,
        reservation: updated
      });
    }

    // Validar transición de estado
    if (body.status) {
      const isValid = isValidStatusTransition(currentReservation.status, body.status);
      if (!isValid) {
        return NextResponse.json(
          { 
            error: `Transición de estado inválida: ${currentReservation.status} → ${body.status}` 
          },
          { status: 400 }
        );
      }

      // Actualizar estado de la reserva
      const updated = await updateReservationStatus(id, body.status);

      // Si se confirma o reserva, actualizar estado del vehículo
      if (body.status === 'confirmed' || body.status === 'paid') {
        await updateVehicleStatus(currentReservation.vehicle_id, 'reserved');
      }

      // Si se cancela o rembolsa, liberar el vehículo
      if (body.status === 'cancelled' || body.status === 'refunded') {
        await updateVehicleStatus(currentReservation.vehicle_id, 'published');
      }

      return NextResponse.json({
        success: true,
        reservation: updated
      });
    }

    return NextResponse.json(
      { error: 'Debe proporcionar status o payment_id' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error updating reservation:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la reserva' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/reservations/[id]
 * Acciones específicas sobre la reserva
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: { action: 'confirm' | 'cancel' | 'refund' | 'expire'; payment_id?: string } = await request.json();

    // Obtener la reserva actual
    const currentReservation = await getReservationById(id);
    if (!currentReservation) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    let updated = null;

    switch (body.action) {
      case 'confirm':
        updated = await confirmReservation(id);
        // Reservar el vehículo
        await updateVehicleStatus(currentReservation.vehicle_id, 'reserved');
        break;

      case 'cancel':
        updated = await cancelReservation(id);
        // Liberar el vehículo
        await updateVehicleStatus(currentReservation.vehicle_id, 'published');
        break;

      case 'refund':
        updated = await refundReservation(id);
        // Liberar el vehículo
        await updateVehicleStatus(currentReservation.vehicle_id, 'published');
        break;

      case 'expire':
        updated = await expireReservation(id);
        // Liberar el vehículo
        await updateVehicleStatus(currentReservation.vehicle_id, 'published');
        break;

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      reservation: updated
    });

  } catch (error) {
    console.error('Error performing action on reservation:', error);
    return NextResponse.json(
      { error: 'Error al realizar la acción' },
      { status: 500 }
    );
  }
}
