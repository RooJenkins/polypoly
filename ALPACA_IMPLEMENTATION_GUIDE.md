# 🚀 Alpaca Real Trading Implementation Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Phase 1: Get Alpaca API Keys](#phase-1-get-alpaca-api-keys)
3. [Phase 2: Paper Trading Setup](#phase-2-paper-trading-setup)
4. [Phase 3: Safety Testing](#phase-3-safety-testing)
5. [Phase 4: Go Live](#phase-4-go-live)
6. [Safety Features](#safety-features)
7. [Troubleshooting](#troubleshooting)
8. [API Reference](#api-reference)

---

## Overview

Your PolyStocks system now supports **three trading modes**:

| Mode | Description | Risk | Use Case |
|------|-------------|------|----------|
| **`simulated`** | Fake trades in database only | ✅ Zero | Current setup, development |
| **`paper`** | Alpaca paper trading (fake money on their platform) | ✅ Zero | Testing real API integration |
| **`live`** | Real money trading with Alpaca | ⚠️ **REAL MONEY AT RISK** | Production use |

**Current Status**: You're in `simulated` mode. Follow this guide to enable real trading.

---

## Phase 1: Get Alpaca API Keys

### Step 1.1: Create Alpaca Account

1. Go to **https://alpaca.markets**
2. Click **"Sign Up"** (top right)
3. Complete account creation:
   - Email & password
   - Personal information (required by SEC regulations)
   - Identity verification (driver's license/passport)

   ⏱️ **Approval time**: Usually 1-2 business days

### Step 1.2: Get Paper Trading Keys

Once approved:

1. Log in to https://app.alpaca.markets
2. Click **"Paper Trading"** in left sidebar
3. Go to **"API Keys"** tab
4. Click **"Generate New Key"**
5. **Save both keys immediately**:
   - **API Key ID**: `PKxxxxxxxxxxxxxxxxxx` (starts with `PK`)
   - **Secret Key**: `xxxxxxxxxxxxxxxxxxxxxxxx` (show once only!)

⚠️ **IMPORTANT**: The secret key is shown ONLY ONCE. Save it immediately!

### Step 1.3: Add Keys to .env

Edit `/Users/roo/polystocks/.env`:

```bash
# Change these values:
ALPACA_API_KEY="PKxxxxxxxxxxxxxxxxxx"        # Your Paper Key ID
ALPACA_SECRET_KEY="your_secret_key_here"    # Your Secret Key
ALPACA_PAPER_TRADING="true"                 # Keep as "true" for paper trading
```

---

## Phase 2: Paper Trading Setup

### Step 2.1: Verify Keys Work

Run this test script (I'll create it next):

```bash
npx tsx scripts/test-alpaca-connection.ts
```

Expected output:
```
✅ Connected to Alpaca (PAPER mode)
📊 Account Status:
   Cash: $100,000.00
   Buying Power: $400,000.00
   Portfolio Value: $100,000.00
   Day Trade Count: 0
   Pattern Day Trader: false
```

### Step 2.2: Enable Paper Trading Mode

Edit `.env`:

```bash
TRADING_MODE="paper"  # Changed from "simulated"
```

### Step 2.3: Run First Paper Trade

```bash
npx tsx scripts/force-trade.ts
```

Watch the logs:
```
🚀 Forcing trading cycle...
📊 [Alpaca] Agent Claude Sonnet buying 5 shares of AAPL
✅ [Alpaca] Order placed: { id: '...', status: 'new', ... }
✅ [Alpaca] Order filled: { executedPrice: 175.23, executedQuantity: 5, ... }
```

### Step 2.4: Verify on Alpaca Dashboard

1. Go to https://app.alpaca.markets
2. Click **"Paper Trading"** → **"Orders"**
3. You should see your AI agent's orders!

---

## Phase 3: Safety Testing

### Test 1: Daily Loss Limit

Simulate a bad day by manually setting agent losses in database:

```sql
-- This should trigger safety halt
UPDATE "Agent" SET accountValue = 75 WHERE name = 'Claude Sonnet';  -- Lost $25 (> $20 limit)
```

Run trade cycle - should reject:
```bash
npx tsx scripts/force-trade.ts
```

Expected:
```
⚠️ [SAFETY] CRITICAL: Claude Sonnet - has lost $25.00 today (limit: $20)
```

### Test 2: PDT Rule Enforcement

Make 3 day trades in same day (buy + sell same stock):

1. Buy AAPL → Sell AAPL (day trade #1)
2. Buy NVDA → Sell NVDA (day trade #2)
3. Buy MSFT → Sell MSFT (day trade #3)
4. Try 4th trade → Should be blocked

Expected:
```
⚠️ [SAFETY] CRITICAL: Agent has made 3 day trades in last 5 days (PDT limit: 3)
```

### Test 3: Position Size Limit

Try to buy more than $50 in one trade:

Expected:
```
⚠️ [SAFETY] WARNING: Trade value $75.00 exceeds limit of $50
```

### Step 3.4: Run Safety Status Check

```bash
npx tsx scripts/check-safety-status.ts
```

Expected output:
```
📊 System Safety Status

Total Daily P&L: +$12.50
System Status: ✅ OK
Recent API Errors: 0

Agent Statuses:
  Claude Sonnet 4.5:   +$5.20  (2 day trades)  ✅ OK
  GPT-4:               -$2.30  (1 day trade)   ✅ OK
  Gemini Pro:          +$8.10  (0 day trades)  ✅ OK
  Grok:                +$1.50  (0 day trades)  ✅ OK
  DeepSeek:            +$0.00  (0 day trades)  ✅ OK
  Qwen:                +$0.00  (0 day trades)  ✅ OK
```

---

## Phase 4: Go Live 💰

### ⚠️ CRITICAL CHECKLIST - Read Carefully ⚠️

Before going live with REAL MONEY, verify:

- [ ] Paper trading worked for at least 1 week
- [ ] All safety limits triggered correctly in tests
- [ ] You understand you could lose ALL money ($600)
- [ ] You're comfortable with this risk
- [ ] You have reviewed all AI agent logic
- [ ] You've checked recent agent performance
- [ ] No agents are performing terribly in paper trading

### Step 4.1: Get Live API Keys

1. Go to https://app.alpaca.markets
2. Click **"Live Trading"** in left sidebar
3. Complete additional compliance forms (required by SEC)
4. Fund your account:
   - Click **"Transfer"**
   - ACH transfer: **$600** (or your desired amount)
   - ⏱️ Takes 3-5 business days
5. Once funded, go to **"API Keys"** tab
6. Generate **Live** API keys (starts with `AK`, not `PK`)

### Step 4.2: Update .env for Live Trading

⚠️ **FINAL WARNING**: This will use REAL MONEY!

```bash
# Live Trading Configuration
TRADING_MODE="live"                           # ⚠️ REAL MONEY MODE
ALPACA_API_KEY="AKxxxxxxxxxxxxxxxxxx"         # Live Key (starts with AK)
ALPACA_SECRET_KEY="your_live_secret_key"     # Live Secret Key
ALPACA_PAPER_TRADING="false"                 # ⚠️ FALSE = REAL MONEY
```

### Step 4.3: Restart Trading Bot

```bash
# Stop current bot
pkill -f "trading-bot.ts"

# Start with new config
npx tsx scripts/trading-bot.ts
```

### Step 4.4: Monitor Closely

For the first week, check EVERY DAY:

1. Daily P&L report
2. Safety status
3. Agent decisions
4. Order fills on Alpaca dashboard

```bash
# Run this daily
npx tsx scripts/check-data.ts
npx tsx scripts/check-safety-status.ts
```

---

## Safety Features

### Built-in Protections

| Protection | Limit | What Happens |
|------------|-------|--------------|
| Single Trade Value | $50 | Trade rejected |
| Agent Daily Loss | $20 | Agent halted for day |
| Agent Account Max | $100 | Buy orders rejected |
| System Daily Loss | $100 | ALL agents halted |
| Day Trade Count | 3 per 5 days | Buy orders rejected (PDT rule) |
| API Error Count | 5 consecutive | System halted |

### Modifying Safety Limits

Edit `/Users/roo/polystocks/lib/safety-limits.ts`:

```typescript
export const SAFETY_LIMITS = {
  MAX_POSITION_PER_AGENT: 100,     // Change to 200 for $200 per agent
  MAX_SINGLE_TRADE_VALUE: 50,      // Change to 100 for $100 max trade
  MAX_DAILY_LOSS_PER_AGENT: 20,    // Change to 50 for $50 daily loss
  // ... etc
};
```

### Emergency Stop

If something goes wrong:

```bash
# Option 1: Stop the bot process
pkill -f "trading-bot.ts"

# Option 2: Switch back to simulated mode
# Edit .env:
TRADING_MODE="simulated"

# Option 3: Cancel all open orders
npx tsx scripts/cancel-all-orders.ts
```

---

## Troubleshooting

### Issue: "ALPACA_API_KEY must be set"

**Solution**: Make sure you added keys to `.env` correctly (no quotes, no spaces):

```bash
ALPACA_API_KEY=PKxxxxxxxxxxxxxxxxxx
ALPACA_SECRET_KEY=xxxxxxxxxxxxxxxx
```

### Issue: "401 Unauthorized"

**Solution**:
- Check if keys are correct (copy-paste again)
- Paper keys start with `PK`, live keys start with `AK`
- Make sure `ALPACA_PAPER_TRADING` matches your key type

### Issue: "Insufficient buying power"

**Solution**:
- Paper account starts with $100k - shouldn't happen
- Live account: Make sure you funded it
- Check current positions aren't using all cash

### Issue: "Order rejected: market closed"

**Solution**:
- Market hours: 9:30am-4:00pm ET, Monday-Friday
- Your realistic-execution module already checks this
- Orders placed outside hours will be rejected

### Issue: "Pattern Day Trader violation"

**Solution**:
- You can only make 3 day trades per 5 business days with < $25k
- Solution 1: Wait 5 days for counter to reset
- Solution 2: Fund account to $25k (removes PDT rule)
- Solution 3: Use cash account (not margin) - no PDT rule
- Solution 4: Wait until 2026 when rule changes to $2k minimum

### Issue: Orders not filling

**Solution**:
- Check Alpaca dashboard: https://app.alpaca.markets/trading
- Market orders should fill in < 5 seconds
- If `waitForOrderFill` timeout (30s), check:
  - Is market open?
  - Is stock tradable? (check if suspended)
  - Is there enough liquidity? (stick to top 20 stocks)

---

## API Reference

### Check Account Status

```bash
npx tsx scripts/get-alpaca-account.ts
```

### Check Current Positions

```bash
npx tsx scripts/get-alpaca-positions.ts
```

### Cancel All Orders

```bash
npx tsx scripts/cancel-all-orders.ts
```

### Force a Trading Cycle

```bash
npx tsx scripts/force-trade.ts
```

### Check Safety Status

```bash
npx tsx scripts/check-safety-status.ts
```

---

## Next Steps

1. **Now**: Sign up for Alpaca account (https://alpaca.markets)
2. **Day 1-2**: Wait for approval, get paper API keys
3. **Week 1**: Test paper trading extensively
4. **Week 2**: Verify safety limits work
5. **Week 3**: Get live keys, fund $600
6. **Week 4+**: Go live, monitor daily

---

## Support & Resources

- **Alpaca Docs**: https://alpaca.markets/docs/
- **Alpaca Support**: support@alpaca.markets
- **Paper Trading Dashboard**: https://app.alpaca.markets/paper
- **Live Trading Dashboard**: https://app.alpaca.markets/trading

---

## Legal Disclaimer

⚠️ **IMPORTANT**:

- Trading stocks involves risk of loss
- Past performance does not guarantee future results
- AI agents can and will make mistakes
- You could lose all $600 (or more if margin is enabled)
- This is experimental software - use at your own risk
- Not financial advice
- Consult a licensed financial advisor before investing

**By enabling live trading, you acknowledge all risks and take full responsibility for any losses.**

---

**Ready to get started? Sign up for Alpaca: https://alpaca.markets**
