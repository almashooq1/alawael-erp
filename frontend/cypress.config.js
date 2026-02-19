const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    // Base URL for all tests
    baseUrl: 'http://localhost:3000',

    // Viewport size
    viewportWidth: 1280,
    viewportHeight: 720,

    // Test timeout
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,

    // Test configuration
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',

    // Video & Screenshots
    video: true,
    videoCompression: 32,
    screenshotOnRunFailure: true,
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',

    // Logging
    trashAssetsBeforeRuns: true,
    chromeWebSecurity: false,

    // Headless mode
    headless: true,

    // Browser configuration
    browser: 'chrome',

    // Retries for CI
    retries: {
      runMode: 1,
      openMode: 0,
    },

    // Environment variables
    env: {
      apiUrl: 'http://localhost:3000/api',
      adminEmail: 'admin@example.com',
      adminPassword: 'Admin@12345',
      employeeEmail: 'employee@example.com',
      employeePassword: 'Employee@12345',
      managerEmail: 'manager@example.com',
      managerPassword: 'Manager@12345',
    },

    // Setup node events
    setupNodeEvents(on, config) {
      // Implement node event handlers here if needed
    },
  },
});
