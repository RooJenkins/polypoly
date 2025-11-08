/**
 * Manually run a trading cycle NOW
 */

import { runTradingCycle } from '../lib/trading-engine';

console.log('🚀 MANUALLY TRIGGERING TRADING CYCLE NOW');
console.log('='.repeat(60));

runTradingCycle()
  .then(() => {
    console.log('\n✅ Trading cycle completed successfully!');
    console.log('Check your dashboard - agents should have new decisions.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Trading cycle failed:', error);
    process.exit(1);
  });
