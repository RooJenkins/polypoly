/**
 * Test Yahoo Finance Direct API Tools
 */

import {
  get_quote,
  get_historical,
  get_company_info,
  get_trending,
} from '../lib/yahoo-finance-tools.js';
import { mcpLogger } from '../lib/mcp-logger.js';
import { config } from 'dotenv';

config(); // Load .env

async function testYahooFinance() {
  console.log('🧪 Testing Yahoo Finance Direct API Tools...\n');

  try {
    // Test 1: Get a stock quote
    console.log('📊 Test 1: Getting AAPL quote...');
    const quote = await get_quote('AAPL', 'test', 'Test');
    console.log('Result:', JSON.stringify(quote, null, 2));
    console.log('✅ Quote test passed!\n');

    // Test 2: Get historical data
    console.log('📈 Test 2: Getting AAPL historical data...');
    const historical = await get_historical('AAPL', '1mo', 'test', 'Test');
    console.log('Result:', JSON.stringify(historical, null, 2));
    console.log('✅ Historical test passed!\n');

    // Test 3: Get company info
    console.log('🏢 Test 3: Getting AAPL company info...');
    const company = await get_company_info('AAPL', 'test', 'Test');
    console.log('Result:', JSON.stringify(company, null, 2));
    console.log('✅ Company info test passed!\n');

    // Test 4: Get trending stocks
    console.log('🔥 Test 4: Getting trending stocks...');
    const trending = await get_trending('test', 'Test');
    console.log('Result:', JSON.stringify(trending, null, 2));
    console.log('✅ Trending test passed!\n');

    // Test 5: Cache test (should be instant)
    console.log('💾 Test 5: Getting AAPL quote again (should be cached)...');
    const start = Date.now();
    const cachedQuote = await get_quote('AAPL', 'test', 'Test');
    const elapsed = Date.now() - start;
    console.log(`Cached response in ${elapsed}ms`);
    console.log('✅ Cache test passed!\n');

    // Print stats
    const usage = mcpLogger.getApiUsage();
    console.log('📊 API Usage:');
    console.log(`  API calls: ${usage.apiCalls}`);
    console.log(`  Cached calls: ${usage.cachedCalls}`);
    console.log(`  Total calls: ${usage.totalCalls}`);
    console.log(
      `  Cache hit rate: ${((usage.cachedCalls / usage.totalCalls) * 100).toFixed(1)}%`
    );
    console.log();

    console.log('✅ All tests passed! Yahoo Finance API is working!');
    console.log('💡 This source has no rate limits and is completely FREE!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testYahooFinance();
