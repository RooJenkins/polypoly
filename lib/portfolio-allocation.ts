/**
 * POLYPOLY - Portfolio Allocation Calculator
 *
 * Calculates portfolio allocation across different asset classes
 * Shows which markets the AI is invested in and what percentage
 */

import { prisma } from './prisma';
import type { AssetClass } from './asset-class-detector';
import { getAssetClass, getAssetClassDisplayName, getAssetClassIcon, getAssetClassColor } from './asset-class-detector';

export interface AssetAllocation {
  assetClass: AssetClass;
  displayName: string;
  icon: string;
  color: string;

  // Position metrics
  positionCount: number;
  positionValue: number;

  // Performance
  unrealizedPnL: number;
  unrealizedPnLPercent: number;

  // Allocation
  percentOfPortfolio: number;
  cashAllocated: number;
}

export interface PortfolioBreakdown {
  agentId: string;
  agentName: string;
  totalValue: number;
  cashBalance: number;
  investedValue: number;

  // Allocation by asset class
  allocations: AssetAllocation[];

  // Summary stats
  totalPositions: number;
  totalUnrealizedPnL: number;
  diversificationScore: number; // 0-100, higher = more diversified
}

/**
 * Calculate portfolio allocation for an agent
 */
export async function calculatePortfolioAllocation(agentId: string): Promise<PortfolioBreakdown> {
  // Fetch agent data
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      positions: true,
    },
  });

  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  // Group positions by asset class
  const positionsByAssetClass = new Map<AssetClass, typeof agent.positions>();

  for (const position of agent.positions) {
    // Detect asset class from symbol or use existing assetClass field
    const assetClass = position.assetClass as AssetClass || getAssetClass(position.symbol);

    if (!positionsByAssetClass.has(assetClass)) {
      positionsByAssetClass.set(assetClass, []);
    }
    positionsByAssetClass.get(assetClass)!.push(position);
  }

  // Calculate total invested value
  const investedValue = agent.positions.reduce((sum, p) => {
    return sum + (p.quantity * p.currentPrice);
  }, 0);

  const totalValue = agent.accountValue;
  const totalUnrealizedPnL = agent.positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);

  // Build allocations array
  const allocations: AssetAllocation[] = [];

  // Define all asset classes to show (even if 0%)
  const allAssetClasses: AssetClass[] = ['stocks', 'crypto', 'commodities', 'bonds', 'forex', 'REITs'];

  for (const assetClass of allAssetClasses) {
    const positions = positionsByAssetClass.get(assetClass) || [];

    const positionValue = positions.reduce((sum, p) => {
      return sum + (p.quantity * p.currentPrice);
    }, 0);

    const unrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);

    const percentOfPortfolio = totalValue > 0 ? (positionValue / totalValue) * 100 : 0;

    const unrealizedPnLPercent = positionValue > 0 ? (unrealizedPnL / positionValue) * 100 : 0;

    allocations.push({
      assetClass,
      displayName: getAssetClassDisplayName(assetClass),
      icon: getAssetClassIcon(assetClass),
      color: getAssetClassColor(assetClass),
      positionCount: positions.length,
      positionValue,
      unrealizedPnL,
      unrealizedPnLPercent,
      percentOfPortfolio,
      cashAllocated: positionValue,
    });
  }

  // Sort by allocation percentage (highest first)
  allocations.sort((a, b) => b.percentOfPortfolio - a.percentOfPortfolio);

  // Calculate diversification score
  // Higher score = more evenly distributed across asset classes
  const activeAllocations = allocations.filter(a => a.percentOfPortfolio > 0);
  const diversificationScore = calculateDiversificationScore(allocations);

  return {
    agentId: agent.id,
    agentName: agent.name,
    totalValue,
    cashBalance: agent.cashBalance,
    investedValue,
    allocations,
    totalPositions: agent.positions.length,
    totalUnrealizedPnL,
    diversificationScore,
  };
}

/**
 * Calculate diversification score (0-100)
 * Perfect diversification (equal across all 6 markets) = 100
 * All in one market = 0
 */
function calculateDiversificationScore(allocations: AssetAllocation[]): number {
  const activeMarkets = allocations.filter(a => a.percentOfPortfolio > 0).length;

  if (activeMarkets === 0) {
    return 0;
  }

  // Ideal allocation is equal distribution
  const idealPercent = 100 / 6; // 6 asset classes

  // Calculate how far each allocation is from ideal
  const deviation = allocations.reduce((sum, a) => {
    return sum + Math.abs(a.percentOfPortfolio - idealPercent);
  }, 0);

  // Perfect score = 0 deviation, worst score = maximum deviation
  const maxDeviation = 100 * 2; // Maximum possible deviation
  const score = Math.max(0, 100 - (deviation / maxDeviation) * 100);

  return Math.round(score);
}

/**
 * Get allocation summary text for AI display
 */
export function getAllocationSummary(breakdown: PortfolioBreakdown): string {
  const active = breakdown.allocations.filter(a => a.percentOfPortfolio > 1);

  if (active.length === 0) {
    return '100% Cash (No positions)';
  }

  const parts = active.map(a => {
    return `${a.icon} ${a.displayName} ${a.percentOfPortfolio.toFixed(1)}%`;
  });

  const cashPercent = (breakdown.cashBalance / breakdown.totalValue) * 100;
  if (cashPercent > 1) {
    parts.push(`💵 Cash ${cashPercent.toFixed(1)}%`);
  }

  return parts.join(', ');
}

/**
 * Get asset allocation for a specific trade
 */
export function getTradeAssetClass(symbol: string): AssetClass {
  return getAssetClass(symbol);
}

/**
 * Format allocation for display in UI
 */
export function formatAllocationForDisplay(allocation: AssetAllocation): string {
  if (allocation.positionCount === 0) {
    return `${allocation.icon} ${allocation.displayName}: 0%`;
  }

  const sign = allocation.unrealizedPnL >= 0 ? '+' : '';

  return `${allocation.icon} ${allocation.displayName}: ${allocation.percentOfPortfolio.toFixed(1)}% (${allocation.positionCount} positions, ${sign}$${allocation.unrealizedPnL.toFixed(2)})`;
}
