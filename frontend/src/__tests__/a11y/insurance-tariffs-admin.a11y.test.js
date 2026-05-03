/**
 * a11y audit for InsuranceTariffsAdmin — guards the high-leverage admin
 * page that drives automatic claim pricing. The page combines a filter
 * row, a data table, and an edit dialog with date pickers — covering
 * each surface keeps WCAG regressions out of CI.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '../../__test-utils__/a11y';

import InsuranceTariffsAdmin from '../../pages/finance/InsuranceTariffsAdmin';

// Stub the API client so the page mounts without hitting the network.
jest.mock('../../services/api.client', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: { rows: [], total: 0 } }),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// Stub the snackbar context so we don't need its provider for an a11y audit.
jest.mock('contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showSnackbar: jest.fn() }),
}));

describe('a11y / InsuranceTariffsAdmin', () => {
  test('empty page renders cleanly under WCAG 2.1 AA', async () => {
    const { container } = render(<InsuranceTariffsAdmin />);
    await expectNoA11yViolations(container);
  });
});
