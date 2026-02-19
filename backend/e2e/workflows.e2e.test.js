/**
 * 🌐 E2E Tests: Complete User Workflows
 * End-to-end tests for complete business processes from start to finish
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:5000/api';

test.describe('📊 Complete Workflow E2E Tests', () => {
  test('should complete full user registration and onboarding flow', async ({ page }) => {
    // Step 1: Navigate to signup
    await page.goto(`${BASE_URL}/signup`);
    expect(page.url()).toContain('/signup');

    // Step 2: Fill signup form
    const timestamp = Date.now();
    await page.fill('input[name="username"]', `newuser${timestamp}`);
    await page.fill('input[name="email"]', `signup${timestamp}@test.com`);
    await page.fill('input[name="password"]', 'SecurePassword@123');
    await page.fill('input[name="confirmPassword"]', 'SecurePassword@123');

    // Accept terms
    await page.check('input[name="acceptTerms"]');

    // Step 3: Submit signup
    await page.click('button:has-text("Sign Up")');
    await page.waitForNavigation();

    // Step 4: Verify email confirmation page
    expect(page.url()).toContain('/verify-email');
    await expect(page.locator('text=Verify your email')).toBeVisible();

    // Step 5: Skip email verification in test
    // Click "Resend" or continue
    const skipLink = page.locator('[data-testid="skip-verification"]');
    if (await skipLink.isVisible()) {
      await skipLink.click();
      await page.waitForNavigation();
    }

    // Step 6: Complete profile setup
    if (page.url().includes('/setup-profile')) {
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="phone"]', '+1234567890');
      await page.click('button:has-text("Continue")');
      await page.waitForNavigation();
    }

    // Step 7: Verify user is on dashboard
    expect(page.url()).toContain('/dashboard');
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
  });

  test('should create, edit, and delete a document through complete workflow', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // Navigate to documents
    await page.click('[data-testid="nav-documents"]');
    expect(page.url()).toContain('/documents');

    // Click create new document
    await page.click('[data-testid="create-document-btn"]');
    await page.waitForNavigation();

    // Fill document details
    const docTitle = `Test Doc ${Date.now()}`;
    await page.fill('input[name="title"]', docTitle);
    await page.fill('textarea[name="content"]', 'This is the document content');
    await page.selectOption('select[name="category"]', 'report');

    // Save document
    await page.click('button:has-text("Save")');
    await page.waitForNavigation();

    // Verify document is created
    expect(page.url()).toContain('/documents/');
    await expect(page.locator(`text=${docTitle}`)).toBeVisible();

    // Edit document
    await page.click('[data-testid="edit-button"]');
    await page.fill('textarea[name="content"]', 'Updated content');
    await page.click('button:has-text("Update")');

    // Verify update
    await expect(page.locator('text=Updated content')).toBeVisible();

    // Delete document
    await page.click('[data-testid="delete-button"]');
    const confirmButton = page.locator('button:has-text("Confirm Delete")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    } else {
      // Handle dialog if present
      await page.on('dialog', dialog => dialog.accept());
      await page.click('[data-testid="delete-button"]');
    }

    // Verify redirect to documents list
    await page.waitForNavigation();
    expect(page.url()).toContain('/documents');

    // Verify document is removed from list
    await expect(page.locator(`text=${docTitle}`)).not.toBeVisible({ timeout: 5000 });
  });

  test('should complete data export workflow', async ({ page, context }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // Navigate to reports
    await page.click('[data-testid="nav-reports"]');
    expect(page.url()).toContain('/reports');

    // Select export format
    await page.selectOption('select[name="format"]', 'pdf');

    // Select date range
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-12-31');

    // Click export
    const downloadPromise = context.waitForEvent('download');
    await page.click('button:has-text("Export")');
    const download = await downloadPromise;

    // Verify download started
    expect(download.suggestedFilename()).toMatch(/\.(pdf|csv|xlsx)$/);
  });

  test('should handle multi-step form workflow with validation', async ({ page }) => {
    await page.goto(`${BASE_URL}/forms/multi-step`);

    // Step 1: Personal Information
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', 'john@example.com');

    const nextButton1 = page.locator('button:has-text("Next")').first();
    await nextButton1.click();

    // Verify step 1 is complete
    await expect(page.locator('text=Step 2 of 3')).toBeVisible();

    // Step 2: Address Information
    await page.fill('input[name="street"]', '123 Main St');
    await page.fill('input[name="city"]', 'New York');
    await page.selectOption('select[name="state"]', 'NY');
    await page.fill('input[name="zip"]', '10001');

    const nextButton2 = page.locator('button:has-text("Next")').nth(1);
    await nextButton2.click();

    // Verify step 2 is complete
    await expect(page.locator('text=Step 3 of 3')).toBeVisible();

    // Step 3: Review and Submit
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=john@example.com')).toBeVisible();

    const submitButton = page.locator('button:has-text("Submit")');
    await submitButton.click();
    await page.waitForNavigation();

    // Verify success
    expect(page.url()).toContain('/success');
    await expect(page.locator('text=Thank you')).toBeVisible();
  });

  test('should handle collaborative workflow with comments', async ({ page }) => {
    // Login user 1
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'user1@example.com');
    await page.fill('input[name="password"]', 'Password@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // Create a document to collaborate on
    await page.click('[data-testid="nav-documents"]');
    await page.click('[data-testid="create-document-btn"]');
    await page.fill('input[name="title"]', 'Collaborative Doc');
    await page.fill('textarea[name="content"]', 'Initial content');
    await page.click('button:has-text("Save")');
    await page.waitForNavigation();

    const docId = page.url().split('/').pop();

    // Add a comment
    await page.click('[data-testid="comments-tab"]');
    await page.fill('[data-testid="comment-input"]', 'Great document!');
    await page.click('button:has-text("Post Comment")');

    // Verify comment appears
    await expect(page.locator('text=Great document!')).toBeVisible();

    // Share document (mock share action)
    await page.click('[data-testid="share-button"]');
    await page.fill('[data-testid="share-email"]', 'user2@example.com');
    await page.click('button:has-text("Share")');

    // Verify share confirmation
    await expect(page.locator('text=Document shared successfully')).toBeVisible();
  });

  test('should handle error recovery in workflow', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);

    await page.goto(`${BASE_URL}/documents`);

    // Attempt action
    const createButton = page.locator('[data-testid="create-document-btn"]');
    if (await createButton.isVisible()) {
      await createButton.click();
    }

    // Should show offline error
    const offlineNotice = page.locator('[data-testid="offline-notice"]');
    await expect(offlineNotice).toBeVisible({ timeout: 2000 });

    // Come back online
    await context.setOffline(false);
    await page.waitForTimeout(1000);

    // Should recover
    const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    if (await loadingSpinner.isVisible()) {
      await loadingSpinner.waitFor({ state: 'hidden' });
    }

    // Should be functional again
    await expect(createButton).toBeEnabled();
  });

  test('should maintain state across browser refresh', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // Navigate to a page with state
    await page.click('[data-testid="nav-settings"]');
    await page.fill('input[name="theme"]', 'dark');
    await page.click('button:has-text("Save Settings")');

    const originalUrl = page.url();

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify state persisted
    expect(page.url()).toContain(originalUrl.split('?')[0]);
    const themeSelect = page.locator('input[name="theme"]');
    const selectedValue = await themeSelect.inputValue();
    expect(selectedValue).toBe('dark');
  });

  test('should complete bulk operations workflow', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // Navigate to documents
    await page.click('[data-testid="nav-documents"]');

    // Select multiple documents
    const checkboxes = page.locator('input[type="checkbox"][data-testid^="select-doc"]');
    const count = await checkboxes.count();

    if (count > 0) {
      // Check first 3 documents
      for (let i = 0; i < Math.min(3, count); i++) {
        await checkboxes.nth(i).check();
      }

      // Open bulk actions menu
      const bulkMenu = page.locator('[data-testid="bulk-actions-menu"]');
      if (await bulkMenu.isVisible()) {
        await bulkMenu.click();

        // Select action (e.g., tag)
        const tagAction = page.locator('[data-testid="bulk-tag-action"]');
        if (await tagAction.isVisible()) {
          await tagAction.click();
          await page.fill('input[name="tag"]', 'important');
          await page.click('button:has-text("Apply")');

          // Verify success
          await expect(page.locator('text=Applied to 3 documents')).toBeVisible();
        }
      }
    }
  });
});
