/**
 * Interactive Brokers (IBKR) Broker Implementation
 *
 * Implements the IBroker interface for Interactive Brokers
 * API Docs: https://www.interactivebrokers.com/api/doc.html
 *
 * IMPORTANT: This implementation requires the Client Portal Gateway to be running
 * on localhost. Download from:
 * https://www.interactivebrokers.com/en/trading/ibgateway-latest.html
 *
 * Setup:
 * 1. Download and install Client Portal Gateway
 * 2. Run the gateway (it will start on https://localhost:5000 by default)
 * 3. Authenticate via the web interface (https://localhost:5000)
 * 4. Keep the gateway running while trading
 */

import type {
  IBroker,
  ExecutionResult,
  BrokerAccount,
  BrokerPosition
} from './types';

export class InteractiveBrokersBroker implements IBroker {
  public readonly name = 'Interactive Brokers';
  private accountId: string;
  private gatewayUrl: string;
  private sessionAuthenticated = false;

  constructor(config: {
    accountId: string;
    gatewayUrl?: string;
  }) {
    this.accountId = config.accountId;
    this.gatewayUrl = config.gatewayUrl || 'https://localhost:5000/v1/api';
  }

  /**
   * Check and maintain session authentication
   */
  private async ensureAuthenticated(): Promise<void> {
    try {
      const response = await fetch(`${this.gatewayUrl}/iserver/auth/status`, {
        method: 'POST',
      });

      const status = await response.json();

      if (!status.authenticated) {
        console.warn('⚠️ [IBKR] Session not authenticated. Please authenticate via https://localhost:5000');
        throw new Error('IBKR session not authenticated. Please authenticate via the Client Portal Gateway web interface.');
      }

      // Tickle the session to keep it alive
      await fetch(`${this.gatewayUrl}/tickle`, { method: 'POST' });

      this.sessionAuthenticated = true;
    } catch (error: any) {
      console.error(`❌ [IBKR] Authentication check failed:`, error.message);
      throw error;
    }
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    await this.ensureAuthenticated();

    const url = `${this.gatewayUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`IBKR API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get contract ID (conid) for a symbol
   */
  private async getContractId(symbol: string): Promise<number> {
    try {
      const searchResults = await this.request(`/iserver/secdef/search?symbol=${symbol}`);

      if (!searchResults || searchResults.length === 0) {
        throw new Error(`No contract found for symbol: ${symbol}`);
      }

      // Find the stock contract
      const stockContract = searchResults.find((c: any) =>
        c.sections?.find((s: any) => s.secType === 'STK')
      );

      if (!stockContract) {
        throw new Error(`No stock contract found for symbol: ${symbol}`);
      }

      return stockContract.conid;
    } catch (error: any) {
      console.error(`❌ [IBKR] Failed to get contract ID:`, error.message);
      throw error;
    }
  }

  async executeBuy(symbol: string, quantity: number, agentId: string): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(`🔵 [IBKR] Executing BUY: ${quantity} shares of ${symbol}`);

      // Get contract ID
      const conid = await this.getContractId(symbol);

      // Get current quote for reference price
      const snapshot = await this.request(`/iserver/marketdata/snapshot?conids=${conid}&fields=31,84,86`);
      const quote = snapshot[0];
      const referencePrice = quote?.['31'] || quote?.['84'] || 0; // Last price or bid

      // Place market order
      const orderPayload = {
        orders: [
          {
            conid,
            secType: `${conid}:STK`,
            orderType: 'MKT',
            side: 'BUY',
            quantity,
            tif: 'DAY',
          },
        ],
      };

      const orderResponse = await this.request(`/iserver/account/${this.accountId}/orders`, {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });

      // Handle order confirmation (IBKR may require confirmation)
      let orderId: string;

      if (orderResponse[0]?.id) {
        // Order confirmation required
        const confirmResponse = await this.request(`/iserver/reply/${orderResponse[0].id}`, {
          method: 'POST',
          body: JSON.stringify({ confirmed: true }),
        });
        orderId = confirmResponse[0]?.order_id;
      } else if (orderResponse[0]?.order_id) {
        orderId = orderResponse[0].order_id;
      } else {
        throw new Error('Failed to place order - no order ID returned');
      }

      console.log(`  ✅ Order placed: ${orderId}`);

      // Wait for order to fill
      let filled = false;
      let attempts = 0;
      const maxAttempts = 20;

      while (!filled && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const liveOrders = await this.request(`/iserver/account/orders`);
        const order = liveOrders?.orders?.find((o: any) => o.orderId === orderId);

        if (!order) {
          // Order no longer in live orders, check if filled
          const orderStatus = await this.request(`/iserver/account/order/status/${orderId}`);

          if (orderStatus.status === 'Filled') {
            filled = true;
            const executedPrice = orderStatus.avgPrice || referencePrice;
            const executedQty = orderStatus.filledQuantity || quantity;
            const executionTime = Date.now() - startTime;

            console.log(`  💰 Filled at $${executedPrice.toFixed(2)}`);

            return {
              success: true,
              executedPrice,
              executedQuantity: executedQty,
              commission: orderStatus.commission || 0,
              slippage: Math.abs(executedPrice - referencePrice),
              executionTime,
              orderId,
              orderStatus: 'filled',
            };
          } else if (orderStatus.status === 'Cancelled' || orderStatus.status === 'Rejected') {
            throw new Error(`Order ${orderStatus.status}`);
          }
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
        orderId,
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
      console.log(`🔴 [IBKR] Executing SELL: ${quantity} shares of ${symbol}`);

      // Get contract ID
      const conid = await this.getContractId(symbol);

      // Get current quote
      const snapshot = await this.request(`/iserver/marketdata/snapshot?conids=${conid}&fields=31,83,86`);
      const quote = snapshot[0];
      const referencePrice = quote?.['31'] || quote?.['83'] || 0; // Last price or ask

      // Place market order
      const orderPayload = {
        orders: [
          {
            conid,
            secType: `${conid}:STK`,
            orderType: 'MKT',
            side: 'SELL',
            quantity,
            tif: 'DAY',
          },
        ],
      };

      const orderResponse = await this.request(`/iserver/account/${this.accountId}/orders`, {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });

      // Handle confirmation
      let orderId: string;

      if (orderResponse[0]?.id) {
        const confirmResponse = await this.request(`/iserver/reply/${orderResponse[0].id}`, {
          method: 'POST',
          body: JSON.stringify({ confirmed: true }),
        });
        orderId = confirmResponse[0]?.order_id;
      } else if (orderResponse[0]?.order_id) {
        orderId = orderResponse[0].order_id;
      } else {
        throw new Error('Failed to place order - no order ID returned');
      }

      console.log(`  ✅ Order placed: ${orderId}`);

      // Wait for fill
      let filled = false;
      let attempts = 0;
      const maxAttempts = 20;

      while (!filled && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const liveOrders = await this.request(`/iserver/account/orders`);
        const order = liveOrders?.orders?.find((o: any) => o.orderId === orderId);

        if (!order) {
          const orderStatus = await this.request(`/iserver/account/order/status/${orderId}`);

          if (orderStatus.status === 'Filled') {
            filled = true;
            const executedPrice = orderStatus.avgPrice || referencePrice;
            const executedQty = orderStatus.filledQuantity || quantity;
            const executionTime = Date.now() - startTime;

            console.log(`  💰 Filled at $${executedPrice.toFixed(2)}`);

            return {
              success: true,
              executedPrice,
              executedQuantity: executedQty,
              commission: orderStatus.commission || 0,
              slippage: Math.abs(executedPrice - referencePrice),
              executionTime,
              orderId,
              orderStatus: 'filled',
            };
          } else if (orderStatus.status === 'Cancelled' || orderStatus.status === 'Rejected') {
            throw new Error(`Order ${orderStatus.status}`);
          }
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
        orderId,
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
      // Get portfolio accounts
      const portfolioResponse = await this.request('/portfolio/accounts');

      // Get account summary
      const summaryResponse = await this.request(`/portfolio/${this.accountId}/summary`);

      // Get positions
      const positionsResponse = await this.request(`/portfolio/${this.accountId}/positions/0`);

      // Extract account values from summary
      const netLiquidation = summaryResponse.find((s: any) => s.key === 'netliquidation')?.value || 0;
      const cashBalance = summaryResponse.find((s: any) => s.key === 'totalcashvalue')?.value || 0;

      // Map positions
      const positions: BrokerPosition[] = (positionsResponse || []).map((pos: any) => {
        const currentPrice = pos.mktPrice || 0;
        const entryPrice = pos.avgPrice || currentPrice;
        const quantity = Math.abs(pos.position || 0);
        const unrealizedPnL = pos.unrealizedPnl || 0;
        const unrealizedPnLPercent = entryPrice > 0 ? (unrealizedPnL / (entryPrice * quantity)) * 100 : 0;

        return {
          symbol: pos.contractDesc || pos.ticker || 'UNKNOWN',
          name: pos.contractDesc || pos.ticker || 'UNKNOWN',
          side: pos.position > 0 ? 'LONG' : 'SHORT',
          quantity,
          entryPrice,
          currentPrice,
          unrealizedPnL,
          unrealizedPnLPercent,
        };
      });

      return {
        accountValue: parseFloat(netLiquidation) || 0,
        cashBalance: parseFloat(cashBalance) || 0,
        positions,
      };
    } catch (error: any) {
      console.error(`❌ [IBKR] Failed to get account:`, error.message);
      throw error;
    }
  }

  async isMarketOpen(): Promise<boolean> {
    try {
      // IBKR doesn't have a simple market hours endpoint
      // We'll check if we can get market data which implies market is accessible
      const now = new Date();
      const day = now.getUTCDay();
      const hour = now.getUTCHours();

      // Simple check: weekday and between 13:30 UTC and 20:00 UTC (9:30 AM - 4:00 PM ET)
      const isWeekday = day >= 1 && day <= 5;
      const isDuringMarketHours = hour >= 13 && hour < 20;

      return isWeekday && isDuringMarketHours;
    } catch (error: any) {
      console.error(`❌ [IBKR] Failed to check market status:`, error.message);
      return false;
    }
  }

  async cancelAllOrders(): Promise<void> {
    try {
      console.log(`🔄 [IBKR] Cancelling all orders...`);

      // Get all live orders
      const ordersResponse = await this.request('/iserver/account/orders');
      const orders = ordersResponse?.orders || [];

      // Cancel each order
      for (const order of orders) {
        if (order.orderId) {
          await this.request(`/iserver/account/${this.accountId}/order/${order.orderId}`, {
            method: 'DELETE',
          });
        }
      }

      console.log(`  ✅ All orders cancelled`);
    } catch (error: any) {
      console.error(`❌ [IBKR] Failed to cancel orders:`, error.message);
      throw error;
    }
  }
}

/**
 * Factory function to create Interactive Brokers broker instance
 */
export function createInteractiveBrokersBroker(): InteractiveBrokersBroker {
  const accountId = process.env.IBKR_ACCOUNT_ID;
  const gatewayUrl = process.env.IBKR_GATEWAY_URL;

  if (!accountId) {
    throw new Error('IBKR_ACCOUNT_ID must be set in environment variables');
  }

  return new InteractiveBrokersBroker({
    accountId,
    gatewayUrl,
  });
}
