/**
 * Next.js Instrumentation
 *
 * This file runs once when the Next.js server starts
 * Perfect for initializing background processes like our sync scheduler
 */

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startSyncScheduler } = await import('./lib/sync-scheduler');

    // Start the Alpaca sync scheduler (runs every 5 minutes)
    startSyncScheduler();

    console.log('✅ [Instrumentation] Background services initialized');
  }
}
