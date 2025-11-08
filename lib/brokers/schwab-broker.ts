/**
 * Charles Schwab Broker Implementation
 *
 * Implements the IBroker interface for Charles Schwab
 * API Docs: https://developer.schwab.com/
 *
 * Note: Schwab uses OAuth 2.0 authentication. This implementation assumes
 * you have already completed the OAuth flow and obtained a refresh token.
 * Token refresh is handled automatically.
 */

import type {
  IBroker,
  ExecutionResult,
  BrokerAccount,
  BrokerPosition
} from './types';

interface SchwabTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export class SchwabBroker implements IBroker {
  public readonly name = 'Charles Schwab';
  private clientId: string;
  private clientSecret: string;
  private accountId: string;
  private redirectUri: string;
  private accessToken: string | null = null;
  private refreshToken: string;
  private tokenExpiresAt: number = 0;
  private baseUrl = 'https://api.schwabapi.com';

  constructor(config: {
    clientId: string;
    clientSecret: string;
    accountId: string;
    redirectUri: string;
    refreshToken: string;
  }) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.accountId = config.accountId;
    this.redirectUri = config.redirectUri;
    this.refreshToken = config.refreshToken;
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await fetch('https://api.schwabapi.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${response.status} - ${error}`);
      }

      const data: SchwabTokenResponse = await response.json();
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token; // Update refresh token
      this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

      console.log(`✅ [Schwab] Access token refreshed`);
    } catch (error: any) {
      console.error(`❌ [Schwab] Token refresh failed:`, error.message);
      throw error;
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    // Refresh if token is expired or will expire in next 5 minutes
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt - 300000) {
      await this.refreshAccessToken();
    }
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    await this.ensureValidToken();

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Schwab API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async executeBuy(symbol: string, quantity: number, agentId: string): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(`🔵 [Schwab] Executing BUY: ${quantity} shares of ${symbol}`);

      // Get current quote for reference price
      const quoteResponse = await this.request(`/marketdata/v1/quotes?symbols=${symbol}`);
      const quote = quoteResponse[symbol]?.quote;
      const referencePrice = quote?.lastPrice || quote?.askPrice || 0;

      // Place market order
      const orderPayload = {
        orderType: 'MARKET',
        session: 'NORMAL',
        duration: 'DAY',
        orderStrategyType: 'SINGLE',
        orderLegCollection: [
          {
            instruction: 'BUY',
            quantity,
            instrument: {
              symbol,
              assetType: 'EQUITY',
            },
          },
        ],
      };

      const orderResponse = await this.request(`/trader/v1/accounts/${this.accountId}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      // Extract order ID from Location header
      const locationHeader = orderResponse.headers?.get?.('Location');
      const orderId = locationHeader?.split('/').pop();

      if (!orderId) {
        throw new Error('Failed to place order - no order ID returned');
      }

      console.log(`  ✅ Order placed: ${orderId}`);

      // Wait for order to fill (with timeout)
      let filled = false;
      let attempts = 0;
      const maxAttempts = 20;

      while (!filled && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const order = await this.request(`/trader/v1/accounts/${this.accountId}/orders/${orderId}`);

        if (order.status === 'FILLED') {
          filled = true;
          const executedPrice = order.orderActivityCollection?.[0]?.executionLegs?.[0]?.price || 0;
          const executedQty = order.filledQuantity || 0;
          const executionTime = Date.now() - startTime;

          console.log(`  💰 Filled at $${executedPrice.toFixed(2)}`);

          return {
            success: true,
            executedPrice,
            executedQuantity: executedQty,
            commission: 0, // Schwab has $0 commissions for online equity trades
            slippage: Math.abs(executedPrice - referencePrice),
            executionTime,
            orderId: orderId.toString(),
            orderStatus: 'filled',
          };
        } else if (order.status === 'REJECTED' || order.status === 'CANCELED') {
          throw new Error(`Order ${order.status}`);
        }

        attempts++;
      }

      // Timeout - order still pending
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        commission: 0,
        slippage: 0,
        error: 'Order timed out waiting to fill',
        executionTime,
        orderId: orderId.toString(),
        orderStatus: 'pending',
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error(`  ❌ Buy failed:`, error.message);

      return {
        success: false,
        commission: 0,
        slippage: 0,
        error: error.message,
        executionTime,
      };
    }
  }

  async executeSell(symbol: string, quantity: number, agentId: string): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(`🔴 [Schwab] Executing SELL: ${quantity} shares of ${symbol}`);

      // Get current quote for reference price
      const quoteResponse = await this.request(`/marketdata/v1/quotes?symbols=${symbol}`);
      const quote = quoteResponse[symbol]?.quote;
      const referencePrice = quote?.lastPrice || quote?.bidPrice || 0;

      // Place market order
      const orderPayload = {
        orderType: 'MARKET',
        session: 'NORMAL',
        duration: 'DAY',
        orderStrategyType: 'SINGLE',
        orderLegCollection: [
          {
            instruction: 'SELL',
            quantity,
            instrument: {
              symbol,
              assetType: 'EQUITY',
            },
          },
        ],
      };

      const orderResponse = await this.request(`/trader/v1/accounts/${this.accountId}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      const locationHeader = orderResponse.headers?.get?.('Location');
      const orderId = locationHeader?.split('/').pop();

      if (!orderId) {
        throw new Error('Failed to place order - no order ID returned');
      }

      console.log(`  ✅ Order placed: ${orderId}`);

      // Wait for order to fill
      let filled = false;
      let attempts = 0;
      const maxAttempts = 20;

      while (!filled && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const order = await this.request(`/trader/v1/accounts/${this.accountId}/orders/${orderId}`);

        if (order.status === 'FILLED') {
          filled = true;
          const executedPrice = order.orderActivityCollection?.[0]?.executionLegs?.[0]?.price || 0;
          const executedQty = order.filledQuantity || 0;
          const executionTime = Date.now() - startTime;

          console.log(`  💰 Filled at $${executedPrice.toFixed(2)}`);

          return {
            success: true,
            executedPrice,
            executedQuantity: executedQty,
            commission: 0,
            slippage: Math.abs(executedPrice - referencePrice),
            executionTime,
            orderId: orderId.toString(),
            orderStatus: 'filled',
          };
        } else if (order.status === 'REJECTED' || order.status === 'CANCELED') {
          throw new Error(`Order ${order.status}`);
        }

        attempts++;
      }

      // Timeout
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        commission: 0,
        slippage: 0,
        error: 'Order timed out waiting to fill',
        executionTime,
        orderId: orderId.toString(),
        orderStatus: 'pending',
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error(`  ❌ Sell failed:`, error.message);

      return {
        success: false,
        commission: 0,
        slippage: 0,
        error: error.message,
        executionTime,
      };
    }
  }

  async getAccount(): Promise<BrokerAccount> {
    try {
      // Get account information
      const accountResponse = await this.request(`/trader/v1/accounts/${this.accountId}`);
      const account = accountResponse.securitiesAccount;

      // Get positions
      const positions: BrokerPosition[] = (account.positions || []).map((pos: any) => {
        const currentPrice = pos.marketValue / pos.longQuantity;
        const entryPrice = pos.averagePrice || currentPrice;
        const quantity = pos.longQuantity || 0;
        const unrealizedPnL = (currentPrice - entryPrice) * quantity;
        const unrealizedPnLPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

        return {
          symbol: pos.instrument.symbol,
          name: pos.instrument.symbol,
          side: 'LONG',
          quantity,
          entryPrice,
          currentPrice,
          unrealizedPnL,
          unrealizedPnLPercent,
        };
      });

      return {
        accountValue: account.currentBalances.liquidationValue || 0,
        cashBalance: account.currentBalances.cashBalance || 0,
        positions,
      };
    } catch (error: any) {
      console.error(`❌ [Schwab] Failed to get account:`, error.message);
      throw error;
    }
  }

  async isMarketOpen(): Promise<boolean> {
    try {
      // Schwab doesn't have a direct market clock endpoint
      // We'll use market hours endpoint
      const today = new Date().toISOString().split('T')[0];
      const response = await this.request(`/marketdata/v1/markets?markets=equity&date=${today}`);

      const equityMarket = response.equity;
      if (!equityMarket) return false;

      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0];

      // Check if current time is between regular market hours
      return equityMarket.isOpen === true;
    } catch (error: any) {
      console.error(`❌ [Schwab] Failed to check market status:`, error.message);
      return false;
    }
  }

  async cancelAllOrders(): Promise<void> {
    try {
      console.log(`🔄 [Schwab] Cancelling all orders...`);

      // Get all orders
      const ordersResponse = await this.request(`/trader/v1/accounts/${this.accountId}/orders`);
      const orders = ordersResponse || [];

      // Cancel each pending order
      for (const order of orders) {
        if (order.status === 'WORKING' || order.status === 'PENDING_ACTIVATION' || order.status === 'QUEUED') {
          await this.request(`/trader/v1/accounts/${this.accountId}/orders/${order.orderId}`, {
            method: 'DELETE',
          });
        }
      }

      console.log(`  ✅ All orders cancelled`);
    } catch (error: any) {
      console.error(`❌ [Schwab] Failed to cancel orders:`, error.message);
      throw error;
    }
  }
}

/**
 * Factory function to create Schwab broker instance
 */
export function createSchwabBroker(): SchwabBroker {
  const clientId = process.env.SCHWAB_CLIENT_ID;
  const clientSecret = process.env.SCHWAB_CLIENT_SECRET;
  const accountId = process.env.SCHWAB_ACCOUNT_ID;
  const redirectUri = process.env.SCHWAB_REDIRECT_URI;
  const refreshToken = process.env.SCHWAB_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !accountId || !redirectUri || !refreshToken) {
    throw new Error(
      'SCHWAB_CLIENT_ID, SCHWAB_CLIENT_SECRET, SCHWAB_ACCOUNT_ID, ' +
      'SCHWAB_REDIRECT_URI, and SCHWAB_REFRESH_TOKEN must be set in environment variables'
    );
  }

  return new SchwabBroker({
    clientId,
    clientSecret,
    accountId,
    redirectUri,
    refreshToken,
  });
}
