'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import StockTicker from '@/components/StockTicker';
import PerformanceChartOption3 from '@/components/PerformanceChartOption3';
import TradesList from '@/components/TradesList';
import PositionsList from '@/components/PositionsList';
import ModelChat from '@/components/ModelChat';
import AnimatedNumber from '@/components/AnimatedNumber';
import ModelIcon from '@/components/ModelIcon';
import type { AIAgent } from '@/types';

export default function Home() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'trades' | 'positions' | 'chat'>('trades');

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agents');
        const data = await response.json();
        setAgents(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching agents:', error);
        setLoading(false);
      }
    };

    fetchAgents();
    const interval = setInterval(fetchAgents, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [selectedAgent]);

  const currentAgent = agents.find((a) => a.id === selectedAgent);

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[var(--background)] lg:overflow-hidden">
      <Header />
      <StockTicker />

      {/* Main Content Area - Responsive Layout */}
      <main className="flex-1 flex flex-col lg:overflow-hidden">
        {/* Agent Cards Section - Responsive Grid */}
        <div className="border-b border-[var(--border)] bg-[var(--background)] px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent.id)}
                className={`p-2 sm:p-3 rounded-lg border transition-all text-left ${
                  selectedAgent === agent.id
                    ? 'border-[var(--blue)] bg-[var(--card-bg)] ring-2 ring-[var(--blue)] ring-opacity-50'
                    : 'border-[var(--border)] bg-[var(--card-bg)] hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: agent.color }}
                    ></div>
                    <ModelIcon model={agent.model} size={14} className="flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs font-bold truncate">{agent.name}</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <div className="text-base sm:text-xl font-mono font-bold text-white">
                    <AnimatedNumber value={agent.accountValue} decimals={0} prefix="$" className="font-mono" />
                  </div>
                  <div
                    className={`text-xs sm:text-sm font-mono font-bold flex items-center ${
                      agent.roi >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'
                    }`}
                  >
                    <span>{agent.roi >= 0 ? '+' : '-'}</span>
                    <AnimatedNumber value={Math.abs(agent.roi)} decimals={2} suffix="%" className="font-mono" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chart + Activity Feed Section - Responsive Flex */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 lg:overflow-hidden">
          {/* Left: Performance Chart */}
          <div className="flex-1 flex flex-col p-3 sm:p-4 lg:border-r border-[var(--border)] lg:overflow-hidden">
            <div className="flex items-center mb-2 flex-shrink-0">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-white">TOTAL ACCOUNT VALUE</h2>
            </div>
            <div className="h-[500px] lg:flex-1 lg:overflow-hidden">
              <PerformanceChartOption3 agents={agents} />
            </div>
          </div>

          {/* Right: Activity Feed - Full width on mobile, fixed width on desktop */}
          <div className="w-full lg:w-[500px] flex flex-col bg-[var(--card-bg)] lg:border-l border-[var(--border)] lg:overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-[var(--border)] bg-[var(--background)]">
              <button
                onClick={() => setActiveTab('trades')}
                className={`flex-1 px-2 sm:px-4 py-2 sm:py-3 text-[9px] sm:text-[11px] font-bold uppercase tracking-wide transition-colors ${
                  activeTab === 'trades'
                    ? 'bg-[var(--card-bg)] text-white border-b-2 border-[var(--blue)]'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Trades
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 px-2 sm:px-4 py-2 sm:py-3 text-[9px] sm:text-[11px] font-bold uppercase tracking-wide transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-[var(--card-bg)] text-white border-b-2 border-[var(--blue)]'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('positions')}
                className={`flex-1 px-2 sm:px-4 py-2 sm:py-3 text-[9px] sm:text-[11px] font-bold uppercase tracking-wide transition-colors ${
                  activeTab === 'positions'
                    ? 'bg-[var(--card-bg)] text-white border-b-2 border-[var(--blue)]'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Positions
              </button>
            </div>

            {/* Filter */}
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-[var(--border)] bg-[var(--background)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400">FILTER:</span>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium bg-[var(--card-bg)] border border-[var(--border)] rounded text-white hover:border-gray-500 transition-colors cursor-pointer"
                >
                  <option value="all">All Models</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content Area with Scroll */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-8">
              {activeTab === 'trades' && <TradesList agentId={selectedAgent === 'all' ? '' : selectedAgent} />}
              {activeTab === 'chat' && <ModelChat agentId={selectedAgent === 'all' ? '' : selectedAgent} />}
              {activeTab === 'positions' && <PositionsList agentId={selectedAgent === 'all' ? '' : selectedAgent} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
