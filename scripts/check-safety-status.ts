import { getSafetyStatus } from '../lib/safety-limits';

async function checkSafety() {
  try {
    console.log('🛡️  System Safety Status\n');

    const status = await getSafetyStatus();

    // System overview
    console.log(`📊 System Status: ${status.systemStatus === 'ok' ? '✅ OK' : status.systemStatus === 'warning' ? '⚠️  WARNING' : '🛑 HALTED'}`);
    console.log(`💰 Total Daily P&L: ${status.totalDailyPnL >= 0 ? '+' : ''}$${status.totalDailyPnL.toFixed(2)}`);
    console.log(`❌ Recent API Errors: ${status.recentErrors}\n`);

    // Agent statuses
    console.log('👥 Agent Statuses:\n');
    status.agentStatuses.forEach(agent => {
      const statusIcon = agent.status === 'ok' ? '✅' : agent.status === 'warning' ? '⚠️' : '🛑';
      console.log(`${statusIcon} ${agent.agentName}:`);
      console.log(`   Daily P&L: ${agent.dailyPnL >= 0 ? '+' : ''}$${agent.dailyPnL.toFixed(2)}`);
      console.log(`   Account Value: $${agent.accountValue.toFixed(2)}`);
      console.log(`   Day Trades (5d): ${agent.dayTradeCount}/3`);
      console.log();
    });

    // Warnings
    if (status.systemStatus === 'halted') {
      console.error('🚨 CRITICAL: System trading is HALTED!');
      console.error('   Manual intervention required.\n');
    } else if (status.systemStatus === 'warning') {
      console.warn('⚠️  WARNING: System is approaching safety limits.\n');
    } else {
      console.log('✅ All systems operating normally.\n');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSafety();
