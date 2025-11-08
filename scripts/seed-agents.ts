import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const AGENTS = [
  { name: 'GPT-4o Mini', model: 'gpt-4o-mini', color: '#5BA3A3', broker: 'simulation', isLive: false },
  { name: 'Claude Haiku', model: 'claude-3-5-haiku-20241022', color: '#D97757', broker: 'simulation', isLive: false },
  { name: 'Grok', model: 'grok-beta', color: '#C77B6A', broker: 'simulation', isLive: false },
  { name: 'Gemini Flash', model: 'gemini-2.0-flash-exp', color: '#FFB224', broker: 'simulation', isLive: false },
  { name: 'Qwen', model: 'qwen-2.5-72b', color: '#E579B8', broker: 'simulation', isLive: false },
  { name: 'DeepSeek', model: 'deepseek-chat', color: '#8B7EC8', broker: 'simulation', isLive: false },
];

async function seedAgents() {
  try {
    console.log('🌱 Seeding AI trading agents...\n');

    for (const agentData of AGENTS) {
      // Check if agent already exists
      const existing = await prisma.agent.findFirst({
        where: { model: agentData.model },
      });

      let agent;
      if (existing) {
        // Update existing agent
        agent = await prisma.agent.update({
          where: { id: existing.id },
          data: {
            accountValue: 10000,
            cashBalance: 10000,
            startingValue: 10000,
            lastSyncAt: new Date(),
          },
        });
        console.log(`🔄 ${agent.name} (${agent.model}) - Reset to $${agent.accountValue.toLocaleString()}`);
      } else {
        // Create new agent
        agent = await prisma.agent.create({
          data: {
            name: agentData.name,
            model: agentData.model,
            color: agentData.color,
            broker: agentData.broker,
            isLive: agentData.isLive,
            accountValue: 10000,
            cashBalance: 10000,
            startingValue: 10000,
            lastSyncAt: new Date(),
          },
        });
        console.log(`✅ ${agent.name} (${agent.model}) - Created with $${agent.accountValue.toLocaleString()}`);
      }
    }

    console.log('\n📊 All agents seeded successfully!');
    console.log(`\n💰 Total portfolio value: $${(AGENTS.length * 10000).toLocaleString()}`);

  } catch (error) {
    console.error('❌ Error seeding agents:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedAgents();
