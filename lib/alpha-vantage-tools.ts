/**
 * Alpha Vantage Tools - Direct REST API calls
 * Simpler and more reliable than full MCP integration
 */

import axios from 'axios';
import { mcpCache } from './mcp-cache';
import { mcpLogger } from './mcp-logger';

const BASE_URL = 'https://www.alphavantage.co/query';

/**
 * Get API key from environment (lazy load to ensure .env is loaded first)
 */
function getApiKey(): string {
  const key = process.env.ALPHA_VANTAGE_API_KEY || '';
  if (!key || key === 'demo') {
    throw new Error('ALPHA_VANTAGE_API_KEY is not set or is using demo key. Please set a valid API key in .env file.');
  }
  return key;
}

/**
 * Get real-time stock quote
 */
export async function get_quote(
  symbol: string,
  agentId: string = 'unknown',
  agentName: string = 'Unknown'
): Promise<any> {
  // Check cache
  const cached = mcpCache.get('get_quote', { symbol });
  if (cached !== null) {
    mcpLogger.logToolCall(agentId, agentName, 'get_quote', { symbol }, true);
    return cached;
  }

  // API call
  const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${getApiKey()}`;
  const response = await axios.get(url);

  // Check for API errors or rate limit
  if (response.data['Error Message']) {
    throw new Error(`Alpha Vantage API error: ${response.data['Error Message']}`);
  }
  if (response.data['Note']) {
    throw new Error(`Alpha Vantage rate limit: ${response.data['Note']}`);
  }
  if (response.data['Information']) {
    // This is the rate limit message for free tier
    throw new Error(`Alpha Vantage rate limit: ${response.data['Information']}`);
  }

  const data = response.data['Global Quote'];
  if (!data || Object.keys(data).length === 0) {
    throw new Error(`No quote data available for ${symbol}. Response: ${JSON.stringify(response.data)}`);
  }

  const result = {
    symbol,
    price: parseFloat(data['05. price'] || '0'),
    change: parseFloat(data['09. change'] || '0'),
    changePercent: parseFloat((data['10. change percent'] || '0').replace('%', '')),
    volume: parseInt(data['06. volume'] || '0'),
    high: parseFloat(data['03. high'] || '0'),
    low: parseFloat(data['04. low'] || '0'),
  };

  mcpCache.set('get_quote', { symbol }, result);
  mcpLogger.logToolCall(agentId, agentName, 'get_quote', { symbol }, false);

  return result;
}

/**
 * Get RSI (Relative Strength Index)
 */
export async function get_rsi(
  symbol: string,
  interval: string = 'daily',
  timePeriod: number = 14,
  agentId: string = 'unknown',
  agentName: string = 'Unknown'
): Promise<any> {
  const args = { symbol, interval, timePeriod };
  const cached = mcpCache.get('get_rsi', args);
  if (cached !== null) {
    mcpLogger.logToolCall(agentId, agentName, 'get_rsi', args, true);
    return cached;
  }

  const url = `${BASE_URL}?function=RSI&symbol=${symbol}&interval=${interval}&time_period=${timePeriod}&series_type=close&apikey=${getApiKey()}`;
  const response = await axios.get(url);
  const data = response.data['Technical Analysis: RSI'];

  if (!data) {
    throw new Error(`No RSI data available for ${symbol}`);
  }

  // Get most recent RSI value
  const latestDate = Object.keys(data)[0];
  const rsi = parseFloat(data[latestDate]['RSI']);

  const result = {
    symbol,
    rsi: rsi.toFixed(2),
    interpretation:
      rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral',
    date: latestDate,
  };

  mcpCache.set('get_rsi', args, result);
  mcpLogger.logToolCall(agentId, agentName, 'get_rsi', args, false);

  return result;
}

/**
 * Get MACD (Moving Average Convergence Divergence)
 */
export async function get_macd(
  symbol: string,
  interval: string = 'daily',
  agentId: string = 'unknown',
  agentName: string = 'Unknown'
): Promise<any> {
  const args = { symbol, interval };
  const cached = mcpCache.get('get_macd', args);
  if (cached !== null) {
    mcpLogger.logToolCall(agentId, agentName, 'get_macd', args, true);
    return cached;
  }

  const url = `${BASE_URL}?function=MACD&symbol=${symbol}&interval=${interval}&series_type=close&apikey=${getApiKey()}`;
  const response = await axios.get(url);
  const data = response.data['Technical Analysis: MACD'];

  if (!data) {
    throw new Error(`No MACD data available for ${symbol}`);
  }

  // Get most recent values
  const latestDate = Object.keys(data)[0];
  const macd = parseFloat(data[latestDate]['MACD']);
  const signal = parseFloat(data[latestDate]['MACD_Signal']);
  const hist = parseFloat(data[latestDate]['MACD_Hist']);

  const result = {
    symbol,
    macd: macd.toFixed(4),
    signal: signal.toFixed(4),
    histogram: hist.toFixed(4),
    trend: hist > 0 ? 'bullish' : 'bearish',
    crossover: Math.abs(hist) < 0.5 ? 'near_crossover' : 'stable',
    date: latestDate,
  };

  mcpCache.set('get_macd', args, result);
  mcpLogger.logToolCall(agentId, agentName, 'get_macd', args, false);

  return result;
}

/**
 * Get company overview (fundamentals)
 */
export async function get_company_overview(
  symbol: string,
  agentId: string = 'unknown',
  agentName: string = 'Unknown'
): Promise<any> {
  const cached = mcpCache.get('get_company_overview', { symbol });
  if (cached !== null) {
    mcpLogger.logToolCall(agentId, agentName, 'get_company_overview', { symbol }, true);
    return cached;
  }

  const url = `${BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${getApiKey()}`;
  const response = await axios.get(url);
  const data = response.data;

  const result = {
    symbol,
    name: data['Name'],
    sector: data['Sector'],
    industry: data['Industry'],
    marketCap: data['MarketCapitalization'],
    peRatio: data['PERatio'],
    eps: data['EPS'],
    dividendYield: data['DividendYield'],
    week52High: data['52WeekHigh'],
    week52Low: data['52WeekLow'],
  };

  mcpCache.set('get_company_overview', { symbol }, result);
  mcpLogger.logToolCall(agentId, agentName, 'get_company_overview', { symbol }, false);

  return result;
}

/**
 * Get news sentiment
 */
export async function get_news_sentiment(
  symbol: string,
  agentId: string = 'unknown',
  agentName: string = 'Unknown'
): Promise<any> {
  const cached = mcpCache.get('get_news_sentiment', { symbol });
  if (cached !== null) {
    mcpLogger.logToolCall(agentId, agentName, 'get_news_sentiment', { symbol }, true);
    return cached;
  }

  const url = `${BASE_URL}?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${getApiKey()}`;
  const response = await axios.get(url);
  const feed = response.data.feed || [];

  const result = {
    symbol,
    articles: feed.slice(0, 5).map((item: any) => ({
      title: item.title,
      sentiment: item.overall_sentiment_label,
      sentimentScore: item.overall_sentiment_score,
      source: item.source,
      publishedAt: item.time_published,
    })),
    overallSentiment: feed.length > 0 ? feed[0].overall_sentiment_label : 'neutral',
  };

  mcpCache.set('get_news_sentiment', { symbol }, result);
  mcpLogger.logToolCall(agentId, agentName, 'get_news_sentiment', { symbol }, false);

  return result;
}

/**
 * Get available tools for OpenAI format
 */
export function getAlphaVantageToolsForOpenAI(): any[] {
  return [
    {
      type: 'function',
      function: {
        name: 'get_quote',
        description: 'Get real-time stock quote with price, change, volume',
        parameters: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock symbol (e.g. AAPL, MSFT)',
            },
          },
          required: ['symbol'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_rsi',
        description: 'Get RSI indicator - shows if stock is overbought (>70) or oversold (<30)',
        parameters: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock symbol',
            },
            interval: {
              type: 'string',
              description: 'Time interval (daily, weekly, monthly)',
              default: 'daily',
            },
          },
          required: ['symbol'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_macd',
        description: 'Get MACD momentum indicator - shows bullish/bearish trend',
        parameters: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock symbol',
            },
            interval: {
              type: 'string',
              description: 'Time interval (daily, weekly, monthly)',
              default: 'daily',
            },
          },
          required: ['symbol'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_company_overview',
        description: 'Get company fundamentals: P/E ratio, market cap, sector, EPS',
        parameters: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock symbol',
            },
          },
          required: ['symbol'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_news_sentiment',
        description: 'Get recent news headlines and sentiment analysis',
        parameters: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock symbol',
            },
          },
          required: ['symbol'],
        },
      },
    },
  ];
}

/**
 * Call a tool by name (router function)
 */
export async function callAlphaVantageTool(
  toolName: string,
  args: any,
  agentId: string,
  agentName: string
): Promise<any> {
  switch (toolName) {
    case 'get_quote':
      return await get_quote(args.symbol, agentId, agentName);
    case 'get_rsi':
      return await get_rsi(args.symbol, args.interval || 'daily', 14, agentId, agentName);
    case 'get_macd':
      return await get_macd(args.symbol, args.interval || 'daily', agentId, agentName);
    case 'get_company_overview':
      return await get_company_overview(args.symbol, agentId, agentName);
    case 'get_news_sentiment':
      return await get_news_sentiment(args.symbol, agentId, agentName);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
