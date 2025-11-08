# POLYPOLY - Implementation Plan
## AI Models as Macro Investors with Daily Investment Thesis

---

## Vision

Transform AI models from "stock pickers" to **"macro investors with evolving investment thesis"**

Each AI model will:
1. **Scan ALL markets daily** (stocks, crypto, commodities, bonds, forex, REITs, etc.)
2. **Generate a daily investment thesis** explaining their macro view and asset allocation strategy
3. **Update thesis every trading cycle** (30 minutes) based on new data
4. **Decide which MARKETS to invest in**, not just which stocks
5. **Use 100% REAL DATA** from live APIs (NO MOCKING)

**Example AI Behavior:**
```
Daily Thesis (9:00 AM):
"Given rising inflation (3.2%), weakening dollar, and VIX at 12 (risk-on),
I'm allocating 40% to crypto (BTC/ETH momentum extreme), 30% to gold
(inflation hedge), 20% to US tech stocks, 10% cash. Avoiding bonds
due to rate uncertainty."

Cycle Update (10:30 AM):
"BTC broke $45k resistance, increasing crypto allocation to 50%.
Bought $2000 BTC, $1500 ETH. Selling AAPL position."

Cycle Update (11:00 AM):
"VIX spiking to 18, market turning risk-off. Reducing crypto to 30%,
buying TLT (treasury bonds) as defensive hedge..."
```

---

## Core Differentiators from PolyStocks

| Feature | PolyStocks | PolyPoly |
|---------|-----------|----------|
| **Universe** | 20 US stocks | 40-60 instruments across 6 asset classes (Phase 1) |
| **AI Role** | Stock picker | Macro investor / strategist |
| **Decision Making** | "Which stock to buy?" | "Which MARKETS to invest in?" |
| **Strategy** | Individual trades | Investment thesis with asset allocation |
| **Data** | Stocks only | Multi-market (stocks, crypto, commodities, bonds, forex, REITs) |
| **Updates** | Per-trade reasoning | Daily thesis + cycle updates |
| **Dashboard** | Portfolio value | Thesis + rationale + market allocation |

---

## Phase 1 Implementation (4-6 Weeks)

### Week 1: Foundation & Multi-Market Scanner

**Goal:** Build infrastructure to scan multiple markets with REAL data

#### 1.1 Database Schema Updates

```sql
-- InvestmentThesis table
CREATE TABLE "InvestmentThesis" (
  id SERIAL PRIMARY KEY,
  agentId INTEGER NOT NULL REFERENCES "Agents"(id),
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  thesisType VARCHAR(20) NOT NULL, -- 'daily' or 'cycle_update'

  -- Macro view
  macroView TEXT NOT NULL, -- AI's view on economy, markets, sentiment
  marketRegime VARCHAR(50), -- 'risk_on', 'risk_off', 'neutral', 'crisis'

  -- Asset allocation strategy
  targetAllocation JSONB NOT NULL, -- {"stocks": 30, "crypto": 40, "gold": 20, "cash": 10}
  reasoning TEXT NOT NULL,

  -- Key metrics AI is watching
  keyMetrics JSONB, -- {"vix": 12, "dxy": 102, "inflation": 3.2, "btc_momentum": 15}

  -- Confidence
  confidence DECIMAL(5,2), -- 0-100

  -- Triggers for thesis change
  thesisChangeReasons TEXT[] -- ["VIX spike to 18", "BTC broke resistance"]
);

-- MarketScan table (stores daily multi-market analysis)
CREATE TABLE "MarketScan" (
  id SERIAL PRIMARY KEY,
  scanDate TIMESTAMP NOT NULL DEFAULT NOW(),
  assetClass VARCHAR(50) NOT NULL, -- 'stocks', 'crypto', 'commodities', 'bonds', 'forex', 'REITs'

  -- Performance metrics
  performance1d DECIMAL(10,4),
  performance1w DECIMAL(10,4),
  performance1m DECIMAL(10,4),
  volatility DECIMAL(10,4),
  momentum DECIMAL(10,4),

  -- Top/worst performers
  topPerformer JSONB, -- {"symbol": "BTC", "performance": 15.2, "reason": "breakout"}
  worstPerformer JSONB,

  -- Market conditions
  regime VARCHAR(50), -- 'bullish', 'bearish', 'neutral'
  strength INTEGER, -- 1-10 rating

  -- Raw data
  instruments JSONB, -- Array of all instruments with their data

  -- AI-readable summary
  summary TEXT
);

-- AssetClassAllocation table (tracks actual vs target allocation)
CREATE TABLE "AssetClassAllocation" (
  id SERIAL PRIMARY KEY,
  agentId INTEGER NOT NULL REFERENCES "Agents"(id),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  assetClass VARCHAR(50) NOT NULL,

  targetPercent DECIMAL(5,2), -- From thesis
  actualPercent DECIMAL(5,2), -- Current reality

  positionCount INTEGER,
  totalValue DECIMAL(15,2),
  realizedPnL DECIMAL(15,2),
  unrealizedPnL DECIMAL(15,2)
);

-- Add assetClass to existing tables
ALTER TABLE "StockPrices" ADD COLUMN assetClass VARCHAR(50) DEFAULT 'stocks';
ALTER TABLE "Positions" ADD COLUMN assetClass VARCHAR(50) DEFAULT 'stocks';
ALTER TABLE "Trades" ADD COLUMN assetClass VARCHAR(50) DEFAULT 'stocks';
ALTER TABLE "Decisions" ADD COLUMN thesisId INTEGER REFERENCES "InvestmentThesis"(id);
```

#### 1.2 Multi-Market Data Integration (REAL DATA ONLY!)

**lib/market-scanner.ts** - NEW MODULE

```typescript
import yahooFinance from 'yahoo-finance2';
import axios from 'axios';

// ===== CRYPTOCURRENCY DATA (CoinGecko API - FREE) =====
const CRYPTO_IDS = [
  'bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano',
  'avalanche-2', 'polkadot', 'chainlink', 'uniswap', 'cosmos',
  'polygon', 'arbitrum', 'optimism', 'dogecoin', 'shiba-inu',
  'litecoin', 'bitcoin-cash', 'aave', 'maker'
];

export interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  assetClass: 'crypto';
}

export async function fetchCryptoPrices(): Promise<CryptoPrice[]> {
  try {
    const ids = CRYPTO_IDS.join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;

    console.log('Fetching crypto prices from CoinGecko (REAL DATA)...');
    const response = await axios.get(url);

    const cryptos: CryptoPrice[] = [];
    for (const [id, data] of Object.entries(response.data)) {
      const priceData = data as any;
      cryptos.push({
        symbol: id.toUpperCase(),
        name: id,
        price: priceData.usd,
        change24h: priceData.usd_24h_change || 0,
        volume24h: priceData.usd_24h_vol || 0,
        marketCap: priceData.usd_market_cap || 0,
        assetClass: 'crypto',
      });
    }

    console.log(`✅ Fetched ${cryptos.length} real crypto prices from CoinGecko`);
    return cryptos;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    throw error; // Don't return mock data - fail loudly
  }
}

// ===== COMMODITIES DATA (Yahoo Finance - FREE) =====
const COMMODITY_TICKERS = [
  'GLD',   // Gold
  'SLV',   // Silver
  'USO',   // Oil
  'UNG',   // Natural Gas
  'DBA',   // Agriculture
  'CPER',  // Copper
];

export async function fetchCommodities(): Promise<any[]> {
  console.log('Fetching commodities from Yahoo Finance (REAL DATA)...');
  const commodities = [];

  for (const ticker of COMMODITY_TICKERS) {
    try {
      const quote = await yahooFinance.quote(ticker);
      commodities.push({
        symbol: ticker,
        name: quote.shortName || ticker,
        price: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        volume: quote.regularMarketVolume || 0,
        assetClass: 'commodities',
      });
    } catch (error) {
      console.error(`Error fetching ${ticker}:`, error);
    }
  }

  console.log(`✅ Fetched ${commodities.length} real commodity prices from Yahoo Finance`);
  return commodities;
}

// ===== BONDS DATA (Yahoo Finance - FREE) =====
const BOND_TICKERS = [
  'TLT',  // 20+ Year Treasury
  'IEF',  // 7-10 Year Treasury
  'SHY',  // 1-3 Year Treasury
  'LQD',  // Investment Grade Corporate
  'HYG',  // High Yield Corporate
  'TIP',  // TIPS
];

export async function fetchBonds(): Promise<any[]> {
  console.log('Fetching bonds from Yahoo Finance (REAL DATA)...');
  const bonds = [];

  for (const ticker of BOND_TICKERS) {
    try {
      const quote = await yahooFinance.quote(ticker);
      bonds.push({
        symbol: ticker,
        name: quote.shortName || ticker,
        price: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        volume: quote.regularMarketVolume || 0,
        assetClass: 'bonds',
      });
    } catch (error) {
      console.error(`Error fetching ${ticker}:`, error);
    }
  }

  console.log(`✅ Fetched ${bonds.length} real bond prices from Yahoo Finance`);
  return bonds;
}

// ===== FOREX/CURRENCY DATA (Yahoo Finance - FREE) =====
const FOREX_TICKERS = [
  'UUP',  // US Dollar Bull
  'FXE',  // Euro
  'FXY',  // Japanese Yen
  'FXB',  // British Pound
];

export async function fetchForex(): Promise<any[]> {
  console.log('Fetching forex from Yahoo Finance (REAL DATA)...');
  const forex = [];

  for (const ticker of FOREX_TICKERS) {
    try {
      const quote = await yahooFinance.quote(ticker);
      forex.push({
        symbol: ticker,
        name: quote.shortName || ticker,
        price: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        volume: quote.regularMarketVolume || 0,
        assetClass: 'forex',
      });
    } catch (error) {
      console.error(`Error fetching ${ticker}:`, error);
    }
  }

  console.log(`✅ Fetched ${forex.length} real forex prices from Yahoo Finance`);
  return forex;
}

// ===== REITs DATA (Yahoo Finance - FREE) =====
const REIT_TICKERS = [
  'VNQ',   // Vanguard Real Estate ETF
  'SCHH',  // Schwab US REIT ETF
  'REM',   // iShares Mortgage REIT
];

export async function fetchREITs(): Promise<any[]> {
  console.log('Fetching REITs from Yahoo Finance (REAL DATA)...');
  const reits = [];

  for (const ticker of REIT_TICKERS) {
    try {
      const quote = await yahooFinance.quote(ticker);
      reits.push({
        symbol: ticker,
        name: quote.shortName || ticker,
        price: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        volume: quote.regularMarketVolume || 0,
        assetClass: 'REITs',
      });
    } catch (error) {
      console.error(`Error fetching ${ticker}:`, error);
    }
  }

  console.log(`✅ Fetched ${reits.length} real REIT prices from Yahoo Finance`);
  return reits;
}

// ===== MASTER MARKET SCAN =====
export interface MarketScanResult {
  assetClass: string;
  instruments: any[];
  performance1d: number;
  topPerformer: any;
  worstPerformer: any;
  regime: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 1-10
  summary: string;
}

export async function scanAllMarkets(): Promise<MarketScanResult[]> {
  console.log('🔍 SCANNING ALL MARKETS (REAL DATA ONLY)...');

  const [stocks, crypto, commodities, bonds, forex, reits] = await Promise.all([
    fetchStocks(), // From existing polystocks code
    fetchCryptoPrices(),
    fetchCommodities(),
    fetchBonds(),
    fetchForex(),
    fetchREITs(),
  ]);

  const results: MarketScanResult[] = [
    analyzeAssetClass('stocks', stocks),
    analyzeAssetClass('crypto', crypto),
    analyzeAssetClass('commodities', commodities),
    analyzeAssetClass('bonds', bonds),
    analyzeAssetClass('forex', forex),
    analyzeAssetClass('REITs', reits),
  ];

  console.log('✅ MARKET SCAN COMPLETE (ALL REAL DATA)');
  return results;
}

function analyzeAssetClass(assetClass: string, instruments: any[]): MarketScanResult {
  if (instruments.length === 0) {
    return {
      assetClass,
      instruments: [],
      performance1d: 0,
      topPerformer: null,
      worstPerformer: null,
      regime: 'neutral',
      strength: 0,
      summary: `No data available for ${assetClass}`,
    };
  }

  // Calculate average performance
  const avgPerformance = instruments.reduce((sum, inst) => {
    const change = inst.changePercent || inst.change24h || 0;
    return sum + change;
  }, 0) / instruments.length;

  // Find top and worst performers
  const sorted = [...instruments].sort((a, b) => {
    const aChange = a.changePercent || a.change24h || 0;
    const bChange = b.changePercent || b.change24h || 0;
    return bChange - aChange;
  });

  const topPerformer = sorted[0];
  const worstPerformer = sorted[sorted.length - 1];

  // Determine regime
  let regime: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (avgPerformance > 1) regime = 'bullish';
  else if (avgPerformance < -1) regime = 'bearish';

  // Calculate strength (1-10)
  const strength = Math.min(10, Math.max(1, Math.round(5 + avgPerformance)));

  // Generate summary
  const topChange = topPerformer.changePercent || topPerformer.change24h || 0;
  const worstChange = worstPerformer.changePercent || worstPerformer.change24h || 0;

  const summary = `${assetClass.toUpperCase()}: ${regime.toUpperCase()} (avg ${avgPerformance.toFixed(2)}%). ` +
    `Top: ${topPerformer.symbol} (+${topChange.toFixed(2)}%). ` +
    `Worst: ${worstPerformer.symbol} (${worstChange.toFixed(2)}%). ` +
    `Strength: ${strength}/10`;

  return {
    assetClass,
    instruments,
    performance1d: avgPerformance,
    topPerformer: {
      symbol: topPerformer.symbol,
      performance: topChange,
      price: topPerformer.price,
    },
    worstPerformer: {
      symbol: worstPerformer.symbol,
      performance: worstChange,
      price: worstPerformer.price,
    },
    regime,
    strength,
    summary,
  };
}
```

---

### Week 2: Investment Thesis Generation

**Goal:** AIs generate daily investment thesis based on multi-market scan

#### 2.1 Investment Thesis Module

**lib/investment-thesis.ts** - NEW MODULE

```typescript
import { scanAllMarkets, MarketScanResult } from './market-scanner';
import { getMacroIndicators } from './data-sources'; // Existing
import { getMarketContext } from './market-context'; // Existing

export interface InvestmentThesis {
  agentId: number;
  agentName: string;
  thesisType: 'daily' | 'cycle_update';

  // Macro view
  macroView: string;
  marketRegime: 'risk_on' | 'risk_off' | 'neutral' | 'crisis';

  // Asset allocation
  targetAllocation: {
    [assetClass: string]: number; // Percent (0-100)
  };

  reasoning: string;
  keyMetrics: {
    vix: number;
    spyTrend: string;
    dollarIndex: number;
    inflation: number;
    cryptoMomentum?: number;
  };

  confidence: number; // 0-100
  thesisChangeReasons: string[];

  timestamp: Date;
}

export async function generateDailyThesis(
  agentId: number,
  agentName: string,
  agentModel: string
): Promise<InvestmentThesis> {
  console.log(`📝 Generating daily investment thesis for ${agentName}...`);

  // 1. Scan all markets (REAL DATA)
  const marketScan = await scanAllMarkets();

  // 2. Get macro context
  const macroIndicators = await getMacroIndicators();
  const marketContext = await getMarketContext();

  // 3. Prepare AI prompt
  const prompt = `You are ${agentName}, an AI macro investor managing a $10,000 portfolio.

DAILY MARKET SCAN (REAL DATA):
${marketScan.map(m => `
${m.assetClass.toUpperCase()}:
- Performance: ${m.performance1d.toFixed(2)}%
- Regime: ${m.regime}
- Strength: ${m.strength}/10
- Top Performer: ${m.topPerformer?.symbol} (+${m.topPerformer?.performance.toFixed(2)}%)
- Worst Performer: ${m.worstPerformer?.symbol} (${m.worstPerformer?.performance.toFixed(2)}%)
- Summary: ${m.summary}
`).join('\n')}

MACRO INDICATORS:
- VIX: ${marketContext.vix?.level || 'N/A'}
- SPY Trend: ${marketContext.spyTrend?.regime || 'N/A'}
- Market Sentiment: ${marketContext.marketSummary || 'N/A'}
- Inflation: ${macroIndicators?.inflationRate || 'N/A'}%
- Interest Rate: ${macroIndicators?.interestRate || 'N/A'}%

YOUR TASK:
Generate your daily investment thesis. Decide which MARKETS (asset classes) you want to invest in and what % allocation.

Provide:
1. **Macro View**: Your overall view on the economy and markets (2-3 sentences)
2. **Market Regime**: Risk-on, risk-off, neutral, or crisis?
3. **Target Allocation**: Percentage allocation to each asset class (must total 100%)
   - Available: stocks, crypto, commodities, bonds, forex, REITs, cash
4. **Reasoning**: Why this allocation? What are you bullish/bearish on? (3-4 sentences)
5. **Key Metrics**: What specific metrics are you watching?
6. **Confidence**: How confident are you in this thesis? (0-100)

Respond ONLY with valid JSON:
{
  "macroView": "...",
  "marketRegime": "risk_on|risk_off|neutral|crisis",
  "targetAllocation": {
    "stocks": 30,
    "crypto": 40,
    "commodities": 20,
    "cash": 10
  },
  "reasoning": "...",
  "keyMetrics": {
    "vix": 12,
    "cryptoMomentum": 15,
    "dollarIndex": 102
  },
  "confidence": 85
}`;

  // 4. Call AI model
  const aiResponse = await callAIModel(agentModel, prompt);
  const thesisData = JSON.parse(aiResponse);

  // 5. Construct thesis object
  const thesis: InvestmentThesis = {
    agentId,
    agentName,
    thesisType: 'daily',
    macroView: thesisData.macroView,
    marketRegime: thesisData.marketRegime,
    targetAllocation: thesisData.targetAllocation,
    reasoning: thesisData.reasoning,
    keyMetrics: thesisData.keyMetrics,
    confidence: thesisData.confidence,
    thesisChangeReasons: [],
    timestamp: new Date(),
  };

  console.log(`✅ Daily thesis generated for ${agentName}`);
  console.log(`   Regime: ${thesis.marketRegime}`);
  console.log(`   Allocation: ${JSON.stringify(thesis.targetAllocation)}`);

  return thesis;
}

export async function updateThesis(
  currentThesis: InvestmentThesis,
  marketScan: MarketScanResult[],
  recentTrades: any[]
): Promise<InvestmentThesis> {
  console.log(`🔄 Updating investment thesis for ${currentThesis.agentName}...`);

  // AI decides if thesis needs updating based on new market data
  // Similar prompt structure but focused on "what changed since this morning?"

  // ... implementation similar to generateDailyThesis but for updates
}

async function callAIModel(model: string, prompt: string): Promise<string> {
  // Use existing AI calling infrastructure from polystocks
  // This will call GPT-4, Claude, Gemini, etc. based on model
  // Returns JSON string
}
```

---

### Week 3: Trading Engine Integration

**Goal:** Integrate thesis-driven trading into existing engine

#### 3.1 Update Trading Engine

**lib/trading-engine.ts** - MODIFICATIONS

```typescript
import { generateDailyThesis, updateThesis } from './investment-thesis';
import { scanAllMarkets } from './market-scanner';

// Add to runTradingCycle()
export async function runTradingCycle() {
  console.log('🔄 Starting Trading Cycle...');

  // 1. Check if it's start of day (generate daily thesis)
  const now = new Date();
  const isStartOfDay = now.getHours() === 9 && now.getMinutes() < 30;

  // 2. Scan all markets (REAL DATA)
  const marketScan = await scanAllMarkets();

  // 3. For each agent
  for (const agent of agents) {
    try {
      // 3a. Generate or update thesis
      let thesis;
      if (isStartOfDay || !agent.currentThesis) {
        // Generate fresh daily thesis
        thesis = await generateDailyThesis(agent.id, agent.name, agent.model);
        await saveThesisToDatabase(thesis);
        agent.currentThesis = thesis;
      } else {
        // Update existing thesis
        const recentTrades = await getRecentTrades(agent.id);
        thesis = await updateThesis(agent.currentThesis, marketScan, recentTrades);
        await saveThesisToDatabase(thesis);
        agent.currentThesis = thesis;
      }

      // 3b. Get current allocation
      const currentAllocation = await calculateCurrentAllocation(agent.id);

      // 3c. Determine trades needed to reach target allocation
      const tradesNeeded = calculateRebalancingTrades(
        currentAllocation,
        thesis.targetAllocation,
        agent.cashBalance,
        marketScan
      );

      // 3d. Execute trades
      for (const trade of tradesNeeded) {
        await executeTrade(agent, trade, thesis);
      }

    } catch (error) {
      console.error(`Error in trading cycle for ${agent.name}:`, error);
    }
  }

  console.log('✅ Trading Cycle Complete');
}

function calculateRebalancingTrades(
  current: { [assetClass: string]: number },
  target: { [assetClass: string]: number },
  cashBalance: number,
  marketScan: MarketScanResult[]
): Trade[] {
  // Calculate difference between current and target allocation
  // Return list of trades (buys/sells) to rebalance

  const trades: Trade[] = [];

  for (const [assetClass, targetPercent] of Object.entries(target)) {
    const currentPercent = current[assetClass] || 0;
    const diff = targetPercent - currentPercent;

    if (Math.abs(diff) > 5) { // Only rebalance if >5% difference
      const targetValue = (cashBalance * targetPercent) / 100;
      const currentValue = (cashBalance * currentPercent) / 100;
      const tradeValue = targetValue - currentValue;

      // Find best instrument in this asset class
      const assetData = marketScan.find(m => m.assetClass === assetClass);
      if (assetData && assetData.topPerformer) {
        trades.push({
          assetClass,
          symbol: assetData.topPerformer.symbol,
          action: tradeValue > 0 ? 'buy' : 'sell',
          value: Math.abs(tradeValue),
          reasoning: `Rebalancing to ${targetPercent}% ${assetClass} (currently ${currentPercent}%)`,
        });
      }
    }
  }

  return trades;
}
```

---

### Week 4: Dashboard & Visualization

**Goal:** Show investment thesis prominently on dashboard

#### 4.1 Update Homepage UI

**app/page.tsx** - ADD THESIS SECTION

```tsx
// Add near top of dashboard
<div style={{
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  padding: '24px',
  borderRadius: '16px',
  marginBottom: '24px',
  border: '2px solid #990F3D'
}}>
  <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#FFF', marginBottom: '16px' }}>
    📝 Today's Investment Thesis
  </h2>

  {agents.map(agent => (
    <div key={agent.id} style={{
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      padding: '16px',
      borderRadius: '12px',
      marginBottom: '12px',
      border: '1px solid rgba(153, 15, 61, 0.3)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#CC785C' }}>
          {agent.name}
        </div>
        <div style={{ fontSize: '12px', color: '#E0E0E0' }}>
          {agent.thesis?.marketRegime?.toUpperCase()} • {agent.thesis?.confidence}% Confident
        </div>
      </div>

      <div style={{ fontSize: '14px', color: '#E0E0E0', marginTop: '8px', lineHeight: '1.6' }}>
        <strong>Macro View:</strong> {agent.thesis?.macroView}
      </div>

      <div style={{ fontSize: '14px', color: '#E0E0E0', marginTop: '8px', lineHeight: '1.6' }}>
        <strong>Allocation:</strong> {formatAllocation(agent.thesis?.targetAllocation)}
      </div>

      <div style={{ fontSize: '13px', color: '#CCC', marginTop: '8px', fontStyle: 'italic' }}>
        {agent.thesis?.reasoning}
      </div>

      {agent.thesis?.thesisChangeReasons?.length > 0 && (
        <div style={{ fontSize: '12px', color: '#FFA500', marginTop: '8px' }}>
          <strong>Updates:</strong> {agent.thesis.thesisChangeReasons.join(', ')}
        </div>
      )}
    </div>
  ))}
</div>

function formatAllocation(allocation: any): string {
  if (!allocation) return 'Not set';
  return Object.entries(allocation)
    .map(([asset, percent]) => `${asset}: ${percent}%`)
    .join(', ');
}
```

#### 4.2 Asset Allocation Pie Chart

```tsx
// Add Recharts pie chart showing allocation per agent
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
  stocks: '#3B82F6',
  crypto: '#F59E0B',
  commodities: '#EF4444',
  bonds: '#10B981',
  forex: '#8B5CF6',
  REITs: '#EC4899',
  cash: '#6B7280',
};

<ResponsiveContainer width="100%" height={300}>
  <PieChart>
    <Pie
      data={allocationData}
      cx="50%"
      cy="50%"
      labelLine={false}
      label={(entry) => `${entry.name}: ${entry.value}%`}
      outerRadius={80}
      fill="#8884d8"
      dataKey="value"
    >
      {allocationData.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#999'} />
      ))}
    </Pie>
    <Tooltip />
    <Legend />
  </PieChart>
</ResponsiveContainer>
```

---

## Implementation Checklist

### Phase 1: Multi-Market Foundation (Week 1)

- [ ] Create database migration for new tables (InvestmentThesis, MarketScan, AssetClassAllocation)
- [ ] Build `lib/market-scanner.ts` with REAL API integrations:
  - [ ] CoinGecko API for crypto (19 instruments)
  - [ ] Yahoo Finance for commodities (6 instruments)
  - [ ] Yahoo Finance for bonds (6 instruments)
  - [ ] Yahoo Finance for forex (4 instruments)
  - [ ] Yahoo Finance for REITs (3 instruments)
- [ ] Test all APIs return REAL data (no mocking!)
- [ ] Create `scanAllMarkets()` function
- [ ] Add `analyzeAssetClass()` helper
- [ ] Test market scan end-to-end

### Phase 2: Investment Thesis (Week 2)

- [ ] Build `lib/investment-thesis.ts`
- [ ] Create `generateDailyThesis()` function
- [ ] Create `updateThesis()` function
- [ ] Write AI prompts for thesis generation
- [ ] Test with 1 AI agent (GPT-4)
- [ ] Verify JSON parsing works
- [ ] Save thesis to database
- [ ] Add thesis retrieval functions

### Phase 3: Trading Engine (Week 3)

- [ ] Update `lib/trading-engine.ts`
- [ ] Add daily thesis generation (start of day)
- [ ] Add cycle-based thesis updates
- [ ] Implement `calculateCurrentAllocation()`
- [ ] Implement `calculateRebalancingTrades()`
- [ ] Execute trades based on thesis
- [ ] Link trades to thesis ID
- [ ] Test rebalancing logic
- [ ] Verify multi-asset trades work

### Phase 4: Dashboard (Week 4)

- [ ] Add Investment Thesis section to homepage
- [ ] Show each agent's thesis prominently
- [ ] Add asset allocation pie charts
- [ ] Add market regime badges
- [ ] Add "thesis updates" timeline
- [ ] Show current vs target allocation
- [ ] Style thesis section (dark gradient)
- [ ] Test on mobile/desktop

### Phase 5: Testing & Launch (Week 5-6)

- [ ] Run trading cycle with REAL data
- [ ] Verify NO mock data anywhere
- [ ] Test all 6 AI agents generate thesis
- [ ] Verify crypto trades execute
- [ ] Verify commodities trades execute
- [ ] Test thesis updates every 30 min
- [ ] Check database storing correctly
- [ ] Review AI thesis quality
- [ ] Fix any bugs
- [ ] Deploy to production
- [ ] Monitor first 24 hours
- [ ] Verify Vercel cron works
- [ ] Check API rate limits okay

---

## Initial Universe (Phase 1)

**Total: 58 instruments across 6 asset classes**

1. **US Stocks (20)** - Existing from PolyStocks
2. **Cryptocurrencies (19)** - CoinGecko API
3. **Commodities (6)** - Yahoo Finance
4. **Bonds (6)** - Yahoo Finance
5. **Forex (4)** - Yahoo Finance
6. **REITs (3)** - Yahoo Finance

---

## Success Criteria

### Week 1 Success:
- [  ] All market scanners fetch REAL data
- [ ] NO mock data anywhere
- [ ] Console logs show "Fetched X real prices from [API]"
- [ ] Database tables created

### Week 2 Success:
- [ ] At least 1 AI generates valid daily thesis
- [ ] Thesis includes macro view, allocation, reasoning
- [ ] Thesis saved to database

### Week 3 Success:
- [ ] Trading cycle executes trades based on thesis
- [ ] Rebalancing logic works (sells stocks, buys crypto)
- [ ] Trades link to thesis ID

### Week 4 Success:
- [ ] Dashboard shows investment thesis prominently
- [ ] Users can see AI's reasoning
- [ ] Pie charts show asset allocation

### Week 5-6 Success:
- [ ] All 6 AIs trading across multiple markets
- [ ] Thesis updates every 30 minutes
- [ ] Performance improves vs stock-only
- [ ] Dashboard looks professional

---

## NO MOCK DATA - Verification

**Every data fetch must log to console:**

```typescript
console.log('✅ Fetched 19 real crypto prices from CoinGecko');
console.log('✅ Fetched 6 real commodity prices from Yahoo Finance');
console.log('✅ Fetched 6 real bond prices from Yahoo Finance');
```

**If API fails:**
```typescript
throw new Error('CoinGecko API failed - NO MOCK DATA FALLBACK');
```

**NEVER:**
```typescript
// ❌ WRONG - Don't do this!
if (apiError) {
  return MOCK_DATA; // NO!
}
```

---

## Timeline

**Week 1:** Multi-market scanner (REAL APIs)
**Week 2:** Investment thesis generation
**Week 3:** Trading engine integration
**Week 4:** Dashboard UI updates
**Week 5-6:** Testing, bug fixes, launch

**Total: 4-6 weeks to full implementation**

---

## Next Steps

1. **Run database migrations** to add new tables
2. **Build market-scanner.ts** with CoinGecko integration
3. **Test crypto API** returns real data
4. **Build investment-thesis.ts** with AI prompt
5. **Test with 1 agent** (GPT-4)
6. **Iterate and expand**

---

**PolyPoly = AI Macro Investors with Real Data** 🚀
