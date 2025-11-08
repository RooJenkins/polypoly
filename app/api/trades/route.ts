import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where = agentId ? { agentId } : {};

    const trades = await prisma.trade.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        agent: {
          select: {
            name: true,
            color: true,
            model: true,
          },
        },
      },
    });

    // Transform trades to include UI-expected fields
    const transformedTrades = trades.map(trade => {
      const isBuy = trade.action === 'BUY' || trade.action === 'BUY_TO_COVER';
      const isSell = trade.action === 'SELL' || trade.action === 'SELL_SHORT';

      return {
        ...trade,
        agentName: trade.agent.name,
        agentColor: trade.agent.color,
        agentModel: trade.agent.model,
        side: isBuy ? 'BUY' : 'SELL',
        entryPrice: isBuy ? trade.price : 0,
        exitPrice: isSell ? trade.price : 0,
        holdTime: '', // Calculate from position data if needed
        pnl: trade.realizedPnL || 0,
        pnlPercent: 0, // Calculate if we have entry/exit data
      };
    });

    return NextResponse.json(transformedTrades);
  } catch (error: any) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}
