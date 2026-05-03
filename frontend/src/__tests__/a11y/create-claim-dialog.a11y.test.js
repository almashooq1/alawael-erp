/**
 * a11y audit for CreateClaimDialog — guards the new session→NPHIES claim
 * UI against WCAG 2.1 AA regressions. The dialog has many interactive
 * controls (number input, dynamic diagnosis rows, switch, error/warning
 * regions), which is the kind of surface most likely to drift over time.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '../../__test-utils__/a11y';

import CreateClaimDialog from '../../components/nphies/CreateClaimDialog';

// Stub the API client so the component can mount in jsdom without network.
jest.mock('../../services/api.client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

describe('a11y / CreateClaimDialog', () => {
  test('open dialog with default state passes WCAG 2.1 AA', async () => {
    const { container } = render(
      <CreateClaimDialog
        open
        sessionId="64b8a2f9c12e3a5d8e0f1234"
        sessionMeta="جلسة علاج طبيعي · 2026-04-30"
        onClose={() => {}}
        onCreated={() => {}}
      />
    );
    await expectNoA11yViolations(container);
  });

  test('closed dialog has no violations', async () => {
    const { container } = render(
      <CreateClaimDialog open={false} sessionId="x" onClose={() => {}} onCreated={() => {}} />
    );
    await expectNoA11yViolations(container);
  });

  test('dialog without optional sessionMeta still passes', async () => {
    const { container } = render(
      <CreateClaimDialog
        open
        sessionId="64b8a2f9c12e3a5d8e0f1234"
        onClose={() => {}}
        onCreated={() => {}}
      />
    );
    await expectNoA11yViolations(container);
  });
});
