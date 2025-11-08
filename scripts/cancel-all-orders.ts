import { cancelAllAlpacaOrders } from '../lib/alpaca-broker';

async function cancelOrders() {
  try {
    console.log('🛑 Cancelling all open orders...\n');
    await cancelAllAlpacaOrders();
    console.log('✅ All orders cancelled\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cancelOrders();
