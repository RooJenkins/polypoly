'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import PerformanceChartOption3 from '@/components/PerformanceChartOption3';
import ModelIcon from '@/components/ModelIcon';
import StockTicker from '@/components/StockTicker';
import AdvancedHeatmaps from '@/components/AdvancedHeatmaps';
import type { AIAgent } from '@/types';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';

// Company logo helper function
const StockLogo = ({ symbol, size = 14 }: { symbol: string; size?: number }) => {
  const logos: Record<string, React.ReactElement> = {
    AAPL: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
    ),
    NVDA: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.61 3L3 21h3.55l1.05-3.28h6.71L15.36 21h3.64L13.39 3H8.61zm1.39 11.71l2-6.28 2 6.28h-4z"/>
      </svg>
    ),
    GOOGL: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
      </svg>
    ),
    MSFT: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
      </svg>
    ),
    AMZN: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M14.31 18.52c-2.94 2.17-7.21 3.32-10.87 3.32-5.14 0-9.77-1.90-13.27-5.07-.28-.25-.03-.58.30-.39 3.80 2.21 8.50 3.54 13.36 3.54 3.27 0 6.87-.68 10.18-2.08.50-.21.91.33.44.68h-.14zM16 16.5c-.37-.48-2.46-.23-3.39-.11-.28.03-.32-.21-.07-.39 1.66-1.17 4.39-.83 4.71-.44.32.39-.09 3.12-1.64 4.42-.24.20-.47.09-.36-.17.35-.87 1.13-2.83.75-3.31z"/>
        <path d="M15.12 10.74V9.58c0-.18.13-.29.29-.29h5.16c.17 0 .30.12.30.29v1.00c0 .17-.14.39-.39.74l-2.67 3.81c.99-.02 2.04.12 2.95.64.20.12.26.29.27.46v1.24c0 .17-.19.37-.39.27-1.63-.86-3.79-.95-5.59.01-.18.09-.37-.10-.37-.27v-1.18c0-.19 0-.52.20-.81l3.09-4.42h-2.69c-.16 0-.29-.12-.29-.29h.13z"/>
      </svg>
    ),
    TSLA: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 5.362l2.475-3.026s4.245.09 8.471 2.054c-1.082 1.636-3.231 2.438-3.231 2.438-.146-1.439-1.154-1.79-4.354-1.79L12 24 8.619 5.034c-3.18 0-4.188.354-4.335 1.792 0 0-2.146-.795-3.229-2.43C5.28 2.431 9.525 2.34 9.525 2.34L12 5.362z"/>
      </svg>
    ),
    META: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    JPM: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M14.357 18.44c-.11 0-.175-.065-.175-.175v-3.725c0-.11.065-.175.175-.175h1.43c1.1 0 1.87.33 2.31.99.33.495.495 1.155.495 1.98s-.165 1.485-.495 1.98c-.44.66-1.21.99-2.31.99h-1.43zm1.43-3.52h-.88v2.97h.88c.66 0 1.155-.22 1.485-.66.22-.33.33-.77.33-1.32 0-.55-.11-.99-.33-1.32-.33-.44-.825-.66-1.485-.66h0zm-4.95 3.52c-.11 0-.175-.065-.175-.175v-3.725c0-.11.065-.175.175-.175h1.43c1.1 0 1.87.33 2.31.99.33.495.495 1.155.495 1.98s-.165 1.485-.495 1.98c-.44.66-1.21.99-2.31.99h-1.43zm1.43-3.52h-.88v2.97h.88c.66 0 1.155-.22 1.485-.66.22-.33.33-.77.33-1.32 0-.55-.11-.99-.33-1.32-.33-.44-.825-.66-1.485-.66h0z"/>
      </svg>
    ),
  };

  return logos[symbol] || (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 11L5 7L8 9L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 3H12V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};





export default function SplitViewPage() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'trades' | 'chat' | 'positions' | 'analysis'>('trades');
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<Record<string, any[]>>({});
  const [stocks, setStocks] = useState<any[]>([]);
  const [mainTab, setMainTab] = useState<'performance' | 'overall' | 'advanced'>('performance');
  const [timeFilter, setTimeFilter] = useState<'all' | '72h' | '24h'>('all');
  const [tradeFilter, setTradeFilter] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch agents
        const agentsRes = await fetch('/api/agents');
        if (!agentsRes.ok) {
          console.error('Failed to fetch agents:', agentsRes.status);
          setLoading(false);
          return;
        }
        const agentsData = await agentsRes.json();
        if (!Array.isArray(agentsData)) {
          console.error('Agents data is not an array:', agentsData);
          setLoading(false);
          return;
        }
        setAgents(agentsData);

        // Fetch performance data
        const performanceRes = await fetch('/api/performance');
        if (performanceRes.ok) {
          const performanceData = await performanceRes.json();
          setPerformanceData(performanceData);
        }

        // Fetch trades
        const tradesRes = await fetch('/api/trades');
        if (tradesRes.ok) {
          const tradesData = await tradesRes.json();
          setTrades(tradesData);
        }

        // Fetch positions
        const positionsRes = await fetch('/api/positions');
        if (positionsRes.ok) {
          const positionsData = await positionsRes.json();
          setPositions(positionsData);
        }

        // Fetch decisions (increase limit to get more historical data)
        const decisionsRes = await fetch('/api/decisions?limit=200');
        if (decisionsRes.ok) {
          const decisionsData = await decisionsRes.json();
          // Group decisions by agentId
          const groupedDecisions: Record<string, any[]> = {};
          decisionsData.forEach((decision: any) => {
            if (!groupedDecisions[decision.agentId]) {
              groupedDecisions[decision.agentId] = [];
            }
            groupedDecisions[decision.agentId].push(decision);
          });
          setDecisions(groupedDecisions);
        }

        // Fetch stock tickers - we'll fetch a list of common stocks
        const stockSymbols = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META', 'JPM'];
        const stockPromises = stockSymbols.map(async (symbol) => {
          try {
            const res = await fetch(`/api/stocks/${symbol}`);
            if (res.ok) {
              const data = await res.json();
              return { symbol, ...data };
            }
          } catch (e) {
            console.error(`Failed to fetch ${symbol}:`, e);
          }
          return null;
        });
        const stocksData = (await Promise.all(stockPromises)).filter(Boolean);
        setStocks(stocksData);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalValue = agents.reduce((sum, agent) => sum + agent.accountValue, 0);
  const startingValue = agents.length * 10000;
  const totalGain = totalValue - startingValue;
  const totalGainPercent = startingValue > 0 ? (totalGain / startingValue) * 100 : 0;
  // Filter out S&P 20 benchmark from UI display (keep in chart data)
  const sortedAgents = [...agents].filter(a => a.id !== 'benchmark-sp20').sort((a, b) => b.roi - a.roi);
  const selectedAgent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) : null;

  const highestAgent = sortedAgents.length > 0 ? sortedAgents[0] : null;
  const lowestAgent = sortedAgents.length > 0 ? sortedAgents[sortedAgents.length - 1] : null;

  const filteredTrades = tradeFilter === 'all'
    ? trades
    : trades.filter(t => t.agentId === tradeFilter);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{
      backgroundColor: '#FFF1E0',
      fontFamily: 'Georgia, "Times New Roman", serif',
      color: '#33302E'
    }}>
      {/* Custom Pill-Shaped Scrollbar Styles */}
      <style>
        {`
          /* Webkit browsers (Chrome, Safari, Edge) */
          ::-webkit-scrollbar {
            width: 12px;
            height: 12px;
          }

          ::-webkit-scrollbar-track {
            background: #E9DECF;
            border-radius: 10px;
            margin: 4px;
          }

          ::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #990F3D 0%, #b8123f 100%);
            border-radius: 10px;
            border: 2px solid #E9DECF;
            transition: all 0.2s ease;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #7a0c30 0%, #990F3D 100%);
            border: 2px solid #CCC1B7;
          }

          ::-webkit-scrollbar-thumb:active {
            background: #7a0c30;
          }

          /* For horizontal scrollbars */
          ::-webkit-scrollbar-corner {
            background: #E9DECF;
          }
        `}
      </style>
      {/* Sleek Header */}
      <div style={{
        background: 'linear-gradient(135deg, #F5E6D3 0%, #F8EBD8 100%)',
        color: '#262A33',
        padding: '6px 20px',
        borderBottom: '2px solid #990F3D',
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link href="/" style={{
            color: '#262A33',
            fontSize: '10px',
            textDecoration: 'none',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: '600',
            padding: '4px 12px',
            backgroundColor: 'rgba(38, 42, 51, 0.08)',
            borderRadius: '16px',
            transition: 'all 0.2s',
            border: '1px solid rgba(38, 42, 51, 0.15)'
          }}>
            ← Live Arena
          </Link>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div style={{
              fontSize: '8px',
              fontWeight: '700',
              color: '#990F3D',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontFamily: 'system-ui, sans-serif',
              padding: '2px 8px',
              backgroundColor: 'rgba(153, 15, 61, 0.15)',
              borderRadius: '10px',
              border: '1px solid rgba(153, 15, 61, 0.3)'
            }}>
              AI Trading Arena
            </div>
            <h1 style={{
              fontSize: '16px',
              fontWeight: '500',
              margin: 0,
              letterSpacing: '-0.5px',
              lineHeight: '1',
              color: '#262A33'
            }}>
              Model Leaderboard
            </h1>
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Link
            href="/how-it-works"
            style={{
              fontSize: '11px',
              fontWeight: '600',
              color: '#990F3D',
              textDecoration: 'none',
              padding: '6px 14px',
              backgroundColor: 'rgba(153, 15, 61, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(153, 15, 61, 0.3)',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(153, 15, 61, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(153, 15, 61, 0.1)';
            }}
          >
            📖 How It Works
          </Link>
          <div style={{
            fontSize: '9px',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'right',
            color: '#66605C',
            padding: '4px 10px',
            backgroundColor: 'rgba(38, 42, 51, 0.05)',
            borderRadius: '14px',
            border: '1px solid #CCC1B7'
          }}>
            <div style={{ marginBottom: '1px', fontSize: '8px' }}>Portfolio</div>
            <div style={{ color: '#262A33', fontWeight: '700', fontSize: '11px' }}>
              ${totalValue.toLocaleString()}
            </div>
          </div>
          <div style={{
            color: totalGainPercent >= 0 ? '#0F7B3A' : '#CC0000',
            fontWeight: '700',
            fontSize: '11px',
            padding: '5px 12px',
            backgroundColor: totalGainPercent >= 0 ? 'rgba(15, 123, 58, 0.15)' : 'rgba(204, 0, 0, 0.15)',
            borderRadius: '14px',
            border: `1px solid ${totalGainPercent >= 0 ? 'rgba(15, 123, 58, 0.3)' : 'rgba(204, 0, 0, 0.3)'}`
          }}>
            {totalGainPercent >= 0 ? '▲' : '▼'} {Math.abs(totalGainPercent).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Stock Ticker Carousel */}
      <StockTicker />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Side - Main Content with Tabs */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px', paddingRight: '8px' }}>

          {/* Pill-Shaped Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px',
            padding: '4px',
            backgroundColor: '#E9DECF',
            borderRadius: '24px',
            border: '1px solid #CCC1B7'
          }}>
            {[
              { id: 'performance' as const, label: 'Performance' },
              { id: 'overall' as const, label: 'Overall Stats' },
              { id: 'advanced' as const, label: 'Advanced Analytics' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  backgroundColor: mainTab === tab.id ? '#990F3D' : 'transparent',
                  color: mainTab === tab.id ? '#FFF1E5' : '#66605C',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontFamily: 'system-ui, sans-serif',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.3px',
                  boxShadow: mainTab === tab.id ? '0 2px 6px rgba(153, 15, 61, 0.3)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (mainTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(153, 15, 61, 0.1)';
                    e.currentTarget.style.color = '#990F3D';
                  }
                }}
                onMouseLeave={(e) => {
                  if (mainTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#66605C';
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sleek Model Selector Cards - Two-Line Pills */}
          <div style={{
            display: 'flex',
            gap: '6px',
            marginBottom: '16px',
            paddingBottom: '4px',
            flexWrap: 'nowrap'
          }}>
            {sortedAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id === selectedAgentId ? null : agent.id)}
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                  padding: '7px 12px',
                  background: selectedAgentId === agent.id
                    ? 'linear-gradient(135deg, #E9DECF 0%, #F0E4D4 100%)'
                    : 'linear-gradient(135deg, #F5E6D3 0%, #F8EBD8 100%)',
                  border: selectedAgentId === agent.id ? '2px solid #990F3D' : '1px solid #CCC1B7',
                  borderRadius: '24px',
                  cursor: 'pointer',
                  fontFamily: 'system-ui, sans-serif',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedAgentId === agent.id
                    ? '0 4px 12px rgba(153, 15, 61, 0.15)'
                    : '0 2px 6px rgba(0, 0, 0, 0.05)',
                  transform: selectedAgentId === agent.id ? 'translateY(-2px)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (selectedAgentId !== agent.id) {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedAgentId !== agent.id) {
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.transform = 'none';
                  }
                }}
              >
                {/* Top line: Icon + Model name */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <div style={{
                    width: '22px',
                    height: '22px',
                    minWidth: '22px',
                    borderRadius: '50%',
                    backgroundColor: agent.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 2px 4px ${agent.color}60`
                  }}>
                    <ModelIcon model={agent.model} size={11} />
                  </div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#262A33',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {agent.name}
                  </div>
                </div>

                {/* Bottom line: Value, ROI */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    fontFamily: 'monospace',
                    color: '#262A33',
                    backgroundColor: agent.color,
                    padding: '4px 9px',
                    borderRadius: '12px',
                    boxShadow: `0 1px 3px ${agent.color}60`,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    height: '24px'
                  }}>
                    ${(agent.accountValue / 1000).toFixed(1)}k
                  </div>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: agent.roi >= 0 ? '#0F7B3A' : '#CC0000',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    backgroundColor: agent.roi >= 0 ? 'rgba(15, 123, 58, 0.1)' : 'rgba(204, 0, 0, 0.1)',
                    border: `1px solid ${agent.roi >= 0 ? 'rgba(15, 123, 58, 0.2)' : 'rgba(204, 0, 0, 0.2)'}`,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    height: '24px'
                  }}>
                    {agent.roi >= 0 ? '▲' : '▼'} {Math.abs(agent.roi || 0).toFixed(1)}%
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Performance Tab - Sleek Chart */}
          {mainTab === 'performance' && (
            <div style={{
              flex: 1,
              background: 'linear-gradient(135deg, #F5E6D3 0%, #F8EBD8 100%)',
              border: '1px solid #CCC1B7',
              borderRadius: '20px',
              padding: '24px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  margin: 0,
                  color: '#262A33',
                  fontFamily: 'Georgia, serif',
                  letterSpacing: '-0.3px'
                }}>
                  {selectedAgent ? `${selectedAgent.name} Performance` : 'Portfolio Performance'}
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setTimeFilter('all')}
                    style={{
                      padding: '8px 18px',
                      fontSize: '11px',
                      fontWeight: '600',
                      fontFamily: 'system-ui, sans-serif',
                      backgroundColor: timeFilter === 'all' ? '#990F3D' : 'rgba(255, 255, 255, 0.6)',
                      color: timeFilter === 'all' ? '#FFF1E5' : '#66605C',
                      border: '1px solid #CCC1B7',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: timeFilter === 'all' ? '0 2px 4px rgba(153, 15, 61, 0.2)' : 'none'
                    }}
                  >
                    ALL
                  </button>
                  <button
                    onClick={() => setTimeFilter('72h')}
                    style={{
                      padding: '8px 18px',
                      fontSize: '11px',
                      fontWeight: '600',
                      fontFamily: 'system-ui, sans-serif',
                      backgroundColor: timeFilter === '72h' ? '#990F3D' : 'rgba(255, 255, 255, 0.6)',
                      color: timeFilter === '72h' ? '#FFF1E5' : '#66605C',
                      border: '1px solid #CCC1B7',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: timeFilter === '72h' ? '0 2px 4px rgba(153, 15, 61, 0.2)' : 'none'
                    }}
                  >
                    72H
                  </button>
                  {selectedAgent && (
                    <button
                      onClick={() => setSelectedAgentId(null)}
                      style={{
                        padding: '8px 18px',
                        fontSize: '11px',
                        fontWeight: '600',
                        fontFamily: 'system-ui, sans-serif',
                        backgroundColor: '#2E5C8A',
                        color: '#FFF1E5',
                        border: 'none',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(46, 92, 138, 0.2)'
                      }}
                    >
                      View All Models
                    </button>
                  )}
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <PerformanceChartOption3
                  agents={selectedAgentId ? agents.filter(a => a.id === selectedAgentId) : agents}
                  mockData={performanceData}
                />
              </div>
            </div>
          )}

          {/* Overall Stats Tab - Refined Table */}
          {mainTab === 'overall' && (
            <div style={{
              flex: 1,
              background: 'linear-gradient(135deg, #F5E6D3 0%, #F8EBD8 100%)',
              border: '1px solid #CCC1B7',
              borderRadius: '20px',
              overflow: 'auto',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
                fontFamily: 'system-ui, sans-serif'
              }}>
                <thead style={{
                  position: 'sticky',
                  top: 0,
                  background: 'linear-gradient(to bottom, #E0D4C3 0%, #E9DECF 100%)',
                  borderBottom: '2px solid #990F3D',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                }}>
                  <tr>
                    <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: '700' }}>Rank</th>
                    <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: '700' }}>Model</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '700' }}>Account Value</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '700' }}>Return %</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '700' }}>P&L</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '700' }}>Fees</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '700' }}>Win Rate</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '700' }}>Biggest Win</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '700' }}>Biggest Loss</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '700' }}>Sharpe</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '700' }}>Trades</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAgents.map((agent, index) => (
                    <tr
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id === selectedAgentId ? null : agent.id)}
                      style={{
                        borderBottom: '1px solid #E9DECF',
                        cursor: 'pointer',
                        backgroundColor: selectedAgentId === agent.id ? '#E9DECF' : '#F5E6D3'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedAgentId !== agent.id) {
                          e.currentTarget.style.backgroundColor = '#EBE0D0';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedAgentId !== agent.id) {
                          e.currentTarget.style.backgroundColor = '#F5E6D3';
                        }
                      }}
                    >
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          backgroundColor: selectedAgentId === agent.id ? '#F8EBD8' : '#E9DECF',
                          borderRadius: '16px',
                          fontWeight: '700',
                          border: selectedAgentId === agent.id ? '1px solid #CCC1B7' : 'none'
                        }}>
                          {index + 1}
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: agent.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <ModelIcon model={agent.model} size={12} />
                          </div>
                          <div style={{
                            padding: '6px 12px',
                            backgroundColor: selectedAgentId === agent.id ? '#F8EBD8' : '#E9DECF',
                            borderRadius: '16px',
                            fontWeight: '600',
                            border: selectedAgentId === agent.id ? '1px solid #CCC1B7' : 'none'
                          }}>
                            {agent.name}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          backgroundColor: selectedAgentId === agent.id ? '#F8EBD8' : '#E9DECF',
                          borderRadius: '16px',
                          fontWeight: '700',
                          border: selectedAgentId === agent.id ? '1px solid #CCC1B7' : 'none'
                        }}>
                          ${agent.accountValue.toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          backgroundColor: agent.roi >= 0 ? 'rgba(15, 123, 58, 0.1)' : 'rgba(204, 0, 0, 0.1)',
                          color: agent.roi >= 0 ? '#0F7B3A' : '#CC0000',
                          borderRadius: '16px',
                          fontWeight: '700'
                        }}>
                          {agent.roi >= 0 ? '+' : ''}{(agent.roi || 0).toFixed(2)}%
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          backgroundColor: (agent.totalPnL || 0) >= 0 ? 'rgba(15, 123, 58, 0.1)' : 'rgba(204, 0, 0, 0.1)',
                          color: (agent.totalPnL || 0) >= 0 ? '#0F7B3A' : '#CC0000',
                          borderRadius: '16px',
                          fontWeight: '700'
                        }}>
                          {(agent.totalPnL || 0) >= 0 ? '+' : ''}${agent.totalPnL?.toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          backgroundColor: selectedAgentId === agent.id ? '#F8EBD8' : '#E9DECF',
                          borderRadius: '16px',
                          fontWeight: '600',
                          border: selectedAgentId === agent.id ? '1px solid #CCC1B7' : 'none'
                        }}>
                          ${((agent as any).fees || 0).toFixed(2)}
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          backgroundColor: selectedAgentId === agent.id ? '#F8EBD8' : '#E9DECF',
                          borderRadius: '16px',
                          fontWeight: '600',
                          border: selectedAgentId === agent.id ? '1px solid #CCC1B7' : 'none'
                        }}>
                          {(agent.winRate || 0).toFixed(1)}%
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          backgroundColor: 'rgba(15, 123, 58, 0.1)',
                          color: '#0F7B3A',
                          borderRadius: '16px',
                          fontWeight: '700'
                        }}>
                          ${(agent.biggestWin || 0).toFixed(0)}
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          backgroundColor: 'rgba(204, 0, 0, 0.1)',
                          color: '#CC0000',
                          borderRadius: '16px',
                          fontWeight: '700'
                        }}>
                          ${Math.abs(agent.biggestLoss || 0).toFixed(0)}
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          backgroundColor: selectedAgentId === agent.id ? '#F8EBD8' : '#E9DECF',
                          borderRadius: '16px',
                          fontWeight: '600',
                          border: selectedAgentId === agent.id ? '1px solid #CCC1B7' : 'none'
                        }}>
                          {(agent.sharpeRatio || 0).toFixed(3)}
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          backgroundColor: selectedAgentId === agent.id ? '#F8EBD8' : '#E9DECF',
                          borderRadius: '16px',
                          fontWeight: '600',
                          border: selectedAgentId === agent.id ? '1px solid #CCC1B7' : 'none'
                        }}>
                          {agent.tradeCount}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Advanced Analytics Tab - Refined Table */}
          {mainTab === 'advanced' && (
            <div style={{
              flex: 1,
              background: 'linear-gradient(135deg, #F5E6D3 0%, #F8EBD8 100%)',
              border: '1px solid #CCC1B7',
              borderRadius: '20px',
              overflow: 'auto',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              display: 'flex',
              flexDirection: 'column'
            }}>

              {/* Advanced Heatmaps Section */}
              <AdvancedHeatmaps agents={sortedAgents} selectedAgentId={selectedAgentId} />

              {/* Charts Section */}
              <div style={{
                padding: '20px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                borderBottom: '2px solid #990F3D'
              }}>
                {/* Risk-Return Scatter Plot */}
                <div style={{
                  backgroundColor: '#F8EBD8',
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid #CCC1B7'
                }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '16px', color: '#262A33' }}>
                    Risk vs Return Analysis
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#CCC1B7" />
                      <XAxis
                        type="number"
                        dataKey="risk"
                        name="Risk"
                        label={{ value: 'Max Drawdown (%)', position: 'insideBottom', offset: -10, style: { fontSize: 11, fill: '#66605C', fontWeight: '600' } }}
                        tick={{ fontSize: 10, fill: '#66605C' }}
                        stroke="#66605C"
                      />
                      <YAxis
                        type="number"
                        dataKey="roi"
                        name="ROI"
                        label={{ value: 'ROI (%)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#66605C', fontWeight: '600' } }}
                        tick={{ fontSize: 10, fill: '#66605C' }}
                        stroke="#66605C"
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFF1E5', border: '1px solid #CCC1B7', borderRadius: '8px', fontSize: '11px' }}
                        formatter={(value: any) => [`${Number(value || 0).toFixed(2)}%`]}
                      />
                      <Scatter
                        data={sortedAgents.map(agent => ({
                          risk: Math.abs(agent.maxDrawdown || 0),
                          roi: agent.roi || 0,
                          name: agent.name,
                          fill: agent.color,
                          trades: agent.tradeCount,
                          agentId: agent.id
                        }))}
                        fill="#8884d8"
                      >
                        {sortedAgents.map((agent, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={agent.color}
                            fillOpacity={selectedAgentId && selectedAgentId !== agent.id ? 0.3 : 1}
                            r={selectedAgentId === agent.id ? 10 : 6}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                {/* Win Rate Comparison Bar Chart */}
                <div style={{
                  backgroundColor: '#F8EBD8',
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid #CCC1B7'
                }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: '#262A33' }}>
                    Win Rate Rankings
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={[...sortedAgents].sort((a, b) => (b.winRate || 0) - (a.winRate || 0))}
                      margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#CCC1B7" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: '#66605C' }}
                        stroke="#66605C"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#66605C' }}
                        stroke="#66605C"
                        label={{ value: 'Win Rate (%)', angle: -90, position: 'left', style: { fontSize: 10, fill: '#66605C' } }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFF1E5', border: '1px solid #CCC1B7', borderRadius: '8px', fontSize: '11px' }}
                        formatter={(value: any) => [`${Number(value || 0).toFixed(1)}%`]}
                      />
                      <Bar dataKey="winRate" radius={[8, 8, 0, 0]}>
                        {sortedAgents.map((agent, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={agent.color}
                            fillOpacity={selectedAgentId && selectedAgentId !== agent.id ? 0.3 : 1}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Model Comparison Radar Chart */}
                <div style={{
                  backgroundColor: '#F8EBD8',
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid #CCC1B7'
                }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: '#262A33', textAlign: 'center' }}>
                    Head-to-Head: All Models
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={[
                      {
                        metric: 'ROI',
                        ...Object.fromEntries(sortedAgents.map(a => [a.name, (a.roi / 5) * 100]))
                      },
                      {
                        metric: 'Win Rate',
                        ...Object.fromEntries(sortedAgents.map(a => [a.name, a.winRate]))
                      },
                      {
                        metric: 'Sharpe',
                        ...Object.fromEntries(sortedAgents.map(a => [a.name, (a.sharpeRatio / 2) * 100]))
                      },
                      {
                        metric: 'Trades',
                        ...Object.fromEntries(sortedAgents.map(a => [a.name, (a.tradeCount / 20) * 100]))
                      },
                      {
                        metric: 'Risk Ctrl',
                        ...Object.fromEntries(sortedAgents.map(a => [a.name, 100 - Math.abs(a.maxDrawdown) * 10]))
                      }
                    ]}>
                      <PolarGrid stroke="#CCC1B7" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#66605C' }} />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fontSize: 9, fill: '#66605C' }}
                        tickFormatter={(value) => Number(value || 0).toFixed(0)}
                      />
                      {sortedAgents.map((agent, index) => (
                        <Radar
                          key={agent.id}
                          name={agent.name}
                          dataKey={agent.name}
                          stroke={agent.color}
                          strokeWidth={selectedAgentId === agent.id ? 3 : 1}
                          fill={agent.color}
                          fillOpacity={selectedAgentId && selectedAgentId !== agent.id ? 0.1 : selectedAgentId === agent.id ? 0.4 : 0.2}
                        />
                      ))}
                      <Legend wrapperStyle={{ fontSize: '9px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Sharpe Ratio Rankings */}
                <div style={{
                  backgroundColor: '#F8EBD8',
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid #CCC1B7'
                }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: '#262A33' }}>
                    Risk-Adjusted Performance (Sharpe)
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={[...sortedAgents].sort((a, b) => (b.sharpeRatio || 0) - (a.sharpeRatio || 0))}
                      layout="vertical"
                      margin={{ top: 5, right: 20, bottom: 5, left: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#CCC1B7" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: '#66605C' }}
                        stroke="#66605C"
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10, fill: '#66605C' }}
                        stroke="#66605C"
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFF1E5', border: '1px solid #CCC1B7', borderRadius: '8px', fontSize: '11px' }}
                        formatter={(value: any) => [`${Number(value || 0).toFixed(3)}`]}
                      />
                      <Bar dataKey="sharpeRatio" radius={[0, 8, 8, 0]}>
                        {sortedAgents.map((agent, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={agent.color}
                            fillOpacity={selectedAgentId && selectedAgentId !== agent.id ? 0.3 : 1}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Performance vs Market Benchmark */}
              <div style={{
                padding: '20px',
                borderBottom: '2px solid #990F3D'
              }}>
                <div style={{
                  backgroundColor: '#F8EBD8',
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid #CCC1B7'
                }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: '#262A33' }}>
                    AI Performance vs S&P 500 Benchmark
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart
                      data={performanceData.length > 0 ? performanceData : []}
                      margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#CCC1B7" />
                      <XAxis
                        dataKey="timestamp"
                        tick={{ fontSize: 10, fill: '#66605C' }}
                        stroke="#66605C"
                        label={{ value: 'Time', position: 'bottom', style: { fontSize: 10, fill: '#66605C' } }}
                        tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#66605C' }}
                        stroke="#66605C"
                        label={{ value: 'Account Value ($)', angle: -90, position: 'left', style: { fontSize: 10, fill: '#66605C' } }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFF1E5', border: '1px solid #CCC1B7', borderRadius: '8px', fontSize: '11px' }}
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value: any) => [`$${Number(value || 0).toFixed(2)}`, ""]}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />

                      {/* AI Agent Lines */}
                      {sortedAgents.map((agent) => (
                        <Line
                          key={agent.id}
                          type="monotone"
                          dataKey={agent.id}
                          name={agent.name}
                          stroke={agent.color}
                          strokeWidth={selectedAgentId === agent.id ? 4 : 2}
                          strokeOpacity={selectedAgentId && selectedAgentId !== agent.id ? 0.3 : 1}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{
                    marginTop: '12px',
                    padding: '10px',
                    backgroundColor: '#EBE0D0',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#66605C'
                  }}>
                    <strong style={{ color: '#262A33' }}>Analysis:</strong> {
                      sortedAgents.length > 0 && sortedAgents[0] && sortedAgents[0].roi > 0
                        ? `Top performer ${sortedAgents[0].name} is leading with ${(sortedAgents[0].roi || 0).toFixed(2)}% ROI. `
                        : sortedAgents.length > 0 ? `All agents currently underperforming. ` : ``
                    }
                    AI agents are actively trading stocks based on market conditions and technical analysis.
                  </div>
                </div>
              </div>

              {/* Table Section */}
              <div style={{ flex: 1, overflow: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '12px',
                fontFamily: 'system-ui, sans-serif',
                tableLayout: 'fixed'
              }}>
                <thead style={{
                  position: 'sticky',
                  top: 0,
                  background: 'linear-gradient(to bottom, #E0D4C3 0%, #E9DECF 100%)',
                  borderBottom: '2px solid #990F3D',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                }}>
                  <tr>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '700', width: '60px' }}>Rank</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '700', width: '180px' }}>Model</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', width: '110px' }}>Account Value</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', width: '105px' }}>Avg Trade Size</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', width: '120px' }}>Median Trade Size</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', width: '100px' }}>Avg Hold Time</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', width: '120px' }}>Median Hold Time</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', width: '70px' }}>% Long</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', width: '100px' }}>Expectancy</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', width: '100px' }}>Avg Leverage</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', width: '120px' }}>Avg Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAgents.map((agent, index) => (
                    <tr
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id === selectedAgentId ? null : agent.id)}
                      style={{
                        borderBottom: '1px solid #E9DECF',
                        cursor: 'pointer',
                        backgroundColor: selectedAgentId === agent.id ? '#E9DECF' : '#F5E6D3'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedAgentId !== agent.id) {
                          e.currentTarget.style.backgroundColor = '#EBE0D0';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedAgentId !== agent.id) {
                          e.currentTarget.style.backgroundColor = '#F5E6D3';
                        }
                      }}
                    >
                      <td style={{ padding: '8px 8px' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          backgroundColor: selectedAgentId === agent.id ? '#F8EBD8' : '#E9DECF',
                          borderRadius: '14px',
                          fontWeight: '700',
                          border: selectedAgentId === agent.id ? '1px solid #CCC1B7' : 'none',
                          fontSize: '11px'
                        }}>
                          {index + 1}
                        </div>
                      </td>
                      <td style={{ padding: '8px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: agent.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <ModelIcon model={agent.model} size={10} />
                          </div>
                          <div style={{
                            padding: '4px 10px',
                            backgroundColor: selectedAgentId === agent.id ? '#F8EBD8' : '#E9DECF',
                            borderRadius: '14px',
                            fontWeight: '600',
                            border: selectedAgentId === agent.id ? '1px solid #CCC1B7' : 'none',
                            fontSize: '11px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {agent.name}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          backgroundColor: selectedAgentId === agent.id ? '#F8EBD8' : '#E9DECF',
                          borderRadius: '14px',
                          fontWeight: '700',
                          border: selectedAgentId === agent.id ? '1px solid #CCC1B7' : 'none',
                          fontSize: '11px'
                        }}>
                          ${agent.accountValue.toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          backgroundColor: selectedAgentId === agent.id ? '#F8EBD8' : '#E9DECF',
                          borderRadius: '14px',
                          fontWeight: '600',
                          border: selectedAgentId === agent.id ? '1px solid #CCC1B7' : 'none',
                          fontSize: '11px'
                        }}>
                          ${(agent as any).avgTradeSize?.toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          backgroundColor: selectedAgentId === agent.id ? '#F8EBD8' : '#E9DECF',
                          borderRadius: '14px',
                          fontWeight: '600',
                          border: selectedAgentId === agent.id ? '1px solid #CCC1B7' : 'none',
                          fontSize: '11px'
                        }}>
                          ${(agent as any).medianTradeSize?.toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          backgroundColor: selectedAgentId === agent.id ? '#F8EBD8' : '#E9DECF',
                          borderRadius: '14px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          border: selectedAgentId === agent.id ? '1px solid #CCC1B7' : 'none',
                          fontSize: '11px'
                        }}>
                          {(agent as any).avgHoldTime}
                        </div>
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          backgroundColor: selectedAgentId === agent.id ? '#F8EBD8' : '#E9DECF',
                          borderRadius: '14px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          border: selectedAgentId === agent.id ? '1px solid #CCC1B7' : 'none',
                          fontSize: '11px'
                        }}>
                          {(agent as any).medianHoldTime}
                        </div>
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          backgroundColor: selectedAgentId === agent.id ? '#F8EBD8' : '#E9DECF',
                          borderRadius: '14px',
                          fontWeight: '600',
                          border: selectedAgentId === agent.id ? '1px solid #CCC1B7' : 'none',
                          fontSize: '11px'
                        }}>
                          {(agent as any).percentLong}%
                        </div>
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          backgroundColor: ((agent as any).expectancy || 0) >= 0 ? 'rgba(15, 123, 58, 0.1)' : 'rgba(204, 0, 0, 0.1)',
                          color: ((agent as any).expectancy || 0) >= 0 ? '#0F7B3A' : '#CC0000',
                          borderRadius: '14px',
                          fontWeight: '700',
                          fontSize: '11px'
                        }}>
                          ${((agent as any).expectancy || 0).toFixed(2)}
                        </div>
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          backgroundColor: selectedAgentId === agent.id ? '#F8EBD8' : '#E9DECF',
                          borderRadius: '14px',
                          fontWeight: '600',
                          border: selectedAgentId === agent.id ? '1px solid #CCC1B7' : 'none',
                          fontSize: '11px'
                        }}>
                          {((agent as any).avgLeverage || 1).toFixed(1)}x
                        </div>
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          backgroundColor: selectedAgentId === agent.id ? '#F8EBD8' : '#E9DECF',
                          borderRadius: '14px',
                          fontWeight: '600',
                          border: selectedAgentId === agent.id ? '1px solid #CCC1B7' : 'none',
                          fontSize: '11px'
                        }}>
                          {((agent as any).avgConfidence || 0).toFixed(1)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Sleek Activity Feed */}
        <div style={{
          width: '380px',
          background: 'linear-gradient(to bottom, #F5E6D3 0%, #F8EBD8 100%)',
          borderLeft: '2px solid #CCC1B7',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.05)'
        }}>
          {/* Pill-Shaped Tabs */}
          <div style={{
            display: 'flex',
            gap: '6px',
            padding: '12px 12px 8px',
            flexShrink: 0,
            background: 'linear-gradient(to bottom, #E0D4C3 0%, #E9DECF 100%)'
          }}>
            {[
              { id: 'trades' as const, label: 'Trades' },
              { id: 'chat' as const, label: 'Reasoning' },
              { id: 'positions' as const, label: 'Positions' },
              { id: 'analysis' as const, label: 'Analysis' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDetailTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  fontSize: '10px',
                  fontWeight: '700',
                  fontFamily: 'system-ui, sans-serif',
                  backgroundColor: detailTab === tab.id ? '#990F3D' : 'rgba(255, 255, 255, 0.6)',
                  color: detailTab === tab.id ? '#FFF1E5' : '#66605C',
                  border: '1px solid #CCC1B7',
                  borderRadius: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: detailTab === tab.id ? '0 4px 12px rgba(153, 15, 61, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.08)',
                  transform: detailTab === tab.id ? 'translateY(-1px)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (detailTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(153, 15, 61, 0.1)';
                    e.currentTarget.style.color = '#990F3D';
                    e.currentTarget.style.boxShadow = '0 3px 8px rgba(0, 0, 0, 0.12)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (detailTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
                    e.currentTarget.style.color = '#66605C';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.transform = 'none';
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflow: 'auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>

            {/* TRADES TAB */}
            {detailTab === 'trades' && (
              <div>
                <div style={{
                  marginBottom: '16px',
                  padding: '14px',
                  backgroundColor: '#E9DECF',
                  border: '1px solid #CCC1B7',
                  borderRadius: '20px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
                }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', display: 'block', marginBottom: '8px', color: '#66605C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Filter by Model
                  </label>
                  <select
                    value={tradeFilter}
                    onChange={(e) => setTradeFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '12px',
                      border: '1px solid #CCC1B7',
                      backgroundColor: '#F5E6D3',
                      fontFamily: 'system-ui, sans-serif',
                      borderRadius: '20px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Models</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ fontSize: '11px', color: '#66605C', marginBottom: '16px' }}>
                  Showing {filteredTrades.length} recent trades
                </div>
                {filteredTrades.map((trade) => (
                  <div
                    key={trade.id}
                    style={{
                      padding: '16px',
                      marginBottom: '12px',
                      backgroundColor: '#EBE0D0',
                      border: '1px solid #CCC1B7',
                      borderRadius: '20px',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '10px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#262A33'
                        }}>
                          {trade.agentName}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          padding: '4px 10px',
                          backgroundColor: trade.side === 'BUY' ? '#E8F5E9' : '#FFEBEE',
                          color: trade.side === 'BUY' ? '#0F7B3A' : '#CC0000',
                          fontWeight: '700',
                          borderRadius: '12px'
                        }}>
                          {trade.side === 'BUY' ? 'LONG' : 'SHORT'}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: '700' }}>
                          {trade.symbol}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#66605C' }}>
                        {new Date(trade.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#66605C', marginBottom: '4px' }}>
                      Entry: ${(trade.entryPrice || trade.price || 0).toFixed(2)} → Exit: ${(trade.exitPrice || trade.price || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#66605C', marginBottom: '4px' }}>
                      Quantity: {trade.quantity} shares
                    </div>
                    <div style={{ fontSize: '11px', color: '#66605C', marginBottom: '10px' }}>
                      Hold time: {trade.holdTime}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: (trade.pnl || 0) >= 0 ? '#0F7B3A' : '#CC0000'
                    }}>
                      P&L: {(trade.pnl || 0) >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)} ({(trade.pnl || 0) >= 0 ? '+' : ''}{(trade.pnlPercent || 0).toFixed(2)}%)
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CHAT TAB */}
            {detailTab === 'chat' && (
              <div>
                {!selectedAgent ? (
                  <div>
                    <h4 style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      marginBottom: '16px',
                      color: '#262A33'
                    }}>
                      All Models — Full Reasoning History
                    </h4>
                    {(() => {
                      // Flatten all decisions from all agents and sort by timestamp
                      const allDecisions: any[] = [];
                      agents.forEach(agent => {
                        const agentDecisions = decisions[agent.id] || [];
                        agentDecisions.forEach(decision => {
                          allDecisions.push({
                            ...decision,
                            agent,
                          });
                        });
                      });
                      // Sort by timestamp, newest first
                      allDecisions.sort((a, b) => {
                        const timeA = new Date(a.createdAt || a.timestamp).getTime();
                        const timeB = new Date(b.createdAt || b.timestamp).getTime();
                        return timeB - timeA;
                      });

                      return allDecisions.map((decision, idx) => (
                        <div
                          key={`${decision.agent.id}-${idx}`}
                          style={{
                            marginBottom: '16px',
                            padding: '16px',
                            backgroundColor: '#EBE0D0',
                            border: `2px solid ${decision.agent.color}`,
                            borderRadius: '20px',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '10px',
                            alignItems: 'center'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: decision.agent.color
                              }} />
                              <span style={{
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#262A33'
                              }}>
                                {decision.agent.name}
                              </span>
                            </div>
                            <span style={{ fontSize: '10px', color: '#66605C' }}>
                              {new Date(decision.createdAt || decision.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#33302E', marginBottom: '8px' }}>
                            <strong>Action:</strong> {decision.action} {decision.symbol}
                            {decision.quantity && ` (${decision.quantity} shares)`}
                          </div>
                          {decision.reasoning && (
                            <div style={{ fontSize: '11px', lineHeight: '1.5', color: '#66605C' }}>
                              {decision.reasoning}
                            </div>
                          )}
                          {(decision.targetPrice || decision.stopLoss || decision.invalidationCondition) && (
                            <div style={{
                              marginTop: '10px',
                              padding: '10px',
                              backgroundColor: '#F5E6D3',
                              borderRadius: '12px',
                              fontSize: '10px'
                            }}>
                              <div style={{ fontWeight: '700', marginBottom: '6px', color: '#990F3D' }}>EXIT PLAN</div>
                              {decision.targetPrice && (
                                <div style={{ marginBottom: '4px', color: '#33302E' }}>
                                  <strong>Target:</strong> ${(decision.targetPrice || 0).toFixed(2)}
                                </div>
                              )}
                              {decision.stopLoss && (
                                <div style={{ marginBottom: '4px', color: '#33302E' }}>
                                  <strong>Stop Loss:</strong> ${(decision.stopLoss || 0).toFixed(2)}
                                </div>
                              )}
                              {decision.invalidationCondition && (
                                <div style={{ color: '#66605C' }}>
                                  <strong>Invalidation:</strong> {decision.invalidationCondition}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <div>
                    <h4 style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      marginBottom: '16px',
                      color: '#262A33'
                    }}>
                      {selectedAgent.name} — AI Reasoning
                    </h4>
                    {decisions[selectedAgent.id]?.map((entry, idx) => (
                      <div
                        key={idx}
                        style={{
                          marginBottom: '14px',
                          padding: '16px',
                          backgroundColor: '#EBE0D0',
                          border: '1px solid #CCC1B7',
                          borderRadius: '20px',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '8px'
                        }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            color: '#990F3D',
                            textTransform: 'uppercase'
                          }}>
                            Decision
                          </span>
                          <span style={{ fontSize: '10px', color: '#66605C' }}>
                            {new Date(entry.createdAt || entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#33302E', marginBottom: '8px' }}>
                          <strong>Action:</strong> {entry.action} {entry.symbol}
                          {entry.quantity && ` (${entry.quantity} shares)`}
                        </div>
                        {entry.reasoning && (
                          <div style={{ fontSize: '11px', lineHeight: '1.5', color: '#66605C', marginBottom: '8px' }}>
                            {entry.reasoning}
                          </div>
                        )}
                        {(entry.targetPrice || entry.stopLoss || entry.invalidationCondition) && (
                          <div style={{
                            marginTop: '10px',
                            padding: '10px',
                            backgroundColor: '#F5E6D3',
                            borderRadius: '12px',
                            fontSize: '10px'
                          }}>
                            <div style={{ fontWeight: '700', marginBottom: '6px', color: '#990F3D' }}>EXIT PLAN</div>
                            {entry.targetPrice && (
                              <div style={{ marginBottom: '4px', color: '#33302E' }}>
                                <strong>Target:</strong> ${(entry.targetPrice || 0).toFixed(2)}
                              </div>
                            )}
                            {entry.stopLoss && (
                              <div style={{ marginBottom: '4px', color: '#33302E' }}>
                                <strong>Stop Loss:</strong> ${(entry.stopLoss || 0).toFixed(2)}
                              </div>
                            )}
                            {entry.invalidationCondition && (
                              <div style={{ color: '#66605C' }}>
                                <strong>Invalidation:</strong> {entry.invalidationCondition}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* POSITIONS TAB */}
            {detailTab === 'positions' && (
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: '#262A33' }}>
                  Active Positions {selectedAgentId && selectedAgent ? `— ${selectedAgent.name}` : '— All Models'}
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                {positions
                  .filter(position => !selectedAgentId || position.agentId === selectedAgentId)
                  .map((position, idx) => {
                  const agent = agents.find(a => a.id === position.agentId);
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '14px 16px',
                        backgroundColor: '#EBE0D0',
                        border: '1px solid #CCC1B7',
                        borderRadius: '24px',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px'
                      }}>
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center'
                        }}>
                          {/* Stock symbol in pill */}
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            backgroundColor: '#990F3D',
                            color: '#FFF1E5',
                            borderRadius: '16px',
                            fontSize: '13px',
                            fontWeight: '700',
                            height: '28px',
                            letterSpacing: '0.5px'
                          }}>
                            {position.symbol}
                          </div>
                          {/* Model icon and name in same pill */}
                          {agent && (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              backgroundColor: agent.color,
                              color: '#FFF',
                              borderRadius: '16px',
                              fontSize: '11px',
                              fontWeight: '600',
                              height: '28px'
                            }}>
                              <ModelIcon model={agent.model} size={11} />
                              <span>{position.agentName}</span>
                            </div>
                          )}
                        </div>
                        <div style={{
                          textAlign: 'right'
                        }}>
                          <div style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: (position.pnl || 0) >= 0 ? '#0F7B3A' : '#CC0000'
                          }}>
                            {(position.pnl || 0) >= 0 ? '+' : ''}${(position.pnl || 0).toFixed(2)}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: (position.pnl || 0) >= 0 ? '#0F7B3A' : '#CC0000'
                          }}>
                            ({(position.pnlPercent || 0) >= 0 ? '+' : ''}{(position.pnlPercent || 0).toFixed(2)}%)
                          </div>
                        </div>
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '12px',
                        fontSize: '11px',
                        paddingTop: '10px',
                        borderTop: '1px solid #CCC1B7',
                        marginBottom: '12px'
                      }}>
                        <div>
                          <div style={{ color: '#66605C', marginBottom: '4px', fontSize: '10px' }}>Quantity</div>
                          <div style={{ fontWeight: '700', fontSize: '12px' }}>{position.quantity}</div>
                        </div>
                        <div>
                          <div style={{ color: '#66605C', marginBottom: '4px', fontSize: '10px' }}>Entry</div>
                          <div style={{ fontWeight: '700', fontSize: '12px' }}>${(position.entryPrice || 0).toFixed(2)}</div>
                        </div>
                        <div>
                          <div style={{ color: '#66605C', marginBottom: '4px', fontSize: '10px' }}>Current</div>
                          <div style={{ fontWeight: '700', fontSize: '12px' }}>${(position.currentPrice || 0).toFixed(2)}</div>
                        </div>
                        <div>
                          <div style={{ color: '#66605C', marginBottom: '4px', fontSize: '10px' }}>Value</div>
                          <div style={{ fontWeight: '700', fontSize: '12px' }}>
                            ${(position.quantity * position.currentPrice).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Find the decision that opened this position */}
                      {(() => {
                        // Find the BUY decision with the closest timestamp to position.openedAt
                        const buyDecisions = decisions[position.agentId]?.filter(
                          (d: any) => d.symbol === position.symbol && d.action === 'BUY'
                        ) || [];

                        const positionDecision = buyDecisions.length > 0
                          ? buyDecisions.reduce((closest: any, current: any) => {
                              const positionTime = new Date(position.openedAt).getTime();
                              const currentDiff = Math.abs(new Date(current.timestamp).getTime() - positionTime);
                              const closestDiff = Math.abs(new Date(closest.timestamp).getTime() - positionTime);
                              return currentDiff < closestDiff ? current : closest;
                            })
                          : null;

                        const hasExitPlan = positionDecision && (positionDecision.targetPrice || positionDecision.stopLoss || positionDecision.invalidationCondition);
                        const hasReasoning = positionDecision && positionDecision.reasoning;

                        return (
                          <>
                            {/* Exit Plan */}
                            {hasExitPlan && (
                              <div style={{
                                backgroundColor: '#E0D4C3',
                                padding: '10px 12px',
                                borderRadius: '16px',
                                marginBottom: '8px'
                              }}>
                                <div style={{
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  color: '#990F3D',
                                  marginBottom: '6px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}>
                                  Exit Plan
                                </div>
                                <div style={{
                                  fontSize: '11px',
                                  color: '#262A33',
                                  lineHeight: '1.5'
                                }}>
                                  {positionDecision.targetPrice && (
                                    <div style={{ marginBottom: '4px' }}>
                                      <strong>Target:</strong> ${positionDecision.targetPrice.toFixed(2)}
                                    </div>
                                  )}
                                  {positionDecision.stopLoss && (
                                    <div style={{ marginBottom: '4px' }}>
                                      <strong>Stop Loss:</strong> ${positionDecision.stopLoss.toFixed(2)}
                                    </div>
                                  )}
                                  {positionDecision.invalidationCondition && (
                                    <div style={{ color: '#66605C', fontSize: '10px', marginTop: '4px' }}>
                                      <strong>Invalidation:</strong> {positionDecision.invalidationCondition}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Reasoning */}
                            {hasReasoning && (
                              <div style={{
                                backgroundColor: '#E0D4C3',
                                padding: '10px 12px',
                                borderRadius: '16px'
                              }}>
                                <div style={{
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  color: '#990F3D',
                                  marginBottom: '6px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}>
                                  Trade Reasoning
                                </div>
                                <div style={{
                                  fontSize: '11px',
                                  color: '#262A33',
                                  lineHeight: '1.5'
                                }}>
                                  {positionDecision.reasoning}
                                </div>
                              </div>
                            )}

                            {/* Show message if no data available */}
                            {!hasExitPlan && !hasReasoning && (
                              <div style={{
                                backgroundColor: '#E0D4C3',
                                padding: '10px 12px',
                                borderRadius: '16px',
                                fontSize: '10px',
                                color: '#66605C',
                                fontStyle: 'italic',
                                textAlign: 'center'
                              }}>
                                Position opened before decision tracking was implemented
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  );
                })}
                </div>
              </div>
            )}

            {/* ANALYSIS TAB */}
            {detailTab === 'analysis' && (
              <div>
                {!selectedAgent ? (
                  <div>
                    <h4 style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      marginBottom: '16px',
                      color: '#262A33'
                    }}>
                      All Models — Performance Analysis
                    </h4>
                    {agents.map(agent => {
                      return (
                        <div
                          key={agent.id}
                          style={{
                            marginBottom: '16px',
                            padding: '16px',
                            backgroundColor: '#EBE0D0',
                            border: `2px solid ${agent.color}`,
                            borderRadius: '20px',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '12px',
                            alignItems: 'center'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: agent.color
                              }} />
                              <span style={{
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#262A33'
                              }}>
                                {agent.name}
                              </span>
                            </div>
                          </div>

                          {/* Performance Metrics */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '8px',
                            fontSize: '11px',
                            marginBottom: '12px'
                          }}>
                            <div style={{
                              padding: '10px',
                              backgroundColor: '#F5E6D3',
                              borderRadius: '12px'
                            }}>
                              <div style={{ color: '#66605C', marginBottom: '4px' }}>Account Value</div>
                              <div style={{ fontWeight: '700', color: '#262A33' }}>
                                ${agent.accountValue.toLocaleString()}
                              </div>
                            </div>
                            <div style={{
                              padding: '10px',
                              backgroundColor: '#F5E6D3',
                              borderRadius: '12px'
                            }}>
                              <div style={{ color: '#66605C', marginBottom: '4px' }}>Return</div>
                              <div style={{
                                fontWeight: '700',
                                color: agent.roi >= 0 ? '#0F7B3A' : '#CC0000'
                              }}>
                                {agent.roi >= 0 ? '+' : ''}{(agent.roi || 0).toFixed(2)}%
                              </div>
                            </div>
                            <div style={{
                              padding: '10px',
                              backgroundColor: '#F5E6D3',
                              borderRadius: '12px'
                            }}>
                              <div style={{ color: '#66605C', marginBottom: '4px' }}>Total P&L</div>
                              <div style={{
                                fontWeight: '700',
                                color: (agent.totalPnL || 0) >= 0 ? '#0F7B3A' : '#CC0000'
                              }}>
                                ${agent.totalPnL?.toLocaleString()}
                              </div>
                            </div>
                            <div style={{
                              padding: '10px',
                              backgroundColor: '#F5E6D3',
                              borderRadius: '12px'
                            }}>
                              <div style={{ color: '#66605C', marginBottom: '4px' }}>Win Rate</div>
                              <div style={{ fontWeight: '700', color: '#262A33' }}>
                                {(agent.winRate || 0).toFixed(1)}%
                              </div>
                            </div>
                          </div>

                          {/* Mini Performance Chart */}
                          <div style={{
                            height: '100px',
                            backgroundColor: '#F5E6D3',
                            borderRadius: '12px',
                            padding: '8px'
                          }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={(() => {
                                  // Use real performance data if available
                                  if (performanceData.length > 0) {
                                    return performanceData.map(point => ({
                                      time: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                      value: point[agent.id] || agent.accountValue
                                    }));
                                  }
                                  // Fallback: show single point
                                  return [{
                                    time: 'Now',
                                    value: agent.accountValue
                                  }];
                                })()}
                                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                              >
                                <defs>
                                  <linearGradient id={`colorPnL-mini-${agent.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={agent.color} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={agent.color} stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <Area
                                  type="monotone"
                                  dataKey="value"
                                  stroke={agent.color}
                                  strokeWidth={1.5}
                                  fill={`url(#colorPnL-mini-${agent.id})`}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Additional Stats Row */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '8px',
                            marginTop: '12px',
                            fontSize: '10px'
                          }}>
                            <div style={{
                              padding: '8px',
                              backgroundColor: '#F5E6D3',
                              borderRadius: '10px',
                              textAlign: 'center'
                            }}>
                              <div style={{ color: '#66605C', marginBottom: '2px' }}>Trades</div>
                              <div style={{ fontWeight: '700', color: '#262A33' }}>
                                {agent.tradeCount}
                              </div>
                            </div>
                            <div style={{
                              padding: '8px',
                              backgroundColor: '#F5E6D3',
                              borderRadius: '10px',
                              textAlign: 'center'
                            }}>
                              <div style={{ color: '#66605C', marginBottom: '2px' }}>Sharpe</div>
                              <div style={{ fontWeight: '700', color: '#262A33' }}>
                                {(agent.sharpeRatio || 0).toFixed(2)}
                              </div>
                            </div>
                            <div style={{
                              padding: '8px',
                              backgroundColor: '#F5E6D3',
                              borderRadius: '10px',
                              textAlign: 'center'
                            }}>
                              <div style={{ color: '#66605C', marginBottom: '2px' }}>Drawdown</div>
                              <div style={{ fontWeight: '700', color: '#CC0000' }}>
                                {(agent.maxDrawdown || 0).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    <div style={{
                      padding: '18px',
                      backgroundColor: '#E9DECF',
                      border: '1px solid #CCC1B7',
                      borderRadius: '20px',
                      marginBottom: '16px',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
                    }}>
                      <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: '#262A33' }}>
                        Performance Summary — {selectedAgent.name}
                      </h4>
                      <div style={{ fontSize: '12px', lineHeight: '2' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#66605C' }}>Account Value:</span>
                          <span style={{ fontWeight: '700' }}>${selectedAgent.accountValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#66605C' }}>Total P&L:</span>
                          <span style={{ fontWeight: '700', color: (selectedAgent.totalPnL || 0) >= 0 ? '#0F7B3A' : '#CC0000' }}>
                            ${(selectedAgent.totalPnL || 0) >= 0 ? '+' : ''}{(selectedAgent.totalPnL || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#66605C' }}>Return:</span>
                          <span style={{ fontWeight: '700', color: selectedAgent.roi >= 0 ? '#0F7B3A' : '#CC0000' }}>
                            {selectedAgent.roi >= 0 ? '+' : ''}{(selectedAgent.roi || 0).toFixed(2)}%
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#66605C' }}>Trades:</span>
                          <span style={{ fontWeight: '700' }}>{selectedAgent.tradeCount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#66605C' }}>Win Rate:</span>
                          <span style={{ fontWeight: '700' }}>{(selectedAgent.winRate || 0).toFixed(1)}%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#66605C' }}>Sharpe Ratio:</span>
                          <span style={{ fontWeight: '700' }}>{(selectedAgent.sharpeRatio || 0).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#66605C' }}>Max Drawdown:</span>
                          <span style={{ fontWeight: '700', color: '#CC0000' }}>{(selectedAgent.maxDrawdown || 0).toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Cumulative P&L Chart */}
                    <div style={{
                      padding: '18px',
                      backgroundColor: '#E9DECF',
                      border: '1px solid #CCC1B7',
                      borderRadius: '20px',
                      marginBottom: '16px',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
                    }}>
                      <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: '#262A33' }}>
                        Cumulative P&L
                      </h4>
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart
                          data={(() => {
                            // Use real performance data if available, otherwise show current values
                            if (performanceData.length > 0) {
                              return performanceData.map(point => ({
                                time: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                value: point[selectedAgent.id] || selectedAgent.accountValue,
                                pnl: (point[selectedAgent.id] || selectedAgent.accountValue) - 10000
                              }));
                            }

                            // Fallback: show single point with current value
                            return [{
                              time: 'Now',
                              value: selectedAgent.accountValue,
                              pnl: selectedAgent.accountValue - 10000
                            }];
                          })()}
                          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                        >
                          <defs>
                            <linearGradient id={`colorPnL-${selectedAgent.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={selectedAgent.color} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={selectedAgent.color} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#CCC1B7" />
                          <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10, fill: '#66605C' }}
                            stroke="#66605C"
                            label={{ value: 'Time', position: 'bottom', style: { fontSize: 10, fill: '#66605C' } }}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: '#66605C' }}
                            stroke="#66605C"
                            domain={['dataMin - 1000', 'dataMax + 1000']}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                            tickCount={5}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#FFF1E5', border: '1px solid #CCC1B7', borderRadius: '8px', fontSize: '11px' }}
                            formatter={(value: any, name: string) => {
                              if (name === 'value') return [`$${Number(value).toLocaleString()}`, 'Account Value'];
                              return [value, name];
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke={selectedAgent.color}
                            strokeWidth={2}
                            fill={`url(#colorPnL-${selectedAgent.id})`}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Portfolio Holdings Chart */}
                    <div style={{
                      padding: '18px',
                      backgroundColor: '#E9DECF',
                      border: '1px solid #CCC1B7',
                      borderRadius: '20px',
                      marginBottom: '16px',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
                    }}>
                      <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: '#262A33' }}>
                        Portfolio Holdings
                      </h4>
                      {(() => {
                        const agentPositions = positions.filter(p => p.agentId === selectedAgent.id);

                        if (agentPositions.length === 0) {
                          return (
                            <div>
                              <div style={{
                                textAlign: 'center',
                                color: '#66605C',
                                fontSize: '11px',
                                marginBottom: '12px'
                              }}>
                                No active positions. All cash currently.
                              </div>
                              <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                  <Pie
                                    data={[{
                                      name: 'Cash',
                                      value: 100,
                                      color: '#4CAF50'
                                    }]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45}
                                    outerRadius={70}
                                    paddingAngle={0}
                                    dataKey="value"
                                  >
                                    <Cell fill="#4CAF50" />
                                  </Pie>
                                  <text
                                    x="50%"
                                    y="50%"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    style={{ fontSize: '24px', fontWeight: '700', fill: '#0F7B3A' }}
                                  >
                                    100%
                                  </text>
                                  <text
                                    x="50%"
                                    y="58%"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    style={{ fontSize: '12px', fill: '#66605C' }}
                                  >
                                    Cash
                                  </text>
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          );
                        }

                        const holdingsData = agentPositions.map(position => ({
                          ticker: position.symbol,
                          shares: position.quantity,
                          amount: position.quantity * position.currentPrice,
                          currentPrice: position.currentPrice
                        }));

                        return (
                          <>
                            {/* Bar Chart */}
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={holdingsData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#CCC1B7" />
                                <XAxis
                                  dataKey="ticker"
                                  tick={{ fontSize: 10, fill: '#66605C' }}
                                  stroke="#66605C"
                                  angle={-45}
                                  textAnchor="end"
                                  height={60}
                                />
                                <YAxis
                                  tick={{ fontSize: 10, fill: '#66605C' }}
                                  stroke="#66605C"
                                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#FFF1E5', border: '1px solid #CCC1B7', borderRadius: '8px', fontSize: '11px' }}
                                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Value']}
                                />
                                <Bar dataKey="amount" fill={selectedAgent.color} radius={[8, 8, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>

                            {/* Detailed Holdings Table */}
                            <div style={{
                              marginTop: '16px',
                              backgroundColor: '#F5E6D3',
                              borderRadius: '12px',
                              padding: '12px',
                              maxHeight: '300px',
                              overflowY: 'auto'
                            }}>
                              <h5 style={{ fontSize: '11px', fontWeight: '700', marginBottom: '10px', color: '#262A33' }}>
                                Detailed Holdings
                              </h5>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 2fr 2fr',
                                gap: '8px',
                                fontSize: '10px'
                              }}>
                                {/* Header */}
                                <div style={{ fontWeight: '700', color: '#66605C', paddingBottom: '6px', borderBottom: '1px solid #CCC1B7' }}>Ticker</div>
                                <div style={{ fontWeight: '700', color: '#66605C', textAlign: 'right', paddingBottom: '6px', borderBottom: '1px solid #CCC1B7' }}>Shares</div>
                                <div style={{ fontWeight: '700', color: '#66605C', textAlign: 'right', paddingBottom: '6px', borderBottom: '1px solid #CCC1B7' }}>Amount (USD)</div>

                                {/* Data Rows */}
                                {holdingsData
                                  .sort((a, b) => b.amount - a.amount)
                                  .map((holding, idx) => (
                                  <>
                                    <div key={`ticker-${idx}`} style={{ padding: '6px 0', fontWeight: '600', color: '#262A33' }}>
                                      {holding.ticker}
                                    </div>
                                    <div key={`shares-${idx}`} style={{ padding: '6px 0', textAlign: 'right', color: '#262A33' }}>
                                      {holding.shares.toFixed(4)}
                                    </div>
                                    <div key={`amount-${idx}`} style={{ padding: '6px 0', textAlign: 'right', fontWeight: '600', color: '#262A33' }}>
                                      ${holding.amount.toLocaleString()}
                                    </div>
                                  </>
                                ))}

                                {/* Total Row */}
                                <div style={{ paddingTop: '8px', borderTop: '2px solid #990F3D', fontWeight: '700', color: '#262A33' }}>
                                  TOTAL
                                </div>
                                <div style={{ paddingTop: '8px', borderTop: '2px solid #990F3D', textAlign: 'right', fontWeight: '700', color: '#262A33' }}>
                                  {holdingsData.reduce((sum, h) => sum + h.shares, 0).toFixed(2)} shares
                                </div>
                                <div style={{ paddingTop: '8px', borderTop: '2px solid #990F3D', textAlign: 'right', fontWeight: '700', color: '#990F3D' }}>
                                  ${holdingsData.reduce((sum, h) => sum + h.amount, 0).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Trade Outcome Donut Chart */}
                    <div style={{
                      padding: '18px',
                      backgroundColor: '#E9DECF',
                      border: '1px solid #CCC1B7',
                      borderRadius: '20px',
                      marginBottom: '16px',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
                    }}>
                      <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: '#262A33' }}>
                        Trade Distribution
                      </h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: 'Wins',
                                value: Math.round(selectedAgent.tradeCount * (selectedAgent.winRate || 0) / 100),
                                color: '#0F7B3A'
                              },
                              {
                                name: 'Losses',
                                value: Math.round(selectedAgent.tradeCount * (1 - (selectedAgent.winRate || 0) / 100)),
                                color: '#CC0000'
                              }
                            ]}
                            cx="50%"
                            cy="45%"
                            innerRadius={40}
                            outerRadius={65}
                            paddingAngle={2}
                            dataKey="value"
                            label={(entry: any) =>
                              entry.value > 0 ? `${entry.name}: ${entry.value}` : null
                            }
                            labelLine={{ stroke: '#66605C', strokeWidth: 1 }}
                            style={{ fontSize: '11px' }}
                          >
                            {[
                              { name: 'Wins', value: Math.round(selectedAgent.tradeCount * (selectedAgent.winRate || 0) / 100), color: '#0F7B3A' },
                              { name: 'Losses', value: Math.round(selectedAgent.tradeCount * (1 - (selectedAgent.winRate || 0) / 100)), color: '#CC0000' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#FFF1E5', border: '1px solid #CCC1B7', borderRadius: '8px', fontSize: '11px' }}
                            formatter={(value: any, name: string) => [`${value} trades`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
