/**
 * Multi-Source Financial Data Tool Manager
 *
 * Coordinates between multiple data sources with automatic failover:
 * - Primary: Yahoo Finance (unlimited, free)
 * - Secondary: Alpha Vantage (25 calls/day free tier)
 *
 * Strategy: Use Yahoo Finance for basic quotes and data, Alpha Vantage for technical indicators
 */

import {
  callYahooFinanceTool,
  getYahooFinanceToolsForOpenAI,
} from './yahoo-finance-tools';
import {
  callAlphaVantageTool,
  getAlphaVantageToolsForOpenAI,
} from './alpha-vantage-tools';
import { mcpLogger } from './mcp-logger';

/**
 * Tool routing map - defines which provider to use for each tool
 */
const TOOL_ROUTING: Record<string, 'yahoo' | 'alphavantage' | 'both'> = {
  // Yahoo Finance tools (primary)
  yf_get_quote: 'yahoo',
  yf_get_historical: 'yahoo',
  yf_get_company_info: 'yahoo',
  yf_get_trending: 'yahoo',

  // Alpha Vantage tools (technical indicators not available in Yahoo Finance)
  get_quote: 'alphavantage', // Can be used as backup
  get_rsi: 'alphavantage',
  get_macd: 'alphavantage',
  get_company_overview: 'alphavantage',
  get_news_sentiment: 'alphavantage',
};

/**
 * Call a tool from the appropriate source with automatic failover
 */
export async function callMultiSourceTool(
  toolName: string,
  args: any,
  agentId: string,
  agentName: string
): Promise<any> {
  const source = TOOL_ROUTING[toolName];

  if (!source) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  try {
    if (source === 'yahoo') {
      return await callYahooFinanceTool(toolName, args, agentId, agentName);
    } else if (source === 'alphavantage') {
      // Check if Alpha Vantage is at limit before calling
      const usage = mcpLogger.getApiUsage();
      if (usage.apiCalls >= usage.limit) {
        throw new Error(
          `Alpha Vantage rate limit reached (${usage.apiCalls}/${usage.limit}). Cannot call ${toolName}.`
        );
      }
      return await callAlphaVantageTool(toolName, args, agentId, agentName);
    } else {
      throw new Error(`Invalid source: ${source}`);
    }
  } catch (error: any) {
    // If Yahoo Finance fails, try Alpha Vantage as backup for quote data
    if (source === 'yahoo' && toolName === 'yf_get_quote') {
      console.warn(
        `⚠️  Yahoo Finance failed for ${toolName}, trying Alpha Vantage backup...`
      );
      try {
        return await callAlphaVantageTool('get_quote', args, agentId, agentName);
      } catch (backupError: any) {
        throw new Error(
          `Both Yahoo Finance and Alpha Vantage failed: ${error.message}, ${backupError.message}`
        );
      }
    }

    throw error;
  }
}

/**
 * Get all available tools formatted for OpenAI function calling
 */
export function getMultiSourceToolsForOpenAI(): any[] {
  const yahooTools = getYahooFinanceToolsForOpenAI();
  const alphaVantageTools = getAlphaVantageToolsForOpenAI();

  // Combine all tools
  return [...yahooTools, ...alphaVantageTools];
}

/**
 * Get all available tools formatted for Anthropic Claude
 */
export function getMultiSourceToolsForClaude(): any[] {
  // Convert OpenAI format to Claude format
  return getMultiSourceToolsForOpenAI().map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    input_schema: tool.function.parameters,
  }));
}

/**
 * Get all available tools formatted for Google Gemini
 */
export function getMultiSourceToolsForGemini(): any[] {
  // Convert OpenAI format to Gemini function declaration format
  return getMultiSourceToolsForOpenAI().map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
  }));
}

/**
 * Get tool usage summary across all sources
 */
export function getMultiSourceUsageSummary(): {
  alphaVantage: any;
  totalAvailableToday: number;
  primarySource: string;
} {
  const alphaVantageUsage = mcpLogger.getApiUsage();

  return {
    alphaVantage: alphaVantageUsage,
    totalAvailableToday:
      alphaVantageUsage.remaining + 999999, // Yahoo Finance unlimited
    primarySource: 'Yahoo Finance (unlimited)',
  };
}

/**
 * Print usage summary for all sources
 */
export function printMultiSourceSummary(): void {
  console.log(`\n📊 ===== MULTI-SOURCE TOOL USAGE SUMMARY =====`);

  console.log(`\n🟢 Yahoo Finance (Primary - Unlimited)`);
  console.log(`  Status: ✅ Active`);
  console.log(`  Tools: quote, historical, company_info, trending`);
  console.log(`  Rate Limit: None (FREE, unlimited)`);

  const alphaUsage = mcpLogger.getApiUsage();
  console.log(`\n🟡 Alpha Vantage (Technical Indicators)`);
  console.log(`  Status: ${alphaUsage.remaining > 0 ? '✅ Active' : '⛔ Rate Limited'}`);
  console.log(`  Tools: RSI, MACD, news_sentiment, company_overview`);
  console.log(
    `  Rate Limit: ${alphaUsage.apiCalls}/${alphaUsage.limit} (${alphaUsage.percentUsed.toFixed(1)}%)`
  );
  console.log(`  Remaining: ${alphaUsage.remaining} calls today`);
  console.log(
    `  Cache hits: ${alphaUsage.cachedCalls} (${((alphaUsage.cachedCalls / alphaUsage.totalCalls) * 100).toFixed(1)}%)`
  );

  console.log(`\n💡 Strategy:`);
  console.log(
    `  • Use Yahoo Finance for all basic quotes & data (unlimited)`
  );
  console.log(
    `  • Use Alpha Vantage sparingly for technical indicators (25/day limit)`
  );
  console.log(`  • Cache aggressively (1 hour TTL) to maximize efficiency`);

  console.log(`===============================================\n`);
}
