'use client';

import { useEffect, useState } from 'react';
import ModelIcon from './ModelIcon';

interface Trade {
  id: string;
  symbol: string;
  name: string;
  action: string;
  quantity: number;
  price: number;
  total: number;
  realizedPnL?: number;
  reasoning: string;
  confidence: number;
  timestamp: Date;
  agent?: {
    name: string;
    color: string;
    model: string;
  };
}

export default function TradesList({ agentId }: { agentId: string }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await fetch(`/api/trades?agentId=${agentId}&limit=20`);
        const data = await response.json();
        setTrades(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching trades:', error);
        setLoading(false);
      }
    };

    fetchTrades();
    const interval = setInterval(fetchTrades, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [agentId]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading trades...</div>;
  }

  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No trades yet. This AI will start trading soon.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {trades.map((trade) => (
        <div
          key={trade.id}
          className="p-3 bg-[var(--background)] rounded border border-[var(--border)] hover:border-gray-600 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {trade.agent && <ModelIcon model={trade.agent.model} size={14} />}
              <div
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  trade.action === 'BUY' || trade.action === 'BUY_TO_COVER'
                    ? 'bg-green-500/20 text-[var(--green)]'
                    : 'bg-red-500/20 text-[var(--red)]'
                }`}
              >
                {trade.action === 'BUY' || trade.action === 'BUY_TO_COVER' ? '↗' : '↘'} {trade.action}
              </div>
              <span className="text-sm font-bold text-white">{trade.symbol}</span>
            </div>
            <div className="text-xs text-gray-500">
              {new Date(trade.timestamp).toLocaleTimeString('en-US', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          <div className="text-xs text-gray-400 mb-2 line-clamp-2">{trade.reasoning}</div>

          <div className="flex items-center justify-between text-xs">
            <div className="text-gray-500">
              Quantity: {trade.quantity} @ ${trade.price.toFixed(2)}
            </div>
            {trade.realizedPnL !== null && trade.realizedPnL !== undefined && (
              <div
                className={`font-mono font-bold ${
                  trade.realizedPnL >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'
                }`}
              >
                {trade.realizedPnL >= 0 ? '+' : ''}${trade.realizedPnL.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
