# PolyStocks Implementation Guide

This document provides a guide for implementing the AI trading engine that will make the agents actually trade.

## Current Status ✅

### What's Working

- ✅ **Complete UI**: Dashboard, leaderboard, stock ticker
- ✅ **Database**: Prisma schema with all necessary tables
- ✅ **Stock API Integration**: Real-time data from Polygon/Alpha Vantage/Finnhub
- ✅ **Performance Tracking**: Metrics calculation (ROI, Sharpe ratio, win rate, etc.)
- ✅ **API Endpoints**: All REST endpoints for agents, trades, positions
- ✅ **Responsive Design**: Works on desktop and mobile

### What Needs Implementation

- 🔨 **AI Trading Engine**: Logic to make AIs actually trade
- 🔨 **AI Model Integration**: Calls to OpenAI, Anthropic, Google APIs
- 🔨 **Trade Execution**: Buy/sell logic with portfolio management
- 🔨 **Scheduled Trading**: Background job to run trading cycles
- 🔨 **Model Chat**: Display AI reasoning in the UI
- 🔨 **News Integration**: Fetch and display stock news for AIs

## Architecture Overview

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                        PolyStocks                           │
└─────────────────────────────────────────────────────────────┘
           │                          │
           ▼                          ▼
    ┌─────────────┐           ┌─────────────┐
    │   Frontend  │           │   Backend   │
    │  (Next.js)  │◀─────────▶│   (API)     │
    └─────────────┘           └─────────────┘
                                     │
                ┌────────────────────┼────────────────────┐
                ▼                    ▼                    ▼
         ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
         │   Stock     │     │    AI       │     │  Database   │
         │   APIs      │     │  Models     │     │  (SQLite)   │
         └─────────────┘     └─────────────┘     └─────────────┘
\`\`\`

## Step-by-Step Implementation

### Phase 1: Basic Trading Engine (2-3 hours)

Create `lib/trading-engine.ts`:

\`\`\`typescript
import { prisma } from './prisma';
import { fetchStockPrices, fetchStockQuote } from './stock-api';
import { AI_AGENTS, STARTING_BALANCE } from './constants';

export async function runTradingCycle() {
  console.log('🔄 Starting trading cycle...');

  try {
    // 1. Fetch current stock prices
    const stocks = await fetchStockPrices();
    console.log(\`✓ Fetched \${stocks.length} stock prices\`);

    // 2. Get all agents
    const agents = await prisma.agent.findMany({
      include: {
        positions: true,
      },
    });

    // 3. Process each agent
    for (const agent of agents) {
      await processAgentTrading(agent, stocks);
    }

    // 4. Update all performance metrics
    await updatePerformanceMetrics();

    console.log('✅ Trading cycle complete');
  } catch (error) {
    console.error('❌ Error in trading cycle:', error);
  }
}

async function processAgentTrading(agent: any, stocks: any[]) {
  console.log(\`Processing agent: \${agent.name}\`);

  // Calculate total portfolio value
  let portfolioValue = agent.cashBalance;
  for (const position of agent.positions) {
    const currentStock = stocks.find((s) => s.symbol === position.symbol);
    if (currentStock) {
      position.currentPrice = currentStock.price;
      position.unrealizedPnL =
        (currentStock.price - position.entryPrice) * position.quantity;
      position.unrealizedPnLPercent =
        ((currentStock.price - position.entryPrice) / position.entryPrice) * 100;

      portfolioValue += currentStock.price * position.quantity;

      // Update position in database
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

  // Update agent's account value
  await prisma.agent.update({
    where: { id: agent.id },
    data: { accountValue: portfolioValue },
  });

  // Get AI decision
  const decision = await getAIDecision(agent, stocks);

  // Execute trade based on decision
  if (decision.action === 'BUY') {
    await executeBuy(agent, decision, stocks);
  } else if (decision.action === 'SELL') {
    await executeSell(agent, decision, stocks);
  }

  // Log the decision
  await prisma.decision.create({
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
      portfolioValue,
      cashBalance: agent.cashBalance,
      marketDataSnapshot: JSON.stringify(stocks),
    },
  });
}

async function getAIDecision(agent: any, stocks: any[]) {
  // TODO: Implement actual AI model calls
  // For now, return a simple random decision

  const action = Math.random() > 0.7 ? 'BUY' : Math.random() > 0.5 ? 'SELL' : 'HOLD';

  if (action === 'HOLD') {
    return {
      action: 'HOLD',
      reasoning: 'Market conditions unclear, holding position',
      confidence: 0.5,
    };
  }

  if (action === 'BUY') {
    const stock = stocks[Math.floor(Math.random() * stocks.length)];
    const maxInvestment = agent.cashBalance * 0.2; // Max 20% of cash
    const quantity = Math.floor(maxInvestment / stock.price);

    if (quantity === 0) {
      return {
        action: 'HOLD',
        reasoning: 'Insufficient funds for purchase',
        confidence: 0.5,
      };
    }

    return {
      action: 'BUY',
      symbol: stock.symbol,
      quantity,
      confidence: Math.random() * 0.5 + 0.5,
      reasoning: \`Buying \${stock.symbol} based on momentum\`,
      targetPrice: stock.price * 1.1,
      stopLoss: stock.price * 0.95,
    };
  }

  // SELL
  if (agent.positions.length === 0) {
    return {
      action: 'HOLD',
      reasoning: 'No positions to sell',
      confidence: 0.5,
    };
  }

  const position = agent.positions[Math.floor(Math.random() * agent.positions.length)];

  return {
    action: 'SELL',
    symbol: position.symbol,
    quantity: position.quantity,
    confidence: Math.random() * 0.5 + 0.5,
    reasoning: \`Selling \${position.symbol} to take profit/cut loss\`,
  };
}

async function executeBuy(agent: any, decision: any, stocks: any[]) {
  const stock = stocks.find((s) => s.symbol === decision.symbol);
  if (!stock) return;

  const totalCost = stock.price * decision.quantity;

  // Check if agent has enough cash
  if (totalCost > agent.cashBalance) {
    console.log(\`  ❌ Insufficient funds for \${decision.symbol}\`);
    return;
  }

  // Create position
  await prisma.position.create({
    data: {
      agentId: agent.id,
      symbol: stock.symbol,
      name: stock.name,
      quantity: decision.quantity,
      entryPrice: stock.price,
      currentPrice: stock.price,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
    },
  });

  // Create trade record
  await prisma.trade.create({
    data: {
      agentId: agent.id,
      symbol: stock.symbol,
      name: stock.name,
      action: 'BUY',
      quantity: decision.quantity,
      price: stock.price,
      total: totalCost,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
    },
  });

  // Update agent's cash balance
  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      cashBalance: agent.cashBalance - totalCost,
    },
  });

  console.log(
    \`  ✓ \${agent.name} bought \${decision.quantity} shares of \${stock.symbol} @ $\${stock.price}\`
  );
}

async function executeSell(agent: any, decision: any, stocks: any[]) {
  const stock = stocks.find((s) => s.symbol === decision.symbol);
  if (!stock) return;

  // Find position
  const position = await prisma.position.findFirst({
    where: {
      agentId: agent.id,
      symbol: decision.symbol,
    },
  });

  if (!position) {
    console.log(\`  ❌ No position found for \${decision.symbol}\`);
    return;
  }

  const saleProceeds = stock.price * position.quantity;
  const realizedPnL = (stock.price - position.entryPrice) * position.quantity;

  // Create trade record
  await prisma.trade.create({
    data: {
      agentId: agent.id,
      symbol: stock.symbol,
      name: stock.name,
      action: 'SELL',
      quantity: position.quantity,
      price: stock.price,
      total: saleProceeds,
      realizedPnL,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
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
    \`  ✓ \${agent.name} sold \${position.quantity} shares of \${stock.symbol} @ $\${stock.price} (P&L: $\${realizedPnL.toFixed(2)})\`
  );
}

async function updatePerformanceMetrics() {
  const agents = await prisma.agent.findMany();

  for (const agent of agents) {
    // Create new performance point
    await prisma.performancePoint.create({
      data: {
        agentId: agent.id,
        accountValue: agent.accountValue,
      },
    });
  }

  console.log('✓ Updated performance metrics');
}

// Allow running from command line
if (require.main === module) {
  runTradingCycle()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
\`\`\`

### Testing the Trading Engine

\`\`\`bash
# Run once manually
npx tsx lib/trading-engine.ts

# You should see:
# 🔄 Starting trading cycle...
# ✓ Fetched 20 stock prices
# Processing agent: GPT-4
#   ✓ GPT-4 bought 5 shares of AAPL @ $185.23
# Processing agent: Claude Sonnet 4.5
# ...
# ✅ Trading cycle complete
\`\`\`

### Phase 2: AI Model Integration (3-4 hours)

Create `lib/ai-models.ts`:

\`\`\`typescript
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export async function callAIModel(
  agentId: string,
  marketContext: any
): Promise<any> {
  switch (agentId) {
    case 'gpt4':
      return callOpenAI(marketContext);
    case 'claude':
      return callClaude(marketContext);
    case 'gemini':
      return callGemini(marketContext);
    // Add other models...
    default:
      return getRandomDecision(marketContext);
  }
}

async function callOpenAI(context: any) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = \`You are a stock trader. Analyze this data and make a trading decision:

Portfolio: $\${context.cashBalance} cash, \${context.positions.length} positions
Stocks: \${context.stocks.map((s: any) => \`\${s.symbol}: $\${s.price} (\${s.changePercent}%)\`).join(', ')}

Respond in JSON:
{
  "action": "BUY" | "SELL" | "HOLD",
  "symbol": "AAPL",
  "quantity": 10,
  "reasoning": "detailed analysis",
  "confidence": 0.75,
  "targetPrice": 200,
  "stopLoss": 175
}\`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

// Similar implementations for Claude, Gemini, etc.
\`\`\`

### Phase 3: Scheduling (1 hour)

Create `scripts/trading-bot.ts`:

\`\`\`typescript
import cron from 'node-cron';
import { runTradingCycle } from '../lib/trading-engine';

console.log('🤖 PolyStocks Trading Bot Started');
console.log('📅 Running every 5 minutes during market hours (9:30 AM - 4:00 PM ET)');

// Run every 5 minutes during market hours (Mon-Fri, 9:30 AM - 4:00 PM ET)
cron.schedule('*/5 9-16 * * 1-5', async () => {
  const now = new Date();
  console.log(\`\\n[\${now.toISOString()}] Starting scheduled trading cycle\`);

  try {
    await runTradingCycle();
  } catch (error) {
    console.error('Error in scheduled trading:', error);
  }
}, {
  timezone: 'America/New_York'
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down trading bot');
  process.exit(0);
});
\`\`\`

Install node-cron:
\`\`\`bash
npm install node-cron @types/node-cron
\`\`\`

Run the bot:
\`\`\`bash
npx tsx scripts/trading-bot.ts

# Or with PM2 for production:
pm2 start scripts/trading-bot.ts --name polystocks-bot --interpreter tsx
\`\`\`

### Phase 4: UI Enhancements (2-3 hours)

Update the main page to show real trades and positions:

1. **Trades Tab**: Fetch from `/api/trades?agentId={id}`
2. **Positions Tab**: Fetch from `/api/positions?agentId={id}`
3. **Model Chat Tab**: Fetch decisions from database and display reasoning

Example component for Trades tab:

\`\`\`typescript
// components/TradesList.tsx
export function TradesList({ agentId }: { agentId: string }) {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    fetch(\`/api/trades?agentId=\${agentId}&limit=20\`)
      .then(res => res.json())
      .then(setTrades);
  }, [agentId]);

  return (
    <div className="space-y-2">
      {trades.map(trade => (
        <div key={trade.id} className="p-4 bg-[var(--card-bg)] rounded border">
          <div className="flex justify-between">
            <div>
              <span className={\`font-bold \${trade.action === 'BUY' ? 'text-green-500' : 'text-red-500'}\`}>
                {trade.action}
              </span>
              {' '}{trade.quantity} {trade.symbol} @ ${trade.price}
            </div>
            <div className="text-sm text-gray-400">
              {new Date(trade.timestamp).toLocaleString()}
            </div>
          </div>
          {trade.realizedPnL && (
            <div className={\`text-sm \${trade.realizedPnL > 0 ? 'text-green-500' : 'text-red-500'}\`}>
              P&L: ${trade.realizedPnL.toFixed(2)}
            </div>
          )}
          <div className="text-sm text-gray-400 mt-2">{trade.reasoning}</div>
        </div>
      ))}
    </div>
  );
}
\`\`\`

## Testing Checklist

- [ ] Stock API is fetching real data
- [ ] Trading engine runs without errors
- [ ] Trades are being recorded in database
- [ ] Positions are being created and closed
- [ ] Account values are updating correctly
- [ ] Performance chart shows data over time
- [ ] Leaderboard rankings change as trades happen
- [ ] Model Chat displays AI reasoning
- [ ] Responsive design works on mobile

## Production Deployment

### Using Railway (Recommended)

1. Install Railway CLI: \`npm i -g @railway/cli\`
2. Login: \`railway login\`
3. Initialize: \`railway init\`
4. Add Postgres: \`railway add\` (select PostgreSQL)
5. Update DATABASE_URL in .env
6. Deploy: \`railway up\`
7. Add environment variables in Railway dashboard
8. The trading bot will run as a background worker

### Using Docker

\`\`\`dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm start & npx tsx scripts/trading-bot.ts"]
\`\`\`

## Monitoring

Add logging to track:
- Trading cycles completed
- Successful trades vs errors
- API usage and rate limits
- Agent performance over time

Consider using:
- **Sentry** for error tracking
- **LogRocket** for session replay
- **Datadog** for system monitoring

## Next Steps

1. Implement actual AI model calls
2. Add news sentiment analysis
3. Improve trading strategies
4. Add risk management (stop losses, position limits)
5. Implement backtesting on historical data
6. Add more technical indicators
7. Create admin dashboard for monitoring

## Need Help?

- Review the code in `/lib` and `/app/api`
- Check the Prisma schema in `/prisma/schema.prisma`
- Read the API documentation in each route file
- Test each component independently before integration

Good luck building! 🚀
