// ============================================================
// Concurrency Test - Concurrent Reservation Attempts
// MTG Automotora - Validation Tests
// 
// Test: 2 simultaneous requests to atomicCreateReservation() - only 1 should succeed
// Critical for preventing double-booking in production
// ============================================================

import { atomicCreateReservation } from '../lib/core/atomic-transactions';
import { getTestDb, createTestVehicle, cleanupTestData, assert, assertEqual } from './setup';

/**
 * Test: Concurrent reservations - only one should succeed
 * 
 * This tests the critical race condition where two customers
 * try to reserve the same vehicle at the exact same time.
 * Only ONE should succeed, the other should fail with appropriate error.
 */
export async function testConcurrentReservations(): Promise<void> {
  console.log('[Test] Running: Concurrent Reservations');
  
  const db = getTestDb();
  
  // Cleanup before test
  await cleanupTestData(db);
  
  // Create a published vehicle
  const vehicleId = await createTestVehicle(db, {
    id: 'test-concurrent-vehicle',
    status: 'published',
    brand: 'Honda',
    model: 'Civic',
    year: 2024,
    price: 18000000
  });
  
  console.log(`[Test] Created vehicle: ${vehicleId}`);
  
  // Two concurrent reservation attempts with different idempotency keys
  const reservation1Data = {
    customer_name: 'John Doe',
    customer_phone: '+56911111111',
    customer_email: 'john@example.com',
    amount: 100000,
    idempotency_key: 'key-concurrent-1'
  };
  
  const reservation2Data = {
    customer_name: 'Jane Smith',
    customer_phone: '+56922222222',
    customer_email: 'jane@example.com',
    amount: 100000,
    idempotency_key: 'key-concurrent-2'
  };
  
  // Execute both reservations concurrently
  const [result1, result2] = await Promise.allSettled([
    atomicCreateReservation(db, vehicleId, reservation1Data),
    atomicCreateReservation(db, vehicleId, reservation2Data)
  ]);
  
  console.log('[Test] Results:', { result1, result2 });
  
  // Analyze results
  const success1 = result1.status === 'fulfilled' && result1.value.success;
  const success2 = result2.status === 'fulfilled' && result2.value.success;
  
  // Exactly one should succeed
  const successCount = (success1 ? 1 : 0) + (success2 ? 1 : 0);
  
  console.log(`[Test] Success count: ${successCount}`);
  
  // Assert: Exactly one reservation should succeed
  assert(
    successCount === 1,
    `Expected exactly 1 successful reservation, got ${successCount}`
  );
  
  // Verify vehicle is now reserved
  const vehicle = await db.prepare(
    'SELECT status FROM vehicles WHERE id = ?'
  ).bind(vehicleId).first<{ status: string }>();
  
  assertEqual(vehicle?.status, 'reserved', 'Vehicle should be reserved');
  
  // Verify exactly one reservation exists
  const reservationCount = await db.prepare(
    'SELECT COUNT(*) as count FROM reservations WHERE vehicle_id = ?'
  ).bind(vehicleId).first<{ count: number }>();
  
  assertEqual(reservationCount?.count, 1, 'Should have exactly 1 reservation');
  
  console.log('[Test] ✓ Concurrent reservations test passed');
}

/**
 * Test: Same idempotency key - should fail on second attempt
 */
export async function testIdempotencyKeyCollision(): Promise<void> {
  console.log('[Test] Running: Idempotency Key Collision');
  
  const db = getTestDb();
  
  // Cleanup before test
  await cleanupTestData(db);
  
  // Create a published vehicle
  const vehicleId = await createTestVehicle(db, {
    id: 'test-idempotency-vehicle',
    status: 'published'
  });
  
  const sameIdempotencyKey = 'same-key-123';
  
  // First reservation should succeed
  const result1 = await atomicCreateReservation(db, vehicleId, {
    customer_name: 'First Customer',
    customer_phone: '+56911111111',
    amount: 100000,
    idempotency_key: sameIdempotencyKey
  });
  
  assert(result1.success, 'First reservation should succeed');
  
  // Second reservation with SAME idempotency key should fail
  const result2 = await atomicCreateReservation(db, vehicleId, {
    customer_name: 'Second Customer',
    customer_phone: '+56922222222',
    amount: 100000,
    idempotency_key: sameIdempotencyKey
  });
  
  assert(!result2.success, 'Second reservation with same key should fail');
  
  // Verify only one reservation exists
  const count = await db.prepare(
    'SELECT COUNT(*) as count FROM reservations WHERE idempotency_key = ?'
  ).bind(sameIdempotencyKey).first<{ count: number }>();
  
  assertEqual(count?.count, 1, 'Should have exactly 1 reservation');
  
  console.log('[Test] ✓ Idempotency key collision test passed');
}

/**
 * Test: Vehicle already reserved - should fail
 */
export async function testVehicleAlreadyReserved(): Promise<void> {
  console.log('[Test] Running: Vehicle Already Reserved');
  
  const db = getTestDb();
  
  // Cleanup before test
  await cleanupTestData(db);
  
  // Create a reserved vehicle (simulating existing reservation)
  const vehicleId = await createTestVehicle(db, {
    id: 'test-reserved-vehicle',
    status: 'reserved' // Vehicle is already reserved
  });
  
  // Attempt to create another reservation
  const result = await atomicCreateReservation(db, vehicleId, {
    customer_name: 'New Customer',
    customer_phone: '+56912345678',
    amount: 100000,
    idempotency_key: 'key-reserved-test'
  });
  
  // Should fail because vehicle is already reserved
  assert(!result.success, 'Reservation should fail for reserved vehicle');
  assert(
    result.error?.includes('no está disponible'),
    `Expected "not available" error, got: ${result.error}`
  );
  
  console.log('[Test] ✓ Vehicle already reserved test passed');
}

/**
 * Run all concurrency tests
 */
export async function runConcurrencyTests(): Promise<void> {
  console.log('========================================');
  console.log('Running Concurrency Tests');
  console.log('========================================');
  
  try {
    await testConcurrentReservations();
    await testIdempotencyKeyCollision();
    await testVehicleAlreadyReserved();
    
    console.log('========================================');
    console.log('✓ All concurrency tests passed');
    console.log('========================================');
  } catch (error) {
    console.error('Concurrency tests failed:', error);
    throw error;
  }
}

// Export for direct execution
export default runConcurrencyTests;
