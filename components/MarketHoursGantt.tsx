'use client';

import React, { useState, useEffect } from 'react';
import { getAllMarketHours, getMarketTimeBlocks, getCurrentTimeEST } from '@/lib/market-hours';
import type { AssetClass } from '@/lib/asset-class-detector';

/**
 * Market Hours Gantt Chart
 *
 * Shows which markets are currently open/closed in a timeline view
 * - X-axis: 24 hours (00:00 to 24:00 EST)
 * - Y-axis: 6 markets (stacked)
 * - Pill-shaped bars showing trading hours
 * - Current time indicator (vertical line)
 * - Real-time updates every minute
 */

interface MarketHoursGanttProps {
  compact?: boolean;
}

const MarketHoursGantt: React.FC<MarketHoursGanttProps> = ({ compact = false }) => {
  const [currentTime, setCurrentTime] = useState(getCurrentTimeEST());
  const [marketHours, setMarketHours] = useState(getAllMarketHours());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTimeEST());
      setMarketHours(getAllMarketHours());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const hours = Array.from({ length: 25 }, (_, i) => i); // 0-24

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          🌍 Global Market Hours
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Live trading schedule • {new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
        </p>
      </div>

      {/* Gantt Chart */}
      <div className="relative bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">

        {/* Time axis (top) */}
        <div className="flex items-center mb-2 pl-24">
          <div className="flex-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            {[0, 3, 6, 9, 12, 15, 18, 21, 24].map(hour => (
              <div key={hour} className="text-center">
                {hour === 24 ? '00' : hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
        </div>

        {/* Market rows */}
        <div className="space-y-3">
          {marketHours.map((market) => {
            const timeBlocks = getMarketTimeBlocks(market.assetClass);

            return (
              <div key={market.assetClass} className="flex items-center">

                {/* Market label */}
                <div className="w-24 flex items-center gap-2">
                  <span className="text-lg">{market.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {market.displayName}
                    </div>
                    {market.isOpen && (
                      <div className="text-xs text-green-600 dark:text-green-400 font-semibold">
                        • OPEN
                      </div>
                    )}
                    {!market.isOpen && market.timeUntilOpen && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Opens {market.timeUntilOpen}
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="flex-1 relative h-10">

                  {/* Background grid */}
                  <div className="absolute inset-0 flex">
                    {hours.slice(0, -1).map((hour) => (
                      <div
                        key={hour}
                        className="flex-1 border-l border-gray-200 dark:border-gray-700"
                      />
                    ))}
                  </div>

                  {/* Time blocks */}
                  {timeBlocks.map((block, idx) => {
                    const startPercent = (block.startHour / 24) * 100;
                    const widthPercent = ((block.endHour - block.startHour) / 24) * 100;

                    let bgColor = 'bg-gray-200 dark:bg-gray-700'; // closed
                    let opacity = 'opacity-30';
                    let borderColor = 'border-gray-300 dark:border-gray-600';

                    if (block.type === 'regular') {
                      bgColor = market.isOpen
                        ? `bg-[${market.color}]`
                        : `bg-[${market.color}]`;
                      opacity = market.isOpen ? 'opacity-100' : 'opacity-60';
                      borderColor = market.isOpen
                        ? 'border-current'
                        : 'border-gray-400 dark:border-gray-500';
                    } else if (block.type === 'pre-market' || block.type === 'after-hours') {
                      bgColor = `bg-[${market.color}]`;
                      opacity = 'opacity-30';
                      borderColor = 'border-gray-400 dark:border-gray-600';
                    }

                    return (
                      <div
                        key={idx}
                        className={`absolute h-8 rounded-full border-2 transition-all duration-300 ${bgColor} ${opacity} ${borderColor}`}
                        style={{
                          left: `${startPercent}%`,
                          width: `${widthPercent}%`,
                          backgroundColor: block.type !== 'closed' ? market.color : undefined,
                          animation: market.isOpen && block.type === 'regular' ? 'pulse 2s ease-in-out infinite' : undefined,
                        }}
                      >
                        {/* Label for regular hours */}
                        {block.type === 'regular' && !compact && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-semibold text-white drop-shadow-lg">
                              {market.openTime} - {market.closeTime} {market.timezone}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Current time indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 animate-pulse"
                    style={{ left: `${(currentTime / 24) * 100}%` }}
                  >
                    <div className="absolute -top-2 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                    <div className="absolute -bottom-2 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">Regular Hours</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-3 rounded-full bg-green-500 opacity-30" />
            <span className="text-gray-600 dark:text-gray-400">Pre/After Market</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-3 rounded-full bg-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">Closed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-3 bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">Current Time ({new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })} EST)</span>
          </div>
        </div>
      </div>

      {/* Market status summary */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
        {marketHours.map((market) => (
          <div
            key={market.assetClass}
            className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{market.icon}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {market.displayName}
              </span>
            </div>
            {market.isOpen ? (
              <div className="text-xs">
                <span className="text-green-600 dark:text-green-400 font-semibold">
                  • OPEN
                </span>
                {market.timeUntilClose && (
                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                    Closes in {market.timeUntilClose}
                  </span>
                )}
              </div>
            ) : market.isPreMarket ? (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                Pre-Market • Opens in {market.timeUntilOpen}
              </div>
            ) : market.isAfterHours ? (
              <div className="text-xs text-purple-600 dark:text-purple-400">
                After-Hours • Closed
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Closed {market.timeUntilOpen ? `• Opens in ${market.timeUntilOpen}` : ''}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};

export default MarketHoursGantt;
