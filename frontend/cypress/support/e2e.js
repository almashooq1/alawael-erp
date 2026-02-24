// Cypress support file - Global setup and custom commands
import './commands';

// Suppress console errors during tests
const app = window.top;

try {
  if (!app.document.head.querySelector('[data-hide-command-log-request]')) {
    const style = app.document.createElement('style');
    style.innerHTML = '.command-name-request, .command-name-xhr { display: none }';
    style.setAttribute('data-hide-command-log-request', '');

    app.document.head.appendChild(style);
  }
} catch (e) {
  // Ignore errors
}

// Reset application state before each test
beforeEach(() => {
  // Clear localStorage
  cy.window().then(win => {
    win.localStorage.clear();
  });

  // Clear session storage
  cy.window().then(win => {
    win.sessionStorage.clear();
  });
});

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false to prevent Cypress from failing the test
  // Log the error instead
  console.error('Uncaught exception:', err);
  return false;
});

// Log network errors
cy.on('fail:screenshot', details => {
  console.error('Screenshot failed:', details);
});
