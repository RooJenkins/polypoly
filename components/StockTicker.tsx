'use client';

import { useEffect, useState } from 'react';
import type { Stock } from '@/types';

export default function StockTicker() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const response = await fetch('/api/stocks/ticker');
        const data = await response.json();
        setStocks(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch stock ticker:', error);
        setLoading(false);
      }
    };

    fetchStocks();
    const interval = setInterval(fetchStocks, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{
        backgroundColor: '#FFF1E5',
        borderBottom: '1px solid #CCC1B7',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        padding: '8px 0'
      }}>
        <div style={{
          fontSize: '10px',
          color: '#66605C',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          Loading market data...
        </div>
      </div>
    );
  }

  if (stocks.length === 0) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: '#FFF1E5',
      borderBottom: '1px solid #CCC1B7',
      overflow: 'hidden',
      flexShrink: 0,
      position: 'relative',
      padding: '8px 0'
    }}>
      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-scroll {
          animation: scroll 30s linear infinite;
        }
        .ticker-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div style={{
        display: 'flex',
        gap: '12px',
        paddingLeft: '12px'
      }} className="ticker-scroll">
        {[...stocks, ...stocks].map((stock, idx) => (
          <div key={idx} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            backgroundColor: '#F5E6D3',
            borderRadius: '24px',
            border: '1px solid #CCC1B7',
            whiteSpace: 'nowrap',
            boxShadow: '0 3px 10px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06)'
          }}>
            <div style={{
              fontSize: '10px',
              fontWeight: '700',
              fontFamily: 'system-ui, sans-serif',
              color: '#262A33',
              letterSpacing: '0.3px'
            }}>
              {stock.symbol}
            </div>
            <div style={{
              fontSize: '10px',
              fontWeight: '600',
              fontFamily: 'system-ui, sans-serif',
              color: '#33302E'
            }}>
              ${stock.price?.toFixed(2) || 'N/A'}
            </div>
            <div style={{
              fontSize: '9px',
              fontWeight: '700',
              fontFamily: 'system-ui, sans-serif',
              color: (stock.changePercent || 0) >= 0 ? '#0F7B3A' : '#CC0000',
              padding: '2px 6px',
              backgroundColor: (stock.changePercent || 0) >= 0 ? 'rgba(15, 123, 58, 0.1)' : 'rgba(204, 0, 0, 0.1)',
              borderRadius: '10px',
              border: `1px solid ${(stock.changePercent || 0) >= 0 ? 'rgba(15, 123, 58, 0.2)' : 'rgba(204, 0, 0, 0.2)'}`
            }}>
              {(stock.changePercent || 0) >= 0 ? '▲' : '▼'} {Math.abs(stock.changePercent || 0).toFixed(2)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
