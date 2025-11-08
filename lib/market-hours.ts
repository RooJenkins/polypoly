/**
 * POLYPOLY - Market Hours Tracking
 *
 * Determines which markets are currently open/closed
 * Handles timezones, market hours, holidays
 */

import type { AssetClass } from './asset-class-detector';

export interface MarketHours {
  assetClass: AssetClass;
  displayName: string;
  icon: string;
  color: string;

  // Trading hours
  timezone: string;
  openTime: string;   // 24h format: "09:30"
  closeTime: string;  // 24h format: "16:00"

  // Days open
  tradingDays: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday

  // Current status
  isOpen: boolean;
  isPreMarket?: boolean;
  isAfterHours?: boolean;

  // Next open/close
  nextOpenTime?: Date;
  nextCloseTime?: Date;
  timeUntilOpen?: string;
  timeUntilClose?: string;
}

/**
 * Check if US stock market is open
 * Mon-Fri 9:30 AM - 4:00 PM EST
 */
export function isUSMarketOpen(now: Date = new Date()): {
  isOpen: boolean;
  isPreMarket: boolean;
  isAfterHours: boolean;
} {
  // Convert to EST
  const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));

  const day = estTime.getDay(); // 0=Sunday, 6=Saturday
  const hours = estTime.getHours();
  const minutes = estTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Weekend
  if (day === 0 || day === 6) {
    return { isOpen: false, isPreMarket: false, isAfterHours: false };
  }

  // Market hours: 9:30 AM - 4:00 PM EST
  const marketOpen = 9 * 60 + 30;  // 9:30 AM = 570 minutes
  const marketClose = 16 * 60;      // 4:00 PM = 960 minutes

  // Pre-market: 4:00 AM - 9:30 AM
  const preMarketStart = 4 * 60;    // 4:00 AM = 240 minutes

  // After-hours: 4:00 PM - 8:00 PM
  const afterHoursEnd = 20 * 60;    // 8:00 PM = 1200 minutes

  const isOpen = totalMinutes >= marketOpen && totalMinutes < marketClose;
  const isPreMarket = totalMinutes >= preMarketStart && totalMinutes < marketOpen;
  const isAfterHours = totalMinutes >= marketClose && totalMinutes < afterHoursEnd;

  return { isOpen, isPreMarket, isAfterHours };
}

/**
 * Crypto market is always open 24/7/365
 */
export function isCryptoMarketOpen(): boolean {
  return true; // Always open!
}

/**
 * Calculate time until next market open/close
 */
function calculateNextMarketTime(now: Date, targetHour: number, targetMinute: number): Date {
  const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));

  const next = new Date(estTime);
  next.setHours(targetHour, targetMinute, 0, 0);

  // If target time has passed today, move to next day
  if (next <= estTime) {
    next.setDate(next.getDate() + 1);
  }

  // Skip weekends
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

/**
 * Format time difference as human-readable string
 */
function formatTimeUntil(targetDate: Date, now: Date = new Date()): string {
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) return 'Now';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

/**
 * Get market hours for all asset classes
 */
export function getAllMarketHours(now: Date = new Date()): MarketHours[] {
  const usMarketStatus = isUSMarketOpen(now);

  const markets: MarketHours[] = [
    {
      assetClass: 'stocks',
      displayName: 'Stocks',
      icon: '📈',
      color: '#3B82F6',
      timezone: 'EST',
      openTime: '09:30',
      closeTime: '16:00',
      tradingDays: [1, 2, 3, 4, 5], // Mon-Fri
      isOpen: usMarketStatus.isOpen,
      isPreMarket: usMarketStatus.isPreMarket,
      isAfterHours: usMarketStatus.isAfterHours,
      nextOpenTime: calculateNextMarketTime(now, 9, 30),
      nextCloseTime: calculateNextMarketTime(now, 16, 0),
    },
    {
      assetClass: 'crypto',
      displayName: 'Crypto',
      icon: '🪙',
      color: '#F59E0B',
      timezone: 'UTC',
      openTime: '00:00',
      closeTime: '24:00',
      tradingDays: [0, 1, 2, 3, 4, 5, 6], // 7 days
      isOpen: true, // Always open!
    },
    {
      assetClass: 'commodities',
      displayName: 'Commodities',
      icon: '🥇',
      color: '#EAB308',
      timezone: 'EST',
      openTime: '09:30',
      closeTime: '16:00',
      tradingDays: [1, 2, 3, 4, 5],
      isOpen: usMarketStatus.isOpen,
      isPreMarket: usMarketStatus.isPreMarket,
      isAfterHours: usMarketStatus.isAfterHours,
      nextOpenTime: calculateNextMarketTime(now, 9, 30),
      nextCloseTime: calculateNextMarketTime(now, 16, 0),
    },
    {
      assetClass: 'bonds',
      displayName: 'Bonds',
      icon: '📊',
      color: '#10B981',
      timezone: 'EST',
      openTime: '09:30',
      closeTime: '16:00',
      tradingDays: [1, 2, 3, 4, 5],
      isOpen: usMarketStatus.isOpen,
      isPreMarket: usMarketStatus.isPreMarket,
      isAfterHours: usMarketStatus.isAfterHours,
      nextOpenTime: calculateNextMarketTime(now, 9, 30),
      nextCloseTime: calculateNextMarketTime(now, 16, 0),
    },
    {
      assetClass: 'forex',
      displayName: 'Forex',
      icon: '💱',
      color: '#8B5CF6',
      timezone: 'EST',
      openTime: '09:30',
      closeTime: '16:00',
      tradingDays: [1, 2, 3, 4, 5],
      isOpen: usMarketStatus.isOpen,
      isPreMarket: usMarketStatus.isPreMarket,
      isAfterHours: usMarketStatus.isAfterHours,
      nextOpenTime: calculateNextMarketTime(now, 9, 30),
      nextCloseTime: calculateNextMarketTime(now, 16, 0),
    },
    {
      assetClass: 'REITs',
      displayName: 'REITs',
      icon: '🏢',
      color: '#EC4899',
      timezone: 'EST',
      openTime: '09:30',
      closeTime: '16:00',
      tradingDays: [1, 2, 3, 4, 5],
      isOpen: usMarketStatus.isOpen,
      isPreMarket: usMarketStatus.isPreMarket,
      isAfterHours: usMarketStatus.isAfterHours,
      nextOpenTime: calculateNextMarketTime(now, 9, 30),
      nextCloseTime: calculateNextMarketTime(now, 16, 0),
    },
  ];

  // Add time until open/close for all markets
  markets.forEach(market => {
    if (market.nextOpenTime && !market.isOpen) {
      market.timeUntilOpen = formatTimeUntil(market.nextOpenTime, now);
    }
    if (market.nextCloseTime && market.isOpen) {
      market.timeUntilClose = formatTimeUntil(market.nextCloseTime, now);
    }
  });

  return markets;
}

/**
 * Get trading hours as time blocks for Gantt chart
 */
export interface TimeBlock {
  startHour: number;    // 0-24
  endHour: number;      // 0-24
  type: 'regular' | 'pre-market' | 'after-hours' | 'closed';
}

export function getMarketTimeBlocks(assetClass: AssetClass): TimeBlock[] {
  if (assetClass === 'crypto') {
    // Crypto: 24/7
    return [
      { startHour: 0, endHour: 24, type: 'regular' }
    ];
  }

  // US Markets: 9:30 AM - 4:00 PM EST with pre/after hours
  return [
    { startHour: 0, endHour: 4, type: 'closed' },           // 12 AM - 4 AM: Closed
    { startHour: 4, endHour: 9.5, type: 'pre-market' },     // 4 AM - 9:30 AM: Pre-market
    { startHour: 9.5, endHour: 16, type: 'regular' },       // 9:30 AM - 4 PM: Regular
    { startHour: 16, endHour: 20, type: 'after-hours' },    // 4 PM - 8 PM: After-hours
    { startHour: 20, endHour: 24, type: 'closed' },         // 8 PM - 12 AM: Closed
  ];
}

/**
 * Get current time in EST as hour (0-24)
 */
export function getCurrentTimeEST(): number {
  const now = new Date();
  const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hours = estTime.getHours();
  const minutes = estTime.getMinutes();
  return hours + minutes / 60;
}
