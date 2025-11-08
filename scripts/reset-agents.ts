import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAgents() {
  try {
    console.log('🔄 Resetting all agents to $10,000...\n');

    // Delete all performance tracking data
    const deletedPerformancePoints = await prisma.performancePoint.deleteMany();
    console.log(`✅ Deleted ${deletedPerformancePoints.count} performance points`);

    // Delete all trading decisions
    const deletedDecisions = await prisma.decision.deleteMany();
    console.log(`✅ Deleted ${deletedDecisions.count} decisions`);

    // Delete all trades
    const deletedTrades = await prisma.trade.deleteMany();
    console.log(`✅ Deleted ${deletedTrades.count} trades`);

    // Delete all positions
    const deletedPositions = await prisma.position.deleteMany();
    console.log(`✅ Deleted ${deletedPositions.count} positions`);

    // Reset all agents to $10,000 starting balance
    const updatedAgents = await prisma.agent.updateMany({
      data: {
        accountValue: 10000,
        cashBalance: 10000,
        startingValue: 10000,
        lastSyncAt: new Date(),
      },
    });
    console.log(`✅ Reset ${updatedAgents.count} agents to $10,000\n`);

    // Show current agent status
    const agents = await prisma.agent.findMany({
      select: {
        name: true,
        broker: true,
        isLive: true,
        accountValue: true,
        cashBalance: true,
        startingValue: true,
      },
      orderBy: { name: 'asc' },
    });

    console.log('📊 Current Agent Status:');
    console.log('─'.repeat(80));
    agents.forEach(agent => {
      console.log(
        `${agent.name.padEnd(20)} | ${agent.broker?.padEnd(15) || 'simulation'.padEnd(15)} | ` +
        `Live: ${agent.isLive ? '✓' : '✗'} | Balance: $${agent.accountValue.toLocaleString()}`
      );
    });
    console.log('─'.repeat(80));
    console.log('\n✨ All agents reset successfully!');

  } catch (error) {
    console.error('❌ Error resetting agents:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetAgents();
