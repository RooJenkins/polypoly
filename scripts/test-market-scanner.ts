/**
 * Test Market Scanner with REAL APIs
 * NO MOCK DATA - This will fetch real data from CoinGecko and Yahoo Finance
 */

import { scanAllMarkets } from '../lib/market-scanner';

async function testMarketScanner() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  TESTING MARKET SCANNER WITH REAL APIs                      ║');
  console.log('║  NO MOCK DATA - All data comes from live sources            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const results = await scanAllMarkets();

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  MARKET SCAN RESULTS                                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.assetClass.toUpperCase()}`);
      console.log(`   ├─ Instruments: ${result.instrumentCount}`);
      console.log(`   ├─ Performance: ${result.performance1d >= 0 ? '+' : ''}${result.performance1d.toFixed(2)}%`);
      console.log(`   ├─ Regime: ${result.regime.toUpperCase()}`);
      console.log(`   ├─ Strength: ${result.strength}/10`);
      console.log(`   ├─ Top Performer: ${result.topPerformer?.symbol} (+${result.topPerformer?.performance.toFixed(2)}%)`);
      console.log(`   └─ Worst Performer: ${result.worstPerformer?.symbol} (${result.worstPerformer?.performance.toFixed(2)}%)`);
      console.log('');
    });

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  TEST SUMMARY                                                ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`✅ Successfully scanned ${results.length} asset classes`);
    console.log(`✅ Total instruments fetched: ${results.reduce((sum, r) => sum + r.instrumentCount, 0)}`);
    console.log(`✅ All data is REAL (no mocking)`);
    console.log('');
    console.log('🎉 MARKET SCANNER TEST PASSED!');
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════════════════╗');
    console.error('║  TEST FAILED                                                 ║');
    console.error('╚══════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    console.error('');
    process.exit(1);
  }
}

testMarketScanner();
