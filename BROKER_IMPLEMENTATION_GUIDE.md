# Broker Implementation Guide

## Current Status

### ✅ Implemented & Active Brokers
- **Alpaca Markets** - Active for top 3 AI agents (DeepSeek, GPT-4o, Claude)
- **Simulation** - Active for remaining agents (Grok, Gemini, Qwen, etc)

### ✅ Implemented But Not Used
- **Tradier** - Fully implemented, available if needed
- **Schwab** - Fully implemented, available if needed
- **Interactive Brokers** - Fully implemented, available if needed
- **Webull** - Fully implemented, available if needed

### 📋 Current Configuration
```
DeepSeek      → Alpaca Paper Account #1
GPT-4o Mini   → Alpaca Paper Account #2
Claude Haiku  → Alpaca Paper Account #3
Grok          → Simulation
Gemini Flash  → Simulation
Qwen          → Simulation
```

---

## Quick Setup Guide: 3 Alpaca Paper Accounts

### Step 1: Create Additional Paper Accounts

You already have one Alpaca paper account. Create 2 more:

1. Go to https://app.alpaca.markets/paper/dashboard
2. Click your **paper account number** in the upper left corner
3. Select **"Open New Paper Account"**
4. Repeat to create a third account

You should now have 3 paper trading accounts, each with separate API keys.

### Step 2: Generate API Keys for Each Account

For each of the 3 paper accounts:

1. Switch to that account in the dashboard
2. Go to API Keys section
3. Generate new API keys (if not already done)
4. Save the API Key ID and Secret Key

### Step 3: Set Environment Variables

You'll need 3 sets of Alpaca credentials - one for each agent:

```bash
# DeepSeek's Alpaca Account (Paper #1) - ALREADY SET
ALPACA_API_KEY=your_existing_key
ALPACA_SECRET_KEY=your_existing_secret
ALPACA_PAPER=true

# GPT-4o Mini's Alpaca Account (Paper #2) - NEW
ALPACA_API_KEY_2=pk_paper_xxxxxxxx
ALPACA_SECRET_KEY_2=xxxxxxxx

# Claude Haiku's Alpaca Account (Paper #3) - NEW
ALPACA_API_KEY_3=pk_paper_xxxxxxxx
ALPACA_SECRET_KEY_3=xxxxxxxx
```

Set these in Fly.io:

```bash
fly secrets set \
  ALPACA_API_KEY_2=pk_paper_xxx \
  ALPACA_SECRET_KEY_2=xxx \
  ALPACA_API_KEY_3=pk_paper_xxx \
  ALPACA_SECRET_KEY_3=xxx \
  --app polystocks-frontend
```

### Step 4: Update Alpaca Broker Factory

The `createAlpacaBroker()` function needs to be updated to support multiple accounts. We'll need to modify it to accept an account number parameter and use the appropriate credentials.

**Current limitation:** The existing Alpaca broker implementation uses a single set of credentials. We need to update it to support agent-specific credentials.

**Two options:**

**Option A (Simpler):** Modify the broker to check which agent is calling and use the appropriate credentials:

```typescript
export function createAlpacaBroker(agentId?: string): AlpacaBroker {
  // Determine which credentials to use based on agent
  let apiKey, secretKey;

  // Query database to get agent name from agentId
  // Then map to appropriate credentials

  // For now, use env vars
  const credentials = getAlpacaCredentialsForAgent(agentId);

  return new AlpacaBroker({
    apiKey: credentials.apiKey,
    secretKey: credentials.secretKey,
    paper: true
  });
}
```

**Option B (Better):** Store broker credentials in the database per agent and load them at runtime. This is more scalable but requires a schema change.

### Step 5: Run Database Migration

Once the credentials are set:

```bash
fly postgres connect --app polystocks-db -d polystocks_trading_bot < add-broker-field.sql
```

This will assign:
- DeepSeek → alpaca
- GPT-4o Mini → alpaca
- Claude Haiku → alpaca
- All others → simulation

---

## Priority Order for Implementation

### 1. Charles Schwab (Priority: HIGH)
**Difficulty:** Medium
**API:** schwab-py (Python), REST API available
**Status:** Live API available (replaced TD Ameritrade)

**Key Requirements:**
- Register at https://developer.schwab.com/
- OAuth 2.0 authentication
- Requires app registration and approval
- Python SDK available: `schwab-py`

**Implementation Notes:**
- Similar REST API structure to TD Ameritrade
- Use fetch() for HTTP requests (like Tradier)
- OAuth flow needs initial setup
- Token refresh required

**Environment Variables Needed:**
```
SCHWAB_CLIENT_ID=your_client_id
SCHWAB_CLIENT_SECRET=your_client_secret
SCHWAB_ACCOUNT_ID=your_account_id
SCHWAB_REDIRECT_URI=your_redirect_uri
```

**API Endpoints:**
- Base URL: `https://api.schwabapi.com`
- Accounts: `/trader/v1/accounts`
- Orders: `/trader/v1/accounts/{accountId}/orders`
- Quotes: `/marketdata/v1/quotes`

---

### 2. Interactive Brokers (Priority: MEDIUM)
**Difficulty:** HIGH
**API:** Client Portal REST API
**Status:** Available but complex

**Key Requirements:**
- Requires IB account
- Client Portal Gateway must run locally
- Two-tiered authentication
- WebSocket for streaming data

**Implementation Notes:**
- Most complex broker integration
- Requires localhost gateway process
- Needs session management
- Two authentication levels

**Environment Variables Needed:**
```
IBKR_ACCOUNT_ID=your_account_id
IBKR_GATEWAY_URL=https://localhost:5000
```

**Special Setup:**
1. Download and run Client Portal Gateway
2. Authenticate via web interface
3. Keep gateway running for API access

**API Endpoints:**
- Base URL: `https://localhost:5000/v1/api`
- Portfolio: `/portfolio/accounts`
- Orders: `/iserver/account/{accountId}/orders`
- Quotes: `/iserver/marketdata/snapshot`

---

### 3. Webull (Priority: LOW)
**Difficulty:** MEDIUM
**API:** Webull OpenAPI
**Status:** Available but requires application approval

**Key Requirements:**
- Apply for API access (1-2 business days)
- Must have active Webull trading account
- Application review required

**Implementation Notes:**
- Clean REST API
- Similar to Tradier in complexity
- Requires API application approval

**Environment Variables Needed:**
```
WEBULL_APP_KEY=your_app_key
WEBULL_APP_SECRET=your_app_secret
WEBULL_ACCOUNT_ID=your_account_id
```

**API Endpoints:**
- Base URL: `https://ustrade-openapi.webull.com`
- Account: `/api/v1/account`
- Orders: `/api/v1/trade/order`
- Quotes: `/api/v1/quote`

---

## Implementation Template

Use this template for each new broker (based on Tradier):

```typescript
/**
 * [Broker Name] Broker Implementation
 *
 * Implements the IBroker interface for [Broker Name]
 * API Docs: [documentation URL]
 */

import type {
  IBroker,
  ExecutionResult,
  BrokerAccount,
  BrokerPosition
} from './types';

export class [BrokerName]Broker implements IBroker {
  public readonly name = '[Broker Display Name]';
  private [authField]: string;
  private accountId: string;
  private sandbox: boolean;
  private baseUrl: string;

  constructor(config: {
    [authField]: string;
    accountId: string;
    sandbox?: boolean;
  }) {
    this.[authField] = config.[authField];
    this.accountId = config.accountId;
    this.sandbox = config.sandbox ?? true;
    this.baseUrl = this.sandbox
      ? '[sandbox URL]'
      : '[production URL]';
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `[Auth Scheme] ${this.[authField]}`,
      'Accept': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`[Broker] API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async executeBuy(symbol: string, quantity: number, agentId: string): Promise<ExecutionResult> {
    // Implement buy logic (see tradier-broker.ts for reference)
  }

  async executeSell(symbol: string, quantity: number, agentId: string): Promise<ExecutionResult> {
    // Implement sell logic (see tradier-broker.ts for reference)
  }

  async getAccount(): Promise<BrokerAccount> {
    // Implement account fetching (see tradier-broker.ts for reference)
  }

  async isMarketOpen(): Promise<boolean> {
    // Implement market status check
  }

  async cancelAllOrders(): Promise<void> {
    // Implement order cancellation
  }
}

/**
 * Factory function to create [Broker] instance
 */
export function create[BrokerName]Broker(): [BrokerName]Broker {
  const [authField] = process.env.[BROKER]_[AUTH_FIELD];
  const accountId = process.env.[BROKER]_ACCOUNT_ID;
  const sandbox = process.env.[BROKER]_SANDBOX !== 'false';

  if (![authField] || !accountId) {
    throw new Error('[BROKER]_[AUTH_FIELD] and [BROKER]_ACCOUNT_ID must be set in environment variables');
  }

  return new [BrokerName]Broker({
    [authField],
    accountId,
    sandbox,
  });
}
```

---

## Steps to Add a New Broker

### 1. Create Broker File
Create `lib/brokers/[broker]-broker.ts` using the template above

### 2. Update Types
The `BrokerType` in `lib/brokers/types.ts` already includes all brokers

### 3. Update Broker Factory
In `lib/brokers/broker-factory.ts`:
```typescript
// Import
import { [BrokerName]Broker, create[BrokerName]Broker } from './[broker]-broker';

// Add case in switch statement
case '[broker]':
  broker = create[BrokerName]Broker();
  break;

// Update available brokers list
export function getAvailableBrokers(): BrokerType[] {
  return ['alpaca', 'tradier', '[newbroker]', 'simulation'];
}
```

### 4. Update Index Exports
In `lib/brokers/index.ts`:
```typescript
export { [BrokerName]Broker, create[BrokerName]Broker } from './[broker]-broker';
```

### 5. Set Environment Variables
Add to `.env`:
```
[BROKER]_[AUTH_FIELDS]=...
```

Add to Fly secrets:
```bash
fly secrets set [BROKER]_[AUTH_FIELD]=xxx --app polystocks-frontend
```

### 6. Update Database Migration
Update `add-broker-field.sql` to assign broker to agent:
```sql
UPDATE "Agent"
SET "broker" = '[broker-name]'
WHERE "name" = '[Agent Name]';
```

### 7. Test the Integration
```bash
# Run locally
npm run dev

# Check logs for successful sync
curl http://localhost:3000/api/alpaca/sync
```

---

## Testing Checklist

For each broker implementation:

- [ ] Can authenticate successfully
- [ ] Can fetch account information
- [ ] Can place buy orders (paper trading first!)
- [ ] Can place sell orders
- [ ] Can cancel orders
- [ ] Can check market status
- [ ] Error handling works correctly
- [ ] Logging is comprehensive
- [ ] Environment variables are documented

---

## Current Agent→Broker Mapping

Update this in `add-broker-field.sql`:

```sql
UPDATE "Agent"
SET "broker" = CASE
  WHEN "name" = 'DeepSeek' THEN 'alpaca'           -- ✅ LIVE
  WHEN "name" = 'GPT-4o Mini' THEN 'alpaca'        -- ✅ LIVE
  WHEN "name" = 'Claude Haiku' THEN 'alpaca'       -- ✅ LIVE
  WHEN "name" = 'Grok' THEN 'simulation'           -- ✅ SIMULATION
  WHEN "name" = 'Gemini Flash' THEN 'simulation'   -- ✅ SIMULATION
  WHEN "name" = 'Qwen' THEN 'simulation'           -- ✅ SIMULATION
  ELSE 'simulation'
END;
```

---

## Resources

### Documentation Links
- **Alpaca:** https://docs.alpaca.markets/
- **Tradier:** https://documentation.tradier.com/brokerage-api
- **Schwab:** https://developer.schwab.com/
- **Interactive Brokers:** https://www.interactivebrokers.com/campus/ibkr-api-page/
- **Webull:** https://developer.webull.com/

### npm Packages (if needed)
```json
{
  "@alpacahq/alpaca-trade-api": "^3.0.0",  // Already installed
  // Add others as needed
}
```

---

## Notes

- Always test in sandbox/paper trading mode first
- Each broker has different commission structures
- Market hours may vary by broker
- Some brokers require additional setup (IB Gateway, OAuth flows)
- Rate limits vary by broker - implement appropriate throttling
- Error handling should be broker-specific

---

## Next Steps

1. **Get Tradier API keys** and test the implementation
2. **Register for Schwab Developer account** and start implementing
3. **Set up IB account and Client Portal Gateway** for Interactive Brokers
4. **Apply for Webull API access** (takes 1-2 days)
5. Update database with broker assignments
6. Deploy and test each broker individually
7. Monitor performance and adjust as needed

The architecture is ready - just need to implement each broker adapter!
