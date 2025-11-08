import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configure these 3 agents to use Alpaca paper trading
const ALPACA_AGENTS = [
  { model: 'claude-3-5-haiku-20241022', name: 'Claude Haiku' },
  { model: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { model: 'gemini-2.0-flash-exp', name: 'Gemini Flash' },
];

async function configureAlpacaAgents() {
  try {
    console.log('🔧 Configuring AI agents for Alpaca paper trading...\n');

    for (const agentConfig of ALPACA_AGENTS) {
      // Find the agent by model name
      const agent = await prisma.agent.findFirst({
        where: { model: agentConfig.model },
      });

      if (!agent) {
        console.log(`⚠️  ${agentConfig.name} not found`);
        continue;
      }

      // Update to use Alpaca broker
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          broker: 'alpaca',
          isLive: false, // Paper trading
          lastSyncAt: new Date(),
        },
      });

      console.log(`✅ ${agent.name} (${agent.model}) - Configured for Alpaca paper trading`);
    }

    console.log('\n📊 Configuration complete!');
    console.log(`✅ ${ALPACA_AGENTS.length} agents now using Alpaca paper trading`);
    console.log(`🔄 ${6 - ALPACA_AGENTS.length} agents still using simulation`);

  } catch (error) {
    console.error('❌ Error configuring agents:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

configureAlpacaAgents();
