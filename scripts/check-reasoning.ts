import { prisma } from '../lib/prisma';

/**
 * Check latest decision reasoning lengths
 */
async function checkReasoning() {
  console.log('📊 Checking latest decision reasoning...\n');

  const decisions = await prisma.decision.findMany({
    orderBy: {
      timestamp: 'desc'
    },
    take: 10,
    include: {
      agent: {
        select: {
          name: true
        }
      }
    }
  });

  decisions.forEach((decision) => {
    const reasoningLength = decision.reasoning.length;
    const reasoningPreview = decision.reasoning.substring(0, 100);

    console.log(`${decision.agent.name} (${decision.action}):`);
    console.log(`  Length: ${reasoningLength} chars`);
    console.log(`  Preview: ${reasoningPreview}${reasoningLength > 100 ? '...' : ''}`);
    console.log('');
  });
}

checkReasoning()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
