/**
 * Simulation Broker Implementation
 *
 * Implements the IBroker interface for simulated trading
 */

import type {
  IBroker,
  ExecutionResult,
  BrokerAccount,
  BrokerPosition
} from './types';
import { prisma } from '@/lib/prisma';
import { executeBuy as realisticBuy, executeSell as realisticSell } from '../realistic-execution';
import { fetchStockQuote } from '../stock-api';

export class SimulationBroker implements IBroker {
  public readonly name = 'Simulation';

  async executeBuy(symbol: string, quantity: number, agentId: string): Promise<ExecutionResult> {
    try {
      console.log(`🟢 [Simulation] Executing BUY: ${quantity} shares of ${symbol}`);

      // Get current market price
      const quote = await fetchStockQuote(symbol);
      const marketPrice = quote.price;

      // Use the existing realistic buy simulation
      return await realisticBuy(symbol, quantity, marketPrice);

    } catch (error: any) {
      console.error(`  ❌ Simulated buy failed:`, error.message);

      return {
        success: false,
        commission: 0,
        slippage: 0,
        error: error.message,
        executionTime: 0,
      };
    }
  }

  async executeSell(symbol: string, quantity: number, agentId: string): Promise<ExecutionResult> {
    try {
      console.log(`🟡 [Simulation] Executing SELL: ${quantity} shares of ${symbol}`);

      // Get current market price
      const quote = await fetchStockQuote(symbol);
      const marketPrice = quote.price;

      // Use the existing realistic sell simulation
      return await realisticSell(symbol, quantity, marketPrice);

    } catch (error: any) {
      console.error(`  ❌ Simulated sell failed:`, error.message);

      return {
        success: false,
        commission: 0,
        slippage: 0,
        error: error.message,
        executionTime: 0,
      };
    }
  }

  async getAccount(): Promise<BrokerAccount> {
    // Simulation broker gets data from database
    // This is handled by the trading engine, so we don't implement this here
    throw new Error('getAccount() should not be called on simulation broker - use database queries instead');
  }

  async isMarketOpen(): Promise<boolean> {
    try {
      // Check US market hours (NYSE)
      const now = new Date();
      const utcHours = now.getUTCHours();
      const utcMinutes = now.getUTCMinutes();
      const utcDay = now.getUTCDay();

      // Weekend check
      if (utcDay === 0 || utcDay === 6) {
        return false;
      }

      // NYSE hours: 9:30 AM - 4:00 PM ET (14:30 - 21:00 UTC)
      const currentMinutes = utcHours * 60 + utcMinutes;
      const marketOpen = 14 * 60 + 30; // 14:30 UTC
      const marketClose = 21 * 60; // 21:00 UTC

      return currentMinutes >= marketOpen && currentMinutes < marketClose;
    } catch (error: any) {
      console.error(`❌ [Simulation] Failed to check market status:`, error.message);
      return false;
    }
  }

  async cancelAllOrders(): Promise<void> {
    // Simulation doesn't have pending orders, so this is a no-op
    console.log(`🔄 [Simulation] No orders to cancel in simulation mode`);
  }
}

/**
 * Factory function to create simulation broker instance
 */
export function createSimulationBroker(): SimulationBroker {
  return new SimulationBroker();
}
