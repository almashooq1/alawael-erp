/**
 * a11y audit for PdplConsentsAdmin — guards the per-user consent
 * management page used by the DPO. Renders empty state (no user
 * searched yet) — the table only shows after the first search, but
 * the search bar + create dialog need to be a11y-clean from the
 * first paint.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '../../__test-utils__/a11y';

import PdplConsentsAdmin from '../../pages/Quality/PdplConsentsAdmin';

jest.mock('../../services/api.client', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: { data: [] } }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

jest.mock('contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showSnackbar: jest.fn() }),
}));

describe('a11y / PdplConsentsAdmin', () => {
  test('initial page (no search yet) renders cleanly under WCAG 2.1 AA', async () => {
    const { container } = render(<PdplConsentsAdmin />);
    await expectNoA11yViolations(container);
  });
});
