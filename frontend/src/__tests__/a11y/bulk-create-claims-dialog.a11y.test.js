/**
 * a11y audit for BulkCreateClaimsDialog — guards the high-leverage
 * month-end batch UI against WCAG 2.1 AA regressions. The dialog has
 * date pickers, a dry-run switch, and three expandable report sections
 * with aria-expanded toggles, which is exactly the kind of surface
 * where keyboard / SR usability quietly degrades over time.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '../../__test-utils__/a11y';

import BulkCreateClaimsDialog from '../../components/nphies/BulkCreateClaimsDialog';

jest.mock('../../services/api.client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

describe('a11y / BulkCreateClaimsDialog', () => {
  test('open dialog with default state passes WCAG 2.1 AA', async () => {
    const { container } = render(
      <BulkCreateClaimsDialog open onClose={() => {}} onCompleted={() => {}} />
    );
    await expectNoA11yViolations(container);
  });

  test('closed dialog emits no violations', async () => {
    const { container } = render(
      <BulkCreateClaimsDialog open={false} onClose={() => {}} onCompleted={() => {}} />
    );
    await expectNoA11yViolations(container);
  });
});
