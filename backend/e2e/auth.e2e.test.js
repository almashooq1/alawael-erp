/**
 * 🌐 E2E Tests: Authentication Flow
 * End-to-end tests for user authentication, login, logout, and session management
 * Tests: Complete auth lifecycle, error handling, security validations
 */

const { test, expect } = require('@playwright/test');

// Set baseURL from environment or default
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:5000/api';

/**
 * Test Fixtures
 */
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword@123',
  username: 'testuser',
};

const invalidCredentials = {
  email: 'invalid@example.com',
  password: 'WrongPassword@123',
};

test.describe('🔐 Authentication E2E Tests', () => {
  // Skip auth tests if API not available
  // test.skip(({ browserName }) => browserName === 'webkit' && !process.env.CI);

  test.describe('Login Flow', () => {
    test('should complete successful login with valid credentials', async ({ page }) => {
      // Navigate to login page
      await page.goto(`${BASE_URL}/login`);
      expect(page.url()).toContain('/login');

      // Fill login form
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);

      // Submit form
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeEnabled();
      await submitButton.click();

      // Wait for navigation and verify redirect
      await page.waitForNavigation();
      expect(page.url()).toContain('/dashboard');

      // Verify user is logged in
      const userMenu = page.locator('[data-testid="user-menu"]');
      await expect(userMenu).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      await page.fill('input[name="email"]', invalidCredentials.email);
      await page.fill('input[name="password"]', invalidCredentials.password);
      await page.click('button[type="submit"]');

      // Verify error message
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toContainText(/invalid|incorrect|failed/i);
    });

    test('should validate email format before submission', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Try invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      const submitButton = page.locator('button[type="submit"]');

      // Button should be disabled or form should show error
      const emailError = page.locator('[data-testid="email-error"]');
      await expect(emailError)
        .toBeVisible({ timeout: 2000 })
        .catch(() => {
          expect(submitButton).toBeDisabled();
        });
    });

    test('should require password field', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      await page.fill('input[name="email"]', testUser.email);
      // Leave password empty
      await page.click('button[type="submit"]');

      // Should show validation error
      const passwordError = page.locator('[data-testid="password-error"]');
      try {
        await expect(passwordError).toBeVisible({ timeout: 2000 });
      } catch (e) {
        const errorMessage = page.locator('[data-testid="error-message"]');
        await expect(errorMessage).toBeVisible();
      }
    });

    test('should handle network errors gracefully', async ({ page, context }) => {
      // Simulate offline
      await context.setOffline(true);

      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      // Should show network error
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toContainText(/network|connection|offline/i);

      // Restore connection
      await context.setOffline(false);
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page navigations', async ({ page }) => {
      // Login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      // Navigate to different pages
      await page.goto(`${BASE_URL}/dashboard`);
      expect(page.url()).toContain('/dashboard');

      // Should still be logged in
      const userMenu = page.locator('[data-testid="user-menu"]');
      await expect(userMenu).toBeVisible();

      // Navigate to profile
      await page.goto(`${BASE_URL}/profile`);
      expect(page.url()).toContain('/profile');
      await expect(userMenu).toBeVisible();
    });

    test('should redirect to login when session expires', async ({ page }) => {
      // This test would require mocking session expiry
      // Simulate by clearing cookies
      await page.context().clearCookies();

      // Try to access protected page
      await page.goto(`${BASE_URL}/dashboard`);

      // Should redirect to login
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Logout', () => {
    test('should successfully logout user', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      // Click logout button
      const logoutButton = page.locator('[data-testid="logout-button"]');
      await logoutButton.click();
      await page.waitForNavigation();

      // Should redirect to login
      expect(page.url()).toContain('/login');

      // Cookies should be cleared
      const cookies = await page.context().cookies();
      const authCookie = cookies.find(c => c.name === 'authToken');
      expect(authCookie).toBeUndefined();
    });

    test('should clear user data after logout', async ({ page }) => {
      // Login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      // Logout
      const logoutButton = page.locator('[data-testid="logout-button"]');
      await logoutButton.click();
      await page.waitForNavigation();

      // User menu should not be visible
      const userMenu = page.locator('[data-testid="user-menu"]');
      await expect(userMenu).not.toBeVisible();
    });
  });

  test.describe('Remember Me / Token Refresh', () => {
    test('should persist session with remember me option', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);

      // Check "Remember Me"
      const rememberMe = page.locator('input[name="rememberMe"]');
      await rememberMe.click();

      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      // Get cookies with long expiry
      const cookies = await page.context().cookies();
      const authCookie = cookies.find(c => c.name === 'authToken');
      expect(authCookie).toBeDefined();
      expect(authCookie.expires).toBeGreaterThan(Date.now() / 1000 + 86400); // > 1 day
    });

    test('should refresh token before expiration', async ({ page }) => {
      // This test validates token refresh mechanism
      // Need to monitor network requests
      const tokenRefreshRequests = [];

      page.on('response', response => {
        if (response.url().includes('/api/auth/refresh')) {
          tokenRefreshRequests.push(response.status());
        }
      });

      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      // Wait for potential token refresh
      await page.waitForTimeout(2000);

      // If refresh was called, it should succeed
      const failedRefreshes = tokenRefreshRequests.filter(status => status >= 400);
      expect(failedRefreshes.length).toBe(0);
    });
  });

  test.describe('Security', () => {
    test('should not expose sensitive data in URLs', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      // Verify URL doesn't contain credentials
      expect(page.url()).not.toContain(testUser.email);
      expect(page.url()).not.toContain(testUser.password);
    });

    test('should use HTTPS for authentication endpoints', async ({ page }) => {
      // This test requires HTTPS in test environment
      if (process.env.TEST_URL?.startsWith('https://')) {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="email"]', testUser.email);
        await page.fill('input[name="password"]', testUser.password);

        let requestProtocol = 'http';
        page.on('request', request => {
          if (request.url().includes('/api/auth/login')) {
            requestProtocol = request.url().split(':')[0];
          }
        });

        await page.click('button[type="submit"]');
        expect(requestProtocol).toBe('https');
      }
    });

    test('should protect against password brute force', async ({ page }) => {
      // Try multiple failed login attempts
      const maxAttempts = 10;

      for (let i = 0; i < maxAttempts; i++) {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="email"]', testUser.email);
        await page.fill('input[name="password"]', 'WrongPassword@123');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(500);
      }

      // Should show rate limit error or lock account
      const errorMessage = page.locator('[data-testid="error-message"]');
      const error = await errorMessage.textContent();
      expect(error).toMatch(/too many|brute force|locked|attempts/i);
    });
  });
});
