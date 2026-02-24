// Authentication E2E Tests
// Tests user login, logout, and session management

describe('Authentication E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  describe('Login Workflow', () => {
    it('should display login form on initial load', () => {
      cy.get('[data-testid="login-form"]').should('be.visible');
      cy.get('input[name="email"]').should('be.visible');
      cy.get('input[name="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('should show error for invalid email format', () => {
      cy.get('input[name="email"]').type('invalid-email');
      cy.get('input[name="password"]').type('Password123');
      cy.get('button[type="submit"]').click();

      cy.get('[data-testid="error-message"]').should('be.visible').and('contain', 'valid email');
    });

    it('should show error for empty password', () => {
      cy.get('input[name="email"]').type('admin@example.com');
      cy.get('input[name="password"]').should('have.value', '');
      cy.get('button[type="submit"]').click();

      cy.get('[data-testid="error-message"]').should('be.visible').and('contain', 'required');
    });

    it('should successfully login with valid credentials', () => {
      const { email, password } = Cypress.env();

      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('button[type="submit"]').click();

      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="dashboard-header"]').should('be.visible');
    });

    it('should show error for incorrect password', () => {
      cy.get('input[name="email"]').type('admin@example.com');
      cy.get('input[name="password"]').type('WrongPassword123');
      cy.get('button[type="submit"]').click();

      cy.get('[data-testid="error-message"]').should('be.visible').and('contain', 'Invalid');
    });

    it('should show error for non-existent user', () => {
      cy.get('input[name="email"]').type('nonexistent@example.com');
      cy.get('input[name="password"]').type('Password123');
      cy.get('button[type="submit"]').click();

      cy.get('[data-testid="error-message"]')
        .should('be.visible')
        .and('contain', 'not found|Invalid');
    });
  });

  describe('Remember Me Functionality', () => {
    it('should remember email when checkbox is checked', () => {
      const email = 'admin@example.com';

      cy.get('input[name="email"]').type(email);
      cy.get('input[name="rememberMe"]').check();
      cy.get('button[type="submit"]').click();

      // Wait for redirect
      cy.url().should('include', '/dashboard');

      // Logout
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      // Email should be pre-filled
      cy.get('input[name="email"]').should('have.value', email);
    });
  });

  describe('Password Reset Link', () => {
    it('should display forgot password link', () => {
      cy.get('[data-testid="forgot-password-link"]')
        .should('be.visible')
        .and('have.text', 'Forgot Password?');
    });

    it('should navigate to password reset page', () => {
      cy.get('[data-testid="forgot-password-link"]').click();
      cy.url().should('include', '/forgot-password');
      cy.get('[data-testid="reset-form"]').should('be.visible');
    });
  });

  describe('Sign Up Link', () => {
    it('should display sign up link for new users', () => {
      cy.get('[data-testid="signup-link"]').should('be.visible');
    });

    it('should navigate to sign up page', () => {
      cy.get('[data-testid="signup-link"]').click();
      cy.url().should('include', '/signup');
    });
  });
});

describe('Authentication - Role-Based Access', () => {
  it('should login as admin and access admin panel', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('Admin@12345');
    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="admin-panel"]').should('be.visible');
  });

  it('should login as manager and access manager features', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('manager@example.com');
    cy.get('input[name="password"]').type('Manager@12345');
    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="approve-leave-button"]').should('be.visible');
  });

  it('should login as employee and see employee dashboard', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('employee@example.com');
    cy.get('input[name="password"]').type('Employee@12345');
    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="my-profile"]').should('be.visible');
  });
});

describe('Session Management', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('Admin@12345');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should keep user logged in on page refresh', () => {
    cy.get('[data-testid="dashboard-header"]').should('be.visible');
    cy.reload();

    // Should remain on dashboard
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="dashboard-header"]').should('be.visible');
  });

  it('should logout user', () => {
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();

    cy.url().should('include', '/login');
    cy.get('[data-testid="login-form"]').should('be.visible');
  });

  it('should clear user data on logout', () => {
    // Verify user is logged in
    cy.window().then(win => {
      expect(win.localStorage.getItem('token')).to.exist;
      expect(win.localStorage.getItem('user')).to.exist;
    });

    // Logout
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();

    // Verify data is cleared
    cy.window().then(win => {
      expect(win.localStorage.getItem('token')).to.be.null;
      expect(win.localStorage.getItem('user')).to.be.null;
    });
  });

  it('should prevent access to dashboard when logged out', () => {
    // Verify can access dashboard while logged in
    cy.url().should('include', '/dashboard');

    // Logout
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();

    // Try to access dashboard directly
    cy.visit('/dashboard');
    cy.url().should('include', '/login');
  });
});

describe('Session Timeout', () => {
  it('should logout user after session expires', function () {
    // Mock session timeout (skip if backend timeout is not configured)
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('Admin@12345');
    cy.get('button[type="submit"]').click();

    // Set token expiry to 1 second ahead
    cy.window().then(win => {
      const expiryTime = Date.now() + 1000; // 1 second
      win.localStorage.setItem('tokenExpiry', expiryTime);
    });

    // Wait for expiry
    cy.wait(1500);

    // Try to access protected resource
    cy.visit('/dashboard');
    cy.url().should('include', '/login');
  });
});

describe('Authentication - Mobile View', () => {
  beforeEach(() => {
    cy.viewport('iphone-x');
    cy.visit('/login');
  });

  it('should display login form on mobile', () => {
    cy.get('[data-testid="login-form"]').should('be.visible');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('should successfully login on mobile', () => {
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('Admin@12345');
    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="dashboard-header"]').should('be.visible');
  });
});
