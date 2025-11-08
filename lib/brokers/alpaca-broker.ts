/**
 * Alpaca Broker Implementation
 *
 * Implements the IBroker interface for Alpaca Markets
 */

import Alpaca from '@alpacahq/alpaca-trade-api';
import type {
  IBroker,
  ExecutionResult,
  BrokerAccount,
  BrokerPosition
} from './types';

export class AlpacaBroker implements IBroker {
  public readonly name = 'Alpaca';
  private alpaca: Alpaca;

  constructor(config: {
    keyId: string;
    secretKey: string;
    paper?: boolean;
  }) {
    this.alpaca = new Alpaca({
      keyId: config.keyId,
      secretKey: config.secretKey,
      paper: config.paper ?? true,
    });
  }

  async executeBuy(symbol: string, quantity: number, agentId: string): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(`🔵 [Alpaca] Executing BUY: ${quantity} shares of ${symbol}`);

      // Get current quote for reference price
      const quote = await this.alpaca.getLatestTrade(symbol);
      const referencePrice = quote.Price;

      // Place market order
      const order = await this.alpaca.createOrder({
        symbol,
        qty: quantity,
        side: 'buy',
        type: 'market',
        time_in_force: 'day',
      });

      console.log(`  ✅ Order placed: ${order.id}`);

      // Wait for order to fill (with timeout)
      let filled = false;
      let attempts = 0;
      const maxAttempts = 20;

      while (!filled && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const updatedOrder = await this.alpaca.getOrder(order.id);

        if (updatedOrder.status === 'filled') {
          filled = true;
          const executedPrice = parseFloat(updatedOrder.filled_avg_price || '0');
          const executedQty = parseFloat(updatedOrder.filled_qty || '0');
          const executionTime = Date.now() - startTime;

          console.log(`  💰 Filled at $${executedPrice.toFixed(2)}`);

          return {
            success: true,
            executedPrice,
            executedQuantity: executedQty,
            commission: 0, // Alpaca has zero commission
            slippage: Math.abs(executedPrice - referencePrice),
            executionTime,
            orderId: order.id,
            orderStatus: 'filled',
          };
        } else if (updatedOrder.status === 'rejected' || updatedOrder.status === 'canceled') {
          throw new Error(`Order ${updatedOrder.status}: ${updatedOrder.reject_reason || 'Unknown reason'}`);
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
        orderId: order.id,
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
      console.log(`🔴 [Alpaca] Executing SELL: ${quantity} shares of ${symbol}`);

      // Get current quote for reference price
      const quote = await this.alpaca.getLatestTrade(symbol);
      const referencePrice = quote.Price;

      // Place market order
      const order = await this.alpaca.createOrder({
        symbol,
        qty: quantity,
        side: 'sell',
        type: 'market',
        time_in_force: 'day',
      });

      console.log(`  ✅ Order placed: ${order.id}`);

      // Wait for order to fill (with timeout)
      let filled = false;
      let attempts = 0;
      const maxAttempts = 20;

      while (!filled && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const updatedOrder = await this.alpaca.getOrder(order.id);

        if (updatedOrder.status === 'filled') {
          filled = true;
          const executedPrice = parseFloat(updatedOrder.filled_avg_price || '0');
          const executedQty = parseFloat(updatedOrder.filled_qty || '0');
          const executionTime = Date.now() - startTime;

          console.log(`  💰 Filled at $${executedPrice.toFixed(2)}`);

          return {
            success: true,
            executedPrice,
            executedQuantity: executedQty,
            commission: 0,
            slippage: Math.abs(executedPrice - referencePrice),
            executionTime,
            orderId: order.id,
            orderStatus: 'filled',
          };
        } else if (updatedOrder.status === 'rejected' || updatedOrder.status === 'canceled') {
          throw new Error(`Order ${updatedOrder.status}: ${updatedOrder.reject_reason || 'Unknown reason'}`);
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
        orderId: order.id,
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
      const account = await this.alpaca.getAccount();
      const alpacaPositions = await this.alpaca.getPositions();

      const positions: BrokerPosition[] = alpacaPositions.map((pos: any) => ({
        symbol: pos.symbol,
        name: pos.symbol,
        side: pos.side === 'long' ? 'LONG' : 'SHORT',
        quantity: parseFloat(pos.qty),
        entryPrice: parseFloat(pos.avg_entry_price),
        currentPrice: parseFloat(pos.current_price),
        unrealizedPnL: parseFloat(pos.unrealized_pl),
        unrealizedPnLPercent: parseFloat(pos.unrealized_plpc) * 100,
      }));

      return {
        accountValue: parseFloat(account.portfolio_value),
        cashBalance: parseFloat(account.cash),
        positions,
      };
    } catch (error: any) {
      console.error(`❌ [Alpaca] Failed to get account:`, error.message);
      throw error;
    }
  }

  async isMarketOpen(): Promise<boolean> {
    try {
      const clock = await this.alpaca.getClock();
      return clock.is_open;
    } catch (error: any) {
      console.error(`❌ [Alpaca] Failed to check market status:`, error.message);
      return false;
    }
  }

  async cancelAllOrders(): Promise<void> {
    try {
      console.log(`🔄 [Alpaca] Cancelling all orders...`);
      await this.alpaca.cancelAllOrders();
      console.log(`  ✅ All orders cancelled`);
    } catch (error: any) {
      console.error(`❌ [Alpaca] Failed to cancel orders:`, error.message);
      throw error;
    }
  }
}

/**
 * Factory function to create Alpaca broker instance
 * Supports multiple Alpaca paper accounts based on agent name
 */
export function createAlpacaBroker(agentName?: string): AlpacaBroker {
  let keyId: string | undefined;
  let secretKey: string | undefined;
  const paper = process.env.ALPACA_PAPER_TRADING !== 'false';

  // Map agent names to specific Alpaca accounts
  // Each agent gets their own paper trading account
  if (agentName === 'GPT-4o Mini') {
    // Account #2 for GPT-4o Mini
    keyId = process.env.ALPACA_API_KEY_2;
    secretKey = process.env.ALPACA_SECRET_KEY_2;
  } else if (agentName === 'Claude Haiku') {
    // Account #3 for Claude Haiku
    keyId = process.env.ALPACA_API_KEY_3;
    secretKey = process.env.ALPACA_SECRET_KEY_3;
  } else {
    // Account #1 (default) for DeepSeek and fallback
    keyId = process.env.ALPACA_API_KEY;
    secretKey = process.env.ALPACA_SECRET_KEY;
  }

  if (!keyId || !secretKey) {
    throw new Error(
      `Alpaca API credentials not found for agent "${agentName || 'default'}". ` +
      `Please set ALPACA_API_KEY${agentName === 'GPT-4o Mini' ? '_2' : agentName === 'Claude Haiku' ? '_3' : ''} ` +
      `and ALPACA_SECRET_KEY${agentName === 'GPT-4o Mini' ? '_2' : agentName === 'Claude Haiku' ? '_3' : ''} ` +
      `in environment variables.`
    );
  }

  console.log(`🔧 [Alpaca] Creating broker instance for agent: ${agentName || 'DeepSeek (default)'}`);

  return new AlpacaBroker({
    keyId,
    secretKey,
    paper,
  });
}
