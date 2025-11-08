'use client';

import React from 'react';
import type { AssetClass } from '@/lib/asset-class-detector';

/**
 * Market Overview Card
 *
 * Displays summary info for one market (stocks, crypto, etc.)
 */

export interface MarketOverview {
  assetClass: AssetClass;
  displayName: string;
  icon: string;
  color: string;

  // Performance
  performance1d: number;
  regime: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 1-10

  // Instruments
  instrumentCount: number;

  // Top performers
  topPerformer?: {
    symbol: string;
    performance: number;
  };
  worstPerformer?: {
    symbol: string;
    performance: number;
  };

  // Market hours
  isOpen: boolean;
  isPreMarket?: boolean;
  isAfterHours?: boolean;
  timeUntilOpen?: string;
  timeUntilClose?: string;

  // AI activity
  agentsTrading: number;
  totalPositions: number;
}

interface MarketOverviewCardProps {
  market: MarketOverview;
  onClick?: () => void;
}

const MarketOverviewCard: React.FC<MarketOverviewCardProps> = ({ market, onClick }) => {
  const isPositive = market.performance1d >= 0;

  const regimeConfig = {
    bullish: { label: '🔥 Bullish', color: 'text-green-600 dark:text-green-400' },
    bearish: { label: '📉 Bearish', color: 'text-red-600 dark:text-red-400' },
    neutral: { label: '➡️ Neutral', color: 'text-gray-600 dark:text-gray-400' },
  };

  const regime = regimeConfig[market.regime];

  return (
    <div
      onClick={onClick}
      className={`
        relative p-4 rounded-xl border-2 transition-all duration-300
        bg-white dark:bg-gray-800
        hover:shadow-lg hover:scale-105 cursor-pointer
        ${market.isOpen ? 'border-green-500 shadow-md' : 'border-gray-300 dark:border-gray-600'}
      `}
      style={{
        borderColor: market.isOpen ? market.color : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{market.icon}</span>
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
              {market.displayName}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {market.instrumentCount} instruments
            </p>
          </div>
        </div>

        {/* Status badge */}
        {market.isOpen ? (
          <div className="px-2 py-1 rounded-full bg-green-500 text-white text-xs font-semibold animate-pulse">
            • LIVE
          </div>
        ) : market.isPreMarket ? (
          <div className="px-2 py-1 rounded-full bg-amber-500 text-white text-xs font-semibold">
            PRE
          </div>
        ) : market.isAfterHours ? (
          <div className="px-2 py-1 rounded-full bg-purple-500 text-white text-xs font-semibold">
            AH
          </div>
        ) : (
          <div className="px-2 py-1 rounded-full bg-gray-400 dark:bg-gray-600 text-white text-xs font-semibold">
            CLOSED
          </div>
        )}
      </div>

      {/* Performance */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2 mb-1">
          <span
            className={`text-2xl font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {isPositive ? '+' : ''}{market.performance1d.toFixed(2)}%
          </span>
          <span className={regime.color}>
            {regime.label}
          </span>
        </div>

        {/* Strength bar */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Strength:</span>
          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${market.strength * 10}%`,
                backgroundColor: market.color,
              }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {market.strength}/10
          </span>
        </div>
      </div>

      {/* Top/Worst performers */}
      <div className="space-y-1.5 mb-3 text-xs">
        {market.topPerformer && (
          <div className="flex items-center justify-between p-2 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <span className="font-medium text-green-900 dark:text-green-100">
              Top: {market.topPerformer.symbol}
            </span>
            <span className="font-bold text-green-600 dark:text-green-400">
              +{market.topPerformer.performance.toFixed(2)}%
            </span>
          </div>
        )}
        {market.worstPerformer && (
          <div className="flex items-center justify-between p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <span className="font-medium text-red-900 dark:text-red-100">
              Worst: {market.worstPerformer.symbol}
            </span>
            <span className="font-bold text-red-600 dark:text-red-400">
              {market.worstPerformer.performance.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Market hours info */}
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
        {market.isOpen && market.timeUntilClose && (
          <div>⏰ Closes in {market.timeUntilClose}</div>
        )}
        {!market.isOpen && market.timeUntilOpen && (
          <div>⏰ Opens in {market.timeUntilOpen}</div>
        )}
        {market.assetClass === 'crypto' && (
          <div>🌍 Trading 24/7/365</div>
        )}
      </div>

      {/* AI Activity */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 dark:text-gray-400">AI Activity:</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {market.agentsTrading} {market.agentsTrading === 1 ? 'AI' : 'AIs'}
            </span>
            <span className="text-gray-500 dark:text-gray-400">•</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {market.totalPositions} {market.totalPositions === 1 ? 'position' : 'positions'}
            </span>
          </div>
        </div>
      </div>

      {/* Pulse effect for open markets */}
      {market.isOpen && (
        <div
          className="absolute inset-0 rounded-xl opacity-20 animate-ping"
          style={{ backgroundColor: market.color }}
        />
      )}
    </div>
  );
};

export default MarketOverviewCard;
