import { getAlpacaAccount, isAlpacaMarketOpen } from '../lib/alpaca-broker';

async function testConnection() {
  console.log('🔌 Testing Alpaca API connection...\n');

  try {
    // Test connection by getting account
    const account = await getAlpacaAccount();

    console.log('✅ Connected to Alpaca successfully!\n');
    console.log(`📊 Account Status (${process.env.ALPACA_PAPER_TRADING !== 'false' ? 'PAPER' : 'LIVE'} mode):\n`);
    console.log(`   Account ID: ${account.id}`);
    console.log(`   Status: ${account.status}`);
    console.log(`   Cash: $${account.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Buying Power: $${account.buying_power.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Portfolio Value: $${account.portfolio_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Equity: $${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Day Trade Count: ${account.daytrade_count}`);
    console.log(`   Pattern Day Trader: ${account.pattern_day_trader ? '⚠️ YES' : '✅ NO'}\n`);

    // Check market status
    const marketOpen = await isAlpacaMarketOpen();
    console.log(`📈 Market Status: ${marketOpen ? '🟢 OPEN' : '🔴 CLOSED'}\n`);

    console.log('✅ All tests passed! You\'re ready to trade.\n');
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check that ALPACA_API_KEY and ALPACA_SECRET_KEY are set in .env');
    console.error('   2. Verify your keys are correct (paper keys start with "PK", live keys with "AK")');
    console.error('   3. Make sure ALPACA_PAPER_TRADING matches your key type\n');
    process.exit(1);
  }
}

testConnection();
