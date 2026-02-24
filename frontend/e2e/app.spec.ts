import { test, expect, Page } from '@playwright/test';

/**
 * Helper function للتسجيل
 */
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

test.describe('Authentication Flow', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Login/i);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // انتظار redirect للـ dashboard
    await page.waitForURL('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'wrong@test.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // انتظار رسالة الخطأ
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await login(page, 'admin@test.com', 'password123');

    // Click logout
    await page.click('[data-testid="logout-button"]');
    await page.waitForURL('/login');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@test.com', 'password123');
  });

  test('should display dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText(/Dashboard/i);
  });

  test('should display statistics cards', async ({ page }) => {
    await expect(page.locator('[data-testid="stat-card"]')).toHaveCount(4);
  });

  test('should navigate to users page', async ({ page }) => {
    await page.click('a[href="/users"]');
    await page.waitForURL('/users');
    await expect(page).toHaveURL(/\/users/);
  });
});

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@test.com', 'password123');
    await page.goto('/users');
  });

  test('should display users list', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(10, { timeout: 10000 });
  });

  test('should create new user', async ({ page }) => {
    await page.click('[data-testid="create-user-button"]');

    // Fill form
    await page.fill('input[name="username"]', 'newuser');
    await page.fill('input[name="email"]', 'newuser@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.selectOption('select[name="role"]', 'user');

    // Submit
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('should search users', async ({ page }) => {
    await page.fill('input[placeholder*="Search"]', 'admin');
    await page.waitForTimeout(500); // debounce

    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('admin');
  });

  test('should delete user', async ({ page }) => {
    // Click delete on first user
    await page.click('tbody tr:first-child [data-testid="delete-button"]');

    // Confirm dialog
    page.on('dialog', dialog => dialog.accept());

    // Verify deleted
    await expect(page.locator('.success-message')).toBeVisible();
  });
});

test.describe('Meetings Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@test.com', 'password123');
    await page.goto('/meetings');
  });

  test('should display meetings list', async ({ page }) => {
    await expect(page.locator('[data-testid="meeting-item"]')).toHaveCount(5, { timeout: 10000 });
  });

  test('should create new meeting', async ({ page }) => {
    await page.click('[data-testid="create-meeting-button"]');

    // Fill form
    await page.fill('input[name="title"]', 'Sprint Planning');
    await page.fill('textarea[name="description"]', 'Planning for next sprint');
    await page.fill('input[type="datetime-local"]', '2026-02-01T10:00');

    // Submit
    await page.click('button[type="submit"]');

    // Verify created
    await expect(page.locator('[data-testid="meeting-item"]')).toContainText('Sprint Planning');
  });

  test('should filter meetings by status', async ({ page }) => {
    await page.selectOption('select[name="status"]', 'scheduled');
    await page.waitForTimeout(500);

    const meetings = page.locator('[data-testid="meeting-item"]');
    await expect(meetings.first()).toContainText('scheduled');
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page, 'admin@test.com', 'password123');

    // Check mobile menu
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page, 'admin@test.com', 'password123');

    await expect(page.locator('nav')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toHaveAttribute('aria-label', /email/i);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/login');

    await page.keyboard.press('Tab'); // email field
    await page.keyboard.type('test@test.com');

    await page.keyboard.press('Tab'); // password field
    await page.keyboard.type('password');

    await page.keyboard.press('Tab'); // submit button
    await page.keyboard.press('Enter');

    // Should attempt login
    await page.waitForTimeout(1000);
  });
});
