/**
 * Disability Assessment E2E — Phase 3
 *
 * Smoke + API-wiring tests for the clinical assessment scale flow:
 *  - login
 *  - navigate to assessment scales
 *  - verify scale cards render from backend catalog
 *  - open a scale assessment dialog
 *  - select beneficiary, adjust domain score, submit
 *  - cancel without submitting
 */

describe('Disability Assessment Flow', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/assessment-scales');
  });

  it('loads the assessment scales page and renders scale cards', () => {
    cy.url().should('include', '/assessment-scales');
    cy.contains('مقاييس التقييم').should('exist');
    cy.get('[data-cy="scale-card"]').should('have.length.at.least', 1);
  });

  it('opens and cancels a scale assessment dialog', () => {
    cy.get('[data-cy="scale-card"]').first().within(() => {
      cy.contains('تطبيق المقياس').click();
    });
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[data-cy="assessment-beneficiary-select"]').should('exist');
    cy.get('[data-cy="save-assessment-btn"]').should('be.disabled');
    cy.contains('إلغاء').click();
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('wires the scale catalog and results endpoints', () => {
    cy.intercept('GET', '/api/v1/rehab-measures/catalog').as('getCatalog');
    cy.intercept('GET', '/api/v1/disability/assessment/scale-results*').as('getScaleResults');
    cy.intercept('GET', '/api/v1/disability/statistics').as('getStatistics');
    cy.intercept('GET', '/api/v1/disability/beneficiaries').as('getBeneficiaries');

    cy.reload();

    cy.wait('@getCatalog', { timeout: 10000 });
    cy.wait('@getScaleResults', { timeout: 10000 });
    cy.wait('@getStatistics', { timeout: 10000 });
    cy.wait('@getBeneficiaries', { timeout: 10000 });

    cy.get('[data-cy="scale-card"]').should('have.length.at.least', 1);
  });

  it('submits a scale result through the assessment dialog', () => {
    cy.intercept('POST', '/api/v1/disability/assessment/scale-results').as('submitScaleResult');

    // Open first scale card
    cy.get('[data-cy="scale-card"]').first().within(() => {
      cy.contains('تطبيق المقياس').click();
    });

    cy.get('[role="dialog"]').should('be.visible');

    // Wait for beneficiaries to populate then select first option
    cy.get('[data-cy="assessment-beneficiary-select"]').click();
    cy.get('[role="listbox"] [role="option"]').first().click();

    // Enable save button
    cy.get('[data-cy="save-assessment-btn"]').should('not.be.disabled');

    // Submit
    cy.get('[data-cy="save-assessment-btn"]').click();

    cy.wait('@submitScaleResult', { timeout: 10000 })
      .its('response.statusCode')
      .should('be.oneOf', [200, 201]);

    cy.contains('تم حفظ نتيجة التقييم بنجاح').should('be.visible');
  });
});
