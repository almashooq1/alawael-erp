// Payroll Management E2E Tests
// Tests payroll processing, transfers, and exports

describe('Payroll Management E2E Tests', () => {
  beforeEach(() => {
    // Login as HR/Admin
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('Admin@12345');
    cy.get('button[type="submit"]').click();

    // Navigate to payroll
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="payroll-nav"]').click();
    cy.url().should('include', '/payroll');
  });

  describe('View Payroll Dashboard', () => {
    it('should display payroll dashboard on load', () => {
      cy.get('[data-testid="payroll-dashboard"]').should('be.visible');
    });

    it('should display current month/year', () => {
      cy.get('[data-testid="current-month"]').should('be.visible');
    });

    it('should display payroll summary cards', () => {
      cy.get('[data-testid="summary-card-total"]').should('be.visible');
      cy.get('[data-testid="summary-card-processed"]').should('be.visible');
      cy.get('[data-testid="summary-card-pending"]').should('be.visible');
      cy.get('[data-testid="summary-card-failed"]').should('be.visible');
    });

    it('should display payroll table', () => {
      cy.get('[data-testid="payroll-table"]').should('be.visible');
      cy.get('[data-testid="payroll-row"]').should('have.length.greaterThan', 0);
    });
  });

  describe('Month Selection', () => {
    it('should change payroll month', () => {
      cy.get('[data-testid="month-selector"]').click();
      cy.get('[data-testid="month-option-January"]').click();
      cy.wait(500);

      cy.get('[data-testid="current-month"]').should('contain', 'January');
    });

    it('should update payroll data on month change', () => {
      const initialTotal = cy.get('[data-testid="summary-card-total"]').text();

      cy.get('[data-testid="month-selector"]').click();
      cy.get('[data-testid="month-option-December"]').click();
      cy.wait(500);

      cy.get('[data-testid="summary-card-total"]').text().should('exist');
    });

    it('should navigate to previous month', () => {
      cy.get('[data-testid="prev-month-button"]').click();
      cy.wait(500);

      cy.get('[data-testid="payroll-table"]').should('be.visible');
    });

    it('should navigate to next month', () => {
      cy.get('[data-testid="next-month-button"]').click();
      cy.wait(500);

      cy.get('[data-testid="payroll-table"]').should('be.visible');
    });
  });

  describe('Payroll Processing', () => {
    it('should display process payroll button', () => {
      cy.get('[data-testid="process-payroll-button"]')
        .should('be.visible')
        .and('contain', 'Process Payroll');
    });

    it('should show confirmation dialog for payroll processing', () => {
      cy.get('[data-testid="process-payroll-button"]').click();

      cy.get('[data-testid="confirm-process"]').should('be.visible');
      cy.get('[data-testid="confirm-process"]').should('contain', 'Are you sure');
    });

    it('should cancel payroll processing', () => {
      cy.get('[data-testid="process-payroll-button"]').click();
      cy.get('[data-testid="confirm-process"]').within(() => {
        cy.get('[data-testid="cancel-button"]').click();
      });

      cy.get('[data-testid="confirm-process"]').should('not.exist');
    });

    it('should successfully process payroll', () => {
      cy.get('[data-testid="process-payroll-button"]').click();
      cy.get('[data-testid="confirm-process"]').within(() => {
        cy.get('[data-testid="confirm-button"]').click();
      });

      cy.get('[data-testid="success-message"]')
        .should('be.visible')
        .and('contain', 'Payroll processed');

      // Verify status updated
      cy.get('[data-testid="summary-card-processed"]').should('contain.text', /\d+/);
    });

    it('should show loading indicator during processing', () => {
      cy.get('[data-testid="process-payroll-button"]').click();
      cy.get('[data-testid="confirm-process"]').within(() => {
        cy.get('[data-testid="confirm-button"]').click();
      });

      cy.get('[data-testid="loading-spinner"]').should('be.visible');
    });
  });

  describe('Payroll Table Operations', () => {
    it('should display employee payroll details', () => {
      cy.get('[data-testid="payroll-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="employee-name"]').should('not.be.empty');
          cy.get('[data-testid="base-salary"]').should('not.be.empty');
          cy.get('[data-testid="deductions"]').should('not.be.empty');
          cy.get('[data-testid="net-salary"]').should('not.be.empty');
        });
    });

    it('should calculate net salary correctly', () => {
      cy.get('[data-testid="payroll-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="base-salary"]').then($salary => {
            const baseSalary = parseFloat($salary.text());

            cy.get('[data-testid="deductions"]').then($deductions => {
              const deductions = parseFloat($deductions.text());

              cy.get('[data-testid="net-salary"]').then($net => {
                const netSalary = parseFloat($net.text());
                expect(netSalary).to.equal(baseSalary - deductions);
              });
            });
          });
        });
    });

    it('should display payroll status', () => {
      cy.get('[data-testid="payroll-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="payroll-status"]').should('not.be.empty');
        });
    });

    it('should sort table by column', () => {
      cy.get('[data-testid="payroll-header-salary"]').click();
      cy.wait(500);

      // Verify sorting indicator
      cy.get('[data-testid="payroll-header-salary"]').should('have.class', 'sorted');
    });
  });

  describe('Bank Transfer', () => {
    it('should display bank transfer button', () => {
      cy.get('[data-testid="bank-transfer-button"]')
        .should('be.visible')
        .and('contain', 'Bank Transfer');
    });

    it('should show bank transfer confirmation', () => {
      cy.get('[data-testid="bank-transfer-button"]').click();

      cy.get('[data-testid="confirm-transfer"]').should('be.visible');
      cy.get('[data-testid="confirm-transfer"]').should('contain', 'Bank Account');
    });

    it('should initiate bank transfer', () => {
      cy.get('[data-testid="bank-transfer-button"]').click();
      cy.get('[data-testid="confirm-transfer"]').within(() => {
        cy.get('[data-testid="confirm-button"]').click();
      });

      cy.get('[data-testid="success-message"]').should('be.visible').and('contain', 'transferred');
    });
  });

  describe('CSV Export', () => {
    it('should display export button', () => {
      cy.get('[data-testid="export-button"]').should('be.visible').and('contain', 'Export');
    });

    it('should export payroll as CSV', () => {
      cy.get('[data-testid="export-button"]').click();
      cy.get('[data-testid="export-csv"]').click();

      cy.get('[data-testid="success-message"]').should('be.visible').and('contain', 'exported');
    });

    it('should export payroll as Excel', () => {
      cy.get('[data-testid="export-button"]').click();
      cy.get('[data-testid="export-excel"]').click();

      cy.get('[data-testid="success-message"]').should('be.visible').and('contain', 'exported');
    });

    it('should export payroll as PDF', () => {
      cy.get('[data-testid="export-button"]').click();
      cy.get('[data-testid="export-pdf"]').click();

      cy.get('[data-testid="success-message"]').should('be.visible').and('contain', 'exported');
    });
  });

  describe('Payroll Search & Filter', () => {
    it('should search payroll by employee name', () => {
      cy.get('[data-testid="search-input"]').type('Ahmed');
      cy.wait(500);

      cy.get('[data-testid="payroll-row"]').each($row => {
        cy.wrap($row).should('contain', 'Ahmed');
      });
    });

    it('should filter payroll by status', () => {
      cy.get('[data-testid="filter-status"]').select('processed');
      cy.wait(500);

      cy.get('[data-testid="payroll-row"]').each($row => {
        cy.wrap($row).should('contain', 'Processed');
      });
    });

    it('should filter by department', () => {
      cy.get('[data-testid="filter-department"]').select('IT');
      cy.wait(500);

      cy.get('[data-testid="payroll-row"]').should('have.length.greaterThan', 0);
    });
  });

  describe('Payroll History', () => {
    it('should display previous payroll records', () => {
      cy.get('[data-testid="date-range-from"]').should('be.visible');
      cy.get('[data-testid="date-range-to"]').should('be.visible');
    });

    it('should retrieve historical payroll data', () => {
      cy.get('[data-testid="date-range-from"]').type('01/01/2026');
      cy.get('[data-testid="date-range-to"]').type('01/31/2026');
      cy.get('[data-testid="filter-button"]').click();

      cy.wait(500);
      cy.get('[data-testid="payroll-row"]').should('have.length.greaterThan', 0);
    });
  });

  describe('Deductions & Allowances', () => {
    it('should display deduction details', () => {
      cy.get('[data-testid="payroll-row"]').first().click();

      cy.get('[data-testid="deduction-details"]').should('be.visible');
      cy.get('[data-testid="deduction-item"]').should('have.length.greaterThan', 0);
    });

    it('should display allowance details', () => {
      cy.get('[data-testid="payroll-row"]').first().click();

      cy.get('[data-testid="allowance-details"]').should('be.visible');
      cy.get('[data-testid="allowance-item"]').should('have.length.greaterThan', 0);
    });

    it('should calculate correct total deductions', () => {
      cy.get('[data-testid="payroll-row"]').first().click();

      cy.get('[data-testid="deduction-item"]').then($items => {
        let total = 0;
        $items.each((index, item) => {
          const amount = parseFloat(cy.wrap(item).find('[data-testid="amount"]').text());
          total += amount;
        });

        cy.get('[data-testid="total-deductions"]').then($total => {
          expect(parseFloat($total.text())).to.equal(total);
        });
      });
    });
  });

  describe('Payroll Approvals', () => {
    it('should show approval status', () => {
      cy.get('[data-testid="payroll-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="approval-status"]').should('not.be.empty');
        });
    });

    it('should allow manager to approve payroll', () => {
      // Logout and login as manager
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      cy.visit('/login');
      cy.get('input[name="email"]').type('manager@example.com');
      cy.get('input[name="password"]').type('Manager@12345');
      cy.get('button[type="submit"]').click();

      cy.get('[data-testid="payroll-nav"]').click();

      cy.get('[data-testid="payroll-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="approve-button"]').should('be.visible');
          cy.get('[data-testid="approve-button"]').click();
        });

      cy.get('[data-testid="success-message"]').should('contain', 'approved');
    });
  });

  describe('Payroll Error Handling', () => {
    it('should show error for processing already processed payroll', () => {
      // Process payroll first
      cy.get('[data-testid="process-payroll-button"]').click();
      cy.get('[data-testid="confirm-process"]').within(() => {
        cy.get('[data-testid="confirm-button"]').click();
      });
      cy.get('[data-testid="success-message"]').should('be.visible');

      // Try to process again
      cy.get('[data-testid="process-payroll-button"]').click();
      cy.get('[data-testid="confirm-process"]').within(() => {
        cy.get('[data-testid="confirm-button"]').click();
      });

      cy.get('[data-testid="error-message"]').should(
        'contain',
        'already processed|already|duplicate'
      );
    });

    it('should handle network error during processing', () => {
      // Simulate network error
      cy.intercept('POST', '**/payroll/process', {
        statusCode: 500,
        body: { message: 'Server error' },
      });

      cy.get('[data-testid="process-payroll-button"]').click();
      cy.get('[data-testid="confirm-process"]').within(() => {
        cy.get('[data-testid="confirm-button"]').click();
      });

      cy.get('[data-testid="error-message"]').should('be.visible').and('contain', 'error|failed');
    });
  });

  describe('Mobile View', () => {
    beforeEach(() => {
      cy.viewport('iphone-x');
    });

    it('should display responsive payroll table on mobile', () => {
      cy.get('[data-testid="payroll-dashboard"]').should('be.visible');
      cy.get('[data-testid="payroll-table"]').should('be.visible');
    });

    it('should show summary cards on mobile', () => {
      cy.get('[data-testid="summary-card-total"]').should('be.visible');
      cy.get('[data-testid="summary-card-processed"]').should('be.visible');
    });
  });
});
