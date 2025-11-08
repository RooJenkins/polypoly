import { prisma } from './prisma';
import { AI_AGENTS } from './constants';

export async function seedAgents() {
  console.log('Seeding AI agents...');

  for (const agent of AI_AGENTS) {
    const existing = await prisma.agent.findFirst({
      where: { id: agent.id },
    });

    if (!existing) {
      await prisma.agent.create({
        data: {
          id: agent.id,
          name: agent.name,
          model: agent.model,
          color: agent.color,
          accountValue: 10000,
          cashBalance: 10000,
          startingValue: 10000,
        },
      });
      console.log(`✓ Created agent: ${agent.name}`);
    } else {
      console.log(`- Agent already exists: ${agent.name}`);
    }
  }

  // Create initial performance point for each agent
  for (const agent of AI_AGENTS) {
    const performancePoints = await prisma.performancePoint.count({
      where: { agentId: agent.id },
    });

    if (performancePoints === 0) {
      await prisma.performancePoint.create({
        data: {
          agentId: agent.id,
          accountValue: 10000,
          timestamp: new Date(),
        },
      });
      console.log(`✓ Created initial performance point for: ${agent.name}`);
    }
  }

  console.log('Seeding completed!');
}

// Run seed if executed directly
if (require.main === module) {
  seedAgents()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error seeding database:', error);
      process.exit(1);
    });
}
