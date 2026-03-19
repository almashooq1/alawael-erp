// Dashboard & Navigation E2E Tests
// Tests core navigation flows, dashboard loading, and sidebar menu

describe('Dashboard & Navigation', () => {
  beforeEach(() => {
    cy.login(Cypress.env('email') || 'admin@example.com', Cypress.env('password') || 'Admin123!');
  });

  describe('Dashboard Loading', () => {
    it('should load the main dashboard after login', () => {
      cy.url().should('include', '/dashboard');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should display dashboard widgets/cards', () => {
      cy.visit('/dashboard');
      // Wait for lazy-loaded dashboard to render
      cy.get('[class*="MuiCard"], [class*="MuiPaper"], [data-testid*="dashboard"]', {
        timeout: 15000,
      }).should('exist');
    });

    it('should display user info in the header/sidebar', () => {
      cy.get('[data-testid="user-menu"], [class*="MuiAvatar"], [aria-label*="user"]').should(
        'exist'
      );
    });
  });

  describe('Sidebar Navigation', () => {
    it('should navigate to HR module', () => {
      cy.visit('/hr');
      cy.url().should('include', '/hr');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should navigate to Finance module', () => {
      cy.visit('/finance');
      cy.url().should('include', '/finance');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should navigate to Accounting module', () => {
      cy.visit('/accounting');
      cy.url().should('include', '/accounting');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should navigate to Inventory module', () => {
      cy.visit('/inventory');
      cy.url().should('include', '/inventory');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should navigate to Documents module', () => {
      cy.visit('/documents');
      cy.url().should('include', '/documents');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should navigate to Reports module', () => {
      cy.visit('/reports');
      cy.url().should('include', '/reports');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should navigate to Communications module', () => {
      cy.visit('/communications');
      cy.url().should('include', '/communications');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Portal Navigation', () => {
    it('should navigate to Student Portal', () => {
      cy.visit('/student-portal');
      cy.url().should('include', '/student-portal');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should navigate to Therapist Portal', () => {
      cy.visit('/therapist-portal');
      cy.url().should('include', '/therapist-portal');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should navigate to Parent Portal', () => {
      cy.visit('/parent-portal');
      cy.url().should('include', '/parent-portal');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should navigate to Admin Portal', () => {
      cy.visit('/admin-portal');
      cy.url().should('include', '/admin-portal');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('404 Handling', () => {
    it('should show NotFound page for invalid route', () => {
      cy.visit('/this-page-does-not-exist');
      cy.get('body').should('contain', '404').or('contain', 'غير موجودة').or('contain', 'NotFound');
    });
  });

  describe('Session & Auth Guard', () => {
    it('should redirect to login when accessing protected route without auth', () => {
      cy.logout();
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });

    it('should redirect authenticated user away from login page', () => {
      cy.visit('/login');
      cy.url().should('include', '/dashboard').or('include', '/home');
    });
  });
});
