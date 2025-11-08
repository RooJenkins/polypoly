const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect detailed errors
  const errors = [];
  page.on('pageerror', error => {
    errors.push({
      message: error.message,
      stack: error.stack
    });
  });

  console.log('Loading https://polystocks.vercel.app...');
  await page.goto('https://polystocks.vercel.app', { waitUntil: 'networkidle' });

  console.log('Waiting 30 seconds for any errors...');
  await page.waitForTimeout(30000);

  if (errors.length > 0) {
    console.log('\n❌ DETAILED ERRORS:');
    errors.forEach((err, i) => {
      console.log(`\nError ${i + 1}:`);
      console.log('Message:', err.message);
      console.log('Stack:', err.stack);
    });
  } else {
    console.log('\n✅ No errors detected');
  }

  await browser.close();
})();
