// Finance & Accounting E2E Tests
// Tests financial module navigation and core operations

describe('Finance & Accounting Module', () => {
  beforeEach(() => {
    cy.login(Cypress.env('email') || 'admin@example.com', Cypress.env('password') || 'Admin123!');
  });

  describe('Finance Dashboard', () => {
    it('should load the finance dashboard', () => {
      cy.visit('/finance');
      cy.get('body', { timeout: 15000 }).should('not.contain', 'حدث خطأ غير متوقع');
      cy.get('[class*="MuiCard"], [class*="MuiPaper"]').should('exist');
    });
  });

  describe('Accounting Dashboard', () => {
    it('should load the accounting dashboard', () => {
      cy.visit('/accounting');
      cy.get('body', { timeout: 15000 }).should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should navigate to Chart of Accounts', () => {
      cy.visit('/accounting/chart-of-accounts');
      cy.url().should('include', '/accounting/chart-of-accounts');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should navigate to Journal Entries', () => {
      cy.visit('/accounting/journal-entries');
      cy.url().should('include', '/accounting/journal-entries');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should navigate to Invoices', () => {
      cy.visit('/accounting/invoices');
      cy.url().should('include', '/accounting/invoices');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should navigate to Expenses', () => {
      cy.visit('/accounting/expenses');
      cy.url().should('include', '/accounting/expenses');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should navigate to Financial Reports', () => {
      cy.visit('/accounting/reports');
      cy.url().should('include', '/accounting/reports');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should navigate to VAT/Zakat Management', () => {
      cy.visit('/accounting/vat-zakat');
      cy.url().should('include', '/accounting/vat-zakat');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should navigate to General Ledger', () => {
      cy.visit('/accounting/general-ledger');
      cy.url().should('include', '/accounting/general-ledger');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should navigate to Cash Flow Management', () => {
      cy.visit('/accounting/cash-flow');
      cy.url().should('include', '/accounting/cash-flow');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('E-Invoicing', () => {
    it('should load e-invoicing page', () => {
      cy.visit('/e-invoicing');
      cy.url().should('include', '/e-invoicing');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Budget Management', () => {
    it('should load budget management page', () => {
      cy.visit('/budget-management');
      cy.url().should('include', '/budget-management');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });
});
