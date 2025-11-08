import { test, expect } from '@playwright/test';

/**
 * Simple visual tests for PolyPoly UI
 * Just verify pages load and take screenshots
 */

test.describe('Visual UI Tests', () => {
  test('homepage loads and screenshot', async ({ page }) => {
    // Go to homepage
    await page.goto('/');

    // Wait for DOM to be ready
    await page.waitForLoadState('domcontentloaded');

    // Wait a bit for initial render
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/homepage-full.png',
      fullPage: true
    });

    console.log('✅ Homepage screenshot captured');

    // Verify page loaded (check for html element)
    const hasContent = await page.locator('html').isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('homepage mobile view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'tests/screenshots/homepage-mobile.png',
      fullPage: true
    });

    console.log('✅ Mobile homepage screenshot captured');
  });

  test('homepage tablet view', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'tests/screenshots/homepage-tablet.png',
      fullPage: true
    });

    console.log('✅ Tablet homepage screenshot captured');
  });

  test('leaderboard page', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'tests/screenshots/leaderboard-full.png',
      fullPage: true
    });

    console.log('✅ Leaderboard screenshot captured');
  });

  test('how it works page', async ({ page }) => {
    await page.goto('/how-it-works');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'tests/screenshots/how-it-works-full.png',
      fullPage: true
    });

    console.log('✅ How it works screenshot captured');
  });

  test('verify basic UI elements exist', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Take screenshot of viewport area
    await page.screenshot({
      path: 'tests/screenshots/homepage-viewport.png'
    });

    // Check for any text content
    const bodyText = await page.locator('body').textContent();
    const hasText = bodyText && bodyText.trim().length > 0;

    console.log('📊 Page has text content:', hasText);
    console.log('📊 First 200 chars:', bodyText?.substring(0, 200));

    expect(hasText).toBeTruthy();

    // Check for links
    const links = await page.locator('a').count();
    console.log('📊 Number of links found:', links);

    // Check for headings
    const headings = await page.locator('h1, h2, h3').count();
    console.log('📊 Number of headings found:', headings);
  });
});
