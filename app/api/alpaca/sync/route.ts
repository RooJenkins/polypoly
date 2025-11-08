import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBroker, getBrokerDisplayName, type BrokerType } from '@/lib/brokers';

/**
 * POST /api/alpaca/sync
 * Sync a specific agent (or all live agents) with their configured broker
 * Note: Still at /api/alpaca/sync for backward compatibility, but works with all brokers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId } = body;

    // Get live agents (broker !== 'simulation')
    const agents = agentId
      ? [await prisma.agent.findUnique({ where: { id: agentId } })]
      : await prisma.agent.findMany({
          where: {
            broker: {
              not: 'simulation'
            }
          }
        });

    if (!agents || agents.length === 0 || !agents[0]) {
      return NextResponse.json({ error: 'No live agents found' }, { status: 404 });
    }

    const syncResults = [];

    for (const agent of agents) {
      if (!agent) continue;

      try {
        const brokerType = agent.broker as BrokerType;
        const brokerName = getBrokerDisplayName(brokerType);

        console.log(`🔄 Syncing agent: ${agent.name} with ${brokerName}`);

        // Get broker instance and fetch account data
        const broker = getBroker(brokerType);
        const brokerData = await broker.getAccount();

        // Delete old positions
        await prisma.position.deleteMany({
          where: { agentId: agent.id }
        });

        // Create new positions from broker
        for (const pos of brokerData.positions) {
          await prisma.position.create({
            data: {
              agentId: agent.id,
              symbol: pos.symbol,
              name: pos.name,
              side: pos.side,
              quantity: pos.quantity,
              entryPrice: pos.entryPrice,
              currentPrice: pos.currentPrice,
              unrealizedPnL: pos.unrealizedPnL,
              unrealizedPnLPercent: pos.unrealizedPnLPercent
            }
          });
        }

        // Update agent account values
        await prisma.agent.update({
          where: { id: agent.id },
          data: {
            accountValue: brokerData.accountValue,
            cashBalance: brokerData.cashBalance,
            lastSyncAt: new Date()
          }
        });

        // Record performance point
        await prisma.performancePoint.create({
          data: {
            agentId: agent.id,
            accountValue: brokerData.accountValue
          }
        });

        syncResults.push({
          agent: agent.name,
          broker: brokerName,
          success: true,
          accountValue: brokerData.accountValue,
          cashBalance: brokerData.cashBalance,
          positionsCount: brokerData.positions.length
        });

        console.log(`✅ Synced ${agent.name} (${brokerName}): $${brokerData.accountValue.toFixed(2)}`);
      } catch (error: any) {
        console.error(`❌ Failed to sync ${agent.name}:`, error.message);
        syncResults.push({
          agent: agent.name,
          broker: agent.broker,
          success: false,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      syncedAgents: syncResults.filter(r => r.success).length,
      failedAgents: syncResults.filter(r => !r.success).length,
      results: syncResults
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync with broker' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/alpaca/sync
 * Get last sync status for all live agents
 */
export async function GET() {
  try {
    const liveAgents = await prisma.agent.findMany({
      where: {
        broker: {
          not: 'simulation'
        }
      },
      select: {
        id: true,
        name: true,
        broker: true,
        lastSyncAt: true,
        accountValue: true,
        cashBalance: true
      }
    });

    return NextResponse.json({
      liveAgents: liveAgents.map(agent => ({
        id: agent.id,
        name: agent.name,
        broker: getBrokerDisplayName(agent.broker as BrokerType),
        lastSync: agent.lastSyncAt,
        accountValue: agent.accountValue,
        cashBalance: agent.cashBalance,
        syncAge: agent.lastSyncAt
          ? Math.floor((Date.now() - agent.lastSyncAt.getTime()) / 1000)
          : null
      }))
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
