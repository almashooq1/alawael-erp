/**
 * reporting-renderer-html.test.js — Phase 10 Commit 3.
 *
 * Exercises the HTML template registry: helper escaping, RTL shell,
 * family-update specifics, discipline-report card, generic fallback.
 */

'use strict';

const templates = require('../services/reporting/renderer/htmlTemplates');
const { t, getReportKey } = require('../services/reporting/renderer/translator');
const formatters = require('../services/reporting/renderer/formatters');

function makeCtx({ report, locale = 'ar', recipient = {} } = {}) {
  return {
    report,
    recipient,
    locale,
    formatters,
    t,
    getReportKey,
  };
}

describe('h / raw helpers', () => {
  test('h escapes interpolated values', () => {
    const out = templates.h`<b>${'<x>&"1'}</b>`;
    expect(out).toBe('<b>&lt;x&gt;&amp;&quot;1</b>');
  });

  test('raw passes interpolated values through', () => {
    const out = templates.raw`<div>${'<b>ok</b>'}</div>`;
    expect(out).toBe('<div><b>ok</b></div>');
  });

  test('arrays are joined', () => {
    const out = templates.h`<ul>${['<li>a</li>', '<li>b</li>']}</ul>`;
    // Array members are joined verbatim (not escaped further).
    expect(out).toBe('<ul><li>a</li><li>b</li></ul>');
  });
});

describe('htmlShell', () => {
  test('sets dir=rtl lang=ar for arabic', () => {
    const html = templates.htmlShell({
      locale: 'ar',
      confidentiality: 'internal',
      title: 'X',
      bodyHtml: '<p>ok</p>',
    });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="ar"');
    expect(html).toContain('<p>ok</p>');
  });

  test('renders confidential banner when needed', () => {
    const html = templates.htmlShell({
      locale: 'en',
      confidentiality: 'confidential',
      title: 'X',
      bodyHtml: '',
    });
    expect(html).toContain('rb-banner-confidential');
  });

  test('omits banner <div> for internal/public', () => {
    // "rb-banner" appears inside the embedded <style> regardless; what we
    // care about is that the banner DIV is not emitted.
    const html = templates.htmlShell({
      locale: 'en',
      confidentiality: 'public',
      title: '',
      bodyHtml: '',
    });
    expect(html).not.toMatch(/<div class="rb-banner/);
  });
});

describe('pickTemplate', () => {
  test('real templates for known ids, generic fallback otherwise', () => {
    expect(templates.pickTemplate('ben.progress.weekly')).toBe(templates.renderFamilyUpdate);
    expect(templates.pickTemplate('ben.goal.achievement')).toBe(
      templates.renderDisciplineReportCard
    );
    expect(templates.pickTemplate('anything.else')).toBe(templates.renderGeneric);
  });
});

describe('renderFamilyUpdate', () => {
  const report = {
    id: 'ben.progress.weekly',
    locales: ['ar', 'en'],
    confidentiality: 'restricted',
    nameEn: 'Weekly',
  };

  test('builds subject with beneficiary name interpolated', () => {
    const out = templates.renderFamilyUpdate(
      {
        beneficiary: { fullName: 'Ahmad Ali' },
        periodKey: '2026-W17',
        highlights: [{ text: 'achieved sit-to-stand goal' }],
        concerns: [],
        overallTrend: 'improving',
      },
      makeCtx({ report, locale: 'en', recipient: { fullName: 'Ms. Fatima' } })
    );
    expect(out.subject).toContain('Ahmad Ali');
    expect(out.bodyHtml).toContain('Ms. Fatima');
    expect(out.bodyHtml).toContain('achieved sit-to-stand goal');
    expect(out.bodyHtml).toContain('rb-trend-improving');
    expect(out.bodyText).toContain('Weekly Progress Summary');
  });

  test('HTML is escaped (no injection through beneficiary name)', () => {
    const out = templates.renderFamilyUpdate(
      {
        beneficiary: { fullName: '<script>alert(1)</script>' },
        highlights: [],
        concerns: [],
        overallTrend: 'stable',
      },
      makeCtx({ report, locale: 'en' })
    );
    expect(out.bodyHtml).not.toContain('<script>alert(1)');
    expect(out.bodyHtml).toContain('&lt;script&gt;');
  });

  test('empty highlights/concerns render no_data line', () => {
    const out = templates.renderFamilyUpdate(
      { beneficiary: { fullName: 'X' }, highlights: [], concerns: [], overallTrend: 'stable' },
      makeCtx({ report, locale: 'ar' })
    );
    expect(out.bodyHtml).toContain('لا توجد بيانات');
  });
});

describe('renderDisciplineReportCard', () => {
  const report = {
    id: 'ben.goal.achievement',
    locales: ['ar', 'en'],
    confidentiality: 'restricted',
  };

  test('renders one row per discipline with formatted percent', () => {
    const out = templates.renderDisciplineReportCard(
      {
        beneficiary: { fullName: 'Ahmad' },
        periodKey: '2026-04',
        disciplines: [
          {
            disciplineId: 'PT',
            goalsAchieved: 3,
            goalsInProgress: 2,
            goalsNotStarted: 1,
            achievementRate: 0.5,
          },
          {
            disciplineId: 'OT',
            goalsAchieved: 4,
            goalsInProgress: 0,
            goalsNotStarted: 0,
            achievementRate: 1.0,
          },
        ],
      },
      makeCtx({ report, locale: 'en' })
    );
    expect(out.bodyHtml).toContain('PT');
    expect(out.bodyHtml).toContain('OT');
    expect(out.bodyHtml).toContain('50%');
    expect(out.bodyHtml).toContain('100%');
  });

  test('empty disciplines renders single no_data cell', () => {
    const out = templates.renderDisciplineReportCard(
      { beneficiary: { fullName: 'X' }, disciplines: [] },
      makeCtx({ report, locale: 'ar' })
    );
    expect(out.bodyHtml).toMatch(/colspan="5"/);
  });
});

describe('renderGeneric', () => {
  test('surfaces summary.items for stub docs', () => {
    const report = {
      id: 'therapist.productivity.weekly',
      locales: ['ar', 'en'],
      confidentiality: 'internal',
    };
    const out = templates.renderGeneric(
      {
        status: 'stub',
        periodKey: '2026-W17',
        generatedAt: new Date().toISOString(),
        summary: { items: ['thing A', 'thing B'] },
      },
      makeCtx({ report, locale: 'en' })
    );
    expect(out.bodyHtml).toContain('thing A');
    expect(out.bodyHtml).toContain('thing B');
    expect(out.bodyHtml).toContain('under development');
  });

  test('empty summary shows no_data', () => {
    const report = { id: 'branch.kpi.monthly', locales: ['en'], confidentiality: 'internal' };
    const out = templates.renderGeneric(
      { periodKey: '2026-04' },
      makeCtx({ report, locale: 'en' })
    );
    expect(out.bodyHtml).toContain('No data available');
  });
});
