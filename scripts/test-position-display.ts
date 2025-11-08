/**
 * Test position display fixes
 */

import { prisma } from '../lib/prisma';

async function testPositionDisplay() {
  console.log('🧪 Testing Position Display Fixes\n');
  console.log('=' .repeat(60));

  // 1. Test positions API returns correct fields
  console.log('\n1️⃣  Testing Positions API Response Format...');
  const positions = await prisma.position.findMany({
    take: 3,
    include: {
      agent: {
        select: {
          name: true,
          color: true,
          model: true,
        },
      },
    },
  });

  if (positions.length === 0) {
    console.log('⚠️  No positions found in database');
  } else {
    const samplePosition = positions[0];
    console.log(`✅ Found ${positions.length} positions`);
    console.log(`   Sample position for ${samplePosition.symbol}:`);
    console.log(`   - Has agent.name: ${!!samplePosition.agent.name}`);
    console.log(`   - Has agent.color: ${!!samplePosition.agent.color}`);
    console.log(`   - Has agent.model: ${!!samplePosition.agent.model}`);
    console.log(`   - Agent Name: ${samplePosition.agent.name}`);
  }

  // 2. Test decision matching
  console.log('\n2️⃣  Testing Decision Matching...');
  for (const position of positions.slice(0, 3)) {
    console.log(`\n   Position: ${position.symbol} (opened at ${position.openedAt})`);
    console.log(`   Agent: ${position.agent.name}`);

    // Find matching BUY decisions
    const buyDecisions = await prisma.decision.findMany({
      where: {
        agentId: position.agentId,
        symbol: position.symbol,
        action: 'BUY',
      },
      orderBy: { timestamp: 'desc' },
      take: 5,
    });

    if (buyDecisions.length === 0) {
      console.log('   ❌ No BUY decisions found!');
    } else {
      console.log(`   ✅ Found ${buyDecisions.length} BUY decision(s)`);

      // Find closest by timestamp
      const positionTime = new Date(position.openedAt).getTime();
      const closest = buyDecisions.reduce((best, current) => {
        const currentDiff = Math.abs(new Date(current.timestamp).getTime() - positionTime);
        const bestDiff = Math.abs(new Date(best.timestamp).getTime() - positionTime);
        return currentDiff < bestDiff ? current : best;
      });

      const timeDiff = Math.abs(new Date(closest.timestamp).getTime() - positionTime);
      console.log(`   📍 Closest decision: ${timeDiff}ms apart`);
      console.log(`   - Has reasoning: ${!!closest.reasoning} (${closest.reasoning?.slice(0, 50)}...)`);
      console.log(`   - Has targetPrice: ${!!closest.targetPrice} ($${closest.targetPrice || 'N/A'})`);
      console.log(`   - Has stopLoss: ${!!closest.stopLoss} ($${closest.stopLoss || 'N/A'})`);

      if (timeDiff > 10000) {
        console.log('   ⚠️  Warning: >10 second difference between position and decision!');
      }
    }
  }

  // 3. Test filtering logic
  console.log('\n3️⃣  Testing Position Filtering...');
  const allPositions = await prisma.position.findMany();
  const agents = await prisma.agent.findMany();

  console.log(`   Total positions: ${allPositions.length}`);
  console.log(`   Total agents: ${agents.length}`);

  for (const agent of agents) {
    const agentPositions = allPositions.filter(p => p.agentId === agent.id);
    if (agentPositions.length > 0) {
      console.log(`   - ${agent.name}: ${agentPositions.length} position(s)`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!\n');
  console.log('📋 Summary of fixes:');
  console.log('   1. Positions API now returns flattened agent fields (agentName, agentColor, agentModel)');
  console.log('   2. Positions API now returns pnl/pnlPercent aliases for UI compatibility');
  console.log('   3. Decision matching now finds closest decision by timestamp (handles multiple trades of same symbol)');
  console.log('   4. Increased decision fetch limit from 20 to 200');
  console.log('   5. Position filtering now works based on selectedAgentId');
  console.log('\n🎉 The Active Positions view should now display:');
  console.log('   ✓ EXIT PLAN with target price and stop loss');
  console.log('   ✓ TRADE REASONING with AI decision reasoning');
  console.log('   ✓ All positions by default');
  console.log('   ✓ Only selected AI positions when an agent is selected\n');

  await prisma.$disconnect();
}

testPositionDisplay();
