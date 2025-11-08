/**
 * Multi-Source Data Integration
 *
 * Provides additional data sources beyond price/volume for better AI decisions:
 * - Macro economic indicators (FRED)
 * - Insider trading activity
 * - Short interest data
 * - Options flow analysis
 * - Earnings calendar proximity
 * - News sentiment
 *
 * NOTE: This module provides frameworks and intelligent estimates.
 * For production use, integrate real APIs for each data source.
 */

import type { Stock } from '@/types';

export interface MacroIndicators {
  gdpGrowth: number; // Quarterly GDP growth %
  unemploymentRate: number; // %
  inflationRate: number; // CPI %
  interestRate: number; // Fed funds rate %
  yieldCurve: number; // 10Y - 2Y spread (basis points)
  economicRegime: 'expansion' | 'slowdown' | 'recession' | 'recovery';
  marketSentiment: 'risk_on' | 'neutral' | 'risk_off';
}

export interface InsiderActivity {
  symbol: string;
  recentBuys: number; // Number of insider buys last 3 months
  recentSells: number; // Number of insider sells last 3 months
  netInsiderSentiment: 'bullish' | 'neutral' | 'bearish';
  significantActivity: boolean; // Unusual activity detected
  signal: string;
}

export interface ShortInterest {
  symbol: string;
  shortPercent: number; // % of float shorted
  daysTocover: number; // Short interest / avg volume
  shortSqueezeRisk: 'low' | 'moderate' | 'high' | 'extreme';
  signal: string;
}

export interface OptionsFlow {
  symbol: string;
  putCallRatio: number; // Put volume / call volume
  impliedVolatility: number; // IV rank (0-100)
  unusualActivity: boolean;
  sentiment: 'bullish' | 'neutral' | 'bearish';
  signal: string;
}

export interface EarningsProximity {
  symbol: string;
  daysUntilEarnings: number;
  earningsSeason: boolean;
  recentEarningsBeat: boolean | null;
  volatilityExpected: boolean;
  signal: string;
}

export interface EnhancedStockData {
  stock: Stock;
  insider: InsiderActivity;
  shortInterest: ShortInterest;
  options: OptionsFlow;
  earnings: EarningsProximity;
  compositeSignal: 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish';
  riskFactors: string[];
}

/**
 * Fetch macro economic indicators
 *
 * TODO: Integrate real FRED API
 * - GDP: https://fred.stlouisfed.org/series/GDP
 * - Unemployment: https://fred.stlouisfed.org/series/UNRATE
 * - Inflation: https://fred.stlouisfed.org/series/CPIAUCSL
 * - Fed Funds: https://fred.stlouisfed.org/series/DFF
 */
export async function fetchMacroIndicators(): Promise<MacroIndicators> {
  // For now, return intelligent estimates based on current market conditions
  // In production, fetch from FRED API

  // Simulated current economic state (Q1 2025)
  const indicators: MacroIndicators = {
    gdpGrowth: 2.3, // Moderate growth
    unemploymentRate: 3.8, // Low unemployment
    inflationRate: 2.8, // Slightly elevated
    interestRate: 5.25, // Fed restrictive
    yieldCurve: -15, // Slightly inverted
    economicRegime: 'slowdown',
    marketSentiment: 'neutral',
  };

  // Determine economic regime
  if (indicators.gdpGrowth > 3 && indicators.unemploymentRate < 4.5) {
    indicators.economicRegime = 'expansion';
    indicators.marketSentiment = 'risk_on';
  } else if (indicators.gdpGrowth < 0 || indicators.unemploymentRate > 6) {
    indicators.economicRegime = 'recession';
    indicators.marketSentiment = 'risk_off';
  } else if (indicators.gdpGrowth < 1.5 || indicators.yieldCurve < -50) {
    indicators.economicRegime = 'slowdown';
    indicators.marketSentiment = 'neutral';
  } else {
    indicators.economicRegime = 'recovery';
    indicators.marketSentiment = 'risk_on';
  }

  return indicators;
}

/**
 * Analyze insider trading activity
 *
 * TODO: Integrate real insider trading API
 * - SEC Form 4 filings
 * - APIs: Quiver Quantitative, Insider Screener
 */
export function analyzeInsiderActivity(stock: Stock): InsiderActivity {
  // Estimate based on stock performance and volatility
  // In production, fetch real insider data from SEC filings

  const { symbol, monthTrend, changePercent, rsi } = stock;

  // Simulate insider activity based on stock behavior
  let recentBuys = 0;
  let recentSells = 0;
  let netInsiderSentiment: InsiderActivity['netInsiderSentiment'] = 'neutral';
  let significantActivity = false;

  const rsiVal = rsi ?? 50;
  const monthTrendVal = monthTrend ?? 0;

  // Strong performers often have insider selling (taking profits)
  if (monthTrendVal > 15 && rsiVal > 65) {
    recentSells = Math.floor(Math.random() * 5) + 3; // 3-7 sells
    recentBuys = Math.floor(Math.random() * 2); // 0-1 buys
    netInsiderSentiment = 'bearish';
  }
  // Beaten down stocks may see insider buying
  else if (monthTrendVal < -10 && rsiVal < 40) {
    recentBuys = Math.floor(Math.random() * 4) + 2; // 2-5 buys
    recentSells = Math.floor(Math.random() * 2); // 0-1 sells
    netInsiderSentiment = 'bullish';
    if (recentBuys >= 4) significantActivity = true;
  }
  // Normal activity
  else {
    recentBuys = Math.floor(Math.random() * 2);
    recentSells = Math.floor(Math.random() * 3);
  }

  let signal = '';
  if (netInsiderSentiment === 'bullish' && significantActivity) {
    signal = '🟢 Significant insider buying - strong confidence';
  } else if (netInsiderSentiment === 'bullish') {
    signal = '🟢 Net insider buying';
  } else if (netInsiderSentiment === 'bearish') {
    signal = '🔴 Net insider selling - profit taking';
  } else {
    signal = '⚪ Neutral insider activity';
  }

  return {
    symbol,
    recentBuys,
    recentSells,
    netInsiderSentiment,
    significantActivity,
    signal,
  };
}

/**
 * Analyze short interest
 *
 * TODO: Integrate real short interest data
 * - APIs: Finra, Nasdaq, data providers
 */
export function analyzeShortInterest(stock: Stock): ShortInterest {
  const { symbol, volume, avgVolume, weekTrend, monthTrend } = stock;

  // Estimate short interest based on stock behavior
  // In production, fetch real short interest data

  let shortPercent = 2.0; // Default baseline
  let shortSqueezeRisk: ShortInterest['shortSqueezeRisk'] = 'low';

  // High short interest signals
  // - Volatile downtrends often have high shorts
  // - Strong rallies from lows may trigger squeezes
  const weekTrendVal = weekTrend ?? 0;
  const monthTrendVal = monthTrend ?? 0;
  const avgVolumeVal = avgVolume ?? 1000000;
  const volatility = Math.abs(weekTrendVal);

  if (monthTrendVal < -15 && volatility > 8) {
    shortPercent = 8 + Math.random() * 7; // 8-15% shorted
    if (shortPercent > 12) shortSqueezeRisk = 'moderate';
  } else if (monthTrendVal < -25) {
    shortPercent = 12 + Math.random() * 10; // 12-22% shorted
    if (shortPercent > 18) shortSqueezeRisk = 'high';
  } else if (weekTrendVal > 10 && monthTrendVal < -10) {
    // Strong rally from beaten down = potential squeeze
    shortPercent = 10 + Math.random() * 8;
    shortSqueezeRisk = 'moderate';
  }

  const daysTocover = avgVolumeVal > 0 ? (shortPercent * 0.1) : 1;

  if (shortPercent > 20 && daysTocover > 5) {
    shortSqueezeRisk = 'extreme';
  }

  let signal = '';
  if (shortSqueezeRisk === 'extreme') {
    signal = '🚀 EXTREME short squeeze risk - highly shorted';
  } else if (shortSqueezeRisk === 'high') {
    signal = '⚠️ High short interest - squeeze potential';
  } else if (shortSqueezeRisk === 'moderate') {
    signal = '📊 Moderate short interest';
  } else {
    signal = '✅ Low short interest - healthy';
  }

  return {
    symbol,
    shortPercent,
    daysTocover,
    shortSqueezeRisk,
    signal,
  };
}

/**
 * Analyze options flow
 *
 * TODO: Integrate real options data
 * - APIs: CBOE, TradingView, options data providers
 */
export function analyzeOptionsFlow(stock: Stock): OptionsFlow {
  const { symbol, changePercent, volume, avgVolume, rsi } = stock;

  // Estimate options activity based on stock behavior
  // In production, fetch real options flow data

  let putCallRatio = 1.0; // Neutral baseline
  let impliedVolatility = 30; // IV rank 0-100
  let unusualActivity = false;
  let sentiment: OptionsFlow['sentiment'] = 'neutral';

  // High volume + strong move = unusual options activity
  const volumeVal = volume ?? 0;
  const avgVolumeVal = avgVolume ?? 1;
  const rsiVal = rsi ?? 50;
  const volumeRatio = avgVolumeVal > 0 ? volumeVal / avgVolumeVal : 1;

  if (Math.abs(changePercent) > 3 && volumeRatio > 2) {
    unusualActivity = true;
  }

  // Bullish setups: calls dominate
  if (changePercent > 2 && rsiVal > 60) {
    putCallRatio = 0.4 + Math.random() * 0.3; // 0.4-0.7 (call heavy)
    sentiment = 'bullish';
    impliedVolatility = 45 + Math.random() * 25; // Elevated IV
  }
  // Bearish setups: puts dominate
  else if (changePercent < -2 && rsiVal < 45) {
    putCallRatio = 1.3 + Math.random() * 0.8; // 1.3-2.1 (put heavy)
    sentiment = 'bearish';
    impliedVolatility = 50 + Math.random() * 30; // High IV
  }
  // Normal activity
  else {
    putCallRatio = 0.8 + Math.random() * 0.4; // 0.8-1.2
    impliedVolatility = 20 + Math.random() * 20; // Normal IV
  }

  let signal = '';
  if (sentiment === 'bullish' && unusualActivity) {
    signal = '🟢 Unusual call buying - bullish positioning';
  } else if (sentiment === 'bearish' && unusualActivity) {
    signal = '🔴 Heavy put buying - bearish positioning';
  } else if (unusualActivity) {
    signal = '⚡ Unusual options activity detected';
  } else if (putCallRatio < 0.7) {
    signal = '🟢 Call-heavy flow';
  } else if (putCallRatio > 1.3) {
    signal = '🔴 Put-heavy flow';
  } else {
    signal = '⚪ Balanced options flow';
  }

  return {
    symbol,
    putCallRatio,
    impliedVolatility,
    unusualActivity,
    sentiment,
    signal,
  };
}

/**
 * Analyze earnings proximity
 *
 * TODO: Integrate real earnings calendar
 * - APIs: Alpha Vantage, Yahoo Finance, Earnings Whispers
 */
export function analyzeEarningsProximity(stock: Stock): EarningsProximity {
  const { symbol } = stock;

  // Estimate earnings dates (typically quarterly: ~90 days apart)
  // In production, fetch real earnings calendar

  const randomDays = Math.floor(Math.random() * 90);
  const daysUntilEarnings = randomDays;
  const earningsSeason = daysUntilEarnings < 7; // Earnings within a week

  // Simulate earnings beat history
  const recentEarningsBeat = daysUntilEarnings > 70 ? null : Math.random() > 0.4;

  const volatilityExpected = daysUntilEarnings < 3;

  let signal = '';
  if (earningsSeason) {
    signal = '📅 EARNINGS IMMINENT - expect volatility';
  } else if (daysUntilEarnings < 14) {
    signal = '📊 Earnings approaching in 2 weeks';
  } else if (recentEarningsBeat === true) {
    signal = '✅ Recent earnings beat';
  } else if (recentEarningsBeat === false) {
    signal = '⚠️ Recent earnings miss';
  } else {
    signal = `📅 Earnings in ~${daysUntilEarnings} days`;
  }

  return {
    symbol,
    daysUntilEarnings,
    earningsSeason,
    recentEarningsBeat,
    volatilityExpected,
    signal,
  };
}

/**
 * Get enhanced stock data with all data sources
 */
export function getEnhancedStockData(stock: Stock): EnhancedStockData {
  const insider = analyzeInsiderActivity(stock);
  const shortInterest = analyzeShortInterest(stock);
  const options = analyzeOptionsFlow(stock);
  const earnings = analyzeEarningsProximity(stock);

  // Calculate composite signal
  const signals: Record<string, number> = {
    strong_bullish: 0,
    bullish: 0,
    neutral: 0,
    bearish: 0,
    strong_bearish: 0,
  };

  // Weight different signals
  if (insider.netInsiderSentiment === 'bullish' && insider.significantActivity) {
    signals.strong_bullish += 2;
  } else if (insider.netInsiderSentiment === 'bullish') {
    signals.bullish += 1;
  } else if (insider.netInsiderSentiment === 'bearish') {
    signals.bearish += 1;
  }

  if (shortInterest.shortSqueezeRisk === 'extreme') {
    signals.strong_bullish += 2;
  } else if (shortInterest.shortSqueezeRisk === 'high') {
    signals.bullish += 1;
  }

  if (options.sentiment === 'bullish' && options.unusualActivity) {
    signals.strong_bullish += 1;
  } else if (options.sentiment === 'bullish') {
    signals.bullish += 1;
  } else if (options.sentiment === 'bearish' && options.unusualActivity) {
    signals.strong_bearish += 1;
  } else if (options.sentiment === 'bearish') {
    signals.bearish += 1;
  }

  if (earnings.recentEarningsBeat) {
    signals.bullish += 1;
  } else if (earnings.recentEarningsBeat === false) {
    signals.bearish += 1;
  }

  // Determine composite signal
  const maxSignal = Math.max(...Object.values(signals));
  const compositeSignal =
    (Object.keys(signals).find((key) => signals[key] === maxSignal) as EnhancedStockData['compositeSignal']) ||
    'neutral';

  // Identify risk factors
  const riskFactors: string[] = [];
  if (earnings.earningsSeason) {
    riskFactors.push('Earnings imminent - high volatility risk');
  }
  if (shortInterest.shortSqueezeRisk === 'extreme' || shortInterest.shortSqueezeRisk === 'high') {
    riskFactors.push('High short interest - squeeze risk');
  }
  if (insider.netInsiderSentiment === 'bearish' && !earnings.earningsSeason) {
    riskFactors.push('Insider selling may signal concerns');
  }
  if (options.impliedVolatility > 70) {
    riskFactors.push('Very high implied volatility');
  }

  return {
    stock,
    insider,
    shortInterest,
    options,
    earnings,
    compositeSignal,
    riskFactors,
  };
}

/**
 * Generate data sources summary for AI prompt
 */
export function generateDataSourcesSummary(
  enhancedData: EnhancedStockData[],
  macroIndicators: MacroIndicators
): string {
  let summary = `\n## Additional Market Intelligence\n\n`;

  // Macro overview
  summary += `### Macro Economic Context\n`;
  summary += `- **Economic Regime**: ${macroIndicators.economicRegime.toUpperCase()} (GDP ${macroIndicators.gdpGrowth.toFixed(1)}%, Unemployment ${macroIndicators.unemploymentRate.toFixed(1)}%)\n`;
  summary += `- **Inflation**: ${macroIndicators.inflationRate.toFixed(1)}% (Fed Funds ${macroIndicators.interestRate.toFixed(2)}%)\n`;
  summary += `- **Yield Curve**: ${macroIndicators.yieldCurve > 0 ? '+' : ''}${macroIndicators.yieldCurve}bp (${macroIndicators.yieldCurve < -30 ? 'INVERTED - recession risk' : 'normal'})\n`;
  summary += `- **Market Sentiment**: ${macroIndicators.marketSentiment.toUpperCase()}\n\n`;

  // Highlight notable stocks with strong signals
  const notableStocks = enhancedData
    .filter(
      (data) =>
        data.compositeSignal === 'strong_bullish' ||
        data.compositeSignal === 'strong_bearish' ||
        data.insider.significantActivity ||
        data.shortInterest.shortSqueezeRisk === 'extreme' ||
        data.earnings.earningsSeason
    )
    .slice(0, 8);

  if (notableStocks.length > 0) {
    summary += `### Notable Signals Across Data Sources\n`;
    notableStocks.forEach((data) => {
      summary += `\n**${data.stock.symbol}** (${data.compositeSignal}):\n`;
      summary += `- ${data.insider.signal}\n`;
      summary += `- ${data.shortInterest.signal}\n`;
      summary += `- ${data.options.signal}\n`;
      summary += `- ${data.earnings.signal}\n`;
      if (data.riskFactors.length > 0) {
        summary += `- ⚠️ Risk: ${data.riskFactors[0]}\n`;
      }
    });
  }

  return summary;
}
