/**
 * Realistic Trading Execution Module
 *
 * Simulates real-world trading constraints:
 * - Bid-ask spread (0.01-0.05%)
 * - Market hours (9:30am-4pm ET)
 * - Execution delays (100-500ms)
 * - Partial fills for large orders
 * - Commission ($0 for stocks, based on Robinhood/TD Ameritrade free trading)
 */

interface ExecutionConfig {
  enableBidAskSpread: boolean;
  enableMarketHours: boolean;
  enableExecutionDelay: boolean;
  enablePartialFills: boolean;
  enableCommission: boolean;
}

interface ExecutionResult {
  success: boolean;
  executedPrice: number;
  executedQuantity: number;
  commission: number;
  slippage: number;
  error?: string;
  executionTime: number; // milliseconds
}

const DEFAULT_CONFIG: ExecutionConfig = {
  enableBidAskSpread: true,
  enableMarketHours: true, // PRODUCTION MODE: Only trade during market hours
  enableExecutionDelay: true,
  enablePartialFills: true,
  enableCommission: true,
};

/**
 * Check if market is currently open (NYSE hours: 9:25am-4:00pm ET)
 * Bot starts at 9:25am to prepare for 9:30am market open
 */
export function isMarketOpen(date: Date = new Date()): boolean {
  // Convert to ET timezone
  const etTime = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));

  const day = etTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();

  // Check if weekend
  if (day === 0 || day === 6) {
    return false;
  }

  // Check if within trading hours (9:25am - 4:00pm ET)
  // 9:25am allows 5 minutes of prep before 9:30am market open
  const timeInMinutes = hours * 60 + minutes;
  const marketOpen = 9 * 60 + 25;  // 9:25am (5 min before official open)
  const marketClose = 16 * 60;      // 4:00pm

  return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
}

/**
 * Get time until market opens (in milliseconds)
 * Market opens at 9:25am ET for bot prep
 */
export function getTimeUntilMarketOpen(date: Date = new Date()): number {
  const etTime = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = etTime.getDay();
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();

  // If weekend, calculate days until Monday
  if (day === 0) { // Sunday
    const tomorrow = new Date(etTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 25, 0, 0); // 9:25am
    return tomorrow.getTime() - etTime.getTime();
  }

  if (day === 6) { // Saturday
    const monday = new Date(etTime);
    monday.setDate(monday.getDate() + 2);
    monday.setHours(9, 25, 0, 0); // 9:25am
    return monday.getTime() - etTime.getTime();
  }

  // Weekday - check if before market open
  const timeInMinutes = hours * 60 + minutes;
  const marketOpen = 9 * 60 + 25; // 9:25am

  if (timeInMinutes < marketOpen) {
    const today = new Date(etTime);
    today.setHours(9, 25, 0, 0); // 9:25am
    return today.getTime() - etTime.getTime();
  }

  // After market close - next trading day
  const tomorrow = new Date(etTime);
  tomorrow.setDate(tomorrow.getDate() + (day === 5 ? 3 : 1)); // If Friday, skip to Monday
  tomorrow.setHours(9, 25, 0, 0); // 9:25am
  return tomorrow.getTime() - etTime.getTime();
}

/**
 * Calculate bid-ask spread based on stock price and volatility
 * Typical spreads: 0.01-0.05% for liquid stocks
 */
function calculateSpread(price: number, symbol: string): number {
  // Base spread: 0.01% for large cap, 0.05% for small cap
  // Using symbol length as proxy for cap (shorter tickers = larger cap)
  const baseSpread = symbol.length <= 4 ? 0.0001 : 0.0003;

  // Add randomness to simulate market conditions
  const randomFactor = 0.5 + Math.random();

  return price * baseSpread * randomFactor;
}

/**
 * Simulate execution delay (100-500ms)
 */
async function simulateDelay(config: ExecutionConfig): Promise<number> {
  if (!config.enableExecutionDelay) {
    return 0;
  }

  const delay = 100 + Math.random() * 400; // 100-500ms
  await new Promise(resolve => setTimeout(resolve, delay));
  return delay;
}

/**
 * Calculate commission (currently $0 for stocks at most brokers)
 */
function calculateCommission(
  quantity: number,
  price: number,
  config: ExecutionConfig
): number {
  if (!config.enableCommission) {
    return 0;
  }

  // Most modern brokers: $0 commission for stocks
  // Options: ~$0.65 per contract (not implemented yet)
  return 0;
}

/**
 * Determine if order should be partially filled
 * Large orders (>$50k) may experience partial fills
 */
function calculatePartialFill(
  quantity: number,
  price: number,
  config: ExecutionConfig
): number {
  if (!config.enablePartialFills) {
    return quantity;
  }

  const orderValue = quantity * price;

  // Orders under $50k: always fill completely
  if (orderValue < 50000) {
    return quantity;
  }

  // Orders over $50k: 80-100% fill rate
  const fillRate = 0.8 + Math.random() * 0.2;
  return Math.floor(quantity * fillRate);
}

/**
 * Execute a buy order with realistic constraints
 */
export async function executeBuy(
  symbol: string,
  quantity: number,
  marketPrice: number,
  config: ExecutionConfig = DEFAULT_CONFIG
): Promise<ExecutionResult> {
  const startTime = Date.now();

  // 1. Check market hours
  if (config.enableMarketHours && !isMarketOpen()) {
    return {
      success: false,
      executedPrice: 0,
      executedQuantity: 0,
      commission: 0,
      slippage: 0,
      error: 'Market is closed. Trading hours: 9:30am-4:00pm ET, Monday-Friday',
      executionTime: Date.now() - startTime,
    };
  }

  // 2. Simulate execution delay
  const delay = await simulateDelay(config);

  // 3. Apply bid-ask spread (buy at ask, which is higher)
  const spread = config.enableBidAskSpread ? calculateSpread(marketPrice, symbol) : 0;
  const executedPrice = marketPrice + spread;

  // 4. Check for partial fills
  const executedQuantity = calculatePartialFill(quantity, marketPrice, config);

  // 5. Calculate commission
  const commission = calculateCommission(executedQuantity, executedPrice, config);

  // 6. Calculate slippage
  const slippage = (executedPrice - marketPrice) * executedQuantity;

  return {
    success: true,
    executedPrice,
    executedQuantity,
    commission,
    slippage,
    executionTime: Date.now() - startTime,
  };
}

/**
 * Execute a sell order with realistic constraints
 */
export async function executeSell(
  symbol: string,
  quantity: number,
  marketPrice: number,
  config: ExecutionConfig = DEFAULT_CONFIG
): Promise<ExecutionResult> {
  const startTime = Date.now();

  // 1. Check market hours
  if (config.enableMarketHours && !isMarketOpen()) {
    return {
      success: false,
      executedPrice: 0,
      executedQuantity: 0,
      commission: 0,
      slippage: 0,
      error: 'Market is closed. Trading hours: 9:30am-4:00pm ET, Monday-Friday',
      executionTime: Date.now() - startTime,
    };
  }

  // 2. Simulate execution delay
  const delay = await simulateDelay(config);

  // 3. Apply bid-ask spread (sell at bid, which is lower)
  const spread = config.enableBidAskSpread ? calculateSpread(marketPrice, symbol) : 0;
  const executedPrice = marketPrice - spread;

  // 4. Check for partial fills
  const executedQuantity = calculatePartialFill(quantity, marketPrice, config);

  // 5. Calculate commission
  const commission = calculateCommission(executedQuantity, executedPrice, config);

  // 6. Calculate slippage (negative because selling lower than market)
  const slippage = (marketPrice - executedPrice) * executedQuantity;

  return {
    success: true,
    executedPrice,
    executedQuantity,
    commission,
    slippage,
    executionTime: Date.now() - startTime,
  };
}

/**
 * Get market status info
 */
export function getMarketStatus(): {
  isOpen: boolean;
  nextOpen: Date;
  timeUntilOpen: number;
  currentTime: Date;
} {
  const now = new Date();
  const isOpen = isMarketOpen(now);
  const timeUntilOpen = getTimeUntilMarketOpen(now);

  const nextOpen = new Date(now.getTime() + timeUntilOpen);

  return {
    isOpen,
    nextOpen,
    timeUntilOpen,
    currentTime: now,
  };
}

/**
 * Format time duration
 */
export function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}
