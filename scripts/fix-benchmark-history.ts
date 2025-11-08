import { prisma } from '../lib/prisma';

/**
 * Fix S&P 20 benchmark historical data
 * Delete performance points with accountValue of 0 or very low values
 */
async function fixBenchmarkHistory() {
  console.log('🔧 Fixing S&P 20 benchmark historical data...');

  // Get all benchmark performance points
  const allPoints = await prisma.performancePoint.findMany({
    where: {
      agentId: 'benchmark-sp20'
    },
    orderBy: {
      timestamp: 'asc'
    }
  });

  console.log(`📊 Found ${allPoints.length} performance points for benchmark`);

  // Delete points with accountValue < $9,000 (these are bad data from initialization)
  const badPoints = allPoints.filter(p => p.accountValue < 9000);

  if (badPoints.length > 0) {
    console.log(`🗑️  Deleting ${badPoints.length} bad performance points (< $9,000)`);

    await prisma.performancePoint.deleteMany({
      where: {
        id: {
          in: badPoints.map(p => p.id)
        }
      }
    });

    console.log('✅ Bad performance points deleted');
  } else {
    console.log('✅ No bad performance points found');
  }

  // Show remaining points
  const remainingPoints = await prisma.performancePoint.findMany({
    where: {
      agentId: 'benchmark-sp20'
    },
    orderBy: {
      timestamp: 'asc'
    }
  });

  console.log(`\n📈 Remaining performance points: ${remainingPoints.length}`);
  if (remainingPoints.length > 0) {
    console.log(`   First: $${remainingPoints[0].accountValue.toFixed(2)} at ${remainingPoints[0].timestamp}`);
    console.log(`   Last:  $${remainingPoints[remainingPoints.length - 1].accountValue.toFixed(2)} at ${remainingPoints[remainingPoints.length - 1].timestamp}`);
  }

  console.log('\n✅ Benchmark history fixed!');
}

fixBenchmarkHistory()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
