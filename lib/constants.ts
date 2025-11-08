export const TOP_20_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'KO', name: 'Coca-Cola Company' }, // Replaced BRK.B (Yahoo Finance validation issues)
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  { symbol: 'WMT', name: 'Walmart Inc.' },
  { symbol: 'MA', name: 'Mastercard Inc.' },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'PG', name: 'Procter & Gamble Co.' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation' },
  { symbol: 'HD', name: 'Home Depot Inc.' },
  { symbol: 'BAC', name: 'Bank of America Corp.' },
  { symbol: 'CVX', name: 'Chevron Corporation' },
  { symbol: 'LLY', name: 'Eli Lilly and Company' }, // 20th stock
];

export const AI_AGENTS = [
  {
    id: 'gpt4',
    name: 'GPT-4o Mini',
    model: 'OpenAI GPT-4o-mini',
    color: '#10b981',
  },
  {
    id: 'claude',
    name: 'Claude Haiku',
    model: 'Anthropic Claude Haiku',
    color: '#3b82f6',
  },
  {
    id: 'gemini',
    name: 'Gemini Flash',
    model: 'Google Gemini 2.0 Flash',
    color: '#f59e0b',
  },
  {
    id: 'grok',
    name: 'Grok',
    model: 'xAI Grok (Fallback)',
    color: '#ef4444',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    model: 'DeepSeek Chat',
    color: '#8b5cf6',
  },
  {
    id: 'qwen',
    name: 'Qwen',
    model: 'Alibaba Qwen (Fallback)',
    color: '#ec4899',
  },
];

export const STARTING_BALANCE = 10000;
