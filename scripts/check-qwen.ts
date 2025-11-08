import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkQwen() {
  // Find Qwen agent
  const qwen = await prisma.agent.findFirst({
    where: { name: 'Qwen' },
    include: {
      positions: true,
      trades: {
        orderBy: { timestamp: 'desc' },
        take: 3
      },
      decisions: {
        orderBy: { timestamp: 'desc' },
        take: 3
      }
    }
  });

  if (!qwen) {
    console.log('❌ Qwen agent not found');
    return;
  }

  console.log('\n🤖 Qwen Agent Status:\n');
  console.log(`Account Value: $${qwen.accountValue.toFixed(2)}`);
  console.log(`Cash Balance: $${qwen.cashBalance.toFixed(2)}`);
  console.log(`Starting Value: $${qwen.startingValue.toFixed(2)}`);
  console.log(`\nPositions: ${qwen.positions.length}`);

  if (qwen.positions.length > 0) {
    console.log('\nCurrent Positions:');
    qwen.positions.forEach(p => {
      console.log(`  ${p.symbol}: ${p.quantity} shares @ $${p.entryPrice} (P&L: $${p.unrealizedPnL.toFixed(2)})`);
    });
  }

  console.log(`\n📊 Recent Trades (last 3):`);
  if (qwen.trades.length === 0) {
    console.log('  No trades executed');
  } else {
    qwen.trades.forEach(t => {
      console.log(`\n  ${t.action} ${t.symbol} - ${t.quantity} shares @ $${t.price}`);
      console.log(`  Time: ${t.timestamp.toISOString()}`);
      console.log(`  Reasoning (first 100 chars): ${t.reasoning.substring(0, 100)}...`);
    });
  }

  console.log(`\n🧠 Recent Decisions (last 3):`);
  if (qwen.decisions.length === 0) {
    console.log('  No decisions recorded');
  } else {
    qwen.decisions.forEach(d => {
      console.log(`\n  Action: ${d.action} ${d.symbol || '(none)'}`);
      console.log(`  Time: ${d.timestamp.toISOString()}`);
      console.log(`  Reasoning (first 150 chars): ${d.reasoning.substring(0, 150)}...`);
    });
  }

  await prisma.$disconnect();
}

checkQwen();
