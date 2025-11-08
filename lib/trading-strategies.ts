/**
 * Trading Strategies for AI Agents
 *
 * Each AI agent has a distinct trading strategy optimized for different market conditions:
 * - GPT-4o Mini: Momentum Breakout
 * - Claude Haiku: Mean Reversion
 * - Gemini Flash: Trend Following
 * - DeepSeek: Value Quality
 * - Qwen: Volatility Arbitrage
 * - Grok: Contrarian Sentiment
 */

import type { Stock } from '@/types';
import type { MarketContext } from './market-context';
import type { PortfolioMetrics } from './portfolio-intelligence';

export type StrategyType =
  | 'momentum_breakout'
  | 'mean_reversion'
  | 'trend_following'
  | 'value_quality'
  | 'volatility_arbitrage'
  | 'contrarian_sentiment';

export interface StrategyConfig {
  name: string;
  type: StrategyType;
  description: string;
  holdingPeriod: string;
  idealMarketConditions: string[];
  keyIndicators: string[];
  entrySignals: string[];
  exitSignals: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
}

export interface StrategySignal {
  symbol: string;
  signal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' | 'neutral';
  confidence: number;
  reasoning: string;
  keyMetrics: Record<string, number>;
}

/**
 * Strategy configurations for each AI agent
 */
export const STRATEGY_CONFIGS: Record<string, StrategyConfig> = {
  'gpt-4o-mini': {
    name: 'Momentum Breakout',
    type: 'momentum_breakout',
    description: 'Capitalize on explosive price moves with volume confirmation',
    holdingPeriod: '1-3 days',
    idealMarketConditions: ['bullish', 'high_volatility', 'trending'],
    keyIndicators: ['MA crossovers', 'Volume surges', 'RSI momentum', 'Price breakouts'],
    entrySignals: [
      'Price breaks above 7-day MA with 2x avg volume',
      'RSI crosses above 60 (momentum building)',
      'Daily gain > 3% with strong sector support',
    ],
    exitSignals: [
      'Price closes below 7-day MA',
      'Volume dries up (< 0.5x avg)',
      'RSI enters overbought (> 75)',
      'Quick 5-7% profit target hit',
    ],
    riskTolerance: 'aggressive',
  },

  'claude-haiku': {
    name: 'Mean Reversion',
    type: 'mean_reversion',
    description: 'Buy oversold quality names, sell when they normalize',
    holdingPeriod: '3-7 days',
    idealMarketConditions: ['neutral', 'low_volatility', 'range_bound'],
    keyIndicators: ['RSI oversold', 'Bollinger bands', 'Price vs MA', 'Volatility contraction'],
    entrySignals: [
      'RSI < 30 (oversold) on quality stock',
      'Price touches lower Bollinger band',
      'Down > 5% in week without negative news',
      'Strong sector fundamentals intact',
    ],
    exitSignals: [
      'RSI returns to 50-60 (normalized)',
      'Price reaches middle Bollinger band',
      '3-5% profit target achieved',
      'Position held > 7 days without recovery',
    ],
    riskTolerance: 'moderate',
  },

  'gemini-flash': {
    name: 'Trend Following',
    type: 'trend_following',
    description: 'Ride strong multi-week trends until they break',
    holdingPeriod: '1-4 weeks',
    idealMarketConditions: ['bullish', 'trending', 'sector_rotation'],
    keyIndicators: ['MA alignment', 'Higher highs/lows', 'Relative strength', '52-week proximity'],
    entrySignals: [
      'Price > MA7 > MA30 (aligned uptrend)',
      'Making new 20-day highs',
      'Relative strength > +3% vs SPY (outperforming)',
      'Leading sector momentum',
    ],
    exitSignals: [
      'Price closes below MA30 (trend break)',
      'Relative strength turns negative',
      'Market regime shifts bearish',
      '10-15% profit target or trailing stop hit',
    ],
    riskTolerance: 'moderate',
  },

  'deepseek': {
    name: 'Value Quality',
    type: 'value_quality',
    description: 'Patient capital allocation to undervalued quality names',
    holdingPeriod: '2-8 weeks',
    idealMarketConditions: ['neutral', 'bearish_recovery', 'low_volatility'],
    keyIndicators: ['Price dips', 'Earnings quality', 'Sector fundamentals', 'Risk/reward'],
    entrySignals: [
      'Pullback > 8% from recent highs',
      'Still above MA90 (long-term uptrend intact)',
      'Strong sector fundamentals',
      'Low portfolio concentration in sector',
    ],
    exitSignals: [
      'Price recovers to prior highs',
      'Fundamental deterioration',
      '12-20% profit target achieved',
      'Better opportunity emerges (rebalance)',
    ],
    riskTolerance: 'conservative',
  },

  'qwen': {
    name: 'Volatility Arbitrage',
    type: 'volatility_arbitrage',
    description: 'Exploit volatility spikes and contractions',
    holdingPeriod: '1-2 days',
    idealMarketConditions: ['high_volatility', 'mean_reversion', 'vix_extremes'],
    keyIndicators: ['VIX levels', 'Implied volatility', 'Volatility rank', 'Fear/greed'],
    entrySignals: [
      'VIX spike > 20 (fear elevated)',
      'Stock down > 4% on broad selloff',
      'Quality name with no stock-specific issues',
      'RSI < 35 (oversold in panic)',
    ],
    exitSignals: [
      'VIX normalizes < 18',
      'Quick 3-5% bounce captured',
      'Next trading day (quick flip)',
      'Volatility remains elevated > 2 days',
    ],
    riskTolerance: 'aggressive',
  },

  'grok': {
    name: 'Contrarian Sentiment',
    type: 'contrarian_sentiment',
    description: 'Fade extreme sentiment, buy fear, sell greed',
    holdingPeriod: '1-2 weeks',
    idealMarketConditions: ['sentiment_extremes', 'oversold_quality', 'catalyst_potential'],
    keyIndicators: ['Sentiment extremes', 'Analyst revisions', 'Short interest', 'Put/call ratios'],
    entrySignals: [
      'Extreme negative sentiment on quality stock',
      'Down > 10% in month on overreaction',
      'Upcoming catalyst (earnings, product launch)',
      'Contrasts with sector strength',
    ],
    exitSignals: [
      'Sentiment normalizes',
      'Analyst upgrades emerge',
      'Stock recovers 50% of decline',
      '7-12% profit target or 2 weeks elapsed',
    ],
    riskTolerance: 'moderate',
  },
};

/**
 * Calculate momentum signals for breakout strategy
 */
function calculateMomentumSignals(stock: Stock): StrategySignal {
  const { symbol, price, changePercent, volume, avgVolume, ma7, ma30, rsi } = stock;

  let signal: StrategySignal['signal'] = 'neutral';
  let confidence = 0;
  const keyMetrics: Record<string, number> = {};
  const reasons: string[] = [];

  // Volume ratio
  const volumeRatio = (avgVolume ?? 0) > 0 ? (volume ?? 0) / (avgVolume ?? 1) : 1;
  keyMetrics.volumeRatio = volumeRatio;

  // Price vs MAs
  const ma7Val = ma7 ?? price;
  const ma30Val = ma30 ?? price;
  const aboveMA7 = price > ma7Val;
  const aboveMA30 = price > ma30Val;
  keyMetrics.priceVsMA7 = ((price - ma7Val) / ma7Val) * 100;
  keyMetrics.priceVsMA30 = ((price - ma30Val) / ma30Val) * 100;

  // RSI momentum
  keyMetrics.rsi = rsi ?? 50;

  const rsiVal = rsi ?? 50;

  // STRONG BUY: Explosive breakout
  if (aboveMA7 && changePercent > 3 && volumeRatio > 2 && rsiVal > 60 && rsiVal < 75) {
    signal = 'strong_buy';
    confidence = 85;
    reasons.push(`Explosive breakout: +${changePercent.toFixed(1)}% with ${volumeRatio.toFixed(1)}x volume`);
    reasons.push(`RSI ${rsiVal.toFixed(0)} shows strong momentum building`);
  }
  // BUY: Good momentum setup
  else if (aboveMA7 && aboveMA30 && changePercent > 1.5 && volumeRatio > 1.5 && rsiVal > 55) {
    signal = 'buy';
    confidence = 70;
    reasons.push(`Strong momentum: +${changePercent.toFixed(1)}% with ${volumeRatio.toFixed(1)}x volume`);
    reasons.push(`Above both MAs, RSI ${rsiVal.toFixed(0)} confirms strength`);
  }
  // SELL: Momentum fading
  else if (!aboveMA7 || rsiVal > 75 || volumeRatio < 0.5) {
    signal = 'sell';
    confidence = 65;
    if (!aboveMA7) reasons.push('Price broke below MA7, momentum broken');
    if (rsiVal > 75) reasons.push(`RSI ${rsiVal.toFixed(0)} overbought, take profits`);
    if (volumeRatio < 0.5) reasons.push('Volume dried up, momentum fading');
  }

  return {
    symbol,
    signal,
    confidence,
    reasoning: reasons.join('. '),
    keyMetrics,
  };
}

/**
 * Calculate mean reversion signals
 */
function calculateMeanReversionSignals(stock: Stock): StrategySignal {
  const { symbol, price, changePercent, ma7, ma30, rsi, weekTrend, bollingerBands } = stock;

  let signal: StrategySignal['signal'] = 'neutral';
  let confidence = 0;
  const keyMetrics: Record<string, number> = {};
  const reasons: string[] = [];

  const rsiVal = rsi ?? 50;
  const ma30Val = ma30 ?? price;
  const weekTrendVal = weekTrend ?? 0;

  keyMetrics.rsi = rsiVal;
  keyMetrics.priceVsMA30 = ((price - ma30Val) / ma30Val) * 100;
  keyMetrics.weekTrend = weekTrendVal;

  const distanceFromMA30 = ((price - ma30Val) / ma30Val) * 100;

  // STRONG BUY: Deeply oversold quality name
  if (rsiVal < 30 && distanceFromMA30 > -8 && weekTrendVal < -5) {
    signal = 'strong_buy';
    confidence = 80;
    reasons.push(`Deeply oversold: RSI ${rsiVal.toFixed(0)}, down ${Math.abs(weekTrendVal).toFixed(1)}% this week`);
    reasons.push(`Quality intact: only ${distanceFromMA30.toFixed(1)}% below MA30`);

    if (bollingerBands && price < bollingerBands.lower) {
      reasons.push('Price touched lower Bollinger band - prime reversion setup');
      confidence += 5;
    }
  }
  // BUY: Good reversion setup
  else if (rsiVal < 40 && distanceFromMA30 > -5 && changePercent < -2) {
    signal = 'buy';
    confidence = 70;
    reasons.push(`Oversold opportunity: RSI ${rsiVal.toFixed(0)}, down ${Math.abs(changePercent).toFixed(1)}% today`);
    reasons.push('Likely to revert to mean');
  }
  // SELL: Normalized, take profits
  else if (rsiVal > 55 && distanceFromMA30 > 0) {
    signal = 'sell';
    confidence = 65;
    reasons.push(`Reversion complete: RSI normalized to ${rsiVal.toFixed(0)}`);
    reasons.push('Price back above MA30, profit target achieved');
  }

  return {
    symbol,
    signal,
    confidence,
    reasoning: reasons.join('. '),
    keyMetrics,
  };
}

/**
 * Calculate trend following signals
 */
function calculateTrendFollowingSignals(stock: Stock, marketContext: MarketContext): StrategySignal {
  const { symbol, price, ma7, ma30, ma90, relativeStrength, weekTrend, monthTrend } = stock;

  let signal: StrategySignal['signal'] = 'neutral';
  let confidence = 0;
  const keyMetrics: Record<string, number> = {};
  const reasons: string[] = [];

  const ma7Val = ma7 ?? price;
  const ma30Val = ma30 ?? price;
  const ma90Val = ma90 ?? price;
  const rsVal = relativeStrength ?? 0;
  const monthTrendVal = monthTrend ?? 0;

  // MA alignment
  const maAligned = price > ma7Val && ma7Val > ma30Val && ma30Val > ma90Val;
  keyMetrics.maAlignment = maAligned ? 1 : 0;
  keyMetrics.relativeStrength = rsVal;
  keyMetrics.monthTrend = monthTrendVal;

  // STRONG BUY: Perfect trend setup
  if (maAligned && rsVal > 3 && monthTrendVal > 8 && marketContext.spyTrend.regime === 'bullish') {
    signal = 'strong_buy';
    confidence = 85;
    reasons.push('Perfect uptrend: all MAs aligned bullishly');
    reasons.push(`Outperforming SPY by ${rsVal.toFixed(1)}%, up ${monthTrendVal.toFixed(1)}% this month`);
    reasons.push(`Market regime is ${marketContext.spyTrend.regime.toUpperCase()}`);
  }
  // BUY: Strong trend
  else if (maAligned && rsVal > 1 && monthTrendVal > 4) {
    signal = 'buy';
    confidence = 75;
    reasons.push('Strong uptrend with MA alignment');
    reasons.push(`Relative strength: +${rsVal.toFixed(1)}% vs SPY`);
  }
  // SELL: Trend break
  else if (price < ma30Val || rsVal < -2) {
    signal = 'sell';
    confidence = 70;
    if (price < ma30Val) reasons.push('Trend broken: price below MA30');
    if (rsVal < -2) reasons.push(`Underperforming SPY by ${Math.abs(rsVal).toFixed(1)}%`);
  }

  return {
    symbol,
    signal,
    confidence,
    reasoning: reasons.join('. '),
    keyMetrics,
  };
}

/**
 * Calculate value quality signals
 */
function calculateValueQualitySignals(stock: Stock, portfolioMetrics: PortfolioMetrics): StrategySignal {
  const { symbol, price, ma90, monthTrend, high52w, changePercent } = stock;

  let signal: StrategySignal['signal'] = 'neutral';
  let confidence = 0;
  const keyMetrics: Record<string, number> = {};
  const reasons: string[] = [];

  const ma90Val = ma90 ?? price;
  const monthTrendVal = monthTrend ?? 0;
  const high52wVal = high52w ?? price;

  const distanceFromMA90 = ((price - ma90Val) / ma90Val) * 100;
  const pullbackFrom52w = ((high52wVal - price) / high52wVal) * 100;

  keyMetrics.distanceFromMA90 = distanceFromMA90;
  keyMetrics.pullbackFrom52w = pullbackFrom52w;
  keyMetrics.monthTrend = monthTrendVal;

  // Check sector concentration
  const sectorExposure = portfolioMetrics.sectorExposure;
  const stockSector = getStockSector(symbol);
  const sectorConcentration = stockSector ? sectorExposure[stockSector] || 0 : 0;

  keyMetrics.sectorConcentration = sectorConcentration;

  // STRONG BUY: Quality dip with low concentration
  if (
    distanceFromMA90 > 0 &&
    pullbackFrom52w > 10 &&
    pullbackFrom52w < 25 &&
    sectorConcentration < 30 &&
    monthTrendVal < 0
  ) {
    signal = 'strong_buy';
    confidence = 80;
    reasons.push(`Quality dip: ${pullbackFrom52w.toFixed(0)}% off 52w high but above MA90`);
    reasons.push(`Long-term uptrend intact (+${distanceFromMA90.toFixed(1)}% above MA90)`);
    reasons.push(`Low sector concentration (${sectorConcentration.toFixed(0)}%), room to add`);
  }
  // BUY: Good value setup
  else if (distanceFromMA90 > -5 && pullbackFrom52w > 8 && sectorConcentration < 40) {
    signal = 'buy';
    confidence = 70;
    reasons.push(`Value opportunity: ${pullbackFrom52w.toFixed(0)}% pullback from highs`);
    reasons.push('Patient accumulation on weakness');
  }
  // SELL: Back to fair value
  else if (pullbackFrom52w < 3 || distanceFromMA90 > 15) {
    signal = 'sell';
    confidence = 65;
    if (pullbackFrom52w < 3) reasons.push('Recovered to 52w highs, value play complete');
    if (distanceFromMA90 > 15) reasons.push('Extended above MA90, take profits and rebalance');
  }

  return {
    symbol,
    signal,
    confidence,
    reasoning: reasons.join('. '),
    keyMetrics,
  };
}

/**
 * Calculate volatility arbitrage signals
 */
function calculateVolatilityArbitrageSignals(stock: Stock, marketContext: MarketContext): StrategySignal {
  const { symbol, price, changePercent, rsi, avgVolatility } = stock;

  let signal: StrategySignal['signal'] = 'neutral';
  let confidence = 0;
  const keyMetrics: Record<string, number> = {};
  const reasons: string[] = [];

  const vixLevel = marketContext.vix.level;
  const rsiVal = rsi ?? 50;
  const avgVolVal = avgVolatility ?? 0.2;

  keyMetrics.vixLevel = vixLevel;
  keyMetrics.changePercent = changePercent;
  keyMetrics.rsi = rsiVal;
  keyMetrics.volatility = avgVolVal;

  // STRONG BUY: Panic spike
  if (vixLevel > 22 && changePercent < -4 && rsiVal < 35) {
    signal = 'strong_buy';
    confidence = 85;
    reasons.push(`Volatility spike: VIX ${vixLevel.toFixed(1)}, stock down ${Math.abs(changePercent).toFixed(1)}%`);
    reasons.push(`Panic selling (RSI ${rsiVal.toFixed(0)}), prime for bounce`);
    reasons.push('High-probability vol arbitrage setup');
  }
  // BUY: Elevated vol opportunity
  else if (vixLevel > 18 && changePercent < -2.5 && rsiVal < 40) {
    signal = 'buy';
    confidence = 75;
    reasons.push(`Elevated volatility: VIX ${vixLevel.toFixed(1)}`);
    reasons.push('Oversold on fear, expect mean reversion');
  }
  // SELL: Vol normalized, take profits
  else if (vixLevel < 16 || changePercent > 3) {
    signal = 'sell';
    confidence = 70;
    if (vixLevel < 16) reasons.push(`Volatility normalized (VIX ${vixLevel.toFixed(1)}), exit arbitrage`);
    if (changePercent > 3) reasons.push('Quick bounce captured, lock in gains');
  }

  return {
    symbol,
    signal,
    confidence,
    reasoning: reasons.join('. '),
    keyMetrics,
  };
}

/**
 * Calculate contrarian sentiment signals
 */
function calculateContrarianSignals(stock: Stock, marketContext: MarketContext): StrategySignal {
  const { symbol, price, monthTrend, weekTrend, ma90, relativeStrength } = stock;

  let signal: StrategySignal['signal'] = 'neutral';
  let confidence = 0;
  const keyMetrics: Record<string, number> = {};
  const reasons: string[] = [];

  const ma90Val = ma90 ?? price;
  const monthTrendVal = monthTrend ?? 0;
  const weekTrendVal = weekTrend ?? 0;
  const rsVal = relativeStrength ?? 0;

  const distanceFromMA90 = ((price - ma90Val) / ma90Val) * 100;
  keyMetrics.monthTrend = monthTrendVal;
  keyMetrics.weekTrend = weekTrendVal;
  keyMetrics.distanceFromMA90 = distanceFromMA90;

  const sector = getStockSector(symbol);
  const sectorStrength = sector ? marketContext.sectorRotation[sector as keyof typeof marketContext.sectorRotation] : null;
  const sectorTrend = (typeof sectorStrength === 'object' && sectorStrength !== null && 'avgMonthTrend' in sectorStrength) ? sectorStrength.avgMonthTrend : 0;

  keyMetrics.sectorTrend = sectorTrend;

  // STRONG BUY: Extreme pessimism on quality
  if (
    monthTrendVal < -12 &&
    distanceFromMA90 > -10 &&
    sectorTrend > 2 &&
    rsVal < -5
  ) {
    signal = 'strong_buy';
    confidence = 80;
    reasons.push(`Extreme pessimism: down ${Math.abs(monthTrendVal).toFixed(1)}% vs strong sector (+${sectorTrend.toFixed(1)}%)`);
    reasons.push('Classic contrarian setup with sector divergence');
    reasons.push(`Long-term structure intact (${distanceFromMA90.toFixed(1)}% from MA90)`);
  }
  // BUY: Negative sentiment opportunity
  else if (monthTrendVal < -8 && distanceFromMA90 > -8 && sectorTrend > 0) {
    signal = 'buy';
    confidence = 70;
    reasons.push('Contrarian opportunity on oversold quality name');
    reasons.push('Fade the fear, sector fundamentals strong');
  }
  // SELL: Sentiment normalized
  else if (weekTrendVal > 5 || distanceFromMA90 > 10) {
    signal = 'sell';
    confidence = 65;
    if (weekTrendVal > 5) reasons.push('Sharp recovery, sentiment normalized');
    if (distanceFromMA90 > 10) reasons.push('Extended rally, take contrarian profits');
  }

  return {
    symbol,
    signal,
    confidence,
    reasoning: reasons.join('. '),
    keyMetrics,
  };
}

/**
 * Get stock sector (simplified mapping)
 */
function getStockSector(symbol: string): string | null {
  const sectorMap: Record<string, string> = {
    AAPL: 'tech',
    MSFT: 'tech',
    NVDA: 'tech',
    GOOGL: 'tech',
    META: 'tech',
    JPM: 'financials',
    BAC: 'financials',
    V: 'financials',
    MA: 'financials',
    XOM: 'energy',
    CVX: 'energy',
    UNH: 'healthcare',
    JNJ: 'healthcare',
    LLY: 'healthcare',
    WMT: 'consumer',
    PG: 'consumer',
    KO: 'consumer',
    COST: 'consumer',
  };
  return sectorMap[symbol] || null;
}

/**
 * Get strategy-specific signals for an AI agent
 */
export function getStrategySignals(
  agentModel: string,
  stocks: Stock[],
  marketContext: MarketContext,
  portfolioMetrics: PortfolioMetrics
): StrategySignal[] {
  const config = STRATEGY_CONFIGS[agentModel];
  if (!config) {
    console.warn(`No strategy config found for ${agentModel}`);
    return [];
  }

  return stocks.map((stock) => {
    switch (config.type) {
      case 'momentum_breakout':
        return calculateMomentumSignals(stock);
      case 'mean_reversion':
        return calculateMeanReversionSignals(stock);
      case 'trend_following':
        return calculateTrendFollowingSignals(stock, marketContext);
      case 'value_quality':
        return calculateValueQualitySignals(stock, portfolioMetrics);
      case 'volatility_arbitrage':
        return calculateVolatilityArbitrageSignals(stock, marketContext);
      case 'contrarian_sentiment':
        return calculateContrarianSignals(stock, marketContext);
      default:
        return {
          symbol: stock.symbol,
          signal: 'neutral',
          confidence: 0,
          reasoning: 'Unknown strategy type',
          keyMetrics: {},
        };
    }
  });
}

/**
 * Generate strategy-specific prompt guidance for AI
 */
export function generateStrategyPrompt(
  agentModel: string,
  signals: StrategySignal[],
  marketContext: MarketContext
): string {
  const config = STRATEGY_CONFIGS[agentModel];
  if (!config) return '';

  const strongBuySignals = signals.filter((s) => s.signal === 'strong_buy').slice(0, 3);
  const sellSignals = signals.filter((s) => s.signal === 'sell' || s.signal === 'strong_sell').slice(0, 3);

  let prompt = `\n## YOUR TRADING STRATEGY: ${config.name}\n`;
  prompt += `**Strategy Type**: ${config.type.replace('_', ' ').toUpperCase()}\n`;
  prompt += `**Description**: ${config.description}\n`;
  prompt += `**Typical Holding Period**: ${config.holdingPeriod}\n`;
  prompt += `**Risk Tolerance**: ${config.riskTolerance.toUpperCase()}\n\n`;

  prompt += `### Strategy-Specific Entry Signals:\n`;
  config.entrySignals.forEach((signal) => {
    prompt += `- ${signal}\n`;
  });

  prompt += `\n### Strategy-Specific Exit Signals:\n`;
  config.exitSignals.forEach((signal) => {
    prompt += `- ${signal}\n`;
  });

  prompt += `\n### Current Market Fit:\n`;
  const marketRegime = marketContext.spyTrend.regime;
  const vixSignal = marketContext.vix.signal;
  const idealConditions = config.idealMarketConditions;

  const marketFit: string[] = [];
  if (idealConditions.includes(marketRegime)) {
    marketFit.push(`✅ ${marketRegime.toUpperCase()} market favors your strategy`);
  } else {
    marketFit.push(`⚠️ ${marketRegime.toUpperCase()} market - adjust risk accordingly`);
  }

  if (
    (vixSignal === 'risk_on' && config.riskTolerance === 'aggressive') ||
    (vixSignal === 'risk_off' && idealConditions.includes('high_volatility'))
  ) {
    marketFit.push(`✅ VIX ${marketContext.vix.level.toFixed(1)} (${vixSignal}) aligns with strategy`);
  } else if (vixSignal === 'risk_off' && config.riskTolerance === 'aggressive') {
    marketFit.push(`⚠️ VIX ${marketContext.vix.level.toFixed(1)} (${vixSignal}) - reduce position sizes`);
  }

  prompt += marketFit.join('\n') + '\n';

  if (strongBuySignals.length > 0) {
    prompt += `\n### Top Opportunities For Your Strategy:\n`;
    strongBuySignals.forEach((signal, i) => {
      prompt += `${i + 1}. **${signal.symbol}** (${signal.confidence}% confidence)\n`;
      prompt += `   ${signal.reasoning}\n`;
    });
  }

  if (sellSignals.length > 0) {
    prompt += `\n### Consider Exits Based On Your Strategy:\n`;
    sellSignals.forEach((signal, i) => {
      prompt += `${i + 1}. **${signal.symbol}** - ${signal.reasoning}\n`;
    });
  }

  return prompt;
}
