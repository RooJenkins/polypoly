/**
 * MCP Cache Module
 *
 * Caches tool call results to reduce API usage and stay within Alpha Vantage's 25 req/day free tier limit.
 * Cache TTL (Time To Live) is configurable and can be extended dynamically under high load.
 * Default: 1 hour cache to maximize efficiency with limited API calls.
 */

interface CacheEntry {
  result: any;
  timestamp: number;
  toolName: string;
  args: any;
}

export class MCPCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttlMs: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(ttlSeconds: number = 3600) {
    // Default: 1 hour cache to work within 25 API calls/day limit
    this.ttlMs = ttlSeconds * 1000;
  }

  /**
   * Generate cache key from tool name and arguments
   */
  private getCacheKey(toolName: string, args: any): string {
    const argsStr = JSON.stringify(args || {}, Object.keys(args || {}).sort());
    return `${toolName}:${argsStr}`;
  }

  /**
   * Get cached result if available and not expired
   */
  get(toolName: string, args: any): any | null {
    const key = this.getCacheKey(toolName, args);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > this.ttlMs) {
      // Expired
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.result;
  }

  /**
   * Store result in cache
   */
  set(toolName: string, args: any, result: any): void {
    const key = this.getCacheKey(toolName, args);
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      toolName,
      args,
    });
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Clear expired entries (cleanup)
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Extend TTL dynamically (useful under high load)
   */
  setTTL(seconds: number): void {
    this.ttlMs = seconds * 1000;
  }

  /**
   * Get current TTL in seconds
   */
  getTTL(): number {
    return this.ttlMs / 1000;
  }
}

// Singleton instance
export const mcpCache = new MCPCache(); // 1 hour default TTL
