/**
 * a11y audit for PdplSubjectRequestsAdmin — guards the regulatory-critical
 * page where the DPO handles 30-day-deadline data subject requests.
 * The page combines a filter row, a deadline-coded table, status update
 * dialog, and detail view — surfaces where keyboard / screen-reader
 * regressions tend to slip in.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '../../__test-utils__/a11y';

import PdplSubjectRequestsAdmin from '../../pages/Quality/PdplSubjectRequestsAdmin';

jest.mock('../../services/api.client', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

jest.mock('contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showSnackbar: jest.fn() }),
}));

describe('a11y / PdplSubjectRequestsAdmin', () => {
  test('empty page renders cleanly under WCAG 2.1 AA', async () => {
    const { container } = render(<PdplSubjectRequestsAdmin />);
    await expectNoA11yViolations(container);
  });
});
