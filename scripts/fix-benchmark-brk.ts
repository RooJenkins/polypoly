import { prisma } from '../lib/prisma';
import { TOP_20_STOCKS, STARTING_BALANCE } from '../lib/constants';
import { fetchStockPrices } from '../lib/stock-api';

async function fixBenchmarkPositions() {
  console.log('🔧 Fixing Benchmark Positions - Replacing BRK.B\n');

  const benchmarkId = 'benchmark-sp20';

  // 1. Get current benchmark positions
  const existingPositions = await prisma.benchmarkPosition.findMany({
    where: { agentId: benchmarkId }
  });

  console.log(`Current positions: ${existingPositions.length}`);
  console.log('Existing symbols:', existingPositions.map(p => p.symbol).join(', '));
  console.log('');

  // 2. Delete BRK.B if it exists
  const brkPosition = existingPositions.find(p => p.symbol === 'BRK.B');
  if (brkPosition) {
    await prisma.benchmarkPosition.delete({
      where: { id: brkPosition.id }
    });
    console.log('✅ Deleted BRK.B position');
  }

  // 3. Fetch current prices
  console.log('\n📊 Fetching current stock prices...');
  const stocks = await fetchStockPrices();
  console.log(`✓ Fetched ${stocks.length} stock prices\n`);

  // 4. Add missing positions (KO and LLY if they don't exist)
  const dollarsPerStock = STARTING_BALANCE / TOP_20_STOCKS.length; // $500 per stock

  for (const stockDef of TOP_20_STOCKS) {
    const existingPos = existingPositions.find(p => p.symbol === stockDef.symbol && p.symbol !== 'BRK.B');

    if (!existingPos) {
      const stock = stocks.find(s => s.symbol === stockDef.symbol);
      if (!stock) {
        console.log(`⚠️  Could not find price for ${stockDef.symbol}, skipping`);
        continue;
      }

      const shares = dollarsPerStock / stock.price;

      await prisma.benchmarkPosition.create({
        data: {
          agentId: benchmarkId,
          symbol: stock.symbol,
          shares,
          initialPrice: stock.price,
          initialValue: dollarsPerStock,
        }
      });

      console.log(`✅ Added ${stockDef.symbol}: ${shares.toFixed(4)} shares @ $${stock.price.toFixed(2)}`);
    }
  }

  // 5. Verify final count
  const finalPositions = await prisma.benchmarkPosition.findMany({
    where: { agentId: benchmarkId }
  });

  console.log(`\n✅ Final benchmark positions: ${finalPositions.length}/20`);
  console.log('Final symbols:', finalPositions.map(p => p.symbol).sort().join(', '));

  // 6. Update benchmark value
  let totalValue = 0;
  for (const position of finalPositions) {
    const stock = stocks.find(s => s.symbol === position.symbol);
    if (stock) {
      totalValue += position.shares * stock.price;
    }
  }

  await prisma.agent.update({
    where: { id: benchmarkId },
    data: { accountValue: totalValue }
  });

  console.log(`\n💰 Updated benchmark value: $${totalValue.toFixed(2)}`);
  console.log('');

  await prisma.$disconnect();
}

fixBenchmarkPositions()
  .then(() => {
    console.log('✅ Benchmark positions fixed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
