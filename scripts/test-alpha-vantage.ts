/**
 * Test Alpha Vantage Direct API Tools
 */

import { get_quote, get_rsi, get_macd } from '../lib/alpha-vantage-tools.js';
import { mcpLogger } from '../lib/mcp-logger.js';
import { config } from 'dotenv';

config(); // Load .env

async function testAlphaVantage() {
  console.log('🧪 Testing Alpha Vantage Direct API Tools...\n');

  try {
    // Test 1: Get a stock quote
    console.log('📊 Test 1: Getting AAPL quote...');
    const quote = await get_quote('AAPL', 'test', 'Test');
    console.log('Result:', JSON.stringify(quote, null, 2));
    console.log('✅ Quote test passed!\n');

    //Wait 15 seconds to avoid rate limit
    console.log('⏳ Waiting 15 seconds to avoid rate limit...\n');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Test 2: Get RSI
    console.log('📈 Test 2: Getting AAPL RSI...');
    const rsi = await get_rsi('AAPL', 'daily', 14, 'test', 'Test');
    console.log('Result:', JSON.stringify(rsi, null, 2));
    console.log('✅ RSI test passed!\n');

    // Wait 15 seconds
    console.log('⏳ Waiting 15 seconds to avoid rate limit...\n');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Test 3: Get MACD
    console.log('📉 Test 3: Getting AAPL MACD...');
    const macd = await get_macd('AAPL', 'daily', 'test', 'Test');
    console.log('Result:', JSON.stringify(macd, null, 2));
    console.log('✅ MACD test passed!\n');

    // Print stats
    const usage = mcpLogger.getApiUsage();
    console.log('📊 API Usage:');
    console.log(`  API calls: ${usage.apiCalls}/${usage.limit}`);
    console.log(`  Cached calls: ${usage.cachedCalls}`);
    console.log(`  Total calls: ${usage.totalCalls}`);
    console.log(`  Cache hit rate: ${(usage.cachedCalls / usage.totalCalls * 100).toFixed(1)}%`);
    console.log();

    console.log('✅ All tests passed! Alpha Vantage API is working!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

testAlphaVantage();
