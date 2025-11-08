/**
 * Fix GPT-4o Mini broker configuration
 */

import { prisma } from '../lib/prisma';

async function fixBroker() {
  console.log('🔧 Fixing GPT-4o Mini broker configuration...');

  const agent = await prisma.agent.findUnique({
    where: { id: 'gpt4' },
    select: { id: true, name: true, broker: true },
  });

  if (!agent) {
    console.log('❌ GPT-4o Mini agent not found!');
    return;
  }

  console.log(`Current broker: ${agent.broker || 'null'}`);

  await prisma.agent.update({
    where: { id: 'gpt4' },
    data: { broker: 'simulation' },
  });

  console.log('✅ Updated GPT-4o Mini to use simulation broker');

  await prisma.$disconnect();
}

fixBroker();
