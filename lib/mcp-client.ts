/**
 * MCP Client Module
 *
 * Connects to Alpha Vantage MCP server and provides tool execution with caching and rate limiting.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { mcpCache } from './mcp-cache';
import { mcpLogger } from './mcp-logger';

interface MCPTool {
  name: string;
  description?: string;
  inputSchema: any;
}

export class MCPClient {
  private client: Client | null = null;
  private transport: SSEClientTransport | null = null;
  private tools: MCPTool[] = [];
  private connected: boolean = false;
  private apiKey: string;
  private serverUrl: string;

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    if (!this.apiKey || this.apiKey === 'demo') {
      throw new Error('ALPHA_VANTAGE_API_KEY is not set in .env file');
    }

    // Connect to Alpha Vantage MCP server with filtered categories
    const categories = 'core_stock_apis,technical_indicators,alpha_intelligence,fundamental_data';
    this.serverUrl = `https://mcp.alphavantage.co/mcp?apikey=${this.apiKey}&categories=${categories}`;
  }

  /**
   * Initialize connection to MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      console.log('🔌 Connecting to Alpha Vantage MCP server...');

      // Create SSE transport for HTTP connection
      this.transport = new SSEClientTransport(new URL(this.serverUrl));
      this.client = new Client({
        name: 'polystocks-trading-bot',
        version: '1.0.0',
      }, {
        capabilities: {
          tools: {},
        },
      });

      await this.client.connect(this.transport);

      // Fetch available tools
      const toolsList = await this.client.listTools();
      this.tools = toolsList.tools as MCPTool[];

      this.connected = true;
      console.log(`✅ Connected to Alpha Vantage MCP - ${this.tools.length} tools available`);
      console.log(`📋 Tools: ${this.tools.map(t => t.name).slice(0, 10).join(', ')}${this.tools.length > 10 ? '...' : ''}`);
    } catch (error: any) {
      console.error('❌ Failed to connect to MCP server:', error.message);
      throw error;
    }
  }

  /**
   * Execute a tool call with caching and rate limiting
   */
  async callTool(
    toolName: string,
    args: any,
    agentId: string = 'unknown',
    agentName: string = 'Unknown'
  ): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('MCP client not connected');
    }

    // Check cache first
    const cached = mcpCache.get(toolName, args);
    if (cached !== null) {
      mcpLogger.logToolCall(agentId, agentName, toolName, args, true);
      return cached;
    }

    // Check rate limits
    const usage = mcpLogger.getApiUsage();
    if (mcpLogger.isAtLimit()) {
      console.warn(`⛔ API limit reached (${usage.apiCalls}/${usage.limit}), using cached data only`);
      // Return empty result or throw error
      throw new Error('API rate limit exceeded');
    }

    if (mcpLogger.isApproachingLimit()) {
      console.warn(`⚠️  Approaching API limit: ${usage.apiCalls}/${usage.limit} (${usage.percentUsed.toFixed(1)}%)`);
      // Extend cache TTL to reduce API calls
      mcpCache.setTTL(300); // 5 minutes
    }

    try {
      // Execute tool via MCP
      const result = await this.client.callTool({
        name: toolName,
        arguments: args,
      });

      // Cache the result
      mcpCache.set(toolName, args, result);

      // Log the call
      mcpLogger.logToolCall(agentId, agentName, toolName, args, false);

      return result;
    } catch (error: any) {
      console.error(`❌ Error calling tool ${toolName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get tools formatted for OpenAI function calling
   */
  getToolsForOpenAI(): any[] {
    return this.tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description || `${tool.name} tool from Alpha Vantage`,
        parameters: tool.inputSchema || {
          type: 'object',
          properties: {},
        },
      },
    }));
  }

  /**
   * Get tools formatted for Anthropic Claude
   */
  getToolsForClaude(): any[] {
    return this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description || `${tool.name} tool from Alpha Vantage`,
      input_schema: tool.inputSchema || {
        type: 'object',
        properties: {},
      },
    }));
  }

  /**
   * Get tools formatted for Google Gemini
   */
  getToolsForGemini(): any[] {
    return this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description || `${tool.name} tool from Alpha Vantage`,
      parameters: tool.inputSchema || {
        type: 'object',
        properties: {},
      },
    }));
  }

  /**
   * Get list of available tool names
   */
  getAvailableTools(): string[] {
    return this.tools.map((t) => t.name);
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.close();
      this.connected = false;
      console.log('🔌 Disconnected from Alpha Vantage MCP server');
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get tool usage statistics
   */
  getStats() {
    return {
      cache: mcpCache.getStats(),
      api: mcpLogger.getApiUsage(),
      mostUsedTools: mcpLogger.getMostUsedTools(5),
    };
  }

  /**
   * Print usage summary
   */
  printSummary(): void {
    mcpLogger.printSummary();
  }
}

// Singleton instance
let mcpClientInstance: MCPClient | null = null;

/**
 * Get or create MCP client instance
 */
export async function getMCPClient(): Promise<MCPClient> {
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPClient();
    await mcpClientInstance.connect();
  }

  if (!mcpClientInstance.isConnected()) {
    await mcpClientInstance.connect();
  }

  return mcpClientInstance;
}

/**
 * Call an MCP tool (convenience function)
 */
export async function callMCPTool(
  toolName: string,
  args: any,
  agentId?: string,
  agentName?: string
): Promise<any> {
  const client = await getMCPClient();
  return await client.callTool(toolName, args, agentId, agentName);
}
