#!/bin/bash
echo "🗄️  Setting up Postgres database on Vercel..."

# Use POSTGRES_PRISMA_URL if available, otherwise construct from parts
if [ -z "$POSTGRES_PRISMA_URL" ] && [ -n "$POSTGRES_PASSWORD" ]; then
  export DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST/$POSTGRES_DATABASE?pgbouncer=true&connect_timeout=15"
  export DIRECT_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST/$POSTGRES_DATABASE?connect_timeout=15"
else
  export DATABASE_URL="$POSTGRES_PRISMA_URL"
  export DIRECT_URL="$POSTGRES_URL_NON_POOLING"
fi

echo "📤 Pushing schema to Postgres..."
npx prisma db push --accept-data-loss --skip-generate

echo "🌱 Seeding with 6 AI trading agents..."
npx tsx scripts/seed-agents.ts

echo "🔧 Configuring Alpaca paper trading agents..."
npx tsx scripts/configure-alpaca-agents.ts

echo "✅ Database setup complete!"
