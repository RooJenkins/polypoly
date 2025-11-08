/**
 * Check decision data to debug empty EXIT PLAN and TRADE REASONING
 */

import { prisma } from '../lib/prisma';

async function checkDecisions() {
  console.log('📊 Checking recent decisions...\n');

  // Get all positions
  const positions = await prisma.position.findMany({
    orderBy: { openedAt: 'desc' },
    take: 10,
  });

  console.log(`Found ${positions.length} positions:\n`);

  for (const position of positions) {
    console.log(`\n━━━ Position: ${position.symbol} (${position.agentId}) ━━━`);
    console.log(`  Opened: ${position.openedAt}`);
    console.log(`  Quantity: ${position.quantity}`);
    console.log(`  Entry: $${position.entryPrice}`);

    // Find matching BUY decision
    const decisions = await prisma.decision.findMany({
      where: {
        agentId: position.agentId,
        symbol: position.symbol,
        action: 'BUY',
      },
      orderBy: { timestamp: 'desc' },
      take: 1,
    });

    if (decisions.length === 0) {
      console.log('  ❌ No matching BUY decision found!');
    } else {
      const decision = decisions[0];
      console.log(`  ✅ Found BUY decision from ${decision.timestamp}`);
      console.log(`  Reasoning: ${decision.reasoning?.slice(0, 100)}...`);
      console.log(`  Target Price: $${decision.targetPrice || 'NOT SET'}`);
      console.log(`  Stop Loss: $${decision.stopLoss || 'NOT SET'}`);
      console.log(`  Invalidation: ${decision.invalidationCondition || 'NOT SET'}`);
    }
  }

  // Also check recent decisions
  console.log('\n\n📋 Recent Decisions (all):');
  const recentDecisions = await prisma.decision.findMany({
    orderBy: { timestamp: 'desc' },
    take: 10,
    include: {
      agent: {
        select: { name: true },
      },
    },
  });

  for (const d of recentDecisions) {
    console.log(`\n${d.agent.name} - ${d.action} ${d.symbol || 'N/A'}`);
    console.log(`  Timestamp: ${d.timestamp}`);
    console.log(`  Confidence: ${d.confidence}%`);
    console.log(`  Has Reasoning: ${!!d.reasoning}`);
    console.log(`  Has Target: ${!!d.targetPrice}`);
    console.log(`  Has Stop Loss: ${!!d.stopLoss}`);
  }

  await prisma.$disconnect();
}

checkDecisions();
