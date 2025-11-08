import { prisma } from '../lib/prisma';

async function checkTrades() {
  console.log('📊 Checking recent trades...\n');

  const trades = await prisma.trade.findMany({
    orderBy: { timestamp: 'desc' },
    take: 20,
    include: {
      agent: {
        select: { name: true, model: true }
      }
    }
  });

  if (trades.length === 0) {
    console.log('❌ No trades found in database');
    return;
  }

  console.log(`✅ Found ${trades.length} trades:\n`);

  for (const trade of trades) {
    console.log(`${trade.action === 'BUY' ? '🟢' : '🔴'} ${trade.agent.name} (${trade.agent.model})`);
    console.log(`   ${trade.action} ${trade.quantity} shares of ${trade.symbol} @ $${trade.price.toFixed(2)}`);
    console.log(`   Date: ${trade.timestamp.toLocaleString()}`);
    console.log(`   Trade ID: ${trade.id}\n`);
  }

  console.log('\n📈 Checking positions...\n');

  const positions = await prisma.position.findMany({
    include: {
      agent: {
        select: { name: true }
      }
    }
  });

  if (positions.length === 0) {
    console.log('❌ No positions found');
  } else {
    console.log(`✅ Found ${positions.length} positions:\n`);
    for (const pos of positions) {
      console.log(`${pos.agent.name}: ${pos.quantity} shares of ${pos.symbol} @ avg $${pos.entryPrice.toFixed(2)}`);
    }
  }

  await prisma.$disconnect();
}

checkTrades().catch(console.error);
