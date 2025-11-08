import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'accountValue';
    const order = searchParams.get('order') || 'desc';

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

    // Calculate all metrics
    const leaderboard = await Promise.all(
      agents.map(async (agent) => {
        const trades = await prisma.trade.findMany({
          where: { agentId: agent.id },
        });

        const winningTrades = trades.filter((t) => t.realizedPnL && t.realizedPnL > 0);
        const roi = ((agent.accountValue - agent.startingValue) / agent.startingValue) * 100;
        const totalPnL = agent.accountValue - agent.startingValue;
        const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

        const biggestWin = Math.max(...trades.map((t) => t.realizedPnL || 0), 0);
        const biggestLoss = Math.min(...trades.map((t) => t.realizedPnL || 0), 0);

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
            sharpeRatio = stdDev !== 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
          }
        }

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

        return {
          id: agent.id,
          name: agent.name,
          model: agent.model,
          color: agent.color,
          accountValue: agent.accountValue,
          startingValue: agent.startingValue,
          roi,
          totalPnL,
          sharpeRatio,
          maxDrawdown,
          winRate,
          tradeCount: trades.length,
          biggestWin,
          biggestLoss,
          positionsCount: agent.positions.length,
        };
      })
    );

    // Sort the leaderboard
    leaderboard.sort((a, b) => {
      const aVal = a[sortBy as keyof typeof a] as number;
      const bVal = b[sortBy as keyof typeof b] as number;
      return order === 'desc' ? bVal - aVal : aVal - bVal;
    });

    // Add rank
    const rankedLeaderboard = leaderboard.map((agent, index) => ({
      ...agent,
      rank: index + 1,
    }));

    return NextResponse.json(rankedLeaderboard);
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
