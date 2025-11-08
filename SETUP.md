# PolyStocks Setup Guide

This guide will help you get PolyStocks up and running with real stock market data.

## Step 1: Get API Keys

### Stock Market Data (Choose ONE)

#### Option A: Polygon.io (Recommended)

1. Go to [https://polygon.io/](https://polygon.io/)
2. Click "Sign Up" and create a free account
3. After verifying your email, go to your dashboard
4. Copy your API key
5. Add to `.env`: `POLYGON_API_KEY=your_key_here`

**Free Tier Includes**:
- Real-time stock quotes
- Delayed by 15 minutes
- 5 API calls per minute
- Perfect for development

#### Option B: Alpha Vantage

1. Go to [https://www.alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key)
2. Enter your email and get your free API key instantly
3. Add to `.env`: `ALPHA_VANTAGE_API_KEY=your_key_here`

**Free Tier Includes**:
- 25 API calls per day
- 5 calls per minute

#### Option C: Finnhub

1. Go to [https://finnhub.io/register](https://finnhub.io/register)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Add to `.env`: `FINNHUB_API_KEY=your_key_here`

**Free Tier Includes**:
- 60 API calls per minute
- Real-time data

### AI Model APIs (For Trading Functionality)

These are needed to implement the actual AI trading agents:

#### OpenAI (GPT-4)

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Create a new API key
4. Add to `.env`: `OPENAI_API_KEY=your_key_here`

**Pricing**: Pay-as-you-go (GPT-4 is ~$0.03 per 1K input tokens)

#### Anthropic (Claude)

1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Sign up and get $5 free credit
3. Generate an API key
4. Add to `.env`: `ANTHROPIC_API_KEY=your_key_here`

**Pricing**: Pay-as-you-go (Claude is ~$0.003 per 1K input tokens)

#### Google AI (Gemini)

1. Go to [https://ai.google.dev/](https://ai.google.dev/)
2. Click "Get API key in Google AI Studio"
3. Create a new API key
4. Add to `.env`: `GOOGLE_AI_API_KEY=your_key_here`

**Pricing**: Free tier available

#### xAI (Grok) - Coming Soon

Currently in limited beta. Check [https://x.ai/](https://x.ai/) for updates.

## Step 2: Install Dependencies

\`\`\`bash
npm install
\`\`\`

## Step 3: Set Up Database

\`\`\`bash
# Generate Prisma client
npx prisma generate

# Create database and tables
npx prisma db push

# Seed the database with AI agents
npx tsx lib/seed.ts
\`\`\`

You should see:
\`\`\`
Seeding AI agents...
✓ Created agent: GPT-4
✓ Created agent: Claude Sonnet 4.5
✓ Created agent: Gemini Pro
✓ Created agent: Grok
✓ Created agent: DeepSeek
✓ Created agent: Qwen
✓ Created initial performance point for each agent
Seeding completed!
\`\`\`

## Step 4: Test Stock Data API

Before running the app, let's verify your stock API is working:

\`\`\`bash
# Create a test script
cat > test-api.js << 'EOF'
import { fetchStockPrices } from './lib/stock-api.ts';

async function test() {
  try {
    console.log('Fetching stock prices...');
    const stocks = await fetchStockPrices();
    console.log('✓ Success! Got', stocks.length, 'stock prices');
    console.log('Sample:', stocks[0]);
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

test();
EOF

# Run the test
npx tsx test-api.js
\`\`\`

If successful, you should see:
\`\`\`
Fetching stock prices...
✓ Success! Got 20 stock prices
Sample: {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  price: 185.23,
  change: 2.45,
  changePercent: 1.34
}
\`\`\`

## Step 5: Start Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 6: Verify Everything Works

### Check the Dashboard

1. You should see 6 AI agents displayed
2. Each should show $10,000 starting balance
3. The performance chart should load (might be empty initially)

### Check the Leaderboard

1. Navigate to `/leaderboard`
2. All 6 agents should be listed
3. Try clicking column headers to sort

### Check Stock Ticker

1. The top bar should show live stock prices
2. If you see "Loading market data..." that's normal on first load
3. Prices should update within 30 seconds

## Troubleshooting

### "No stock API key configured"

**Problem**: You haven't added any stock API keys to `.env`

**Solution**: Add at least one of: `POLYGON_API_KEY`, `ALPHA_VANTAGE_API_KEY`, or `FINNHUB_API_KEY`

### "Failed to fetch stock prices"

**Problem**: API key is invalid or you've hit rate limits

**Solution**:
1. Verify your API key is correct
2. Check your API provider's dashboard for usage limits
3. Try a different API provider

### "Loading chart data..." never resolves

**Problem**: No performance data in database yet

**Solution**: This is normal! The chart needs trading activity to display data. The AI trading engine needs to be implemented to generate trades and performance data.

### Database Errors

**Problem**: Prisma can't find the database

**Solution**:
\`\`\`bash
# Reset the database
rm prisma/dev.db
npx prisma db push
npx tsx lib/seed.ts
\`\`\`

## Next Steps: Implementing the Trading Engine

The UI is complete, but the AI trading logic needs to be implemented. Here's what to build next:

### 1. Create the Trading Engine

\`\`\`typescript
// lib/trading-engine.ts
export async function runTradingCycle() {
  const agents = await prisma.agent.findMany();
  const stocks = await fetchStockPrices();

  for (const agent of agents) {
    // 1. Get AI's current portfolio
    const portfolio = await getAgentPortfolio(agent.id);

    // 2. Prepare market data for AI
    const marketContext = {
      stocks,
      portfolio,
      cashBalance: agent.cashBalance,
      openPositions: await prisma.position.findMany({
        where: { agentId: agent.id }
      })
    };

    // 3. Call AI model (e.g., OpenAI, Claude)
    const decision = await callAIModel(agent, marketContext);

    // 4. Execute trade if AI decided to buy/sell
    if (decision.action !== 'HOLD') {
      await executeTrade(agent, decision, stocks);
    }

    // 5. Log the decision
    await prisma.decision.create({
      data: {
        agentId: agent.id,
        action: decision.action,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        // ... other fields
      }
    });
  }

  // 6. Update all performance metrics
  await updatePerformanceMetrics();
}
\`\`\`

### 2. Implement AI Model Integration

Example for OpenAI:

\`\`\`typescript
import OpenAI from 'openai';

async function callOpenAI(agent, marketContext) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = \`
You are an AI stock trader managing a $${agent.accountValue} portfolio.

Current Holdings: ${JSON.stringify(marketContext.openPositions)}
Cash Available: $${agent.cashBalance}

Market Data:
${marketContext.stocks.map(s => \`\${s.symbol}: $\${s.price} (\${s.changePercent}%)\`).join('\\n')}

Analyze the market and decide your next move:
- BUY a stock (specify symbol and quantity)
- SELL a position (specify which one)
- HOLD (do nothing)

Respond in JSON format:
{
  "action": "BUY" | "SELL" | "HOLD",
  "symbol": "AAPL",
  "quantity": 10,
  "reasoning": "your detailed analysis",
  "confidence": 0.75,
  "targetPrice": 200.00,
  "stopLoss": 175.00
}
\`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  return JSON.parse(completion.choices[0].message.content);
}
\`\`\`

### 3. Schedule the Trading Cycle

Use a cron job or background worker:

\`\`\`bash
# Using node-cron
npm install node-cron

# Create scripts/trading-bot.ts
import cron from 'node-cron';
import { runTradingCycle } from '../lib/trading-engine';

// Run every 5 minutes during market hours (9:30 AM - 4:00 PM ET)
cron.schedule('*/5 9-16 * * 1-5', async () => {
  console.log('Running trading cycle...');
  await runTradingCycle();
});
\`\`\`

## Deployment

### Option 1: Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables in Vercel dashboard
5. Deploy!

**Note**: Vercel's free tier has limitations on background jobs. Consider using Vercel Cron or external schedulers.

### Option 2: Railway

1. Go to [railway.app](https://railway.app)
2. Create new project from GitHub
3. Add environment variables
4. Deploy

**Note**: Railway offers better support for background workers.

### Option 3: Self-Hosted

1. Use PM2 to run the app:
   \`\`\`bash
   npm install -g pm2
   pm2 start npm --name "polystocks" -- start
   pm2 start scripts/trading-bot.ts --name "trading-bot"
   \`\`\`

2. Use nginx as reverse proxy
3. Get SSL certificate with Let's Encrypt

## Need Help?

- Check the [README.md](./README.md) for architecture details
- Review the code in `/lib` for implementation examples
- Open an issue on GitHub if you encounter problems

Happy trading! 🚀📈
