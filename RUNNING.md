# PolyStocks - Running Guide

## 🚀 Application is Currently Running!

Your PolyStocks AI trading arena is live and trading!

### 📍 Access Points

- **Web Dashboard**: http://localhost:3003
- **Leaderboard**: http://localhost:3003/leaderboard

### 🤖 Active Services

#### 1. Web Server (tmux session: `polystocks-web`)
- Running on port **3003**
- Serving the Next.js dashboard
- Real-time updates every 30 seconds

#### 2. Trading Bot (tmux session: `polystocks-bot`)
- Running AI trading cycles every **3 minutes**
- All 6 AI agents are actively trading
- Check logs: `tmux attach -t polystocks-bot`

### 📊 What's Happening

The AIs are currently:
- **GPT-4** (OpenAI) - ✅ Trading actively
- **Claude Sonnet 4.5** (Anthropic) - ✅ Trading actively
- **Gemini Flash** (Google) - ✅ Trading actively
- **Grok** (xAI) - ⚠️ Using fallback (no API key)
- **DeepSeek** - ✅ Trading actively
- **Qwen** (Alibaba) - ⚠️ API error (403)

### 🎮 Managing the Application

#### View Logs

**Web Server Logs:**
\`\`\`bash
tmux attach -t polystocks-web
# Press Ctrl+B then D to detach
\`\`\`

**Trading Bot Logs:**
\`\`\`bash
tmux attach -t polystocks-bot
# Press Ctrl+B then D to detach
\`\`\`

#### Stop the Application

\`\`\`bash
# Stop web server
tmux kill-session -t polystocks-web

# Stop trading bot
tmux kill-session -t polystocks-bot
\`\`\`

#### Restart the Application

\`\`\`bash
# Start web server
tmux new-session -d -s polystocks-web "npm run dev"

# Start trading bot
tmux new-session -d -s polystocks-bot "npx tsx scripts/trading-bot.ts"
\`\`\`

### 📈 What to Expect

**First Few Minutes:**
- AIs will start with $10,000 each
- They'll begin making trading decisions
- You'll see trades appear in the dashboard

**After 15-30 Minutes:**
- Performance chart will start showing data
- Leaderboard rankings will change
- You'll see clear winners and losers

**After 1-2 Hours:**
- Rich performance history
- Multiple trades per agent
- Interesting AI trading patterns emerge

### 🔍 Monitoring Performance

1. **Dashboard** (http://localhost:3003)
   - View live account values
   - See performance chart
   - Check each AI's decisions in Model Chat

2. **Leaderboard** (http://localhost:3003/leaderboard)
   - Sort by different metrics
   - Compare AI performance
   - See detailed statistics

3. **Trading Bot Logs**
   - Watch live trading decisions
   - See AI reasoning in real-time
   - Monitor for errors

### 💡 Tips

1. **First Trading Cycle**: The first cycle takes longer as AIs analyze the market

2. **Stock Prices**: Currently using simulated prices. Add real API keys for actual data:
   \`\`\`bash
   # Get free API keys from:
   # - Polygon.io (best)
   # - Finnhub.io
   # - AlphaVantage.co
   \`\`\`

3. **Refresh Dashboard**: The UI auto-refreshes every 30 seconds

4. **Performance Chart**: Needs at least 2-3 trading cycles to show meaningful data

### 🛠️ Troubleshooting

**Dashboard Not Loading?**
\`\`\`bash
# Check if web server is running
lsof -i :3003

# Restart if needed
tmux kill-session -t polystocks-web
tmux new-session -d -s polystocks-web "npm run dev"
\`\`\`

**No Trades Happening?**
\`\`\`bash
# Check bot logs
tmux attach -t polystocks-bot

# Look for errors in AI calls
\`\`\`

**AI Errors?**
- Some AIs may fail if API keys are invalid
- They'll fall back to random decisions
- Check `.env` file for correct API keys

### 📊 Database

All data is stored in `prisma/dev.db`:

\`\`\`bash
# View database with Prisma Studio
npx prisma studio
# Opens at http://localhost:5555
\`\`\`

### 🔄 Reset Everything

To start fresh:

\`\`\`bash
# Stop all services
tmux kill-session -t polystocks-web
tmux kill-session -t polystocks-bot

# Reset database
rm prisma/dev.db
npx prisma db push
npx tsx lib/seed.ts

# Restart
tmux new-session -d -s polystocks-web "npm run dev"
tmux new-session -d -s polystocks-bot "npx tsx scripts/trading-bot.ts"
\`\`\`

### 📦 Tech Stack Running

- **Frontend**: Next.js 15 + React 19
- **Backend**: Next.js API routes
- **Database**: SQLite with Prisma
- **AI**: OpenAI, Anthropic, Google, DeepSeek
- **Charts**: Recharts
- **Scheduling**: node-cron

### 🎯 Next Steps

1. **Watch the First Trades**: Keep the dashboard open and watch as AIs make their first moves

2. **Monitor Leaderboard**: Refresh every few minutes to see rankings change

3. **Read AI Reasoning**: Click on agents to see their Model Chat tab (when implemented)

4. **Add Real Stock Data**: Get API keys for real market prices

5. **Customize Trading**: Edit `lib/ai-models.ts` to change AI prompts

---

**Enjoy watching the AIs compete!** 🤖📈💰

The trading arena is live at: **http://localhost:3003**
