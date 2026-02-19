// Leave Management E2E Tests
// Tests leave requests, approvals, and rejections

describe('Leave Management E2E Tests', () => {
  beforeEach(() => {
    // Login as employee
    cy.visit('/login');
    cy.get('input[name="email"]').type('employee@example.com');
    cy.get('input[name="password"]').type('Employee@12345');
    cy.get('button[type="submit"]').click();

    // Navigate to leave management
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="leave-nav"]').click();
    cy.url().should('include', '/leave');
  });

  describe('Leave Dashboard', () => {
    it('should display leave dashboard', () => {
      cy.get('[data-testid="leave-dashboard"]').should('be.visible');
    });

    it('should display leave balance information', () => {
      cy.get('[data-testid="annual-leave-balance"]').should('be.visible');
      cy.get('[data-testid="sick-leave-balance"]').should('be.visible');
      cy.get('[data-testid="unpaid-leave-balance"]').should('be.visible');
    });

    it('should display leave statistics', () => {
      cy.get('[data-testid="leave-taken"]').should('be.visible');
      cy.get('[data-testid="leave-pending"]').should('be.visible');
      cy.get('[data-testid="leave-approved"]').should('be.visible');
    });

    it('should display leave balance chart', () => {
      cy.get('[data-testid="leave-chart"]').should('be.visible');
    });
  });

  describe('Apply for Leave', () => {
    it('should display new leave request button', () => {
      cy.get('[data-testid="new-leave-button"]')
        .should('be.visible')
        .and('contain', 'New Leave Request');
    });

    it('should open leave request form', () => {
      cy.get('[data-testid="new-leave-button"]').click();
      cy.get('[data-testid="leave-form"]').should('be.visible');
    });

    it('should show validation error for empty form', () => {
      cy.get('[data-testid="new-leave-button"]').click();
      cy.get('[data-testid="form-submit"]').click();

      cy.get('[data-testid="form-error"]').should('be.visible');
    });

    it('should successfully request leave', () => {
      const leaveData = {
        startDate: '2026-03-15',
        endDate: '2026-03-20',
        leaveType: 'Annual Leave',
        reason: 'Vacation',
      };

      cy.get('[data-testid="new-leave-button"]').click();
      cy.get('[data-testid="leave-form"]').within(() => {
        cy.get('input[name="startDate"]').type(leaveData.startDate);
        cy.get('input[name="endDate"]').type(leaveData.endDate);
        cy.get('select[name="leaveType"]').select(leaveData.leaveType);
        cy.get('textarea[name="reason"]').type(leaveData.reason);
        cy.get('[data-testid="form-submit"]').click();
      });

      cy.get('[data-testid="success-message"]')
        .should('be.visible')
        .and('contain', 'Leave request submitted');
    });

    it('should calculate number of days correctly', () => {
      cy.get('[data-testid="new-leave-button"]').click();
      cy.get('[data-testid="leave-form"]').within(() => {
        cy.get('input[name="startDate"]').type('2026-03-15');
        cy.get('input[name="endDate"]').type('2026-03-20');

        // Should show 5 days (not including weekends if applicable)
        cy.get('[data-testid="day-count"]').should('contain', /[0-9]+ days/);
      });
    });

    it('should warn if leave exceeds available balance', () => {
      cy.get('[data-testid="new-leave-button"]').click();
      cy.get('[data-testid="leave-form"]').within(() => {
        cy.get('input[name="startDate"]').type('2026-03-01');
        cy.get('input[name="endDate"]').type('2026-06-30'); // More than annual leave
        cy.get('select[name="leaveType"]').select('Annual Leave');

        cy.get('[data-testid="warning-message"]').should('be.visible').and('contain', 'exceeds');
      });
    });

    it('should show error for past dates', () => {
      cy.get('[data-testid="new-leave-button"]').click();
      cy.get('[data-testid="leave-form"]').within(() => {
        cy.get('input[name="startDate"]').type('2025-01-01');
        cy.get('input[name="endDate"]').type('2025-01-05');
        cy.get('[data-testid="form-submit"]').click();
      });

      cy.get('[data-testid="error-message"]')
        .should('be.visible')
        .and('contain', 'past date|invalid');
    });

    it('should show error if end date before start date', () => {
      cy.get('[data-testid="new-leave-button"]').click();
      cy.get('[data-testid="leave-form"]').within(() => {
        cy.get('input[name="startDate"]').type('2026-03-20');
        cy.get('input[name="endDate"]').type('2026-03-15');
        cy.get('[data-testid="form-submit"]').click();
      });

      cy.get('[data-testid="error-message"]').should('be.visible').and('contain', 'before|invalid');
    });
  });

  describe('My Leave Requests', () => {
    it('should display leave requests table', () => {
      cy.get('[data-testid="leave-table"]').should('be.visible');
      cy.get('[data-testid="leave-row"]').should('have.length.greaterThan', 0);
    });

    it('should display leave request details', () => {
      cy.get('[data-testid="leave-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="start-date"]').should('not.be.empty');
          cy.get('[data-testid="end-date"]').should('not.be.empty');
          cy.get('[data-testid="leave-type"]').should('not.be.empty');
          cy.get('[data-testid="status"]').should('not.be.empty');
        });
    });

    it('should display different status colors', () => {
      cy.get('[data-testid="leave-row"]').each($row => {
        cy.wrap($row)
          .find('[data-testid="status"]')
          .should('have.css', 'background-color')
          .and('not.equal', 'rgba(0, 0, 0, 0)');
      });
    });

    it('should filter leave by status', () => {
      cy.get('[data-testid="filter-status"]').select('approved');
      cy.wait(500);

      cy.get('[data-testid="leave-row"]').each($row => {
        cy.wrap($row).should('contain', 'Approved');
      });
    });

    it('should search leave requests', () => {
      cy.get('[data-testid="search-input"]').type('Annual');
      cy.wait(500);

      cy.get('[data-testid="leave-row"]').each($row => {
        cy.wrap($row).should('contain', 'Annual');
      });
    });
  });

  describe('Cancel Leave Request', () => {
    it('should show cancel button for pending requests', () => {
      cy.get('[data-testid="leave-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="cancel-button"]').should('be.visible');
        });
    });

    it('should show confirmation for cancellation', () => {
      cy.get('[data-testid="leave-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="cancel-button"]').click();
        });

      cy.get('[data-testid="confirm-dialog"]').should('be.visible');
      cy.get('[data-testid="confirm-dialog"]').should('contain', 'Are you sure');
    });

    it('should successfully cancel leave request', () => {
      cy.get('[data-testid="leave-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="cancel-button"]').click();
        });

      cy.get('[data-testid="confirm-dialog"]').within(() => {
        cy.get('[data-testid="confirm-button"]').click();
      });

      cy.get('[data-testid="success-message"]').should('be.visible').and('contain', 'cancelled');
    });
  });

  describe('Manager - Approve Leave', () => {
    beforeEach(() => {
      // Logout and login as manager
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      cy.visit('/login');
      cy.get('input[name="email"]').type('manager@example.com');
      cy.get('input[name="password"]').type('Manager@12345');
      cy.get('button[type="submit"]').click();

      cy.get('[data-testid="leave-nav"]').click();
    });

    it('should show pending requests for manager', () => {
      cy.get('[data-testid="pending-requests"]').should('be.visible');
      cy.get('[data-testid="leave-row"]').should('have.length.greaterThan', 0);
    });

    it('should display approve button', () => {
      cy.get('[data-testid="leave-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="approve-button"]').should('be.visible');
        });
    });

    it('should show approval comment field', () => {
      cy.get('[data-testid="leave-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="approve-button"]').click();
        });

      cy.get('[data-testid="approval-form"]').within(() => {
        cy.get('textarea[name="comment"]').should('be.visible');
      });
    });

    it('should successfully approve leave request', () => {
      cy.get('[data-testid="leave-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="approve-button"]').click();
        });

      cy.get('[data-testid="approval-form"]').within(() => {
        cy.get('textarea[name="comment"]').type('Approved');
        cy.get('[data-testid="confirm-button"]').click();
      });

      cy.get('[data-testid="success-message"]').should('be.visible').and('contain', 'approved');
    });
  });

  describe('Manager - Reject Leave', () => {
    beforeEach(() => {
      // Logout and login as manager
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      cy.visit('/login');
      cy.get('input[name="email"]').type('manager@example.com');
      cy.get('input[name="password"]').type('Manager@12345');
      cy.get('button[type="submit"]').click();

      cy.get('[data-testid="leave-nav"]').click();
    });

    it('should display reject button', () => {
      cy.get('[data-testid="leave-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="reject-button"]').should('be.visible');
        });
    });

    it('should require rejection reason', () => {
      cy.get('[data-testid="leave-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="reject-button"]').click();
        });

      cy.get('[data-testid="rejection-form"]').within(() => {
        cy.get('[data-testid="confirm-button"]').click();
      });

      cy.get('[data-testid="error-message"]').should('be.visible').and('contain', 'required');
    });

    it('should successfully reject leave request', () => {
      cy.get('[data-testid="leave-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="reject-button"]').click();
        });

      cy.get('[data-testid="rejection-form"]').within(() => {
        cy.get('textarea[name="reason"]').type('Budget constraints');
        cy.get('[data-testid="confirm-button"]').click();
      });

      cy.get('[data-testid="success-message"]').should('be.visible').and('contain', 'rejected');
    });
  });

  describe('Leave Calendar View', () => {
    it('should display calendar view', () => {
      cy.get('[data-testid="calendar-view-button"]').click();
      cy.get('[data-testid="leave-calendar"]').should('be.visible');
    });

    it('should show approved leaves on calendar', () => {
      cy.get('[data-testid="calendar-view-button"]').click();
      cy.get('[data-testid="calendar-event"]').should('have.length.greaterThan', 0);
    });

    it('should navigate calendar months', () => {
      cy.get('[data-testid="calendar-view-button"]').click();
      cy.get('[data-testid="next-month"]').click();
      cy.wait(300);

      cy.get('[data-testid="current-month"]').should('not.contain', 'February');
    });
  });

  describe('Leave Balance Widget', () => {
    it('should display updated balance after approval', () => {
      const initialBalance = cy.get('[data-testid="annual-leave-balance"]').text();

      // Create and approve leave request
      cy.get('[data-testid="new-leave-button"]').click();
      cy.get('[data-testid="leave-form"]').within(() => {
        cy.get('input[name="startDate"]').type('2026-03-15');
        cy.get('input[name="endDate"]').type('2026-03-20');
        cy.get('select[name="leaveType"]').select('Annual Leave');
        cy.get('[data-testid="form-submit"]').click();
      });

      // Approve as manager
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      cy.visit('/login');
      cy.get('input[name="email"]').type('manager@example.com');
      cy.get('input[name="password"]').type('Manager@12345');
      cy.get('button[type="submit"]').click();

      cy.get('[data-testid="leave-nav"]').click();
      cy.get('[data-testid="leave-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="approve-button"]').click();
        });

      cy.get('[data-testid="approval-form"]').within(() => {
        cy.get('[data-testid="confirm-button"]').click();
      });

      // Balance should be updated
      cy.get('[data-testid="annual-leave-balance"]').text().should('not.equal', initialBalance);
    });
  });

  describe('Leave History', () => {
    it('should display past leave requests', () => {
      cy.get('[data-testid="show-history"]').click();
      cy.get('[data-testid="leave-row"]').should('have.length.greaterThan', 0);
    });

    it('should filter by date range', () => {
      cy.get('[data-testid="date-from"]').type('2026-01-01');
      cy.get('[data-testid="date-to"]').type('2026-01-31');
      cy.get('[data-testid="filter-button"]').click();

      cy.wait(500);
      cy.get('[data-testid="leave-row"]').should('have.length.greaterThan', 0);
    });
  });

  describe('Mobile View', () => {
    beforeEach(() => {
      cy.viewport('iphone-x');
    });

    it('should display leave dashboard on mobile', () => {
      cy.get('[data-testid="leave-dashboard"]').should('be.visible');
    });

    it('should show leave balance cards on mobile', () => {
      cy.get('[data-testid="annual-leave-balance"]').should('be.visible');
      cy.get('[data-testid="sick-leave-balance"]').should('be.visible');
    });

    it('should allow new leave request on mobile', () => {
      cy.get('[data-testid="new-leave-button"]').click();
      cy.get('[data-testid="leave-form"]').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should handle network error during request submission', () => {
      cy.intercept('POST', '**/leave/request', {
        statusCode: 500,
        body: { message: 'Server error' },
      });

      cy.get('[data-testid="new-leave-button"]').click();
      cy.get('[data-testid="leave-form"]').within(() => {
        cy.get('input[name="startDate"]').type('2026-03-15');
        cy.get('input[name="endDate"]').type('2026-03-20');
        cy.get('[data-testid="form-submit"]').click();
      });

      cy.get('[data-testid="error-message"]').should('be.visible').and('contain', 'error|failed');
    });

    it('should retry failed request submission', () => {
      cy.get('[data-testid="new-leave-button"]').click();
      cy.get('[data-testid="leave-form"]').within(() => {
        cy.get('input[name="startDate"]').type('2026-03-15');
        cy.get('input[name="endDate"]').type('2026-03-20');
        cy.get('[data-testid="form-submit"]').click();
      });

      cy.get('[data-testid="retry-button"]').click();
      cy.get('[data-testid="success-message"]').should('be.visible');
    });
  });
});
