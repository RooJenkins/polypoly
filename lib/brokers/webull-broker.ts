/**
 * Webull Broker Implementation
 *
 * Implements the IBroker interface for Webull
 * API Docs: https://developer.webull.com/
 *
 * Note: Webull API access requires application approval (1-2 business days)
 * Apply at: https://developer.webull.com/
 */

import type {
  IBroker,
  ExecutionResult,
  BrokerAccount,
  BrokerPosition
} from './types';

export class WebullBroker implements IBroker {
  public readonly name = 'Webull';
  private appKey: string;
  private appSecret: string;
  private accountId: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private baseUrl = 'https://ustrade-openapi.webull.com';

  constructor(config: {
    appKey: string;
    appSecret: string;
    accountId: string;
  }) {
    this.appKey = config.appKey;
    this.appSecret = config.appSecret;
    this.accountId = config.accountId;
  }

  /**
   * Get or refresh access token
   */
  private async ensureValidToken(): Promise<void> {
    // Refresh if token is expired or will expire in next 5 minutes
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt - 300000) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Refresh the access token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_key: this.appKey,
          app_secret: this.appSecret,
          grant_type: 'client_credentials',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${response.status} - ${error}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

      console.log(`✅ [Webull] Access token refreshed`);
    } catch (error: any) {
      console.error(`❌ [Webull] Token refresh failed:`, error.message);
      throw error;
    }
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    await this.ensureValidToken();

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Webull API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async executeBuy(symbol: string, quantity: number, agentId: string): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(`🔵 [Webull] Executing BUY: ${quantity} shares of ${symbol}`);

      // Get current quote for reference price
      const quoteResponse = await this.request(`/api/v1/quote?symbol=${symbol}`);
      const quote = quoteResponse.data;
      const referencePrice = quote?.last_price || quote?.ask_price || 0;

      // Place market order
      const orderPayload = {
        account_id: this.accountId,
        symbol,
        action: 'BUY',
        order_type: 'MARKET',
        quantity,
        time_in_force: 'DAY',
      };

      const orderResponse = await this.request('/api/v1/trade/order', {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });

      const orderId = orderResponse.data?.order_id;
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

        const orderStatus = await this.request(`/api/v1/trade/order/${orderId}`);
        const order = orderStatus.data;

        if (order.status === 'FILLED') {
          filled = true;
          const executedPrice = parseFloat(order.avg_fill_price || '0');
          const executedQty = parseFloat(order.filled_quantity || '0');
          const executionTime = Date.now() - startTime;

          console.log(`  💰 Filled at $${executedPrice.toFixed(2)}`);

          return {
            success: true,
            executedPrice,
            executedQuantity: executedQty,
            commission: parseFloat(order.commission || '0'),
            slippage: Math.abs(executedPrice - referencePrice),
            executionTime,
            orderId: orderId.toString(),
            orderStatus: 'filled',
          };
        } else if (order.status === 'REJECTED' || order.status === 'CANCELLED') {
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
      console.log(`🔴 [Webull] Executing SELL: ${quantity} shares of ${symbol}`);

      // Get current quote for reference price
      const quoteResponse = await this.request(`/api/v1/quote?symbol=${symbol}`);
      const quote = quoteResponse.data;
      const referencePrice = quote?.last_price || quote?.bid_price || 0;

      // Place market order
      const orderPayload = {
        account_id: this.accountId,
        symbol,
        action: 'SELL',
        order_type: 'MARKET',
        quantity,
        time_in_force: 'DAY',
      };

      const orderResponse = await this.request('/api/v1/trade/order', {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });

      const orderId = orderResponse.data?.order_id;
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

        const orderStatus = await this.request(`/api/v1/trade/order/${orderId}`);
        const order = orderStatus.data;

        if (order.status === 'FILLED') {
          filled = true;
          const executedPrice = parseFloat(order.avg_fill_price || '0');
          const executedQty = parseFloat(order.filled_quantity || '0');
          const executionTime = Date.now() - startTime;

          console.log(`  💰 Filled at $${executedPrice.toFixed(2)}`);

          return {
            success: true,
            executedPrice,
            executedQuantity: executedQty,
            commission: parseFloat(order.commission || '0'),
            slippage: Math.abs(executedPrice - referencePrice),
            executionTime,
            orderId: orderId.toString(),
            orderStatus: 'filled',
          };
        } else if (order.status === 'REJECTED' || order.status === 'CANCELLED') {
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
      const accountResponse = await this.request(`/api/v1/account/${this.accountId}`);
      const account = accountResponse.data;

      // Get positions
      const positionsResponse = await this.request(`/api/v1/account/${this.accountId}/positions`);
      const webullPositions = positionsResponse.data || [];

      // Get quotes for current prices
      const symbols = webullPositions.map((p: any) => p.symbol).join(',');
      let quotes: any = {};

      if (symbols) {
        const quotesResponse = await this.request(`/api/v1/quote?symbols=${symbols}`);
        const quoteData = quotesResponse.data;

        if (Array.isArray(quoteData)) {
          quotes = Object.fromEntries(quoteData.map((q: any) => [q.symbol, q]));
        } else if (quoteData) {
          quotes[quoteData.symbol] = quoteData;
        }
      }

      const positions: BrokerPosition[] = webullPositions.map((pos: any) => {
        const currentPrice = quotes[pos.symbol]?.last_price || parseFloat(pos.avg_price);
        const entryPrice = parseFloat(pos.avg_price);
        const quantity = parseFloat(pos.quantity);
        const unrealizedPnL = parseFloat(pos.unrealized_profit_loss || '0');
        const unrealizedPnLPercent = entryPrice > 0 ? (unrealizedPnL / (entryPrice * quantity)) * 100 : 0;

        return {
          symbol: pos.symbol,
          name: pos.name || pos.symbol,
          side: 'LONG',
          quantity,
          entryPrice,
          currentPrice,
          unrealizedPnL,
          unrealizedPnLPercent,
        };
      });

      return {
        accountValue: parseFloat(account.total_value || '0'),
        cashBalance: parseFloat(account.cash_balance || '0'),
        positions,
      };
    } catch (error: any) {
      console.error(`❌ [Webull] Failed to get account:`, error.message);
      throw error;
    }
  }

  async isMarketOpen(): Promise<boolean> {
    try {
      const response = await this.request('/api/v1/market/status');
      const status = response.data;
      return status.is_open === true || status.state === 'OPEN';
    } catch (error: any) {
      console.error(`❌ [Webull] Failed to check market status:`, error.message);
      return false;
    }
  }

  async cancelAllOrders(): Promise<void> {
    try {
      console.log(`🔄 [Webull] Cancelling all orders...`);

      // Get all open orders
      const ordersResponse = await this.request(`/api/v1/trade/orders?account_id=${this.accountId}&status=OPEN`);
      const orders = ordersResponse.data || [];

      // Cancel each order
      for (const order of orders) {
        if (order.order_id) {
          await this.request(`/api/v1/trade/order/${order.order_id}`, {
            method: 'DELETE',
          });
        }
      }

      console.log(`  ✅ All orders cancelled`);
    } catch (error: any) {
      console.error(`❌ [Webull] Failed to cancel orders:`, error.message);
      throw error;
    }
  }
}

/**
 * Factory function to create Webull broker instance
 */
export function createWebullBroker(): WebullBroker {
  const appKey = process.env.WEBULL_APP_KEY;
  const appSecret = process.env.WEBULL_APP_SECRET;
  const accountId = process.env.WEBULL_ACCOUNT_ID;

  if (!appKey || !appSecret || !accountId) {
    throw new Error(
      'WEBULL_APP_KEY, WEBULL_APP_SECRET, and WEBULL_ACCOUNT_ID must be set in environment variables'
    );
  }

  return new WebullBroker({
    appKey,
    appSecret,
    accountId,
  });
}
