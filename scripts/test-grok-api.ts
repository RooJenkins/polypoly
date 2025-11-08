import { prisma } from '../lib/prisma';
import { getAIDecision } from '../lib/ai-models';
import { fetchStockPrices } from '../lib/stock-api';

async function testGrok() {
  console.log('🧪 Testing Grok API Integration\n');

  // Get Grok agent
  const grok = await prisma.agent.findFirst({
    where: { name: 'Grok' },
    include: { positions: true }
  });

  if (!grok) {
    console.log('❌ Grok agent not found');
    await prisma.$disconnect();
    return;
  }

  console.log('✅ Found Grok agent:', grok.id);
  console.log('💰 Account Value: $' + grok.accountValue.toFixed(2));
  console.log('💵 Cash Balance: $' + grok.cashBalance.toFixed(2));
  console.log('📈 Positions:', grok.positions.length);
  console.log('');

  // Fetch stock data
  console.log('📊 Fetching stock prices...');
  const stocks = await fetchStockPrices();
  console.log('✓ Fetched', stocks.length, 'stocks\n');

  // Create market context
  const context = {
    stocks,
    cashBalance: grok.cashBalance,
    accountValue: grok.accountValue,
    positions: grok.positions.map(p => ({
      symbol: p.symbol,
      name: p.name,
      quantity: p.quantity,
      entryPrice: p.entryPrice,
      currentPrice: p.currentPrice,
      unrealizedPnL: p.unrealizedPnL,
      unrealizedPnLPercent: p.unrealizedPnLPercent,
    })),
    marketTrend: { daily: 0.3, weekly: 0 },
    agentStats: {
      winRate: 50,
      totalTrades: 2,
      avgWin: 1.5,
      avgLoss: -1.5,
      bestTrade: 3,
      worstTrade: -3
    },
    news: []
  };

  // Get decision from Grok
  console.log('🤖 Calling Grok API...\n');
  const decision = await getAIDecision(grok.id, grok.name, context);

  console.log('');
  console.log('✅ GROK API RESPONSE:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Action:', decision.action);
  console.log('Symbol:', decision.symbol || 'N/A');
  console.log('Quantity:', decision.quantity || 'N/A');
  console.log('Confidence:', (decision.confidence * 100).toFixed(1) + '%');
  console.log('');
  console.log('Reasoning (' + decision.reasoning.length + ' chars):');
  console.log(decision.reasoning);
  console.log('');
  if (decision.targetPrice) console.log('Target Price: $' + decision.targetPrice.toFixed(2));
  if (decision.stopLoss) console.log('Stop Loss: $' + decision.stopLoss.toFixed(2));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (decision.reasoning.length >= 200) {
    console.log('\n✅ Reasoning validation: PASSED (>= 200 chars)');
  } else {
    console.log('\n❌ Reasoning validation: FAILED (<200 chars)');
  }

  await prisma.$disconnect();
}

testGrok()
  .then(() => {
    console.log('\n✅ Grok API test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Grok API test failed:', error);
    process.exit(1);
  });
