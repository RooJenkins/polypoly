# Vercel Cron Configuration Guide

## Current Issue
The trading agents are not running on schedule. This guide helps verify and fix the Vercel cron configuration.

## Required Vercel Environment Variables

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

### Required Variables:
```
DATABASE_URL=your_neon_db_url
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
DEEPSEEK_API_KEY=...
QWEN_API_KEY=...
ALPHA_VANTAGE_API_KEY=...
CRON_SECRET=<generate_random_secret>
```

### Generate CRON_SECRET:
```bash
# Run this to generate a secure random secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then add it to Vercel environment variables.

## Cron Schedule Verification

Go to: **Vercel Dashboard → Your Project → Settings → Cron Jobs**

You should see:
- **Path**: `/api/cron/trading-cycle`
- **Schedule**: `0,30 14-21 * * 1-5`
- **Status**: ✅ Enabled

### What This Means:
- Runs at **:00 and :30** of each hour
- From **14:00-21:00 UTC** (9:00 AM - 4:30 PM EST)
- **Monday-Friday** only
- **16 executions per day**

### Expected Run Times (EST):
```
9:00 AM, 9:30 AM, 10:00 AM, 10:30 AM, 11:00 AM, 11:30 AM,
12:00 PM, 12:30 PM, 1:00 PM, 1:30 PM, 2:00 PM, 2:30 PM,
3:00 PM, 3:30 PM, 4:00 PM, 4:30 PM
```

## Troubleshooting

### If cron is not running:

1. **Check Deployment Status**
   - Go to Vercel Dashboard → Deployments
   - Ensure latest deployment succeeded
   - Look for build errors

2. **Check Cron Logs**
   - Go to Vercel Dashboard → Logs
   - Filter by "Cron"
   - Look for execution logs or errors

3. **Verify Authorization**
   - The `CRON_SECRET` must be set in environment variables
   - Without it, cron requests will return `{"error":"Unauthorized"}`

4. **Manual Test**
   ```bash
   # In Vercel Dashboard, you can manually trigger the cron
   # Or use the Vercel CLI:
   vercel logs --follow
   ```

5. **Check Function Limits**
   - Hobby plan: 100 cron executions/day (we use 16 = ✅ safe)
   - Function timeout: 10 seconds (should be enough)

## Verification Checklist

- [ ] All environment variables set in Vercel
- [ ] `CRON_SECRET` generated and added
- [ ] Latest code deployed to Vercel
- [ ] Cron job appears in Vercel dashboard
- [ ] Cron job is enabled (not paused)
- [ ] No build errors in latest deployment
- [ ] Check logs for cron execution attempts

## After Deployment

Wait until the next scheduled time (top of the hour or half hour) and check:
1. Vercel logs show cron execution
2. Database shows new trades/decisions
3. Dashboard shows updated "Latest Reasoning" timestamps

## Quick Test

You can test the endpoint locally (without cron secret it will show unauthorized, which is correct):
```bash
curl https://polystocks.vercel.app/api/cron/trading-cycle
# Should return: {"message": "Trading cycle cron endpoint is active", ...}
```
