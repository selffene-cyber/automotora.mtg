// ============================================================
// Cron Expiration Test
// MTG Automotora - Validation Tests
//
// Test: Simulate past expires_at - reservation becomes expired and vehicle becomes reservable
// Critical for automatic reservation cleanup
// ============================================================

import { getTestDb, createTestVehicle, createTestReservation, cleanupTestData, assert, assertEqual } from './setup';
import { atomicExpireReservation } from '../lib/core/atomic-transactions';

/**
 * Test: Expired reservation should be marked as expired and vehicle released
 */
export async function testCronExpiration(): Promise<void> {
  console.log('[Test] Running: Cron Expiration');
  
  const db = getTestDb();
  
  // Cleanup before test
  await cleanupTestData(db);
  
  // Create a vehicle that is 'reserved' (not 'published')
  const vehicleId = await createTestVehicle(db, {
    id: 'test-expiration-vehicle',
    status: 'reserved', // Vehicle is reserved (not available)
    brand: 'Chevrolet',
    model: 'Camaro',
    year: 2022,
    price: 28000000
  });
  
  // Create reservation with PAST expires_at (1 hour ago)
  const reservationId = await createTestReservation(db, {
    id: 'test-expiration-reservation',
    vehicleId: vehicleId,
    status: 'pending_payment',
    idempotencyKey: 'key-expiration-test',
    customerName: 'Test Customer',
    customerPhone: '+56912345678',
    amount: 100000,
    expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago (expired)
  });
  
  console.log(`[Test] Created expired reservation: ${reservationId}`);
  
  // Run expiration function (simulating cron job)
  const result = await atomicExpireReservation(db, reservationId);
  
  // Should succeed
  assert(result.success, `Expiration should succeed: ${result.error}`);
  
  // Verify: reservation status is 'expired'
  const reservation = await db.prepare(
    'SELECT status FROM reservations WHERE id = ?'
  ).bind(reservationId).first<{ status: string }>();
  
  assertEqual(reservation?.status, 'expired', 'Reservation should be expired');
  
  // Verify: vehicle status is 'published' (reservable again)
  const vehicle = await db.prepare(
    'SELECT status FROM vehicles WHERE id = ?'
  ).bind(vehicleId).first<{ status: string }>();
  
  assertEqual(vehicle?.status, 'published', 'Vehicle should be reservable again (published)');
  
  console.log('[Test] ✓ Cron expiration test passed');
}

/**
 * Test: Active reservation should NOT be expired
 */
export async function testActiveReservationNotExpired(): Promise<void> {
  console.log('[Test] Running: Active Reservation Not Expired');
  
  const db = getTestDb();
  
  // Cleanup before test
  await cleanupTestData(db);
  
  // Create vehicle
  const vehicleId = await createTestVehicle(db, {
    id: 'test-active-vehicle',
    status: 'reserved'
  });
  
  // Create reservation with FUTURE expires_at (not expired)
  const reservationId = await createTestReservation(db, {
    id: 'test-active-reservation',
    vehicleId: vehicleId,
    status: 'pending_payment',
    idempotencyKey: 'key-active-test',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
  });
  
  // Attempt to expire active reservation
  const result = await atomicExpireReservation(db, reservationId);
  
  // Should fail because reservation is not expired yet
  assert(!result.success, 'Expiration should fail for active reservation');
  assert(
    result.error?.includes('activa') || result.error?.includes('not active'),
    `Expected "not active" error, got: ${result.error}`
  );
  
  // Verify: reservation still active
  const reservation = await db.prepare(
    'SELECT status FROM reservations WHERE id = ?'
  ).bind(reservationId).first<{ status: string }>();
  
  assertEqual(reservation?.status, 'pending_payment', 'Reservation should remain active');
  
  // Verify: vehicle still reserved
  const vehicle = await db.prepare(
    'SELECT status FROM vehicles WHERE id = ?'
  ).bind(vehicleId).first<{ status: string }>();
  
  assertEqual(vehicle?.status, 'reserved', 'Vehicle should remain reserved');
  
  console.log('[Test] ✓ Active reservation not expired test passed');
}

/**
 * Test: Already expired reservation should not be processed again
 */
export async function testAlreadyExpiredReservation(): Promise<void> {
  console.log('[Test] Running: Already Expired Reservation');
  
  const db = getTestDb();
  
  // Cleanup before test
  await cleanupTestData(db);
  
  // Create vehicle (published since reservation is already expired)
  const vehicleId = await createTestVehicle(db, {
    id: 'test-already-expired-vehicle',
    status: 'published'
  });
  
  // Create already expired reservation
  const reservationId = await createTestReservation(db, {
    id: 'test-already-expired-reservation',
    vehicleId: vehicleId,
    status: 'expired', // Already expired
    idempotencyKey: 'key-already-expired-test',
    expiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
  });
  
  // Attempt to expire again
  const result = await atomicExpireReservation(db, reservationId);
  
  // Should fail because reservation is already in terminal state
  assert(!result.success, 'Should fail for already expired reservation');
  
  console.log('[Test] ✓ Already expired reservation test passed');
}

/**
 * Test: Multiple expired reservations should all be processed
 */
export async function testMultipleExpiredReservations(): Promise<void> {
  console.log('[Test] Running: Multiple Expired Reservations');
  
  const db = getTestDb();
  
  // Cleanup before test
  await cleanupTestData(db);
  
  // Create multiple vehicles and reservations
  const vehicleIds: string[] = [];
  const reservationIds: string[] = [];
  
  for (let i = 0; i < 3; i++) {
    const vehicleId = await createTestVehicle(db, {
      id: `test-multi-vehicle-${i}`,
      status: 'reserved',
      brand: 'BMW',
      model: `Series ${i}`,
      year: 2023 - i,
      price: 25000000 - (i * 1000000)
    });
    vehicleIds.push(vehicleId);
    
    const reservationId = await createTestReservation(db, {
      id: `test-multi-reservation-${i}`,
      vehicleId: vehicleId,
      status: 'pending_payment',
      idempotencyKey: `key-multi-test-${i}`,
      expiresAt: new Date(Date.now() - (i + 1) * 60 * 60 * 1000).toISOString() // Staggered expiration
    });
    reservationIds.push(reservationId);
  }
  
  console.log(`[Test] Created ${reservationIds.length} expired reservations`);
  
  // Expire each reservation
  let successCount = 0;
  for (const reservationId of reservationIds) {
    const result = await atomicExpireReservation(db, reservationId);
    if (result.success) {
      successCount++;
    }
  }
  
  // All should succeed
  assertEqual(successCount, 3, 'All expired reservations should be processed');
  
  // Verify all vehicles are now published
  for (const vehicleId of vehicleIds) {
    const vehicle = await db.prepare(
      'SELECT status FROM vehicles WHERE id = ?'
    ).bind(vehicleId).first<{ status: string }>();
    
    assertEqual(vehicle?.status, 'published', 'Each vehicle should be published');
  }
  
  console.log('[Test] ✓ Multiple expired reservations test passed');
}

/**
 * Test: Reservation in paid status should also be expired
 */
export async function testPaidReservationExpiration(): Promise<void> {
  console.log('[Test] Running: Paid Reservation Expiration');
  
  const db = getTestDb();
  
  // Cleanup before test
  await cleanupTestData(db);
  
  // Create vehicle
  const vehicleId = await createTestVehicle(db, {
    id: 'test-paid-vehicle',
    status: 'reserved'
  });
  
  // Create paid reservation that's expired
  const reservationId = await createTestReservation(db, {
    id: 'test-paid-reservation',
    vehicleId: vehicleId,
    status: 'paid', // Already paid but expired
    idempotencyKey: 'key-paid-expired-test',
    expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // Expired
  });
  
  // Run expiration
  const result = await atomicExpireReservation(db, reservationId);
  
  // Should succeed (paid reservations can expire too)
  assert(result.success, `Paid reservation expiration should succeed: ${result.error}`);
  
  // Verify status
  const reservation = await db.prepare(
    'SELECT status FROM reservations WHERE id = ?'
  ).bind(reservationId).first<{ status: string }>();
  
  assertEqual(reservation?.status, 'expired', 'Paid reservation should be expired');
  
  console.log('[Test] ✓ Paid reservation expiration test passed');
}

/**
 * Run all cron expiration tests
 */
export async function runCronExpirationTests(): Promise<void> {
  console.log('========================================');
  console.log('Running Cron Expiration Tests');
  console.log('========================================');
  
  try {
    await testCronExpiration();
    await testActiveReservationNotExpired();
    await testAlreadyExpiredReservation();
    await testMultipleExpiredReservations();
    await testPaidReservationExpiration();
    
    console.log('========================================');
    console.log('✓ All cron expiration tests passed');
    console.log('========================================');
  } catch (error) {
    console.error('Cron expiration tests failed:', error);
    throw error;
  }
}

// Export for direct execution
export default runCronExpirationTests;
