/**
 * a11y audit for PdplBreachReportingAdmin — guards the regulatory-critical
 * page where DPO + security team report data breaches with the 72h SDAIA
 * notification deadline.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '../../__test-utils__/a11y';

import PdplBreachReportingAdmin from '../../pages/Quality/PdplBreachReportingAdmin';

jest.mock('../../services/api.client', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: { data: [] } }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

jest.mock('contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showSnackbar: jest.fn() }),
}));

describe('a11y / PdplBreachReportingAdmin', () => {
  test('empty page renders cleanly under WCAG 2.1 AA', async () => {
    const { container } = render(<PdplBreachReportingAdmin />);
    await expectNoA11yViolations(container);
  });
});
