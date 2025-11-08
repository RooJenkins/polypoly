/**
 * Liquidate all positions in Alpaca account
 */

import Alpaca from '@alpacahq/alpaca-trade-api';

async function liquidateAll() {
  const keyId = process.env.ALPACA_API_KEY;
  const secretKey = process.env.ALPACA_SECRET_KEY;
  const paper = process.env.ALPACA_PAPER_TRADING !== 'false';

  if (!keyId || !secretKey) {
    throw new Error('ALPACA_API_KEY and ALPACA_SECRET_KEY must be set');
  }

  const alpaca = new Alpaca({
    keyId,
    secretKey,
    paper,
  });

  console.log('🔄 Liquidating all positions...');

  // Get all positions
  const positions = await alpaca.getPositions();
  console.log(`📊 Found ${positions.length} positions to liquidate`);

  // Close all positions
  for (const position of positions) {
    console.log(`  Closing ${position.qty} shares of ${position.symbol}...`);

    try {
      await alpaca.closePosition(position.symbol);
      console.log(`  ✅ Closed ${position.symbol}`);
    } catch (error: any) {
      console.error(`  ❌ Failed to close ${position.symbol}:`, error.message);
    }
  }

  // Wait a moment for orders to process
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verify all positions are closed
  const remainingPositions = await alpaca.getPositions();
  console.log(`\n📊 Remaining positions: ${remainingPositions.length}`);

  // Get final account balance
  const account = await alpaca.getAccount();
  console.log(`\n💰 Final account value: $${parseFloat(account.portfolio_value).toFixed(2)}`);
  console.log(`💵 Cash balance: $${parseFloat(account.cash).toFixed(2)}`);
}

liquidateAll().catch(console.error);
