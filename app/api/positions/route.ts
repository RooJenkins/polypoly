import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchStockPrices } from '@/lib/stock-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    const where = agentId ? { agentId } : {};

    const positions = await prisma.position.findMany({
      where,
      orderBy: { openedAt: 'desc' },
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

    // Fetch current stock prices
    const stocks = await fetchStockPrices();
    const stockPriceMap = new Map(stocks.map(s => [s.symbol, s.price]));

    // Recalculate positions with current prices
    const updatedPositions = positions.map(position => {
      const currentPrice = stockPriceMap.get(position.symbol) || position.currentPrice;
      const unrealizedPnL = (currentPrice - position.entryPrice) * position.quantity;
      const unrealizedPnLPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

      return {
        ...position,
        agentName: position.agent.name, // Flatten agent name
        agentColor: position.agent.color, // Flatten agent color
        agentModel: position.agent.model, // Flatten agent model
        currentPrice,
        unrealizedPnL,
        unrealizedPnLPercent,
        pnl: unrealizedPnL, // Add pnl alias for UI compatibility
        pnlPercent: unrealizedPnLPercent, // Add pnlPercent alias for UI compatibility
      };
    });

    return NextResponse.json(updatedPositions);
  } catch (error: any) {
    console.error('Error fetching positions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch positions' },
      { status: 500 }
    );
  }
}
