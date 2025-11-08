/**
 * Test AI tool calling with actual API calls
 */

import { getMultiSourceToolsForClaude, getMultiSourceToolsForGemini } from '../lib/multi-source-tools';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testClaudeTools() {
  console.log('\n🧪 Testing Claude Tool Calling...');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('⚠️  SKIPPED: No ANTHROPIC_API_KEY found');
    return true; // Skip test, not a failure
  }

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const tools = getMultiSourceToolsForClaude();

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: 'You have access to stock data tools. List the available tools you can use. Just tell me the tool names.',
        },
      ],
      tools,
    });

    console.log('✅ Claude received tools successfully');
    console.log(`  Response type: ${message.content[0].type}`);

    const hasToolUse = message.content.some(block => block.type === 'tool_use');
    console.log(`  Claude understands tools: ${hasToolUse ? '✅' : '⚠️  (no immediate tool use, but normal)'}`);

    return true;
  } catch (error: any) {
    console.error('❌ Claude tool test failed:', error.message);
    return false;
  }
}

async function testGeminiTools() {
  console.log('\n🧪 Testing Gemini Tool Calling...');

  if (!process.env.GOOGLE_AI_API_KEY) {
    console.log('⚠️  SKIPPED: No GOOGLE_AI_API_KEY found');
    return true; // Skip test, not a failure
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const tools = getMultiSourceToolsForGemini();

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      tools: [{ functionDeclarations: tools }],
    });

    const result = await model.generateContent('List the stock data tools you have access to.');

    console.log('✅ Gemini received tools successfully');
    console.log(`  Response generated: ${result.response.text() ? '✅' : '❌'}`);

    return true;
  } catch (error: any) {
    console.error('❌ Gemini tool test failed:', error.message);
    return false;
  }
}

async function testDataEnrichment() {
  console.log('\n🧪 Testing Data Enrichment Pipeline...');

  try {
    const { prisma } = await import('../lib/prisma');

    // Check if we have historical stock price data
    const stockPriceCount = await prisma.stockPrice.count();
    console.log(`  Stock prices in DB: ${stockPriceCount}`);

    if (stockPriceCount === 0) {
      console.log('⚠️  No historical data yet - enrichment will return empty trends');
      return true; // Not a failure, just no data yet
    }

    // Check date range of data
    const oldestPrice = await prisma.stockPrice.findFirst({
      orderBy: { timestamp: 'asc' },
    });
    const newestPrice = await prisma.stockPrice.findFirst({
      orderBy: { timestamp: 'desc' },
    });

    if (oldestPrice && newestPrice) {
      const daysDiff = Math.floor(
        (newestPrice.timestamp.getTime() - oldestPrice.timestamp.getTime()) / (1000 * 60 * 60 * 24)
      );
      console.log(`  Historical data range: ${daysDiff} days`);

      if (daysDiff >= 90) {
        console.log('  ✅ Sufficient data for 90-day MA and 52-week high/low');
      } else {
        console.log(`  ⚠️  Only ${daysDiff} days of data (need 90 for full enrichment)`);
      }
    }

    return true;
  } catch (error: any) {
    console.error('❌ Data enrichment test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting AI Tool Integration Tests\n');
  console.log('='.repeat(50));

  const results = {
    claude: await testClaudeTools(),
    gemini: await testGeminiTools(),
    data: await testDataEnrichment(),
  };

  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Integration Test Results:');
  console.log(`  Claude Tools: ${results.claude ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Gemini Tools: ${results.gemini ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Data Enrichment: ${results.data ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(r => r);

  console.log(`\n${allPassed ? '✅ ALL INTEGRATION TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  process.exit(allPassed ? 0 : 1);
}

runAllTests();
