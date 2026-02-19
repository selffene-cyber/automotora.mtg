// ============================================================
// Webhook Idempotency Test
// MTG Automotora - Validation Tests
//
// Test: Same webhook event sent 3 times - should not change state or duplicate
// Critical for payment webhook reliability
// ============================================================

import { getTestDb, createTestVehicle, createTestReservation, cleanupTestData, assert, assertEqual } from './setup';
import { getReservationByIdempotencyKey, confirmPayment } from '../lib/db/reservations';
import { updateVehicleStatus } from '../lib/db/vehicles';
import { canTransitionToPaid, isExpired } from '../lib/core/reservation-guards';

/**
 * Simulates the payment webhook processing logic
 * This is the core idempotency logic being tested
 */
async function processPaymentWebhook(
  db: any,
  payload: {
    idempotency_key: string;
    payment_id: string;
    status: 'completed' | 'failed' | 'pending' | 'refunded';
    amount?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find reservation by idempotency key
    const reservation = await getReservationByIdempotencyKey(payload.idempotency_key);
    
    if (!reservation) {
      return { success: false, error: 'Reserva no encontrada' };
    }
    
    // Check if expired
    if (isExpired(reservation.expires_at)) {
      return { success: false, error: 'Reserva expirada' };
    }
    
    // Check if can transition to paid
    if (!canTransitionToPaid(reservation.status)) {
      return { 
        success: false, 
        error: `La reserva no puede recibir pagos en estado: ${reservation.status}` 
      };
    }
    
    // Process payment (only if completed)
    if (payload.status === 'completed') {
      await confirmPayment(reservation.id, payload.payment_id);
      await updateVehicleStatus(reservation.vehicle_id, 'reserved');
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Test: Webhook called 3 times with same idempotency key
 * Should only process once, subsequent calls should be idempotent
 */
export async function testWebhookIdempotency(): Promise<void> {
  console.log('[Test] Running: Webhook Idempotency');
  
  const db = getTestDb();
  
  // Cleanup before test
  await cleanupTestData(db);
  
  // Create a vehicle
  const vehicleId = await createTestVehicle(db, {
    id: 'test-webhook-vehicle',
    status: 'reserved', // Vehicle is reserved because of pending reservation
    brand: 'Ford',
    model: 'Mustang',
    year: 2023,
    price: 35000000
  });
  
  // Create a pending reservation with idempotency key
  const idempotencyKey = 'webhook-event-test-123';
  const reservationId = await createTestReservation(db, {
    id: 'test-webhook-reservation',
    vehicleId: vehicleId,
    status: 'pending_payment',
    idempotencyKey: idempotencyKey,
    customerName: 'Test Customer',
    customerPhone: '+56912345678',
    amount: 100000,
    // Set expires_at to future (48 hours from now)
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  });
  
  console.log(`[Test] Created reservation: ${reservationId}`);
  
  // Call webhook 3 times with same idempotency key
  const result1 = await processPaymentWebhook(db, {
    idempotency_key: idempotencyKey,
    payment_id: 'pay-12345',
    status: 'completed'
  });
  
  const result2 = await processPaymentWebhook(db, {
    idempotency_key: idempotencyKey,
    payment_id: 'pay-12345',
    status: 'completed'
  });
  
  const result3 = await processPaymentWebhook(db, {
    idempotency_key: idempotencyKey,
    payment_id: 'pay-12345',
    status: 'completed'
  });
  
  console.log('[Test] Webhook results:', { result1, result2, result3 });
  
  // All should return success (idempotent behavior)
  assert(result1.success === true, 'First webhook call should succeed');
  assert(result2.success === true, 'Second webhook call should succeed (idempotent)');
  assert(result3.success === true, 'Third webhook call should succeed (idempotent)');
  
  // Check: only ONE reservation record exists (not duplicated)
  const count = await db.prepare(
    'SELECT COUNT(*) as c FROM reservations WHERE idempotency_key = ?'
  ).bind(idempotencyKey).first<{ c: number }>();
  
  assertEqual(count?.c, 1, 'Should only have one reservation record');
  
  // Check: status is 'paid' not duplicated or changed incorrectly
  const reservation = await db.prepare(
    'SELECT status, payment_id FROM reservations WHERE idempotency_key = ?'
  ).bind(idempotencyKey).first<{ status: string; payment_id: string | null }>();
  
  assertEqual(reservation?.status, 'paid', 'Reservation status should be paid');
  assertEqual(reservation?.payment_id, 'pay-12345', 'Payment ID should be recorded');
  
  console.log('[Test] ✓ Webhook idempotency test passed');
}

/**
 * Test: Webhook with different payment status should handle correctly
 */
export async function testWebhookDifferentStatuses(): Promise<void> {
  console.log('[Test] Running: Webhook Different Statuses');
  
  const db = getTestDb();
  
  // Cleanup before test
  await cleanupTestData(db);
  
  // Test 'failed' status
  const vehicleId1 = await createTestVehicle(db, {
    id: 'test-failed-vehicle',
    status: 'reserved'
  });
  
  const reservationId1 = await createTestReservation(db, {
    id: 'test-failed-reservation',
    vehicleId: vehicleId1,
    status: 'pending_payment',
    idempotencyKey: 'key-failed-test'
  });
  
  const failedResult = await processPaymentWebhook(db, {
    idempotency_key: 'key-failed-test',
    payment_id: 'pay-failed',
    status: 'failed'
  });
  
  assert(failedResult.success === true, 'Failed payment webhook should succeed');
  
  // Verify vehicle is released
  const vehicle1 = await db.prepare(
    'SELECT status FROM vehicles WHERE id = ?'
  ).bind(vehicleId1).first<{ status: string }>();
  
  assertEqual(vehicle1?.status, 'published', 'Vehicle should be released on failed payment');
  
  // Test 'pending' status - should not change anything
  const vehicleId2 = await createTestVehicle(db, {
    id: 'test-pending-vehicle',
    status: 'reserved'
  });
  
  await createTestReservation(db, {
    id: 'test-pending-reservation',
    vehicleId: vehicleId2,
    status: 'pending_payment',
    idempotencyKey: 'key-pending-test'
  });
  
  const pendingResult = await processPaymentWebhook(db, {
    idempotency_key: 'key-pending-test',
    payment_id: 'pay-pending',
    status: 'pending'
  });
  
  assert(pendingResult.success === true, 'Pending payment webhook should succeed');
  
  // Verify status unchanged
  const reservation2 = await db.prepare(
    'SELECT status FROM reservations WHERE idempotency_key = ?'
  ).bind('key-pending-test').first<{ status: string }>();
  
  assertEqual(reservation2?.status, 'pending_payment', 'Status should remain pending_payment');
  
  console.log('[Test] ✓ Webhook different statuses test passed');
}

/**
 * Test: Webhook on expired reservation should fail gracefully
 */
export async function testWebhookOnExpiredReservation(): Promise<void> {
  console.log('[Test] Running: Webhook on Expired Reservation');
  
  const db = getTestDb();
  
  // Cleanup before test
  await cleanupTestData(db);
  
  // Create vehicle
  const vehicleId = await createTestVehicle(db, {
    id: 'test-expired-vehicle',
    status: 'published' // Available again since reservation expired
  });
  
  // Create reservation with PAST expires_at (already expired)
  const reservationId = await createTestReservation(db, {
    id: 'test-expired-reservation',
    vehicleId: vehicleId,
    status: 'pending_payment',
    idempotencyKey: 'key-expired-test',
    expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
  });
  
  // Attempt to process webhook on expired reservation
  const result = await processPaymentWebhook(db, {
    idempotency_key: 'key-expired-test',
    payment_id: 'pay-expired',
    status: 'completed'
  });
  
  // Should fail because reservation is expired
  assert(result.success === false, 'Webhook should fail for expired reservation');
  assert(
    result.error?.includes('expirada'),
    `Expected "expired" error, got: ${result.error}`
  );
  
  console.log('[Test] ✓ Webhook on expired reservation test passed');
}

/**
 * Run all webhook idempotency tests
 */
export async function runWebhookIdempotencyTests(): Promise<void> {
  console.log('========================================');
  console.log('Running Webhook Idempotency Tests');
  console.log('========================================');
  
  try {
    await testWebhookIdempotency();
    await testWebhookDifferentStatuses();
    await testWebhookOnExpiredReservation();
    
    console.log('========================================');
    console.log('✓ All webhook idempotency tests passed');
    console.log('========================================');
  } catch (error) {
    console.error('Webhook idempotency tests failed:', error);
    throw error;
  }
}

// Export for direct execution
export default runWebhookIdempotencyTests;
