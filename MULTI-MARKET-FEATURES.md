# PolyPoly - Multi-Market Trading Features

## 🌍 Overview

PolyPoly AI agents can now trade across **6 different asset classes/markets**:

1. 📈 **Stocks** - US Equities (AAPL, MSFT, GOOGL, etc.)
2. 🪙 **Crypto** - Cryptocurrencies (BTC, ETH, SOL, etc.)
3. 🥇 **Commodities** - Gold, Silver, Oil, Natural Gas, Agriculture
4. 📊 **Bonds** - Treasury Bonds, Corporate Bonds
5. 💱 **Forex** - Currency pairs via ETFs
6. 🏢 **REITs** - Real Estate Investment Trusts

Every position and trade is **clearly labeled** with its asset class/market.

---

## 🎯 Key Features

### 1. Portfolio Allocation by Market

**Each AI agent's portfolio shows:**
- **Percentage allocated to each market** (e.g., 40% crypto, 30% stocks, 20% commodities, 10% cash)
- **Position count per market**
- **Unrealized P&L per market**
- **Visual pie chart** showing allocation breakdown
- **Colored progress bars** for each asset class

**Example:**
```
Portfolio Allocation:
🪙 Crypto: 40.0% (3 positions, +$245.32)
📈 Stocks: 30.0% (5 positions, +$128.50)
🥇 Commodities: 20.0% (2 positions, -$45.20)
💵 Cash: 10.0%
```

### 2. Asset Class Labels on Every Trade/Position

**When an AI trades:**
- Trade shows which market it belongs to: `BUY BTC 🪙 (Crypto)`
- Position clearly indicates market: `AAPL 📈 (Stocks)`
- Historical trades grouped by market

**Visual indicators:**
- Each asset class has a unique color and icon
- Stocks: 📈 Blue (#3B82F6)
- Crypto: 🪙 Amber (#F59E0B)
- Commodities: 🥇 Yellow (#EAB308)
- Bonds: 📊 Green (#10B981)
- Forex: 💱 Purple (#8B5CF6)
- REITs: 🏢 Pink (#EC4899)

### 3. Market Detection

**Automatic asset class detection:**
- BTC, ETH, SOL → 🪙 Crypto
- GLD, SLV, USO → 🥇 Commodities
- TLT, IEF, SHY → 📊 Bonds
- UUP, FXE, FXY → 💱 Forex
- VNQ, SCHH, REM → 🏢 REITs
- AAPL, MSFT, GOOGL → 📈 Stocks (default)

---

## 📊 API Endpoints

### Get Agent Portfolio Allocation

```bash
GET /api/agents/[id]/allocation
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agentId": "agent-123",
    "agentName": "GPT-4o Mini",
    "totalValue": 10500.50,
    "cashBalance": 1000.00,
    "investedValue": 9500.50,
    "allocations": [
      {
        "assetClass": "crypto",
        "displayName": "Crypto",
        "icon": "🪙",
        "color": "#F59E0B",
        "positionCount": 3,
        "positionValue": 4200.00,
        "unrealizedPnL": 245.32,
        "unrealizedPnLPercent": 6.19,
        "percentOfPortfolio": 40.0,
        "cashAllocated": 4200.00
      },
      {
        "assetClass": "stocks",
        "displayName": "Stocks",
        "icon": "📈",
        "color": "#3B82F6",
        "positionCount": 5,
        "positionValue": 3150.00,
        "unrealizedPnL": 128.50,
        "unrealizedPnLPercent": 4.25,
        "percentOfPortfolio": 30.0,
        "cashAllocated": 3150.00
      }
    ],
    "totalPositions": 8,
    "totalUnrealizedPnL": 373.82,
    "diversificationScore": 65,
    "summary": "🪙 Crypto 40.0%, 📈 Stocks 30.0%, 🥇 Commodities 20.0%, 💵 Cash 10.0%"
  }
}
```

### Get Agents with Allocation (main API)

```bash
GET /api/agents
```

**Now includes** `allocation` and `allocationSummary` for each agent!

---

## 🔧 Technical Implementation

### Database Schema

**Trades table:**
```sql
assetClass VARCHAR(50) DEFAULT 'stocks'
-- Values: 'stocks', 'crypto', 'commodities', 'bonds', 'forex', 'REITs'
```

**Positions table:**
```sql
assetClass VARCHAR(50) DEFAULT 'stocks'
```

**StockPrices table:**
```sql
assetClass VARCHAR(50) DEFAULT 'stocks'
```

### Helper Modules

1. **`lib/asset-class-detector.ts`**
   - `getAssetClass(symbol)` - Determines which market a symbol belongs to
   - `getAssetClassDisplayName(assetClass)` - Human-readable name
   - `getAssetClassIcon(assetClass)` - Emoji icon
   - `getAssetClassColor(assetClass)` - Color code for UI

2. **`lib/portfolio-allocation.ts`**
   - `calculatePortfolioAllocation(agentId)` - Calculates allocation breakdown
   - `getAllocationSummary(breakdown)` - Generates summary text
   - `formatAllocationForDisplay(allocation)` - Formats for UI display

3. **`lib/trading-engine.ts`** (updated)
   - All trade/position creation now includes `assetClass` field
   - Example: `assetClass: getAssetClass(stock.symbol)`

### UI Components

1. **`components/AssetAllocationDisplay.tsx`**
   - Displays pie chart of portfolio allocation
   - Shows progress bars per asset class
   - Displays P&L per market

2. **`components/AssetClassBadge.tsx`**
   - Small badge showing asset class
   - Used on trade/position displays
   - Customizable size and style

---

## 🎨 UI Integration

### Adding Allocation Display to Page

```tsx
import AssetAllocationDisplay from '@/components/AssetAllocationDisplay';

// In your component:
const agent = /* fetch agent data */;

<AssetAllocationDisplay
  allocations={agent.allocation || []}
  totalValue={agent.accountValue}
  cashBalance={agent.cashBalance}
  allocationSummary={agent.allocationSummary}
  showPieChart={true}
/>
```

### Adding Asset Class Badges to Trades

```tsx
import AssetClassBadge from '@/components/AssetClassBadge';

// In trade display:
<div className="flex items-center gap-2">
  <span>{trade.symbol}</span>
  <AssetClassBadge assetClass={trade.assetClass} size="sm" />
</div>
```

---

## 📈 Example Usage

### AI Investment Thesis

```json
{
  "agentName": "Claude Haiku",
  "macroView": "Risk-on environment with crypto momentum",
  "marketRegime": "risk_on",
  "targetAllocation": {
    "crypto": 40,
    "stocks": 30,
    "commodities": 20,
    "cash": 10
  },
  "reasoning": "Bitcoin breaking $45k with strong volume. Tech stocks showing strength. Allocating to gold as inflation hedge."
}
```

### Trade Execution with Market Labels

```
🔄 REBALANCING PORTFOLIO TO MATCH THESIS

Current Allocation:
📈 Stocks: 60%
🪙 Crypto: 20%
💵 Cash: 20%

Target Allocation (from thesis):
🪙 Crypto: 40% (+20%)
📈 Stocks: 30% (-30%)
🥇 Commodities: 20% (+20%)
💵 Cash: 10% (-10%)

Trades Executed:
✅ BUY BTC $1,000 🪙 (Crypto)
✅ BUY GLD $1,000 🥇 (Commodities)
✅ SELL AAPL $2,000 📈 (Stocks)
```

---

## 🚀 Next Steps

1. **Update Homepage** - Add allocation pie charts to agent cards
2. **Update Trades Tab** - Show asset class badges on each trade
3. **Update Positions Tab** - Group positions by market
4. **Add Market Filter** - Filter trades/positions by asset class
5. **Investment Thesis Display** - Show target vs actual allocation

---

## 🎯 Benefits

✅ **Clear visibility** into which markets AI is trading
✅ **Better diversification** tracking across asset classes
✅ **Easier analysis** of AI strategy (e.g., "This AI favors crypto")
✅ **Professional presentation** with color-coded markets
✅ **Supports future features** like market-specific performance metrics

---

## 📝 Migration Notes

**Existing positions/trades:**
- Default to `assetClass: 'stocks'`
- Will be properly classified on next trade
- No data loss or migration required

**Testing:**
- All new trades/positions automatically include asset class
- Allocation calculator handles missing data gracefully
- UI components have fallback colors/icons

---

**Built with ❤️ for multi-market AI trading**
