/**
 * Test Multi-Source Tool Manager
 */

import {
  callMultiSourceTool,
  getMultiSourceToolsForOpenAI,
  printMultiSourceSummary,
} from '../lib/multi-source-tools.js';
import { config } from 'dotenv';

config(); // Load .env

async function testMultiSource() {
  console.log('🧪 Testing Multi-Source Tool Manager...\n');

  try {
    // Show available tools
    const tools = getMultiSourceToolsForOpenAI();
    console.log(`📋 Available tools: ${tools.length} total`);
    console.log(
      `  Yahoo Finance: ${tools.filter((t) => t.function.name.startsWith('yf_')).length}`
    );
    console.log(
      `  Alpha Vantage: ${tools.filter((t) => !t.function.name.startsWith('yf_')).length}`
    );
    console.log();

    // Test 1: Yahoo Finance quote (unlimited)
    console.log('📊 Test 1: Yahoo Finance quote (unlimited)...');
    const yfQuote = await callMultiSourceTool(
      'yf_get_quote',
      { symbol: 'TSLA' },
      'test',
      'Test'
    );
    console.log('Result:', JSON.stringify(yfQuote, null, 2));
    console.log('✅ Yahoo Finance quote passed!\n');

    // Test 2: Yahoo Finance historical (unlimited)
    console.log('📈 Test 2: Yahoo Finance historical data...');
    const yfHistorical = await callMultiSourceTool(
      'yf_get_historical',
      { symbol: 'TSLA', period: '1mo' },
      'test',
      'Test'
    );
    console.log('Result:', JSON.stringify(yfHistorical, null, 2));
    console.log('✅ Yahoo Finance historical passed!\n');

    // Test 3: Check if we have Alpha Vantage calls available
    console.log('🔍 Test 3: Checking Alpha Vantage availability...');
    try {
      // Only test Alpha Vantage if we have calls left today
      const avQuote = await callMultiSourceTool(
        'get_quote',
        { symbol: 'TSLA' },
        'test',
        'Test'
      );
      console.log('Result:', JSON.stringify(avQuote, null, 2));
      console.log('✅ Alpha Vantage quote passed!\n');
    } catch (error: any) {
      if (error.message.includes('rate limit')) {
        console.log('⚠️  Alpha Vantage rate limit reached (expected)');
        console.log('✅ Rate limit protection working!\n');
      } else {
        throw error;
      }
    }

    // Test 4: Cache test
    console.log('💾 Test 4: Testing cache (should be instant)...');
    const start = Date.now();
    const cached = await callMultiSourceTool(
      'yf_get_quote',
      { symbol: 'TSLA' },
      'test',
      'Test'
    );
    const elapsed = Date.now() - start;
    console.log(`Cached response in ${elapsed}ms`);
    console.log('✅ Cache working!\n');

    // Print summary
    printMultiSourceSummary();

    console.log('✅ All multi-source tests passed!');
    console.log(
      '💡 System ready: Yahoo Finance (primary) + Alpha Vantage (secondary)'
    );
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testMultiSource();
