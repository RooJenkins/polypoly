import { PrismaClient } from '@prisma/client';
import YahooFinance from 'yahoo-finance2';
import { TOP_20_STOCKS } from '../lib/constants';

const prisma = new PrismaClient();
const yahooFinance = new YahooFinance({
  validation: { logErrors: false, logOptionsErrors: false },
});

async function backfillHistoricalPrices() {
  console.log('📊 Backfilling historical stock prices for last 30 days...\n');

  const endDate = new Date();
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  let totalInserted = 0;

  for (const stock of TOP_20_STOCKS) {
    try {
      console.log(`Fetching ${stock.symbol}...`);

      const result = await yahooFinance.chart(stock.symbol, {
        period1: startDate,
        period2: endDate,
        interval: '1d', // Daily data
      });

      if (!result || !result.quotes || result.quotes.length === 0) {
        console.log(`  ⚠️  No data for ${stock.symbol}`);
        continue;
      }

      // Check if data already exists for this symbol/date range
      const existing = await prisma.stockPrice.findFirst({
        where: {
          symbol: stock.symbol,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      if (existing) {
        console.log(`  ⏭️  Already has data, skipping`);
        continue;
      }

      // Insert each day's closing price
      const records = result.quotes
        .filter(q => q.close && q.date)
        .map(q => ({
          symbol: stock.symbol,
          name: stock.name,
          price: q.close!,
          change: 0,
          changePercent: 0,
          timestamp: q.date!,
        }));

      await prisma.stockPrice.createMany({
        data: records,
      });

      totalInserted += result.quotes.length;
      console.log(`  ✓ Added ${result.quotes.length} days of data`);
    } catch (error: any) {
      console.error(`  ❌ Error for ${stock.symbol}:`, error.message);
    }
  }

  console.log(`\n✅ Backfill complete! Inserted/updated ${totalInserted} price records`);

  // Show new data range
  const stockPrices = await prisma.stockPrice.groupBy({
    by: ['symbol'],
    _min: { timestamp: true },
    _max: { timestamp: true },
    _count: true,
  });

  console.log('\n📊 Updated StockPrice Data Range:\n');
  stockPrices.slice(0, 5).forEach((sp) => {
    console.log(`${sp.symbol}:`);
    console.log(`  First: ${sp._min.timestamp?.toLocaleString()}`);
    console.log(`  Last:  ${sp._max.timestamp?.toLocaleString()}`);
    console.log(`  Count: ${sp._count}`);
  });

  await prisma.$disconnect();
}

backfillHistoricalPrices().catch(console.error);
