/**
 * a11y audit for EvidenceVaultAdmin — guards the CBAHI/audit-critical
 * page that shows the QMS evidence vault with hash verification +
 * legal-hold actions. Mounts in jsdom with stubbed apiClient + snackbar.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '../../__test-utils__/a11y';

import EvidenceVaultAdmin from '../../pages/Quality/EvidenceVaultAdmin';

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

describe('a11y / EvidenceVaultAdmin', () => {
  test('empty page renders cleanly under WCAG 2.1 AA', async () => {
    const { container } = render(<EvidenceVaultAdmin />);
    await expectNoA11yViolations(container);
  });
});
