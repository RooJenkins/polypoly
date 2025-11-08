import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upgradeModels() {
  console.log('🔄 Upgrading AI models to latest versions...\n');

  // Update GPT-4o Mini to GPT-5
  const gptAgent = await prisma.agent.findFirst({
    where: { model: 'gpt-4o-mini' }
  });

  if (gptAgent) {
    await prisma.agent.update({
      where: { id: gptAgent.id },
      data: {
        name: 'GPT-5',
        model: 'gpt-5'
      }
    });
    console.log('✅ Updated GPT-4o Mini → GPT-5');
  } else {
    console.log('⚠️  GPT agent not found');
  }

  // Update Claude Haiku to Claude Sonnet 4.5
  const claudeAgent = await prisma.agent.findFirst({
    where: { model: 'claude-3-5-haiku-20241022' }
  });

  if (claudeAgent) {
    await prisma.agent.update({
      where: { id: claudeAgent.id },
      data: {
        name: 'Claude Sonnet 4.5',
        model: 'claude-sonnet-4-20250514'
      }
    });
    console.log('✅ Updated Claude Haiku → Claude Sonnet 4.5');
  } else {
    console.log('⚠️  Claude agent not found');
  }

  // Show all agents
  console.log('\n📊 Current AI Agents:\n');
  const allAgents = await prisma.agent.findMany({
    where: {
      id: { not: 'benchmark-sp20' }
    },
    select: {
      name: true,
      model: true,
      accountValue: true
    }
  });

  allAgents.forEach(agent => {
    console.log(`  ${agent.name.padEnd(20)} - ${agent.model.padEnd(30)} ($${agent.accountValue.toFixed(2)})`);
  });

  await prisma.$disconnect();
  console.log('\n✅ Model upgrade complete!');
}

upgradeModels();
