/**
 * a11y audit for ComplianceCalendarAdmin — guards the CBAHI/MOH-critical
 * page that surfaces upcoming licence renewals + accreditation deadlines
 * with create / resolve / snooze / cancel actions.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '../../__test-utils__/a11y';

import ComplianceCalendarAdmin from '../../pages/Quality/ComplianceCalendarAdmin';

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

describe('a11y / ComplianceCalendarAdmin', () => {
  test('empty page renders cleanly under WCAG 2.1 AA', async () => {
    const { container } = render(<ComplianceCalendarAdmin />);
    await expectNoA11yViolations(container);
  });
});
