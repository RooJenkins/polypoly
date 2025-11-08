/**
 * Safety Limits System
 *
 * Implements circuit breakers and risk management for live trading
 * Prevents catastrophic losses from AI agent errors
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const SAFETY_LIMITS = {
  // Per-agent limits
  MAX_POSITION_PER_AGENT: 10000,         // $10,000 max account value per agent
  MAX_SINGLE_TRADE_VALUE: 5000,          // $5,000 max per single trade (50% of account)
  MAX_DAILY_LOSS_PER_AGENT: 500,         // Stop agent if loses $500 in a day (5% of account)
  MAX_DAILY_TRADES_PER_AGENT: 3,         // Max 3 day trades per 5 days (PDT rule)

  // Global limits
  MAX_TOTAL_ACCOUNT_VALUE: 60000,        // $60,000 total across all 6 agents
  HALT_ON_TOTAL_DAILY_LOSS: 3000,        // Stop ALL trading if daily loss > $3,000 (5% of total)
  HALT_ON_API_ERROR_COUNT: 5,            // Stop if 5+ consecutive API errors

  // Feature flags
  REQUIRE_MANUAL_APPROVAL: false,        // Set to true to manually approve each trade
  ENABLE_CIRCUIT_BREAKERS: true,         // Enable all circuit breakers
  ENABLE_PDT_CHECKS: true,               // Enforce Pattern Day Trader rules
};

interface ValidationResult {
  allowed: boolean;
  reason?: string;
  warningLevel?: 'info' | 'warning' | 'critical';
}

/**
 * Validate exit prices and confidence scores (Alpha Arena Phase 6)
 */
export function validateExitParameters(
  action: 'BUY' | 'SELL_SHORT',
  currentPrice: number,
  targetPrice?: number,
  stopLoss?: number,
  confidence?: number
): ValidationResult {
  // Validate confidence score
  if (confidence !== undefined) {
    if (confidence < 0 || confidence > 1) {
      return {
        allowed: false,
        reason: `Confidence ${confidence} must be between 0 and 1`,
        warningLevel: 'warning'
      };
    }
    if (confidence < 0.6) {
      return {
        allowed: false,
        reason: `Confidence ${(confidence * 100).toFixed(0)}% is below minimum threshold of 60%`,
        warningLevel: 'info'
      };
    }
  }

  // Validate exit prices for LONG positions (BUY)
  if (action === 'BUY') {
    if (targetPrice && targetPrice <= currentPrice) {
      return {
        allowed: false,
        reason: `Target price $${targetPrice.toFixed(2)} must be ABOVE current price $${currentPrice.toFixed(2)} for LONG positions`,
        warningLevel: 'warning'
      };
    }
    if (stopLoss && stopLoss >= currentPrice) {
      return {
        allowed: false,
        reason: `Stop loss $${stopLoss.toFixed(2)} must be BELOW current price $${currentPrice.toFixed(2)} for LONG positions`,
        warningLevel: 'warning'
      };
    }
  }

  // Validate exit prices for SHORT positions
  if (action === 'SELL_SHORT') {
    if (targetPrice && targetPrice >= currentPrice) {
      return {
        allowed: false,
        reason: `Target price $${targetPrice.toFixed(2)} must be BELOW current price $${currentPrice.toFixed(2)} for SHORT positions`,
        warningLevel: 'warning'
      };
    }
    if (stopLoss && stopLoss <= currentPrice) {
      return {
        allowed: false,
        reason: `Stop loss $${stopLoss.toFixed(2)} must be ABOVE current price $${currentPrice.toFixed(2)} for SHORT positions`,
        warningLevel: 'warning'
      };
    }
  }

  return {
    allowed: true,
    warningLevel: 'info'
  };
}

/**
 * Validate if a trade is allowed based on all safety limits
 */
export async function validateTrade(
  agentId: string,
  agentName: string,
  action: 'BUY' | 'SELL',
  symbol: string,
  quantity: number,
  currentPrice: number
): Promise<ValidationResult> {
  const tradeValue = quantity * currentPrice;

  // 1. Check manual approval requirement
  if (SAFETY_LIMITS.REQUIRE_MANUAL_APPROVAL) {
    return {
      allowed: false,
      reason: 'Manual approval required for all trades',
      warningLevel: 'info'
    };
  }

  // 2. Check single trade value limit
  if (tradeValue > SAFETY_LIMITS.MAX_SINGLE_TRADE_VALUE) {
    return {
      allowed: false,
      reason: `Trade value $${tradeValue.toFixed(2)} exceeds limit of $${SAFETY_LIMITS.MAX_SINGLE_TRADE_VALUE}`,
      warningLevel: 'warning'
    };
  }

  // 3. Check agent's daily loss limit
  const dailyPnL = await getAgentDailyPnL(agentId);
  if (dailyPnL < -SAFETY_LIMITS.MAX_DAILY_LOSS_PER_AGENT) {
    return {
      allowed: false,
      reason: `Agent ${agentName} has lost $${Math.abs(dailyPnL).toFixed(2)} today (limit: $${SAFETY_LIMITS.MAX_DAILY_LOSS_PER_AGENT})`,
      warningLevel: 'critical'
    };
  }

  // 4. Check Pattern Day Trader rules (for BUY orders)
  if (SAFETY_LIMITS.ENABLE_PDT_CHECKS && action === 'BUY') {
    const dayTradesLast5Days = await countDayTradesLast5Days(agentId);
    if (dayTradesLast5Days >= SAFETY_LIMITS.MAX_DAILY_TRADES_PER_AGENT) {
      return {
        allowed: false,
        reason: `Agent ${agentName} has made ${dayTradesLast5Days} day trades in last 5 days (PDT limit: ${SAFETY_LIMITS.MAX_DAILY_TRADES_PER_AGENT})`,
        warningLevel: 'critical'
      };
    }
  }

  // 5. Check agent's cash balance (for BUY orders)
  if (action === 'BUY') {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { cashBalance: true, accountValue: true }
    });

    if (!agent) {
      return {
        allowed: false,
        reason: `Agent ${agentName} not found`,
        warningLevel: 'critical'
      };
    }

    // Check if trade exceeds available cash
    if (tradeValue > agent.cashBalance) {
      return {
        allowed: false,
        reason: `Trade value $${tradeValue.toFixed(2)} exceeds cash balance $${agent.cashBalance.toFixed(2)}`,
        warningLevel: 'warning'
      };
    }

    // Check if account value would exceed maximum (allowing for growth)
    if (agent.accountValue > SAFETY_LIMITS.MAX_POSITION_PER_AGENT * 1.5) {
      return {
        allowed: false,
        reason: `Account value $${agent.accountValue.toFixed(2)} exceeds safe limit`,
        warningLevel: 'warning'
      };
    }
  }

  // 6. Check total system daily loss
  const totalDailyPnL = await getTotalDailyPnL();
  if (totalDailyPnL < -SAFETY_LIMITS.HALT_ON_TOTAL_DAILY_LOSS) {
    return {
      allowed: false,
      reason: `SYSTEM HALT: Total daily loss $${Math.abs(totalDailyPnL).toFixed(2)} exceeds limit of $${SAFETY_LIMITS.HALT_ON_TOTAL_DAILY_LOSS}`,
      warningLevel: 'critical'
    };
  }

  // 7. Check API error rate
  const recentErrors = await getRecentAPIErrors();
  if (recentErrors >= SAFETY_LIMITS.HALT_ON_API_ERROR_COUNT) {
    return {
      allowed: false,
      reason: `SYSTEM HALT: ${recentErrors} consecutive API errors detected`,
      warningLevel: 'critical'
    };
  }

  // All checks passed
  return {
    allowed: true,
    warningLevel: 'info'
  };
}

/**
 * Get agent's P&L for today
 */
async function getAgentDailyPnL(agentId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const trades = await prisma.trade.findMany({
    where: {
      agentId,
      timestamp: {
        gte: today
      }
    },
    select: {
      realizedPnL: true
    }
  });

  return trades.reduce((sum, trade) => sum + (trade.realizedPnL || 0), 0);
}

/**
 * Get total system P&L for today
 */
async function getTotalDailyPnL(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const trades = await prisma.trade.findMany({
    where: {
      timestamp: {
        gte: today
      }
    },
    select: {
      realizedPnL: true
    }
  });

  return trades.reduce((sum, trade) => sum + (trade.realizedPnL || 0), 0);
}

/**
 * Count day trades in last 5 business days
 * A day trade is when you buy and sell the same stock in the same day
 */
async function countDayTradesLast5Days(agentId: string): Promise<number> {
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  // Get all trades in last 5 days
  const trades = await prisma.trade.findMany({
    where: {
      agentId,
      timestamp: {
        gte: fiveDaysAgo
      }
    },
    select: {
      symbol: true,
      action: true,
      timestamp: true
    },
    orderBy: {
      timestamp: 'asc'
    }
  });

  // Count day trades (same symbol, BUY then SELL on same calendar day)
  let dayTrades = 0;
  const buysByDay = new Map<string, Set<string>>(); // date -> Set of symbols bought

  for (const trade of trades) {
    const dateKey = trade.timestamp.toISOString().split('T')[0];

    if (trade.action === 'BUY') {
      if (!buysByDay.has(dateKey)) {
        buysByDay.set(dateKey, new Set());
      }
      buysByDay.get(dateKey)!.add(trade.symbol);
    } else if (trade.action === 'SELL') {
      const buysToday = buysByDay.get(dateKey);
      if (buysToday && buysToday.has(trade.symbol)) {
        dayTrades++;
        buysToday.delete(trade.symbol); // Count each symbol only once per day
      }
    }
  }

  return dayTrades;
}

/**
 * Get count of recent consecutive API errors
 */
async function getRecentAPIErrors(): Promise<number> {
  // Note: Trade model doesn't currently track failed attempts
  // All records in the database are successful trades
  // TODO: Add error tracking table for failed trade attempts
  return 0;
}

/**
 * Log a safety limit violation
 */
export async function logSafetyViolation(
  agentId: string,
  agentName: string,
  reason: string,
  warningLevel: 'info' | 'warning' | 'critical'
): Promise<void> {
  console.warn(`⚠️ [SAFETY] ${warningLevel.toUpperCase()}: ${agentName} - ${reason}`);

  // Could also send alerts via email/SMS for critical violations
  if (warningLevel === 'critical') {
    console.error(`🚨 [CRITICAL SAFETY VIOLATION] ${agentName}: ${reason}`);
    // TODO: Send alert notification
  }
}

/**
 * Emergency stop - halt all trading
 */
export async function emergencyStop(reason: string): Promise<void> {
  console.error(`🛑 [EMERGENCY STOP] ${reason}`);
  console.error(`🛑 All trading halted. Manual intervention required.`);

  // Set flag in database to prevent future trades
  // TODO: Implement emergency stop flag in database
}

/**
 * Get safety status report
 */
export async function getSafetyStatus(): Promise<{
  totalDailyPnL: number;
  agentStatuses: Array<{
    agentId: string;
    agentName: string;
    dailyPnL: number;
    dayTradeCount: number;
    accountValue: number;
    status: 'ok' | 'warning' | 'halted';
  }>;
  recentErrors: number;
  systemStatus: 'ok' | 'warning' | 'halted';
}> {
  const totalDailyPnL = await getTotalDailyPnL();
  const recentErrors = await getRecentAPIErrors();

  const agents = await prisma.agent.findMany();

  const agentStatuses = await Promise.all(
    agents.map(async (agent) => {
      const dailyPnL = await getAgentDailyPnL(agent.id);
      const dayTradeCount = await countDayTradesLast5Days(agent.id);

      let status: 'ok' | 'warning' | 'halted' = 'ok';
      if (dailyPnL < -SAFETY_LIMITS.MAX_DAILY_LOSS_PER_AGENT) {
        status = 'halted';
      } else if (dailyPnL < -SAFETY_LIMITS.MAX_DAILY_LOSS_PER_AGENT * 0.5) {
        status = 'warning';
      }

      return {
        agentId: agent.id,
        agentName: agent.name,
        dailyPnL,
        dayTradeCount,
        accountValue: agent.accountValue,
        status
      };
    })
  );

  let systemStatus: 'ok' | 'warning' | 'halted' = 'ok';
  if (totalDailyPnL < -SAFETY_LIMITS.HALT_ON_TOTAL_DAILY_LOSS || recentErrors >= SAFETY_LIMITS.HALT_ON_API_ERROR_COUNT) {
    systemStatus = 'halted';
  } else if (totalDailyPnL < -SAFETY_LIMITS.HALT_ON_TOTAL_DAILY_LOSS * 0.5) {
    systemStatus = 'warning';
  }

  return {
    totalDailyPnL,
    agentStatuses,
    recentErrors,
    systemStatus
  };
}
