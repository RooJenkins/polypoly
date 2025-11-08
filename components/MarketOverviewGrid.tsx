'use client';

import React, { useState, useEffect } from 'react';
import MarketOverviewCard, { type MarketOverview } from './MarketOverviewCard';

/**
 * Market Overview Grid
 *
 * Displays all 6 markets in a responsive grid
 * Fetches live data from /api/markets/overview
 */

const MarketOverviewGrid: React.FC = () => {
  const [markets, setMarkets] = useState<MarketOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch market data
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await fetch('/api/markets/overview');
        if (!res.ok) {
          throw new Error('Failed to fetch market data');
        }
        const data = await res.json();
        if (data.success) {
          setMarkets(data.data);
        } else {
          throw new Error(data.error || 'Unknown error');
        }
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching markets:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchMarkets();

    // Refresh every 5 minutes
    const interval = setInterval(fetchMarkets, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading market data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">
            ❌ Failed to load market data
          </p>
          <p className="text-sm text-red-500 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const openMarkets = markets.filter(m => m.isOpen).length;
  const totalPositions = markets.reduce((sum, m) => sum + m.totalPositions, 0);
  const avgPerformance = markets.reduce((sum, m) => sum + m.performance1d, 0) / markets.length;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          🌍 Multi-Market Trading Universe
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          PolyPoly AIs trade across <strong>6 global markets</strong> with <strong>{markets.reduce((sum, m) => sum + m.instrumentCount, 0)} instruments</strong>.
          Track real-time performance, market hours, and AI activity.
        </p>

        {/* Summary stats */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-gray-700 dark:text-gray-300">
              <strong>{openMarkets}</strong> {openMarkets === 1 ? 'market' : 'markets'} open
            </span>
          </div>
          <div className="text-gray-400">|</div>
          <div className="text-gray-700 dark:text-gray-300">
            <strong>{totalPositions}</strong> active positions
          </div>
          <div className="text-gray-400">|</div>
          <div className={avgPerformance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
            Avg: <strong>{avgPerformance >= 0 ? '+' : ''}{avgPerformance.toFixed(2)}%</strong>
          </div>
        </div>
      </div>

      {/* Market cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {markets.map((market) => (
          <MarketOverviewCard
            key={market.assetClass}
            market={market}
            onClick={() => {
              // TODO: Navigate to market detail or filter
              console.log(`Clicked ${market.displayName}`);
            }}
          />
        ))}
      </div>

      {/* Crypto 24/7 callout */}
      {markets.find(m => m.assetClass === 'crypto')?.isOpen && (
        <div className="text-center p-4 rounded-lg bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-300 dark:border-amber-700">
          <span className="text-amber-900 dark:text-amber-100 font-semibold">
            🪙 Crypto markets never sleep! Trading 24/7/365 while traditional markets are closed.
          </span>
        </div>
      )}
    </div>
  );
};

export default MarketOverviewGrid;
