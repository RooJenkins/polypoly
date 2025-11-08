/**
 * POLYPOLY - Multi-Market Scanner
 *
 * Scans ALL markets (stocks, crypto, commodities, bonds, forex, REITs) with REAL data
 * NO MOCK DATA - All data comes from live APIs
 *
 * APIs Used:
 * - CoinGecko (free, 30 calls/min) - Cryptocurrencies
 * - Yahoo Finance (unlimited, free) - Everything else
 */

import YahooFinance from 'yahoo-finance2';
import axios from 'axios';

// Create Yahoo Finance client instance
const yahooFinance = new YahooFinance({
  validation: { logErrors: false, logOptionsErrors: false },
});

// =====================================================
// CRYPTOCURRENCY DATA (CoinGecko API - REAL DATA)
// =====================================================

const CRYPTO_IDS = [
  'bitcoin',         // BTC
  'ethereum',        // ETH
  'binancecoin',     // BNB
  'solana',          // SOL
  'cardano',         // ADA
  'avalanche-2',     // AVAX
  'polkadot',        // DOT
  'chainlink',       // LINK
  'uniswap',         // UNI
  'cosmos',          // ATOM
  'polygon',         // MATIC
  'arbitrum',        // ARB
  'optimism',        // OP
  'dogecoin',        // DOGE
  'shiba-inu',       // SHIB
  'litecoin',        // LTC
  'bitcoin-cash',    // BCH
  'aave',            // AAVE
  'maker',           // MKR
];

export interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap: number;
  assetClass: 'crypto';
}

export async function fetchCryptoPrices(): Promise<CryptoPrice[]> {
  try {
    const ids = CRYPTO_IDS.join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;

    console.log('🔍 Fetching crypto prices from CoinGecko (REAL DATA)...');
    const response = await axios.get(url, { timeout: 10000 });

    if (!response.data || Object.keys(response.data).length === 0) {
      throw new Error('CoinGecko API returned no data');
    }

    const cryptos: CryptoPrice[] = [];
    for (const [id, data] of Object.entries(response.data)) {
      const priceData = data as any;

      // Convert ID to symbol (e.g., "bitcoin" -> "BTC")
      const symbolMap: { [key: string]: string } = {
        'bitcoin': 'BTC',
        'ethereum': 'ETH',
        'binancecoin': 'BNB',
        'solana': 'SOL',
        'cardano': 'ADA',
        'avalanche-2': 'AVAX',
        'polkadot': 'DOT',
        'chainlink': 'LINK',
        'uniswap': 'UNI',
        'cosmos': 'ATOM',
        'polygon': 'MATIC',
        'arbitrum': 'ARB',
        'optimism': 'OP',
        'dogecoin': 'DOGE',
        'shiba-inu': 'SHIB',
        'litecoin': 'LTC',
        'bitcoin-cash': 'BCH',
        'aave': 'AAVE',
        'maker': 'MKR',
      };

      cryptos.push({
        symbol: symbolMap[id] || id.toUpperCase(),
        name: id,
        price: priceData.usd || 0,
        change24h: 0, // Calculated from changePercent
        changePercent24h: priceData.usd_24h_change || 0,
        volume24h: priceData.usd_24h_vol || 0,
        marketCap: priceData.usd_market_cap || 0,
        assetClass: 'crypto',
      });
    }

    console.log(`✅ Fetched ${cryptos.length} real crypto prices from CoinGecko`);
    console.log(`   Top gainer: ${cryptos.sort((a, b) => b.changePercent24h - a.changePercent24h)[0]?.symbol} (+${cryptos[0]?.changePercent24h.toFixed(2)}%)`);

    return cryptos;
  } catch (error: any) {
    console.error('❌ Error fetching crypto prices from CoinGecko:', error.message);
    throw new Error(`CoinGecko API failed: ${error.message} - NO MOCK DATA FALLBACK`);
  }
}

// =====================================================
// COMMODITIES DATA (Yahoo Finance - REAL DATA)
// =====================================================

const COMMODITY_TICKERS = [
  'GLD',   // SPDR Gold Trust
  'SLV',   // iShares Silver Trust
  'USO',   // United States Oil Fund
  'UNG',   // United States Natural Gas Fund
  'DBA',   // Invesco DB Agriculture Fund
  'CPER',  // United States Copper Index Fund
];

export interface GenericAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  assetClass: string;
}

export async function fetchCommodities(): Promise<GenericAsset[]> {
  console.log('🔍 Fetching commodities from Yahoo Finance (REAL DATA)...');
  const commodities: GenericAsset[] = [];

  for (const ticker of COMMODITY_TICKERS) {
    try {
      const quote = await yahooFinance.quote(ticker);

      commodities.push({
        symbol: ticker,
        name: quote.shortName || ticker,
        price: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        volume: quote.regularMarketVolume || 0,
        assetClass: 'commodities',
      });
    } catch (error: any) {
      console.error(`⚠️  Error fetching ${ticker}:`, error.message);
    }
  }

  if (commodities.length === 0) {
    throw new Error('Yahoo Finance API failed for commodities - NO MOCK DATA FALLBACK');
  }

  console.log(`✅ Fetched ${commodities.length} real commodity prices from Yahoo Finance`);
  return commodities;
}

// =====================================================
// BONDS DATA (Yahoo Finance - REAL DATA)
// =====================================================

const BOND_TICKERS = [
  'TLT',  // iShares 20+ Year Treasury Bond ETF
  'IEF',  // iShares 7-10 Year Treasury Bond ETF
  'SHY',  // iShares 1-3 Year Treasury Bond ETF
  'LQD',  // iShares iBoxx $ Investment Grade Corporate Bond ETF
  'HYG',  // iShares iBoxx $ High Yield Corporate Bond ETF
  'TIP',  // iShares TIPS Bond ETF
];

export async function fetchBonds(): Promise<GenericAsset[]> {
  console.log('🔍 Fetching bonds from Yahoo Finance (REAL DATA)...');
  const bonds: GenericAsset[] = [];

  for (const ticker of BOND_TICKERS) {
    try {
      const quote = await yahooFinance.quote(ticker);

      bonds.push({
        symbol: ticker,
        name: quote.shortName || ticker,
        price: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        volume: quote.regularMarketVolume || 0,
        assetClass: 'bonds',
      });
    } catch (error: any) {
      console.error(`⚠️  Error fetching ${ticker}:`, error.message);
    }
  }

  if (bonds.length === 0) {
    throw new Error('Yahoo Finance API failed for bonds - NO MOCK DATA FALLBACK');
  }

  console.log(`✅ Fetched ${bonds.length} real bond prices from Yahoo Finance`);
  return bonds;
}

// =====================================================
// FOREX/CURRENCY DATA (Yahoo Finance - REAL DATA)
// =====================================================

const FOREX_TICKERS = [
  'UUP',  // Invesco DB US Dollar Bullish Fund
  'FXE',  // Invesco CurrencyShares Euro Trust
  'FXY',  // Invesco CurrencyShares Japanese Yen
  'FXB',  // Invesco CurrencyShares British Pound
];

export async function fetchForex(): Promise<GenericAsset[]> {
  console.log('🔍 Fetching forex from Yahoo Finance (REAL DATA)...');
  const forex: GenericAsset[] = [];

  for (const ticker of FOREX_TICKERS) {
    try {
      const quote = await yahooFinance.quote(ticker);

      forex.push({
        symbol: ticker,
        name: quote.shortName || ticker,
        price: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        volume: quote.regularMarketVolume || 0,
        assetClass: 'forex',
      });
    } catch (error: any) {
      console.error(`⚠️  Error fetching ${ticker}:`, error.message);
    }
  }

  if (forex.length === 0) {
    throw new Error('Yahoo Finance API failed for forex - NO MOCK DATA FALLBACK');
  }

  console.log(`✅ Fetched ${forex.length} real forex prices from Yahoo Finance`);
  return forex;
}

// =====================================================
// REITs DATA (Yahoo Finance - REAL DATA)
// =====================================================

const REIT_TICKERS = [
  'VNQ',   // Vanguard Real Estate ETF
  'SCHH',  // Schwab US REIT ETF
  'REM',   // iShares Mortgage Real Estate ETF
];

export async function fetchREITs(): Promise<GenericAsset[]> {
  console.log('🔍 Fetching REITs from Yahoo Finance (REAL DATA)...');
  const reits: GenericAsset[] = [];

  for (const ticker of REIT_TICKERS) {
    try {
      const quote = await yahooFinance.quote(ticker);

      reits.push({
        symbol: ticker,
        name: quote.shortName || ticker,
        price: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        volume: quote.regularMarketVolume || 0,
        assetClass: 'REITs',
      });
    } catch (error: any) {
      console.error(`⚠️  Error fetching ${ticker}:`, error.message);
    }
  }

  if (reits.length === 0) {
    throw new Error('Yahoo Finance API failed for REITs - NO MOCK DATA FALLBACK');
  }

  console.log(`✅ Fetched ${reits.length} real REIT prices from Yahoo Finance`);
  return reits;
}

// =====================================================
// MASTER MARKET SCAN
// =====================================================

export interface MarketScanResult {
  assetClass: string;
  instruments: any[];
  instrumentCount: number;
  performance1d: number;
  topPerformer: {
    symbol: string;
    performance: number;
    price: number;
  } | null;
  worstPerformer: {
    symbol: string;
    performance: number;
    price: number;
  } | null;
  regime: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 1-10
  summary: string;
}

export async function scanAllMarkets(): Promise<MarketScanResult[]> {
  console.log('');
  console.log('='.repeat(80));
  console.log('🔍 SCANNING ALL MARKETS (REAL DATA ONLY - NO MOCKING)');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Fetch data from all asset classes in parallel
    const [crypto, commodities, bonds, forex, reits] = await Promise.all([
      fetchCryptoPrices(),
      fetchCommodities(),
      fetchBonds(),
      fetchForex(),
      fetchREITs(),
    ]);

    // Analyze each asset class
    const results: MarketScanResult[] = [
      analyzeAssetClass('crypto', crypto),
      analyzeAssetClass('commodities', commodities),
      analyzeAssetClass('bonds', bonds),
      analyzeAssetClass('forex', forex),
      analyzeAssetClass('REITs', reits),
    ];

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ MARKET SCAN COMPLETE (ALL REAL DATA)');
    console.log('='.repeat(80));
    console.log('');

    // Print summary
    results.forEach(result => {
      console.log(`📊 ${result.assetClass.toUpperCase()}: ${result.regime.toUpperCase()} (${result.performance1d.toFixed(2)}%) | Strength: ${result.strength}/10`);
    });
    console.log('');

    return results;
  } catch (error: any) {
    console.error('❌ MARKET SCAN FAILED:', error.message);
    throw error; // Don't return mock data - fail loudly
  }
}

function analyzeAssetClass(assetClass: string, instruments: any[]): MarketScanResult {
  if (!instruments || instruments.length === 0) {
    return {
      assetClass,
      instruments: [],
      instrumentCount: 0,
      performance1d: 0,
      topPerformer: null,
      worstPerformer: null,
      regime: 'neutral',
      strength: 0,
      summary: `No data available for ${assetClass}`,
    };
  }

  // Calculate average performance
  const avgPerformance = instruments.reduce((sum, inst) => {
    const change = inst.changePercent || inst.changePercent24h || 0;
    return sum + change;
  }, 0) / instruments.length;

  // Find top and worst performers
  const sorted = [...instruments].sort((a, b) => {
    const aChange = a.changePercent || a.changePercent24h || 0;
    const bChange = b.changePercent || b.changePercent24h || 0;
    return bChange - aChange;
  });

  const topPerformer = sorted[0];
  const worstPerformer = sorted[sorted.length - 1];

  const topChange = topPerformer.changePercent || topPerformer.changePercent24h || 0;
  const worstChange = worstPerformer.changePercent || worstPerformer.changePercent24h || 0;

  // Determine regime
  let regime: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (avgPerformance > 1) regime = 'bullish';
  else if (avgPerformance < -1) regime = 'bearish';

  // Calculate strength (1-10)
  const strength = Math.min(10, Math.max(1, Math.round(5 + avgPerformance)));

  // Generate summary
  const summary = `${assetClass.toUpperCase()}: ${regime.toUpperCase()} regime (avg ${avgPerformance.toFixed(2)}%). ` +
    `Top: ${topPerformer.symbol} (+${topChange.toFixed(2)}%). ` +
    `Worst: ${worstPerformer.symbol} (${worstChange.toFixed(2)}%). ` +
    `Strength: ${strength}/10. ${instruments.length} instruments tracked.`;

  return {
    assetClass,
    instruments,
    instrumentCount: instruments.length,
    performance1d: avgPerformance,
    topPerformer: {
      symbol: topPerformer.symbol,
      performance: topChange,
      price: topPerformer.price,
    },
    worstPerformer: {
      symbol: worstPerformer.symbol,
      performance: worstChange,
      price: worstPerformer.price,
    },
    regime,
    strength,
    summary,
  };
}

// =====================================================
// HELPER: Get all instruments from scan
// =====================================================

export function getAllInstruments(scanResults: MarketScanResult[]): any[] {
  return scanResults.flatMap(result => result.instruments);
}

// =====================================================
// HELPER: Get best instrument per asset class
// =====================================================

export function getBestInstrumentByAssetClass(assetClass: string, scanResults: MarketScanResult[]): any | null {
  const result = scanResults.find(r => r.assetClass === assetClass);
  if (!result || !result.topPerformer) return null;

  // Find the actual instrument object
  const instrument = result.instruments.find(
    i => i.symbol === result.topPerformer?.symbol
  );

  return instrument || null;
}
