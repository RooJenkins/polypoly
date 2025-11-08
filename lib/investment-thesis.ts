/**
 * POLYPOLY - Investment Thesis Module
 *
 * Generates daily investment thesis for AI agents
 * AIs analyze all markets and create macro-level investment strategies
 *
 * NO MOCK DATA - All inputs are real market data
 */

import { scanAllMarkets, MarketScanResult, getAllInstruments } from './market-scanner';
import { getMacroIndicators, MacroIndicators } from './data-sources';
import { getMarketContext, MarketContext } from './market-context';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface InvestmentThesis {
  agentId: number;
  agentName: string;
  agentModel: string;
  thesisType: 'daily' | 'cycle_update';

  // Macro view
  macroView: string;
  marketRegime: 'risk_on' | 'risk_off' | 'neutral' | 'crisis';

  // Asset allocation (percentages must sum to 100)
  targetAllocation: {
    stocks?: number;
    crypto?: number;
    commodities?: number;
    bonds?: number;
    forex?: number;
    REITs?: number;
    cash?: number;
  };

  reasoning: string;

  keyMetrics: {
    vix?: number;
    spyTrend?: string;
    dollarIndex?: number;
    inflation?: number;
    cryptoMomentum?: number;
    goldPrice?: number;
    [key: string]: any;
  };

  confidence: number; // 0-100
  thesisChangeReasons: string[];

  timestamp: Date;
}

/**
 * Generate daily investment thesis for an AI agent
 * This runs once per day at market open
 */
export async function generateDailyThesis(
  agentId: number,
  agentName: string,
  agentModel: string
): Promise<InvestmentThesis> {
  console.log('');
  console.log('='.repeat(80));
  console.log(`📝 GENERATING DAILY INVESTMENT THESIS FOR: ${agentName}`);
  console.log(`   Model: ${agentModel}`);
  console.log(`   Time: ${new Date().toLocaleString()}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Scan all markets (REAL DATA)
    console.log('1️⃣  Scanning all markets...');
    const marketScan = await scanAllMarkets();

    // 2. Get macro context (REAL DATA)
    console.log('2️⃣  Fetching macro indicators...');
    const macroIndicators = await getMacroIndicators().catch(() => null);

    // 3. Get market context (SPY, VIX, sectors)
    console.log('3️⃣  Analyzing market context...');
    const allInstruments = getAllInstruments(marketScan);
    const marketContext = await getMarketContext(allInstruments as any, [] as any).catch(() => null);

    // 4. Build comprehensive market summary for AI
    const marketSummary = buildMarketSummary(marketScan, macroIndicators, marketContext);

    console.log('4️⃣  Calling AI model to generate thesis...');

    // 5. Generate prompt for AI
    const prompt = buildThesisPrompt(agentName, marketSummary, marketScan);

    // 6. Call AI model
    const aiResponse = await callAIForThesis(agentModel, prompt);

    // 7. Parse and validate response
    const thesisData = parseThesisResponse(aiResponse);

    // 8. Construct final thesis object
    const thesis: InvestmentThesis = {
      agentId,
      agentName,
      agentModel,
      thesisType: 'daily',
      macroView: thesisData.macroView,
      marketRegime: thesisData.marketRegime,
      targetAllocation: thesisData.targetAllocation,
      reasoning: thesisData.reasoning,
      keyMetrics: {
        vix: marketContext?.vix?.level,
        spyTrend: marketContext?.spyTrend?.regime,
        inflation: macroIndicators?.inflationRate,
        ...thesisData.keyMetrics,
      },
      confidence: thesisData.confidence,
      thesisChangeReasons: [],
      timestamp: new Date(),
    };

    console.log('');
    console.log('✅ THESIS GENERATED SUCCESSFULLY');
    console.log(`   Market Regime: ${thesis.marketRegime.toUpperCase()}`);
    console.log(`   Confidence: ${thesis.confidence}%`);
    console.log(`   Target Allocation:`);
    Object.entries(thesis.targetAllocation).forEach(([asset, percent]) => {
      console.log(`      ${asset}: ${percent}%`);
    });
    console.log('');
    console.log('='.repeat(80));
    console.log('');

    return thesis;
  } catch (error: any) {
    console.error('❌ Error generating daily thesis:', error.message);
    throw error;
  }
}

/**
 * Update existing thesis based on new market data
 * This runs every trading cycle (30 minutes)
 */
export async function updateThesis(
  currentThesis: InvestmentThesis,
  marketScan: MarketScanResult[],
  recentTrades: any[]
): Promise<InvestmentThesis> {
  console.log(`🔄 Updating thesis for ${currentThesis.agentName}...`);

  try {
    // Build update prompt focusing on "what changed?"
    const updatePrompt = buildUpdatePrompt(currentThesis, marketScan, recentTrades);

    // Call AI
    const aiResponse = await callAIForThesis(currentThesis.agentModel, updatePrompt);
    const updateData = parseThesisResponse(aiResponse);

    // Check if allocation changed significantly
    const allocationChanged = hasSignificantAllocationChange(
      currentThesis.targetAllocation,
      updateData.targetAllocation
    );

    if (allocationChanged) {
      console.log('   ⚠️  Significant allocation change detected!');
      updateData.thesisChangeReasons = identifyAllocationChanges(
        currentThesis.targetAllocation,
        updateData.targetAllocation
      );
    }

    // Create updated thesis
    const updatedThesis: InvestmentThesis = {
      ...currentThesis,
      thesisType: 'cycle_update',
      macroView: updateData.macroView || currentThesis.macroView,
      marketRegime: updateData.marketRegime || currentThesis.marketRegime,
      targetAllocation: updateData.targetAllocation || currentThesis.targetAllocation,
      reasoning: updateData.reasoning || currentThesis.reasoning,
      confidence: updateData.confidence || currentThesis.confidence,
      thesisChangeReasons: updateData.thesisChangeReasons || [],
      timestamp: new Date(),
    };

    console.log(`✅ Thesis updated (confidence: ${updatedThesis.confidence}%)`);

    return updatedThesis;
  } catch (error: any) {
    console.error('❌ Error updating thesis:', error.message);
    // Return current thesis if update fails
    return currentThesis;
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function buildMarketSummary(
  marketScan: MarketScanResult[],
  macro: MacroIndicators | null,
  context: MarketContext | null
): string {
  let summary = '📊 COMPREHENSIVE MARKET ANALYSIS (REAL DATA):\n\n';

  // Market scan results
  summary += 'ASSET CLASS PERFORMANCE:\n';
  marketScan.forEach(scan => {
    summary += `\n${scan.assetClass.toUpperCase()}:\n`;
    summary += `  Performance: ${scan.performance1d.toFixed(2)}%\n`;
    summary += `  Regime: ${scan.regime.toUpperCase()}\n`;
    summary += `  Strength: ${scan.strength}/10\n`;
    summary += `  Top Performer: ${scan.topPerformer?.symbol} (+${scan.topPerformer?.performance.toFixed(2)}%)\n`;
    summary += `  Worst Performer: ${scan.worstPerformer?.symbol} (${scan.worstPerformer?.performance.toFixed(2)}%)\n`;
    summary += `  Instruments Tracked: ${scan.instrumentCount}\n`;
  });

  // Macro indicators
  if (macro) {
    summary += '\nMACRO INDICATORS:\n';
    summary += `  GDP Growth: ${macro.gdpGrowth}%\n`;
    summary += `  Unemployment: ${macro.unemploymentRate}%\n`;
    summary += `  Inflation: ${macro.inflationRate}%\n`;
    summary += `  Interest Rate: ${macro.interestRate}%\n`;
    summary += `  Economic Regime: ${macro.economicRegime}\n`;
    summary += `  Market Sentiment: ${macro.marketSentiment}\n`;
  }

  // Market context (SPY, VIX)
  if (context) {
    summary += '\nMARKET CONTEXT:\n';
    if (context.spyTrend) {
      summary += `  SPY Trend: ${context.spyTrend.regime} (price: $${context.spyTrend.price.toFixed(2)})\n`;
      summary += `  SPY Week Change: ${context.spyTrend.weekChange.toFixed(2)}%\n`;
    }
    if (context.vix) {
      summary += `  VIX: ${context.vix.level.toFixed(2)} (${context.vix.interpretation})\n`;
      summary += `  VIX Signal: ${context.vix.signal}\n`;
    }
  }

  return summary;
}

function buildThesisPrompt(
  agentName: string,
  marketSummary: string,
  marketScan: MarketScanResult[]
): string {
  return `You are ${agentName}, an AI macro investor managing a $10,000 portfolio.

You can invest across multiple asset classes: stocks, crypto, commodities, bonds, forex, REITs, and cash.

${marketSummary}

YOUR TASK:
Generate your daily investment thesis. Analyze all markets and decide your asset allocation strategy.

IMPORTANT RULES:
1. Target allocation percentages must sum to exactly 100%
2. Consider market regime (risk-on favors crypto/stocks, risk-off favors bonds/gold/cash)
3. Diversify across multiple asset classes (don't put everything in one)
4. Be specific about WHY you're bullish/bearish on each asset class
5. Your confidence should reflect market clarity (high VIX = lower confidence)

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "macroView": "2-3 sentence summary of your economic outlook",
  "marketRegime": "risk_on|risk_off|neutral|crisis",
  "targetAllocation": {
    "stocks": 30,
    "crypto": 25,
    "commodities": 15,
    "bonds": 20,
    "cash": 10
  },
  "reasoning": "3-4 sentences explaining WHY this allocation makes sense given current conditions",
  "keyMetrics": {
    "watchingVIX": true,
    "cryptoMomentum": 15,
    "goldBreakout": true
  },
  "confidence": 75
}`;
}

function buildUpdatePrompt(
  currentThesis: InvestmentThesis,
  marketScan: MarketScanResult[],
  recentTrades: any[]
): string {
  return `You are ${currentThesis.agentName}, updating your investment thesis.

CURRENT THESIS (from this morning):
- Market Regime: ${currentThesis.marketRegime}
- Target Allocation: ${JSON.stringify(currentThesis.targetAllocation)}
- Reasoning: ${currentThesis.reasoning}
- Confidence: ${currentThesis.confidence}%

NEW MARKET DATA (last 30 minutes):
${marketScan.map(scan => `
${scan.assetClass}: ${scan.performance1d.toFixed(2)}% (${scan.regime})
Top: ${scan.topPerformer?.symbol} (+${scan.topPerformer?.performance.toFixed(2)}%)
`).join('\n')}

RECENT TRADES:
${recentTrades.length > 0 ? recentTrades.map(t => `${t.action} ${t.symbol} @ $${t.price}`).join('\n') : 'No recent trades'}

QUESTION: Should you update your thesis based on new data?

Respond with JSON:
{
  "macroView": "updated view or same as before",
  "marketRegime": "risk_on|risk_off|neutral|crisis",
  "targetAllocation": {...},
  "reasoning": "why you're keeping or changing allocation",
  "confidence": 75,
  "thesisChangeReasons": ["reason 1", "reason 2"] or []
}`;
}

function parseThesisResponse(aiResponse: string): any {
  try {
    // Remove markdown code blocks if present
    let cleanedResponse = aiResponse.trim();
    cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
    cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
    cleanedResponse = cleanedResponse.trim();

    const parsed = JSON.parse(cleanedResponse);

    // Validate allocation sums to ~100
    const allocation = parsed.targetAllocation || {};
    const total = Object.values(allocation).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);

    if (Math.abs(total - 100) > 1) {
      console.warn(`⚠️  Allocation sums to ${total}%, normalizing to 100%`);
      // Normalize
      Object.keys(allocation).forEach(key => {
        allocation[key] = Math.round((allocation[key] / total) * 100);
      });
    }

    return parsed;
  } catch (error: any) {
    console.error('❌ Error parsing AI response:', error.message);
    console.error('   Response was:', aiResponse);
    throw new Error(`Failed to parse AI thesis response: ${error.message}`);
  }
}

function hasSignificantAllocationChange(
  current: Record<string, number>,
  updated: Record<string, number>
): boolean {
  // Check if any asset class changed by more than 10%
  const allAssets = new Set([...Object.keys(current), ...Object.keys(updated)]);

  for (const asset of allAssets) {
    const currentVal = current[asset] || 0;
    const updatedVal = updated[asset] || 0;
    const diff = Math.abs(updatedVal - currentVal);

    if (diff > 10) {
      return true;
    }
  }

  return false;
}

function identifyAllocationChanges(
  current: Record<string, number>,
  updated: Record<string, number>
): string[] {
  const changes: string[] = [];
  const allAssets = new Set([...Object.keys(current), ...Object.keys(updated)]);

  for (const asset of allAssets) {
    const currentVal = current[asset] || 0;
    const updatedVal = updated[asset] || 0;
    const diff = updatedVal - currentVal;

    if (Math.abs(diff) > 5) {
      if (diff > 0) {
        changes.push(`Increased ${asset} from ${currentVal}% to ${updatedVal}% (+${diff}%)`);
      } else {
        changes.push(`Decreased ${asset} from ${currentVal}% to ${updatedVal}% (${diff}%)`);
      }
    }
  }

  return changes;
}

// =====================================================
// AI MODEL CALLING
// =====================================================

async function callAIForThesis(model: string, prompt: string): Promise<string> {
  try {
    // Determine which AI service to use based on model name
    if (model.includes('gpt') || model.includes('openai')) {
      return await callOpenAI(model, prompt);
    } else if (model.includes('claude')) {
      return await callClaude(model, prompt);
    } else if (model.includes('gemini')) {
      return await callGemini(model, prompt);
    } else {
      // Default to OpenAI
      return await callOpenAI('gpt-4o-mini', prompt);
    }
  } catch (error: any) {
    console.error(`❌ Error calling AI model ${model}:`, error.message);
    throw error;
  }
}

async function callOpenAI(model: string, prompt: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: model.includes('gpt-4o') ? 'gpt-4o-mini' : 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a professional macro investor. Respond only with valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content || '{}';
}

async function callClaude(model: string, prompt: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  return content.type === 'text' ? content.text : '{}';
}

async function callGemini(model: string, prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
  const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const result = await geminiModel.generateContent(prompt);
  return result.response.text();
}
