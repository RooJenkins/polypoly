import { runTradingCycle } from '../lib/trading-engine';

console.log('🚀 Forcing trading cycle...\n');
runTradingCycle()
  .then(() => {
    console.log('\n✅ Trading cycle complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
