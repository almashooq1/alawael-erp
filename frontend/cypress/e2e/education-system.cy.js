// Education System E2E Tests
// Tests education module navigation and features

describe('Education System Module', () => {
  beforeEach(() => {
    cy.login(Cypress.env('email') || 'admin@example.com', Cypress.env('password') || 'Admin123!');
  });

  describe('Education Dashboard', () => {
    it('should load education system dashboard', () => {
      cy.visit('/education-system');
      cy.url().should('include', '/education-system');
      cy.get('body', { timeout: 15000 }).should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Academic Year Management', () => {
    it('should load academic years page', () => {
      cy.visit('/education-system/academic-years');
      cy.url().should('include', '/education-system/academic-years');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Subjects', () => {
    it('should load subjects management', () => {
      cy.visit('/education-system/subjects');
      cy.url().should('include', '/education-system/subjects');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Teachers', () => {
    it('should load teachers management', () => {
      cy.visit('/education-system/teachers');
      cy.url().should('include', '/education-system/teachers');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Classrooms', () => {
    it('should load classrooms management', () => {
      cy.visit('/education-system/classrooms');
      cy.url().should('include', '/education-system/classrooms');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Curriculum', () => {
    it('should load curriculum builder', () => {
      cy.visit('/education-system/curriculum');
      cy.url().should('include', '/education-system/curriculum');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Timetable', () => {
    it('should load timetable builder', () => {
      cy.visit('/education-system/timetable');
      cy.url().should('include', '/education-system/timetable');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Exams', () => {
    it('should load exam management', () => {
      cy.visit('/education-system/exams');
      cy.url().should('include', '/education-system/exams');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Gradebook', () => {
    it('should load gradebook page', () => {
      cy.visit('/education-system/gradebook');
      cy.url().should('include', '/education-system/gradebook');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('E-Learning', () => {
    it('should load LMS dashboard', () => {
      cy.visit('/lms');
      cy.url().should('include', '/lms');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Beneficiaries', () => {
    it('should load beneficiaries dashboard', () => {
      cy.visit('/beneficiaries-dashboard');
      cy.url().should('include', '/beneficiaries-dashboard');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should load beneficiaries management', () => {
      cy.visit('/beneficiaries');
      cy.url().should('include', '/beneficiaries');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });

  describe('Students', () => {
    it('should load students dashboard', () => {
      cy.visit('/students-dashboard');
      cy.url().should('include', '/students-dashboard');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should load student management list', () => {
      cy.visit('/student-management');
      cy.url().should('include', '/student-management');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });

    it('should load student registration form', () => {
      cy.visit('/student-registration');
      cy.url().should('include', '/student-registration');
      cy.get('body').should('not.contain', 'حدث خطأ غير متوقع');
    });
  });
});
