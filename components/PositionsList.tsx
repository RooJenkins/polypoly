'use client';

import { useEffect, useState } from 'react';
import AnimatedNumber from './AnimatedNumber';
import ModelIcon from './ModelIcon';

interface Position {
  id: string;
  symbol: string;
  name: string;
  side: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  openedAt: Date;
  agent?: {
    name: string;
    color: string;
    model: string;
  };
}

export default function PositionsList({ agentId }: { agentId: string }) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const response = await fetch(`/api/positions?agentId=${agentId}`);
        const data = await response.json();
        setPositions(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching positions:', error);
        setLoading(false);
      }
    };

    fetchPositions();
    const interval = setInterval(fetchPositions, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [agentId]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading positions...</div>;
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No open positions. All positions have been closed.
      </div>
    );
  }

  // Group positions by agent
  const positionsByAgent = positions.reduce((acc, position) => {
    const agentName = position.agent?.name || 'Unknown';
    if (!acc[agentName]) {
      acc[agentName] = {
        agent: position.agent,
        positions: [],
        totalPnL: 0,
      };
    }
    acc[agentName].positions.push(position);
    acc[agentName].totalPnL += position.unrealizedPnL;
    return acc;
  }, {} as Record<string, { agent: any; positions: typeof positions; totalPnL: number }>);

  return (
    <div className="space-y-6">
      {Object.entries(positionsByAgent).map(([agentName, data]) => (
        <div key={agentName} className="border border-[var(--border)] rounded-lg overflow-hidden">
          {/* Agent Header */}
          <div className="bg-[var(--card-bg)] p-3 border-b border-[var(--border)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                {data.agent && <ModelIcon model={data.agent.model} size={20} />}
                <span className="font-bold text-white text-sm sm:text-base">{agentName}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="text-[10px] sm:text-sm text-gray-400">TOTAL UNREALIZED P&L:</span>
                <span
                  className={`font-mono font-bold text-base sm:text-lg ${
                    data.totalPnL >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'
                  }`}
                >
                  {data.totalPnL >= 0 ? '+$' : '-$'}{Math.abs(data.totalPnL).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable Table Container */}
          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              {/* Table Header */}
              <div className="grid grid-cols-[50px_90px_45px_70px_70px_75px] gap-1.5 px-2 py-2 bg-[var(--background)] border-b border-[var(--border)] text-[10px] font-bold text-gray-400 uppercase">
                <div>Side</div>
                <div>Stock</div>
                <div className="text-right">Qty</div>
                <div className="text-right">Entry</div>
                <div className="text-right">Current</div>
                <div className="text-right">P&L</div>
              </div>

              {/* Position Rows */}
              {data.positions.map((position) => {
                const positionValue = position.currentPrice * position.quantity;
                return (
                  <div
                    key={position.id}
                    className="grid grid-cols-[50px_90px_45px_70px_70px_75px] gap-1.5 px-2 py-2 border-b border-[var(--border)] hover:bg-[var(--card-bg)] transition-colors items-center"
                  >
                    <div className={`font-bold text-[11px] ${position.side === 'SHORT' ? 'text-[var(--red)]' : 'text-[var(--green)]'}`}>
                      {position.side || 'LONG'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-[11px]">{position.symbol}</span>
                    </div>
                    <div className="text-right font-mono text-white text-[11px]">{position.quantity}</div>
                    <div className="text-right font-mono text-white text-[11px]">${position.entryPrice.toFixed(2)}</div>
                    <div className="text-right font-mono text-[11px]">
                      <AnimatedNumber value={position.currentPrice} decimals={2} prefix="$" className="font-mono text-white" />
                    </div>
                    <div
                      className={`text-right font-mono font-bold text-[11px] ${
                        position.unrealizedPnL >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'
                      }`}
                    >
                      {position.unrealizedPnL >= 0 ? '+$' : '-$'}{Math.abs(position.unrealizedPnL).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
