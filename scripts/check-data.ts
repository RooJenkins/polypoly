import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  // Check StockPrice data
  const stockPrices = await prisma.stockPrice.groupBy({
    by: ['symbol'],
    _min: { timestamp: true },
    _max: { timestamp: true },
    _count: true,
  });

  console.log('\n📊 StockPrice Data Range:\n');
  stockPrices.slice(0, 5).forEach((sp) => {
    console.log(`${sp.symbol}:`);
    console.log(`  First: ${sp._min.timestamp?.toLocaleString()}`);
    console.log(`  Last:  ${sp._max.timestamp?.toLocaleString()}`);
    console.log(`  Count: ${sp._count}`);
  });

  // Check Agent performance
  const agents = await prisma.agent.findMany({
    select: {
      id: true,
      name: true,
      accountValue: true,
      startingValue: true,
    },
  });

  console.log('\n💰 Agent Account Values:\n');
  agents.forEach((agent) => {
    const gain = agent.accountValue - agent.startingValue;
    const gainPct = ((gain / agent.startingValue) * 100).toFixed(2);
    console.log(`${agent.name}: $${agent.accountValue.toFixed(2)} (${gainPct >= '0' ? '+' : ''}${gainPct}%)`);
  });

  await prisma.$disconnect();
}

checkData().catch(console.error);
