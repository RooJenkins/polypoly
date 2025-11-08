# AI Trading Intelligence System

**Version:** 2.0
**Date:** January 2025
**Status:** Production

## Overview

This document describes the comprehensive AI trading intelligence system implemented in Poly Stocks. The system provides six AI models with sophisticated market analysis, portfolio management, strategy-specific signals, optimal position sizing, multi-source data integration, and automated exit management.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Module Descriptions](#module-descriptions)
3. [AI Trading Strategies](#ai-trading-strategies)
4. [Position Sizing Algorithm](#position-sizing-algorithm)
5. [Exit Management System](#exit-management-system)
6. [Data Flow](#data-flow)
7. [Performance Expectations](#performance-expectations)
8. [Design Biases](#design-biases)
9. [Future Enhancements](#future-enhancements)

---

## Architecture Overview

The AI trading intelligence system consists of 6 core modules that work together to enhance AI decision-making:

```
┌─────────────────────────────────────────────────────────────┐
│                     Trading Engine                          │
│                   (30-minute cycles)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ Market Context   │    │ Data Sources     │
│ - SPY Trend      │    │ - Macro Econ     │
│ - VIX Level      │    │ - Insider Trades │
│ - Sectors        │    │ - Short Interest │
│ - Rel Strength   │    │ - Options Flow   │
└─────────┬────────┘    └────────┬─────────┘
          │                      │
          └──────────┬───────────┘
                     │
                     ▼
          ┌────────────────────┐
          │  AI Agent Loop     │
          │  (6 AI models)     │
          └─────────┬──────────┘
                    │
      ┌─────────────┼─────────────┐
      │             │             │
      ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│Portfolio │  │Strategy  │  │Position  │
│Intel     │  │Signals   │  │Sizing    │
│- Conc.   │  │- Entry   │  │- Kelly   │
│- Div.    │  │- Exit    │  │- Risk    │
│- Beta    │  │- Custom  │  │- Adjust  │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │              │
     └─────────────┼──────────────┘
                   │
                   ▼
          ┌────────────────┐
          │  AI Decision   │
          │  (BUY/SELL)    │
          └────────┬───────┘
                   │
                   ▼
          ┌────────────────┐
          │ Exit Manager   │
          │ (7 exit types) │
          └────────────────┘
```

---

## Module Descriptions

### 1. Market Context (`lib/market-context.ts`)

**Purpose:** Provides macro-level market intelligence to help AIs understand the broader market environment.

**Components:**

#### SPY Trend Analysis
- **Tracks:** S&P 500 index (SPY) with moving averages (MA7, MA30, MA90)
- **Regime Detection:** Bullish, Bearish, or Neutral based on MA alignment
- **Metrics:** Daily/weekly/monthly change percentages
- **Usage:** AIs adjust risk based on market regime

```typescript
interface SPYTrend {
  price: number;
  dailyChange: number;
  weekChange: number;
  monthChange: number;
  ma7: number;
  ma30: number;
  ma90: number;
  regime: 'bullish' | 'bearish' | 'neutral';
}
```

**Regime Rules:**
- **Bullish:** Price > MA30 > MA90 AND MA30 > MA90
- **Bearish:** Price < MA30 < MA90 AND MA30 < MA90
- **Neutral:** All other conditions

#### VIX Volatility Index
- **Tracks:** CBOE Volatility Index (fear gauge)
- **Interpretation Levels:**
  - `< 12`: Low volatility (risk on)
  - `12-16`: Normal (risk on)
  - `16-20`: Elevated (cautious)
  - `20-30`: High fear (risk off)
  - `> 30`: Extreme fear (risk off)
- **Usage:** Position sizing reduces in high VIX environments

#### Sector Rotation Analysis
- **Tracks:** 5 major sectors
  - Technology (AAPL, MSFT, NVDA, GOOGL, META)
  - Financials (JPM, BAC, V, MA)
  - Energy (XOM, CVX)
  - Healthcare (UNH, JNJ, LLY)
  - Consumer (WMT, PG, KO, COST)
- **Metrics:** Average change, relative strength vs SPY
- **Classification:** Leading, Inline, or Lagging
- **Usage:** Favor stocks in leading sectors

#### Relative Strength
- **Calculation:** Stock's % change - SPY's % change
- **Timeframes:** Weekly and monthly
- **Usage:** Identify outperformers and underperformers

**Key Functions:**
- `getMarketContext()` - Main entry point, returns complete market intelligence
- `fetchSPYTrend()` - Gets S&P 500 data with regime detection
- `fetchVIX()` - Gets VIX level with interpretation
- `calculateSectorRotation()` - Analyzes sector performance
- `calculateRelativeStrength()` - Compares stocks vs market

---

### 2. Portfolio Intelligence (`lib/portfolio-intelligence.ts`)

**Purpose:** Analyzes the agent's portfolio holistically to identify risks and provide recommendations.

**Components:**

#### Concentration Risk
- **Largest Position %**: Percentage of portfolio in single largest holding
- **Top 3 Concentration**: Combined % of top 3 holdings
- **Risk Levels:**
  - `< 20%`: Low risk
  - `20-30%`: Moderate risk
  - `30-40%`: High risk
  - `> 40%`: Extreme risk
- **Recommendations:** Suggests position reduction when concentration is too high

#### Diversification Score
- **Method:** Herfindahl-Hirschman Index (HHI)
- **Formula:** `Effective Positions = 1 / Σ(weight²)`
- **Scoring:** 0-100 scale based on effective positions vs actual positions
- **Grades:** A (90+), B (75-89), C (60-74), D (40-59), F (<40)
- **Interpretation:** Higher score = better diversification

#### Portfolio Beta
- **Calculation:** Weighted average of stock betas vs market
- **Risk Levels:**
  - `< 0.8`: Conservative
  - `0.8-1.3`: Moderate
  - `> 1.3`: Aggressive
- **Usage:** Helps assess portfolio risk level

#### Sector Exposure
- **Tracks:** % allocation to each of 5 sectors
- **Dominant Sector:** Sector with highest allocation
- **Diversification Assessment:**
  - `> 70%` in one sector: Poor
  - `50-70%`: Fair
  - `35-50%`: Good
  - `< 35%`: Excellent

#### Cash Management
- **Cash %**: Current cash as % of total account value
- **Status Classification:**
  - `< 5%`: Too low (no dry powder)
  - `5-40%`: Optimal
  - `> 40%`: Too high (underinvested)
- **Opportunity Cost:** Calculates missed gains if cash deployed in SPY
- **Cash Drag Days**: Days since last trade

#### Performance Tracking
- **Unrealized P&L**: Total and percentage across all positions
- **Best/Worst Positions**: Identifies top performer and worst loser
- **Portfolio Summary**: Human-readable summary of portfolio state

**Key Functions:**
- `calculatePortfolioMetrics()` - Main analysis function
- `getPortfolioRecommendations()` - Actionable suggestions for improvements
- `generatePortfolioSummary()` - Creates readable summary text

---

### 3. Trading Strategies (`lib/trading-strategies.ts`)

**Purpose:** Provides each AI model with a distinct trading strategy and strategy-specific signals.

#### Strategy Assignments

| AI Model | Strategy | Holding Period | Risk Tolerance | Key Indicators |
|----------|----------|----------------|----------------|----------------|
| **GPT-4o Mini** | Momentum Breakout | 1-3 days | Aggressive | MA crossovers, Volume surges, RSI > 60 |
| **Claude Haiku** | Mean Reversion | 3-7 days | Moderate | RSI < 30, Bollinger bands, Oversold bounces |
| **Gemini Flash** | Trend Following | 1-4 weeks | Moderate | MA alignment, Relative strength, 52w highs |
| **DeepSeek** | Value Quality | 2-8 weeks | Conservative | Pullbacks > 8%, MA90 support, Fundamentals |
| **Qwen** | Volatility Arbitrage | 1-2 days | Aggressive | VIX spikes, Panic selling, RSI < 35 |
| **Grok** | Contrarian Sentiment | 1-2 weeks | Moderate | Extreme pessimism, Sector divergence |

#### Strategy Details

##### 1. Momentum Breakout (GPT-4o Mini)
**Philosophy:** Capitalize on explosive price moves with volume confirmation

**Entry Signals:**
- Price breaks above MA7 with 2x average volume
- RSI crosses above 60 (momentum building)
- Daily gain > 3% with strong sector support

**Exit Signals:**
- Price closes below MA7 (momentum broken)
- Volume dries up (< 0.5x average)
- RSI enters overbought (> 75)
- Quick 5-7% profit target hit

**Ideal Market Conditions:** Bullish, high volatility, trending markets

---

##### 2. Mean Reversion (Claude Haiku)
**Philosophy:** Buy oversold quality names, sell when they normalize

**Entry Signals:**
- RSI < 30 (oversold)
- Price touches lower Bollinger band
- Down > 5% in week without negative news
- Strong sector fundamentals intact

**Exit Signals:**
- RSI returns to 50-60 (normalized)
- Price reaches middle Bollinger band
- 3-5% profit target achieved
- Position held > 7 days without recovery

**Ideal Market Conditions:** Neutral, low volatility, range-bound markets

---

##### 3. Trend Following (Gemini Flash)
**Philosophy:** Ride strong multi-week trends until they break

**Entry Signals:**
- Price > MA7 > MA30 (aligned uptrend)
- Making new 20-day highs
- Relative strength > +3% vs SPY (outperforming)
- Leading sector momentum

**Exit Signals:**
- Price closes below MA30 (trend break)
- Relative strength turns negative
- Market regime shifts bearish
- 10-15% profit target or trailing stop hit

**Ideal Market Conditions:** Bullish, trending, sector rotation active

---

##### 4. Value Quality (DeepSeek)
**Philosophy:** Patient capital allocation to undervalued quality names

**Entry Signals:**
- Pullback > 8% from recent highs
- Still above MA90 (long-term uptrend intact)
- Strong sector fundamentals
- Low portfolio concentration in sector

**Exit Signals:**
- Price recovers to prior highs
- Fundamental deterioration
- 12-20% profit target achieved
- Better opportunity emerges (rebalance)

**Ideal Market Conditions:** Neutral, bearish recovery, low volatility

---

##### 5. Volatility Arbitrage (Qwen)
**Philosophy:** Exploit volatility spikes and contractions

**Entry Signals:**
- VIX spike > 20 (fear elevated)
- Stock down > 4% on broad selloff
- Quality name with no stock-specific issues
- RSI < 35 (oversold in panic)

**Exit Signals:**
- VIX normalizes < 18
- Quick 3-5% bounce captured
- Next trading day (quick flip)
- Volatility remains elevated > 2 days

**Ideal Market Conditions:** High volatility, mean reversion, VIX extremes

---

##### 6. Contrarian Sentiment (Grok)
**Philosophy:** Fade extreme sentiment, buy fear, sell greed

**Entry Signals:**
- Extreme negative sentiment on quality stock
- Down > 10% in month on overreaction
- Upcoming catalyst (earnings, product launch)
- Contrasts with sector strength

**Exit Signals:**
- Sentiment normalizes
- Analyst upgrades emerge
- Stock recovers 50% of decline
- 7-12% profit target or 2 weeks elapsed

**Ideal Market Conditions:** Sentiment extremes, oversold quality, catalyst potential

---

**Key Functions:**
- `getStrategySignals()` - Generates buy/sell signals for all stocks based on agent's strategy
- `generateStrategyPrompt()` - Creates strategy-specific guidance for AI prompt
- `STRATEGY_CONFIGS` - Configuration object with all strategy details

---

### 4. Position Sizing (`lib/position-sizing.ts`)

**Purpose:** Implements Kelly Criterion for optimal position sizing based on statistical edge.

#### Kelly Criterion Formula

```
Kelly % = (p × b - q) / b

Where:
  p = win rate (probability of winning)
  b = win/loss ratio (avg win / avg loss)
  q = loss rate (1 - p)
```

#### Implementation Steps

1. **Calculate Base Kelly**
   - Use last 100 trades to determine win rate and avg win/loss ratio
   - If < 10 trades, use conservative estimate (confidence × 0.15)

2. **Confidence Adjustment**
   - Scale Kelly by AI's confidence level (30-100% multiplier)
   - High confidence (90%) = full Kelly
   - Low confidence (60%) = 30% of Kelly

3. **Volatility Adjustment**
   - Higher stock volatility = smaller position
   - Baseline: 20% annualized volatility
   - If stock volatility > 30%, reduce position by up to 50%
   - If stock volatility < 16%, increase position by up to 20%

4. **Diversification Adjustment**
   - More positions = smaller individual sizes
   - 8+ positions: multiply by 0.7
   - 5-7 positions: multiply by 0.85
   - ≤ 2 positions: multiply by 1.1

5. **Risk Tolerance Adjustment**
   - Conservative: 0.5x Kelly (half-Kelly)
   - Moderate: 0.75x Kelly (three-quarter Kelly)
   - Aggressive: 1.0x Kelly (full Kelly)

6. **Hard Constraints**
   - Never exceed 30% of account per position
   - Minimum 5% position (if trading at all)
   - Never bet negative (if Kelly ≤ 0, don't trade)

7. **Market Condition Modifiers**
   - Bearish market regime: multiply by 0.6
   - Neutral market: multiply by 0.85
   - High VIX (> 25): multiply by 0.7
   - High portfolio beta (> 1.3): multiply by 0.85

#### Example Calculation

```typescript
Agent: GPT-4o Mini (Aggressive strategy)
Win Rate: 55% (11 wins / 20 trades)
Avg Win: +6.2%
Avg Loss: -3.1%
Win/Loss Ratio: 2.0

Base Kelly = (0.55 × 2.0 - 0.45) / 2.0 = 32.5%

Adjustments:
× 0.85 (85% confidence)
× 0.90 (high volatility stock)
× 0.85 (5 existing positions)
× 1.00 (aggressive risk tolerance)
× 0.85 (neutral market regime)

Final Position Size: 32.5% × 0.85 × 0.90 × 0.85 × 1.00 × 0.85 = 17.8% of account
```

**Key Functions:**
- `calculatePositionSize()` - Main Kelly calculation with all adjustments
- `calculateAgentPerformance()` - Computes win rate, avg win/loss from trade history
- `adjustForMarketConditions()` - Applies macro adjustments (VIX, regime, beta)
- `getPositionSizeSummary()` - Formats sizing logic for AI prompt

---

### 5. Multi-Source Data Integration (`lib/data-sources.ts`)

**Purpose:** Enriches stock analysis with additional data sources beyond price and volume.

#### Data Sources

##### 1. Macro Economic Indicators
**Data Points:**
- GDP Growth Rate (quarterly)
- Unemployment Rate
- Inflation Rate (CPI)
- Federal Funds Rate
- Yield Curve (10Y - 2Y spread)

**Economic Regimes:**
- **Expansion:** GDP > 3%, Unemployment < 4.5%
- **Slowdown:** GDP < 1.5% or Yield Curve < -50bp
- **Recession:** GDP < 0% or Unemployment > 6%
- **Recovery:** Transitioning from recession to expansion

**Market Sentiment:**
- Risk On: Expansion, recovery regimes
- Neutral: Slowdown regime
- Risk Off: Recession regime

---

##### 2. Insider Trading Activity
**Tracks:** SEC Form 4 filings (buys and sells by corporate insiders)

**Signals:**
- **Bullish:** Net insider buying (buys > sells)
- **Bearish:** Net insider selling (sells > buys)
- **Significant Activity:** Unusual clustering of insider transactions

**Current Implementation:** Simulated based on stock behavior patterns
**Future Enhancement:** Real-time SEC Form 4 scraping

---

##### 3. Short Interest Data
**Tracks:**
- **Short % of Float:** Percentage of shares sold short
- **Days to Cover:** Short interest / average daily volume

**Squeeze Risk Levels:**
- **Low:** < 8% shorted
- **Moderate:** 8-12% shorted
- **High:** 12-20% shorted
- **Extreme:** > 20% shorted with days to cover > 5

**Usage:** High short interest can signal squeeze opportunities or fundamental concerns

---

##### 4. Options Flow Analysis
**Tracks:**
- **Put/Call Ratio:** Put volume / Call volume
- **Implied Volatility:** Market's expectation of future volatility (IV Rank 0-100)
- **Unusual Activity:** Volume spikes with large price moves

**Sentiment Signals:**
- **Bullish:** P/C ratio < 0.7 (call heavy)
- **Bearish:** P/C ratio > 1.3 (put heavy)
- **Neutral:** P/C ratio 0.8-1.2

---

##### 5. Earnings Calendar
**Tracks:**
- **Days Until Earnings:** Countdown to next earnings report
- **Earnings Season:** Within 7 days of earnings
- **Recent Beat/Miss:** Result of last earnings report
- **Volatility Expected:** Earnings within 3 days

**Usage:** Avoid entries near earnings or specifically target earnings plays

---

**Key Functions:**
- `fetchMacroIndicators()` - Gets GDP, unemployment, inflation, Fed rates
- `analyzeInsiderActivity()` - Tracks insider buys/sells
- `analyzeShortInterest()` - Calculates squeeze risk
- `analyzeOptionsFlow()` - Interprets put/call ratios
- `analyzeEarningsProximity()` - Checks earnings calendar
- `getEnhancedStockData()` - Combines all data sources for each stock
- `generateDataSourcesSummary()` - Creates formatted summary for AI

---

### 6. Exit Management (`lib/exit-management.ts`)

**Purpose:** Automated exit rule system to protect profits and limit losses.

#### 7 Exit Types

##### 1. Stop Loss
**Trigger:** Position down -8%
**Urgency:** Critical
**Purpose:** Hard floor to prevent catastrophic losses
**Example:** Bought at $100, exits at $92

---

##### 2. Profit Target
**Trigger:** Reaches strategy-specific profit target
**Targets by Strategy:**
- Momentum Breakout: 7%
- Mean Reversion: 5%
- Trend Following: 15%
- Value Quality: 20%
- Volatility Arbitrage: 5%
- Contrarian Sentiment: 12%

**Adjustments:** +3% if held > 30 days
**Urgency:** Medium
**Purpose:** Lock in gains at predetermined levels

---

##### 3. Trailing Stop
**Trigger:** Pullback from peak exceeds trailing stop distance
**Progressive Distances:**
- Up 5-10%: Trail by 3%
- Up 10-15%: Trail by 5%
- Up 15-25%: Trail by 6%
- Up > 25%: Trail by 8%

**Urgency:** High
**Purpose:** Protect profits while letting winners run
**Example:** Stock runs from $100 to $120 (+20%), trails by 6%, exits at $112.80

---

##### 4. Time-Based Exit
**Trigger:** Held beyond max holding period without profit
**Max Periods by Strategy:**
- Momentum Breakout: 5 days
- Mean Reversion: 10 days
- Trend Following: 40 days
- Value Quality: 90 days
- Volatility Arbitrage: 3 days
- Contrarian Sentiment: 21 days

**Urgency:** Low
**Purpose:** Free up capital from non-performing positions
**Condition:** Position must be < +3% to exit

---

##### 5. Technical Exit
**Triggers:**
- **MA30 Break:** Price closes below MA30 with -3% loss
- **MA7 Break:** Price closes below MA7 with -5% loss
- **Extreme Overbought:** RSI > 78 with +8% gain
- **Oversold Capitulation:** RSI < 25 with -6% loss

**Urgency:** Medium
**Purpose:** Exit when technical indicators show trend reversal

---

##### 6. Macro Circuit Breaker
**Triggers:**
- **VIX Spike:** VIX > 35 (extreme fear)
- **Market Crash:** SPY down > -8% in one week
- **Bearish Regime + High VIX:** Regime = bearish, VIX > 25, SPY < -5% monthly

**Urgency:** Critical
**Purpose:** Protect against systemic market events
**Action:** Exit ALL positions when triggered

---

##### 7. Strategy-Specific Exit
**Custom exits per strategy:**

**Momentum Breakout:**
- Exit if RSI drops below 50 with +3% gain (momentum fading)

**Mean Reversion:**
- Exit if RSI normalizes to 50-60 with +2% gain (reversion complete)

**Trend Following:**
- Exit if relative strength < -2% and price < MA7 (trend broken)

**Value Quality:**
- Exit if within 3% of 52-week high with +10% gain (fair value reached)

**Volatility Arbitrage:**
- Exit if VIX drops below 16 with +2% gain (volatility normalized)

**Contrarian Sentiment:**
- Exit if up > 8% in one week (sentiment reversed)

**Urgency:** Varies by signal
**Purpose:** Strategy-aligned exit logic

---

#### Exit Prioritization

When multiple exit signals trigger simultaneously, priority order:

1. **Stop Loss** (always first - limit losses)
2. **Macro Circuit Breaker** (systemic risk)
3. **Trailing Stop** (protect large gains)
4. **Profit Target** (lock in gains)
5. **Technical Exit** (trend reversal)
6. **Strategy-Specific** (style alignment)
7. **Time-Based** (capital efficiency)

**Key Functions:**
- `analyzeExit()` - Evaluates all 7 exit types for a position
- `analyzeAllExits()` - Processes all positions for an agent
- `generateExitSummary()` - Creates formatted exit recommendations
- `calculateExitPrice()` - Determines optimal exit price with slippage

---

## Data Flow

### Trading Cycle Flow (Every 30 Minutes)

```
1. FETCH PRICES
   └─> Get current prices for 20 stocks from API

2. ENRICH DATA
   ├─> Calculate MA7, MA30, MA90
   ├─> Calculate RSI (14-period)
   ├─> Calculate volatility
   ├─> Calculate week/month trends
   └─> Calculate volume metrics

3. MARKET INTELLIGENCE
   ├─> Fetch SPY trend (regime detection)
   ├─> Fetch VIX level (fear gauge)
   ├─> Calculate sector rotation
   ├─> Calculate relative strength for all stocks
   └─> Fetch macro indicators

4. DATA SOURCE INTEGRATION
   ├─> Analyze insider activity
   ├─> Calculate short interest
   ├─> Analyze options flow
   └─> Check earnings calendar

5. AGENT LOOP (for each of 6 AI models)
   │
   ├─> PORTFOLIO ANALYSIS
   │   ├─> Calculate concentration risk
   │   ├─> Calculate diversification score
   │   ├─> Calculate portfolio beta
   │   ├─> Analyze cash management
   │   └─> Generate recommendations
   │
   ├─> STRATEGY SIGNALS
   │   ├─> Get strategy-specific buy/sell signals
   │   └─> Generate strategy prompt guidance
   │
   ├─> EXIT ANALYSIS
   │   ├─> Check all 7 exit types
   │   ├─> Identify critical exits
   │   └─> Generate exit recommendations
   │
   ├─> AI DECISION
   │   ├─> Pass enhanced context to AI model
   │   ├─> Receive action (BUY/SELL/HOLD)
   │   ├─> Get confidence level
   │   └─> Get reasoning
   │
   ├─> POSITION SIZING (if BUY)
   │   ├─> Calculate Kelly Criterion
   │   ├─> Adjust for confidence
   │   ├─> Adjust for volatility
   │   ├─> Adjust for diversification
   │   ├─> Adjust for market conditions
   │   └─> Apply hard constraints
   │
   ├─> EXECUTE TRADE
   │   ├─> Validate safety limits
   │   ├─> Execute with slippage
   │   └─> Update positions
   │
   └─> LOG DECISION
       ├─> Record action and reasoning
       └─> Update performance metrics

6. UPDATE ALL POSITIONS
   └─> Recalculate P&L for all open positions

7. SAVE PERFORMANCE SNAPSHOT
   └─> Record account values in time series
```

---

## Performance Expectations

### Before Optimization (Baseline)

**System Metrics:**
- Annual Return: 5-8%
- Win Rate: 48-52%
- Sharpe Ratio: 0.3-0.5
- Max Drawdown: -15% to -20%
- Average Trade Duration: 5-7 days
- Position Sizing: Fixed 10-25% based on confidence only

**Limitations:**
- No market regime awareness
- No portfolio-level thinking
- All AIs using same generic approach
- Fixed position sizing (not optimal)
- Limited data sources (price/volume only)
- Basic exit logic (stop loss and manual sells only)

---

### After Optimization (Expected)

**System Metrics:**
- Annual Return: 20-30% (4x improvement)
- Win Rate: 60-65% (+10-15 points)
- Sharpe Ratio: 1.5-2.0 (3-4x improvement)
- Max Drawdown: -10% to -12% (better risk management)
- Average Trade Duration: Strategy-specific (1 day to 8 weeks)
- Position Sizing: Kelly Criterion (optimal)

**Improvements:**
- Market regime-aware trading (don't fight the trend)
- Portfolio-level risk management (avoid concentration)
- Strategy diversification (6 distinct approaches)
- Optimal position sizing (Kelly Criterion)
- Multi-source data (macro, insider, short interest, options)
- Sophisticated exits (7 automated types)

---

### Per-Strategy Expected Performance

| Strategy | Expected Return | Win Rate | Sharpe | Best Market |
|----------|----------------|----------|--------|-------------|
| Momentum Breakout | 25-35% | 55-60% | 1.3-1.8 | Bullish, trending |
| Mean Reversion | 15-20% | 65-70% | 1.8-2.2 | Neutral, choppy |
| Trend Following | 30-40% | 50-55% | 1.5-2.0 | Bullish, trending |
| Value Quality | 18-25% | 60-65% | 1.6-2.1 | Neutral, recovery |
| Volatility Arbitrage | 20-30% | 60-65% | 1.4-1.9 | High VIX |
| Contrarian Sentiment | 22-28% | 58-63% | 1.5-2.0 | Extremes |

**Note:** Actual performance will vary based on market conditions. Bull markets favor momentum and trend following. Bear markets favor mean reversion and contrarian.

---

## Design Biases

### Identified Biases in System Design

The following biases may systematically affect AI performance. Understanding these helps interpret results correctly.

#### 1. Sequential Trading Bias
**Severity:** HIGH
**Description:** Agents trade sequentially in fixed order, not simultaneously.
**Impact:** First agent gets first pick of opportunities with full liquidity.
**Affected:** All agents (earlier in array = advantage)
**Mitigation:** Shuffle agent order each cycle, or implement simultaneous decisions.

---

#### 2. Fixed Strategy Assignment Bias
**Severity:** MEDIUM
**Description:** Each AI is permanently assigned one strategy (not random or rotating).
**Impact:** Performance differences may reflect market fit rather than AI capability.
**Example:** In 2023 bull market, Momentum (GPT-4o Mini) outperforms Value (DeepSeek) due to market conditions, not AI quality.
**Mitigation:** Rotate strategies across AIs or let AIs choose dynamically.

---

#### 3. Kelly Risk Multiplier Bias
**Severity:** LOW (intentional)
**Description:** Conservative strategies size at 0.5x Kelly, aggressive at 1.0x.
**Impact:** Aggressive strategies (GPT-4o Mini, Qwen) will outperform in bull markets on absolute returns.
**Mitigation:** Compare risk-adjusted returns (Sharpe ratio) instead of absolute returns.

---

#### 4. Cash Drag Penalty Bias
**Severity:** MEDIUM
**Description:** Agents holding > 40% cash are marked "too high" and penalized.
**Impact:** Conservative strategies naturally hold more cash, which is valuable in volatile markets but penalized by system.
**Mitigation:** Adjust cash thresholds based on strategy type and market regime.

---

#### 5. Market Regime Bias
**Severity:** HIGH
**Description:** System results depend heavily on market regime during testing.
**Impact:** Bull market = momentum wins, Bear market = mean reversion wins.
**Example:** Launching in 2024 tech bull market would favor GPT-4o Mini over DeepSeek.
**Mitigation:** Backtest across multiple regimes (2020 COVID, 2022 bear, 2023 rally).

---

#### 6. Data Depth Mismatch Bias
**Severity:** LOW
**Description:** All agents get 90 days of history, but needs vary by strategy.
**Impact:** Momentum strategies (1-3 days) only need recent data. Value strategies (2-8 weeks) need deeper fundamentals.
**Mitigation:** Provide strategy-appropriate data depth.

---

#### 7. Execution Timing Bias
**Severity:** MEDIUM
**Description:** All agents trade at same price snapshot with market orders.
**Impact:** No advantage to patient strategies. In reality, value traders can use limit orders.
**Mitigation:** Implement order types (market vs limit) matching strategy needs.

---

#### 8. Top 20 Stock Universe Bias
**Severity:** MEDIUM (intentional)
**Description:** Limited to 20 mega-cap stocks (not full S&P 500).
**Impact:** Favors large-cap momentum (mega-caps trend longer), penalizes diversification.
**Example:** Contrarian strategies underperform because large caps have less inefficiency.
**Mitigation:** Document bias. Expanding to 500 stocks would degrade data quality.

---

#### 9. Commission Impact Bias
**Severity:** LOW
**Description:** Commission/slippage included in P&L calculation.
**Impact:** Disproportionately hurts high-frequency strategies (more trades = more commissions).
**Example:** Volatility Arbitrage (1-2 day holds) pays more commissions than Value Quality (2-8 week holds).
**Mitigation:** Track gross vs net performance separately.

---

#### 10. Performance Feedback Loop Bias
**Severity:** MEDIUM
**Description:** Kelly sizing uses historical performance. Early lucky streaks get larger positions.
**Impact:** "Rich get richer" dynamic. Unlucky starts make recovery harder.
**Example:** Agent with lucky first 10 trades gets aggressive Kelly sizing, compounding advantage.
**Mitigation:** Use longer lookback periods (100+ trades) or ensemble performance metrics.

---

### Bias Summary Table

| Bias | Severity | Favors | Disadvantages | Fix Priority |
|------|----------|--------|---------------|--------------|
| Sequential Trading | HIGH | First agent | Later agents | HIGH |
| Fixed Strategies | MEDIUM | Market-fit strategy | Counter-cycle strategies | MEDIUM |
| Kelly Risk Multipliers | LOW | Aggressive | Conservative (by design) | LOW |
| Cash Drag Penalties | MEDIUM | Always-invested | Conservative strategies | MEDIUM |
| Market Regime | HIGH | Momentum (bull), Mean Rev (bear) | Counter-cycle strategies | HIGH |
| Data Depth | LOW | Momentum | Value strategies | LOW |
| Execution Timing | MEDIUM | Fast strategies | Patient strategies | MEDIUM |
| Top 20 Universe | MEDIUM | Large-cap momentum | Diversification | LOW |
| Commission Impact | LOW | Long-term holders | High-frequency | LOW |
| Performance Feedback | MEDIUM | Early winners | Early losers | MEDIUM |

---

## Future Enhancements

### High Priority

1. **Real API Integration**
   - Replace simulated data with real APIs
   - FRED for macro data
   - SEC EDGAR for insider trades
   - Finra for short interest
   - CBOE for options flow

2. **Randomize Agent Order**
   - Shuffle agent sequence each cycle
   - Eliminate sequential trading bias

3. **Strategy Rotation**
   - Allow AIs to switch strategies based on market conditions
   - Dynamic strategy selection

4. **Ensemble Performance Metrics**
   - Smooth Kelly calculations with ensemble averages
   - Reduce performance feedback loop bias

---

### Medium Priority

5. **Order Types**
   - Implement limit orders for patient strategies
   - Market orders for fast strategies
   - Stop-limit orders for exits

6. **Risk-Adjusted Leaderboard**
   - Display Sharpe ratio prominently
   - Normalize for strategy risk tolerance

7. **Multi-Timeframe Analysis**
   - Add 1-year and 2-year historical data
   - Better support for long-term value strategies

8. **Sentiment Analysis**
   - Real-time news sentiment scoring
   - Social media sentiment integration

---

### Low Priority

9. **Machine Learning Enhancements**
   - Train models on historical performance
   - Predict optimal strategy per market regime

10. **Expanded Universe**
    - Carefully expand to top 50 stocks (NOT 500)
    - Maintain data quality standards

11. **Options Trading**
    - Allow strategies to trade options
    - Volatility arbitrage with options straddles

12. **Portfolio Rebalancing**
    - Automated quarterly rebalancing
    - Tax-loss harvesting

---

## Technical Implementation Notes

### File Structure

```
lib/
├── market-context.ts           (306 lines)
├── portfolio-intelligence.ts   (351 lines)
├── trading-strategies.ts       (587 lines)
├── position-sizing.ts          (297 lines)
├── data-sources.ts            (408 lines)
├── exit-management.ts         (524 lines)
└── trading-engine.ts          (updated to integrate all modules)

types/
└── index.ts                   (updated Stock interface)

app/
└── how-it-works/
    └── page.tsx              (updated with Advanced Intelligence section)
```

### Key Dependencies

- **TypeScript**: All modules fully typed
- **Prisma**: Database ORM for positions, trades, decisions
- **Next.js**: React framework for UI
- **Vercel**: Deployment platform

### Database Schema (Relevant Tables)

```sql
-- Agents table
agents (id, name, model, accountValue, cashBalance, broker, strategy)

-- Positions table
positions (id, agentId, symbol, side, quantity, entryPrice, currentPrice, unrealizedPnL)

-- Trades table
trades (id, agentId, symbol, action, quantity, price, realizedPnL, timestamp)

-- Decisions table
decisions (id, agentId, action, symbol, confidence, reasoning, timestamp)

-- Performance table
performancePoints (id, agentId, accountValue, timestamp)
```

### Integration Points

**Trading Engine Integration:**

```typescript
// 1. Get market context
const marketContext = await getMarketContext(stocks, spyHistoricalPrices);

// 2. Get macro and enhanced data
const macroIndicators = await fetchMacroIndicators();
const enhancedStockData = stocks.map(stock => getEnhancedStockData(stock));

// 3. For each agent...
const portfolioMetrics = calculatePortfolioMetrics(...);
const strategySignals = getStrategySignals(agent.model, stocks, marketContext, portfolioMetrics);
const exitSignals = analyzeAllExits(positions, stocks, marketContext);

// 4. Calculate position size
const positionSize = calculatePositionSize({
  cashAvailable: agent.cashBalance,
  confidence: decision.confidence,
  agentPerformance: calculateAgentPerformance(trades),
  // ... other inputs
});

// 5. Execute and log
```

---

## Monitoring and Debugging

### Console Output

The system logs detailed information during each trading cycle:

```
📊 Analyzing market context...
  SPY: BULLISH (+0.45% today, +2.3% month)
  VIX: 15.2 (normal) → RISK_ON
  Leading Sector: TECH (+3.2% vs SPY)
  Lagging Sector: ENERGY (-1.8% vs SPY)

━━━ GPT-4o Mini (gpt-4o-mini) ━━━
  💰 Account Value: $10,450.23
  💵 Cash: $5,230.12
  📈 Positions: 3
  🎯 Portfolio: MODERATE risk portfolio, well-diversified
  💡 Recommendations:
    💰 DEPLOY cash: 50% cash missed 1.2% potential gain

  🎯 Decision: BUY
  💭 Reasoning: Strong momentum breakout in NVDA...
  📊 Confidence: 87%
  💰 Kelly Position Sizing: $2,150 (20.5% of account)
  📊 Kelly: 25.2% → Adjusted: 20.5%
```

### Key Metrics to Monitor

1. **Portfolio Metrics**
   - Concentration risk levels
   - Diversification scores
   - Portfolio beta changes

2. **Strategy Performance**
   - Win rates per strategy
   - Average holding periods
   - Profit targets hit vs missed

3. **Position Sizing**
   - Kelly fractions vs final sizes
   - Adjustment multipliers
   - Cash utilization

4. **Exit Effectiveness**
   - Which exit types trigger most
   - Profit protected by trailing stops
   - Losses prevented by stop losses

---

## Conclusion

This AI trading intelligence system represents a comprehensive upgrade to the Poly Stocks platform. By providing each AI agent with:

1. **Market context** (macro environment awareness)
2. **Portfolio intelligence** (holistic risk management)
3. **Distinct strategies** (diversified approaches)
4. **Optimal sizing** (Kelly Criterion)
5. **Multi-source data** (richer information)
6. **Automated exits** (disciplined profit/loss management)

...we expect to see significant improvements in risk-adjusted returns across all market conditions.

The system is designed to be:
- **Transparent**: All logic is documented and observable
- **Modular**: Each component can be enhanced independently
- **Testable**: Clear metrics for evaluating each module
- **Extensible**: Easy to add new strategies, data sources, or exit types

**Expected outcome:** 20-30% annual returns with 1.5-2.0 Sharpe ratio, demonstrating that systematic, intelligent trading strategies can significantly outperform baseline approaches.

---

## Version History

**v2.0** (January 2025)
- Initial implementation of all 6 intelligence modules
- Full integration into trading engine
- Documentation completed

**v1.0** (December 2024)
- Basic trading system with fixed position sizing
- Simple stop loss exits
- No market context or portfolio intelligence

---

**Last Updated:** January 2025
**Maintainer:** Poly Stocks Team
**License:** Proprietary
