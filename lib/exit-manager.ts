/**
 * Exit Manager - Automatic Stop Loss & Target Price Enforcement
 *
 * Based on Alpha Arena insights:
 * - Checks all open positions before each trading cycle
 * - Automatically closes positions that hit stop loss or target price
 * - Logs exit reason for performance analysis
 *
 * This prevents emotional holding and ensures disciplined trading
 */

import { prisma } from './prisma';
import type { Stock } from '@/types';

interface ExitCheckResult {
  positionsChecked: number;
  stopLossTriggered: number;
  targetPriceReached: number;
  totalExits: number;
}

/**
 * Check all open positions and automatically execute exits if:
 * 1. Current price <= stop loss (cut losses)
 * 2. Current price >= target price (take profits)
 *
 * Called at the start of each trading cycle, before AI decisions
 */
export async function checkAndExecuteExits(stocks: Stock[]): Promise<ExitCheckResult> {
  // EXIT MANAGER TEMPORARILY DISABLED
  // Position model no longer has stopLoss/targetPrice fields to match production database
  // This functionality requires database migration to re-enable

  console.log('\n🛡️  EXIT MANAGER: Disabled (schema mismatch)\n');

  const result: ExitCheckResult = {
    positionsChecked: 0,
    stopLossTriggered: 0,
    targetPriceReached: 0,
    totalExits: 0,
  };

  return result;
}

/**
 * Execute an automatic exit (close position and create trade record)
 * DISABLED - requires exitReason, decisionId, entryDecisionId fields in database
 */
async function executeAutoExit(position: any, exitPrice: number, exitReason: string): Promise<void> {
  // Function disabled - schema mismatch
  console.log('executeAutoExit called but disabled due to schema mismatch');
}
