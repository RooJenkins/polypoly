import { prisma } from '../lib/prisma';

async function checkAgentValues() {
  console.log('Fetching agent data from database...\n');

  const agents = await prisma.agent.findMany({
    include: {
      positions: true,
      _count: {
        select: { trades: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log('=== AGENT ACCOUNT VALUES ===\n');

  for (const agent of agents) {
    const roi = ((agent.accountValue - agent.startingValue) / agent.startingValue) * 100;
    const totalPnL = agent.accountValue - agent.startingValue;

    console.log(`${agent.name} (${agent.model})`);
    console.log(`  Account Value: $${agent.accountValue.toFixed(2)}`);
    console.log(`  Starting Value: $${agent.startingValue.toFixed(2)}`);
    console.log(`  Cash Balance: $${agent.cashBalance.toFixed(2)}`);
    console.log(`  ROI: ${roi.toFixed(2)}%`);
    console.log(`  Total P&L: $${totalPnL.toFixed(2)}`);
    console.log(`  Positions: ${agent.positions.length}`);
    console.log(`  Trades: ${agent._count.trades}`);

    if (agent.positions.length > 0) {
      console.log('  Open Positions:');
      for (const pos of agent.positions) {
        console.log(`    - ${pos.symbol}: ${pos.quantity} @ $${pos.currentPrice.toFixed(2)} (Entry: $${pos.entryPrice.toFixed(2)})`);
        console.log(`      Unrealized P&L: $${pos.unrealizedPnL.toFixed(2)} (${pos.unrealizedPnLPercent.toFixed(2)}%)`);
      }
    }
    console.log('');
  }

  // Calculate totals
  const totalValue = agents.reduce((sum, agent) => sum + agent.accountValue, 0);
  const startingValue = agents.length * 10000;
  const totalGain = totalValue - startingValue;
  const totalGainPercent = (totalGain / startingValue) * 100;

  console.log('=== PORTFOLIO SUMMARY ===');
  console.log(`Total Agents: ${agents.length}`);
  console.log(`Starting Value: $${startingValue.toFixed(2)}`);
  console.log(`Current Value: $${totalValue.toFixed(2)}`);
  console.log(`Total Gain/Loss: $${totalGain.toFixed(2)}`);
  console.log(`Total Gain/Loss %: ${totalGainPercent.toFixed(2)}%`);

  await prisma.$disconnect();
}

checkAgentValues().catch(console.error);
