import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Simple auth check - require a secret key
    if (body.secret !== 'sapyn-reset-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Resetting production database...');

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

    // 6. Reset all agents to $100,000 each and configure broker assignments
    const agents = await prisma.agent.findMany();
    console.log(`💰 Resetting ${agents.length} agents to $100,000 each`);

    // Broker Battle Royale configuration - each AI gets a different broker
    const brokerAssignments: Record<string, string> = {
      'DeepSeek': 'alpaca',              // Phase 1: Live with Alpaca
      'GPT-4o': 'simulation',            // Phase 1: Will be 'tradier' when implemented
      'Claude': 'simulation',            // Phase 1: Will be 'webull' when implemented
      'Grok': 'simulation',              // Phase 2: Will be 'td-ameritrade' when implemented
      'Gemini': 'simulation',            // Phase 2: Will be 'interactive-brokers' when implemented
      'Qwen': 'simulation',              // Stays simulation permanently
    };

    const liveAgents: string[] = [];

    for (const agent of agents) {
      const broker = brokerAssignments[agent.name] || 'simulation';
      const isLive = broker !== 'simulation';

      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          cashBalance: 100000,
          accountValue: 100000,
          startingValue: 100000,
          broker,
          isLive, // Keep for backward compatibility
          lastSyncAt: null
        }
      });

      if (isLive) {
        liveAgents.push(`${agent.name} (${broker})`);
        console.log(`🔴 ${agent.name} configured for LIVE trading via ${broker.toUpperCase()}`);
      } else {
        console.log(`🟢 ${agent.name} configured for SIMULATION`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Production database reset complete - Broker Battle Royale configured',
      deleted: {
        positions: deletedPositions.count,
        trades: deletedTrades.count,
        decisions: deletedDecisions.count,
        performance: deletedPerformance.count,
        stockPrices: deletedStockPrices.count
      },
      agents: agents.length,
      totalCapital: agents.length * 100000,
      liveAgents: liveAgents.length > 0 ? liveAgents : ['None - all agents in simulation'],
      brokerAssignments
    });
  } catch (error: any) {
    console.error('❌ Error resetting:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
