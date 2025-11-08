import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import type { Stock } from '@/types';
import {
  getMultiSourceToolsForOpenAI,
  getMultiSourceToolsForClaude,
  getMultiSourceToolsForGemini,
  callMultiSourceTool,
  getMultiSourceUsageSummary,
} from './multi-source-tools';

interface MarketContext {
  stocks: Stock[];
  cashBalance: number;
  accountValue: number;
  positions: Array<{
    symbol: string;
    name: string;
    quantity: number;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
  }>;
  // Phase 1: Market context
  marketTrend?: {
    daily: number;
    weekly: number;
  };
  // Phase 1: Agent performance stats
  agentStats?: {
    winRate: number;
    totalTrades: number;
    avgWin: number;
    avgLoss: number;
    bestTrade: number;
    worstTrade: number;
  };
  // Phase 2: News for big movers
  news?: Array<{
    symbol: string;
    headline: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
}

interface TradingDecision {
  action: 'BUY' | 'SELL' | 'SELL_SHORT' | 'BUY_TO_COVER' | 'HOLD';
  symbol?: string;
  quantity?: number;
  reasoning: string;
  confidence: number;
  riskAssessment?: string;
  targetPrice?: number;
  stopLoss?: number;
  invalidationCondition?: string; // New: Exit condition if thesis breaks
}

function createPrompt(context: MarketContext, maxToolCalls: number = 15, useMCPTools: boolean = false): string {
  // Format positions
  const positionsStr = context.positions.length > 0
    ? context.positions.map(p => `${p.symbol}: ${p.quantity}@$${p.entryPrice.toFixed(2)} P&L:${p.unrealizedPnLPercent.toFixed(1)}%`).join(', ')
    : 'None';

  // Format market trend
  const marketTrendStr = context.marketTrend
    ? `Market today: ${context.marketTrend.daily >= 0 ? '+' : ''}${context.marketTrend.daily.toFixed(2)}%`
    : '';

  // Format agent stats
  const agentStatsStr = context.agentStats && context.agentStats.totalTrades > 0
    ? `Your stats: ${context.agentStats.winRate.toFixed(0)}% win rate (${context.agentStats.totalTrades} trades), Avg win: $${context.agentStats.avgWin.toFixed(0)}, Avg loss: $${context.agentStats.avgLoss.toFixed(0)}`
    : '';

  // Format news if available
  const newsStr = context.news && context.news.length > 0
    ? '\nNEWS:\n' + context.news.map(n => `${n.symbol}: ${n.headline} [${n.sentiment}]`).join('\n')
    : '';

  // Format stocks with technical indicators
  const stocksStr = context.stocks.map(s => {
    const parts = [`${s.symbol}:$${s.price.toFixed(2)}`];

    // Today's change
    parts.push(`(${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(1)}%)`);

    // 7-day and 30-day trends if available
    if (s.weekTrend !== undefined) {
      parts.push(`7d:${s.weekTrend >= 0 ? '+' : ''}${s.weekTrend.toFixed(1)}%`);
    }
    if (s.monthTrend !== undefined) {
      parts.push(`30d:${s.monthTrend >= 0 ? '+' : ''}${s.monthTrend.toFixed(1)}%`);
    }

    // Moving averages if available
    if (s.ma7 !== undefined) {
      const vsMA7 = ((s.price - s.ma7) / s.ma7 * 100).toFixed(1);
      parts.push(`MA7:${Number(vsMA7) >= 0 ? '+' : ''}${vsMA7}%`);
    }
    if (s.ma30 !== undefined) {
      const vsMA30 = ((s.price - s.ma30) / s.ma30 * 100).toFixed(1);
      parts.push(`MA30:${Number(vsMA30) >= 0 ? '+' : ''}${vsMA30}%`);
    }
    if (s.ma90 !== undefined) {
      const vsMA90 = ((s.price - s.ma90) / s.ma90 * 100).toFixed(1);
      parts.push(`MA90:${Number(vsMA90) >= 0 ? '+' : ''}${vsMA90}%`);
    }

    // 52-week high/low if available
    if (s.high52w !== undefined && s.low52w !== undefined) {
      const vsHigh = ((s.price - s.high52w) / s.high52w * 100).toFixed(1);
      const vsLow = ((s.price - s.low52w) / s.low52w * 100).toFixed(1);
      parts.push(`52wH:${Number(vsHigh) >= 0 ? '+' : ''}${vsHigh}%`);
      parts.push(`52wL:${Number(vsLow) >= 0 ? '+' : ''}${vsLow}%`);
    }

    // Volume trend if available
    if (s.volumeTrend !== undefined) {
      parts.push(`VolTrend:${s.volumeTrend >= 0 ? '+' : ''}${s.volumeTrend.toFixed(0)}%`);
    } else if (s.volumeStatus) {
      parts.push(`Vol:${s.volumeStatus}`);
    }

    return parts.join(' ');
  }).join('\n');

  return `STOCK TRADER - S&P 500

==== TIMESTAMP ====
Market data as of: ${new Date().toISOString()}
IMPORTANT: Price data is ordered OLDEST to NEWEST

==== PORTFOLIO ====
Value: $${context.accountValue.toFixed(0)} | Cash Available: $${context.cashBalance.toFixed(0)}
Positions: ${positionsStr}

==== MARKET CONTEXT ====
${marketTrendStr}
${stocksStr}${newsStr}

Format: Symbol:Price (Today%) 7d:Week% 30d:Month% MA7:vsMA7% MA30:vsMA30% MA90:vsMA90% 52wH:vsHigh% 52wL:vsLow% VolTrend:trend%
- 7d/30d: Price trend over 7/30 days
- MA7/MA30/MA90: % above/below moving average (positive = bullish momentum)
- 52wH/52wL: % from 52-week high/low (near high = potential resistance, near low = potential support)
- VolTrend: Volume vs 7-day average (high volume = strong conviction)

==== YOUR PERFORMANCE ====
${agentStatsStr || 'No trade history yet'}

==== POSITION SIZING BASED ON CONFIDENCE ====
Your confidence score determines position size:
- Confidence 0.9-1.0 (Very High): 25% of cash available
- Confidence 0.8-0.9 (High): 20% of cash available
- Confidence 0.7-0.8 (Medium): 15% of cash available
- Confidence <0.7: DO NOT TRADE (reject the opportunity)

Higher conviction = larger position. Lower conviction = smaller position or wait.

==== RISK RULES ====
- Max 25% cash per trade (for high confidence 0.9+)
- Max 30% portfolio in single stock
- Min 3 positions for diversification
- AUTOMATIC EXIT ENFORCEMENT: Your stopLoss and targetPrice will execute WITHOUT your input
  * When currentPrice ≤ stopLoss → Position AUTO-CLOSES
  * When currentPrice ≥ targetPrice → Position AUTO-CLOSES
  * These are PRE-REGISTERED commitments that WILL execute

==== TRADING PRINCIPLES ====
✓ Buy dips in strong uptrends with positive market sentiment
✓ Take profits on parabolic moves (>15% gains)
✓ Cut losses early on weak stocks (<-8%)
✓ Fewer, larger, higher-conviction trades > many small trades
✗ Avoid chasing breakouts without confirmation
✗ Don't average down on falling stocks without support
✗ Don't trade on low conviction (<0.7 confidence)

${useMCPTools ? `==== TOOL CALL BUDGET: ${maxToolCalls} maximum ====
Use efficiently based on situation:
- ROUTINE MONITORING (no opportunities): 2-3 calls
  Example: get_quote(symbol) for quick checks

- INVESTIGATING OPPORTUNITY (interesting signal): 8-10 calls
  Example: get_quote → get_rsi → get_macd → get_news_sentiment

- CRITICAL DECISION (large risk/reward at stake): 12-15 calls
  Example: Full analysis including fundamentals, multiple indicators, news

Available tools:
- get_quote(symbol): Real-time price & daily change
- get_rsi(symbol, interval='daily'): Relative Strength Index (overbought >70, oversold <30)
- get_macd(symbol, interval='daily'): Momentum indicator (bullish/bearish signal)
- get_company_overview(symbol): P/E ratio, market cap, sector, description
- get_news_sentiment(symbol): Recent news headlines with sentiment scores

Use tools to gather data, then make ONE trading decision.
` : ''}
==== DECISION ====
Actions: BUY (long), SELL (close long), SELL_SHORT (bet on drop), BUY_TO_COVER (close short), HOLD

Respond with JSON only:
{
  "action":"BUY|SELL|SELL_SHORT|BUY_TO_COVER|HOLD",
  "symbol":"AAPL",
  "quantity":5,
  "reasoning":"IMPORTANT: Write a detailed analysis of at least 200 characters (2-3 sentences minimum). Explain: (1) What specific technical signals, price patterns, or market conditions make this the right move now? (2) How does this trade fit your strategy and risk management approach? (3) What key factors are you monitoring? Example: 'XOM is showing strong momentum with price breaking above 7-day MA (+2.3%) on elevated volume. The energy sector is benefiting from crude oil strength, and XOM's technical setup suggests continuation to $126 resistance. This trade aligns with my momentum strategy and offers 3:1 reward-risk. Will monitor crude prices and sector rotation as key factors.'",
  "confidence":0.85,
  "riskAssessment":"Low|Med|High",
  "targetPrice":200,
  "stopLoss":175,
  "invalidationCondition":"Exit if 4H RSI breaks below 40, signaling momentum failure"
}

CRITICAL EXIT PLANNING (REQUIRED FOR ALL BUY/SELL_SHORT ACTIONS):
⚠️ WARNING: If you submit BUY or SELL_SHORT without complete exit plan, trade will be REJECTED
- targetPrice: REQUIRED - Price at which to take profits (WILL AUTO-EXECUTE)
- stopLoss: REQUIRED - Price at which to cut losses (WILL AUTO-EXECUTE)
- invalidationCondition: REQUIRED - Market condition that voids your thesis (e.g., "Break below support at $180", "Volume drops below 1M shares", "RSI reversal")
- reasoning: REQUIRED - Minimum 200 characters. Write detailed analysis explaining your complete rationale and what you're monitoring.

For BUY/LONG trades:
- targetPrice must be ABOVE currentPrice (REQUIRED)
- stopLoss must be BELOW currentPrice (REQUIRED)
- invalidationCondition must describe specific exit condition (REQUIRED)

For SELL_SHORT trades:
- targetPrice must be BELOW currentPrice (REQUIRED)
- stopLoss must be ABOVE currentPrice (REQUIRED)
- invalidationCondition must describe specific exit condition (REQUIRED)

For SELL/BUY_TO_COVER: {"action":"SELL","reasoning":"Detailed explanation (200+ chars): Why closing now? What's the P&L? What market conditions triggered this exit? Example: 'Closing UNH position with +$3.67 profit (1.1% gain). Healthcare sector showing weakness today with UNH down 0.8%. Taking profits as the stock approaches resistance at $328 and RSI indicates overbought conditions. Market rotation into tech reducing healthcare allocations.'","confidence":0.8}
For HOLD: {"action":"HOLD","reasoning":"Detailed explanation (200+ chars): Why is waiting best? What signals are you monitoring? What would trigger action? Example: 'Holding cash as market shows mixed signals. S&P up 0.19% but sector rotation unclear. Monitoring energy sector momentum and crude oil prices for potential XOM entry. Also watching tech sector for pullback opportunities in NVDA/MSFT. Will act when conviction reaches 70%+ with clear technical setup.'","confidence":0.7}`;
}

export async function getAIDecision(
  agentId: string,
  agentName: string,
  context: MarketContext
): Promise<TradingDecision> {
  console.log(`  🤖 Getting decision from ${agentName}...`);

  try {
    // Route based on agent name to proper AI API
    switch (agentName) {
      case 'GPT-5':
        return await callOpenAI(context, agentId, agentName);
      case 'Claude Sonnet 4.5':
        return await callClaude(context, agentId, agentName);
      case 'Gemini Flash':
        return await callGemini(context);
      case 'DeepSeek':
        return await callDeepSeek(context);
      case 'Qwen':
        return await callQwen(context);
      case 'Grok':
        return await callGrok(context);
      default:
        throw new Error(`Unknown agent: ${agentName}. Cannot use mock data - real AI integration required.`);
    }
  } catch (error: any) {
    console.error(`  ❌ Error getting AI decision for ${agentName}:`, error.message);
    // Return error state - DO NOT use mock/random data per user requirements
    return {
      action: 'HOLD',
      reasoning: `⚠️ AI API Error: ${error.message}. System cannot generate mock decisions per policy. This agent will hold until API connection is restored.`,
      confidence: 0.1,
    };
  }
}

async function callOpenAI(context: MarketContext, agentId: string = 'gpt4', agentName: string = 'GPT-4'): Promise<TradingDecision> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Use function calling with Alpha Vantage tools
  return await callOpenAIWithTools(openai, context, agentId, agentName);
}

async function callOpenAIWithTools(
  openai: OpenAI,
  context: MarketContext,
  agentId: string,
  agentName: string
): Promise<TradingDecision> {
  const MAX_TOOL_CALLS = 15;
  let toolCallsUsed = 0;

  const tools = getMultiSourceToolsForOpenAI();
  const messages: any[] = [
    {
      role: 'system',
      content: `You are an expert stock trader. You have access to multi-source financial data tools:
- Yahoo Finance (yf_*): Unlimited free quotes, historical data, company info, trending stocks
- Alpha Vantage (get_*): Technical indicators (RSI, MACD), news sentiment (LIMITED: 25 calls/day, use sparingly!)

Use them wisely to make informed trading decisions. Budget: ${MAX_TOOL_CALLS} tool calls maximum.

Strategy: Prefer Yahoo Finance tools (unlimited), use Alpha Vantage only for technical indicators you really need.`,
    },
    {
      role: 'user',
      content: createPrompt(context, MAX_TOOL_CALLS, true),
    },
  ];

  console.log(`  🔧 Multi-source function calling enabled (${MAX_TOOL_CALLS} tool budget)`);

  while (toolCallsUsed < MAX_TOOL_CALLS) {
    const response = await openai.chat.completions.create({
      model: 'gpt-5',
      messages,
      tools,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const message = response.choices[0].message;
    messages.push(message);

    // If AI returns a decision (no more tool calls)
    if (!message.tool_calls || message.tool_calls.length === 0) {
      if (message.content) {
        console.log(`  ✅ Decision made after ${toolCallsUsed} tool calls`);
        return parseAIResponse(message.content);
      }
      // No content and no tool calls - error
      throw new Error('AI returned no decision or tool calls');
    }

    // Execute tool calls
    for (const toolCall of message.tool_calls) {
      toolCallsUsed++;

      // Type guard for function tool calls
      if (toolCall.type !== 'function' || !toolCall.function) continue;

      console.log(`  🔧 Tool call ${toolCallsUsed}/${MAX_TOOL_CALLS}: ${toolCall.function.name}`);

      try {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await callMultiSourceTool(toolCall.function.name, args, agentId, agentName);

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      } catch (error: any) {
        console.log(`  ⚠️  Tool error: ${error.message}`);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: error.message }),
        });
      }
    }

    // Add budget reminder
    if (toolCallsUsed < MAX_TOOL_CALLS) {
      messages.push({
        role: 'system',
        content: `Tool calls used: ${toolCallsUsed}/${MAX_TOOL_CALLS}. ${MAX_TOOL_CALLS - toolCallsUsed} remaining. Make your decision or continue investigating.`,
      });
    }
  }

  // Budget exhausted, force decision
  console.log(`  ⚠️  Tool budget exhausted (${MAX_TOOL_CALLS} calls), forcing decision`);
  const finalResponse = await openai.chat.completions.create({
    model: 'gpt-5',
    messages: [
      ...messages,
      {
        role: 'system',
        content: 'Budget exhausted. Make your final trading decision NOW based on the data you gathered. Respond with JSON only.',
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  const content = finalResponse.choices[0].message.content || '{"action":"HOLD","reasoning":"Budget exhausted","confidence":0.5}';
  return parseAIResponse(content);
}

async function callClaude(context: MarketContext, agentId: string = 'claude', agentName: string = 'Claude'): Promise<TradingDecision> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Use tool calling for Claude with same budget as GPT-4o Mini
  return await callClaudeWithTools(anthropic, context, agentId, agentName);
}

async function callClaudeWithTools(
  anthropic: Anthropic,
  context: MarketContext,
  agentId: string,
  agentName: string
): Promise<TradingDecision> {
  const MAX_TOOL_CALLS = 15;
  let toolCallsUsed = 0;

  const tools = getMultiSourceToolsForClaude();
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: createPrompt(context, MAX_TOOL_CALLS, true),
    },
  ];

  console.log(`  🔧 Multi-source function calling enabled (${MAX_TOOL_CALLS} tool budget)`);

  while (toolCallsUsed < MAX_TOOL_CALLS) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800, // Increased from 200 for better reasoning
      messages,
      tools,
      temperature: 0.7,
    });

    // Check if Claude wants to use tools
    const hasToolUse = response.content.some((block) => block.type === 'tool_use');

    if (!hasToolUse) {
      // Claude is done and returned final answer
      const textBlock = response.content.find((block) => block.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        console.log(`  ✅ Decision made after ${toolCallsUsed} tool calls`);
        return parseAIResponse(textBlock.text);
      }
      throw new Error('Claude returned no decision or tool calls');
    }

    // Add Claude's response to conversation
    messages.push({
      role: 'assistant',
      content: response.content,
    });

    // Execute tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        toolCallsUsed++;
        console.log(`  🔧 Tool call ${toolCallsUsed}/${MAX_TOOL_CALLS}: ${block.name}`);

        try {
          const result = await callMultiSourceTool(block.name, block.input, agentId, agentName);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        } catch (error: any) {
          console.log(`  ⚠️  Tool error: ${error.message}`);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ error: error.message }),
            is_error: true,
          });
        }
      }
    }

    // Add tool results to conversation
    messages.push({
      role: 'user',
      content: toolResults,
    });

    // Add budget reminder if not exhausted
    if (toolCallsUsed < MAX_TOOL_CALLS) {
      messages.push({
        role: 'user',
        content: `Tool calls used: ${toolCallsUsed}/${MAX_TOOL_CALLS}. ${MAX_TOOL_CALLS - toolCallsUsed} remaining. Make your decision or continue investigating.`,
      });
    }
  }

  // Budget exhausted, force decision
  console.log(`  ⚠️  Tool budget exhausted (${MAX_TOOL_CALLS} calls), forcing decision`);
  const finalResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [
      ...messages,
      {
        role: 'user',
        content: 'Budget exhausted. Make your final trading decision NOW based on the data you gathered. Respond with JSON only.',
      },
    ],
    temperature: 0.7,
  });

  const textBlock = finalResponse.content.find((block) => block.type === 'text');
  const content = textBlock && textBlock.type === 'text' ? textBlock.text : '{"action":"HOLD","reasoning":"Budget exhausted","confidence":0.5}';
  return parseAIResponse(content);
}

async function callGemini(context: MarketContext): Promise<TradingDecision> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

  // Use function calling for Gemini
  return await callGeminiWithTools(genAI, context, 'gemini', 'Gemini Flash');
}

async function callGeminiWithTools(
  genAI: GoogleGenerativeAI,
  context: MarketContext,
  agentId: string,
  agentName: string
): Promise<TradingDecision> {
  const MAX_TOOL_CALLS = 15;
  let toolCallsUsed = 0;

  const tools = getMultiSourceToolsForGemini();
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    tools: [{ functionDeclarations: tools }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800,
    },
  });

  console.log(`  🔧 Multi-source function calling enabled (${MAX_TOOL_CALLS} tool budget)`);

  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{
          text: `You are an expert stock trader. You have access to multi-source financial data tools:
- Yahoo Finance (yf_*): Unlimited free quotes, historical data, company info, trending stocks
- Alpha Vantage (get_*): Technical indicators (RSI, MACD), news sentiment (LIMITED: 25 calls/day, use sparingly!)

Use them wisely to make informed trading decisions. Budget: ${MAX_TOOL_CALLS} tool calls maximum.

Strategy: Prefer Yahoo Finance tools (unlimited), use Alpha Vantage only for technical indicators you really need.`
        }],
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I will use the tools efficiently within the budget to make informed trading decisions.' }],
      },
    ],
  });

  while (toolCallsUsed < MAX_TOOL_CALLS) {
    const result = await chat.sendMessage(
      toolCallsUsed === 0
        ? createPrompt(context, MAX_TOOL_CALLS, true)
        : `Tool calls used: ${toolCallsUsed}/${MAX_TOOL_CALLS}. ${MAX_TOOL_CALLS - toolCallsUsed} remaining. Make your decision or continue investigating.`
    );

    const response = result.response;
    const functionCalls = response.functionCalls();

    // If no function calls, Gemini is done
    if (!functionCalls || functionCalls.length === 0) {
      const text = response.text();
      console.log(`  ✅ Decision made after ${toolCallsUsed} tool calls`);
      return parseAIResponse(text);
    }

    // Execute function calls
    const functionResponses: any[] = [];

    for (const call of functionCalls) {
      toolCallsUsed++;
      console.log(`  🔧 Tool call ${toolCallsUsed}/${MAX_TOOL_CALLS}: ${call.name}`);

      try {
        const result = await callMultiSourceTool(call.name, call.args, agentId, agentName);
        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: result,
          },
        });
      } catch (error: any) {
        console.log(`  ⚠️  Tool error: ${error.message}`);
        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: { error: error.message },
          },
        });
      }

      if (toolCallsUsed >= MAX_TOOL_CALLS) break;
    }

    // Send function responses back to Gemini
    await chat.sendMessage(functionResponses);
  }

  // Budget exhausted, force decision
  console.log(`  ⚠️  Tool budget exhausted (${MAX_TOOL_CALLS} calls), forcing decision`);
  const finalResult = await chat.sendMessage(
    'Budget exhausted. Make your final trading decision NOW based on the data you gathered. Respond with JSON only.'
  );

  const content = finalResult.response.text() || '{"action":"HOLD","reasoning":"Budget exhausted","confidence":0.5}';
  return parseAIResponse(content);
}

async function callDeepSeek(context: MarketContext): Promise<TradingDecision> {
  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are an expert stock trader. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: createPrompt(context),
        },
      ],
      temperature: 0.7,
      max_tokens: 1000, // Increased from 500
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
    }
  );

  const text = response.data.choices[0].message.content;
  return parseAIResponse(text);
}

async function callQwen(context: MarketContext): Promise<TradingDecision> {
  const response = await axios.post(
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    {
      model: 'qwen-max',
      input: {
        messages: [
          {
            role: 'system',
            content: 'You are an expert stock trader. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: createPrompt(context),
          },
        ],
      },
      parameters: {
        temperature: 0.7,
        max_tokens: 1000, // Increased from 500
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.QWEN_API_KEY}`,
      },
    }
  );

  const text = response.data.output.text;
  return parseAIResponse(text);
}

async function callGrok(context: MarketContext): Promise<TradingDecision> {
  // Grok uses OpenAI-compatible API via xAI
  const response = await axios.post(
    'https://api.x.ai/v1/chat/completions',
    {
      model: 'grok-2-1212', // Using Grok 2 (December 2024 version)
      messages: [
        {
          role: 'system',
          content: 'You are an expert stock trader. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: createPrompt(context),
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
      },
    }
  );

  const text = response.data.choices[0].message.content;
  return parseAIResponse(text);
}

function parseAIResponse(response: string): TradingDecision {
  try {
    // Extract JSON from markdown code blocks if present
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Try to find JSON object in the response
    const jsonStart = jsonStr.indexOf('{');
    const jsonEnd = jsonStr.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
    }

    const decision = JSON.parse(jsonStr);

    // Validate and normalize the decision
    if (!['BUY', 'SELL', 'SELL_SHORT', 'BUY_TO_COVER', 'HOLD'].includes(decision.action)) {
      throw new Error('Invalid action');
    }

    // CRITICAL: Validate reasoning length (minimum 200 characters)
    const reasoning = decision.reasoning || '';
    if (reasoning.length < 200) {
      console.error(`  ❌ REASONING TOO SHORT: ${reasoning.length} chars (minimum 200 required)`);
      console.error(`  📝 Reasoning: "${reasoning}"`);
      throw new Error(`Reasoning must be at least 200 characters (got ${reasoning.length}). Rejecting decision.`);
    }

    return {
      action: decision.action,
      symbol: decision.symbol,
      quantity: decision.quantity ? Math.floor(decision.quantity) : undefined,
      reasoning: reasoning,
      confidence: Math.max(0, Math.min(1, decision.confidence || 0.5)),
      riskAssessment: decision.riskAssessment,
      targetPrice: decision.targetPrice,
      stopLoss: decision.stopLoss,
      invalidationCondition: decision.invalidationCondition,
    };
  } catch (error) {
    console.error('  ⚠️  Failed to parse AI response, defaulting to HOLD:', error);
    return {
      action: 'HOLD',
      reasoning: 'Failed to parse AI response. Holding position for safety.',
      confidence: 0.1,
    };
  }
}

// getRandomDecision function REMOVED per user requirement: NO MOCK DATA
// All trading decisions must come from real AI APIs or explicit error states
