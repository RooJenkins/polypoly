import cron from 'node-cron';
import { runTradingCycle } from '../lib/trading-engine';
import { isMarketOpen, getMarketStatus, formatDuration } from '../lib/realistic-execution';

async function startBot() {
  console.log('🤖 Sapyn AI Trading Bot Started');
  console.log('📅 Running every 30 minutes during market hours (9:25am-4pm ET)');
  console.log('⏰ Started at:', new Date().toLocaleString());
  console.log('💰 Estimated cost: $4-5/month');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check market status on startup
  const marketStatus = getMarketStatus();
  console.log(`📊 Market Status: ${marketStatus.isOpen ? '✅ OPEN' : '🔴 CLOSED'}`);
  if (!marketStatus.isOpen) {
    console.log(`⏰ Next market open: ${marketStatus.nextOpen.toLocaleString()}`);
    console.log(`⏳ Time until open: ${formatDuration(marketStatus.timeUntilOpen)}\n`);
  }

  // Run immediately if market is open
  if (marketStatus.isOpen) {
    console.log('🚀 Market is open - running initial trading cycle...\n');
    runTradingCycle().catch(console.error);
  } else {
    console.log('⏸️  Waiting for market to open...\n');
  }
}

// Start the bot
startBot().catch(console.error);

// Then run every 30 minutes (only during market hours)
// This reduces API costs by 90% while maintaining active trading
cron.schedule('*/30 * * * *', async () => {
  const now = new Date();
  console.log(`\n\n⏰ Scheduled run at ${now.toLocaleString()}`);

  // Check if market is open
  const marketOpen = isMarketOpen(now);
  console.log(`📊 Market Status: ${marketOpen ? '✅ OPEN' : '🔴 CLOSED'}`);

  if (!marketOpen) {
    const marketStatus = getMarketStatus();
    console.log(`⏸️  Skipping - market is closed`);
    console.log(`⏰ Next market open: ${marketStatus.nextOpen.toLocaleString()}`);
    console.log(`⏳ Time until open: ${formatDuration(marketStatus.timeUntilOpen)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return;
  }

  console.log('🚀 Running trading cycle...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    await runTradingCycle();
  } catch (error) {
    console.error('❌ Error in scheduled trading:', error);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down Sapyn Trading Bot...');
  console.log('👋 Goodbye!');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Shutting down Sapyn Trading Bot...');
  console.log('👋 Goodbye!');
  process.exit(0);
});

// Keep process alive
console.log('✅ Trading bot is running. Press Ctrl+C to stop.\n');
