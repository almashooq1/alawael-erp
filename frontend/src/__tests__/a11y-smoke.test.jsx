/**
 * a11y-smoke.test.jsx — accessibility smoke gate (W1306, GAPS Item 9).
 *
 * The repo shipped `axe-core` as a dependency for months but NO test ever
 * invoked it — so a11y regressions could land silently. This is the first
 * real a11y assertion wired into the frontend Jest suite (and therefore CI
 * via `npm run quality:ci`).
 *
 * It runs `axe-core` directly against rendered DOM (no extra dependency —
 * jest-axe is intentionally NOT added; axe-core was already installed). The
 * `color-contrast` rule is disabled because jsdom has no layout engine and
 * cannot compute contrast ratios — that check belongs in the Cypress/axe
 * browser pipeline (cypress-axe is already a devDependency).
 *
 * Scope today: representative UI primitives (accessible form, navigation,
 * data table) + a deliberately-broken fixture that PROVES the harness
 * actually catches violations. Expand `goodFixtures` with real critical
 * screens as they stabilise.
 */

import React from 'react';
import { render } from '@testing-library/react';
import axe from 'axe-core';

const AXE_OPTIONS = {
  // jsdom cannot compute layout → contrast is un-checkable here; covered in
  // the browser (cypress-axe) pipeline instead.
  rules: { 'color-contrast': { enabled: false } },
};

async function analyze(ui) {
  const { container, unmount } = render(ui);
  try {
    const results = await axe.run(container, AXE_OPTIONS);
    return results.violations;
  } finally {
    unmount();
  }
}

function formatViolations(violations) {
  return violations
    .map(v => `${v.id} (${v.impact}): ${v.help} [${v.nodes.length} node(s)]`)
    .join('\n');
}

// ─── Accessible fixtures (must pass) ─────────────────────────────────────────
const AccessibleForm = () => (
  <form aria-label="نموذج تسجيل الدخول">
    <label htmlFor="email">البريد الإلكتروني</label>
    <input id="email" name="email" type="email" />
    <label htmlFor="pwd">كلمة المرور</label>
    <input id="pwd" name="pwd" type="password" />
    <button type="submit">دخول</button>
  </form>
);

const AccessibleNav = () => (
  <nav aria-label="التنقّل الرئيسي">
    <ul>
      <li>
        <a href="/dashboard">لوحة التحكّم</a>
      </li>
      <li>
        <a href="/beneficiaries">المستفيدون</a>
      </li>
    </ul>
  </nav>
);

const AccessibleTable = () => (
  <table>
    <caption>قائمة المستفيدين</caption>
    <thead>
      <tr>
        <th scope="col">الاسم</th>
        <th scope="col">الفرع</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>أحمد</td>
        <td>الرياض</td>
      </tr>
    </tbody>
  </table>
);

// ─── Deliberately broken fixture (must FAIL axe — proves the gate works) ──────
const InaccessibleFixture = () => (
  <div lang="ar" dir="rtl">
    {/* input with no associated label, image with no alt → known violations */}
    <input type="text" />
    <img src="/logo.png" />
  </div>
);

describe('a11y smoke — accessible fixtures have zero axe violations', () => {
  it('accessible login form passes', async () => {
    const violations = await analyze(<AccessibleForm />);
    expect(formatViolations(violations)).toBe('');
  });

  it('accessible navigation passes', async () => {
    const violations = await analyze(<AccessibleNav />);
    expect(formatViolations(violations)).toBe('');
  });

  it('accessible data table passes', async () => {
    const violations = await analyze(<AccessibleTable />);
    expect(formatViolations(violations)).toBe('');
  });
});

describe('a11y smoke — harness actually detects violations', () => {
  it('flags an unlabeled input and an image missing alt text', async () => {
    const violations = await analyze(<InaccessibleFixture />);
    const ids = violations.map(v => v.id);
    // If this ever returns empty, the axe harness is silently broken and the
    // "passing" tests above would be meaningless — this is the canary.
    expect(violations.length).toBeGreaterThan(0);
    expect(ids).toEqual(expect.arrayContaining(['image-alt']));
  });
});
