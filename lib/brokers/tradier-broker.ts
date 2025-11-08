/**
 * Tradier Broker Implementation
 *
 * Implements the IBroker interface for Tradier Brokerage
 * API Docs: https://documentation.tradier.com/brokerage-api
 */

import type {
  IBroker,
  ExecutionResult,
  BrokerAccount,
  BrokerPosition
} from './types';

export class TradierBroker implements IBroker {
  public readonly name = 'Tradier';
  private accessToken: string;
  private accountId: string;
  private sandbox: boolean;
  private baseUrl: string;

  constructor(config: {
    accessToken: string;
    accountId: string;
    sandbox?: boolean;
  }) {
    this.accessToken = config.accessToken;
    this.accountId = config.accountId;
    this.sandbox = config.sandbox ?? true;
    this.baseUrl = this.sandbox
      ? 'https://sandbox.tradier.com/v1'
      : 'https://api.tradier.com/v1';
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
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
      throw new Error(`Tradier API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async executeBuy(symbol: string, quantity: number, agentId: string): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(`🔵 [Tradier] Executing BUY: ${quantity} shares of ${symbol}`);

      // Get current quote for reference price
      const quoteResponse = await this.request(`/markets/quotes?symbols=${symbol}`);
      const quote = quoteResponse.quotes?.quote;
      const referencePrice = quote?.last || quote?.ask || 0;

      // Place market order
      const orderData = new URLSearchParams({
        class: 'equity',
        symbol,
        side: 'buy',
        quantity: quantity.toString(),
        type: 'market',
        duration: 'day',
      });

      const orderResponse = await this.request(`/accounts/${this.accountId}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: orderData.toString(),
      });

      const orderId = orderResponse.order?.id;
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

        const orderStatus = await this.request(`/accounts/${this.accountId}/orders/${orderId}`);
        const order = orderStatus.order;

        if (order.status === 'filled') {
          filled = true;
          const executedPrice = parseFloat(order.avg_fill_price || '0');
          const executedQty = parseFloat(order.exec_quantity || '0');
          const executionTime = Date.now() - startTime;

          console.log(`  💰 Filled at $${executedPrice.toFixed(2)}`);

          return {
            success: true,
            executedPrice,
            executedQuantity: executedQty,
            commission: 0, // Commission depends on Tradier account type
            slippage: Math.abs(executedPrice - referencePrice),
            executionTime,
            orderId: orderId.toString(),
            orderStatus: 'filled',
          };
        } else if (order.status === 'rejected' || order.status === 'canceled') {
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
      console.log(`🔴 [Tradier] Executing SELL: ${quantity} shares of ${symbol}`);

      // Get current quote for reference price
      const quoteResponse = await this.request(`/markets/quotes?symbols=${symbol}`);
      const quote = quoteResponse.quotes?.quote;
      const referencePrice = quote?.last || quote?.bid || 0;

      // Place market order
      const orderData = new URLSearchParams({
        class: 'equity',
        symbol,
        side: 'sell',
        quantity: quantity.toString(),
        type: 'market',
        duration: 'day',
      });

      const orderResponse = await this.request(`/accounts/${this.accountId}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: orderData.toString(),
      });

      const orderId = orderResponse.order?.id;
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

        const orderStatus = await this.request(`/accounts/${this.accountId}/orders/${orderId}`);
        const order = orderStatus.order;

        if (order.status === 'filled') {
          filled = true;
          const executedPrice = parseFloat(order.avg_fill_price || '0');
          const executedQty = parseFloat(order.exec_quantity || '0');
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
        } else if (order.status === 'rejected' || order.status === 'canceled') {
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
      // Get account balances
      const balanceResponse = await this.request(`/accounts/${this.accountId}/balances`);
      const balances = balanceResponse.balances;

      // Get positions
      const positionsResponse = await this.request(`/accounts/${this.accountId}/positions`);
      const tradierPositions = positionsResponse.positions?.position || [];

      // Normalize to array if single position
      const positionsArray = Array.isArray(tradierPositions)
        ? tradierPositions
        : tradierPositions ? [tradierPositions] : [];

      // Get quotes for current prices
      const symbols = positionsArray.map(p => p.symbol).join(',');
      let quotes: any = {};

      if (symbols) {
        const quotesResponse = await this.request(`/markets/quotes?symbols=${symbols}`);
        const quoteData = quotesResponse.quotes?.quote;

        if (Array.isArray(quoteData)) {
          quotes = Object.fromEntries(quoteData.map(q => [q.symbol, q]));
        } else if (quoteData) {
          quotes[quoteData.symbol] = quoteData;
        }
      }

      const positions: BrokerPosition[] = positionsArray.map((pos: any) => {
        const currentPrice = quotes[pos.symbol]?.last || parseFloat(pos.cost_basis) / parseFloat(pos.quantity);
        const entryPrice = parseFloat(pos.cost_basis) / parseFloat(pos.quantity);
        const quantity = parseFloat(pos.quantity);
        const marketValue = currentPrice * quantity;
        const costBasis = parseFloat(pos.cost_basis);
        const unrealizedPnL = marketValue - costBasis;
        const unrealizedPnLPercent = (unrealizedPnL / costBasis) * 100;

        return {
          symbol: pos.symbol,
          name: pos.symbol,
          side: 'LONG', // Tradier API doesn't specify side in positions
          quantity,
          entryPrice,
          currentPrice,
          unrealizedPnL,
          unrealizedPnLPercent,
        };
      });

      return {
        accountValue: parseFloat(balances.total_equity || balances.total_cash || '0'),
        cashBalance: parseFloat(balances.total_cash || '0'),
        positions,
      };
    } catch (error: any) {
      console.error(`❌ [Tradier] Failed to get account:`, error.message);
      throw error;
    }
  }

  async isMarketOpen(): Promise<boolean> {
    try {
      const response = await this.request('/markets/clock');
      const clock = response.clock;
      return clock.state === 'open';
    } catch (error: any) {
      console.error(`❌ [Tradier] Failed to check market status:`, error.message);
      return false;
    }
  }

  async cancelAllOrders(): Promise<void> {
    try {
      console.log(`🔄 [Tradier] Cancelling all orders...`);

      // Get all open orders
      const ordersResponse = await this.request(`/accounts/${this.accountId}/orders`);
      const orders = ordersResponse.orders?.order || [];
      const ordersArray = Array.isArray(orders) ? orders : orders ? [orders] : [];

      // Cancel each order
      for (const order of ordersArray) {
        if (order.status === 'open' || order.status === 'pending') {
          await this.request(`/accounts/${this.accountId}/orders/${order.id}`, {
            method: 'DELETE',
          });
        }
      }

      console.log(`  ✅ All orders cancelled`);
    } catch (error: any) {
      console.error(`❌ [Tradier] Failed to cancel orders:`, error.message);
      throw error;
    }
  }
}

/**
 * Factory function to create Tradier broker instance
 */
export function createTradierBroker(): TradierBroker {
  const accessToken = process.env.TRADIER_ACCESS_TOKEN;
  const accountId = process.env.TRADIER_ACCOUNT_ID;
  const sandbox = process.env.TRADIER_SANDBOX !== 'false';

  if (!accessToken || !accountId) {
    throw new Error('TRADIER_ACCESS_TOKEN and TRADIER_ACCOUNT_ID must be set in environment variables');
  }

  return new TradierBroker({
    accessToken,
    accountId,
    sandbox,
  });
}
