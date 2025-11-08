/**
 * Broker Integration Types
 *
 * Common interface for all trading brokers
 */

export interface ExecutionResult {
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

export interface BrokerPosition {
  symbol: string;
  name: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface BrokerAccount {
  accountValue: number;
  cashBalance: number;
  positions: BrokerPosition[];
}

export interface BrokerConfig {
  apiKey: string;
  secretKey: string;
  paper?: boolean;
  additionalConfig?: Record<string, any>;
}

/**
 * Standard interface that all brokers must implement
 */
export interface IBroker {
  name: string;

  /**
   * Execute a buy order
   */
  executeBuy(symbol: string, quantity: number, agentId: string): Promise<ExecutionResult>;

  /**
   * Execute a sell order
   */
  executeSell(symbol: string, quantity: number, agentId: string): Promise<ExecutionResult>;

  /**
   * Get account information and positions
   */
  getAccount(): Promise<BrokerAccount>;

  /**
   * Check if market is open
   */
  isMarketOpen(): Promise<boolean>;

  /**
   * Cancel all open orders
   */
  cancelAllOrders(): Promise<void>;
}

/**
 * Supported broker types
 */
export type BrokerType = 'alpaca' | 'tradier' | 'webull' | 'schwab' | 'interactive-brokers' | 'simulation';
