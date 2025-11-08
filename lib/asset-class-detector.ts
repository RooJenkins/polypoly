/**
 * POLYPOLY - Asset Class Detector
 *
 * Determines which market/asset class a symbol belongs to
 * This is critical for multi-market portfolio tracking
 */

// Crypto symbols (from market-scanner.ts)
const CRYPTO_SYMBOLS = [
  'BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'AVAX', 'DOT', 'LINK',
  'UNI', 'ATOM', 'MATIC', 'ARB', 'OP', 'DOGE', 'SHIB', 'LTC',
  'BCH', 'AAVE', 'MKR'
];

// Commodity ETF symbols
const COMMODITY_SYMBOLS = [
  'GLD',   // Gold
  'SLV',   // Silver
  'USO',   // Oil
  'UNG',   // Natural Gas
  'DBA',   // Agriculture
  'CPER',  // Copper
];

// Bond ETF symbols
const BOND_SYMBOLS = [
  'TLT',  // 20Y Treasury
  'IEF',  // 10Y Treasury
  'SHY',  // Short-term Treasury
  'LQD',  // Investment Grade Corporate
  'HYG',  // High Yield Corporate
  'TIP',  // TIPS
];

// Forex/Currency ETF symbols
const FOREX_SYMBOLS = [
  'UUP',  // US Dollar
  'FXE',  // Euro
  'FXY',  // Yen
  'FXB',  // Pound
];

// REIT ETF symbols
const REIT_SYMBOLS = [
  'VNQ',   // Vanguard Real Estate
  'SCHH',  // Schwab REIT
  'REM',   // Mortgage REIT
];

export type AssetClass = 'stocks' | 'crypto' | 'commodities' | 'bonds' | 'forex' | 'REITs';

/**
 * Detect which asset class a symbol belongs to
 */
export function getAssetClass(symbol: string): AssetClass {
  const upperSymbol = symbol.toUpperCase();

  if (CRYPTO_SYMBOLS.includes(upperSymbol)) {
    return 'crypto';
  }

  if (COMMODITY_SYMBOLS.includes(upperSymbol)) {
    return 'commodities';
  }

  if (BOND_SYMBOLS.includes(upperSymbol)) {
    return 'bonds';
  }

  if (FOREX_SYMBOLS.includes(upperSymbol)) {
    return 'forex';
  }

  if (REIT_SYMBOLS.includes(upperSymbol)) {
    return 'REITs';
  }

  // Default to stocks for traditional equity symbols
  return 'stocks';
}

/**
 * Get display name for asset class
 */
export function getAssetClassDisplayName(assetClass: AssetClass): string {
  const displayNames: Record<AssetClass, string> = {
    'stocks': 'Stocks',
    'crypto': 'Crypto',
    'commodities': 'Commodities',
    'bonds': 'Bonds',
    'forex': 'Forex',
    'REITs': 'REITs',
  };

  return displayNames[assetClass];
}

/**
 * Get emoji icon for asset class
 */
export function getAssetClassIcon(assetClass: AssetClass): string {
  const icons: Record<AssetClass, string> = {
    'stocks': '📈',
    'crypto': '🪙',
    'commodities': '🥇',
    'bonds': '📊',
    'forex': '💱',
    'REITs': '🏢',
  };

  return icons[assetClass];
}

/**
 * Get color for asset class (for UI display)
 */
export function getAssetClassColor(assetClass: AssetClass): string {
  const colors: Record<AssetClass, string> = {
    'stocks': '#3B82F6',      // Blue
    'crypto': '#F59E0B',      // Amber
    'commodities': '#EAB308', // Yellow/Gold
    'bonds': '#10B981',       // Green
    'forex': '#8B5CF6',       // Purple
    'REITs': '#EC4899',       // Pink
  };

  return colors[assetClass];
}

/**
 * Get all symbols for a specific asset class
 */
export function getSymbolsByAssetClass(assetClass: AssetClass): string[] {
  switch (assetClass) {
    case 'crypto':
      return CRYPTO_SYMBOLS;
    case 'commodities':
      return COMMODITY_SYMBOLS;
    case 'bonds':
      return BOND_SYMBOLS;
    case 'forex':
      return FOREX_SYMBOLS;
    case 'REITs':
      return REIT_SYMBOLS;
    case 'stocks':
      // Return common stocks - this would come from your stock universe
      return []; // Populated dynamically from stock API
    default:
      return [];
  }
}

/**
 * Check if a symbol is tradeable in multiple markets
 */
export function isMultiMarketSymbol(symbol: string): boolean {
  // Some symbols might exist in multiple markets
  // For now, all symbols are unique to one market
  return false;
}

/**
 * Get market description for better UX
 */
export function getMarketDescription(assetClass: AssetClass): string {
  const descriptions: Record<AssetClass, string> = {
    'stocks': 'US Equities - Large cap stocks from major indices',
    'crypto': 'Cryptocurrencies - Bitcoin, Ethereum, and major altcoins',
    'commodities': 'Commodities - Gold, silver, oil, natural gas, agriculture',
    'bonds': 'Fixed Income - Treasury bonds and corporate bonds',
    'forex': 'Foreign Exchange - Currency pairs via ETFs',
    'REITs': 'Real Estate - Real Estate Investment Trusts',
  };

  return descriptions[assetClass];
}
