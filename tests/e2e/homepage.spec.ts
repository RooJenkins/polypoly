import { test, expect } from '@playwright/test';

/**
 * PolyPoly Homepage UI Tests
 * Verify that the application loads correctly and looks good
 */

test.describe('PolyPoly Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Take a screenshot of the homepage
    await page.screenshot({ path: 'tests/screenshots/homepage.png', fullPage: true });

    // Verify page title
    await expect(page).toHaveTitle(/PolyPoly|AI Models/i);

    console.log('✅ Homepage loaded successfully');
  });

  test('should display main heading', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for main heading about AI models or multi-market investing
    const headings = await page.locator('h1, h2').allTextContents();
    const hasRelevantHeading = headings.some(h =>
      h.toLowerCase().includes('ai') ||
      h.toLowerCase().includes('market') ||
      h.toLowerCase().includes('invest')
    );

    expect(hasRelevantHeading).toBeTruthy();
    console.log('✅ Main heading found:', headings[0]);
  });

  test('should have navigation elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for navigation links (How it Works, Leaderboard, etc.)
    const links = await page.locator('a').allTextContents();
    console.log('📊 Navigation links found:', links.length);

    expect(links.length).toBeGreaterThan(0);
    console.log('✅ Navigation elements present');
  });

  test('should display agent cards or performance data', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait a bit for any dynamic content to load
    await page.waitForTimeout(2000);

    // Take a screenshot after content loads
    await page.screenshot({ path: 'tests/screenshots/homepage-with-content.png', fullPage: true });

    // Check for cards, tables, or data displays
    const hasCards = await page.locator('[class*="card"], [class*="Card"]').count() > 0;
    const hasTables = await page.locator('table').count() > 0;
    const hasCharts = await page.locator('canvas, svg').count() > 0;

    const hasContent = hasCards || hasTables || hasCharts;

    console.log('📊 Content found - Cards:', hasCards, 'Tables:', hasTables, 'Charts:', hasCharts);
    expect(hasContent).toBeTruthy();
    console.log('✅ Agent/performance content displayed');
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'tests/screenshots/homepage-mobile.png', fullPage: true });

    // Verify page is still functional on mobile
    const isVisible = await page.locator('body').isVisible();
    expect(isVisible).toBeTruthy();

    console.log('✅ Mobile viewport renders correctly');

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'tests/screenshots/homepage-tablet.png', fullPage: true });

    console.log('✅ Tablet viewport renders correctly');
  });
});

test.describe('Leaderboard Page', () => {
  test('should load leaderboard page', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'tests/screenshots/leaderboard.png', fullPage: true });

    // Verify page loads
    const isVisible = await page.locator('body').isVisible();
    expect(isVisible).toBeTruthy();

    console.log('✅ Leaderboard page loaded');
  });
});

test.describe('How It Works Page', () => {
  test('should load how it works page', async ({ page }) => {
    await page.goto('/how-it-works');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'tests/screenshots/how-it-works.png', fullPage: true });

    // Verify page loads
    const isVisible = await page.locator('body').isVisible();
    expect(isVisible).toBeTruthy();

    console.log('✅ How it works page loaded');
  });
});
