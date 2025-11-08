/**
 * Broker Factory
 *
 * Creates the appropriate broker instance based on broker type
 */

import type { IBroker, BrokerType } from './types';
import { AlpacaBroker, createAlpacaBroker } from './alpaca-broker';
import { SimulationBroker, createSimulationBroker } from './simulation-broker';
import { TradierBroker, createTradierBroker } from './tradier-broker';
import { SchwabBroker, createSchwabBroker } from './schwab-broker';
import { InteractiveBrokersBroker, createInteractiveBrokersBroker } from './interactive-brokers-broker';
import { WebullBroker, createWebullBroker } from './webull-broker';

// Cache broker instances to avoid recreating them
const brokerCache = new Map<BrokerType, IBroker>();

/**
 * Get broker instance for a given broker type
 * @param brokerType - The type of broker to create
 * @param agentName - Optional agent name for multi-account brokers (e.g., Alpaca)
 */
export function getBroker(brokerType: BrokerType, agentName?: string): IBroker {
  // For Alpaca, we need agent-specific instances (no caching)
  // Each agent has their own Alpaca paper account
  if (brokerType === 'alpaca' && agentName) {
    return createAlpacaBroker(agentName);
  }

  // Check cache first for other brokers
  if (brokerCache.has(brokerType)) {
    return brokerCache.get(brokerType)!;
  }

  // Create new instance
  let broker: IBroker;

  switch (brokerType) {
    case 'alpaca':
      broker = createAlpacaBroker(agentName);
      break;

    case 'tradier':
      broker = createTradierBroker();
      break;

    case 'schwab':
      broker = createSchwabBroker();
      break;

    case 'interactive-brokers':
      broker = createInteractiveBrokersBroker();
      break;

    case 'webull':
      broker = createWebullBroker();
      break;

    case 'simulation':
      broker = createSimulationBroker();
      break;

    default:
      throw new Error(`Unknown broker type: ${brokerType}`);
  }

  // Cache and return (but not for Alpaca with specific agent names)
  if (brokerType !== 'alpaca' || !agentName) {
    brokerCache.set(brokerType, broker);
  }
  return broker;
}

/**
 * Clear the broker cache (useful for testing or config changes)
 */
export function clearBrokerCache(): void {
  brokerCache.clear();
}

/**
 * Get all available broker types
 */
export function getAvailableBrokers(): BrokerType[] {
  return ['alpaca', 'tradier', 'schwab', 'interactive-brokers', 'webull', 'simulation'];
}

/**
 * Get broker types that will be available after implementation
 */
export function getComingSoonBrokers(): BrokerType[] {
  return [];
}

/**
 * Check if a broker type is currently available
 */
export function isBrokerAvailable(brokerType: BrokerType): boolean {
  return getAvailableBrokers().includes(brokerType);
}

/**
 * Get broker display name
 */
export function getBrokerDisplayName(brokerType: BrokerType): string {
  const names: Record<BrokerType, string> = {
    'alpaca': 'Alpaca Markets',
    'tradier': 'Tradier',
    'webull': 'Webull',
    'schwab': 'Charles Schwab',
    'interactive-brokers': 'Interactive Brokers',
    'simulation': 'Simulation',
  };

  return names[brokerType] || brokerType;
}
