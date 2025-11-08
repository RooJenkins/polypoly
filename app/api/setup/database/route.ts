import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const AGENTS = [
  { name: 'GPT-4o Mini', model: 'gpt-4o-mini', color: '#5BA3A3', broker: 'simulation', isLive: false },
  { name: 'Claude Haiku', model: 'claude-3-5-haiku-20241022', color: '#D97757', broker: 'alpaca', isLive: false },
  { name: 'Grok', model: 'grok-beta', color: '#C77B6A', broker: 'simulation', isLive: false },
  { name: 'Gemini Flash', model: 'gemini-2.0-flash-exp', color: '#FFB224', broker: 'alpaca', isLive: false },
  { name: 'Qwen', model: 'qwen-2.5-72b', color: '#E579B8', broker: 'simulation', isLive: false },
  { name: 'DeepSeek', model: 'deepseek-chat', color: '#8B7EC8', broker: 'simulation', isLive: false },
];

/**
 * POST /api/setup/database
 * One-time database setup endpoint
 * Creates tables and seeds with AI agents
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  // Simple auth check
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const prisma = new PrismaClient();

  try {
    console.log('🗄️  Setting up database...');

    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Seed agents
    console.log('🌱 Seeding AI agents...');
    const results = [];

    for (const agentData of AGENTS) {
      const existing = await prisma.agent.findFirst({
        where: { model: agentData.model },
      });

      let agent;
      if (existing) {
        agent = await prisma.agent.update({
          where: { id: existing.id },
          data: {
            accountValue: 10000,
            cashBalance: 10000,
            startingValue: 10000,
            lastSyncAt: new Date(),
          },
        });
        results.push(`🔄 Updated ${agent.name}`);
      } else {
        agent = await prisma.agent.create({
          data: {
            ...agentData,
            accountValue: 10000,
            cashBalance: 10000,
            startingValue: 10000,
            lastSyncAt: new Date(),
          },
        });
        results.push(`✅ Created ${agent.name}`);
      }
    }

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      message: 'Database setup complete!',
      results,
      totalAgents: AGENTS.length,
      totalPortfolioValue: AGENTS.length * 10000,
    });

  } catch (error: any) {
    console.error('❌ Database setup failed:', error);
    await prisma.$disconnect();

    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

/**
 * GET /api/setup/database
 * Check setup status
 */
export async function GET() {
  const prisma = new PrismaClient();

  try {
    const agentCount = await prisma.agent.count();
    await prisma.$disconnect();

    return NextResponse.json({
      status: agentCount > 0 ? 'configured' : 'needs_setup',
      agentCount,
      message: agentCount > 0
        ? `Database is set up with ${agentCount} agents`
        : 'Database needs setup - POST to this endpoint to initialize'
    });
  } catch (error: any) {
    await prisma.$disconnect();
    return NextResponse.json({
      status: 'error',
      error: error.message
    }, { status: 500 });
  }
}
