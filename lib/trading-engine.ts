import { prisma } from './prisma';
import { fetchStockPrices, fetchStockQuote, fetchStockNews } from './stock-api';
import { getAIDecision } from './ai-models';
import type { Stock} from '@/types';
import {
  isMarketOpen,
  getMarketStatus,
} from './realistic-execution';
import { getBroker, getBrokerDisplayName, type BrokerType } from './brokers';
import { validateTrade, validateExitParameters, logSafetyViolation } from './safety-limits';
import { checkAndExecuteExits } from './exit-manager';
import { updateBenchmarkPerformance } from './benchmark';
// NEW: Advanced intelligence modules
import { getMarketContext, calculateRelativeStrength, type MarketContext } from './market-context';
import { calculatePortfolioMetrics, getPortfolioRecommendations, type PortfolioMetrics } from './portfolio-intelligence';
import { getStrategySignals, generateStrategyPrompt, STRATEGY_CONFIGS } from './trading-strategies';
import { calculatePositionSize, calculateAgentPerformance, adjustForMarketConditions, getPositionSizeSummary, type AgentPerformance } from './position-sizing';
import { analyzeAllExits, generateExitSummary } from './exit-management';
import { fetchMacroIndicators, getEnhancedStockData, generateDataSourcesSummary } from './data-sources';

// Wrapper functions that route to correct broker based on agent's broker configuration
async function executeBuyTrade(agentId: string, agentName: string, symbol: string, quantity: number, marketPrice: number) {
  // Get agent's broker configuration
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { broker: true }
  });

  const brokerType = (agent?.broker || 'simulation') as BrokerType;
  const brokerDisplayName = getBrokerDisplayName(brokerType);
  console.log(`  📍 Broker: ${brokerDisplayName}`);

  // Check safety limits first
  const validation = await validateTrade(agentId, agentName, 'BUY', symbol, quantity, marketPrice);
  if (!validation.allowed) {
    await logSafetyViolation(agentId, agentName, validation.reason!, validation.warningLevel!);
    return {
      success: false,
      error: validation.reason,
      executedPrice: 0,
      executedQuantity: 0,
      commission: 0,
      slippage: 0,
      executionTime: 0
    };
  }

  // Route to appropriate broker
  const broker = getBroker(brokerType, agentName);
  console.log(`  🔌 Using ${broker.name} for trade execution`);
  return await broker.executeBuy(symbol, quantity, agentId);
}

async function executeSellTrade(agentId: string, agentName: string, symbol: string, quantity: number, marketPrice: number) {
  // Get agent's broker configuration
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { broker: true }
  });

  const brokerType = (agent?.broker || 'simulation') as BrokerType;
  const brokerDisplayName = getBrokerDisplayName(brokerType);
  console.log(`  📍 Broker: ${brokerDisplayName}`);

  // Check safety limits first
  const validation = await validateTrade(agentId, agentName, 'SELL', symbol, quantity, marketPrice);
  if (!validation.allowed) {
    await logSafetyViolation(agentId, agentName, validation.reason!, validation.warningLevel!);
    return {
      success: false,
      error: validation.reason,
      executedPrice: 0,
      executedQuantity: 0,
      commission: 0,
      slippage: 0,
      executionTime: 0
    };
  }

  // Route to appropriate broker
  const broker = getBroker(brokerType, agentName);
  console.log(`  🔌 Using ${broker.name} for trade execution`);
  return await broker.executeSell(symbol, quantity, agentId);
}

// Helper: Calculate market trend from stocks
function calculateMarketTrend(stocks: Stock[]): { daily: number; weekly: number } {
  // Filter out stocks with invalid changePercent values
  const validStocks = stocks.filter(s => typeof s.changePercent === 'number' && !isNaN(s.changePercent));

  if (validStocks.length === 0) {
    return { daily: 0, weekly: 0 }; // Return 0 instead of NaN when no valid data
  }

  const dailyAvg = validStocks.reduce((sum, s) => sum + s.changePercent, 0) / validStocks.length;
  // Weekly trend will be calculated from performance data if available
  return { daily: dailyAvg, weekly: 0 };
}

// Helper: Enrich stocks with historical data
async function enrichStocksWithTrends(stocks: Stock[]): Promise<Stock[]> {
  // Get stock price history from the last 90 days (increased from 30)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const stockPrices = await prisma.stockPrice.findMany({
    where: {
      timestamp: {
        gte: ninetyDaysAgo,
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  return stocks.map(stock => {
    const historicalPrices = stockPrices
      .filter(sp => sp.symbol === stock.symbol)
      .map(sp => sp.price);

    if (historicalPrices.length === 0) {
      return stock;
    }

    // Calculate 7-day trend
    const sevenDayPrices = stockPrices
      .filter(sp => sp.symbol === stock.symbol && sp.timestamp >= sevenDaysAgo)
      .map(sp => sp.price);

    const weekTrend = sevenDayPrices.length >= 2
      ? ((stock.price - sevenDayPrices[0]) / sevenDayPrices[0]) * 100
      : undefined;

    // Calculate 30-day trend
    const thirtyDayPrices = stockPrices
      .filter(sp => sp.symbol === stock.symbol && sp.timestamp >= thirtyDaysAgo)
      .map(sp => sp.price);

    const monthTrend = thirtyDayPrices.length >= 2
      ? ((stock.price - thirtyDayPrices[0]) / thirtyDayPrices[0]) * 100
      : undefined;

    // Calculate moving averages
    const ma7 = sevenDayPrices.length > 0
      ? sevenDayPrices.reduce((a, b) => a + b, 0) / sevenDayPrices.length
      : undefined;

    const ma30 = thirtyDayPrices.length > 0
      ? thirtyDayPrices.reduce((a, b) => a + b, 0) / thirtyDayPrices.length
      : undefined;

    const ma90 = historicalPrices.length > 0
      ? historicalPrices.reduce((a, b) => a + b, 0) / historicalPrices.length
      : undefined;

    // Calculate 52-week high/low (using 90 days as proxy since we have 90 days of data)
    const high52w = historicalPrices.length > 0
      ? Math.max(...historicalPrices)
      : undefined;

    const low52w = historicalPrices.length > 0
      ? Math.min(...historicalPrices)
      : undefined;

    // Calculate volume trend (if volume data available)
    const recentVolumes = stockPrices
      .filter(sp => sp.symbol === stock.symbol && sp.timestamp >= sevenDaysAgo)
      .map(sp => sp.volume)
      .filter(v => v !== undefined && v !== null);

    const avgVolume = recentVolumes.length > 0
      ? recentVolumes.reduce((a, b) => (a || 0) + (b || 0), 0)! / recentVolumes.length
      : undefined;

    const volumeTrend = avgVolume && stock.volume
      ? ((stock.volume - avgVolume) / avgVolume) * 100
      : undefined;

    // Calculate RSI (Relative Strength Index) using last 14 periods
    let rsi: number | undefined = undefined;
    if (historicalPrices.length >= 14) {
      const changes = [];
      for (let i = 1; i < Math.min(historicalPrices.length, 15); i++) {
        changes.push(historicalPrices[i] - historicalPrices[i - 1]);
      }

      const gains = changes.filter(c => c > 0);
      const losses = changes.filter(c => c < 0).map(c => Math.abs(c));

      const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / 14 : 0;
      const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / 14 : 0;

      if (avgLoss === 0) {
        rsi = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsi = 100 - (100 / (1 + rs));
      }
    }

    // Calculate average volatility (standard deviation of returns)
    let avgVolatility: number | undefined = undefined;
    if (thirtyDayPrices.length >= 5) {
      const returns = [];
      for (let i = 1; i < thirtyDayPrices.length; i++) {
        const dailyReturn = (thirtyDayPrices[i] - thirtyDayPrices[i - 1]) / thirtyDayPrices[i - 1];
        returns.push(dailyReturn);
      }
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      avgVolatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
    }

    return {
      ...stock,
      weekTrend,
      monthTrend,
      ma7,
      ma30,
      ma90,
      high52w,
      low52w,
      avgVolume,
      volumeTrend,
      rsi,
      avgVolatility,
      currentPrice: stock.price, // Alias
    };
  });
}

// Helper: Fetch news for stocks with significant moves
async function fetchNewsForBigMovers(stocks: Stock[]): Promise<Array<{ symbol: string; headline: string; sentiment: 'positive' | 'negative' | 'neutral' }>> {
  // Filter stocks with >2% absolute change (lowered from 3%)
  const bigMovers = stocks.filter(s => Math.abs(s.changePercent) > 2);

  if (bigMovers.length === 0) {
    return [];
  }

  console.log(`📰 Fetching news for ${bigMovers.length} stocks with >2% moves...`);

  const news: Array<{ symbol: string; headline: string; sentiment: 'positive' | 'negative' | 'neutral' }> = [];

  try {
    // Fetch news for ALL big movers, not just first symbol
    const newsData = await fetchStockNews(bigMovers.map(s => s.symbol));

    // Take top 10 most recent news items (increased from 3)
    const topNews = newsData.slice(0, 10);

    for (const item of topNews) {
      // Improved sentiment analysis with context awareness
      const headline = (item.headline || item.title || '').toLowerCase();
      let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';

      // Enhanced keyword lists with weights
      const strongPositiveWords = ['surge', 'soar', 'beat', 'record high', 'breakthrough', 'skyrocket'];
      const positiveWords = ['up', 'gain', 'high', 'profit', 'growth', 'success', 'jump', 'rally', 'advance', 'boost'];
      const strongNegativeWords = ['plunge', 'crash', 'collapse', 'disaster', 'plummet'];
      const negativeWords = ['down', 'fall', 'drop', 'miss', 'loss', 'low', 'decline', 'concern', 'warning', 'slump', 'tumble'];

      // Context-aware negation detection
      const hasNegation = /\b(not|n't|no|never|despite|but|however)\b/i.test(headline);

      // Calculate sentiment score
      let score = 0;
      if (strongPositiveWords.some(word => headline.includes(word))) score += 2;
      if (positiveWords.some(word => headline.includes(word))) score += 1;
      if (strongNegativeWords.some(word => headline.includes(word))) score -= 2;
      if (negativeWords.some(word => headline.includes(word))) score -= 1;

      // Reverse sentiment if negation detected
      if (hasNegation) score *= -1;

      if (score > 0) {
        sentiment = 'positive';
      } else if (score < 0) {
        sentiment = 'negative';
      }

      news.push({
        symbol: (item.tickers && item.tickers[0]) || bigMovers[0].symbol,
        headline: (item.headline || item.title || 'No headline').slice(0, 200), // Increased to 200 chars
        sentiment,
      });
    }

    console.log(`✓ Found ${news.length} relevant news items\n`);
  } catch (error) {
    console.log('⚠️  No news API available, continuing without news\n');
  }

  return news;
}

// Helper: Update all positions with current prices and P&L
async function updateAllPositions(stocks: Stock[]) {
  const allPositions = await prisma.position.findMany();

  let updatedCount = 0;
  for (const position of allPositions) {
    const currentStock = stocks.find((s) => s.symbol === position.symbol);
    if (currentStock) {
      // Calculate P&L - inverse for SHORT positions
      let unrealizedPnL, unrealizedPnLPercent;
      if (position.side === 'SHORT') {
        unrealizedPnL = (position.entryPrice - currentStock.price) * position.quantity;
        unrealizedPnLPercent = ((position.entryPrice - currentStock.price) / position.entryPrice) * 100;
      } else {
        unrealizedPnL = (currentStock.price - position.entryPrice) * position.quantity;
        unrealizedPnLPercent = ((currentStock.price - position.entryPrice) / position.entryPrice) * 100;
      }

      await prisma.position.update({
        where: { id: position.id },
        data: {
          currentPrice: currentStock.price,
          unrealizedPnL,
          unrealizedPnLPercent,
        },
      });
      updatedCount++;
    }
  }

  console.log(`✓ Updated ${updatedCount} positions`);
}

// Helper: Calculate agent performance stats
async function calculateAgentStats(agentId: string) {
  const trades = await prisma.trade.findMany({
    where: { agentId },
    orderBy: { timestamp: 'desc' },
    take: 100, // Last 100 trades
  });

  if (trades.length === 0) {
    return {
      winRate: 0,
      totalTrades: 0,
      avgWin: 0,
      avgLoss: 0,
      bestTrade: 0,
      worstTrade: 0,
    };
  }

  const profitableTrades = trades.filter(t => (t.realizedPnL || 0) > 0);
  const losingTrades = trades.filter(t => (t.realizedPnL || 0) < 0);

  const wins = profitableTrades.map(t => t.realizedPnL || 0);
  const losses = losingTrades.map(t => t.realizedPnL || 0);

  return {
    winRate: trades.length > 0 ? (profitableTrades.length / trades.length) * 100 : 0,
    totalTrades: trades.length,
    avgWin: wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0,
    avgLoss: losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0,
    bestTrade: wins.length > 0 ? Math.max(...wins) : 0,
    worstTrade: losses.length > 0 ? Math.min(...losses) : 0,
  };
}

export async function runTradingCycle() {
  console.log('\n🔄 ===== STARTING TRADING CYCLE =====');
  console.log(`📅 ${new Date().toLocaleString()}\n`);

  try {
    // 1. Fetch current stock prices
    console.log('📊 Fetching stock prices...');
    let stocks = await fetchStockPrices();
    console.log(`✓ Fetched ${stocks.length} stock prices\n`);

    // 2. Enrich stocks with historical trends and technical indicators
    console.log('📈 Calculating price trends and technical indicators...');
    stocks = await enrichStocksWithTrends(stocks);
    console.log(`✓ Added 7-day trends and moving averages\n`);

    // 3. Get comprehensive market context (SPY, VIX, sectors, relative strength)
    console.log('🌍 Analyzing market context...');
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const spyHistoricalPrices = await prisma.stockPrice.findMany({
      where: { symbol: 'SPY', timestamp: { gte: ninetyDaysAgo } },
      orderBy: { timestamp: 'asc' },
      select: { price: true }
    });
    const marketContext = await getMarketContext(stocks, spyHistoricalPrices.map(p => p.price));

    // Add relative strength to all stocks
    stocks = calculateRelativeStrength(stocks, marketContext.spyTrend);
    console.log(`✓ Market intelligence complete\n`);

    // 4. Get macro indicators and enhanced data sources
    console.log('📡 Fetching multi-source data...');
    const macroIndicators = await fetchMacroIndicators();
    const enhancedStockData = stocks.map(stock => getEnhancedStockData(stock));
    console.log(`✓ Multi-source data integrated\n`);

    // 5. Update S&P 20 benchmark performance
    await updateBenchmarkPerformance(stocks);

    // 6. Check positions for automatic exits (Alpha Arena Phase 1)
    await checkAndExecuteExits(stocks);

    // 7. Calculate market trend (legacy, for compatibility)
    const marketTrend = calculateMarketTrend(stocks);
    console.log(`📊 Market trend: ${marketTrend.daily >= 0 ? '+' : ''}${marketTrend.daily.toFixed(2)}% today\n`);

    // 8. Fetch news for big movers (>3% change)
    const news = await fetchNewsForBigMovers(stocks);

    // 9. Get all agents (excluding benchmark)
    const agents = await prisma.agent.findMany({
      include: {
        positions: true,
      },
      where: {
        NOT: {
          id: 'benchmark-sp20'
        }
      }
    });

    console.log(`🤖 Processing ${agents.length} AI agents\n`);

    // 10. Process each agent with full intelligence
    for (const agent of agents) {
      await processAgentTrading(agent, stocks, marketContext, macroIndicators, enhancedStockData, marketTrend, news);
    }

    // 9. Update all positions one final time (to capture newly created positions)
    console.log('\n📊 Final position update pass...');
    await updateAllPositions(stocks);

    // 10. Update all performance metrics
    await updatePerformanceMetrics();

    console.log('\n✅ ===== TRADING CYCLE COMPLETE =====\n');
  } catch (error: any) {
    console.error('\n❌ ===== ERROR IN TRADING CYCLE =====');
    console.error(error);
    console.error('======================================\n');
  }
}

async function processAgentTrading(
  agent: any,
  stocks: Stock[],
  marketContext: MarketContext,
  macroIndicators: any,
  enhancedStockData: any[],
  marketTrend: { daily: number; weekly: number },
  news: Array<{ symbol: string; headline: string; sentiment: 'positive' | 'negative' | 'neutral' }>
) {
  console.log(`\n━━━ ${agent.name} (${agent.model}) ━━━`);

  try {
    // Get agent's performance stats (enhanced for Kelly Criterion)
    const agentStats = await calculateAgentStats(agent.id);

    // Get agent's complete trade history for performance analysis
    const agentTrades = await prisma.trade.findMany({
      where: { agentId: agent.id },
      select: {
        action: true,
        price: true,
        realizedPnL: true,
        timestamp: true
      }
    });

    // Calculate agent performance for position sizing
    const agentPerformance = calculateAgentPerformance(
      agentTrades
        .filter(t => t.action === 'SELL' || t.action === 'BUY_TO_COVER')
        .map(t => ({
          pnl: t.realizedPnL || 0,
          pnlPercent: t.realizedPnL && t.price ? (t.realizedPnL / (t.price * 100)) * 100 : 0,
        }))
    );
    // Update current prices for all positions
    for (const position of agent.positions) {
      const currentStock = stocks.find((s) => s.symbol === position.symbol);
      if (currentStock) {
        position.currentPrice = currentStock.price;

        // Calculate P&L - inverse for SHORT positions
        if (position.side === 'SHORT') {
          position.unrealizedPnL =
            (position.entryPrice - currentStock.price) * position.quantity;
          position.unrealizedPnLPercent =
            ((position.entryPrice - currentStock.price) / position.entryPrice) * 100;
        } else {
          position.unrealizedPnL =
            (currentStock.price - position.entryPrice) * position.quantity;
          position.unrealizedPnLPercent =
            ((currentStock.price - position.entryPrice) / position.entryPrice) * 100;
        }

        await prisma.position.update({
          where: { id: position.id },
          data: {
            currentPrice: currentStock.price,
            unrealizedPnL: position.unrealizedPnL,
            unrealizedPnLPercent: position.unrealizedPnLPercent,
          },
        });
      }
    }

    // Calculate total portfolio value
    let portfolioValue = agent.cashBalance;
    for (const position of agent.positions) {
      portfolioValue += position.currentPrice * position.quantity;
    }

    // Update agent's account value
    await prisma.agent.update({
      where: { id: agent.id },
      data: { accountValue: portfolioValue },
    });

    console.log(`  💰 Account Value: $${portfolioValue.toFixed(2)}`);
    console.log(`  💵 Cash: $${agent.cashBalance.toFixed(2)}`);
    console.log(`  📈 Positions: ${agent.positions.length}`);

    if (agent.positions.length > 0) {
      console.log('  Current holdings:');
      agent.positions.forEach((p: any) => {
        console.log(
          `    • ${p.quantity} ${p.symbol} @ $${p.entryPrice.toFixed(2)} → $${p.currentPrice.toFixed(2)} (${p.unrealizedPnL >= 0 ? '+' : ''}$${p.unrealizedPnL.toFixed(2)})`
        );
      });
    }

    // Calculate portfolio intelligence
    const portfolioMetrics = calculatePortfolioMetrics(
      agent.positions.map((p: any) => ({
        symbol: p.symbol,
        name: p.name,
        quantity: p.quantity,
        entryPrice: p.entryPrice,
        currentPrice: p.currentPrice,
        unrealizedPnL: p.unrealizedPnL,
        unrealizedPnLPercent: p.unrealizedPnLPercent,
      })),
      agent.cashBalance,
      portfolioValue,
      stocks,
      marketContext,
      agentStats
    );

    console.log(`  🎯 Portfolio: ${portfolioMetrics.portfolioSummary}`);

    // Get portfolio recommendations
    const recommendations = getPortfolioRecommendations(portfolioMetrics);
    if (recommendations.length > 0) {
      console.log('  💡 Recommendations:');
      recommendations.slice(0, 3).forEach(rec => console.log(`    ${rec}`));
    }

    // Get agent's trading strategy
    const agentStrategy = STRATEGY_CONFIGS[agent.model];
    const strategyType = agentStrategy?.type || 'momentum_breakout';

    // Get strategy-specific signals for all stocks
    const strategySignals = getStrategySignals(agent.model, stocks, marketContext, portfolioMetrics);

    // Analyze exit signals for current positions
    const exitSignals = analyzeAllExits(
      agent.positions.map((p: any) => ({
        symbol: p.symbol,
        entryPrice: p.entryPrice,
        currentPrice: p.currentPrice,
        quantity: p.quantity,
        entryDate: p.createdAt,
        daysHeld: Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        unrealizedPnL: p.unrealizedPnL,
        unrealizedPnLPercent: p.unrealizedPnLPercent,
        strategy: strategyType,
      })),
      stocks,
      marketContext
    );

    // Log critical exit signals
    const criticalExits = exitSignals.filter(s => s.shouldExit && (s.urgency === 'critical' || s.urgency === 'high'));
    if (criticalExits.length > 0) {
      console.log('  ⚠️ EXIT ALERTS:');
      criticalExits.forEach(exit => {
        console.log(`    ${exit.symbol}: ${exit.reasoning[0]}`);
      });
    }

    // Prepare enhanced market context for AI
    const enhancedMarketContext = {
      stocks,
      cashBalance: agent.cashBalance,
      accountValue: portfolioValue,
      positions: agent.positions.map((p: any) => ({
        symbol: p.symbol,
        name: p.name,
        quantity: p.quantity,
        entryPrice: p.entryPrice,
        currentPrice: p.currentPrice,
        unrealizedPnL: p.unrealizedPnL,
        unrealizedPnLPercent: p.unrealizedPnLPercent,
      })),
      marketTrend,
      agentStats,
      news: news.length > 0 ? news : undefined,
      // NEW: Enhanced intelligence
      marketContext,
      portfolioMetrics,
      strategySignals,
      exitSignals,
      macroIndicators,
      agentPerformance,
      strategyPrompt: generateStrategyPrompt(agent.model, strategySignals, marketContext),
      exitSummary: generateExitSummary(exitSignals),
      dataSourcesSummary: generateDataSourcesSummary(enhancedStockData, macroIndicators),
    };

    // Get AI decision with enhanced intelligence
    const decision = await getAIDecision(agent.id, agent.name, enhancedMarketContext);

    console.log(`  🎯 Decision: ${decision.action}`);
    console.log(`  💭 Reasoning: ${decision.reasoning}`);
    console.log(`  📊 Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
    if (decision.targetPrice) {
      console.log(`  🎯 Target Price: $${decision.targetPrice.toFixed(2)}`);
    }
    if (decision.stopLoss) {
      console.log(`  🛡️  Stop Loss: $${decision.stopLoss.toFixed(2)}`);
    }

    // Execute trade based on decision
    if (decision.action === 'BUY') {
      await executeBuy(agent, decision, stocks);
    } else if (decision.action === 'SELL') {
      await executeSell(agent, decision, stocks);
    } else if (decision.action === 'SELL_SHORT') {
      await executeShort(agent, decision, stocks);
    } else if (decision.action === 'BUY_TO_COVER') {
      await executeCover(agent, decision, stocks);
    }

    // Log the decision (Alpha Arena: store invalidationCondition)
    const decisionRecord = await prisma.decision.create({
      data: {
        agentId: agent.id,
        action: decision.action,
        symbol: decision.symbol,
        quantity: decision.quantity,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        riskAssessment: decision.riskAssessment || 'N/A',
        targetPrice: decision.targetPrice,
        stopLoss: decision.stopLoss,
        invalidationCondition: decision.invalidationCondition,
        portfolioValue,
        cashBalance: agent.cashBalance,
        marketDataSnapshot: JSON.stringify(
          stocks.map((s) => ({
            symbol: s.symbol,
            price: s.price,
            change: s.changePercent,
          }))
        ),
      },
    });

    // Store decision ID for linking trades back to decisions
    (decision as any).decisionId = decisionRecord.id;
  } catch (error: any) {
    console.error(`  ❌ Error processing ${agent.name}:`, error.message);
  }
}

async function executeBuy(agent: any, decision: any, stocks: Stock[]) {
  if (!decision.symbol) {
    console.log('  ⚠️  Invalid BUY decision (missing symbol)');
    return;
  }

  const stock = stocks.find((s) => s.symbol === decision.symbol);
  if (!stock) {
    console.log(`  ❌ Stock ${decision.symbol} not found`);
    return;
  }

  // KELLY CRITERION POSITION SIZING
  // Calculate optimal position size based on agent performance, confidence, volatility
  const agentStats = await calculateAgentStats(agent.id);
  const agentTrades = await prisma.trade.findMany({
    where: { agentId: agent.id, action: { in: ['SELL', 'BUY_TO_COVER'] } },
    select: { realizedPnL: true, price: true }
  });

  const agentPerformance = calculateAgentPerformance(
    agentTrades.map(t => ({
      pnl: t.realizedPnL || 0,
      pnlPercent: t.realizedPnL && t.price ? (t.realizedPnL / (t.price * 100)) * 100 : 0,
    }))
  );

  // Get agent's risk tolerance from strategy config
  const agentStrategy = STRATEGY_CONFIGS[agent.model];
  const riskTolerance = agentStrategy?.riskTolerance || 'moderate';

  // Calculate stock volatility (simplified - use month trend as proxy)
  const stockVolatility = stock.monthTrend ? Math.abs(stock.monthTrend) / 100 : 0.2;

  // Calculate portfolio volatility
  const positions = await prisma.position.findMany({ where: { agentId: agent.id } });
  const portfolioVolatility = positions.length > 0 ? 0.15 : 0.1;

  // Get market context for position sizing adjustment
  const marketContext = (decision as any).marketContext;
  const portfolioMetrics = (decision as any).portfolioMetrics;

  const positionSizeInput = {
    cashAvailable: agent.cashBalance,
    accountValue: agent.accountValue,
    confidence: (decision.confidence || 0.5) * 100,
    stockVolatility,
    portfolioVolatility,
    agentPerformance,
    currentPositionCount: positions.length,
    maxPositionPercent: 30,
    riskTolerance,
  };

  let positionSizeResult = calculatePositionSize(positionSizeInput);

  // Adjust for market conditions if available
  if (marketContext) {
    positionSizeResult = adjustForMarketConditions(
      positionSizeResult,
      marketContext.spyTrend?.regime || 'neutral',
      marketContext.vix?.level || 15,
      portfolioMetrics?.portfolioBeta || 1.0
    );
  }

  // Check if position size is viable
  if (positionSizeResult.positionSize === 0) {
    console.log('  ⚠️  Kelly Criterion suggests NO TRADE - negative edge or insufficient data');
    return;
  }

  const maxInvestment = positionSizeResult.positionSize;
  const quantity = Math.floor(maxInvestment / stock.price);

  if (quantity === 0) {
    console.log(`  ⚠️  Position size too small: $${maxInvestment.toFixed(0)}`);
    return;
  }

  const estimatedCost = stock.price * quantity;
  console.log(`  💰 Kelly Position Sizing: $${maxInvestment.toFixed(0)} (${positionSizeResult.positionPercent.toFixed(1)}% of account)`);
  console.log(`  📊 Kelly: ${(positionSizeResult.kellyFraction * 100).toFixed(1)}% → Adjusted: ${(positionSizeResult.adjustedKelly * 100).toFixed(1)}%`);

  // ALPHA ARENA PHASE 6: Validate exit parameters
  const exitValidation = validateExitParameters(
    'BUY',
    stock.price,
    decision.targetPrice,
    decision.stopLoss,
    decision.confidence
  );

  if (!exitValidation.allowed) {
    console.log(`  ❌ Exit parameter validation failed: ${exitValidation.reason}`);
    await logSafetyViolation(agent.id, agent.name, exitValidation.reason!, exitValidation.warningLevel!);
    return;
  }

  // Check if agent has enough cash (with buffer for slippage)
  if (estimatedCost * 1.01 > agent.cashBalance) {
    console.log(
      `  ❌ Insufficient funds: Need ~$${estimatedCost.toFixed(2)}, have $${agent.cashBalance.toFixed(2)}`
    );
    return;
  }

  // Execute with realistic constraints (bid-ask spread, market hours, delays, partial fills)
  // Uses Alpaca API if TRADING_MODE is "paper" or "live", otherwise simulates
  const execution = await executeBuyTrade(agent.id, agent.name, stock.symbol, quantity, stock.price);

  if (!execution.success) {
    console.log(`  ❌ Execution failed: ${execution.error}`);
    return;
  }

  const totalCost = execution.executedPrice! * execution.executedQuantity! + execution.commission!;

  // Check actual cost after execution
  if (totalCost > agent.cashBalance) {
    console.log(
      `  ❌ Insufficient funds after execution: Need $${totalCost.toFixed(2)}, have $${agent.cashBalance.toFixed(2)}`
    );
    return;
  }

  // Check if agent already has this position
  const existingPosition = agent.positions.find((p: any) => p.symbol === stock.symbol);
  if (existingPosition) {
    // Update existing position (average down/up)
    const newQuantity = existingPosition.quantity + execution.executedQuantity!;
    const newEntryPrice =
      (existingPosition.entryPrice * existingPosition.quantity +
        execution.executedPrice! * execution.executedQuantity!) /
      newQuantity;

    await prisma.position.update({
      where: { id: existingPosition.id },
      data: {
        quantity: newQuantity,
        entryPrice: newEntryPrice,
        currentPrice: execution.executedPrice!,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      },
    });

    console.log(
      `  ✅ Added to position: ${execution.executedQuantity!} shares of ${stock.symbol} @ $${execution.executedPrice!.toFixed(2)}`
    );
  } else {
    // Create new position (Alpha Arena: store exit parameters and decision link)
    await prisma.position.create({
      data: {
        agentId: agent.id,
        symbol: stock.symbol,
        name: stock.name,
        side: 'LONG',
        quantity: execution.executedQuantity!,
        entryPrice: execution.executedPrice!,
        currentPrice: execution.executedPrice!,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        // targetPrice, stopLoss, invalidationCondition, entryDecisionId removed - not in production schema
      },
    });

    console.log(
      `  ✅ Bought ${execution.executedQuantity!} shares of ${stock.symbol} @ $${execution.executedPrice!.toFixed(2)}`
    );
  }

  // Show execution details
  if (execution.slippage! > 0.01) {
    console.log(`  📊 Slippage: $${execution.slippage!.toFixed(2)}`);
  }
  if (execution.executedQuantity! < decision.quantity) {
    console.log(`  ⚠️  Partial fill: ${execution.executedQuantity!}/${decision.quantity} shares`);
  }
  if (execution.executionTime > 200) {
    console.log(`  ⏱️  Execution time: ${execution.executionTime.toFixed(0)}ms`);
  }

  // Create trade record (Alpha Arena: link to decision)
  await prisma.trade.create({
    data: {
      agentId: agent.id,
      symbol: stock.symbol,
      name: stock.name,
      action: 'BUY',
      quantity: execution.executedQuantity!,
      price: execution.executedPrice!,
      total: totalCost,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      // decisionId removed - not in production schema
    },
  });

  // Update agent's cash balance
  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      cashBalance: agent.cashBalance - totalCost,
    },
  });

  console.log(`  💵 Remaining cash: $${(agent.cashBalance - totalCost).toFixed(2)}`);
}

async function executeSell(agent: any, decision: any, stocks: Stock[]) {
  if (!decision.symbol) {
    console.log('  ⚠️  Invalid SELL decision (missing symbol)');
    return;
  }

  const stock = stocks.find((s) => s.symbol === decision.symbol);
  if (!stock) {
    console.log(`  ❌ Stock ${decision.symbol} not found`);
    return;
  }

  // Find position
  const position = agent.positions.find((p: any) => p.symbol === decision.symbol);
  if (!position) {
    console.log(`  ❌ No position found for ${decision.symbol}`);
    return;
  }

  // Execute with realistic constraints (bid-ask spread, market hours, delays, partial fills)
  // Uses Alpaca API if TRADING_MODE is "paper" or "live", otherwise simulates
  const execution = await executeSellTrade(agent.id, agent.name, stock.symbol, position.quantity, stock.price);

  if (!execution.success) {
    console.log(`  ❌ Execution failed: ${execution.error}`);
    return;
  }

  const saleProceeds = execution.executedPrice! * execution.executedQuantity! - execution.commission!;
  const realizedPnL = (execution.executedPrice! - position.entryPrice) * execution.executedQuantity! - execution.commission!;
  const realizedPnLPercent = ((execution.executedPrice! - position.entryPrice) / position.entryPrice) * 100;

  // Create trade record (Alpha Arena: link to decision and mark as manual exit)
  await prisma.trade.create({
    data: {
      agentId: agent.id,
      symbol: stock.symbol,
      name: stock.name,
      action: 'SELL',
      quantity: execution.executedQuantity!,
      price: execution.executedPrice!,
      total: saleProceeds,
      realizedPnL,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      // decisionId, exitReason removed - not in production schema
    },
  });

  // Delete position
  await prisma.position.delete({
    where: { id: position.id },
  });

  // Update agent's cash balance
  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      cashBalance: agent.cashBalance + saleProceeds,
    },
  });

  console.log(
    `  ✅ Sold ${execution.executedQuantity!} shares of ${stock.symbol} @ $${execution.executedPrice!.toFixed(2)}`
  );
  console.log(
    `  📊 Realized P&L: ${realizedPnL >= 0 ? '+' : ''}$${realizedPnL.toFixed(2)} (${realizedPnLPercent >= 0 ? '+' : ''}${realizedPnLPercent.toFixed(2)}%)`
  );

  // Show execution details
  if (execution.slippage! > 0.01) {
    console.log(`  📊 Slippage: -$${execution.slippage!.toFixed(2)}`);
  }
  if (execution.executedQuantity! < position.quantity) {
    console.log(`  ⚠️  Partial fill: ${execution.executedQuantity!}/${position.quantity} shares`);
  }
  if (execution.executionTime > 200) {
    console.log(`  ⏱️  Execution time: ${execution.executionTime.toFixed(0)}ms`);
  }

  console.log(`  💵 Cash after sale: $${(agent.cashBalance + saleProceeds).toFixed(2)}`);
}

async function executeShort(agent: any, decision: any, stocks: Stock[]) {
  if (!decision.symbol || !decision.quantity) {
    console.log('  ⚠️  Invalid SELL_SHORT decision (missing symbol or quantity)');
    return;
  }

  const stock = stocks.find((s) => s.symbol === decision.symbol);
  if (!stock) {
    console.log(`  ❌ Stock ${decision.symbol} not found`);
    return;
  }

  // ALPHA ARENA PHASE 6: Validate exit parameters for SHORT
  const exitValidation = validateExitParameters(
    'SELL_SHORT',
    stock.price,
    decision.targetPrice,
    decision.stopLoss,
    decision.confidence
  );

  if (!exitValidation.allowed) {
    console.log(`  ❌ Exit parameter validation failed: ${exitValidation.reason}`);
    await logSafetyViolation(agent.id, agent.name, exitValidation.reason!, exitValidation.warningLevel!);
    return;
  }

  const totalValue = stock.price * decision.quantity;

  // Check if agent has enough cash (need collateral)
  if (totalValue > agent.cashBalance) {
    console.log(
      `  ❌ Insufficient funds for short: Need $${totalValue.toFixed(2)}, have $${agent.cashBalance.toFixed(2)}`
    );
    return;
  }

  // Check if agent already has a short position in this stock
  const existingPosition = agent.positions.find(
    (p: any) => p.symbol === stock.symbol && p.side === 'SHORT'
  );
  if (existingPosition) {
    console.log(`  ⚠️  Already have a short position in ${stock.symbol}`);
    return;
  }

  // Create new short position
  await prisma.position.create({
    data: {
      agentId: agent.id,
      symbol: stock.symbol,
      name: stock.name,
      side: 'SHORT',
      quantity: decision.quantity,
      entryPrice: stock.price,
      currentPrice: stock.price,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      // targetPrice, stopLoss, invalidationCondition, entryDecisionId removed - not in production schema
    },
  });

  console.log(
    `  ✅ Shorted ${decision.quantity} shares of ${stock.symbol} @ $${stock.price.toFixed(2)}`
  );

  // Create trade record (Alpha Arena: link to decision)
  await prisma.trade.create({
    data: {
      agentId: agent.id,
      symbol: stock.symbol,
      name: stock.name,
      action: 'SELL_SHORT',
      quantity: decision.quantity,
      price: stock.price,
      total: totalValue,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      // decisionId removed - not in production schema
    },
  });

  // Receive cash from short sale
  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      cashBalance: agent.cashBalance + totalValue,
    },
  });

  console.log(`  💵 Cash after short: $${(agent.cashBalance + totalValue).toFixed(2)}`);
}

async function executeCover(agent: any, decision: any, stocks: Stock[]) {
  if (!decision.symbol) {
    console.log('  ⚠️  Invalid BUY_TO_COVER decision (missing symbol)');
    return;
  }

  const stock = stocks.find((s) => s.symbol === decision.symbol);
  if (!stock) {
    console.log(`  ❌ Stock ${decision.symbol} not found`);
    return;
  }

  // Find short position
  const position = agent.positions.find(
    (p: any) => p.symbol === decision.symbol && p.side === 'SHORT'
  );
  if (!position) {
    console.log(`  ❌ No short position found for ${decision.symbol}`);
    return;
  }

  const coverCost = stock.price * position.quantity;
  const realizedPnL = (position.entryPrice - stock.price) * position.quantity;
  const realizedPnLPercent = ((position.entryPrice - stock.price) / position.entryPrice) * 100;

  // Check if agent has enough cash to cover
  if (coverCost > agent.cashBalance) {
    console.log(
      `  ❌ Insufficient funds to cover: Need $${coverCost.toFixed(2)}, have $${agent.cashBalance.toFixed(2)}`
    );
    return;
  }

  // Create trade record (Alpha Arena: link to decision and mark as manual exit)
  await prisma.trade.create({
    data: {
      agentId: agent.id,
      symbol: stock.symbol,
      name: stock.name,
      action: 'BUY_TO_COVER',
      quantity: position.quantity,
      price: stock.price,
      total: coverCost,
      realizedPnL,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      // decisionId, exitReason removed - not in production schema
    },
  });

  // Delete position
  await prisma.position.delete({
    where: { id: position.id },
  });

  // Update agent's cash balance
  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      cashBalance: agent.cashBalance - coverCost,
    },
  });

  console.log(
    `  ✅ Covered ${position.quantity} shares of ${stock.symbol} @ $${stock.price.toFixed(2)}`
  );
  console.log(
    `  📊 Realized P&L: ${realizedPnL >= 0 ? '+' : ''}$${realizedPnL.toFixed(2)} (${realizedPnLPercent >= 0 ? '+' : ''}${realizedPnLPercent.toFixed(2)}%)`
  );
  console.log(`  💵 Cash after cover: $${(agent.cashBalance - coverCost).toFixed(2)}`);
}

async function updatePerformanceMetrics() {
  console.log('\n📈 Updating performance metrics...');

  const agents = await prisma.agent.findMany();

  for (const agent of agents) {
    await prisma.performancePoint.create({
      data: {
        agentId: agent.id,
        accountValue: agent.accountValue,
      },
    });
  }

  console.log('✓ Performance metrics updated');
}

// Allow running from command line
if (require.main === module) {
  runTradingCycle()
    .then(() => {
      console.log('✅ Done! Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}
