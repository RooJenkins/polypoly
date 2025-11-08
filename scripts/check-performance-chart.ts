import { prisma } from '../lib/prisma';

async function checkPerformanceChart() {
  console.log('Fetching performance points from database...\n');

  const performancePoints = await prisma.performancePoint.findMany({
    include: {
      agent: {
        select: {
          name: true,
          color: true
        }
      }
    },
    orderBy: { timestamp: 'desc' },
    take: 50
  });

  console.log('=== LATEST PERFORMANCE POINTS ===\n');

  const groupedByAgent: Record<string, any[]> = {};

  for (const point of performancePoints) {
    const agentName = point.agent.name;
    if (!groupedByAgent[agentName]) {
      groupedByAgent[agentName] = [];
    }
    groupedByAgent[agentName].push(point);
  }

  for (const [agentName, points] of Object.entries(groupedByAgent)) {
    console.log(`${agentName}:`);
    console.log(`  Total points: ${points.length}`);
    if (points.length > 0) {
      const latest = points[0];
      const oldest = points[points.length - 1];
      console.log(`  Latest: $${latest.accountValue.toFixed(2)} at ${latest.timestamp.toISOString()}`);
      console.log(`  Oldest (in last 50): $${oldest.accountValue.toFixed(2)} at ${oldest.timestamp.toISOString()}`);

      const change = latest.accountValue - oldest.accountValue;
      const changePercent = ((change / oldest.accountValue) * 100);
      console.log(`  Change: $${change.toFixed(2)} (${changePercent.toFixed(4)}%)`);
    }
    console.log('');
  }

  // Check if there are any performance points at all
  const totalPoints = await prisma.performancePoint.count();
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total performance points in database: ${totalPoints}`);

  // Get the time range
  if (totalPoints > 0) {
    const oldest = await prisma.performancePoint.findFirst({
      orderBy: { timestamp: 'asc' }
    });
    const newest = await prisma.performancePoint.findFirst({
      orderBy: { timestamp: 'desc' }
    });

    if (oldest && newest) {
      console.log(`Time range: ${oldest.timestamp.toISOString()} to ${newest.timestamp.toISOString()}`);
      const duration = newest.timestamp.getTime() - oldest.timestamp.getTime();
      const hours = duration / (1000 * 60 * 60);
      console.log(`Duration: ${hours.toFixed(2)} hours`);
    }
  }

  await prisma.$disconnect();
}

checkPerformanceChart().catch(console.error);
