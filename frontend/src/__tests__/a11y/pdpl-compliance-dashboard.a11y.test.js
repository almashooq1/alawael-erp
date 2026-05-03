/**
 * a11y audit for PdplComplianceDashboard — guards the DPO landing page
 * with score gauge + clickable metric cards + retention reference table.
 * Cards are role=button + keyboard-toggleable so a11y coverage is
 * non-trivial.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { expectNoA11yViolations } from '../../__test-utils__/a11y';

import PdplComplianceDashboard from '../../pages/Quality/PdplComplianceDashboard';

jest.mock('../../services/api.client', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({
      data: {
        data: {
          processingRecords: 12,
          activeConsents: 340,
          pendingRequests: 3,
          overdueRequests: 1,
          openBreaches: 0,
          complianceScore: 85,
          retentionPolicies: 8,
        },
      },
    }),
  },
}));

jest.mock('contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showSnackbar: jest.fn() }),
}));

describe('a11y / PdplComplianceDashboard', () => {
  test('dashboard with sample data renders cleanly under WCAG 2.1 AA', async () => {
    const { container } = render(
      <BrowserRouter>
        <PdplComplianceDashboard />
      </BrowserRouter>
    );
    await expectNoA11yViolations(container);
  });
});
