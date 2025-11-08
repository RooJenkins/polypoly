import { prisma } from '../lib/prisma';

async function resetProduction() {
  console.log('🔄 Resetting production database...\n');

  try {
    // 1. Delete all positions
    const deletedPositions = await prisma.position.deleteMany({});
    console.log(`✅ Deleted ${deletedPositions.count} positions`);

    // 2. Delete all trades
    const deletedTrades = await prisma.trade.deleteMany({});
    console.log(`✅ Deleted ${deletedTrades.count} trades`);

    // 3. Delete all decisions
    const deletedDecisions = await prisma.decision.deleteMany({});
    console.log(`✅ Deleted ${deletedDecisions.count} decisions`);

    // 4. Delete all performance points
    const deletedPerformance = await prisma.performancePoint.deleteMany({});
    console.log(`✅ Deleted ${deletedPerformance.count} performance points`);

    // 5. Delete all stock prices
    const deletedStockPrices = await prisma.stockPrice.deleteMany({});
    console.log(`✅ Deleted ${deletedStockPrices.count} stock prices`);

    // 6. Reset all agents to $10,000 each
    const agents = await prisma.agent.findMany();
    console.log(`\n💰 Resetting ${agents.length} agents to $10,000 each:\n`);

    for (const agent of agents) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          cashBalance: 10000,
          accountValue: 10000
        }
      });
      console.log(`  ✅ ${agent.name}: $10,000.00`);
    }

    console.log(`\n✅ Production database reset complete!`);
    console.log(`💵 Total Capital: $${(agents.length * 10000).toLocaleString()}`);
    console.log(`🎯 Ready for fresh trading\n`);
  } catch (error) {
    console.error('❌ Error resetting production:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetProduction();
