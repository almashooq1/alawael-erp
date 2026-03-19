/**
 * Accessibility (a11y) Tests — ALAWAEL ERP
 *
 * Uses cypress-axe to run automated WCAG 2.1 AA accessibility checks
 * across all major pages. Covers:
 * - ARIA labels and roles
 * - Color contrast
 * - Keyboard navigation
 * - Form labels
 * - Image alt text
 * - Heading hierarchy
 * - RTL layout compliance
 *
 * اختبارات إمكانية الوصول - نظام الأوائل
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────
const A11Y_OPTIONS = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'best-practice'],
  },
};

/** Pages that require authentication */
const AUTHENTICATED_PAGES = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Finance - Accounting', path: '/accounting' },
  { name: 'HR - Employees', path: '/employees' },
  { name: 'Admin Dashboard', path: '/admin' },
  { name: 'Education System', path: '/education' },
  { name: 'Rehab - Disability', path: '/disability-rehab' },
  { name: 'Workflow Dashboard', path: '/workflow' },
  { name: 'Documents', path: '/documents' },
  { name: 'Communications', path: '/communications' },
  { name: 'Profile', path: '/profile' },
];

/** Pages that do NOT require authentication */
const PUBLIC_PAGES = [
  { name: 'Login', path: '/login' },
  { name: 'Register', path: '/register' },
];

// ─── Public Pages ────────────────────────────────────────────────────────────
describe('Accessibility - Public Pages', () => {
  PUBLIC_PAGES.forEach(({ name, path }) => {
    it(`${name} page should have no critical a11y violations`, () => {
      cy.visit(path);
      cy.injectAxe();

      // Wait for page to render
      cy.get('body').should('be.visible');

      cy.checkA11y(
        null,
        {
          ...A11Y_OPTIONS,
          // Exclude minor issues on initial audit — focus on critical
          rules: {
            'color-contrast': { enabled: true },
            label: { enabled: true },
            'image-alt': { enabled: true },
            'button-name': { enabled: true },
            'link-name': { enabled: true },
          },
        },
        violations => {
          // Log violations for debugging (non-blocking first pass)
          if (violations.length > 0) {
            cy.task('log', `⚠️ ${name}: ${violations.length} a11y violations found`);
            violations.forEach(v => {
              cy.task('log', `  [${v.impact}] ${v.id}: ${v.description}`);
            });
          }
        }
      );
    });
  });

  it('Login form should have proper labels and ARIA attributes', () => {
    cy.visit('/login');
    cy.injectAxe();

    // Email input should have associated label
    cy.get('input[name="email"]')
      .should('have.attr', 'aria-label')
      .or('have.attr', 'id')
      .then($input => {
        const id = $input.attr('id');
        if (id) {
          cy.get(`label[for="${id}"]`).should('exist');
        }
      });

    // Password input should have associated label
    cy.get('input[name="password"]').should('have.attr', 'type', 'password');

    // Submit button should have accessible name
    cy.get('button[type="submit"]').should('not.be.empty');
  });
});

// ─── Authenticated Pages ─────────────────────────────────────────────────────
describe('Accessibility - Authenticated Pages', () => {
  beforeEach(() => {
    // Login before each test
    cy.login('admin@alawael.com', 'Admin@123');
  });

  AUTHENTICATED_PAGES.forEach(({ name, path }) => {
    it(`${name} should have no critical a11y violations`, () => {
      cy.visit(path);
      cy.injectAxe();

      // Wait for page to fully load
      cy.get('body').should('be.visible');
      // Give lazy-loaded components time to render
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000);

      cy.checkA11y(null, A11Y_OPTIONS, violations => {
        const critical = violations.filter(v => v.impact === 'critical' || v.impact === 'serious');

        if (violations.length > 0) {
          cy.task(
            'log',
            `⚠️ ${name}: ${violations.length} total, ${critical.length} critical/serious`
          );
          violations.forEach(v => {
            cy.task(
              'log',
              `  [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} elements)`
            );
          });
        }

        // Fail only on critical/serious violations
        expect(critical).to.have.length(
          0,
          `${name} has ${critical.length} critical/serious a11y violations:\n` +
            critical.map(v => `  - ${v.id}: ${v.description}`).join('\n')
        );
      });
    });
  });
});

// ─── RTL-specific Accessibility ──────────────────────────────────────────────
describe('Accessibility - RTL Layout', () => {
  beforeEach(() => {
    cy.login('admin@alawael.com', 'Admin@123');
  });

  it('should have dir="rtl" on the document root', () => {
    cy.visit('/dashboard');
    cy.get('html').should('have.attr', 'dir', 'rtl').or('have.attr', 'lang', 'ar');
    // Or the body / main wrapper should have RTL
    cy.get('body').then($body => {
      const computedDir = window.getComputedStyle($body[0]).direction;
      expect(computedDir).to.equal('rtl');
    });
  });

  it('navigation should be keyboard accessible', () => {
    cy.visit('/dashboard');

    // Tab through navigation items
    cy.get('body').tab();
    cy.focused().should('exist');

    // Navigation links should be focusable
    cy.get('nav a, nav button, [role="navigation"] a').each($el => {
      expect($el).to.have.css('outline-style').not.equal('none');
    });
  });

  it('all dialogs/modals should have proper ARIA roles', () => {
    cy.visit('/dashboard');

    // Check MUI dialogs have correct roles
    cy.get('[role="dialog"], [role="alertdialog"]').each($dialog => {
      // Each dialog should have aria-labelledby or aria-label
      const hasLabel = $dialog.attr('aria-labelledby') || $dialog.attr('aria-label');
      expect(hasLabel).to.exist;
    });
  });

  it('all interactive elements should have focus indicators', () => {
    cy.visit('/dashboard');
    cy.injectAxe();

    // Check that focus styles exist
    cy.checkA11y(null, {
      runOnly: {
        type: 'rule',
        values: ['focus-order-semantics', 'tabindex', 'aria-required-parent'],
      },
    });
  });
});

// ─── Form Accessibility ──────────────────────────────────────────────────────
describe('Accessibility - Forms', () => {
  beforeEach(() => {
    cy.login('admin@alawael.com', 'Admin@123');
  });

  it('employee creation form should have proper labels', () => {
    cy.visit('/employees');
    cy.get('[data-testid="add-employee-button"]').click();
    cy.injectAxe();

    // All form inputs should have labels
    cy.get('input, select, textarea').each($input => {
      const hasLabel =
        $input.attr('aria-label') || $input.attr('aria-labelledby') || $input.attr('id');

      expect(hasLabel, `Input ${$input.attr('name') || $input.attr('type')} must have a label`).to
        .exist;
    });

    cy.checkA11y('form, [role="form"]', {
      runOnly: {
        type: 'rule',
        values: ['label', 'autocomplete-valid', 'select-name'],
      },
    });
  });

  it('required fields should have aria-required attribute', () => {
    cy.visit('/employees');
    cy.get('[data-testid="add-employee-button"]').click();

    cy.get('input[required], [aria-required="true"]').should('have.length.greaterThan', 0);
  });
});
