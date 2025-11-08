/**
 * Alpaca Broker Integration
 *
 * Integrates with Alpaca Markets API for real/paper stock trading
 * Supports both paper trading (test with fake money) and live trading (real money)
 */

import Alpaca from '@alpacahq/alpaca-trade-api';

interface AlpacaConfig {
  keyId: string;
  secretKey: string;
  paper: boolean; // true = paper trading, false = live trading
}

interface ExecutionResult {
  success: boolean;
  executedPrice?: number;
  executedQuantity?: number;
  commission: number;
  slippage: number;
  error?: string;
  executionTime: number;
  orderId?: string;
  orderStatus?: string;
}

/**
 * Initialize Alpaca client from environment variables
 */
function getAlpacaClient(): Alpaca {
  const keyId = process.env.ALPACA_API_KEY;
  const secretKey = process.env.ALPACA_SECRET_KEY;
  const paper = process.env.ALPACA_PAPER_TRADING !== 'false'; // Default to paper trading

  if (!keyId || !secretKey) {
    throw new Error('ALPACA_API_KEY and ALPACA_SECRET_KEY must be set in environment variables');
  }

  console.log(`🔌 Initializing Alpaca client (${paper ? 'PAPER' : 'LIVE'} trading mode)`);

  return new Alpaca({
    keyId,
    secretKey,
    paper,
    usePolygon: false // We use Yahoo Finance for market data
  });
}

/**
 * Execute a BUY order with Alpaca
 */
export async function executeAlpacaBuy(
  symbol: string,
  quantity: number,
  agentId: string
): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    const alpaca = getAlpacaClient();

    console.log(`📊 [Alpaca] Agent ${agentId} buying ${quantity} shares of ${symbol}`);

    // Create market order
    const order = await alpaca.createOrder({
      symbol,
      qty: quantity,
      side: 'buy',
      type: 'market',
      time_in_force: 'day',
      client_order_id: `${agentId}-buy-${Date.now()}`
    });

    console.log(`✅ [Alpaca] Order placed:`, {
      id: order.id,
      status: order.status,
      symbol: order.symbol,
      qty: order.qty,
      side: order.side
    });

    // Wait for order to fill (with timeout)
    const filledOrder = await waitForOrderFill(alpaca, order.id, 30000);

    if (!filledOrder || filledOrder.status !== 'filled') {
      return {
        success: false,
        commission: 0,
        slippage: 0,
        error: `Order not filled: ${filledOrder?.status || 'timeout'}`,
        executionTime: Date.now() - startTime,
        orderId: order.id,
        orderStatus: filledOrder?.status
      };
    }

    // Calculate execution metrics
    const executedPrice = parseFloat(filledOrder.filled_avg_price || '0');
    const executedQuantity = parseFloat(filledOrder.filled_qty || '0');
    const commission = 0; // Alpaca is commission-free

    console.log(`✅ [Alpaca] Order filled:`, {
      executedPrice,
      executedQuantity,
      total: executedPrice * executedQuantity
    });

    return {
      success: true,
      executedPrice,
      executedQuantity,
      commission,
      slippage: 0, // Real slippage handled by market
      executionTime: Date.now() - startTime,
      orderId: order.id,
      orderStatus: 'filled'
    };
  } catch (error: any) {
    console.error(`❌ [Alpaca] Buy order failed:`, error.message);
    return {
      success: false,
      commission: 0,
      slippage: 0,
      error: error.message,
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * Execute a SELL order with Alpaca
 */
export async function executeAlpacaSell(
  symbol: string,
  quantity: number,
  agentId: string
): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    const alpaca = getAlpacaClient();

    console.log(`📊 [Alpaca] Agent ${agentId} selling ${quantity} shares of ${symbol}`);

    // Create market order
    const order = await alpaca.createOrder({
      symbol,
      qty: quantity,
      side: 'sell',
      type: 'market',
      time_in_force: 'day',
      client_order_id: `${agentId}-sell-${Date.now()}`
    });

    console.log(`✅ [Alpaca] Order placed:`, {
      id: order.id,
      status: order.status,
      symbol: order.symbol,
      qty: order.qty,
      side: order.side
    });

    // Wait for order to fill (with timeout)
    const filledOrder = await waitForOrderFill(alpaca, order.id, 30000);

    if (!filledOrder || filledOrder.status !== 'filled') {
      return {
        success: false,
        commission: 0,
        slippage: 0,
        error: `Order not filled: ${filledOrder?.status || 'timeout'}`,
        executionTime: Date.now() - startTime,
        orderId: order.id,
        orderStatus: filledOrder?.status
      };
    }

    // Calculate execution metrics
    const executedPrice = parseFloat(filledOrder.filled_avg_price || '0');
    const executedQuantity = parseFloat(filledOrder.filled_qty || '0');
    const commission = 0; // Alpaca is commission-free

    console.log(`✅ [Alpaca] Order filled:`, {
      executedPrice,
      executedQuantity,
      total: executedPrice * executedQuantity
    });

    return {
      success: true,
      executedPrice,
      executedQuantity,
      commission,
      slippage: 0, // Real slippage handled by market
      executionTime: Date.now() - startTime,
      orderId: order.id,
      orderStatus: 'filled'
    };
  } catch (error: any) {
    console.error(`❌ [Alpaca] Sell order failed:`, error.message);
    return {
      success: false,
      commission: 0,
      slippage: 0,
      error: error.message,
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * Wait for an order to be filled (with timeout)
 */
async function waitForOrderFill(
  alpaca: Alpaca,
  orderId: string,
  timeoutMs: number = 30000
): Promise<any> {
  const startTime = Date.now();
  const checkInterval = 500; // Check every 500ms

  while (Date.now() - startTime < timeoutMs) {
    const order = await alpaca.getOrder(orderId);

    if (order.status === 'filled') {
      return order;
    }

    if (order.status === 'canceled' || order.status === 'rejected' || order.status === 'expired') {
      console.warn(`⚠️ [Alpaca] Order ${orderId} ended with status: ${order.status}`);
      return order;
    }

    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  console.warn(`⏱️ [Alpaca] Order ${orderId} fill timeout after ${timeoutMs}ms`);
  return await alpaca.getOrder(orderId);
}

/**
 * Get Alpaca account information
 */
export async function getAlpacaAccount(): Promise<any> {
  try {
    const alpaca = getAlpacaClient();
    const account = await alpaca.getAccount();

    return {
      id: account.id,
      status: account.status,
      cash: parseFloat(account.cash),
      portfolio_value: parseFloat(account.portfolio_value),
      buying_power: parseFloat(account.buying_power),
      equity: parseFloat(account.equity),
      daytrade_count: account.daytrade_count,
      pattern_day_trader: account.pattern_day_trader
    };
  } catch (error: any) {
    console.error(`❌ [Alpaca] Failed to get account:`, error.message);
    throw error;
  }
}

/**
 * Get current positions from Alpaca
 */
export async function getAlpacaPositions(): Promise<any[]> {
  try {
    const alpaca = getAlpacaClient();
    const positions = await alpaca.getPositions();

    return positions.map((pos: any) => ({
      symbol: pos.symbol,
      qty: parseFloat(pos.qty),
      avg_entry_price: parseFloat(pos.avg_entry_price),
      current_price: parseFloat(pos.current_price),
      market_value: parseFloat(pos.market_value),
      cost_basis: parseFloat(pos.cost_basis),
      unrealized_pl: parseFloat(pos.unrealized_pl),
      unrealized_plpc: parseFloat(pos.unrealized_plpc)
    }));
  } catch (error: any) {
    console.error(`❌ [Alpaca] Failed to get positions:`, error.message);
    throw error;
  }
}

/**
 * Cancel all open orders
 */
export async function cancelAllAlpacaOrders(): Promise<void> {
  try {
    const alpaca = getAlpacaClient();
    await alpaca.cancelAllOrders();
    console.log(`✅ [Alpaca] All open orders cancelled`);
  } catch (error: any) {
    console.error(`❌ [Alpaca] Failed to cancel orders:`, error.message);
    throw error;
  }
}

/**
 * Check if market is open according to Alpaca
 */
export async function isAlpacaMarketOpen(): Promise<boolean> {
  try {
    const alpaca = getAlpacaClient();
    const clock = await alpaca.getClock();
    return clock.is_open;
  } catch (error: any) {
    console.error(`❌ [Alpaca] Failed to get market status:`, error.message);
    return false;
  }
}

/**
 * Sync agent's portfolio with Alpaca account
 * Returns the updated agent data
 */
export async function syncAgentWithAlpaca(agentId: string): Promise<{
  accountValue: number;
  cashBalance: number;
  positions: Array<{
    symbol: string;
    name: string;
    side: string;
    quantity: number;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
  }>;
}> {
  try {
    console.log(`🔄 [Alpaca] Syncing agent ${agentId} with Alpaca...`);

    // Get account info
    const account = await getAlpacaAccount();

    // Get positions
    const alpacaPositions = await getAlpacaPositions();

    // Convert Alpaca positions to our format
    const positions = alpacaPositions.map(pos => ({
      symbol: pos.symbol,
      name: pos.symbol, // Alpaca doesn't provide company names, using symbol
      side: 'LONG', // Alpaca paper trading doesn't support shorts
      quantity: pos.qty,
      entryPrice: pos.avg_entry_price,
      currentPrice: pos.current_price,
      unrealizedPnL: pos.unrealized_pl,
      unrealizedPnLPercent: pos.unrealized_plpc * 100
    }));

    console.log(`✅ [Alpaca] Synced:`, {
      accountValue: account.portfolio_value,
      cashBalance: account.cash,
      positionsCount: positions.length
    });

    return {
      accountValue: account.portfolio_value,
      cashBalance: account.cash,
      positions
    };
  } catch (error: any) {
    console.error(`❌ [Alpaca] Failed to sync agent:`, error.message);
    throw error;
  }
}
