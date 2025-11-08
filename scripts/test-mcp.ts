/**
 * Test MCP Connection to Alpha Vantage
 */

import { getMCPClient, callMCPTool } from '../lib/mcp-client.js';
import { config } from 'dotenv';

config(); // Load .env

async function testMCP() {
  console.log('🧪 Testing MCP Connection to Alpha Vantage...\n');

  try {
    // Connect to MCP server
    const client = await getMCPClient();
    console.log('✅ MCP Client connected successfully!\n');

    // Test 1: Get a stock quote
    console.log('📊 Test 1: Getting AAPL quote...');
    const quote = await callMCPTool('get_quote', { symbol: 'AAPL' }, 'test', 'Test');
    console.log('Result:', JSON.stringify(quote, null, 2));
    console.log();

    // Test 2: Get RSI
    console.log('📈 Test 2: Getting AAPL RSI...');
    const rsi = await callMCPTool('get_rsi', { symbol: 'AAPL', interval: 'daily' }, 'test', 'Test');
    console.log('Result:', JSON.stringify(rsi, null, 2));
    console.log();

    // Test 3: Check cache (should be cached now)
    console.log('💾 Test 3: Getting AAPL quote again (should be cached)...');
    const cachedQuote = await callMCPTool('get_quote', { symbol: 'AAPL' }, 'test', 'Test');
    console.log('Result:', JSON.stringify(cachedQuote, null, 2));
    console.log();

    // Print stats
    const stats = client.getStats();
    console.log('📊 Stats:');
    console.log(`  Cache hits: ${stats.cache.hits}`);
    console.log(`  Cache misses: ${stats.cache.misses}`);
    console.log(`  Cache hit rate: ${(stats.cache.hitRate * 100).toFixed(1)}%`);
    console.log(`  API calls today: ${stats.api.apiCalls}/${stats.api.limit}`);
    console.log();

    console.log('✅ All tests passed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testMCP();
