/**
 * Market Context Analysis
 *
 * Provides macro-level market intelligence to AIs:
 * - S&P 500 (SPY) trend
 * - VIX volatility index
 * - Sector rotation signals
 * - Market regime detection
 */

import { fetchStockQuote } from './stock-api';
import type { Stock } from '@/types';

export interface MarketContext {
  spyTrend: {
    price: number;
    dailyChange: number;
    weekChange: number;
    monthChange: number;
    ma7: number;
    ma30: number;
    ma90: number;
    regime: 'bullish' | 'bearish' | 'neutral';
  };
  vix: {
    level: number;
    interpretation: 'low_volatility' | 'normal' | 'elevated' | 'high_fear' | 'extreme_fear';
    signal: 'risk_on' | 'cautious' | 'risk_off';
  };
  sectorRotation: {
    tech: SectorMetrics;
    financials: SectorMetrics;
    energy: SectorMetrics;
    healthcare: SectorMetrics;
    consumer: SectorMetrics;
    leadingSector: string;
    laggingSector: string;
  };
  marketSummary: string;
}

export interface SectorMetrics {
  avgChange: number;
  avgWeekTrend: number;
  avgMonthTrend: number;
  relativeStrength: number;
  status: 'leading' | 'inline' | 'lagging';
}

const SECTOR_MAPPING = {
  tech: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'],
  financials: ['JPM', 'BAC', 'V', 'MA'],
  energy: ['XOM', 'CVX'],
  healthcare: ['UNH', 'JNJ', 'LLY'],
  consumer: ['WMT', 'PG', 'KO', 'COST'],
};

/**
 * Fetch and analyze S&P 500 index trend
 */
export async function fetchSPYTrend(historicalPrices?: any[]): Promise<MarketContext['spyTrend']> {
  try {
    const spy = await fetchStockQuote('SPY');

    // Calculate moving averages from historical data if available
    let ma7 = spy.price;
    let ma30 = spy.price;
    let ma90 = spy.price;
    let weekChange = 0;
    let monthChange = 0;

    if (historicalPrices && historicalPrices.length > 0) {
      const sevenDayPrices = historicalPrices.slice(-7);
      const thirtyDayPrices = historicalPrices.slice(-30);
      const ninetyDayPrices = historicalPrices.slice(-90);

      if (sevenDayPrices.length > 0) {
        ma7 = sevenDayPrices.reduce((a: number, b: number) => a + b, 0) / sevenDayPrices.length;
        weekChange = ((spy.price - sevenDayPrices[0]) / sevenDayPrices[0]) * 100;
      }
      if (thirtyDayPrices.length > 0) {
        ma30 = thirtyDayPrices.reduce((a: number, b: number) => a + b, 0) / thirtyDayPrices.length;
        monthChange = ((spy.price - thirtyDayPrices[0]) / thirtyDayPrices[0]) * 100;
      }
      if (ninetyDayPrices.length > 0) {
        ma90 = ninetyDayPrices.reduce((a: number, b: number) => a + b, 0) / ninetyDayPrices.length;
      }
    }

    // Determine market regime
    let regime: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    const priceAboveMA30 = spy.price > ma30;
    const priceAboveMA90 = spy.price > ma90;
    const ma30AboveMA90 = ma30 > ma90;

    if (priceAboveMA30 && priceAboveMA90 && ma30AboveMA90) {
      regime = 'bullish';
    } else if (!priceAboveMA30 && !priceAboveMA90 && !ma30AboveMA90) {
      regime = 'bearish';
    }

    return {
      price: spy.price,
      dailyChange: spy.changePercent,
      weekChange,
      monthChange,
      ma7,
      ma30,
      ma90,
      regime,
    };
  } catch (error) {
    console.error('Error fetching SPY trend:', error);
    // Return neutral defaults
    return {
      price: 500,
      dailyChange: 0,
      weekChange: 0,
      monthChange: 0,
      ma7: 500,
      ma30: 500,
      ma90: 500,
      regime: 'neutral',
    };
  }
}

/**
 * Fetch and interpret VIX volatility index
 */
export async function fetchVIX(): Promise<MarketContext['vix']> {
  try {
    const vix = await fetchStockQuote('VIX');
    const level = vix.price;

    let interpretation: MarketContext['vix']['interpretation'];
    let signal: MarketContext['vix']['signal'];

    if (level < 12) {
      interpretation = 'low_volatility';
      signal = 'risk_on';
    } else if (level < 16) {
      interpretation = 'normal';
      signal = 'risk_on';
    } else if (level < 20) {
      interpretation = 'elevated';
      signal = 'cautious';
    } else if (level < 30) {
      interpretation = 'high_fear';
      signal = 'risk_off';
    } else {
      interpretation = 'extreme_fear';
      signal = 'risk_off';
    }

    return { level, interpretation, signal };
  } catch (error) {
    console.error('Error fetching VIX:', error);
    // Return normal defaults
    return {
      level: 15,
      interpretation: 'normal',
      signal: 'risk_on',
    };
  }
}

/**
 * Calculate sector rotation signals
 */
export function calculateSectorRotation(stocks: Stock[], spyTrend: MarketContext['spyTrend']): MarketContext['sectorRotation'] {
  const sectors: Record<string, SectorMetrics> = {};

  // Calculate metrics for each sector
  for (const [sectorName, symbols] of Object.entries(SECTOR_MAPPING)) {
    const sectorStocks = stocks.filter(s => symbols.includes(s.symbol));

    if (sectorStocks.length === 0) {
      sectors[sectorName] = {
        avgChange: 0,
        avgWeekTrend: 0,
        avgMonthTrend: 0,
        relativeStrength: 0,
        status: 'inline',
      };
      continue;
    }

    const avgChange = sectorStocks.reduce((sum, s) => sum + s.changePercent, 0) / sectorStocks.length;
    const avgWeekTrend = sectorStocks.reduce((sum, s) => sum + (s.weekTrend || 0), 0) / sectorStocks.length;
    const avgMonthTrend = sectorStocks.reduce((sum, s) => sum + (s.monthTrend || 0), 0) / sectorStocks.length;

    // Relative strength vs SPY
    const relativeStrength = avgMonthTrend - spyTrend.monthChange;

    let status: SectorMetrics['status'] = 'inline';
    if (relativeStrength > 2) {
      status = 'leading';
    } else if (relativeStrength < -2) {
      status = 'lagging';
    }

    sectors[sectorName] = {
      avgChange,
      avgWeekTrend,
      avgMonthTrend,
      relativeStrength,
      status,
    };
  }

  // Find leading and lagging sectors
  const sectorEntries = Object.entries(sectors);
  const sortedByRS = sectorEntries.sort((a, b) => b[1].relativeStrength - a[1].relativeStrength);

  const leadingSector = sortedByRS[0][0];
  const laggingSector = sortedByRS[sortedByRS.length - 1][0];

  return {
    tech: sectors.tech,
    financials: sectors.financials,
    energy: sectors.energy,
    healthcare: sectors.healthcare,
    consumer: sectors.consumer,
    leadingSector,
    laggingSector,
  };
}

/**
 * Calculate relative strength for each stock vs market
 */
export function calculateRelativeStrength(stocks: Stock[], spyTrend: MarketContext['spyTrend']): Stock[] {
  return stocks.map(stock => ({
    ...stock,
    relativeStrength: (stock.monthTrend || 0) - spyTrend.monthChange,
    relativeStrengthWeek: (stock.weekTrend || 0) - spyTrend.weekChange,
  }));
}

/**
 * Get complete market context for AI decision-making
 */
export async function getMarketContext(stocks: Stock[], historicalSPYPrices?: any[]): Promise<MarketContext> {
  console.log('📊 Analyzing market context...');

  // Fetch market indicators
  const [spyTrend, vix] = await Promise.all([
    fetchSPYTrend(historicalSPYPrices),
    fetchVIX(),
  ]);

  // Calculate sector rotation
  const sectorRotation = calculateSectorRotation(stocks, spyTrend);

  // Generate market summary
  const marketSummary = generateMarketSummary(spyTrend, vix, sectorRotation);

  console.log(`  SPY: ${spyTrend.regime.toUpperCase()} (${spyTrend.dailyChange >= 0 ? '+' : ''}${spyTrend.dailyChange.toFixed(2)}% today, ${spyTrend.monthChange >= 0 ? '+' : ''}${spyTrend.monthChange.toFixed(2)}% month)`);
  console.log(`  VIX: ${vix.level.toFixed(1)} (${vix.interpretation}) → ${vix.signal.toUpperCase()}`);

  const leadingSectorData = sectorRotation[sectorRotation.leadingSector as 'tech' | 'financials' | 'energy' | 'healthcare' | 'consumer'];
  const laggingSectorData = sectorRotation[sectorRotation.laggingSector as 'tech' | 'financials' | 'energy' | 'healthcare' | 'consumer'];

  console.log(`  Leading Sector: ${sectorRotation.leadingSector.toUpperCase()} (+${leadingSectorData.relativeStrength.toFixed(1)}% vs SPY)`);
  console.log(`  Lagging Sector: ${sectorRotation.laggingSector.toUpperCase()} (${laggingSectorData.relativeStrength.toFixed(1)}% vs SPY)\n`);

  return {
    spyTrend,
    vix,
    sectorRotation,
    marketSummary,
  };
}

/**
 * Generate human-readable market summary
 */
function generateMarketSummary(
  spyTrend: MarketContext['spyTrend'],
  vix: MarketContext['vix'],
  sectorRotation: MarketContext['sectorRotation']
): string {
  const parts = [];

  // Market regime
  parts.push(`Market is ${spyTrend.regime.toUpperCase()}`);

  // Trend
  if (spyTrend.monthChange > 5) {
    parts.push('with strong upward momentum');
  } else if (spyTrend.monthChange > 2) {
    parts.push('with moderate upward momentum');
  } else if (spyTrend.monthChange < -5) {
    parts.push('with strong downward pressure');
  } else if (spyTrend.monthChange < -2) {
    parts.push('with moderate downward pressure');
  } else {
    parts.push('trading sideways');
  }

  // Volatility
  parts.push(`Volatility is ${vix.interpretation.replace('_', ' ')} (VIX ${vix.level.toFixed(0)})`);

  // Sector rotation
  parts.push(`${sectorRotation.leadingSector} leading, ${sectorRotation.laggingSector} lagging`);

  return parts.join('. ') + '.';
}
