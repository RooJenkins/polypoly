/**
 * S&P 20 Benchmark Tracking
 *
 * Tracks an equal-weighted portfolio of the top 20 stocks
 * Starting with $10,000 (same as AI agents)
 */

import { prisma } from './prisma';
import { TOP_20_STOCKS, STARTING_BALANCE } from './constants';
import type { Stock } from '@/types';

const BENCHMARK_AGENT_ID = 'benchmark-sp20';

/**
 * Ensure the benchmark "agent" exists in the database
 */
export async function ensureBenchmarkAgent() {
  const existing = await prisma.agent.findUnique({
    where: { id: BENCHMARK_AGENT_ID }
  });

  if (!existing) {
    console.log('📊 Creating S&P 20 benchmark agent...');
    await prisma.agent.create({
      data: {
        id: BENCHMARK_AGENT_ID,
        name: 'S&P 20 Benchmark',
        model: 'equal-weighted-index',
        accountValue: STARTING_BALANCE,
        cashBalance: 0, // Fully invested
        startingValue: STARTING_BALANCE,
        broker: 'simulation',
        color: '#6B7280', // Gray color for benchmark
      }
    });
    console.log('✅ S&P 20 benchmark agent created');
  }

  return BENCHMARK_AGENT_ID;
}

/**
 * Calculate benchmark portfolio value based on current stock prices
 *
 * Equal-weighted means we invest equal $ amounts in each stock initially
 * and let them fluctuate naturally (no rebalancing)
 */
export async function calculateBenchmarkValue(stocks: Stock[]): Promise<number> {
  // Get initial benchmark state
  const benchmarkAgent = await prisma.agent.findUnique({
    where: { id: BENCHMARK_AGENT_ID }
  });

  if (!benchmarkAgent) {
    throw new Error('Benchmark agent not found');
  }

  // Check if we need to initialize positions
  const existingPositions = await prisma.benchmarkPosition.findMany({
    where: { agentId: BENCHMARK_AGENT_ID }
  });

  // If no positions exist, this is the first calculation
  // Initialize equal-weighted positions
  if (existingPositions.length === 0) {
    console.log('📊 Initializing S&P 20 benchmark positions...');

    const dollarsPerStock = STARTING_BALANCE / TOP_20_STOCKS.length;

    for (const stockDef of TOP_20_STOCKS) {
      const stock = stocks.find(s => s.symbol === stockDef.symbol);
      if (!stock) {
        console.warn(`⚠️  Stock ${stockDef.symbol} not found in current prices`);
        continue;
      }

      const shares = dollarsPerStock / stock.price;

      await prisma.benchmarkPosition.create({
        data: {
          agentId: BENCHMARK_AGENT_ID,
          symbol: stock.symbol,
          shares,
          initialPrice: stock.price,
          initialValue: dollarsPerStock,
        }
      });
    }

    console.log(`✅ Initialized ${TOP_20_STOCKS.length} benchmark positions`);
    return STARTING_BALANCE;
  }

  // Calculate current value based on existing positions
  let totalValue = 0;
  const positions = await prisma.benchmarkPosition.findMany({
    where: { agentId: BENCHMARK_AGENT_ID }
  });

  for (const position of positions) {
    const stock = stocks.find(s => s.symbol === position.symbol);
    if (stock) {
      const currentValue = position.shares * stock.price;
      totalValue += currentValue;
    } else {
      // If stock price not available, use last known value
      console.warn(`⚠️  Stock ${position.symbol} price not available for benchmark`);
      const lastValue = position.shares * position.initialPrice;
      totalValue += lastValue;
    }
  }

  return totalValue;
}

/**
 * Update benchmark performance point
 */
export async function updateBenchmarkPerformance(stocks: Stock[]): Promise<void> {
  try {
    // Ensure benchmark agent exists
    await ensureBenchmarkAgent();

    // Calculate current portfolio value
    const currentValue = await calculateBenchmarkValue(stocks);

    // Calculate metrics (for logging only - frontend will calculate from accountValue)
    const totalPnL = currentValue - STARTING_BALANCE;
    const roi = (totalPnL / STARTING_BALANCE) * 100;

    // Update agent record
    await prisma.agent.update({
      where: { id: BENCHMARK_AGENT_ID },
      data: {
        accountValue: currentValue,
      }
    });

    // Create performance point
    await prisma.performancePoint.create({
      data: {
        agentId: BENCHMARK_AGENT_ID,
        timestamp: new Date(),
        accountValue: currentValue,
      }
    });

    console.log(`📊 Benchmark updated: $${currentValue.toFixed(2)} (${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%)`);
  } catch (error) {
    console.error('❌ Error updating benchmark:', error);
  }
}
