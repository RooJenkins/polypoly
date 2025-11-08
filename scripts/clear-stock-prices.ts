import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearStockPrices() {
  console.log('🗑️  Clearing all StockPrice data...');

  const result = await prisma.stockPrice.deleteMany({});

  console.log(`✅ Deleted ${result.count} price records\n`);

  await prisma.$disconnect();
}

clearStockPrices().catch(console.error);
