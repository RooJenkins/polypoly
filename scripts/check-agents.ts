/**
 * Check all agents and their broker configuration
 */

import { prisma } from '../lib/prisma';

async function checkAgents() {
  console.log('📊 Checking all agents...\n');

  const agents = await prisma.agent.findMany({
    select: {
      id: true,
      name: true,
      model: true,
      broker: true,
      accountValue: true,
    },
  });

  console.log(`Found ${agents.length} agents:\n`);

  agents.forEach(agent => {
    console.log(`ID: ${agent.id}`);
    console.log(`Name: ${agent.name}`);
    console.log(`Model: ${agent.model}`);
    console.log(`Broker: ${agent.broker || 'NOT SET (null)'}`);
    console.log(`Account Value: $${agent.accountValue.toFixed(2)}`);
    console.log('---');
  });

  await prisma.$disconnect();
}

checkAgents();
