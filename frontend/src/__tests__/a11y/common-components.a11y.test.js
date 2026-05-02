/**
 * Component-level a11y audits for the most-reused common components.
 *
 * Why these and not all components?
 *   These ship in (almost) every authenticated page. A WCAG violation in
 *   ConfirmDialog or LoadingSpinner is multiplied across the whole app, so
 *   fixing them once delivers the largest leverage.
 *
 * Failures here are first-class test failures, not warnings — the helper
 * filters to `critical` + `serious` impacts so a mid-audit regression is
 * obvious in CI.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { expectNoA11yViolations, auditA11y } from '../../__test-utils__/a11y';

import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// ─────────────────────────────────────────────────────────────────────────────
// LoadingSpinner — renders during data fetch on every screen
// ─────────────────────────────────────────────────────────────────────────────
describe('a11y / LoadingSpinner', () => {
  test('open spinner has no critical or serious violations', async () => {
    const { container } = render(<LoadingSpinner open message="جاري التحميل..." />);
    await expectNoA11yViolations(container);
  });

  test('spinner with custom message stays clean', async () => {
    const { container } = render(<LoadingSpinner open message="جاري حفظ المستفيد" />);
    await expectNoA11yViolations(container);
  });

  test('closed spinner has no violations (no DOM emitted)', async () => {
    const { container } = render(<LoadingSpinner open={false} />);
    await expectNoA11yViolations(container);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmDialog — opens on every destructive action across the app
// ─────────────────────────────────────────────────────────────────────────────
describe('a11y / ConfirmDialog', () => {
  test('open dialog with default props passes WCAG 2.1 AA', async () => {
    const { container } = render(
      <ConfirmDialog
        open
        title="حذف المستفيد"
        message="هل أنت متأكد من حذف هذا المستفيد؟ لا يمكن التراجع."
        confirmText="حذف"
        cancelText="إلغاء"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    await expectNoA11yViolations(container);
  });

  test('closed dialog has no violations', async () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="x"
        message="y"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    await expectNoA11yViolations(container);
  });

  test('dialog with long Arabic content (RTL stress test)', async () => {
    const longMessage =
      'هذا الإجراء سيقوم بحذف المستفيد بشكل دائم بما في ذلك جميع البيانات المرتبطة ' +
      'به من جلسات وتقييمات وخطط رعاية وسجلات مالية. لا يمكن التراجع عن هذا الإجراء. ' +
      'يرجى التأكد قبل المتابعة.';
    const { container } = render(
      <ConfirmDialog
        open
        title="حذف نهائي"
        message={longMessage}
        confirmText="نعم، احذف"
        cancelText="تراجع"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    await expectNoA11yViolations(container);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Baseline reporter — records counts at all severities so we can track drift.
// This test never fails; it just emits a summary line for CI logs / dashboards.
// ─────────────────────────────────────────────────────────────────────────────
describe('a11y baseline (informational)', () => {
  test('common-components baseline severity counts', async () => {
    const samples = [
      ['LoadingSpinner', <LoadingSpinner open message="x" />],
      [
        'ConfirmDialog',
        <ConfirmDialog
          open
          title="t"
          message="m"
          onConfirm={() => {}}
          onCancel={() => {}}
        />,
      ],
    ];

    for (const [name, element] of samples) {
      const { container } = render(element);
      const audit = await auditA11y(container);
      // eslint-disable-next-line no-console
      console.log(
        `[a11y-baseline] ${name}: critical=${audit.bySeverity.critical} ` +
          `serious=${audit.bySeverity.serious} ` +
          `moderate=${audit.bySeverity.moderate} ` +
          `minor=${audit.bySeverity.minor}`
      );
      // Hard ceiling: critical = 0. Serious is also gated by the assertion
      // tests above, so this is just a defense-in-depth tripwire.
      expect(audit.bySeverity.critical).toBe(0);
    }
  });
});
