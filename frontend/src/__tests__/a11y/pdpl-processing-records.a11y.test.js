/**
 * a11y audit for PdplProcessingRecordsAdmin — guards the SDAIA-audit-
 * facing register of processing activities (PDPL Article 32). The page
 * combines a filter row, a wide table, and a multi-section create
 * dialog with a conditional cross-border-transfer warning panel.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '../../__test-utils__/a11y';

import PdplProcessingRecordsAdmin from '../../pages/Quality/PdplProcessingRecordsAdmin';

jest.mock('../../services/api.client', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: { data: [] } }),
    post: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

jest.mock('contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showSnackbar: jest.fn() }),
}));

describe('a11y / PdplProcessingRecordsAdmin', () => {
  test('empty page renders cleanly under WCAG 2.1 AA', async () => {
    const { container } = render(<PdplProcessingRecordsAdmin />);
    await expectNoA11yViolations(container);
  });
});
