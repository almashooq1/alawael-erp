// Rehabilitation & Therapy E2E Tests
// Tests disability assessment, rehab programs, and therapy sessions

describe('Rehabilitation & Therapy System', () => {
  beforeEach(() => {
    cy.login(Cypress.env('email') || 'admin@example.com', Cypress.env('password') || 'Admin123!');
  });

  describe('Disability Rehabilitation Dashboard', () => {
    it('should load disability rehab dashboard', () => {
      cy.visit('/disability-rehab-dashboard');
      cy.url().should('include', '/disability-rehab-dashboard');
      cy.get('body', { timeout: 15000 }).should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Assessment Scales', () => {
    it('should load assessment scales page', () => {
      cy.visit('/assessment-scales');
      cy.url().should('include', '/assessment-scales');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should load assessment tests page', () => {
      cy.visit('/assessment-tests');
      cy.url().should('include', '/assessment-tests');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Rehab Programs', () => {
    it('should load rehab programs management', () => {
      cy.visit('/rehab-programs');
      cy.url().should('include', '/rehab-programs');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should load specialized scales library', () => {
      cy.visit('/specialized-scales');
      cy.url().should('include', '/specialized-scales');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should load rehab programs library', () => {
      cy.visit('/rehab-programs-library');
      cy.url().should('include', '/rehab-programs-library');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should load rehab progress tracking', () => {
      cy.visit('/rehab-progress');
      cy.url().should('include', '/rehab-progress');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should load behavior management', () => {
      cy.visit('/behavior-management');
      cy.url().should('include', '/behavior-management');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Therapy Sessions', () => {
    it('should load therapy session admin page', () => {
      cy.visit('/therapy-sessions-admin');
      cy.url().should('include', '/therapy-sessions-admin');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should load sessions management', () => {
      cy.visit('/sessions');
      cy.url().should('include', '/sessions');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should load sessions dashboard', () => {
      cy.visit('/sessions-dashboard');
      cy.url().should('include', '/sessions-dashboard');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Integrated Care', () => {
    it('should load integrated care plans dashboard', () => {
      cy.visit('/integrated-care');
      cy.url().should('include', '/integrated-care');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should load create care plan page', () => {
      cy.visit('/integrated-care/create');
      cy.url().should('include', '/integrated-care/create');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Assistive Devices', () => {
    it('should load assistive devices management', () => {
      cy.visit('/assistive-devices');
      cy.url().should('include', '/assistive-devices');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Disability Reports', () => {
    it('should load disability rehab reports', () => {
      cy.visit('/disability-rehab-reports');
      cy.url().should('include', '/disability-rehab-reports');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });
});
