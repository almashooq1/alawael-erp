/**
 * End-to-End Testing Suite
 * مجموعة اختبارات شاملة
 *
 * Cypress tests for complete application workflow
 */

describe('Therapeutic Session Management System - E2E Tests', () => {
  const API_URL = Cypress.env('API_URL') || 'http://localhost:3001/api';
  const FRONTEND_URL = Cypress.env('FRONTEND_URL') || 'http://localhost:3000';

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================

  describe('Authentication Flow', () => {
    it('Should allow patient login with valid credentials', () => {
      cy.visit(`${FRONTEND_URL}/login`);
      cy.get('input[name="email"]').type('patient@example.com');
      cy.get('input[name="password"]').type('password123');
      cy.get('button:contains("Sign In")').click();
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy="welcome-message"]').should('contain', 'Welcome');
    });

    it('Should show error for invalid credentials', () => {
      cy.visit(`${FRONTEND_URL}/login`);
      cy.get('input[name="email"]').type('invalid@example.com');
      cy.get('input[name="password"]').type('wrongpassword');
      cy.get('button:contains("Sign In")').click();
      cy.get('[data-cy="error-message"]').should('be.visible');
    });

    it('Should allow new patient registration', () => {
      cy.visit(`${FRONTEND_URL}/register`);
      cy.get('input[name="firstName"]').type('John');
      cy.get('input[name="lastName"]').type('Doe');
      cy.get('input[name="email"]').type(`patient${Date.now()}@example.com`);
      cy.get('input[name="password"]').type('SecurePass123!');
      cy.get('input[name="confirmPassword"]').type('SecurePass123!');
      cy.get('button:contains("Register")').click();
      cy.url().should('include', '/dashboard');
    });

    it('Should allow therapist login', () => {
      cy.visit(`${FRONTEND_URL}/login`);
      cy.get('input[name="email"]').type('therapist@example.com');
      cy.get('input[name="password"]').type('password123');
      cy.get('button:contains("Sign In")').click();
      cy.url().should('include', '/therapist-dashboard');
    });

    it('Should maintain session across page refreshes', () => {
      cy.login('patient@example.com', 'password123');
      cy.reload();
      cy.get('[data-cy="user-profile"]').should('be.visible');
    });

    it('Should logout successfully', () => {
      cy.login('patient@example.com', 'password123');
      cy.get('[data-cy="logout-button"]').click();
      cy.url().should('include', '/login');
    });
  });

  // ============================================
  // PATIENT DASHBOARD TESTS
  // ============================================

  describe('Patient Dashboard', () => {
    beforeEach(() => {
      cy.login('patient@example.com', 'password123');
    });

    it('Should display upcoming sessions', () => {
      cy.get('[data-cy="upcoming-sessions"]').should('be.visible');
      cy.get('[data-cy="session-card"]').should('have.length.greaterThan', 0);
    });

    it('Should show progress metrics', () => {
      cy.get('[data-cy="progress-percentage"]').should('be.visible');
      cy.get('[data-cy="satisfaction-rating"]').should('contain', '/');
    });

    it('Should allow patient to view session details', () => {
      cy.get('[data-cy="session-card"]').first().click();
      cy.url().should('include', '/session-detail');
      cy.get('[data-cy="session-info"]').should('be.visible');
    });

    it('Should allow patient to cancel session', () => {
      cy.get('[data-cy="session-card"]').first().within(() => {
        cy.get('[data-cy="cancel-button"]').click();
      });
      cy.get('[data-cy="confirmation-dialog"]').should('be.visible');
      cy.get('button:contains("Confirm")').click();
      cy.get('[data-cy="success-message"]').should('contain', 'cancelled');
    });

    it('Should display goals progress timeline', () => {
      cy.get('[data-cy="goals-timeline"]').should('be.visible');
      cy.get('[data-cy="goal-item"]').should('have.length.greaterThan', 0);
    });

    it('Should allow patient to provide session feedback', () => {
      cy.get('[data-cy="session-card"]').first().click();
      cy.get('[data-cy="rate-session"]').click();
      cy.get('[data-cy="rating-stars"] svg').eq(4).click(); // 5 stars
      cy.get('textarea[name="feedback"]').type('Great session!');
      cy.get('button:contains("Submit")').click();
      cy.get('[data-cy="success-message"]').should('be.visible');
    });
  });

  // ============================================
  // THERAPIST DASHBOARD TESTS
  // ============================================

  describe('Therapist Dashboard', () => {
    beforeEach(() => {
      cy.login('therapist@example.com', 'password123');
    });

    it('Should display therapist schedule', () => {
      cy.get('[data-cy="therapist-schedule"]').should('be.visible');
      cy.get('[data-cy="schedule-day"]').should('have.length', 7);
    });

    it('Should show patient list with active sessions', () => {
      cy.get('[data-cy="patients-list"]').should('be.visible');
      cy.get('[data-cy="patient-item"]').should('have.length.greaterThan', 0);
    });

    it('Should allow therapist to document session', () => {
      cy.get('[data-cy="session-card"]').first().click();
      cy.get('[data-cy="document-button"]').click();
      cy.get('textarea[name="subjective"]').type('Patient reported good progress');
      cy.get('textarea[name="objective"]').type('Patient demonstrated improved range of motion');
      cy.get('textarea[name="assessment"]').type('Patient responding well to treatment');
      cy.get('textarea[name="plan"]').type('Continue current therapy plan');
      cy.get('button:contains("Save Documentation")').click();
      cy.get('[data-cy="success-message"]').should('be.visible');
    });

    it('Should allow schedule updates', () => {
      cy.get('[data-cy="edit-availability"]').click();
      cy.get('input[name="startTime"]').type('09:00');
      cy.get('input[name="endTime"]').type('17:00');
      cy.get('[data-cy="add-break"]').click();
      cy.get('input[name="breakStart"]').type('12:00');
      cy.get('input[name="breakEnd"]').type('13:00');
      cy.get('button:contains("Save Schedule")').click();
      cy.get('[data-cy="success-message"]').should('be.visible');
    });

    it('Should display therapist performance metrics', () => {
      cy.get('[data-cy="performance-section"]').should('be.visible');
      cy.get('[data-cy="completion-rate"]').should('contain', '%');
      cy.get('[data-cy="avg-rating"]').should('contain', '/');
    });
  });

  // ============================================
  // SESSION BOOKING FLOW TESTS
  // ============================================

  describe('Session Booking Flow', () => {
    beforeEach(() => {
      cy.login('patient@example.com', 'password123');
    });

    it('Should allow patient to book a new session', () => {
      cy.get('[data-cy="book-session"]').click();
      cy.get('select[name="therapist"]').select('therapist-123');
      cy.get('input[name="date"]').type('02/20/2026');
      cy.get('select[name="time"]').select('10:00');
      cy.get('select[name="duration"]').select('60');
      cy.get('button:contains("Confirm Booking")').click();
      cy.get('[data-cy="booking-confirmation"]').should('be.visible');
    });

    it('Should show available time slots', () => {
      cy.get('[data-cy="book-session"]').click();
      cy.get('select[name="therapist"]').select('therapist-123');
      cy.get('input[name="date"]').type('02/20/2026');
      cy.get('[data-cy="available-slots"]').should('be.visible');
      cy.get('[data-cy="time-slot"]').should('have.length.greaterThan', 0);
    });

    it('Should prevent double booking', () => {
      // Book first session
      cy.get('[data-cy="book-session"]').click();
      cy.get('select[name="therapist"]').select('therapist-123');
      cy.get('input[name="date"]').type('02/20/2026');
      cy.get('select[name="time"]').select('10:00');
      cy.get('button:contains("Confirm Booking")').click();

      // Try to book conflicting session
      cy.get('[data-cy="book-session"]').click();
      cy.get('select[name="therapist"]').select('therapist-123');
      cy.get('input[name="date"]').type('02/20/2026');
      cy.get('[data-cy="time-slot"]').contains('10:00').should('be.disabled');
    });
  });

  // ============================================
  // SESSION DOCUMENTATION TESTS
  // ============================================

  describe('Session Documentation', () => {
    beforeEach(() => {
      cy.login('therapist@example.com', 'password123');
    });

    it('Should create SOAP documentation', () => {
      cy.get('[data-cy="new-documentation"]').click();
      cy.get('select[name="patient"]').select('patient-123');
      cy.get('textarea[name="subjective"]').type('Patient improvements noted');
      cy.get('textarea[name="objective"]').type('Measurements improved by 15%');
      cy.get('textarea[name="assessment"]').type('Assessment shows good progress');
      cy.get('textarea[name="plan"]').type('Continue therapy with increased intensity');
      cy.get('button:contains("Save")').click();
      cy.get('[data-cy="success-message"]').should('contain', 'Documentation saved');
    });

    it('Should validate required SOAP fields', () => {
      cy.get('[data-cy="new-documentation"]').click();
      cy.get('select[name="patient"]').select('patient-123');
      cy.get('button:contains("Save")').click();
      cy.get('[data-cy="error-message"]').should('be.visible');
    });
  });

  // ============================================
  // QUALITY REVIEW TESTS
  // ============================================

  describe('Quality Review Process', () => {
    beforeEach(() => {
      cy.login('supervisor@example.com', 'password123');
    });

    it('Should display pending documentation for review', () => {
      cy.get('[data-cy="quality-review"]').click();
      cy.get('[data-cy="pending-tab"]').click();
      cy.get('[data-cy="documentation-item"]').should('have.length.greaterThan', 0);
    });

    it('Should allow documentation approval', () => {
      cy.get('[data-cy="quality-review"]').click();
      cy.get('[data-cy="pending-tab"]').click();
      cy.get('[data-cy="documentation-item"]').first().click();
      cy.get('[data-cy="quality-score"]').should('be.visible');
      cy.get('[data-cy="stars"] svg').eq(4).click(); // 5 stars
      cy.get('select[name="status"]').select('Approved');
      cy.get('button:contains("Submit Review")').click();
      cy.get('[data-cy="success-message"]').should('contain', 'Review submitted');
    });

    it('Should track review metrics', () => {
      cy.get('[data-cy="quality-dashboard"]').should('be.visible');
      cy.get('[data-cy="approval-rate"]').should('be.visible');
      cy.get('[data-cy="avg-quality-score"]').should('be.visible');
    });
  });

  // ============================================
  // ANALYTICS TESTS
  // ============================================

  describe('Analytics Dashboard', () => {
    beforeEach(() => {
      cy.login('admin@example.com', 'password123');
    });

    it('Should display KPI cards', () => {
      cy.get('[data-cy="analytics"]').click();
      cy.get('[data-cy="kpi-total-sessions"]').should('be.visible');
      cy.get('[data-cy="kpi-completion-rate"]').should('be.visible');
      cy.get('[data-cy="kpi-satisfaction"]').should('be.visible');
    });

    it('Should show trends chart', () => {
      cy.get('[data-cy="analytics"]').click();
      cy.get('[data-cy="trends-tab"]').click();
      cy.get('[data-cy="trends-chart"]').should('be.visible');
    });

    it('Should filter analytics by date range', () => {
      cy.get('[data-cy="analytics"]').click();
      cy.get('select[name="dateRange"]').select('month');
      cy.get('[data-cy="refresh-analytics"]').click();
      cy.get('[data-cy="kpi-total-sessions"]').should('be.visible');
    });

    it('Should export reports', () => {
      cy.get('[data-cy="analytics"]').click();
      cy.get('[data-cy="export-button"]').click();
      cy.get('[data-cy="export-format"]').select('pdf');
      cy.get('[data-cy="confirm-export"]').click();
      cy.readFile('cypress/downloads/report.pdf').should('exist');
    });
  });

  // ============================================
  // NOTIFICATION TESTS
  // ============================================

  describe('Notifications', () => {
    beforeEach(() => {
      cy.login('patient@example.com', 'password123');
    });

    it('Should receive session reminders', () => {
      cy.get('[data-cy="notifications"]').click();
      cy.get('[data-cy="notification-item"]').filter(':contains("Session reminder")').should('exist');
    });

    it('Should mark notification as read', () => {
      cy.get('[data-cy="notifications"]').click();
      cy.get('[data-cy="unread-notification"]').first().click();
      cy.get('[data-cy="mark-read"]').click();
      cy.get('[data-cy="unread-notification"]').should('have.length.lessThan', 2);
    });
  });

  // ============================================
  // TELEHEALTH TESTS
  // ============================================

  describe('Telehealth Sessions', () => {
    beforeEach(() => {
      cy.login('patient@example.com', 'password123');
    });

    it('Should allow patient to join telehealth session', () => {
      cy.get('[data-cy="upcoming-sessions"]').within(() => {
        cy.get('[data-cy="telehealth-badge"]').first().parent().within(() => {
          cy.get('[data-cy="join-button"]').click();
        });
      });
      cy.get('[data-cy="video-room"]').should('be.visible');
      cy.get('[data-cy="local-video"]').should('be.visible');
    });

    it('Should display vital signs during session', () => {
      cy.get('[data-cy="upcoming-sessions"]').within(() => {
        cy.get('[data-cy="join-button"]').first().click();
      });
      cy.get('[data-cy="vitals-monitor"]').should('be.visible');
      cy.get('[data-cy="heart-rate"]').should('contain', 'bpm');
    });
  });

  // ============================================
  // BILLING TESTS
  // ============================================

  describe('Billing & Insurance', () => {
    beforeEach(() => {
      cy.login('admin@example.com', 'password123');
    });

    it('Should display unpaid invoices', () => {
      cy.get('[data-cy="billing"]').click();
      cy.get('[data-cy="invoice-table"]').should('be.visible');
      cy.get('[data-cy="unpaid-badge"]').should('exist');
    });

    it('Should allow insurance claim submission', () => {
      cy.get('[data-cy="billing"]').click();
      cy.get('[data-cy="unpaid-invoice"]').first().click();
      cy.get('[data-cy="submit-claim"]').click();
      cy.get('[data-cy="success-message"]').should('contain', 'Claim submitted');
    });
  });

  // ============================================
  // PERFORMANCE TESTS
  // ============================================

  describe('Performance', () => {
    it('Should load dashboard in under 3 seconds', () => {
      cy.login('patient@example.com', 'password123');
      cy.get('[data-cy="dashboard"]').should('be.visible');
      cy.window().then(win => {
        expect(win.performance.timing.loadEventEnd - win.performance.timing.navigationStart).to.be.lessThan(3000);
      });
    });

    it('Should handle large data sets efficiently', () => {
      cy.login('admin@example.com', 'password123');
      cy.get('[data-cy="analytics"]').click();
      cy.get('select[name="dateRange"]').select('year');
      cy.get('[data-cy="refresh-analytics"]').click();
      cy.get('[data-cy="trends-chart"]').should('be.visible');
      cy.get('[data-cy="loading-spinner"]').should('not.exist');
    });
  });
});

// ============================================
// CUSTOM COMMANDS
// ============================================

Cypress.Commands.add('login', (email, password) => {
  cy.request('POST', `${API_URL}/auth/login`, {
    email,
    password
  }).then(response => {
    localStorage.setItem('userToken', response.body.token);
    localStorage.setItem('user', JSON.stringify(response.body.user));
  });
  cy.visit('http://localhost:3000/dashboard');
});
