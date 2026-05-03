/**
 * a11y audit for PiiAccessAuditAdmin — guards the DPO query interface
 * over the PII access audit log. The page combines tabs + filter row +
 * data table + a stats grid in the targeted mode.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '../../__test-utils__/a11y';

import PiiAccessAuditAdmin from '../../pages/Quality/PiiAccessAuditAdmin';

jest.mock('../../services/api.client', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: { data: [], total: 0 } }),
  },
}));

jest.mock('contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showSnackbar: jest.fn() }),
}));

describe('a11y / PiiAccessAuditAdmin', () => {
  test('browse-tab default renders cleanly under WCAG 2.1 AA', async () => {
    const { container } = render(<PiiAccessAuditAdmin />);
    await expectNoA11yViolations(container);
  });
});
