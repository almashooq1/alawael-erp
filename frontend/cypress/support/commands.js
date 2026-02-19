// Custom Cypress commands for HR Application
// Usage: cy.login(), cy.createEmployee(), etc.

/**
 * Login command
 * Usage: cy.login('email@example.com', 'password123')
 */
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();

  // Wait for redirect to dashboard
  cy.url().should('include', '/dashboard');
  cy.get('[data-testid="dashboard-title"]').should('be.visible');
});

/**
 * Logout command
 * Usage: cy.logout()
 */
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/login');
});

/**
 * Create employee command
 * Usage: cy.createEmployee({ name: 'John', email: 'john@example.com', ... })
 */
Cypress.Commands.add('createEmployee', employeeData => {
  cy.get('[data-testid="add-employee-button"]').click();

  // Fill form
  if (employeeData.name) {
    cy.get('input[name="name"]').type(employeeData.name);
  }
  if (employeeData.email) {
    cy.get('input[name="email"]').type(employeeData.email);
  }
  if (employeeData.phone) {
    cy.get('input[name="phone"]').type(employeeData.phone);
  }
  if (employeeData.position) {
    cy.get('select[name="position"]').select(employeeData.position);
  }
  if (employeeData.salary) {
    cy.get('input[name="salary"]').type(employeeData.salary);
  }

  // Submit form
  cy.get('button[type="submit"]').click();

  // Wait for success message
  cy.get('[data-testid="success-message"]').should('contain', 'Employee created successfully');
});

/**
 * Search employee command
 * Usage: cy.searchEmployee('john')
 */
Cypress.Commands.add('searchEmployee', searchTerm => {
  cy.get('input[placeholder*="Search"]').type(searchTerm);
  cy.wait(500); // Wait for debounce
});

/**
 * Delete employee command
 * Usage: cy.deleteEmployee('John Doe')
 */
Cypress.Commands.add('deleteEmployee', employeeName => {
  cy.contains('button', 'Delete').click();
  cy.get('button[data-testid="confirm-delete"]').click();
  cy.get('[data-testid="success-message"]').should('contain', 'deleted');
});

/**
 * Request leave command
 * Usage: cy.requestLeave({ startDate: '2026-02-20', days: 5, reason: 'Vacation' })
 */
Cypress.Commands.add('requestLeave', leaveData => {
  cy.get('[data-testid="new-leave-button"]').click();

  if (leaveData.startDate) {
    cy.get('input[name="startDate"]').type(leaveData.startDate);
  }
  if (leaveData.endDate) {
    cy.get('input[name="endDate"]').type(leaveData.endDate);
  }
  if (leaveData.reason) {
    cy.get('textarea[name="reason"]').type(leaveData.reason);
  }

  cy.get('button[type="submit"]').click();
  cy.get('[data-testid="success-message"]').should('be.visible');
});

/**
 * Approve leave command
 * Usage: cy.approveLeave()
 */
Cypress.Commands.add('approveLeave', () => {
  cy.get('[data-testid="approve-button"]').click();
  cy.get('[data-testid="confirm-approve"]').click();
  cy.get('[data-testid="success-message"]').should('contain', 'approved');
});

/**
 * Generate report command
 * Usage: cy.generateReport('payroll')
 */
Cypress.Commands.add('generateReport', reportType => {
  cy.get('[data-testid="reports-tab"]').click();
  cy.get(`[data-testid="generate-${reportType}"]`).click();
  cy.get('[data-testid="report-container"]').should('be.visible');
});

/**
 * Export data command
 * Usage: cy.exportData('csv')
 */
Cypress.Commands.add('exportData', format => {
  cy.get('[data-testid="export-button"]').click();
  cy.contains('button', format.toUpperCase()).click();

  // Verify download starts
  cy.get('[data-testid="success-message"]').should('contain', 'exported');
});

/**
 * Wait for API response
 * Usage: cy.waitForAPI('@getEmployees')
 */
Cypress.Commands.add('waitForAPI', alias => {
  if (alias) {
    return cy.wait(alias);
  }
});

/**
 * Check accessibility
 * Usage: cy.checkA11y()
 */
Cypress.Commands.add('checkA11y', () => {
  // This would require the axe library and @cypress/axe
  cy.window().then(() => {
    // Accessibility checks would go here
  });
});

/**
 * Test responsive behavior
 * Usage: cy.testResponsive('mobile')
 */
Cypress.Commands.add('testResponsive', size => {
  const sizes = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 720 },
  };

  if (sizes[size]) {
    cy.viewport(sizes[size].width, sizes[size].height);
  }
});
