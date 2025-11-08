'use client';

import Image from 'next/image';

interface StockLogoProps {
  symbol: string;
  size?: number;
  className?: string;
}

export default function StockLogo({ symbol, size = 16, className = '' }: StockLogoProps) {
  // Using Clearbit Logo API for company logos
  const logoUrl = `https://logo.clearbit.com/${getCompanyDomain(symbol)}`;

  return (
    <Image
      src={logoUrl}
      alt={`${symbol} logo`}
      width={size}
      height={size}
      className={`inline-block rounded ${className}`}
      onError={(e) => {
        // Fallback to a placeholder if logo fails to load
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

function getCompanyDomain(symbol: string): string {
  // Map stock symbols to company domains
  const domainMap: Record<string, string> = {
    'AAPL': 'apple.com',
    'MSFT': 'microsoft.com',
    'GOOGL': 'google.com',
    'AMZN': 'amazon.com',
    'META': 'meta.com',
    'TSLA': 'tesla.com',
    'NVDA': 'nvidia.com',
    'BRK.B': 'berkshirehathaway.com',
    'V': 'visa.com',
    'JNJ': 'jnj.com',
    'WMT': 'walmart.com',
    'JPM': 'jpmorganchase.com',
    'MA': 'mastercard.com',
    'PG': 'pg.com',
    'UNH': 'unitedhealthgroup.com',
    'DIS': 'disney.com',
    'HD': 'homedepot.com',
    'PYPL': 'paypal.com',
    'BAC': 'bankofamerica.com',
    'NFLX': 'netflix.com',
  };

  return domainMap[symbol] || `${symbol.toLowerCase()}.com`;
}
