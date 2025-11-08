'use client';

import React from 'react';

/**
 * Asset Class Badge Component
 * Displays a small badge showing which market an asset belongs to
 */

type AssetClass = 'stocks' | 'crypto' | 'commodities' | 'bonds' | 'forex' | 'REITs';

interface AssetClassBadgeProps {
  assetClass: AssetClass;
  showIcon?: boolean;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ASSET_CLASS_CONFIG: Record<AssetClass, {
  displayName: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  'stocks': {
    displayName: 'Stocks',
    icon: '📈',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
  },
  'crypto': {
    displayName: 'Crypto',
    icon: '🪙',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
  'commodities': {
    displayName: 'Commodities',
    icon: '🥇',
    color: '#EAB308',
    bgColor: '#FEF9C3',
  },
  'bonds': {
    displayName: 'Bonds',
    icon: '📊',
    color: '#10B981',
    bgColor: '#D1FAE5',
  },
  'forex': {
    displayName: 'Forex',
    icon: '💱',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
  },
  'REITs': {
    displayName: 'REITs',
    icon: '🏢',
    color: '#EC4899',
    bgColor: '#FCE7F3',
  },
};

const AssetClassBadge: React.FC<AssetClassBadgeProps> = ({
  assetClass,
  showIcon = true,
  showText = true,
  size = 'md',
}) => {
  const config = ASSET_CLASS_CONFIG[assetClass];

  if (!config) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      {showIcon && <span>{config.icon}</span>}
      {showText && <span>{config.displayName}</span>}
    </span>
  );
};

export default AssetClassBadge;
