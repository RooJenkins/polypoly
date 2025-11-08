/**
 * Exit Management System
 *
 * Provides sophisticated exit rules to protect profits and limit losses:
 * - Trailing stop losses
 * - Profit targets
 * - Time-based exits
 * - Technical exits (MA breaks, RSI extremes)
 * - Macro circuit breakers (VIX spikes, market crashes)
 * - Strategy-specific exit rules
 */

import type { Stock } from '@/types';
import type { MarketContext } from './market-context';
import type { StrategyType } from './trading-strategies';

export interface Position {
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  entryDate: Date;
  daysHeld: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  strategy: StrategyType;
}

export interface ExitSignal {
  symbol: string;
  shouldExit: boolean;
  exitType:
    | 'trailing_stop'
    | 'profit_target'
    | 'stop_loss'
    | 'time_based'
    | 'technical'
    | 'macro_circuit_breaker'
    | 'strategy_specific'
    | 'none';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string[];
  confidence: number;
}

/**
 * Analyze if position should be exited
 */
export function analyzeExit(
  position: Position,
  stock: Stock,
  marketContext: MarketContext
): ExitSignal {
  const { symbol, entryPrice, currentPrice, daysHeld, unrealizedPnLPercent, strategy } = position;

  const reasons: string[] = [];
  let shouldExit = false;
  let exitType: ExitSignal['exitType'] = 'none';
  let urgency: ExitSignal['urgency'] = 'low';
  let confidence = 0;

  // 1. STOP LOSS - Hard floor
  if (unrealizedPnLPercent < -8) {
    shouldExit = true;
    exitType = 'stop_loss';
    urgency = 'critical';
    confidence = 95;
    reasons.push(`🛑 STOP LOSS: Down ${Math.abs(unrealizedPnLPercent).toFixed(1)}% - cut losses`);
  }

  // 2. PROFIT TARGET - Lock in gains
  const profitTarget = getProfitTarget(strategy, daysHeld);
  if (unrealizedPnLPercent >= profitTarget) {
    shouldExit = true;
    exitType = 'profit_target';
    urgency = 'medium';
    confidence = 85;
    reasons.push(`✅ PROFIT TARGET: Up ${unrealizedPnLPercent.toFixed(1)}% - take profits`);
  }

  // 3. TRAILING STOP - Protect gains
  if (!shouldExit && unrealizedPnLPercent > 5) {
    const trailingStop = getTrailingStop(unrealizedPnLPercent);
    const high52wVal = stock.high52w ?? currentPrice;
    const currentDrawdown = ((high52wVal - currentPrice) / high52wVal) * 100;

    if (currentDrawdown > trailingStop) {
      shouldExit = true;
      exitType = 'trailing_stop';
      urgency = 'high';
      confidence = 80;
      reasons.push(
        `📉 TRAILING STOP: Up ${unrealizedPnLPercent.toFixed(1)}% but pulled back ${currentDrawdown.toFixed(1)}% from highs`
      );
    }
  }

  // 4. TIME-BASED EXIT - Strategy holding period exceeded
  if (!shouldExit) {
    const timeExit = checkTimeBasedExit(position);
    if (timeExit.shouldExit) {
      shouldExit = true;
      exitType = 'time_based';
      urgency = 'low';
      confidence = 60;
      reasons.push(timeExit.reason);
    }
  }

  // 5. TECHNICAL EXIT - Chart breakdown
  if (!shouldExit) {
    const technicalExit = checkTechnicalExit(position, stock);
    if (technicalExit.shouldExit) {
      shouldExit = true;
      exitType = 'technical';
      urgency = 'medium';
      confidence = 75;
      reasons.push(technicalExit.reason);
    }
  }

  // 6. MACRO CIRCUIT BREAKER - Market crash protection
  if (!shouldExit) {
    const macroExit = checkMacroCircuitBreaker(marketContext);
    if (macroExit.shouldExit) {
      shouldExit = true;
      exitType = 'macro_circuit_breaker';
      urgency = 'critical';
      confidence = 90;
      reasons.push(macroExit.reason);
    }
  }

  // 7. STRATEGY-SPECIFIC EXIT
  if (!shouldExit) {
    const strategyExit = checkStrategySpecificExit(position, stock, marketContext);
    if (strategyExit.shouldExit) {
      shouldExit = true;
      exitType = 'strategy_specific';
      urgency = strategyExit.urgency;
      confidence = strategyExit.confidence;
      reasons.push(strategyExit.reason);
    }
  }

  return {
    symbol,
    shouldExit,
    exitType,
    urgency,
    reasoning: reasons,
    confidence,
  };
}

/**
 * Get profit target based on strategy and holding period
 */
function getProfitTarget(strategy: StrategyType, daysHeld: number): number {
  const targets: Record<StrategyType, number> = {
    momentum_breakout: 7, // Quick 7% scalp
    mean_reversion: 5, // 5% reversion to mean
    trend_following: 15, // Let winners run to 15%
    value_quality: 20, // Patient 20% value realization
    volatility_arbitrage: 5, // Quick 5% vol play
    contrarian_sentiment: 12, // 12% sentiment reversal
  };

  let target = targets[strategy] || 10;

  // Adjust for holding period - if held longer, may need higher return
  if (daysHeld > 30 && target < 15) {
    target += 3; // Add 3% if held > 30 days
  }

  return target;
}

/**
 * Get trailing stop distance based on current gain
 */
function getTrailingStop(currentGainPercent: number): number {
  // Progressive trailing stop - tighter as gains increase
  if (currentGainPercent > 25) return 8; // Trail by 8% on huge winners
  if (currentGainPercent > 15) return 6; // Trail by 6% on big winners
  if (currentGainPercent > 10) return 5; // Trail by 5% on good winners
  return 3; // Trail by 3% on small winners
}

/**
 * Check time-based exit rules
 */
function checkTimeBasedExit(position: Position): { shouldExit: boolean; reason: string } {
  const { daysHeld, strategy, unrealizedPnLPercent } = position;

  // Strategy-specific max holding periods
  const maxHoldingDays: Record<StrategyType, number> = {
    momentum_breakout: 5, // 1-3 days typical, 5 max
    mean_reversion: 10, // 3-7 days typical, 10 max
    trend_following: 40, // 1-4 weeks typical, 40 days max
    value_quality: 90, // 2-8 weeks typical, 90 days max
    volatility_arbitrage: 3, // 1-2 days typical, 3 max
    contrarian_sentiment: 21, // 1-2 weeks typical, 21 days max
  };

  const maxDays = maxHoldingDays[strategy] || 30;

  // Exit if held too long without profit
  if (daysHeld > maxDays && unrealizedPnLPercent < 3) {
    return {
      shouldExit: true,
      reason: `⏰ TIME EXIT: Held ${daysHeld} days (max ${maxDays}) without meaningful gain`,
    };
  }

  // Quick exits for short-term strategies if not working
  if (strategy === 'momentum_breakout' && daysHeld >= 3 && unrealizedPnLPercent < 0) {
    return {
      shouldExit: true,
      reason: '⏰ Momentum not playing out after 3 days - exit',
    };
  }

  if (strategy === 'volatility_arbitrage' && daysHeld >= 2 && unrealizedPnLPercent < 1) {
    return {
      shouldExit: true,
      reason: '⏰ Vol trade not working after 2 days - exit',
    };
  }

  return { shouldExit: false, reason: '' };
}

/**
 * Check technical exit signals
 */
function checkTechnicalExit(
  position: Position,
  stock: Stock
): { shouldExit: boolean; reason: string } {
  const { currentPrice, unrealizedPnLPercent } = position;
  const { ma7, ma30, rsi } = stock;

  const ma30Val = ma30 ?? currentPrice;
  const ma7Val = ma7 ?? currentPrice;
  const rsiVal = rsi ?? 50;

  // 1. Broke below MA30 with losses
  if (currentPrice < ma30Val && unrealizedPnLPercent < -3) {
    return {
      shouldExit: true,
      reason: `📉 TECHNICAL: Broke below MA30 (${((currentPrice - ma30Val) / ma30Val * 100).toFixed(1)}% below) with losses`,
    };
  }

  // 2. Broke below MA7 with significant losses
  if (currentPrice < ma7Val && unrealizedPnLPercent < -5) {
    return {
      shouldExit: true,
      reason: '📉 TECHNICAL: Broke below MA7 with -5% loss - trend broken',
    };
  }

  // 3. Extreme RSI overbought (take profits)
  if (rsiVal > 78 && unrealizedPnLPercent > 8) {
    return {
      shouldExit: true,
      reason: `📊 TECHNICAL: RSI ${rsiVal.toFixed(0)} extreme overbought - take profits`,
    };
  }

  // 4. Extreme RSI oversold with losses (capitulation)
  if (rsiVal < 25 && unrealizedPnLPercent < -6) {
    return {
      shouldExit: true,
      reason: `📊 TECHNICAL: RSI ${rsiVal.toFixed(0)} oversold capitulation - exit before further damage`,
    };
  }

  return { shouldExit: false, reason: '' };
}

/**
 * Check macro circuit breaker conditions
 */
function checkMacroCircuitBreaker(marketContext: MarketContext): { shouldExit: boolean; reason: string } {
  const { spyTrend, vix } = marketContext;

  // 1. VIX SPIKE - Extreme fear, risk-off
  if (vix.level > 35) {
    return {
      shouldExit: true,
      reason: `🚨 MACRO CIRCUIT BREAKER: VIX ${vix.level.toFixed(0)} extreme fear - reduce all exposure`,
    };
  }

  // 2. MARKET CRASH - SPY down huge in short time
  if (spyTrend.weekChange < -8 && spyTrend.regime === 'bearish') {
    return {
      shouldExit: true,
      reason: `🚨 MACRO CIRCUIT BREAKER: SPY down ${Math.abs(spyTrend.weekChange).toFixed(1)}% - bearish regime`,
    };
  }

  // 3. REGIME SHIFT + ELEVATED VIX
  if (spyTrend.regime === 'bearish' && vix.level > 25 && spyTrend.monthChange < -5) {
    return {
      shouldExit: true,
      reason: '🚨 MACRO CIRCUIT BREAKER: Bearish regime + elevated VIX - risk off',
    };
  }

  return { shouldExit: false, reason: '' };
}

/**
 * Check strategy-specific exit conditions
 */
function checkStrategySpecificExit(
  position: Position,
  stock: Stock,
  marketContext: MarketContext
): { shouldExit: boolean; reason: string; urgency: ExitSignal['urgency']; confidence: number } {
  const { strategy, unrealizedPnLPercent } = position;
  const { rsi, ma7, currentPrice, relativeStrength } = stock;

  const rsiVal = rsi ?? 50;
  const ma7Val = ma7 ?? stock.price;
  const currentPriceVal = currentPrice ?? stock.price;
  const rsVal = relativeStrength ?? 0;

  switch (strategy) {
    case 'momentum_breakout':
      // Exit if momentum fades (RSI drops below 50)
      if (rsiVal < 50 && unrealizedPnLPercent > 3) {
        return {
          shouldExit: true,
          reason: `🚀 MOMENTUM: RSI ${rsiVal.toFixed(0)} momentum fading - lock in ${unrealizedPnLPercent.toFixed(1)}% gain`,
          urgency: 'medium',
          confidence: 75,
        };
      }
      break;

    case 'mean_reversion':
      // Exit when RSI normalizes to 50-60 range
      if (rsiVal >= 50 && rsiVal <= 60 && unrealizedPnLPercent > 2) {
        return {
          shouldExit: true,
          reason: `📊 MEAN REVERSION: RSI ${rsiVal.toFixed(0)} normalized - reversion complete`,
          urgency: 'medium',
          confidence: 80,
        };
      }
      break;

    case 'trend_following':
      // Exit if relative strength turns negative (underperforming market)
      if (rsVal < -2 && currentPriceVal < ma7Val) {
        return {
          shouldExit: true,
          reason: '📈 TREND: Relative strength negative + broke MA7 - trend broken',
          urgency: 'high',
          confidence: 85,
        };
      }
      break;

    case 'value_quality':
      // Exit if recovered to fair value (near 52w highs)
      const distanceFrom52w = stock.high52w ? ((stock.high52w - currentPriceVal) / stock.high52w) * 100 : 100;
      if (distanceFrom52w < 3 && unrealizedPnLPercent > 10) {
        return {
          shouldExit: true,
          reason: '💎 VALUE: Stock recovered to 52w highs - value play complete',
          urgency: 'low',
          confidence: 70,
        };
      }
      break;

    case 'volatility_arbitrage':
      // Exit if VIX normalizes
      if (marketContext.vix.level < 16 && unrealizedPnLPercent > 2) {
        return {
          shouldExit: true,
          reason: `⚡ VOL: VIX ${marketContext.vix.level.toFixed(1)} normalized - arbitrage complete`,
          urgency: 'medium',
          confidence: 85,
        };
      }
      break;

    case 'contrarian_sentiment':
      // Exit if sentiment has reversed (sharp rally)
      if (stock.weekTrend && stock.weekTrend > 8 && unrealizedPnLPercent > 5) {
        return {
          shouldExit: true,
          reason: `🔄 CONTRARIAN: Up ${stock.weekTrend.toFixed(1)}% this week - sentiment reversed`,
          urgency: 'medium',
          confidence: 75,
        };
      }
      break;
  }

  return { shouldExit: false, reason: '', urgency: 'low', confidence: 0 };
}

/**
 * Analyze all positions and get exit recommendations
 */
export function analyzeAllExits(
  positions: Position[],
  stocks: Stock[],
  marketContext: MarketContext
): ExitSignal[] {
  return positions.map((position) => {
    const stock = stocks.find((s) => s.symbol === position.symbol);
    if (!stock) {
      return {
        symbol: position.symbol,
        shouldExit: false,
        exitType: 'none',
        urgency: 'low',
        reasoning: ['Stock data not found'],
        confidence: 0,
      };
    }

    return analyzeExit(position, stock, marketContext);
  });
}

/**
 * Generate exit management summary for AI prompt
 */
export function generateExitSummary(exitSignals: ExitSignal[]): string {
  const exitRecommendations = exitSignals.filter((signal) => signal.shouldExit);

  if (exitRecommendations.length === 0) {
    return '\n## Exit Management\nNo immediate exits required. All positions within parameters.\n';
  }

  let summary = '\n## Exit Management - IMMEDIATE ACTION REQUIRED\n\n';

  // Sort by urgency
  const critical = exitRecommendations.filter((s) => s.urgency === 'critical');
  const high = exitRecommendations.filter((s) => s.urgency === 'high');
  const medium = exitRecommendations.filter((s) => s.urgency === 'medium');
  const low = exitRecommendations.filter((s) => s.urgency === 'low');

  if (critical.length > 0) {
    summary += '### 🚨 CRITICAL EXITS (Immediate)\n';
    critical.forEach((signal) => {
      summary += `**${signal.symbol}** (${signal.exitType})\n`;
      signal.reasoning.forEach((r) => (summary += `- ${r}\n`));
      summary += '\n';
    });
  }

  if (high.length > 0) {
    summary += '### ⚠️ HIGH PRIORITY EXITS\n';
    high.forEach((signal) => {
      summary += `**${signal.symbol}** (${signal.exitType})\n`;
      signal.reasoning.forEach((r) => (summary += `- ${r}\n`));
      summary += '\n';
    });
  }

  if (medium.length > 0) {
    summary += '### 📊 MEDIUM PRIORITY EXITS\n';
    medium.forEach((signal) => {
      summary += `**${signal.symbol}** (${signal.exitType})\n`;
      signal.reasoning.forEach((r) => (summary += `- ${r}\n`));
      summary += '\n';
    });
  }

  if (low.length > 0) {
    summary += '### 💡 CONSIDER EXITS (Optional)\n';
    low.forEach((signal) => {
      summary += `**${signal.symbol}** (${signal.exitType})\n`;
      signal.reasoning.forEach((r) => (summary += `- ${r}\n`));
      summary += '\n';
    });
  }

  return summary;
}

/**
 * Calculate optimal exit price for a position
 */
export function calculateExitPrice(
  position: Position,
  stock: Stock,
  exitType: ExitSignal['exitType']
): number {
  const currentPriceVal = stock.currentPrice ?? stock.price;

  switch (exitType) {
    case 'stop_loss':
      // Exit at market (accept slippage)
      return currentPriceVal * 0.995; // 0.5% slippage

    case 'trailing_stop':
      // Exit at market
      return currentPriceVal * 0.998; // 0.2% slippage

    case 'profit_target':
      // Try to get current price or better
      return currentPriceVal;

    case 'technical':
    case 'macro_circuit_breaker':
      // Exit urgently
      return currentPriceVal * 0.997; // 0.3% slippage

    default:
      return currentPriceVal;
  }
}
