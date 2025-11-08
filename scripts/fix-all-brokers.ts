/**
 * Fix all agents to use simulation broker
 */

import { prisma } from '../lib/prisma';

async function fixAllBrokers() {
  console.log('🔧 Updating all agents to use simulation broker...\n');

  const agentsToFix = [
    { name: 'Gemini Flash', id: 'c499ac32-250e-4ba1-a358-16e962ee9471' },
    { name: 'GPT-4o Mini', id: '97b8038a-e6a5-4e25-bccd-f73f4c197f53' },
    { name: 'Claude Haiku', id: '00d5ab22-e9aa-40d1-a8ec-4e51b54e2e0c' },
  ];

  for (const agent of agentsToFix) {
    await prisma.agent.update({
      where: { id: agent.id },
      data: { broker: 'simulation' },
    });
    console.log(`✅ ${agent.name} → simulation broker`);
  }

  console.log('\n✅ All agents now use simulation broker');
  console.log('Next trading cycle will work for all agents!');

  await prisma.$disconnect();
}

fixAllBrokers();
