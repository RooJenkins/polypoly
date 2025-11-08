'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

/**
 * Asset Allocation Display Component
 * Shows portfolio breakdown by asset class (market)
 */

interface AssetAllocation {
  assetClass: string;
  displayName: string;
  icon: string;
  color: string;
  positionCount: number;
  positionValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  percentOfPortfolio: number;
  cashAllocated: number;
}

interface AssetAllocationDisplayProps {
  allocations: AssetAllocation[];
  totalValue: number;
  cashBalance: number;
  allocationSummary?: string;
  showPieChart?: boolean;
}

const AssetAllocationDisplay: React.FC<AssetAllocationDisplayProps> = ({
  allocations,
  totalValue,
  cashBalance,
  allocationSummary,
  showPieChart = true,
}) => {
  // Filter to active allocations (>0.1%)
  const activeAllocations = allocations.filter(a => a.percentOfPortfolio > 0.1);

  // Add cash if significant
  const cashPercent = (cashBalance / totalValue) * 100;
  const chartData = [
    ...activeAllocations.map(a => ({
      name: a.displayName,
      value: a.percentOfPortfolio,
      color: a.color,
      icon: a.icon,
    })),
  ];

  if (cashPercent > 0.1) {
    chartData.push({
      name: 'Cash',
      value: cashPercent,
      color: '#6B7280',
      icon: '💵',
    });
  }

  return (
    <div className="space-y-4">
      {/* Summary text */}
      {allocationSummary && (
        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          {allocationSummary}
        </div>
      )}

      {/* Pie Chart */}
      {showPieChart && chartData.length > 0 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                label={(entry) => `${entry.icon} ${entry.value.toFixed(1)}%`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0];
                    return (
                      <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-lg border border-gray-200 dark:border-gray-700">
                        <p className="font-semibold">
                          {data.payload.icon} {data.name}
                        </p>
                        <p className="text-sm">{data.value.toFixed(2)}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Allocation bars */}
      <div className="space-y-2">
        {allocations.map((allocation) => {
          if (allocation.percentOfPortfolio < 0.1) return null;

          const isProfitable = allocation.unrealizedPnL >= 0;

          return (
            <div key={allocation.assetClass} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{allocation.icon}</span>
                  <span className="font-medium">{allocation.displayName}</span>
                  <span className="text-gray-500 text-xs">
                    ({allocation.positionCount} {allocation.positionCount === 1 ? 'position' : 'positions'})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">
                    {allocation.percentOfPortfolio.toFixed(1)}%
                  </span>
                  {allocation.unrealizedPnL !== 0 && (
                    <span className={isProfitable ? 'text-green-600' : 'text-red-600'}>
                      {isProfitable ? '+' : ''}${allocation.unrealizedPnL.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${allocation.percentOfPortfolio}%`,
                    backgroundColor: allocation.color,
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Cash allocation */}
        {cashPercent > 0.1 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span>💵</span>
                <span className="font-medium">Cash</span>
              </div>
              <span className="font-semibold">{cashPercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gray-600"
                style={{ width: `${cashPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetAllocationDisplay;
