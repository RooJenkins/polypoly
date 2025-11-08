/**
 * MCP Logger Module
 *
 * Tracks tool call usage, API calls, and provides statistics for monitoring.
 */

interface ToolCall {
  agentId: string;
  agentName: string;
  toolName: string;
  args: any;
  cached: boolean;
  timestamp: number;
}

interface DayStats {
  date: string;
  apiCalls: number;
  cachedCalls: number;
  toolUsage: Map<string, number>;
}

export class MCPLogger {
  private toolCalls: ToolCall[] = [];
  private apiCallsToday: number = 0;
  private cachedCallsToday: number = 0;
  private lastResetDate: string = this.getCurrentDate();
  private readonly DAILY_LIMIT = 25; // Alpha Vantage free tier limit

  /**
   * Get current date as string (YYYY-MM-DD)
   */
  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Reset daily counters if it's a new day
   */
  private checkDayReset(): void {
    const currentDate = this.getCurrentDate();
    if (currentDate !== this.lastResetDate) {
      console.log(`\n📅 New day started: ${currentDate}`);
      console.log(`📊 Yesterday's stats: ${this.apiCallsToday} API calls, ${this.cachedCallsToday} cached calls`);
      this.apiCallsToday = 0;
      this.cachedCallsToday = 0;
      this.lastResetDate = currentDate;
      // Keep last 100 tool calls for analysis
      this.toolCalls = this.toolCalls.slice(-100);
    }
  }

  /**
   * Log a tool call
   */
  logToolCall(
    agentId: string,
    agentName: string,
    toolName: string,
    args: any,
    cached: boolean
  ): void {
    this.checkDayReset();

    this.toolCalls.push({
      agentId,
      agentName,
      toolName,
      args,
      cached,
      timestamp: Date.now(),
    });

    if (cached) {
      this.cachedCallsToday++;
    } else {
      this.apiCallsToday++;
    }
  }

  /**
   * Get today's API usage
   */
  getApiUsage(): {
    apiCalls: number;
    cachedCalls: number;
    totalCalls: number;
    limit: number;
    percentUsed: number;
    remaining: number;
  } {
    this.checkDayReset();
    const totalCalls = this.apiCallsToday + this.cachedCallsToday;

    return {
      apiCalls: this.apiCallsToday,
      cachedCalls: this.cachedCallsToday,
      totalCalls,
      limit: this.DAILY_LIMIT,
      percentUsed: (this.apiCallsToday / this.DAILY_LIMIT) * 100,
      remaining: this.DAILY_LIMIT - this.apiCallsToday,
    };
  }

  /**
   * Check if approaching API limit
   */
  isApproachingLimit(): boolean {
    this.checkDayReset();
    return this.apiCallsToday >= this.DAILY_LIMIT * 0.9; // 90% of limit
  }

  /**
   * Check if at API limit
   */
  isAtLimit(): boolean {
    this.checkDayReset();
    return this.apiCallsToday >= this.DAILY_LIMIT;
  }

  /**
   * Get most used tools
   */
  getMostUsedTools(limit: number = 10): Array<{ tool: string; count: number }> {
    const toolCounts = new Map<string, number>();

    for (const call of this.toolCalls) {
      const count = toolCounts.get(call.toolName) || 0;
      toolCounts.set(call.toolName, count + 1);
    }

    return Array.from(toolCounts.entries())
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get tool calls for a specific agent
   */
  getAgentToolCalls(agentId: string): ToolCall[] {
    return this.toolCalls.filter((call) => call.agentId === agentId);
  }

  /**
   * Get average tool calls per decision (agent)
   */
  getAverageToolCallsPerDecision(): number {
    if (this.toolCalls.length === 0) return 0;

    // Group by agent and timestamp (same minute = same decision)
    const decisions = new Map<string, number>();

    for (const call of this.toolCalls) {
      const minute = Math.floor(call.timestamp / 60000);
      const key = `${call.agentId}-${minute}`;
      const count = decisions.get(key) || 0;
      decisions.set(key, count + 1);
    }

    const totalCalls = Array.from(decisions.values()).reduce((a, b) => a + b, 0);
    return totalCalls / decisions.size;
  }

  /**
   * Print summary statistics
   */
  printSummary(): void {
    this.checkDayReset();

    const usage = this.getApiUsage();
    const mostUsed = this.getMostUsedTools(5);
    const avgCallsPerDecision = this.getAverageToolCallsPerDecision();

    console.log(`\n📊 ===== MCP TOOL USAGE SUMMARY =====`);
    console.log(`📅 Date: ${this.lastResetDate}`);
    console.log(`🔧 API Calls: ${usage.apiCalls}/${usage.limit} (${usage.percentUsed.toFixed(1)}%)`);
    console.log(`💾 Cached Calls: ${usage.cachedCalls}`);
    console.log(`📈 Total Calls: ${usage.totalCalls}`);
    console.log(`⚡ Cache Hit Rate: ${((usage.cachedCalls / usage.totalCalls) * 100).toFixed(1)}%`);
    console.log(`📊 Avg Calls/Decision: ${avgCallsPerDecision.toFixed(1)}`);

    if (mostUsed.length > 0) {
      console.log(`\n🔝 Most Used Tools:`);
      mostUsed.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.tool}: ${item.count} calls`);
      });
    }

    if (usage.percentUsed >= 90) {
      console.log(`\n⚠️  WARNING: Approaching API limit! ${usage.remaining} calls remaining.`);
    }

    console.log(`=====================================\n`);
  }

  /**
   * Get recent tool calls (last N)
   */
  getRecentCalls(count: number = 10): ToolCall[] {
    return this.toolCalls.slice(-count);
  }
}

// Singleton instance
export const mcpLogger = new MCPLogger();
