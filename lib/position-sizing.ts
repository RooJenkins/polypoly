/**
 * Position Sizing with Kelly Criterion
 *
 * Implements optimal position sizing based on:
 * - Kelly Criterion formula
 * - Agent historical performance (win rate, avg win/loss)
 * - Stock volatility
 * - Portfolio volatility
 * - Confidence level
 * - Risk management constraints
 */

export interface AgentPerformance {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnL: number;
  avgWinPercent: number;
  avgLossPercent: number;
  winRate: number;
  sharpeRatio: number;
}

export interface PositionSizeInput {
  cashAvailable: number;
  accountValue: number;
  confidence: number; // 0-100
  stockVolatility: number; // Annualized volatility
  portfolioVolatility: number;
  agentPerformance: AgentPerformance;
  currentPositionCount: number;
  maxPositionPercent?: number; // Max % of account per position
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
}

export interface PositionSizeResult {
  positionSize: number; // Dollar amount
  positionPercent: number; // % of account
  kellyFraction: number; // Raw Kelly %
  adjustedKelly: number; // After adjustments
  reasoning: string[];
  confidence: number;
}

/**
 * Calculate optimal position size using Kelly Criterion
 */
export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult {
  const {
    cashAvailable,
    accountValue,
    confidence,
    stockVolatility,
    portfolioVolatility,
    agentPerformance,
    currentPositionCount,
    maxPositionPercent = 30,
    riskTolerance,
  } = input;

  const reasoning: string[] = [];

  // Step 1: Calculate base Kelly fraction
  let kellyFraction = 0;

  if (agentPerformance.totalTrades >= 10) {
    // Use actual performance data
    const winRate = agentPerformance.winRate;
    const lossRate = 1 - winRate;
    const avgWin = Math.abs(agentPerformance.avgWinPercent);
    const avgLoss = Math.abs(agentPerformance.avgLossPercent);

    if (avgLoss > 0) {
      const winLossRatio = avgWin / avgLoss;
      // Kelly formula: (p * b - q) / b
      kellyFraction = (winRate * winLossRatio - lossRate) / winLossRatio;
      reasoning.push(
        `Kelly base: ${(kellyFraction * 100).toFixed(1)}% (win rate ${(winRate * 100).toFixed(0)}%, avg win/loss ${winLossRatio.toFixed(2)}x)`
      );
    }
  } else {
    // Insufficient data - use conservative estimate based on confidence
    kellyFraction = (confidence / 100) * 0.15; // Max 15% for new traders
    reasoning.push(`Limited history (${agentPerformance.totalTrades} trades) - using conservative ${(kellyFraction * 100).toFixed(1)}%`);
  }

  // Step 2: Adjust for confidence
  // Scale Kelly by confidence: high confidence = closer to full Kelly, low confidence = fractional Kelly
  const confidenceMultiplier = 0.3 + (confidence / 100) * 0.7; // Range: 0.3x to 1.0x
  let adjustedKelly = kellyFraction * confidenceMultiplier;
  reasoning.push(`Confidence adjustment (${confidence}%): ${(adjustedKelly * 100).toFixed(1)}%`);

  // Step 3: Volatility adjustment
  // Higher volatility = smaller position
  const baseVolatility = 0.2; // 20% annualized baseline
  const volatilityRatio = stockVolatility / baseVolatility;

  if (volatilityRatio > 1.5) {
    const volReduction = Math.min(0.5, (volatilityRatio - 1) * 0.3);
    adjustedKelly *= 1 - volReduction;
    reasoning.push(
      `High volatility (${(stockVolatility * 100).toFixed(0)}%) - reduced by ${(volReduction * 100).toFixed(0)}%`
    );
  } else if (volatilityRatio < 0.8) {
    const volBonus = Math.min(0.2, (1 - volatilityRatio) * 0.15);
    adjustedKelly *= 1 + volBonus;
    reasoning.push(`Low volatility - increased by ${(volBonus * 100).toFixed(0)}%`);
  }

  // Step 4: Portfolio diversification adjustment
  // More positions = smaller individual sizes
  if (currentPositionCount >= 8) {
    adjustedKelly *= 0.7;
    reasoning.push(`High position count (${currentPositionCount}) - reduced to maintain diversification`);
  } else if (currentPositionCount >= 5) {
    adjustedKelly *= 0.85;
    reasoning.push(`Moderate position count (${currentPositionCount}) - slight reduction`);
  } else if (currentPositionCount <= 2) {
    adjustedKelly *= 1.1;
    reasoning.push(`Low position count (${currentPositionCount}) - can size up`);
  }

  // Step 5: Risk tolerance adjustment
  const riskMultipliers = {
    conservative: 0.5, // Half Kelly
    moderate: 0.75, // Three-quarter Kelly
    aggressive: 1.0, // Full Kelly
  };

  adjustedKelly *= riskMultipliers[riskTolerance];
  reasoning.push(`Risk tolerance (${riskTolerance}): ${riskMultipliers[riskTolerance]}x Kelly`);

  // Step 6: Apply hard constraints
  // Never bet more than maxPositionPercent of account
  adjustedKelly = Math.max(0, Math.min(adjustedKelly, maxPositionPercent / 100));

  // Never bet negative (if Kelly is negative, don't trade)
  if (adjustedKelly <= 0) {
    reasoning.push('⚠️ Negative edge detected - NO TRADE');
    return {
      positionSize: 0,
      positionPercent: 0,
      kellyFraction,
      adjustedKelly: 0,
      reasoning,
      confidence: 0,
    };
  }

  // Minimum position size (if we're trading, make it meaningful)
  const minPositionPercent = 0.05; // 5% minimum
  if (adjustedKelly < minPositionPercent && adjustedKelly > 0) {
    adjustedKelly = minPositionPercent;
    reasoning.push(`Increased to minimum ${(minPositionPercent * 100).toFixed(0)}% for meaningful position`);
  }

  // Step 7: Calculate dollar amounts
  let positionSize = accountValue * adjustedKelly;

  // Don't exceed available cash
  if (positionSize > cashAvailable) {
    positionSize = cashAvailable;
    adjustedKelly = positionSize / accountValue;
    reasoning.push(`Limited by available cash: $${cashAvailable.toFixed(0)}`);
  }

  const positionPercent = (positionSize / accountValue) * 100;

  reasoning.push(`\n✅ Final position: $${positionSize.toFixed(0)} (${positionPercent.toFixed(1)}% of account)`);

  return {
    positionSize,
    positionPercent,
    kellyFraction,
    adjustedKelly,
    reasoning,
    confidence,
  };
}

/**
 * Calculate agent performance metrics from trade history
 */
export function calculateAgentPerformance(trades: any[]): AgentPerformance {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalPnL: 0,
      avgWinPercent: 0,
      avgLossPercent: 0,
      winRate: 0,
      sharpeRatio: 0,
    };
  }

  // Separate winners and losers
  const winners = trades.filter((t) => t.pnl > 0);
  const losers = trades.filter((t) => t.pnl < 0);

  // Calculate averages
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const avgWinPercent = winners.length > 0
    ? winners.reduce((sum, t) => sum + t.pnlPercent, 0) / winners.length
    : 0;
  const avgLossPercent = losers.length > 0
    ? losers.reduce((sum, t) => sum + Math.abs(t.pnlPercent), 0) / losers.length
    : 0;

  const winRate = trades.length > 0 ? winners.length / trades.length : 0;

  // Calculate Sharpe ratio (simplified)
  const returns = trades.map((t) => t.pnlPercent);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  );
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

  return {
    totalTrades: trades.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    totalPnL,
    avgWinPercent,
    avgLossPercent,
    winRate,
    sharpeRatio,
  };
}

/**
 * Adjust position size for market conditions
 */
export function adjustForMarketConditions(
  baseSize: PositionSizeResult,
  marketRegime: 'bullish' | 'bearish' | 'neutral',
  vixLevel: number,
  portfolioBeta: number
): PositionSizeResult {
  let multiplier = 1.0;
  const additionalReasoning: string[] = [];

  // Market regime adjustment
  if (marketRegime === 'bearish') {
    multiplier *= 0.6;
    additionalReasoning.push('⚠️ Bearish market: reduced position by 40%');
  } else if (marketRegime === 'neutral') {
    multiplier *= 0.85;
    additionalReasoning.push('Neutral market: slight reduction');
  } else {
    additionalReasoning.push('✅ Bullish market: full sizing allowed');
  }

  // VIX adjustment (high fear = smaller positions)
  if (vixLevel > 25) {
    multiplier *= 0.7;
    additionalReasoning.push(`⚠️ High VIX (${vixLevel.toFixed(0)}): reduced position by 30%`);
  } else if (vixLevel > 20) {
    multiplier *= 0.85;
    additionalReasoning.push(`Elevated VIX (${vixLevel.toFixed(0)}): slight reduction`);
  }

  // Portfolio beta adjustment (high beta portfolio = smaller new positions)
  if (portfolioBeta > 1.3) {
    multiplier *= 0.85;
    additionalReasoning.push(`High portfolio beta (${portfolioBeta.toFixed(2)}): slight reduction`);
  }

  const adjustedSize = baseSize.positionSize * multiplier;
  const adjustedPercent = baseSize.positionPercent * multiplier;

  return {
    positionSize: adjustedSize,
    positionPercent: adjustedPercent,
    kellyFraction: baseSize.kellyFraction,
    adjustedKelly: baseSize.adjustedKelly * multiplier,
    reasoning: [...baseSize.reasoning, ...additionalReasoning],
    confidence: baseSize.confidence,
  };
}

/**
 * Get recommended position size summary for AI prompt
 */
export function getPositionSizeSummary(result: PositionSizeResult): string {
  if (result.positionSize === 0) {
    return '🚫 NO TRADE RECOMMENDED - Negative edge detected or insufficient conditions';
  }

  let summary = `\n## Recommended Position Size\n`;
  summary += `**Amount**: $${result.positionSize.toFixed(0)} (${result.positionPercent.toFixed(1)}% of account)\n`;
  summary += `**Kelly Fraction**: ${(result.kellyFraction * 100).toFixed(1)}% → Adjusted to ${(result.adjustedKelly * 100).toFixed(1)}%\n\n`;
  summary += `**Sizing Logic**:\n`;
  result.reasoning.forEach((r) => {
    summary += `- ${r}\n`;
  });

  return summary;
}
