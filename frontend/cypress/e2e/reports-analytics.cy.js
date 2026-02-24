// Reports & Analytics E2E Tests
// Tests reporting and data analysis features

describe('Reports & Analytics E2E Tests', () => {
  beforeEach(() => {
    // Login as admin/manager
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('Admin@12345');
    cy.get('button[type="submit"]').click();

    // Navigate to reports
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="reports-nav"]').click();
    cy.url().should('include', '/reports');
  });

  describe('Reports Dashboard', () => {
    it('should display reports dashboard', () => {
      cy.get('[data-testid="reports-dashboard"]').should('be.visible');
    });

    it('should display report tabs', () => {
      cy.get('[data-testid="overview-tab"]').should('be.visible');
      cy.get('[data-testid="payroll-tab"]').should('be.visible');
      cy.get('[data-testid="performance-tab"]').should('be.visible');
      cy.get('[data-testid="export-tab"]').should('be.visible');
    });

    it('should display date range selector', () => {
      cy.get('[data-testid="date-from"]').should('be.visible');
      cy.get('[data-testid="date-to"]').should('be.visible');
      cy.get('[data-testid="generate-button"]').should('be.visible');
    });
  });

  describe('Overview Report', () => {
    it('should display overview tab content', () => {
      cy.get('[data-testid="overview-tab"]').click();
      cy.get('[data-testid="overview-content"]').should('be.visible');
    });

    it('should show total employees metric', () => {
      cy.get('[data-testid="overview-tab"]').click();
      cy.get('[data-testid="metric-total-employees"]').should('be.visible');
      cy.get('[data-testid="metric-total-employees"]').should('contain.text', /\d+/);
    });

    it('should show active employees metric', () => {
      cy.get('[data-testid="overview-tab"]').click();
      cy.get('[data-testid="metric-active-employees"]').should('be.visible');
    });

    it('should show new hires this month', () => {
      cy.get('[data-testid="overview-tab"]').click();
      cy.get('[data-testid="metric-new-hires"]').should('be.visible');
    });

    it('should display overview chart', () => {
      cy.get('[data-testid="overview-tab"]').click();
      cy.get('[data-testid="overview-chart"]').should('be.visible');
    });

    it('should show department breakdown', () => {
      cy.get('[data-testid="overview-tab"]').click();
      cy.get('[data-testid="department-breakdown"]').should('be.visible');
      cy.get('[data-testid="department-item"]').should('have.length.greaterThan', 0);
    });
  });

  describe('Payroll Report', () => {
    it('should display payroll tab content', () => {
      cy.get('[data-testid="payroll-tab"]').click();
      cy.get('[data-testid="payroll-content"]').should('be.visible');
    });

    it('should show total payroll amount', () => {
      cy.get('[data-testid="payroll-tab"]').click();
      cy.get('[data-testid="metric-total-payroll"]').should('be.visible');
      cy.get('[data-testid="metric-total-payroll"]').should('contain.text', /[\d,]+/);
    });

    it('should show average salary metric', () => {
      cy.get('[data-testid="payroll-tab"]').click();
      cy.get('[data-testid="metric-avg-salary"]').should('be.visible');
    });

    it('should show payroll trend chart', () => {
      cy.get('[data-testid="payroll-tab"]').click();
      cy.get('[data-testid="payroll-chart"]').should('be.visible');
    });

    it('should display payroll by department', () => {
      cy.get('[data-testid="payroll-tab"]').click();
      cy.get('[data-testid="payroll-table"]').should('be.visible');
      cy.get('[data-testid="payroll-row"]').should('have.length.greaterThan', 0);
    });

    it('should show deduction summary', () => {
      cy.get('[data-testid="payroll-tab"]').click();
      cy.get('[data-testid="deduction-summary"]').should('be.visible');
    });
  });

  describe('Performance Report', () => {
    it('should display performance tab content', () => {
      cy.get('[data-testid="performance-tab"]').click();
      cy.get('[data-testid="performance-content"]').should('be.visible');
    });

    it('should show attendance rate', () => {
      cy.get('[data-testid="performance-tab"]').click();
      cy.get('[data-testid="metric-attendance-rate"]').should('be.visible');
    });

    it('should show leave taken metric', () => {
      cy.get('[data-testid="performance-tab"]').click();
      cy.get('[data-testid="metric-leave-taken"]').should('be.visible');
    });

    it('should show performance by employee', () => {
      cy.get('[data-testid="performance-tab"]').click();
      cy.get('[data-testid="performance-table"]').should('be.visible');
      cy.get('[data-testid="employee-row"]').should('have.length.greaterThan', 0);
    });

    it('should display performance score chart', () => {
      cy.get('[data-testid="performance-tab"]').click();
      cy.get('[data-testid="performance-chart"]').should('be.visible');
    });
  });

  describe('Date Range Selection', () => {
    it('should accept from and to dates', () => {
      cy.get('[data-testid="date-from"]').type('2026-01-01');
      cy.get('[data-testid="date-to"]').type('2026-01-31');

      cy.get('[data-testid="date-from"]').should('have.value', '2026-01-01');
      cy.get('[data-testid="date-to"]').should('have.value', '2026-01-31');
    });

    it('should update report on generate button click', () => {
      cy.get('[data-testid="date-from"]').type('2026-01-01');
      cy.get('[data-testid="date-to"]').type('2026-01-31');
      cy.get('[data-testid="generate-button"]').click();

      cy.wait(1000);
      cy.get('[data-testid="overview-content"]').should('be.visible');
    });

    it('should show error for invalid date range', () => {
      cy.get('[data-testid="date-from"]').type('2026-01-31');
      cy.get('[data-testid="date-to"]').type('2026-01-01'); // From > To
      cy.get('[data-testid="generate-button"]').click();

      cy.get('[data-testid="error-message"]').should('be.visible').and('contain', 'invalid|before');
    });

    it('should use preset date ranges', () => {
      cy.get('[data-testid="preset-this-month"]').click();
      cy.get('[data-testid="generate-button"]').click();

      cy.wait(500);
      cy.get('[data-testid="overview-content"]').should('be.visible');
    });

    it('should use last month preset', () => {
      cy.get('[data-testid="preset-last-month"]').click();
      cy.get('[data-testid="generate-button"]').click();

      cy.wait(500);
      cy.get('[data-testid="overview-content"]').should('be.visible');
    });

    it('should use year to date preset', () => {
      cy.get('[data-testid="preset-ytd"]').click();
      cy.get('[data-testid="generate-button"]').click();

      cy.wait(500);
      cy.get('[data-testid="overview-content"]').should('be.visible');
    });
  });

  describe('Report Filtering', () => {
    it('should filter by department', () => {
      cy.get('[data-testid="overview-tab"]').click();
      cy.get('[data-testid="filter-department"]').select('IT');
      cy.get('[data-testid="apply-filter"]').click();

      cy.wait(500);
      cy.get('[data-testid="overview-content"]').should('be.visible');
    });

    it('should filter by employee status', () => {
      cy.get('[data-testid="overview-tab"]').click();
      cy.get('[data-testid="filter-status"]').select('active');
      cy.get('[data-testid="apply-filter"]').click();

      cy.wait(500);
      cy.get('[data-testid="overview-content"]').should('be.visible');
    });

    it('should apply multiple filters', () => {
      cy.get('[data-testid="overview-tab"]').click();
      cy.get('[data-testid="filter-department"]').select('IT');
      cy.get('[data-testid="filter-status"]').select('active');
      cy.get('[data-testid="apply-filter"]').click();

      cy.wait(500);
      cy.get('[data-testid="overview-content"]').should('be.visible');
    });
  });

  describe('Report Tables', () => {
    it('should display sortable columns', () => {
      cy.get('[data-testid="payroll-tab"]').click();
      cy.get('[data-testid="payroll-header-name"]').click();

      cy.get('[data-testid="payroll-header-name"]').should('have.class', 'sorted');
    });

    it('should sort in ascending order', () => {
      cy.get('[data-testid="payroll-tab"]').click();
      cy.get('[data-testid="payroll-header-salary"]').click();
      cy.get('[data-testid="payroll-header-salary"]').should('have.class', 'asc');
    });

    it('should sort in descending order', () => {
      cy.get('[data-testid="payroll-tab"]').click();
      cy.get('[data-testid="payroll-header-salary"]').click();
      cy.get('[data-testid="payroll-header-salary"]').click();
      cy.get('[data-testid="payroll-header-salary"]').should('have.class', 'desc');
    });

    it('should search in table', () => {
      cy.get('[data-testid="payroll-tab"]').click();
      cy.get('[data-testid="table-search"]').type('Ahmed');
      cy.wait(500);

      cy.get('[data-testid="payroll-row"]').each($row => {
        cy.wrap($row).should('contain', 'Ahmed');
      });
    });
  });

  describe('Report Export', () => {
    it('should display export tab', () => {
      cy.get('[data-testid="export-tab"]').click();
      cy.get('[data-testid="export-content"]').should('be.visible');
    });

    it('should export overview as PDF', () => {
      cy.get('[data-testid="overview-tab"]').click();
      cy.get('[data-testid="export-pdf"]').click();

      cy.get('[data-testid="success-message"]').should('be.visible').and('contain', 'exported');
    });

    it('should export overview as Excel', () => {
      cy.get('[data-testid="overview-tab"]').click();
      cy.get('[data-testid="export-excel"]').click();

      cy.get('[data-testid="success-message"]').should('be.visible').and('contain', 'exported');
    });

    it('should export overview as CSV', () => {
      cy.get('[data-testid="overview-tab"]').click();
      cy.get('[data-testid="export-csv"]').click();

      cy.get('[data-testid="success-message"]').should('be.visible').and('contain', 'exported');
    });

    it('should export payroll report', () => {
      cy.get('[data-testid="payroll-tab"]').click();
      cy.get('[data-testid="export-button"]').click();
      cy.get('[data-testid="export-pdf"]').click();

      cy.get('[data-testid="success-message"]').should('be.visible');
    });

    it('should schedule email export', () => {
      cy.get('[data-testid="export-tab"]').click();
      cy.get('[data-testid="schedule-export"]').click();

      cy.get('[data-testid="schedule-form"]').within(() => {
        cy.get('input[name="email"]').type('hr@example.com');
        cy.get('select[name="frequency"]').select('Monthly');
        cy.get('[data-testid="schedule-button"]').click();
      });

      cy.get('[data-testid="success-message"]').should('contain', 'scheduled');
    });
  });

  describe('Report Charts', () => {
    it('should display interactive overview chart', () => {
      cy.get('[data-testid="overview-tab"]').click();
      cy.get('[data-testid="overview-chart"]')
        .should('be.visible')
        .and('have.length.greaterThan', 0);
    });

    it('should display payroll trend chart', () => {
      cy.get('[data-testid="payroll-tab"]').click();
      cy.get('[data-testid="payroll-chart"]').should('be.visible');
    });

    it('should display performance chart', () => {
      cy.get('[data-testid="performance-tab"]').click();
      cy.get('[data-testid="performance-chart"]').should('be.visible');
    });

    it('should handle chart hover tooltips', () => {
      cy.get('[data-testid="overview-tab"]').click();
      cy.get('[data-testid="chart-bar"]').first().trigger('mouseenter');

      cy.get('[data-testid="chart-tooltip"]').should('be.visible');
    });

    it('should allow chart legend toggle', () => {
      cy.get('[data-testid="payroll-tab"]').click();
      cy.get('[data-testid="chart-legend-item"]').first().click();

      // Series should toggle visibility
      cy.get('[data-testid="chart-series"]').should('have.length.greaterThan', 0);
    });
  });

  describe('Report Scheduling', () => {
    it('should display schedule report button', () => {
      cy.get('[data-testid="schedule-button"]').should('be.visible');
    });

    it('should open schedule report dialog', () => {
      cy.get('[data-testid="schedule-button"]').click();
      cy.get('[data-testid="schedule-dialog"]').should('be.visible');
    });

    it('should schedule weekly report', () => {
      cy.get('[data-testid="schedule-button"]').click();
      cy.get('[data-testid="schedule-dialog"]').within(() => {
        cy.get('input[name="email"]').type('manager@example.com');
        cy.get('select[name="frequency"]').select('Weekly');
        cy.get('select[name="day"]').select('Monday');
        cy.get('[data-testid="schedule-button"]').click();
      });

      cy.get('[data-testid="success-message"]').should('contain', 'scheduled');
    });
  });

  describe('Performance Report Metrics', () => {
    it('should calculate attendance rate correctly', () => {
      cy.get('[data-testid="performance-tab"]').click();

      cy.get('[data-testid="metric-attendance-rate"]').then($rate => {
        const rate = parseFloat($rate.text());
        expect(rate).to.be.greaterThan(0);
        expect(rate).to.be.lessThanOrEqual(100);
      });
    });

    it('should show top performers', () => {
      cy.get('[data-testid="performance-tab"]').click();
      cy.get('[data-testid="top-performers"]').should('be.visible');
      cy.get('[data-testid="performer-item"]').should('have.length.greaterThan', 0);
    });

    it('should show attendance by employee', () => {
      cy.get('[data-testid="performance-tab"]').click();
      cy.get('[data-testid="attendance-table"]').should('be.visible');
      cy.get('[data-testid="attendance-row"]').should('have.length.greaterThan', 0);
    });
  });

  describe('Mobile Report View', () => {
    beforeEach(() => {
      cy.viewport('iphone-x');
    });

    it('should display reports on mobile', () => {
      cy.get('[data-testid="reports-dashboard"]').should('be.visible');
    });

    it('should show stacked tabs on mobile', () => {
      cy.get('[data-testid="tab-buttons"]').should('be.visible');
      cy.get('[data-testid="overview-tab"]').should('be.visible');
    });

    it('should export from mobile view', () => {
      cy.get('[data-testid="overview-tab"]').click();
      cy.get('[data-testid="export-pdf"]').click();

      cy.get('[data-testid="success-message"]').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should handle report generation error', () => {
      cy.intercept('GET', '**/reports/**', {
        statusCode: 500,
        body: { message: 'Report generation failed' },
      });

      cy.get('[data-testid="date-from"]').type('2026-01-01');
      cy.get('[data-testid="date-to"]').type('2026-01-31');
      cy.get('[data-testid="generate-button"]').click();

      cy.get('[data-testid="error-message"]').should('be.visible').and('contain', 'error|failed');
    });

    it('should retry failed report generation', () => {
      cy.get('[data-testid="date-from"]').type('2026-01-01');
      cy.get('[data-testid="date-to"]').type('2026-01-31');
      cy.get('[data-testid="generate-button"]').click();

      cy.get('[data-testid="retry-button"]').click();
      cy.get('[data-testid="overview-content"]').should('be.visible');
    });
  });
});
