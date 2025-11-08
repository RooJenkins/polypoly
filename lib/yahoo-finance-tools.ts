/**
 * Yahoo Finance Tools - Direct API calls via yahoo-finance2
 * Primary data source - completely free, no API key needed
 */

import YahooFinance from 'yahoo-finance2';
import { mcpCache } from './mcp-cache';
import { mcpLogger } from './mcp-logger';
import axios from 'axios';

// Create instance of Yahoo Finance client with validation suppressed
const yahooFinance = new YahooFinance({
  validation: { logErrors: false, logOptionsErrors: false },
});

/**
 * Get real-time stock quote
 */
export async function get_quote(
  symbol: string,
  agentId: string = 'unknown',
  agentName: string = 'Unknown'
): Promise<any> {
  // Check cache
  const cached = mcpCache.get('yf_get_quote', { symbol });
  if (cached !== null) {
    mcpLogger.logToolCall(agentId, agentName, 'yf_get_quote', { symbol }, true);
    return cached;
  }

  try {
    // API call
    const quote = await yahooFinance.quote(symbol);

    if (!quote) {
      throw new Error(`No quote data available for ${symbol}`);
    }

    const result = {
      symbol: quote.symbol,
      price: quote.regularMarketPrice || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      volume: quote.regularMarketVolume || 0,
      high: quote.regularMarketDayHigh || 0,
      low: quote.regularMarketDayLow || 0,
      open: quote.regularMarketOpen || 0,
      previousClose: quote.regularMarketPreviousClose || 0,
      marketCap: quote.marketCap || 0,
    };

    mcpCache.set('yf_get_quote', { symbol }, result);
    mcpLogger.logToolCall(agentId, agentName, 'yf_get_quote', { symbol }, false);

    return result;
  } catch (error: any) {
    throw new Error(`Yahoo Finance error for ${symbol}: ${error.message}`);
  }
}

/**
 * Get historical price data using chart API
 */
export async function get_historical(
  symbol: string,
  period: string = '1mo',
  agentId: string = 'unknown',
  agentName: string = 'Unknown'
): Promise<any> {
  const args = { symbol, period };
  const cached = mcpCache.get('yf_get_historical', args);
  if (cached !== null) {
    mcpLogger.logToolCall(agentId, agentName, 'yf_get_historical', args, true);
    return cached;
  }

  try {
    // Use chart API (historical is deprecated)
    // Convert period string to dates
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '1mo':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3mo':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6mo':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const queryOptions = {
      period1: startDate,
      period2: endDate,
      interval: '1d' as const
    };
    const chartResult = await yahooFinance.chart(symbol, queryOptions);

    if (!chartResult || !chartResult.quotes || chartResult.quotes.length === 0) {
      throw new Error(`No historical data available for ${symbol}`);
    }

    const history = chartResult.quotes;

    // Calculate basic technical indicators from recent data
    const prices = history.map((h) => h.close).filter((p): p is number => p !== null);
    const recentPrices = prices.slice(-30); // Last 30 days

    const ma7 =
      recentPrices.slice(-7).reduce((a, b) => a + b, 0) /
      Math.min(7, recentPrices.length);
    const ma30 = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;

    const result = {
      symbol,
      dataPoints: history.length,
      latestClose: prices[prices.length - 1],
      ma7: ma7.toFixed(2),
      ma30: ma30.toFixed(2),
      trend: ma7 > ma30 ? 'bullish' : 'bearish',
      recentData: history.slice(-5).map((h) => ({
        date: h.date,
        close: h.close,
        volume: h.volume,
      })),
    };

    mcpCache.set('yf_get_historical', args, result);
    mcpLogger.logToolCall(agentId, agentName, 'yf_get_historical', args, false);

    return result;
  } catch (error: any) {
    throw new Error(
      `Yahoo Finance historical error for ${symbol}: ${error.message}`
    );
  }
}

/**
 * Get company information
 */
export async function get_company_info(
  symbol: string,
  agentId: string = 'unknown',
  agentName: string = 'Unknown'
): Promise<any> {
  const cached = mcpCache.get('yf_get_company_info', { symbol });
  if (cached !== null) {
    mcpLogger.logToolCall(agentId, agentName, 'yf_get_company_info', { symbol }, true);
    return cached;
  }

  try {
    const quoteSummary = await yahooFinance.quoteSummary(symbol, {
      modules: ['summaryProfile', 'defaultKeyStatistics', 'financialData'],
    });

    const profile = quoteSummary.summaryProfile;
    const keyStats = quoteSummary.defaultKeyStatistics;
    const financial = quoteSummary.financialData;

    const result = {
      symbol,
      name: profile?.longName || symbol,
      sector: profile?.sector || 'Unknown',
      industry: profile?.industry || 'Unknown',
      description: profile?.longBusinessSummary?.slice(0, 200) || '',
      marketCap: keyStats?.marketCap || 0,
      peRatio: keyStats?.forwardPE || keyStats?.trailingPE || 0,
      beta: keyStats?.beta || 0,
      week52High: keyStats?.fiftyTwoWeekHigh || 0,
      week52Low: keyStats?.fiftyTwoWeekLow || 0,
      targetPrice: financial?.targetMeanPrice || 0,
      recommendation: financial?.recommendationKey || 'none',
    };

    mcpCache.set('yf_get_company_info', { symbol }, result);
    mcpLogger.logToolCall(agentId, agentName, 'yf_get_company_info', { symbol }, false);

    return result;
  } catch (error: any) {
    throw new Error(
      `Yahoo Finance company info error for ${symbol}: ${error.message}`
    );
  }
}

/**
 * Get trending stocks
 */
export async function get_trending(
  agentId: string = 'unknown',
  agentName: string = 'Unknown'
): Promise<any> {
  const cached = mcpCache.get('yf_get_trending', {});
  if (cached !== null) {
    mcpLogger.logToolCall(agentId, agentName, 'yf_get_trending', {}, true);
    return cached;
  }

  try {
    const trending = await yahooFinance.trendingSymbols('US');

    if (!trending || !trending.quotes || trending.quotes.length === 0) {
      throw new Error('No trending stocks available');
    }

    const result = {
      count: trending.count || 0,
      symbols: trending.quotes.slice(0, 10).map((q) => ({
        symbol: q.symbol,
        name: q.shortName || q.symbol,
        price: q.regularMarketPrice || 0,
        changePercent: q.regularMarketChangePercent || 0,
      })),
    };

    mcpCache.set('yf_get_trending', {}, result);
    mcpLogger.logToolCall(agentId, agentName, 'yf_get_trending', {}, false);

    return result;
  } catch (error: any) {
    throw new Error(`Yahoo Finance trending error: ${error.message}`);
  }
}

/**
 * Get stock news from Yahoo Finance
 * Uses Yahoo Finance search API to get recent news articles
 */
export async function get_news(
  symbols: string[],
  agentId: string = 'unknown',
  agentName: string = 'Unknown'
): Promise<any[]> {
  const cacheKey = symbols.join(',');
  const cached = mcpCache.get('yf_get_news', { symbols: cacheKey });
  if (cached !== null) {
    mcpLogger.logToolCall(agentId, agentName, 'yf_get_news', { symbols: cacheKey }, true);
    return cached;
  }

  try {
    const allNews: any[] = [];

    // Fetch news for each symbol
    for (const symbol of symbols) {
      try {
        // Use yahoo-finance2 search API to get news
        const searchResult = await yahooFinance.search(symbol, {
          newsCount: 5
        });

        if (searchResult.news && searchResult.news.length > 0) {
          const newsItems = searchResult.news.map((item: any) => ({
            symbol,
            title: item.title || 'No title',
            publisher: item.publisher || 'Unknown',
            link: item.link || '',
            providerPublishTime: item.providerPublishTime,
          }));
          allNews.push(...newsItems);
        }
      } catch (symbolError: any) {
        console.log(`  ⚠️  No news found for ${symbol}`);
      }
    }

    // Sort by publish time (most recent first) and take top 10
    allNews.sort((a, b) => (b.providerPublishTime || 0) - (a.providerPublishTime || 0));
    const result = allNews.slice(0, 10);

    mcpCache.set('yf_get_news', { symbols: cacheKey }, result);
    mcpLogger.logToolCall(agentId, agentName, 'yf_get_news', { symbols: cacheKey }, false);

    return result;
  } catch (error: any) {
    console.log(`  ⚠️  Yahoo Finance news error: ${error.message}`);
    return [];
  }
}

/**
 * Get available tools for OpenAI format
 */
export function getYahooFinanceToolsForOpenAI(): any[] {
  return [
    {
      type: 'function',
      function: {
        name: 'yf_get_quote',
        description:
          'Get real-time stock quote from Yahoo Finance with price, change, volume, market cap (FREE, no limits)',
        parameters: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock symbol (e.g. AAPL, MSFT, TSLA)',
            },
          },
          required: ['symbol'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'yf_get_historical',
        description:
          'Get historical price data and moving averages from Yahoo Finance (FREE)',
        parameters: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock symbol',
            },
            period: {
              type: 'string',
              description: 'Time period (1mo, 3mo, 6mo, 1y)',
              default: '1mo',
            },
          },
          required: ['symbol'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'yf_get_company_info',
        description:
          'Get company fundamentals, sector, P/E ratio, analyst recommendations from Yahoo Finance (FREE)',
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
        name: 'yf_get_trending',
        description:
          'Get list of trending stocks in US market from Yahoo Finance (FREE)',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'yf_get_news',
        description:
          'Get recent news articles for one or more stock symbols from Yahoo Finance (FREE)',
        parameters: {
          type: 'object',
          properties: {
            symbols: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of stock symbols to get news for (e.g. ["AAPL", "TSLA", "NVDA"])',
            },
          },
          required: ['symbols'],
        },
      },
    },
  ];
}

/**
 * Call a tool by name (router function)
 */
export async function callYahooFinanceTool(
  toolName: string,
  args: any,
  agentId: string,
  agentName: string
): Promise<any> {
  switch (toolName) {
    case 'yf_get_quote':
      return await get_quote(args.symbol, agentId, agentName);
    case 'yf_get_historical':
      return await get_historical(
        args.symbol,
        args.period || '1mo',
        agentId,
        agentName
      );
    case 'yf_get_company_info':
      return await get_company_info(args.symbol, agentId, agentName);
    case 'yf_get_trending':
      return await get_trending(agentId, agentName);
    case 'yf_get_news':
      return await get_news(args.symbols || [], agentId, agentName);
    default:
      throw new Error(`Unknown Yahoo Finance tool: ${toolName}`);
  }
}
