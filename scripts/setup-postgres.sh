#!/bin/bash
set -e

echo "🗄️  Setting up Postgres database..."

# Push schema to Postgres
echo "📤 Pushing schema to Postgres..."
npx prisma db push --accept-data-loss

# Seed with AI agents
echo "🌱 Seeding with 6 AI trading agents..."
npx tsx scripts/seed-agents.ts

# Configure 3 agents for Alpaca
echo "🔧 Configuring Alpaca paper trading agents..."
npx tsx scripts/configure-alpaca-agents.ts

echo "✅ Postgres setup complete!"
