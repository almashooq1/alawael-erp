/**
 * a11y audit for ManagementReviewAdmin — guards the CBAHI-critical
 * page that shows ISO 9001 §9.3 management reviews. The page combines
 * a filter row, a table, a schedule dialog with form validation, and a
 * detail dialog with multiple data sections — all surfaces where
 * keyboard / screen-reader usability tends to drift.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '../../__test-utils__/a11y';

import ManagementReviewAdmin from '../../pages/quality/ManagementReviewAdmin';

// Match the working pattern from insurance-tariffs-admin.a11y.test.js verbatim.
jest.mock('../../services/api.client', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: { data: [] } }),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showSnackbar: jest.fn() }),
}));

describe('a11y / ManagementReviewAdmin', () => {
  test('empty page renders cleanly under WCAG 2.1 AA', async () => {
    const { container } = render(<ManagementReviewAdmin />);
    await expectNoA11yViolations(container);
  });
});
