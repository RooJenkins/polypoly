import { NextResponse } from 'next/server';
import { scanAllMarkets } from '@/lib/market-scanner';
import { getAllMarketHours } from '@/lib/market-hours';
import { prisma } from '@/lib/prisma';
import type { AssetClass } from '@/lib/asset-class-detector';

export const dynamic = 'force-dynamic';

/**
 * GET /api/markets/overview
 *
 * Returns overview of all 6 markets with:
 * - Current performance
 * - Open/closed status
 * - Top performers
 * - Number of instruments
 * - AI activity in each market
 */
export async function GET() {
  try {
    // Get market scan data (real-time prices)
    const marketScan = await scanAllMarkets();

    // Get market hours status
    const marketHours = getAllMarketHours();

    // Get AI activity by market (how many AIs are trading each market)
    const aiActivityByMarket = await getAIActivityByMarket();

    // Combine all data
    const marketOverview = marketScan.map((scan) => {
      const hours = marketHours.find(h => h.assetClass === scan.assetClass);
      const aiActivity = aiActivityByMarket[scan.assetClass] || { agentsTrading: 0, totalPositions: 0 };

      return {
        assetClass: scan.assetClass,
        displayName: scan.assetClass.charAt(0).toUpperCase() + scan.assetClass.slice(1),
        icon: getMarketIcon(scan.assetClass),
        color: getMarketColor(scan.assetClass),

        // Performance
        performance1d: scan.performance1d,
        regime: scan.regime,
        strength: scan.strength,

        // Instruments
        instrumentCount: scan.instrumentCount,

        // Top performers
        topPerformer: scan.topPerformer,
        worstPerformer: scan.worstPerformer,

        // Market hours
        isOpen: hours?.isOpen || false,
        isPreMarket: hours?.isPreMarket || false,
        isAfterHours: hours?.isAfterHours || false,
        nextOpenTime: hours?.nextOpenTime,
        timeUntilOpen: hours?.timeUntilOpen,
        timeUntilClose: hours?.timeUntilClose,

        // AI activity
        agentsTrading: aiActivity.agentsTrading,
        totalPositions: aiActivity.totalPositions,
      };
    });

    return NextResponse.json({
      success: true,
      data: marketOverview,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching market overview:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get AI activity (positions) by market
 */
async function getAIActivityByMarket(): Promise<Record<AssetClass, { agentsTrading: number; totalPositions: number }>> {
  const positions = await prisma.position.findMany({
    select: {
      assetClass: true,
      agentId: true,
    },
  });

  const activity: Record<string, { agentsTrading: number; totalPositions: number; agents: Set<string> }> = {};

  // Initialize all asset classes
  const assetClasses: AssetClass[] = ['stocks', 'crypto', 'commodities', 'bonds', 'forex', 'REITs'];
  assetClasses.forEach(ac => {
    activity[ac] = { agentsTrading: 0, totalPositions: 0, agents: new Set() };
  });

  // Count positions and unique agents per asset class
  positions.forEach(pos => {
    const assetClass = (pos.assetClass || 'stocks') as AssetClass;
    if (!activity[assetClass]) {
      activity[assetClass] = { agentsTrading: 0, totalPositions: 0, agents: new Set() };
    }
    activity[assetClass].totalPositions++;
    activity[assetClass].agents.add(pos.agentId);
  });

  // Convert to final format
  const result: Record<AssetClass, { agentsTrading: number; totalPositions: number }> = {} as any;
  Object.entries(activity).forEach(([assetClass, data]) => {
    result[assetClass as AssetClass] = {
      agentsTrading: data.agents.size,
      totalPositions: data.totalPositions,
    };
  });

  return result;
}

function getMarketIcon(assetClass: string): string {
  const icons: Record<string, string> = {
    stocks: '📈',
    crypto: '🪙',
    commodities: '🥇',
    bonds: '📊',
    forex: '💱',
    REITs: '🏢',
  };
  return icons[assetClass] || '📊';
}

function getMarketColor(assetClass: string): string {
  const colors: Record<string, string> = {
    stocks: '#3B82F6',
    crypto: '#F59E0B',
    commodities: '#EAB308',
    bonds: '#10B981',
    forex: '#8B5CF6',
    REITs: '#EC4899',
  };
  return colors[assetClass] || '#6B7280';
}
