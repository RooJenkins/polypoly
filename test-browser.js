const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Collect console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Collect page errors
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  
  console.log('Loading https://polystocks.vercel.app...');
  await page.goto('https://polystocks.vercel.app', { waitUntil: 'networkidle' });
  
  console.log('Waiting 30 seconds for any errors...');
  await page.waitForTimeout(30000);
  
  if (errors.length > 0) {
    console.log('\n❌ ERRORS DETECTED:');
    errors.forEach(err => console.log('  -', err));
  } else {
    console.log('\n✅ No errors detected after 30 seconds');
  }
  
  // Check if error page is shown
  const errorText = await page.textContent('body');
  if (errorText.includes('Application error')) {
    console.log('❌ Error page is displayed');
  } else {
    console.log('✅ Page loaded successfully');
  }
  
  await browser.close();
})();
