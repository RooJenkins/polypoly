'use client';

import { useEffect, useState } from 'react';
import ModelIcon from './ModelIcon';

interface Decision {
  id: string;
  action: string;
  symbol?: string;
  quantity?: number;
  reasoning: string;
  confidence: number;
  riskAssessment?: string;
  targetPrice?: number;
  stopLoss?: number;
  portfolioValue: number;
  cashBalance: number;
  timestamp: Date;
  agent: {
    name: string;
    color: string;
    model: string;
  };
}

export default function ModelChat({ agentId }: { agentId: string }) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDecisions = async () => {
      try {
        const response = await fetch(`/api/decisions?agentId=${agentId}&limit=20`);
        const data = await response.json();
        setDecisions(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching decisions:', error);
        setLoading(false);
      }
    };

    fetchDecisions();
    const interval = setInterval(fetchDecisions, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [agentId]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading AI decisions...</div>;
  }

  if (decisions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No trading decisions yet. The AI will start analyzing the market soon.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {decisions.map((decision) => (
        <div
          key={decision.id}
          className="p-3 bg-[var(--background)] rounded border border-[var(--border)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ModelIcon model={decision.agent.model} size={14} />
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: decision.agent.color }}
              ></div>
              <span className="text-sm font-bold text-gray-400">{decision.agent.name}</span>
              <div
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  decision.action === 'BUY' || decision.action === 'BUY_TO_COVER'
                    ? 'bg-green-500/20 text-[var(--green)]'
                    : decision.action === 'SELL' || decision.action === 'SELL_SHORT'
                    ? 'bg-red-500/20 text-[var(--red)]'
                    : 'bg-gray-500/20 text-gray-400'
                }`}
              >
                {decision.action}
              </div>
              {decision.symbol && (
                <span className="text-sm font-bold text-white">{decision.symbol}</span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(decision.timestamp).toLocaleTimeString('en-US', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          {/* Reasoning */}
          <div className="text-xs text-gray-400 mb-2 line-clamp-2">{decision.reasoning}</div>

          {/* Compact Metrics */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              {decision.quantity && (
                <span className="text-gray-500">Qty: {decision.quantity}</span>
              )}
              <span className="text-gray-500">
                Conf: {(decision.confidence * 100).toFixed(0)}%
              </span>
              {decision.riskAssessment && (
                <span className="text-gray-500">Risk: {decision.riskAssessment}</span>
              )}
            </div>
            <div className="font-mono text-gray-500">
              ${decision.portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
