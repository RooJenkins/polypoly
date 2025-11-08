import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchStockPrices } from '@/lib/stock-api';
import { calculatePortfolioAllocation, getAllocationSummary } from '@/lib/portfolio-allocation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        positions: true,
        _count: {
          select: {
            trades: true,
          },
        },
      },
    });

    // Fetch current stock prices
    const stocks = await fetchStockPrices();
    const stockPriceMap = new Map(stocks.map(s => [s.symbol, s.price]));

    // Calculate metrics for each agent
    const agentsWithMetrics = await Promise.all(
      agents.map(async (agent) => {
        // Special handling for S&P 20 Benchmark - uses BenchmarkPosition table
        if (agent.id === 'benchmark-sp20') {
          return {
            id: agent.id,
            name: agent.name,
            model: agent.model,
            color: agent.color,
            accountValue: agent.accountValue, // Use stored value from benchmark calculation
            startingValue: agent.startingValue,
            roi: ((agent.accountValue - agent.startingValue) / agent.startingValue) * 100,
            totalPnL: agent.accountValue - agent.startingValue,
            sharpeRatio: 0,
            maxDrawdown: 0,
            winRate: 0,
            tradeCount: 0,
            biggestWin: 0,
            biggestLoss: 0,
          };
        }

        const trades = await prisma.trade.findMany({
          where: { agentId: agent.id },
        });

        // Recalculate current account value based on live stock prices
        let unrealizedPnL = 0;
        for (const position of agent.positions) {
          const currentPrice = stockPriceMap.get(position.symbol) || position.currentPrice;
          const positionPnL = (currentPrice - position.entryPrice) * position.quantity;
          unrealizedPnL += positionPnL;
        }

        const currentAccountValue = agent.cashBalance + agent.positions.reduce((sum, pos) => {
          const currentPrice = stockPriceMap.get(pos.symbol) || pos.currentPrice;
          return sum + (currentPrice * pos.quantity);
        }, 0);

        const winningTrades = trades.filter((t) => t.realizedPnL && t.realizedPnL > 0);
        const losingTrades = trades.filter((t) => t.realizedPnL && t.realizedPnL < 0);

        const roi = ((currentAccountValue - agent.startingValue) / agent.startingValue) * 100;
        const totalPnL = currentAccountValue - agent.startingValue;
        const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

        const biggestWin = Math.max(...trades.map((t) => t.realizedPnL || 0), 0);
        const biggestLoss = Math.min(...trades.map((t) => t.realizedPnL || 0), 0);

        // Calculate Sharpe Ratio (simplified)
        const performancePoints = await prisma.performancePoint.findMany({
          where: { agentId: agent.id },
          orderBy: { timestamp: 'asc' },
        });

        let sharpeRatio = 0;
        if (performancePoints.length > 1) {
          const returns = [];
          for (let i = 1; i < performancePoints.length; i++) {
            const returnPct =
              (performancePoints[i].accountValue - performancePoints[i - 1].accountValue) /
              performancePoints[i - 1].accountValue;
            returns.push(returnPct);
          }

          if (returns.length > 0) {
            const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
            const stdDev = Math.sqrt(
              returns.reduce((sq, n) => sq + Math.pow(n - avgReturn, 2), 0) / returns.length
            );
            sharpeRatio = stdDev !== 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
          }
        }

        // Calculate max drawdown
        let maxDrawdown = 0;
        let peak = performancePoints[0]?.accountValue || agent.startingValue;
        for (const point of performancePoints) {
          if (point.accountValue > peak) {
            peak = point.accountValue;
          }
          const drawdown = ((peak - point.accountValue) / peak) * 100;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }
        }

        // Calculate portfolio allocation by asset class
        let allocation = null;
        let allocationSummary = null;
        try {
          const portfolioBreakdown = await calculatePortfolioAllocation(agent.id);
          allocation = portfolioBreakdown.allocations;
          allocationSummary = getAllocationSummary(portfolioBreakdown);
        } catch (error) {
          console.error(`Error calculating allocation for ${agent.name}:`, error);
        }

        return {
          id: agent.id,
          name: agent.name,
          model: agent.model,
          color: agent.color,
          accountValue: currentAccountValue,
          startingValue: agent.startingValue,
          roi,
          totalPnL,
          sharpeRatio,
          maxDrawdown,
          winRate,
          tradeCount: trades.length,
          biggestWin,
          biggestLoss,
          allocation,
          allocationSummary,
        };
      })
    );

    return NextResponse.json(agentsWithMetrics);
  } catch (error: any) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}
