/**
 * Portfolio Intelligence
 *
 * Provides portfolio-level analysis to help AIs make better holistic decisions:
 * - Concentration risk
 * - Sector exposure
 * - Portfolio beta and volatility
 * - Diversification score
 * - Opportunity cost (cash drag)
 */

import type { Stock } from '@/types';
import type { MarketContext } from './market-context';

export interface PortfolioMetrics {
  // Concentration risk
  largestPositionPercent: number;
  top3Concentration: number;
  singleStockRisk: 'low' | 'moderate' | 'high' | 'extreme';

  // Sector exposure
  sectorExposure: Record<string, number>;
  dominantSector: string | null;
  sectorDiversification: 'poor' | 'fair' | 'good' | 'excellent';

  // Risk metrics
  portfolioBeta: number;
  portfolioVolatility: number;
  marketCorrelation: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';

  // Diversification
  diversificationScore: number; // 0-100
  effectivePositions: number; // Herfindahl inverse
  diversificationGrade: 'F' | 'D' | 'C' | 'B' | 'A';

  // Cash management
  cashPercent: number;
  cashDragDays: number;
  missedOpportunityPercent: number;
  cashStatus: 'too_low' | 'optimal' | 'too_high';

  // Performance context
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  bestPosition: { symbol: string; pnlPercent: number } | null;
  worstPosition: { symbol: string; pnlPercent: number } | null;

  // Summary
  portfolioSummary: string;
}

interface Position {
  symbol: string;
  name: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

const SECTOR_MAPPING: Record<string, string[]> = {
  tech: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'],
  financials: ['JPM', 'BAC', 'V', 'MA'],
  energy: ['XOM', 'CVX'],
  healthcare: ['UNH', 'JNJ', 'LLY'],
  consumer: ['WMT', 'PG', 'KO', 'COST'],
};

/**
 * Calculate comprehensive portfolio metrics
 */
export function calculatePortfolioMetrics(
  positions: Position[],
  cashBalance: number,
  accountValue: number,
  stocks: Stock[],
  marketContext: MarketContext,
  agentStats: any
): PortfolioMetrics {
  // Handle empty portfolio
  if (positions.length === 0) {
    return {
      largestPositionPercent: 0,
      top3Concentration: 0,
      singleStockRisk: 'low',
      sectorExposure: {},
      dominantSector: null,
      sectorDiversification: 'excellent',
      portfolioBeta: 1.0,
      portfolioVolatility: 0,
      marketCorrelation: 0,
      riskLevel: 'conservative',
      diversificationScore: 100,
      effectivePositions: 0,
      diversificationGrade: 'A',
      cashPercent: 100,
      cashDragDays: 0,
      missedOpportunityPercent: 0,
      cashStatus: 'too_high',
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      bestPosition: null,
      worstPosition: null,
      portfolioSummary: '100% cash - no positions held',
    };
  }

  // Calculate position values
  const positionValues = positions.map(p => p.currentPrice * p.quantity);
  const totalPositionValue = positionValues.reduce((a, b) => a + b, 0);

  // Concentration risk
  const sortedValues = [...positionValues].sort((a, b) => b - a);
  const largestPositionPercent = (sortedValues[0] / accountValue) * 100;
  const top3Concentration = (sortedValues.slice(0, 3).reduce((a, b) => a + b, 0) / accountValue) * 100;

  let singleStockRisk: PortfolioMetrics['singleStockRisk'] = 'low';
  if (largestPositionPercent > 40) singleStockRisk = 'extreme';
  else if (largestPositionPercent > 30) singleStockRisk = 'high';
  else if (largestPositionPercent > 20) singleStockRisk = 'moderate';

  // Sector exposure
  const sectorExposure: Record<string, number> = {};
  for (const [sector, symbols] of Object.entries(SECTOR_MAPPING)) {
    const sectorValue = positions
      .filter(p => symbols.includes(p.symbol))
      .reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
    sectorExposure[sector] = (sectorValue / accountValue) * 100;
  }

  const dominantSector = Object.entries(sectorExposure)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const maxSectorExposure = Math.max(...Object.values(sectorExposure));
  let sectorDiversification: PortfolioMetrics['sectorDiversification'] = 'excellent';
  if (maxSectorExposure > 70) sectorDiversification = 'poor';
  else if (maxSectorExposure > 50) sectorDiversification = 'fair';
  else if (maxSectorExposure > 35) sectorDiversification = 'good';

  // Portfolio beta (simplified - weighted average vs SPY)
  let portfolioBeta = 0;
  for (const position of positions) {
    const stock = stocks.find(s => s.symbol === position.symbol);
    if (stock && stock.monthTrend !== undefined) {
      const weight = (position.currentPrice * position.quantity) / totalPositionValue;
      // Approximate beta from relative volatility
      const stockVol = Math.abs(stock.monthTrend);
      const marketVol = Math.abs(marketContext.spyTrend.monthChange);
      const approxBeta = marketVol > 0 ? stockVol / marketVol : 1.0;
      portfolioBeta += weight * approxBeta;
    }
  }

  // Portfolio volatility (simplified - weighted average of stock volatilities)
  let portfolioVolatility = 0;
  for (const position of positions) {
    const stock = stocks.find(s => s.symbol === position.symbol);
    if (stock && stock.monthTrend !== undefined) {
      const weight = (position.currentPrice * position.quantity) / totalPositionValue;
      const stockVol = Math.abs(stock.monthTrend);
      portfolioVolatility += weight * stockVol;
    }
  }

  // Market correlation (simplified)
  const marketCorrelation = portfolioBeta > 0 ? Math.min(portfolioBeta / 1.5, 1.0) : 0;

  let riskLevel: PortfolioMetrics['riskLevel'] = 'moderate';
  if (portfolioBeta < 0.8) riskLevel = 'conservative';
  else if (portfolioBeta > 1.3) riskLevel = 'aggressive';

  // Diversification score using Herfindahl-Hirschman Index
  const positionWeights = positionValues.map(v => v / totalPositionValue);
  const hhi = positionWeights.reduce((sum, w) => sum + w * w, 0);
  const effectivePositions = 1 / hhi; // Number of "equivalent" equal-weighted positions
  const diversificationScore = Math.min((effectivePositions / positions.length) * 100, 100);

  let diversificationGrade: PortfolioMetrics['diversificationGrade'] = 'F';
  if (diversificationScore >= 90) diversificationGrade = 'A';
  else if (diversificationScore >= 75) diversificationGrade = 'B';
  else if (diversificationScore >= 60) diversificationGrade = 'C';
  else if (diversificationScore >= 40) diversificationGrade = 'D';

  // Cash management
  const cashPercent = (cashBalance / accountValue) * 100;

  // Calculate cash drag days (days since last trade)
  const cashDragDays = agentStats?.totalTrades > 0 ? 0 : 30; // Simplified

  // Missed opportunity (what cash could have earned if invested in SPY)
  const missedOpportunityPercent = cashPercent > 20
    ? (cashPercent - 20) * (marketContext.spyTrend.monthChange / 100)
    : 0;

  let cashStatus: PortfolioMetrics['cashStatus'] = 'optimal';
  if (cashPercent < 5) cashStatus = 'too_low';
  else if (cashPercent > 40) cashStatus = 'too_high';

  // Unrealized P&L
  const unrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  const totalCost = positions.reduce((sum, p) => sum + p.entryPrice * p.quantity, 0);
  const unrealizedPnLPercent = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;

  // Best and worst positions
  const sortedByPnL = [...positions].sort((a, b) => b.unrealizedPnLPercent - a.unrealizedPnLPercent);
  const bestPosition = sortedByPnL[0]
    ? { symbol: sortedByPnL[0].symbol, pnlPercent: sortedByPnL[0].unrealizedPnLPercent }
    : null;
  const worstPosition = sortedByPnL[sortedByPnL.length - 1]
    ? { symbol: sortedByPnL[sortedByPnL.length - 1].symbol, pnlPercent: sortedByPnL[sortedByPnL.length - 1].unrealizedPnLPercent }
    : null;

  // Portfolio summary
  const portfolioSummary = generatePortfolioSummary({
    largestPositionPercent,
    singleStockRisk,
    sectorDiversification,
    diversificationGrade,
    cashPercent,
    cashStatus,
    unrealizedPnLPercent,
    riskLevel,
    dominantSector,
  });

  return {
    largestPositionPercent,
    top3Concentration,
    singleStockRisk,
    sectorExposure,
    dominantSector,
    sectorDiversification,
    portfolioBeta,
    portfolioVolatility,
    marketCorrelation,
    riskLevel,
    diversificationScore,
    effectivePositions,
    diversificationGrade,
    cashPercent,
    cashDragDays,
    missedOpportunityPercent,
    cashStatus,
    unrealizedPnL,
    unrealizedPnLPercent,
    bestPosition,
    worstPosition,
    portfolioSummary,
  };
}

/**
 * Generate human-readable portfolio summary
 */
function generatePortfolioSummary(metrics: {
  largestPositionPercent: number;
  singleStockRisk: string;
  sectorDiversification: string;
  diversificationGrade: string;
  cashPercent: number;
  cashStatus: string;
  unrealizedPnLPercent: number;
  riskLevel: string;
  dominantSector: string | null;
}): string {
  const parts = [];

  // Risk level
  parts.push(`${metrics.riskLevel.toUpperCase()} risk portfolio`);

  // Diversification
  if (metrics.diversificationGrade === 'A') {
    parts.push('well-diversified');
  } else if (metrics.diversificationGrade === 'F' || metrics.diversificationGrade === 'D') {
    parts.push('POOR diversification');
  }

  // Concentration warning
  if (metrics.largestPositionPercent > 30) {
    parts.push(`HIGH concentration risk (${metrics.largestPositionPercent.toFixed(0)}% in largest)`);
  }

  // Sector exposure
  if (metrics.dominantSector) {
    parts.push(`${metrics.dominantSector} dominant`);
  }

  // Cash status
  if (metrics.cashStatus === 'too_high') {
    parts.push(`${metrics.cashPercent.toFixed(0)}% cash (underinvested)`);
  } else if (metrics.cashStatus === 'too_low') {
    parts.push(`${metrics.cashPercent.toFixed(0)}% cash (fully invested)`);
  }

  // P&L
  if (metrics.unrealizedPnLPercent > 5) {
    parts.push(`${metrics.unrealizedPnLPercent >= 0 ? '+' : ''}${metrics.unrealizedPnLPercent.toFixed(1)}% unrealized gain`);
  } else if (metrics.unrealizedPnLPercent < -5) {
    parts.push(`${metrics.unrealizedPnLPercent.toFixed(1)}% unrealized loss`);
  }

  return parts.join(', ') + '.';
}

/**
 * Get portfolio recommendations
 */
export function getPortfolioRecommendations(metrics: PortfolioMetrics): string[] {
  const recommendations = [];

  // Concentration risk
  if (metrics.largestPositionPercent > 30) {
    recommendations.push(`⚠️ REDUCE concentration: Largest position is ${metrics.largestPositionPercent.toFixed(0)}% (should be <25%)`);
  }

  // Sector diversification
  if (metrics.sectorDiversification === 'poor') {
    recommendations.push(`⚠️ DIVERSIFY sectors: Currently ${metrics.sectorDiversification} sector balance`);
  }

  // Cash management
  if (metrics.cashStatus === 'too_high' && metrics.missedOpportunityPercent > 1) {
    recommendations.push(`💰 DEPLOY cash: ${metrics.cashPercent.toFixed(0)}% cash missed ${metrics.missedOpportunityPercent.toFixed(1)}% potential gain`);
  } else if (metrics.cashStatus === 'too_low') {
    recommendations.push(`💵 BUILD cash reserves: Only ${metrics.cashPercent.toFixed(0)}% cash available for opportunities`);
  }

  // Diversification
  if (metrics.diversificationGrade === 'D' || metrics.diversificationGrade === 'F') {
    recommendations.push(`⚠️ IMPROVE diversification: Grade ${metrics.diversificationGrade} (${metrics.effectivePositions.toFixed(1)} effective positions)`);
  }

  // Risk level vs market
  if (metrics.riskLevel === 'aggressive' && metrics.portfolioBeta > 1.5) {
    recommendations.push(`⚠️ HIGH beta: Portfolio is ${metrics.portfolioBeta.toFixed(2)}x more volatile than market`);
  }

  // Winners/losers
  if (metrics.worstPosition && metrics.worstPosition.pnlPercent < -10) {
    recommendations.push(`📉 CUT loser: ${metrics.worstPosition.symbol} down ${metrics.worstPosition.pnlPercent.toFixed(1)}%`);
  }

  if (metrics.bestPosition && metrics.bestPosition.pnlPercent > 20) {
    recommendations.push(`📈 TRIM winner: ${metrics.bestPosition.symbol} up ${metrics.bestPosition.pnlPercent.toFixed(1)}% (take profits)`);
  }

  return recommendations;
}
