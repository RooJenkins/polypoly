import { NextResponse } from 'next/server';
import { fetchStockPrices } from '@/lib/stock-api';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stocks = await fetchStockPrices();

    // Save to database for historical tracking
    await Promise.all(
      stocks.map((stock) =>
        prisma.stockPrice.create({
          data: {
            symbol: stock.symbol,
            name: stock.name,
            price: stock.price,
            change: stock.change,
            changePercent: stock.changePercent,
            timestamp: new Date(),
          },
        })
      )
    );

    return NextResponse.json(stocks);
  } catch (error: any) {
    console.error('Error fetching stock prices:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock prices' },
      { status: 500 }
    );
  }
}
