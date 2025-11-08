import { getAlpacaAccount } from '../lib/alpaca-broker';

async function checkAccount() {
  try {
    const account = await getAlpacaAccount();
    console.log('📊 Alpaca Account Information\n');
    console.log(JSON.stringify(account, null, 2));
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAccount();
