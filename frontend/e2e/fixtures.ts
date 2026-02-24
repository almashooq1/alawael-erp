import { test as base, expect } from '@playwright/test';

/**
 * Fixtures مخصصة لتحسين الاختبارات
 */
export const test = base.extend<{
  authenticatedPage: typeof base;
}>({
  authenticatedPage: async ({ page }, use) => {
    // Auto-login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    await use(page);

    // Cleanup after test
    await page.click('[data-testid="logout-button"]');
  },
});

export { expect };
