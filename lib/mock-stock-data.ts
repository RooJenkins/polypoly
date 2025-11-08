import type { Stock } from '@/types';
import { TOP_20_STOCKS } from './constants';

// Base prices for S&P 500 stocks (approximate real values)
const BASE_PRICES: Record<string, number> = {
  'AAPL': 185.00,
  'MSFT': 378.00,
  'NVDA': 485.00,
  'AMZN': 145.00,
  'META': 325.00,
  'GOOGL': 140.00,
  'TSLA': 242.00,
  'BRK.B': 365.00,
  'V': 255.00,
  'JPM': 158.00,
  'WMT': 165.00,
  'MA': 405.00,
  'UNH': 525.00,
  'JNJ': 158.00,
  'PG': 152.00,
  'XOM': 112.00,
  'HD': 335.00,
  'BAC': 32.50,
  'CVX': 155.00,
  'KO': 58.50,
};

// Store last prices to create realistic movement
const lastPrices: Map<string, { price: number; timestamp: number }> = new Map();

/**
 * Generate realistic stock prices with slight variations
 * This simulates real market movement when API keys aren't available
 */
export function generateMockStockPrices(): Stock[] {
  const now = Date.now();

  return TOP_20_STOCKS.map((stock) => {
    const basePrice = BASE_PRICES[stock.symbol] || 100;

    // Get or initialize last price
    let lastData = lastPrices.get(stock.symbol);
    if (!lastData) {
      lastData = { price: basePrice, timestamp: now };
      lastPrices.set(stock.symbol, lastData);
    }

    // Time since last update (in minutes)
    const timeDiff = (now - lastData.timestamp) / (1000 * 60);

    // Generate random price movement (-2% to +2% per update)
    // More realistic: smaller movements most of the time
    const randomFactor = (Math.random() - 0.5) * 0.04; // -2% to +2%
    const volatility = stock.symbol === 'TSLA' || stock.symbol === 'NVDA' ? 1.5 : 1.0;

    const newPrice = lastData.price * (1 + randomFactor * volatility);
    const change = newPrice - lastData.price;
    const changePercent = (change / lastData.price) * 100;

    // Update stored price
    lastPrices.set(stock.symbol, { price: newPrice, timestamp: now });

    return {
      symbol: stock.symbol,
      name: stock.name,
      price: parseFloat(newPrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
    };
  });
}

/**
 * Reset prices to base values (useful for testing)
 */
export function resetMockPrices() {
  lastPrices.clear();
}
