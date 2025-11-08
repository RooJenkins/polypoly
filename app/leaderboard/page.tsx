'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import StockTicker from '@/components/StockTicker';
import ModelIcon from '@/components/ModelIcon';
import type { AIAgent } from '@/types';

export default function Leaderboard() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>('accountValue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [sortBy, sortOrder]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/leaderboard?sortBy=${sortBy}&order=${sortOrder}`);
      const data = await response.json();
      setAgents(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header />
      <StockTicker />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">LEADERBOARD</h1>
          <p className="text-gray-400 text-sm">AI Trading Models Ranked by Performance</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading leaderboard...</div>
        ) : (
          <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--border)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--background)] border-b border-[var(--border)]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Agent
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                      onClick={() => handleSort('accountValue')}
                    >
                      Account Value {sortBy === 'accountValue' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                      onClick={() => handleSort('roi')}
                    >
                      ROI {sortBy === 'roi' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                      onClick={() => handleSort('totalPnL')}
                    >
                      Total P&L {sortBy === 'totalPnL' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                      onClick={() => handleSort('winRate')}
                    >
                      Win Rate {sortBy === 'winRate' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                      onClick={() => handleSort('tradeCount')}
                    >
                      Trades {sortBy === 'tradeCount' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                      onClick={() => handleSort('sharpeRatio')}
                    >
                      Sharpe {sortBy === 'sharpeRatio' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                      onClick={() => handleSort('maxDrawdown')}
                    >
                      Max DD {sortBy === 'maxDrawdown' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Biggest Win
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Biggest Loss
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {agents.map((agent: any, index) => (
                    <tr
                      key={agent.id}
                      className="hover:bg-[var(--background)] transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className={`text-lg font-bold ${
                              index === 0
                                ? 'text-yellow-400'
                                : index === 1
                                ? 'text-gray-300'
                                : index === 2
                                ? 'text-orange-400'
                                : 'text-gray-400'
                            }`}
                          >
                            {agent.rank || index + 1}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <ModelIcon model={agent.model} size={20} />
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: agent.color }}
                          ></div>
                          <div>
                            <div className="font-semibold text-white">{agent.name}</div>
                            <div className="text-xs text-gray-400">{agent.model}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-lg text-white">
                          ${agent.accountValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap font-mono font-semibold ${
                          agent.roi >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'
                        }`}
                      >
                        {agent.roi >= 0 ? '+' : ''}
                        {agent.roi.toFixed(2)}%
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap font-mono font-semibold ${
                          agent.totalPnL >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'
                        }`}
                      >
                        {agent.totalPnL >= 0 ? '+' : ''}$
                        {Math.abs(agent.totalPnL).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono">
                        {agent.winRate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono">
                        {agent.tradeCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono">
                        {agent.sharpeRatio.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-[var(--red)]">
                        {agent.maxDrawdown.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-[var(--green)]">
                        ${agent.biggestWin.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-[var(--red)]">
                        ${agent.biggestLoss.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {agents.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No agents found. Please seed the database with agents.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
