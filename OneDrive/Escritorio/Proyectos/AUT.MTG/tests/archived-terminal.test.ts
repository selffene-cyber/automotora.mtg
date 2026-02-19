// ============================================================
// Archived Terminal State Test
// MTG Automotora - Validation Tests
//
// Test: Attempt to unarchive/transition archived vehicle - should fail by state machine
// Critical for preventing invalid state transitions
// ============================================================

import { atomicPublishVehicle, atomicMarkVehicleSold, atomicArchiveVehicle } from '../lib/core/atomic-transactions';
import { canTransitionVehicle, isArchived } from '../lib/core/state-machine';
import { getTestDb, createTestVehicle, cleanupTestData, assert, assertEqual } from './setup';

/**
 * Test: Attempt to publish archived vehicle - should fail
 */
export async function testArchivedTerminalPublish(): Promise<void> {
  console.log('[Test] Running: Archived Terminal - Publish Attempt');
  
  const db = getTestDb();
  
  // Cleanup before test
  await cleanupTestData(db);
  
  // Setup: vehicle is 'archived'
  const vehicleId = await createTestVehicle(db, {
    id: 'test-archived-vehicle',
    status: 'archived',
    brand: 'Tesla',
    model: 'Model S',
    year: 2021,
    price: 45000000
  });
  
  console.log(`[Test] Created archived vehicle: ${vehicleId}`);
  
  // Attempt to transition to 'published'
  const result = await atomicPublishVehicle(db, vehicleId);
  
  // Should fail
  assert(result.success === false, 'Publishing archived vehicle should fail');
  assert(
    result.error?.includes('archived') || result.error?.includes('publicar'),
    `Expected "archived" or "publish" error, got: ${result.error}`
  );
  
  // Verify: still archived
  const vehicle = await db.prepare(
    'SELECT status FROM vehicles WHERE id = ?'
  ).bind(vehicleId).first<{ status: string }>();
  
  assertEqual(vehicle?.status, 'archived', 'Vehicle should remain archived');
  
  console.log('[Test] ✓ Archived terminal publish test passed');
}

/**
 * Test: Attempt to mark archived vehicle as sold - should fail
 */
export async function testArchivedTerminalSold(): Promise<void> {
  console.log('[Test] Running: Archived Terminal - Sold Attempt');
  
  const db = getTestDb();
  
  // Cleanup before test
  await cleanupTestData(db);
  
  // Setup: vehicle is 'archived'
  const vehicleId = await createTestVehicle(db, {
    id: 'test-archived-sold-vehicle',
    status: 'archived'
  });
  
  // Attempt to mark as sold
  const result = await atomicMarkVehicleSold(db, vehicleId);
  
  // Should fail
  assert(result.success === false, 'Marking archived vehicle as sold should fail');
  
  // Verify: still archived
  const vehicle = await db.prepare(
    'SELECT status FROM vehicles WHERE id = ?'
  ).bind(vehicleId).first<{ status: string }>();
  
  assertEqual(vehicle?.status, 'archived', 'Vehicle should remain archived');
  
  console.log('[Test] ✓ Archived terminal sold test passed');
}

/**
 * Test: Attempt to archive already archived vehicle - should fail
 */
export async function testArchivedTerminalArchive(): Promise<void> {
  console.log('[Test] Running: Archived Terminal - Archive Attempt');
  
  const db = getTestDb();
  
  // Cleanup before test
  await cleanupTestData(db);
  
  // Setup: vehicle is 'archived'
  const vehicleId = await createTestVehicle(db, {
    id: 'test-double-archive-vehicle',
    status: 'archived'
  });
  
  // Attempt to archive again
  const result = await atomicArchiveVehicle(db, vehicleId, 'admin-user-1');
  
  // Should fail (already archived)
  assert(result.success === false, 'Archiving already archived vehicle should fail');
  
  console.log('[Test] ✓ Archived terminal archive test passed');
}

/**
 * Test: isArchived helper function works correctly
 */
export async function testIsArchivedHelper(): Promise<void> {
  console.log('[Test] Running: isArchived Helper Function');
  
  // Test with archived status
  assert(isArchived('archived') === true, 'Should return true for archived');
  
  // Test with other statuses
  assert(isArchived('published') === false, 'Should return false for published');
  assert(isArchived('reserved') === false, 'Should return false for reserved');
  assert(isArchived('sold') === false, 'Should return false for sold');
  assert(isArchived('draft') === false, 'Should return false for draft');
  assert(isArchived('hidden') === false, 'Should return false for hidden');
  
  console.log('[Test] ✓ isArchived helper test passed');
}

/**
 * Test: State machine allows no transitions from archived
 */
export async function testStateMachineNoTransitionsFromArchived(): Promise<void> {
  console.log('[Test] Running: State Machine No Transitions From Archived');
  
  // archived -> published should NOT be allowed
  assert(
    canTransitionVehicle('archived', 'published') === false,
    'Should not allow: archived -> published'
  );
  
  // archived -> reserved should NOT be allowed
  assert(
    canTransitionVehicle('archived', 'reserved') === false,
    'Should not allow: archived -> reserved'
  );
  
  // archived -> sold should NOT be allowed
  assert(
    canTransitionVehicle('archived', 'sold') === false,
    'Should not allow: archived -> sold'
  );
  
  // archived -> hidden should NOT be allowed
  assert(
    canTransitionVehicle('archived', 'hidden') === false,
    'Should not allow: archived -> hidden'
  );
  
  // archived -> draft should NOT be allowed
  assert(
    canTransitionVehicle('archived', 'draft') === false,
    'Should not allow: archived -> draft'
  );
  
  console.log('[Test] ✓ State machine no transitions test passed');
}

/**
 * Test: Valid transitions from draft work correctly
 */
export async function testValidTransitionsFromDraft(): Promise<void> {
  console.log('[Test] Running: Valid Transitions From Draft');
  
  const db = getTestDb();
  
  // Cleanup before test
  await cleanupTestData(db);
  
  // Setup: vehicle is 'draft'
  const vehicleId = await createTestVehicle(db, {
    id: 'test-draft-vehicle',
    status: 'draft'
  });
  
  // Attempt to publish draft vehicle (should work)
  const result = await atomicPublishVehicle(db, vehicleId);
  
  // Should succeed (draft -> published is valid)
  assert(result.success === true, 'Publishing draft vehicle should succeed');
  
  // Verify: now published
  const vehicle = await db.prepare(
    'SELECT status FROM vehicles WHERE id = ?'
  ).bind(vehicleId).first<{ status: string }>();
  
  assertEqual(vehicle?.status, 'published', 'Vehicle should be published');
  
  console.log('[Test] ✓ Valid transitions from draft test passed');
}

/**
 * Test: Hidden vehicle can be published (valid transition)
 */
export async function testHiddenToPublished(): Promise<void> {
  console.log('[Test] Running: Hidden To Published Transition');
  
  const db = getTestDb();
  
  // Cleanup before test
  await cleanupTestData(db);
  
  // Setup: vehicle is 'hidden'
  const vehicleId = await createTestVehicle(db, {
    id: 'test-hidden-vehicle',
    status: 'hidden'
  });
  
  // Attempt to publish hidden vehicle (should work)
  const result = await atomicPublishVehicle(db, vehicleId);
  
  // Should succeed (hidden -> published is valid)
  assert(result.success === true, 'Publishing hidden vehicle should succeed');
  
  // Verify: now published
  const vehicle = await db.prepare(
    'SELECT status FROM vehicles WHERE id = ?'
  ).bind(vehicleId).first<{ status: string }>();
  
  assertEqual(vehicle?.status, 'published', 'Vehicle should be published');
  
  console.log('[Test] ✓ Hidden to published test passed');
}

/**
 * Run all archived terminal tests
 */
export async function runArchivedTerminalTests(): Promise<void> {
  console.log('========================================');
  console.log('Running Archived Terminal Tests');
  console.log('========================================');
  
  try {
    await testArchivedTerminalPublish();
    await testArchivedTerminalSold();
    await testArchivedTerminalArchive();
    await testIsArchivedHelper();
    await testStateMachineNoTransitionsFromArchived();
    await testValidTransitionsFromDraft();
    await testHiddenToPublished();
    
    console.log('========================================');
    console.log('✓ All archived terminal tests passed');
    console.log('========================================');
  } catch (error) {
    console.error('Archived terminal tests failed:', error);
    throw error;
  }
}

// Export for direct execution
export default runArchivedTerminalTests;
