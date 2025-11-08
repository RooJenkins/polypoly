/**
 * Alpaca Sync Scheduler
 *
 * Automatically syncs live trading agents with Alpaca every 5 minutes
 */

let syncInterval: NodeJS.Timeout | null = null;
let isRunning = false;

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Start the sync scheduler
 */
export function startSyncScheduler() {
  // Prevent multiple instances
  if (isRunning) {
    console.log('⏱️  [Scheduler] Already running');
    return;
  }

  console.log('🚀 [Scheduler] Starting Alpaca sync scheduler (every 5 minutes)');
  isRunning = true;

  // Run initial sync immediately
  performSync();

  // Schedule recurring syncs
  syncInterval = setInterval(() => {
    performSync();
  }, SYNC_INTERVAL_MS);
}

/**
 * Stop the sync scheduler
 */
export function stopSyncScheduler() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    isRunning = false;
    console.log('⏹️  [Scheduler] Stopped Alpaca sync scheduler');
  }
}

/**
 * Perform a sync operation
 */
async function performSync() {
  try {
    const timestamp = new Date().toISOString();
    console.log(`\n🔄 [Scheduler] Running scheduled sync at ${timestamp}`);

    // Call the sync endpoint internally
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/alpaca/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Empty body syncs all live agents
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ [Scheduler] Sync failed:', error);
      return;
    }

    const result = await response.json();
    console.log('✅ [Scheduler] Sync completed:', {
      syncedAgents: result.syncedAgents,
      failedAgents: result.failedAgents,
    });

    // Log individual agent results
    if (result.results && result.results.length > 0) {
      result.results.forEach((agentResult: any) => {
        if (agentResult.success) {
          console.log(`  ✅ ${agentResult.agent}: $${agentResult.accountValue.toFixed(2)} (${agentResult.positionsCount} positions)`);
        } else {
          console.log(`  ❌ ${agentResult.agent}: ${agentResult.error}`);
        }
      });
    }
  } catch (error: any) {
    console.error('❌ [Scheduler] Sync error:', error.message);
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    isRunning,
    intervalMs: SYNC_INTERVAL_MS,
    intervalMinutes: SYNC_INTERVAL_MS / 60000,
  };
}
