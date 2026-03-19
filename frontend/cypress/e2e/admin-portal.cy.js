// Admin Portal E2E Tests
// Tests admin panel, user management, audit logs, and system settings

describe('Admin Portal', () => {
  beforeEach(() => {
    cy.login(Cypress.env('email') || 'admin@example.com', Cypress.env('password') || 'Admin123!');
  });

  describe('Admin Dashboard', () => {
    it('should load admin portal dashboard', () => {
      cy.visit('/admin-portal');
      cy.url().should('include', '/admin-portal');
      cy.get('body', { timeout: 15000 }).should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should load enhanced admin dashboard', () => {
      cy.visit('/admin-portal/enhanced');
      cy.url().should('include', '/admin-portal/enhanced');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should load advanced admin panel', () => {
      cy.visit('/admin-portal/advanced');
      cy.url().should('include', '/admin-portal/advanced');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('User Management', () => {
    it('should load users management page', () => {
      cy.visit('/admin-portal/users');
      cy.url().should('include', '/admin-portal/users');
      cy.get('body', { timeout: 15000 }).should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should display a list or table of users', () => {
      cy.visit('/admin-portal/users');
      cy.get('[class*="MuiTable"], [class*="MuiList"], [class*="MuiDataGrid"], [role="grid"]', {
        timeout: 15000,
      }).should('exist');
    });
  });

  describe('System Settings', () => {
    it('should load system settings page', () => {
      cy.visit('/admin-portal/settings');
      cy.url().should('include', '/admin-portal/settings');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Audit Logs', () => {
    it('should load audit logs page', () => {
      cy.visit('/admin-portal/audit-logs');
      cy.url().should('include', '/admin-portal/audit-logs');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Admin Reports', () => {
    it('should load admin reports page', () => {
      cy.visit('/admin-portal/reports');
      cy.url().should('include', '/admin-portal/reports');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Clinic Management', () => {
    it('should load clinic management page', () => {
      cy.visit('/admin-portal/clinics');
      cy.url().should('include', '/admin-portal/clinics');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Admin Payments', () => {
    it('should load payments & billing page', () => {
      cy.visit('/admin-portal/payments');
      cy.url().should('include', '/admin-portal/payments');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Notifications Management', () => {
    it('should load admin notifications page', () => {
      cy.visit('/admin-portal/notifications');
      cy.url().should('include', '/admin-portal/notifications');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });
});
