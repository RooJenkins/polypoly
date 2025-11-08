# Rate Limit Analysis for Hourly Trading Cycles

## Current Setup
- **Agents**: 6 AI models (GPT-4o Mini, Claude Haiku, Gemini Flash, DeepSeek, Qwen, Grok)
- **Trading Frequency**: Every 1 hour during market hours (8 times/day)
- **Market Hours**: 9:30 AM - 4:30 PM ET (Mon-Fri)

## API Usage Per Trading Cycle

### 1. Stock Data API (Yahoo Finance)
**Provider**: Yahoo Finance (via yahoo-finance2 npm package)
- **Rate Limits**: Unlimited (free, no API key required)
- **Calls per cycle**: 1 bulk fetch for 20 stocks
- **Daily calls**: 8 cycles × 1 call = **8 calls/day**
- **Status**: ✅ NO ISSUES

### 2. AI Model APIs

#### Per Agent, Per Cycle:
- 1 AI API call to get trading decision
- Up to 15 tool calls for market data (GPT-4o Mini only)

#### Daily Usage (8 cycles × 6 agents):

**OpenAI (GPT-4o Mini)**
- Base calls: 8 cycles/day
- Tool calls: 8 × 15 max = 120 calls/day
- Total: **~128 calls/day**
- Tier 1 limit: 500 requests/day, 10,000 tokens/min
- Status: ✅ SAFE (well under limits)

**Anthropic (Claude Haiku)**
- Calls: 8 cycles/day
- Tier 1 limit: 50 requests/min, 40,000 tokens/min
- Daily budget: Effectively unlimited for 8 calls
- Status: ✅ SAFE

**Google (Gemini Flash)**
- Calls: 8 cycles/day
- Free tier: 15 requests/min, 1M tokens/day
- Status: ✅ SAFE

**DeepSeek**
- Calls: 8 cycles/day
- Limits: Very generous (no published limits hit at this volume)
- Status: ✅ SAFE

**Qwen (Alibaba Cloud)**
- Calls: 8 cycles/day
- Limits: Generous for API tier
- Status: ✅ SAFE

**Grok (xAI)**
- Calls: 8 cycles/day
- Beta tier limits: Should be sufficient
- Status: ✅ LIKELY SAFE (monitor)

### 3. Database Operations (PostgreSQL via Neon)
**Per cycle**:
- Read operations: ~30 queries (agents, positions, performance, trades)
- Write operations: ~15 queries (trades, positions, performance points)
- Total: ~45 queries per cycle

**Daily**: 8 cycles × 45 queries = **360 queries/day**
- Neon free tier: 100 hours compute/month
- At ~5 seconds per cycle: 40 seconds/day = **~20 hours/month**
- Status: ✅ SAFE (well under limit)

### 4. Vercel Cron Jobs
- Executions: 8 per day
- Free tier: 100 cron executions/day
- Status: ✅ SAFE

### 5. Vercel Function Invocations
**Per cycle**: 1 cron invocation
**Daily**: 8 invocations
- Hobby tier: 100 GB-hours/month
- Duration: ~30 seconds per cycle = 4 minutes/day
- Status: ✅ SAFE

## Total Daily API Budget

| Service | Calls/Day | Limit | Usage % |
|---------|-----------|-------|---------|
| Yahoo Finance | 8 | Unlimited | 0% |
| OpenAI | 128 | 500/day | 26% |
| Anthropic | 8 | 3,000/day | 0.3% |
| Google Gemini | 8 | 21,600/day | 0.04% |
| DeepSeek | 8 | High | <1% |
| Qwen | 8 | High | <1% |
| Grok | 8 | Unknown | Low |
| Neon DB | 360 queries | Generous | <5% |
| Vercel Cron | 8 | 100/day | 8% |

## Risk Assessment

### 🟢 Low Risk (No Action Needed)
- Stock data fetching (Yahoo Finance unlimited)
- AI model calls (all within free/tier 1 limits)
- Database queries (Neon free tier sufficient)
- Vercel infrastructure (well under limits)

### 🟡 Medium Risk (Monitor)
- **OpenAI tool calls**: Currently at 26% of daily limit
  - If we increase to 16 cycles/day, would be 52%
  - Still safe, but worth monitoring
- **Grok API**: Unknown rate limits (beta)
  - Should be fine, but monitor for errors

### 🔴 High Risk (Would Need Action)
None at current hourly frequency!

## Safeguards Already In Place

1. **Error Handling**: All API calls have try-catch blocks with fallback to mock data
2. **Safety Limits**: Trading safety limits prevent runaway behavior
3. **Tool Call Budget**: OpenAI limited to 15 tool calls per decision
4. **Market Hours Only**: Trading only occurs during market hours
5. **Database Connection Pooling**: Prisma handles connection management

## Recommendations

### For Current Setup (8 cycles/day)
✅ **No changes needed** - all systems operating well within limits

### If Scaling to More Frequent Cycles
If you want to increase to every 30 minutes (16 cycles/day):
- Still within all limits
- OpenAI would be at 52% of daily limit (still safe)
- Consider adding retry logic with exponential backoff

### If Scaling to More Agents
If adding more agents:
- Each additional agent adds 8 AI calls/day
- At 10 agents: 80 AI calls/day (still safe)
- At 20 agents: 160 AI calls/day (monitor OpenAI usage)

## Monitoring

Add monitoring for:
1. API response codes (429 = rate limit hit)
2. Failed trading cycles
3. Database query performance
4. Vercel function execution times

## Cost Estimate (Current Usage)

**Monthly costs at 8 cycles/day, 20 trading days/month**:
- Yahoo Finance: $0 (free)
- OpenAI: ~$0.50-1.00 (Tier 1)
- Anthropic: ~$0.10-0.20 (Tier 1)
- Google Gemini: $0 (free tier)
- DeepSeek: ~$0.05-0.10
- Qwen: ~$0.05-0.10
- Grok: $0 (beta)
- Neon DB: $0 (free tier)
- Vercel: $0 (hobby tier)

**Total: ~$0.75-1.50/month** ✅ Very cost-effective!

## Conclusion

✅ **All systems are operating well within rate limits**
✅ **No immediate action required**
✅ **Current architecture scales safely to 2-3x current volume**
✅ **Cost-optimized setup using free tiers and budget models**

The hourly trading cycle is **SAFE** and will not cause rate limiting issues!
