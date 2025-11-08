'use client';

import { useEffect, useState } from 'react';
import type { AIAgent } from '@/types';

interface HeatmapData {
  agentId: string;
  name: string;
  model: string;
  color: string;
  dailyPerformance: Record<string, {
    gains: number;
    losses: number;
    total: number;
    percentChange: number;
    startValue: number;
    endValue: number;
  }>;
  hourlyActivity: Record<number, number>;
  dayOfWeekActivity: Record<number, number>;
  tradesByHour: Record<number, { count: number; wins: number; losses: number }>;
  tradesByDayOfWeek: Record<number, { count: number; wins: number; losses: number }>;
  streaks: Array<{ type: 'win' | 'loss'; length: number; startDate: Date }>;
  maxWinStreak: number;
  maxLossStreak: number;
}

interface Props {
  agents: AIAgent[];
  selectedAgentId: string | null;
}

export default function AdvancedHeatmaps({ agents, selectedAgentId }: Props) {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    const fetchHeatmapData = async () => {
      try {
        const response = await fetch('/api/analytics/heatmap');
        const data = await response.json();
        setHeatmapData(data);
        setLoading(false);
        setHasLoadedOnce(true);
      } catch (error) {
        console.error('Failed to fetch heatmap data:', error);
        setLoading(false);
        setHasLoadedOnce(true);
      }
    };

    fetchHeatmapData();
    const interval = setInterval(fetchHeatmapData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading || !hasLoadedOnce) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#66605C' }}>
        Loading advanced analytics...
      </div>
    );
  }

  const filteredData = selectedAgentId
    ? heatmapData.filter(d => d.agentId === selectedAgentId)
    : heatmapData;

  // Get all unique dates across all agents
  const allDates = new Set<string>();
  filteredData.forEach(agent => {
    Object.keys(agent.dailyPerformance).forEach(date => allDates.add(date));
  });
  const sortedDates = Array.from(allDates).sort();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
      {/* Daily Performance Heatmap */}
      <div style={{
        backgroundColor: '#F8EBD8',
        padding: '20px',
        borderRadius: '16px',
        border: '1px solid #CCC1B7'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: '#262A33' }}>
          Daily Performance Heatmap
        </h3>

        {sortedDates.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#66605C',
            fontSize: '12px'
          }}>
            No performance data available yet. Data will appear once agents start trading.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `120px repeat(${sortedDates.length}, 50px)`,
              gap: '2px',
              fontSize: '10px',
              minWidth: 'fit-content'
            }}>
              {/* Header row with dates */}
              <div style={{ position: 'sticky', left: 0, backgroundColor: '#F8EBD8', zIndex: 2 }} />
              {sortedDates.map(date => (
                <div
                  key={date}
                  style={{
                    fontSize: '9px',
                    color: '#66605C',
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    textAlign: 'left',
                    height: '80px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    padding: '4px 0'
                  }}
                >
                  {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              ))}

              {/* Rows for each agent */}
              {filteredData.map(agent => (
                <>
                  <div
                    key={`label-${agent.agentId}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: '#F8EBD8',
                      paddingRight: '8px',
                      zIndex: 1,
                      fontWeight: '600',
                      fontSize: '11px',
                      color: '#262A33'
                    }}
                  >
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: agent.color
                    }} />
                    {agent.name}
                  </div>
                  {sortedDates.map(date => {
                    const dayData = agent.dailyPerformance[date];
                    const percentChange = dayData?.percentChange || 0;
                    const dollarChange = dayData?.total || 0;

                    // Use percentage for color intensity (max at 5%)
                    const maxPercent = 5;
                    const intensity = Math.min(Math.abs(percentChange) / maxPercent, 1);
                    const color = percentChange > 0
                      ? `rgba(15, 123, 58, ${0.2 + intensity * 0.8})`
                      : percentChange < 0
                      ? `rgba(204, 0, 0, ${0.2 + intensity * 0.8})`
                      : '#E9DECF';

                    return (
                      <div
                        key={`${agent.agentId}-${date}`}
                        title={`${agent.name} on ${date}: ${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}% (${dollarChange >= 0 ? '+' : ''}$${dollarChange.toFixed(2)})`}
                        style={{
                          width: '50px',
                          height: '40px',
                          backgroundColor: color,
                          borderRadius: '4px',
                          border: '1px solid #CCC1B7',
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '9px',
                          fontWeight: '700',
                          color: Math.abs(percentChange) > 0.5 ? (intensity > 0.6 ? '#FFF' : '#262A33') : '#66605C'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.15)';
                          e.currentTarget.style.zIndex = '10';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.zIndex = '1';
                        }}
                      >
                        {Math.abs(percentChange) > 0.01 ? `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%` : '-'}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          marginTop: '16px',
          fontSize: '10px',
          color: '#66605C'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(15, 123, 58, 0.8)', borderRadius: '3px' }} />
            <span>Profit</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(204, 0, 0, 0.8)', borderRadius: '3px' }} />
            <span>Loss</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#E9DECF', borderRadius: '3px', border: '1px solid #CCC1B7' }} />
            <span>No Change</span>
          </div>
        </div>
      </div>

      {/* Trading Volume Heatmap - Day of Week */}
      <div style={{
        backgroundColor: '#F8EBD8',
        padding: '20px',
        borderRadius: '16px',
        border: '1px solid #CCC1B7'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: '#262A33' }}>
          Trading Activity by Day of Week
        </h3>

        {filteredData.some(agent => Object.keys(agent.tradesByDayOfWeek).length > 0) ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '120px repeat(7, 1fr)',
            gap: '4px',
            fontSize: '10px'
          }}>
            {/* Header row */}
            <div style={{ position: 'sticky', left: 0, backgroundColor: '#F8EBD8', zIndex: 2 }} />
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, idx) => (
              <div
                key={day}
                style={{
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#262A33',
                  fontSize: '11px',
                  padding: '8px 4px'
                }}
              >
                {day}
              </div>
            ))}

            {/* Rows for each agent */}
            {filteredData.map(agent => {
              const maxTrades = Math.max(...Object.values(agent.tradesByDayOfWeek).map(d => d.count), 1);

              return (
                <>
                  <div
                    key={`label-${agent.agentId}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: '#F8EBD8',
                      paddingRight: '8px',
                      zIndex: 1,
                      fontWeight: '600',
                      fontSize: '11px',
                      color: '#262A33'
                    }}
                  >
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: agent.color
                    }} />
                    {agent.name}
                  </div>
                  {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
                    const dayData = agent.tradesByDayOfWeek[dayIdx];
                    const count = dayData?.count || 0;
                    const winRate = count > 0 ? (dayData.wins / count) : 0;
                    const intensity = count / maxTrades;

                    let bgColor = '#E9DECF';
                    if (count > 0) {
                      if (winRate >= 0.5) {
                        bgColor = `rgba(15, 123, 58, ${0.2 + intensity * 0.8})`;
                      } else {
                        bgColor = `rgba(204, 0, 0, ${0.2 + intensity * 0.8})`;
                      }
                    }

                    return (
                      <div
                        key={`${agent.agentId}-${dayIdx}`}
                        title={`${agent.name}: ${count} trades, ${(winRate * 100).toFixed(0)}% win rate`}
                        style={{
                          height: '50px',
                          backgroundColor: bgColor,
                          borderRadius: '8px',
                          border: '1px solid #CCC1B7',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: '700',
                          color: intensity > 0.5 ? '#FFF' : '#262A33',
                          transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        {count > 0 && (
                          <>
                            <div>{count}</div>
                            <div style={{ fontSize: '8px', opacity: 0.8 }}>
                              {(winRate * 100).toFixed(0)}%
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </>
              );
            })}
          </div>
        ) : (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#66605C',
            fontSize: '12px'
          }}>
            No trading data available yet. Data will appear once agents execute trades.
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          marginTop: '16px',
          fontSize: '10px',
          color: '#66605C'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(15, 123, 58, 0.8)', borderRadius: '3px' }} />
            <span>Wins &gt;50%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(204, 0, 0, 0.8)', borderRadius: '3px' }} />
            <span>Wins &lt;50%</span>
          </div>
        </div>
      </div>

      {/* Win/Loss Streak Visualization */}
      <div style={{
        backgroundColor: '#F8EBD8',
        padding: '20px',
        borderRadius: '16px',
        border: '1px solid #CCC1B7'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: '#262A33' }}>
          Win/Loss Streaks
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          {filteredData.map(agent => (
            <div
              key={agent.agentId}
              style={{
                padding: '16px',
                backgroundColor: '#F5E6D3',
                borderRadius: '12px',
                border: '1px solid #CCC1B7'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: agent.color
                }} />
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#262A33' }}>
                  {agent.name}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '10px', color: '#66605C' }}>Max Win Streak</span>
                  <div style={{
                    padding: '4px 12px',
                    backgroundColor: 'rgba(15, 123, 58, 0.15)',
                    border: '1px solid rgba(15, 123, 58, 0.3)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#0F7B3A'
                  }}>
                    {agent.maxWinStreak}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '10px', color: '#66605C' }}>Max Loss Streak</span>
                  <div style={{
                    padding: '4px 12px',
                    backgroundColor: 'rgba(204, 0, 0, 0.15)',
                    border: '1px solid rgba(204, 0, 0, 0.3)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#CC0000'
                  }}>
                    {agent.maxLossStreak}
                  </div>
                </div>

                {/* Recent streaks visualization */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#66605C', marginBottom: '6px' }}>
                    Recent Streak Pattern
                  </div>
                  <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                    {agent.streaks.slice(-20).map((streak, idx) => (
                      <div
                        key={idx}
                        title={`${streak.type === 'win' ? 'Win' : 'Loss'} streak: ${streak.length}`}
                        style={{
                          width: `${Math.min(streak.length * 4, 40)}px`,
                          height: '12px',
                          backgroundColor: streak.type === 'win' ? '#0F7B3A' : '#CC0000',
                          borderRadius: '2px',
                          opacity: 0.7 + (idx / agent.streaks.length) * 0.3
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Performance Comparison Dashboard */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px'
      }}>
        {/* Win Rate Comparison */}
        <div style={{
          backgroundColor: '#F8EBD8',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid #CCC1B7'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: '#262A33' }}>
            Win Rate Comparison
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {agents
              .filter(agent => agent.id !== 'benchmark-sp20')
              .sort((a, b) => (b.winRate || 0) - (a.winRate || 0))
              .map((agent, idx) => {
                const winRate = agent.winRate || 0;
                const barWidth = `${winRate}%`;
                const isTop = idx === 0 && winRate > 0;

                return (
                  <div key={agent.id}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: agent.color || '#66605C'
                        }} />
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#262A33' }}>
                          {agent.name}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: isTop ? '#0F7B3A' : '#262A33'
                      }}>
                        {winRate.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '20px',
                      backgroundColor: '#E9DECF',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '1px solid #CCC1B7'
                    }}>
                      <div style={{
                        width: barWidth,
                        height: '100%',
                        backgroundColor: isTop ? '#0F7B3A' : 'rgba(15, 123, 58, 0.7)',
                        transition: 'width 0.5s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: winRate > 15 ? '8px' : '0'
                      }}>
                        {isTop && winRate > 15 && (
                          <span style={{ fontSize: '9px', color: '#FFF', fontWeight: '700' }}>
                            Best
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
          <div style={{
            marginTop: '12px',
            padding: '8px',
            backgroundColor: '#EBE0D0',
            borderRadius: '6px',
            fontSize: '9px',
            color: '#66605C',
            textAlign: 'center'
          }}>
            Higher win rate indicates more profitable trades
          </div>
        </div>

        {/* ROI Comparison */}
        <div style={{
          backgroundColor: '#F8EBD8',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid #CCC1B7'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: '#262A33' }}>
            Return on Investment (ROI)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {agents
              .filter(agent => agent.id !== 'benchmark-sp20')
              .sort((a, b) => {
                const roiA = ((a.accountValue - 10000) / 10000) * 100;
                const roiB = ((b.accountValue - 10000) / 10000) * 100;
                return roiB - roiA;
              })
              .map((agent, idx) => {
                const roi = ((agent.accountValue - 10000) / 10000) * 100;
                const isPositive = roi >= 0;
                const absRoi = Math.abs(roi);
                const maxRoi = 10; // Scale bars to max 10% for visual clarity
                const barWidth = `${Math.min((absRoi / maxRoi) * 100, 100)}%`;
                const isTop = idx === 0 && roi > 0;

                return (
                  <div key={agent.id}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: agent.color || '#66605C'
                        }} />
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#262A33' }}>
                          {agent.name}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: isPositive ? (isTop ? '#0F7B3A' : 'rgba(15, 123, 58, 0.8)') : '#CC0000'
                      }}>
                        {isPositive ? '+' : ''}{roi.toFixed(2)}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '20px',
                      backgroundColor: '#E9DECF',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '1px solid #CCC1B7'
                    }}>
                      <div style={{
                        width: barWidth,
                        height: '100%',
                        backgroundColor: isPositive
                          ? (isTop ? '#0F7B3A' : 'rgba(15, 123, 58, 0.7)')
                          : '#CC0000',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
          </div>
          <div style={{
            marginTop: '12px',
            padding: '8px',
            backgroundColor: '#EBE0D0',
            borderRadius: '6px',
            fontSize: '9px',
            color: '#66605C',
            textAlign: 'center'
          }}>
            Percentage return from initial $10,000
          </div>
        </div>

        {/* Sharpe Ratio Comparison */}
        <div style={{
          backgroundColor: '#F8EBD8',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid #CCC1B7'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: '#262A33' }}>
            Risk-Adjusted Returns (Sharpe Ratio)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {agents
              .filter(agent => agent.id !== 'benchmark-sp20')
              .sort((a, b) => (b.sharpeRatio || 0) - (a.sharpeRatio || 0))
              .map((agent, idx) => {
                const sharpe = agent.sharpeRatio || 0;
                const maxSharpe = 3; // Scale to max 3.0 for visual clarity
                const barWidth = `${Math.min((Math.max(sharpe, 0) / maxSharpe) * 100, 100)}%`;
                const isTop = idx === 0 && sharpe > 0;
                const quality = sharpe > 2 ? 'Excellent' : sharpe > 1 ? 'Good' : sharpe > 0 ? 'Fair' : 'Poor';

                return (
                  <div key={agent.id}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: agent.color || '#66605C'
                        }} />
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#262A33' }}>
                          {agent.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '8px',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          backgroundColor: sharpe > 1 ? 'rgba(15, 123, 58, 0.15)' : 'rgba(153, 153, 153, 0.15)',
                          color: sharpe > 1 ? '#0F7B3A' : '#66605C',
                          fontWeight: '600'
                        }}>
                          {quality}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: isTop ? '#0F7B3A' : '#262A33'
                        }}>
                          {sharpe.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '20px',
                      backgroundColor: '#E9DECF',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '1px solid #CCC1B7'
                    }}>
                      <div style={{
                        width: barWidth,
                        height: '100%',
                        backgroundColor: isTop ? '#0F7B3A' : 'rgba(15, 123, 58, 0.7)',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
          </div>
          <div style={{
            marginTop: '12px',
            padding: '8px',
            backgroundColor: '#EBE0D0',
            borderRadius: '6px',
            fontSize: '9px',
            color: '#66605C',
            textAlign: 'center'
          }}>
            Higher is better: &gt;2 = Excellent, &gt;1 = Good, &gt;0 = Fair
          </div>
        </div>

        {/* Risk Metrics */}
        <div style={{
          backgroundColor: '#F8EBD8',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid #CCC1B7'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: '#262A33' }}>
            Maximum Drawdown (Risk)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {agents
              .filter(agent => agent.id !== 'benchmark-sp20')
              .sort((a, b) => (a.maxDrawdown || 0) - (b.maxDrawdown || 0)) // Sort ascending (lower is better)
              .map((agent, idx) => {
                const drawdown = Math.abs(agent.maxDrawdown || 0);
                const maxDrawdown = 20; // Scale to max 20% for visual
                const barWidth = `${Math.min((drawdown / maxDrawdown) * 100, 100)}%`;
                const isBest = idx === 0;
                const riskLevel = drawdown < 5 ? 'Low' : drawdown < 10 ? 'Medium' : 'High';

                return (
                  <div key={agent.id}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: agent.color || '#66605C'
                        }} />
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#262A33' }}>
                          {agent.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '8px',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          backgroundColor: drawdown < 5 ? 'rgba(15, 123, 58, 0.15)' : drawdown < 10 ? 'rgba(255, 165, 0, 0.15)' : 'rgba(204, 0, 0, 0.15)',
                          color: drawdown < 5 ? '#0F7B3A' : drawdown < 10 ? '#FF8C00' : '#CC0000',
                          fontWeight: '600'
                        }}>
                          {riskLevel} Risk
                        </span>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: isBest ? '#0F7B3A' : '#CC0000'
                        }}>
                          -{drawdown.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '20px',
                      backgroundColor: '#E9DECF',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '1px solid #CCC1B7'
                    }}>
                      <div style={{
                        width: barWidth,
                        height: '100%',
                        backgroundColor: drawdown < 5
                          ? (isBest ? '#0F7B3A' : 'rgba(15, 123, 58, 0.7)')
                          : drawdown < 10
                          ? '#FF8C00'
                          : '#CC0000',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
          </div>
          <div style={{
            marginTop: '12px',
            padding: '8px',
            backgroundColor: '#EBE0D0',
            borderRadius: '6px',
            fontSize: '9px',
            color: '#66605C',
            textAlign: 'center'
          }}>
            Lower is better - measures largest peak-to-trough decline
          </div>
        </div>

        {/* Trade Extremes */}
        <div style={{
          backgroundColor: '#F8EBD8',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid #CCC1B7'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: '#262A33' }}>
            Biggest Win vs Loss
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {agents
              .filter(agent => agent.id !== 'benchmark-sp20')
              .map(agent => {
                const biggestWin = agent.biggestWin || 0;
                const biggestLoss = Math.abs(agent.biggestLoss || 0);
                const winLossRatio = biggestLoss !== 0 ? biggestWin / biggestLoss : 0;

                return (
                  <div
                    key={agent.id}
                    style={{
                      padding: '12px',
                      backgroundColor: '#F5E6D3',
                      borderRadius: '10px',
                      border: '1px solid #CCC1B7'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '10px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: agent.color || '#66605C'
                      }} />
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#262A33' }}>
                        {agent.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: '#66605C' }}>Biggest Win</span>
                        <span style={{ fontWeight: '700', color: '#0F7B3A', fontSize: '11px' }}>
                          +${biggestWin.toFixed(2)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: '#66605C' }}>Biggest Loss</span>
                        <span style={{ fontWeight: '700', color: '#CC0000', fontSize: '11px' }}>
                          -${biggestLoss.toFixed(2)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: '#66605C' }}>Ratio</span>
                        <span style={{
                          fontWeight: '700',
                          color: winLossRatio > 1 ? '#0F7B3A' : '#CC0000',
                          fontSize: '11px'
                        }}>
                          {winLossRatio.toFixed(2)}x
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
          <div style={{
            marginTop: '12px',
            padding: '8px',
            backgroundColor: '#EBE0D0',
            borderRadius: '6px',
            fontSize: '9px',
            color: '#66605C',
            textAlign: 'center'
          }}>
            Shows largest single win and loss for each AI trader
          </div>
        </div>

        {/* Total Trades Comparison */}
        <div style={{
          backgroundColor: '#F8EBD8',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid #CCC1B7'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: '#262A33' }}>
            Trading Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {agents
              .filter(agent => agent.id !== 'benchmark-sp20')
              .sort((a, b) => (b.tradeCount || 0) - (a.tradeCount || 0))
              .map((agent, idx) => {
                const totalTrades = agent.tradeCount || 0;
                const wins = Math.round(totalTrades * (agent.winRate || 0) / 100);
                const losses = totalTrades - wins;
                const maxTrades = Math.max(...agents.filter(a => a.id !== 'benchmark-sp20').map(a => a.tradeCount || 0), 1);
                const barWidth = `${(totalTrades / maxTrades) * 100}%`;
                const isMostActive = idx === 0 && totalTrades > 0;

                return (
                  <div key={agent.id}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: agent.color || '#66605C'
                        }} />
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#262A33' }}>
                          {agent.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '9px', color: '#66605C' }}>
                          {wins}W / {losses}L
                        </span>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: isMostActive ? '#0F7B3A' : '#262A33'
                        }}>
                          {totalTrades}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '20px',
                      backgroundColor: '#E9DECF',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '1px solid #CCC1B7'
                    }}>
                      <div style={{
                        width: barWidth,
                        height: '100%',
                        background: `linear-gradient(to right, #0F7B3A 0%, #0F7B3A ${(wins/totalTrades)*100}%, #CC0000 ${(wins/totalTrades)*100}%, #CC0000 100%)`,
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
          </div>
          <div style={{
            marginTop: '12px',
            padding: '8px',
            backgroundColor: '#EBE0D0',
            borderRadius: '6px',
            fontSize: '9px',
            color: '#66605C',
            textAlign: 'center'
          }}>
            Total trades executed (green = wins, red = losses)
          </div>
        </div>
      </div>
    </div>
  );
}
