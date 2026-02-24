// Employee Management E2E Tests
// Tests CRUD operations for employees

describe('Employee Management E2E Tests', () => {
  beforeEach(() => {
    // Login as HR/Admin
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('Admin@12345');
    cy.get('button[type="submit"]').click();

    // Navigate to employee management
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="employee-nav"]').click();
    cy.url().should('include', '/employees');
  });

  describe('View Employees', () => {
    it('should display employee list on load', () => {
      cy.get('[data-testid="employee-table"]').should('be.visible');
      cy.get('[data-testid="employee-row"]').should('have.length.greaterThan', 0);
    });

    it('should display correct employee columns', () => {
      cy.get('[data-testid="employee-table"]').within(() => {
        cy.get('th').should('contain', 'Name');
        cy.get('th').should('contain', 'Email');
        cy.get('th').should('contain', 'Position');
        cy.get('th').should('contain', 'Department');
        cy.get('th').should('contain', 'Status');
      });
    });

    it('should display employee details in table', () => {
      cy.get('[data-testid="employee-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="employee-name"]').should('not.be.empty');
          cy.get('[data-testid="employee-email"]').should('not.be.empty');
          cy.get('[data-testid="employee-position"]').should('not.be.empty');
        });
    });

    it('should load more employees on scroll', () => {
      const initialCount = cy.get('[data-testid="employee-row"]').length;

      cy.get('[data-testid="employee-table"]').scrollTo('bottom');
      cy.wait(500);

      cy.get('[data-testid="employee-row"]').should('have.length.greaterThan', initialCount);
    });
  });

  describe('Search Employees', () => {
    it('should search employee by name', () => {
      cy.get('[data-testid="search-input"]').type('Ahmed');
      cy.wait(500);

      cy.get('[data-testid="employee-row"]').each($row => {
        cy.wrap($row).should('contain', 'Ahmed');
      });
    });

    it('should search employee by email', () => {
      cy.get('[data-testid="search-input"]').type('ahmed@example.com');
      cy.wait(500);

      cy.get('[data-testid="employee-row"]').should('contain', 'ahmed@example.com');
    });

    it('should show no results for non-existent employee', () => {
      cy.get('[data-testid="search-input"]').type('NonExistentEmployee123');
      cy.wait(500);

      cy.get('[data-testid="no-results"]').should('be.visible');
    });

    it('should clear search and show all employees', () => {
      cy.get('[data-testid="search-input"]').type('Ahmed');
      cy.wait(500);

      cy.get('[data-testid="search-input"]').clear();
      cy.wait(500);

      cy.get('[data-testid="employee-row"]').should('have.length.greaterThan', 1);
    });
  });

  describe('Filter Employees', () => {
    it('should filter employees by department', () => {
      cy.get('[data-testid="filter-department"]').select('IT');
      cy.wait(500);

      cy.get('[data-testid="employee-row"]').each($row => {
        cy.wrap($row).should('contain', 'IT');
      });
    });

    it('should filter employees by status', () => {
      cy.get('[data-testid="filter-status"]').select('active');
      cy.wait(500);

      cy.get('[data-testid="employee-row"]').each($row => {
        cy.wrap($row).should('contain', 'Active');
      });
    });

    it('should apply multiple filters', () => {
      cy.get('[data-testid="filter-department"]').select('IT');
      cy.get('[data-testid="filter-status"]').select('active');
      cy.wait(500);

      cy.get('[data-testid="employee-row"]').should('have.length.greaterThan', 0);
    });

    it('should reset filters', () => {
      cy.get('[data-testid="filter-department"]').select('IT');
      cy.wait(100);

      cy.get('[data-testid="reset-filters"]').click();
      cy.wait(500);

      cy.get('[data-testid="employee-row"]').should('have.length.greaterThan', 1);
    });
  });

  describe('Create Employee', () => {
    it('should display add employee button', () => {
      cy.get('[data-testid="add-employee-button"]')
        .should('be.visible')
        .and('contain', 'Add Employee');
    });

    it('should open create employee modal', () => {
      cy.get('[data-testid="add-employee-button"]').click();
      cy.get('[data-testid="employee-form"]').should('be.visible');
      cy.get('[data-testid="form-title"]').should('contain', 'Add Employee');
    });

    it('should show validation error for empty fields', () => {
      cy.get('[data-testid="add-employee-button"]').click();
      cy.get('[data-testid="form-submit"]').click();

      cy.get('[data-testid="form-error"]').should('be.visible');
    });

    it('should successfully create new employee', () => {
      const employeeData = {
        name: `Test Employee ${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        phone: '+966501234567',
        position: 'Software Engineer',
        department: 'IT',
        salary: '8000',
      };

      cy.get('[data-testid="add-employee-button"]').click();
      cy.get('[data-testid="employee-form"]').within(() => {
        cy.get('input[name="name"]').type(employeeData.name);
        cy.get('input[name="email"]').type(employeeData.email);
        cy.get('input[name="phone"]').type(employeeData.phone);
        cy.get('select[name="position"]').select(employeeData.position);
        cy.get('select[name="department"]').select(employeeData.department);
        cy.get('input[name="salary"]').type(employeeData.salary);
        cy.get('[data-testid="form-submit"]').click();
      });

      cy.get('[data-testid="success-message"]')
        .should('be.visible')
        .and('contain', 'created successfully');

      // Verify employee appears in list
      cy.get('[data-testid="employee-row"]').should('contain', employeeData.name);
    });

    it('should show error for duplicate email', () => {
      cy.get('[data-testid="add-employee-button"]').click();
      cy.get('[data-testid="employee-form"]').within(() => {
        cy.get('input[name="name"]').type('Test Employee');
        cy.get('input[name="email"]').type('ahmed@example.com'); // Existing employee
        cy.get('input[name="phone"]').type('+966501234567');
        cy.get('select[name="position"]').select('Software Engineer');
        cy.get('select[name="department"]').select('IT');
        cy.get('input[name="salary"]').type('8000');
        cy.get('[data-testid="form-submit"]').click();
      });

      cy.get('[data-testid="error-message"]')
        .should('be.visible')
        .and('contain', 'already exists|duplicate');
    });
  });

  describe('Update Employee', () => {
    it('should open edit employee form', () => {
      cy.get('[data-testid="employee-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="edit-button"]').click();
        });

      cy.get('[data-testid="employee-form"]').should('be.visible');
      cy.get('[data-testid="form-title"]').should('contain', 'Edit');
    });

    it('should update employee name', () => {
      const newName = `Updated Employee ${Date.now()}`;

      cy.get('[data-testid="employee-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="edit-button"]').click();
        });

      cy.get('[data-testid="employee-form"]').within(() => {
        cy.get('input[name="name"]').clear().type(newName);
        cy.get('[data-testid="form-submit"]').click();
      });

      cy.get('[data-testid="success-message"]')
        .should('be.visible')
        .and('contain', 'updated successfully');
    });

    it('should update employee salary', () => {
      cy.get('[data-testid="employee-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="edit-button"]').click();
        });

      cy.get('[data-testid="employee-form"]').within(() => {
        cy.get('input[name="salary"]').clear().type('9500');
        cy.get('[data-testid="form-submit"]').click();
      });

      cy.get('[data-testid="success-message"]').should('be.visible').and('contain', 'updated');
    });

    it('should update employee department', () => {
      cy.get('[data-testid="employee-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="edit-button"]').click();
        });

      cy.get('[data-testid="employee-form"]').within(() => {
        cy.get('select[name="department"]').select('Finance');
        cy.get('[data-testid="form-submit"]').click();
      });

      cy.get('[data-testid="success-message"]').should('be.visible').and('contain', 'updated');
    });
  });

  describe('Delete Employee', () => {
    it('should show delete button on employee row', () => {
      cy.get('[data-testid="employee-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="delete-button"]').should('be.visible');
        });
    });

    it('should show confirmation dialog on delete', () => {
      cy.get('[data-testid="employee-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="delete-button"]').click();
        });

      cy.get('[data-testid="confirm-dialog"]').should('be.visible');
      cy.get('[data-testid="confirm-dialog"]').should('contain', 'Are you sure');
    });

    it('should cancel delete operation', () => {
      cy.get('[data-testid="employee-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="delete-button"]').click();
        });

      cy.get('[data-testid="confirm-dialog"]').within(() => {
        cy.get('[data-testid="cancel-button"]').click();
      });

      cy.get('[data-testid="confirm-dialog"]').should('not.exist');
    });

    it('should successfully delete employee', () => {
      const employeeName = cy
        .get('[data-testid="employee-row"]')
        .first()
        .find('[data-testid="employee-name"]')
        .text();

      cy.get('[data-testid="employee-row"]')
        .first()
        .within(() => {
          cy.get('[data-testid="delete-button"]').click();
        });

      cy.get('[data-testid="confirm-dialog"]').within(() => {
        cy.get('[data-testid="confirm-button"]').click();
      });

      cy.get('[data-testid="success-message"]').should('be.visible').and('contain', 'deleted');

      // Verify employee not in list
      cy.get('[data-testid="employee-row"]').should('not.contain', employeeName);
    });
  });

  describe('Employee Details View', () => {
    it('should open employee details page', () => {
      cy.get('[data-testid="employee-row"]').first().click();
      cy.url().should('include', '/employees/');
      cy.get('[data-testid="employee-details"]').should('be.visible');
    });

    it('should display complete employee information', () => {
      cy.get('[data-testid="employee-row"]').first().click();

      cy.get('[data-testid="employee-details"]').within(() => {
        cy.get('[data-testid="detail-name"]').should('not.be.empty');
        cy.get('[data-testid="detail-email"]').should('not.be.empty');
        cy.get('[data-testid="detail-phone"]').should('not.be.empty');
        cy.get('[data-testid="detail-position"]').should('not.be.empty');
        cy.get('[data-testid="detail-department"]').should('not.be.empty');
        cy.get('[data-testid="detail-salary"]').should('not.be.empty');
        cy.get('[data-testid="detail-status"]').should('not.be.empty');
      });
    });

    it('should edit employee from details page', () => {
      cy.get('[data-testid="employee-row"]').first().click();
      cy.get('[data-testid="edit-button"]').click();

      cy.get('[data-testid="employee-form"]').within(() => {
        cy.get('input[name="name"]').clear().type('Updated Name');
        cy.get('[data-testid="form-submit"]').click();
      });

      cy.get('[data-testid="success-message"]').should('be.visible').and('contain', 'updated');
    });
  });

  describe('Bulk Operations', () => {
    it('should select multiple employees', () => {
      cy.get('[data-testid="select-all-checkbox"]').click();

      cy.get('[data-testid="employee-row"]').each($row => {
        cy.wrap($row).find('input[type="checkbox"]').should('be.checked');
      });
    });

    it('should deselect all employees', () => {
      cy.get('[data-testid="select-all-checkbox"]').click();
      cy.get('[data-testid="select-all-checkbox"]').click();

      cy.get('[data-testid="employee-row"]').each($row => {
        cy.wrap($row).find('input[type="checkbox"]').should('not.be.checked');
      });
    });

    it('should export selected employees as CSV', () => {
      cy.get('[data-testid="employee-row"]').first().find('input[type="checkbox"]').check();

      cy.get('[data-testid="export-button"]').click();
      cy.get('[data-testid="export-csv"]').click();

      cy.get('[data-testid="success-message"]').should('contain', 'exported');
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls', () => {
      cy.get('[data-testid="pagination"]').should('be.visible');
    });

    it('should navigate to next page', () => {
      cy.get('[data-testid="next-page"]').click();
      cy.wait(500);

      cy.get('[data-testid="employee-row"]').should('have.length.greaterThan', 0);
    });

    it('should navigate to previous page', () => {
      cy.get('[data-testid="next-page"]').click();
      cy.wait(500);
      cy.get('[data-testid="prev-page"]').click();
      cy.wait(500);

      cy.url().should('include', 'page=1');
    });
  });
});
