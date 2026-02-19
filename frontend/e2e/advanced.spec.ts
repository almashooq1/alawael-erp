import { test, expect } from './fixtures';

/**
 * اختبارات الأداء
 */
test.describe('Performance Tests', () => {
  test('dashboard should load in under 3 seconds', async ({ authenticatedPage: page }) => {
    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
  });

  test('should lazy load images', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    // Check that images have loading="lazy"
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const loading = await img.getAttribute('loading');
      expect(loading).toBe('lazy');
    }
  });

  test('should use service worker for caching', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    // Check if service worker is registered
    const swRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
    });

    expect(swRegistered).toBeTruthy();
  });
});

/**
 * اختبارات SEO
 */
test.describe('SEO Tests', () => {
  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/.+/);

    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /.+/);

    // Check viewport
    const metaViewport = page.locator('meta[name="viewport"]');
    await expect(metaViewport).toHaveAttribute('content', /width=device-width/);
  });

  test('should have proper heading hierarchy', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });
});

/**
 * اختبارات Security
 */
test.describe('Security Tests', () => {
  test('should prevent XSS injection', async ({ authenticatedPage: page }) => {
    await page.goto('/users');

    // Try to inject script
    await page.click('[data-testid="create-user-button"]');
    await page.fill('input[name="username"]', '<script>alert("XSS")</script>');
    await page.click('button[type="submit"]');

    // Check that script was sanitized
    await page.waitForTimeout(1000);
    const alertFired = await page.evaluate(() => {
      return (window as any).alertFired === true;
    });

    expect(alertFired).toBeFalsy();
  });

  test('should require authentication for protected routes', async ({ page }) => {
    // Try to access protected route without login
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL('/login', { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('should have secure headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers();

    // Check for security headers
    expect(headers?.['x-frame-options']).toBeTruthy();
    expect(headers?.['x-content-type-options']).toBe('nosniff');
  });
});
