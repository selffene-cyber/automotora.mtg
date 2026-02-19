// ============================================================
// Test Runner - All Validation Tests
// MTG Automotora - Critical Scenarios
// ============================================================

import { runConcurrencyTests } from './concurrency.test';
import { runWebhookIdempotencyTests } from './webhook-idempotency.test';
import { runCronExpirationTests } from './cron-expiration.test';
import { runArchivedTerminalTests } from './archived-terminal.test';

/**
 * Main test runner that executes all validation tests
 * Run with: npx tsx tests/run-all-tests.ts
 */
export async function runAllTests(): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  MTG Automotora - Critical Validation Tests               ║');
  console.log('║  Testing 4 Critical Scenarios for MVP Readiness            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  
  const results = {
    concurrency: { passed: false, error: null as Error | null },
    webhookIdempotency: { passed: false, error: null as Error | null },
    cronExpiration: { passed: false, error: null as Error | null },
    archivedTerminal: { passed: false, error: null as Error | null }
  };
  
  // Run Concurrency Tests
  console.log('\n📋 TEST SUITE 1: CONCURRENCY\n');
  try {
    await runConcurrencyTests();
    results.concurrency.passed = true;
    console.log('✅ Concurrency Tests: PASSED\n');
  } catch (error) {
    results.concurrency.error = error as Error;
    console.error('❌ Concurrency Tests: FAILED\n', error);
  }
  
  // Run Webhook Idempotency Tests
  console.log('\n📋 TEST SUITE 2: WEBHOOK IDEMPOTENCY\n');
  try {
    await runWebhookIdempotencyTests();
    results.webhookIdempotency.passed = true;
    console.log('✅ Webhook Idempotency Tests: PASSED\n');
  } catch (error) {
    results.webhookIdempotency.error = error as Error;
    console.error('❌ Webhook Idempotency Tests: FAILED\n', error);
  }
  
  // Run Cron Expiration Tests
  console.log('\n📋 TEST SUITE 3: CRON EXPIRATION\n');
  try {
    await runCronExpirationTests();
    results.cronExpiration.passed = true;
    console.log('✅ Cron Expiration Tests: PASSED\n');
  } catch (error) {
    results.cronExpiration.error = error as Error;
    console.error('❌ Cron Expiration Tests: FAILED\n', error);
  }
  
  // Run Archived Terminal Tests
  console.log('\n📋 TEST SUITE 4: ARCHIVED TERMINAL STATE\n');
  try {
    await runArchivedTerminalTests();
    results.archivedTerminal.passed = true;
    console.log('✅ Archived Terminal Tests: PASSED\n');
  } catch (error) {
    results.archivedTerminal.error = error as Error;
    console.error('❌ Archived Terminal Tests: FAILED\n', error);
  }
  
  // Summary
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  TEST SUMMARY                                             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  
  const allPassed = Object.values(results).every(r => r.passed);
  
  console.log(`  1. Concurrency Tests:         ${results.concurrency.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  2. Webhook Idempotency Tests: ${results.webhookIdempotency.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  3. Cron Expiration Tests:     ${results.cronExpiration.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  4. Archived Terminal Tests:   ${results.archivedTerminal.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('');
  
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED - MVP IS READY FOR DEPLOYMENT!');
    console.log('');
    process.exit(0);
  } else {
    console.log('💥 SOME TESTS FAILED - REVIEW BEFORE DEPLOYMENT');
    console.log('');
    
    // List failures
    for (const [name, result] of Object.entries(results)) {
      if (!result.passed && result.error) {
        console.log(`  ❌ ${name}: ${result.error.message}`);
      }
    }
    console.log('');
    process.exit(1);
  }
}

// Export for imports
export default runAllTests;

// Run if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}
