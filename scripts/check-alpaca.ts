import Alpaca from '@alpacahq/alpaca-trade-api';

async function check() {
  const alpaca = new Alpaca({
    keyId: process.env.ALPACA_API_KEY!,
    secretKey: process.env.ALPACA_SECRET_KEY!,
    paper: true
  });

  const account = await alpaca.getAccount();
  const positions = await alpaca.getPositions();
  // @ts-ignore - Alpaca SDK type issue
  const orders = await alpaca.getOrders({ status: 'open' });

  console.log('💰 Account Value:', parseFloat(account.portfolio_value).toFixed(2));
  console.log('💵 Cash:', parseFloat(account.cash).toFixed(2));
  console.log('📊 Positions:', positions.length);
  console.log('📋 Open Orders:', orders.length);

  if (positions.length > 0) {
    console.log('\nPositions:');
    positions.forEach((p: any) => {
      console.log(`  ${p.symbol}: ${p.qty} shares @ $${p.avg_entry_price}`);
    });
  }
}

check();
