# GitHub Actions Setup Guide

## 🎯 What This Does

GitHub Actions will automatically trigger your trading cycle every 30 minutes during market hours (9:00 AM - 4:30 PM EST, Mon-Fri) - **completely free!**

---

## 📋 Setup Steps

### 1. Add GitHub Secrets

Go to your GitHub repository:
```
https://github.com/RooJenkins/PolyStocks/settings/secrets/actions
```

Click **"New repository secret"** and add these 2 secrets:

#### Secret 1: `VERCEL_APP_URL`
- **Name**: `VERCEL_APP_URL`
- **Value**: `https://your-app.vercel.app` (your actual Vercel URL)
- Example: `https://poly-stocks.vercel.app`

#### Secret 2: `CRON_SECRET`
- **Name**: `CRON_SECRET`
- **Value**: Generate a secure random string
- You can use this command to generate one:
  ```bash
  openssl rand -base64 32
  ```
- Example: `X8pq2mK9vL3nR7sT4wY6zB1cD5eF8gH0`

---

### 2. Update Your Vercel Environment Variables

1. Go to: https://vercel.com/dashboard
2. Select your **PolyStocks** project
3. Go to **Settings** → **Environment Variables**
4. Add the same `CRON_SECRET`:
   - **Name**: `CRON_SECRET`
   - **Value**: (same value you used in GitHub)
   - **Environments**: Production, Preview, Development
5. Click **Save**
6. **Redeploy** your app (required for env vars to take effect)

---

### 3. Update Your API Route (Optional - Add Authentication)

Edit `/app/api/cron/trading-cycle/route.ts` to check the CRON_SECRET:

```typescript
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rest of your code...
}
```

---

### 4. Push to GitHub

```bash
git add .github/workflows/trading-cycle.yml
git commit -m "Add GitHub Actions for automated trading cycles"
git push origin main
```

---

### 5. Verify It's Working

1. Go to your GitHub repo: https://github.com/RooJenkins/PolyStocks
2. Click the **"Actions"** tab
3. You should see the "Trading Cycle Automation" workflow
4. It will run automatically at market hours
5. You can also click **"Run workflow"** to test it manually!

---

## 📊 When Will It Run?

The trading cycle will trigger automatically at:
- **Every 30 minutes** during market hours
- **9:00 AM, 9:30 AM, 10:00 AM, ..., 4:00 PM, 4:30 PM EST**
- **Monday through Friday only**
- **16 times per trading day**

---

## 🔧 Troubleshooting

### If the workflow doesn't run:

1. **Check GitHub Actions is enabled**:
   - Go to Settings → Actions → General
   - Enable "Allow all actions and reusable workflows"

2. **Check your secrets are set**:
   - Settings → Secrets and variables → Actions
   - Verify `VERCEL_APP_URL` and `CRON_SECRET` are there

3. **Check workflow logs**:
   - Actions tab → Click on a workflow run
   - View the logs to see what happened

4. **Test manually**:
   - Actions tab → Trading Cycle Automation → Run workflow
   - This will trigger it immediately

### If the API returns 401 Unauthorized:

- Double-check the `CRON_SECRET` matches in both:
  - GitHub Secrets
  - Vercel Environment Variables
- Redeploy your Vercel app after adding env vars

---

## 💰 Cost

**$0/month** - GitHub Actions is free for public repos and includes 2,000 minutes/month for private repos. Your trading cycle uses ~2 minutes/month.

---

## 🎉 Benefits Over Vercel Cron

✅ **Free** (no $20/month Vercel Pro needed)
✅ **Reliable** (GitHub Actions has 99.9% uptime)
✅ **Visible** (see all runs in Actions tab)
✅ **Logs** (detailed logs of every execution)
✅ **Manual trigger** (test anytime)
✅ **No code changes** needed to your app

---

## 📝 Summary

1. ✅ Created `.github/workflows/trading-cycle.yml`
2. ⏳ Add `VERCEL_APP_URL` and `CRON_SECRET` to GitHub Secrets
3. ⏳ Add `CRON_SECRET` to Vercel Environment Variables
4. ⏳ (Optional) Update API route to check CRON_SECRET
5. ⏳ Push to GitHub
6. ⏳ Verify in Actions tab

Once set up, your AI traders will run automatically every 30 minutes! 🤖📈
