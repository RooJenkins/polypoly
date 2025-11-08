import { getAlpacaPositions } from '../lib/alpaca-broker';

async function checkPositions() {
  try {
    const positions = await getAlpacaPositions();

    console.log('📊 Current Positions\n');

    if (positions.length === 0) {
      console.log('No positions currently held.\n');
      return;
    }

    positions.forEach(pos => {
      console.log(`${pos.symbol}:`);
      console.log(`  Quantity: ${pos.qty}`);
      console.log(`  Avg Entry: $${pos.avg_entry_price.toFixed(2)}`);
      console.log(`  Current: $${pos.current_price.toFixed(2)}`);
      console.log(`  Market Value: $${pos.market_value.toFixed(2)}`);
      console.log(`  P&L: ${pos.unrealized_pl >= 0 ? '+' : ''}$${pos.unrealized_pl.toFixed(2)} (${pos.unrealized_plpc >= 0 ? '+' : ''}${(pos.unrealized_plpc * 100).toFixed(2)}%)`);
      console.log();
    });

    const totalValue = positions.reduce((sum, pos) => sum + pos.market_value, 0);
    const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealized_pl, 0);

    console.log(`Total Portfolio Value: $${totalValue.toFixed(2)}`);
    console.log(`Total Unrealized P&L: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}\n`);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPositions();
