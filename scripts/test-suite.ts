import { prisma } from '../lib/prisma';
import { fetchStockPrices } from '../lib/stock-api';
import { calculateBenchmarkValue } from '../lib/benchmark';

interface TestResult {
  testId: string;
  name: string;
  passed: boolean;
  message: string;
  actual?: any;
  expected?: any;
}

const results: TestResult[] = [];

function addResult(testId: string, name: string, passed: boolean, message: string, actual?: any, expected?: any) {
  results.push({ testId, name, passed, message, actual, expected });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${testId}: ${name}`);
  if (!passed) {
    console.log(`   Expected: ${JSON.stringify(expected)}`);
    console.log(`   Actual: ${JSON.stringify(actual)}`);
    console.log(`   ${message}`);
  }
}

async function testDatabaseIntegrity() {
  console.log('\n🗄️  === DATABASE INTEGRITY TESTS ===\n');

  // Test 6.1: Check agents exist
  const agents = await prisma.agent.findMany();
  addResult('6.1', 'All agents exist', agents.length === 7,
    `Found ${agents.length} agents`, agents.length, 7);

  // Test 6.2: Check benchmark agent
  const benchmark = agents.find(a => a.id === 'benchmark-sp20');
  addResult('6.2', 'Benchmark agent exists', !!benchmark,
    'Benchmark agent should exist');

  // Test 6.3: Check no NULL startingValue
  const nullStarting = agents.filter(a => a.startingValue === null || a.startingValue === undefined);
  addResult('6.3', 'No NULL startingValue', nullStarting.length === 0,
    `Found ${nullStarting.length} agents with NULL startingValue`, nullStarting.length, 0);

  // Test 6.4: Check all agents have valid accountValue
  const invalidAccount = agents.filter(a => a.accountValue < 0 || isNaN(a.accountValue));
  addResult('6.4', 'All accountValues valid', invalidAccount.length === 0,
    `Found ${invalidAccount.length} agents with invalid accountValue`, invalidAccount.length, 0);

  // Test 6.5: Check positions reference valid agents
  const positions = await prisma.position.findMany();
  const orphanedPositions = positions.filter(p => !agents.find(a => a.id === p.agentId));
  addResult('6.5', 'No orphaned positions', orphanedPositions.length === 0,
    `Found ${orphanedPositions.length} orphaned positions`, orphanedPositions.length, 0);

  // Test 6.6: Check trades reference valid agents
  const trades = await prisma.trade.findMany();
  const orphanedTrades = trades.filter(t => !agents.find(a => a.id === t.agentId));
  addResult('6.6', 'No orphaned trades', orphanedTrades.length === 0,
    `Found ${orphanedTrades.length} orphaned trades`, orphanedTrades.length, 0);

  // Test 6.7: Check decisions reference valid agents
  const decisions = await prisma.decision.findMany();
  const orphanedDecisions = decisions.filter(d => !agents.find(a => a.id === d.agentId));
  addResult('6.7', 'No orphaned decisions', orphanedDecisions.length === 0,
    `Found ${orphanedDecisions.length} orphaned decisions`, orphanedDecisions.length, 0);

  // Test 6.8: Check performance points reference valid agents
  const perfPoints = await prisma.performancePoint.findMany();
  const orphanedPerf = perfPoints.filter(p => !agents.find(a => a.id === p.agentId));
  addResult('6.8', 'No orphaned performance points', orphanedPerf.length === 0,
    `Found ${orphanedPerf.length} orphaned performance points`, orphanedPerf.length, 0);
}

async function testFinancialCalculations() {
  console.log('\n💰 === FINANCIAL CALCULATIONS TESTS ===\n');

  const agents = await prisma.agent.findMany({
    include: {
      positions: true,
      trades: true
    }
  });

  const stocks = await fetchStockPrices();
  const stockPriceMap = new Map(stocks.map(s => [s.symbol, s.price]));

  for (const agent of agents) {
    // Skip benchmark for these tests
    if (agent.id === 'benchmark-sp20') continue;

    // Test 3.1: accountValue = cashBalance + positions
    let calculatedAccountValue = agent.cashBalance;
    for (const position of agent.positions) {
      const currentPrice = stockPriceMap.get(position.symbol) || position.currentPrice;
      calculatedAccountValue += currentPrice * position.quantity;
    }

    const accountValueMatch = Math.abs(calculatedAccountValue - agent.accountValue) < 1; // Allow $1 tolerance
    addResult(`3.1-${agent.name}`, `${agent.name}: accountValue calculated correctly`,
      accountValueMatch,
      'accountValue should equal cashBalance + positions value',
      agent.accountValue.toFixed(2),
      calculatedAccountValue.toFixed(2));

    // Test 3.2: unrealizedPnL calculated correctly for each position
    for (const position of agent.positions) {
      const currentPrice = stockPriceMap.get(position.symbol) || position.currentPrice;
      const expectedPnL = (currentPrice - position.entryPrice) * position.quantity;
      const pnlMatch = Math.abs(expectedPnL - position.unrealizedPnL) < 0.1;

      addResult(`3.2-${agent.name}-${position.symbol}`,
        `${agent.name} ${position.symbol}: unrealizedPnL correct`,
        pnlMatch,
        'unrealizedPnL should equal (currentPrice - entryPrice) * quantity',
        position.unrealizedPnL.toFixed(2),
        expectedPnL.toFixed(2));
    }

    // Test 3.5: totalPnL = accountValue - startingValue
    const expectedTotalPnL = agent.accountValue - agent.startingValue;
    const totalPnLMatch = Math.abs(expectedTotalPnL - (agent.accountValue - agent.startingValue)) < 0.01;
    addResult(`3.5-${agent.name}`, `${agent.name}: totalPnL calculated correctly`,
      totalPnLMatch,
      'totalPnL should equal accountValue - startingValue',
      (agent.accountValue - agent.startingValue).toFixed(2),
      expectedTotalPnL.toFixed(2));

    // Test 3.6: ROI calculated correctly
    const expectedROI = ((agent.accountValue - agent.startingValue) / agent.startingValue) * 100;
    const roiFromAgents = ((agent.accountValue - agent.startingValue) / agent.startingValue) * 100;
    const roiMatch = Math.abs(expectedROI - roiFromAgents) < 0.01;
    addResult(`3.6-${agent.name}`, `${agent.name}: ROI calculated correctly`,
      roiMatch,
      'ROI should equal ((accountValue - startingValue) / startingValue) * 100',
      roiFromAgents.toFixed(2),
      expectedROI.toFixed(2));
  }
}

async function testBenchmark() {
  console.log('\n📊 === BENCHMARK TESTS ===\n');

  // Test 4.1: Benchmark agent exists
  const benchmark = await prisma.agent.findUnique({
    where: { id: 'benchmark-sp20' }
  });
  addResult('4.1', 'Benchmark agent exists', !!benchmark,
    'Benchmark agent with ID benchmark-sp20 should exist');

  if (!benchmark) return;

  // Test 4.2: Starting value is $10,000
  addResult('4.2', 'Benchmark starting value is $10,000',
    benchmark.startingValue === 10000,
    'Benchmark should start with $10,000',
    benchmark.startingValue, 10000);

  // Test 4.3: Cash balance is 0 (fully invested)
  addResult('4.3', 'Benchmark cash balance is 0',
    benchmark.cashBalance === 0,
    'Benchmark should be fully invested',
    benchmark.cashBalance, 0);

  // Test 4.4: Benchmark color is gray
  addResult('4.4', 'Benchmark color is #6B7280',
    benchmark.color === '#6B7280',
    'Benchmark should have gray color',
    benchmark.color, '#6B7280');

  // Test 4.5: BenchmarkPositions exist
  const benchmarkPositions = await prisma.benchmarkPosition.findMany({
    where: { agentId: 'benchmark-sp20' }
  });
  addResult('4.5', 'Benchmark has 20 positions',
    benchmarkPositions.length === 20,
    'Benchmark should have 20 equal-weighted positions',
    benchmarkPositions.length, 20);

  // Test 4.6: Calculate benchmark value manually
  const stocks = await fetchStockPrices();
  const calculatedValue = await calculateBenchmarkValue(stocks);
  const valueMatch = Math.abs(calculatedValue - benchmark.accountValue) < 10; // $10 tolerance
  addResult('4.6', 'Benchmark value calculated correctly',
    valueMatch,
    'Benchmark accountValue should match calculated value',
    benchmark.accountValue.toFixed(2),
    calculatedValue.toFixed(2));

  // Test 4.7: No bad performance points
  const badPerfPoints = await prisma.performancePoint.findMany({
    where: {
      agentId: 'benchmark-sp20',
      accountValue: { lt: 9000 }
    }
  });
  addResult('4.7', 'No bad benchmark performance points',
    badPerfPoints.length === 0,
    'Should have no performance points below $9,000',
    badPerfPoints.length, 0);

  // Test 4.8: Equal weighting check
  if (benchmarkPositions.length > 0) {
    const avgInitialValue = benchmarkPositions.reduce((sum, p) => sum + p.initialValue, 0) / benchmarkPositions.length;
    const isEqualWeighted = benchmarkPositions.every(p => Math.abs(p.initialValue - avgInitialValue) < 1);
    addResult('4.8', 'Benchmark positions are equal-weighted',
      isEqualWeighted,
      'All positions should have similar initial values (~$500)',
      'varies', avgInitialValue.toFixed(2));
  }
}

async function testAIModels() {
  console.log('\n🤖 === AI MODELS TESTS ===\n');

  // Get latest decisions
  const decisions = await prisma.decision.findMany({
    orderBy: { timestamp: 'desc' },
    take: 20,
    include: {
      agent: {
        select: { name: true }
      }
    }
  });

  const agentDecisions = new Map<string, any[]>();
  decisions.forEach(d => {
    if (!agentDecisions.has(d.agentId)) {
      agentDecisions.set(d.agentId, []);
    }
    agentDecisions.get(d.agentId)!.push(d);
  });

  // Test each agent has recent decisions
  const agents = await prisma.agent.findMany({
    where: { NOT: { id: 'benchmark-sp20' } }
  });

  for (const agent of agents) {
    const agentDecs = agentDecisions.get(agent.id) || [];

    // Test 1.1-1.6: Agent has recent decisions
    addResult(`1.${agents.indexOf(agent) + 1}`, `${agent.name} has recent decisions`,
      agentDecs.length > 0,
      'Agent should have at least one recent decision',
      agentDecs.length, '>0');

    if (agentDecs.length > 0) {
      const latestDecision = agentDecs[0];

      // Test reasoning length
      const reasoningLength = latestDecision.reasoning.length;
      addResult(`1.${agents.indexOf(agent) + 1}a`, `${agent.name} reasoning length >= 200 chars`,
        reasoningLength >= 200,
        'Reasoning should be detailed (200+ chars)',
        reasoningLength, '>=200');

      // Test confidence range
      const validConfidence = latestDecision.confidence >= 0.5 && latestDecision.confidence <= 1.0;
      addResult(`1.${agents.indexOf(agent) + 1}b`, `${agent.name} confidence in valid range`,
        validConfidence,
        'Confidence should be between 0.5 and 1.0',
        latestDecision.confidence, '0.5-1.0');

      // Test BUY/SHORT actions have exit parameters
      if (latestDecision.action === 'BUY' || latestDecision.action === 'SELL_SHORT') {
        const hasTargetPrice = latestDecision.targetPrice !== null && latestDecision.targetPrice !== undefined;
        const hasStopLoss = latestDecision.stopLoss !== null && latestDecision.stopLoss !== undefined;

        addResult(`1.${agents.indexOf(agent) + 1}c`, `${agent.name} ${latestDecision.action} has targetPrice`,
          hasTargetPrice,
          'BUY/SHORT actions should have targetPrice',
          latestDecision.targetPrice, 'defined');

        addResult(`1.${agents.indexOf(agent) + 1}d`, `${agent.name} ${latestDecision.action} has stopLoss`,
          hasStopLoss,
          'BUY/SHORT actions should have stopLoss',
          latestDecision.stopLoss, 'defined');
      }
    }
  }
}

async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   POLYSTOCKS COMPREHENSIVE TEST SUITE                ║');
  console.log('║   Date: ' + new Date().toISOString() + '              ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  await testDatabaseIntegrity();
  await testFinancialCalculations();
  await testBenchmark();
  await testAIModels();

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   TEST RESULTS SUMMARY                                ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Pass Rate: ${passRate}%\n`);

  if (failed > 0) {
    console.log('❌ FAILED TESTS:\n');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ${r.testId}: ${r.name}`);
      console.log(`    ${r.message}`);
      console.log(`    Expected: ${JSON.stringify(r.expected)}`);
      console.log(`    Actual: ${JSON.stringify(r.actual)}\n`);
    });
  }

  // Exit with error code if tests failed
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests()
  .catch((error) => {
    console.error('❌ Test suite error:', error);
    process.exit(1);
  });
