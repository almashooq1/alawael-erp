/**
 * a11y audit for ZatcaCredentialsAdmin — guards the admin page that
 * manages CSIDs + organisation info + onboarding/promote actions. The
 * page combines a filter row, a wide data table with multiple icon
 * actions, an edit dialog with multiple sections and sub-dialogs.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '../../__test-utils__/a11y';

import ZatcaCredentialsAdmin from '../../pages/finance/ZatcaCredentialsAdmin';

jest.mock('../../services/api.client', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: { rows: [], total: 0 } }),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showSnackbar: jest.fn() }),
}));

describe('a11y / ZatcaCredentialsAdmin', () => {
  test('empty page renders cleanly under WCAG 2.1 AA', async () => {
    const { container } = render(<ZatcaCredentialsAdmin />);
    await expectNoA11yViolations(container);
  });
});
