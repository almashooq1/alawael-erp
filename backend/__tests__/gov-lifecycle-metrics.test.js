'use strict';
/**
 * gov-lifecycle-metrics.test.js — Wave 309
 *
 * Verifies the gov adapter lifecycle counters added to risk-metrics.registry
 * are emitted correctly via the W302 Prometheus exporter, with provider-scoped
 * labels intact through the sanitizer.
 */

const path = require('path');

describe('W309 — gov adapter lifecycle metrics', () => {
  let registry;
  let metricsModule;

  beforeAll(() => {
    registry = require(path.join('..', 'intelligence', 'risk-metrics.registry'));
    metricsModule = require(path.join('..', 'middleware', 'metrics.middleware'));
  });

  beforeEach(() => {
    registry._reset();
  });

  it('exports GOV_CONSENT + GOV_REPORT_SUBMISSION canonical names', () => {
    expect(registry.NAMES.GOV_CONSENT).toBe('gov.adapter.consent');
    expect(registry.NAMES.GOV_REPORT_SUBMISSION).toBe('gov.report.submission');
  });

  it('inc + snapshotGrouped preserves provider+result label pairs', () => {
    registry.inc(registry.NAMES.GOV_CONSENT, { provider: 'sehhaty', result: 'granted' });
    registry.inc(registry.NAMES.GOV_CONSENT, { provider: 'sehhaty', result: 'granted' });
    registry.inc(registry.NAMES.GOV_CONSENT, { provider: 'sehhaty', result: 'refused' });
    registry.inc(registry.NAMES.GOV_CONSENT, { provider: 'mudad', result: 'granted' });

    const grouped = registry.snapshotGrouped();
    expect(grouped['gov.adapter.consent']).toBeDefined();
    expect(grouped['gov.adapter.consent']['provider=sehhaty,result=granted']).toBe(2);
    expect(grouped['gov.adapter.consent']['provider=sehhaty,result=refused']).toBe(1);
    expect(grouped['gov.adapter.consent']['provider=mudad,result=granted']).toBe(1);
  });

  it('W302 metricsHandler emits sanitized Prometheus lines for gov.report.submission', async () => {
    registry.inc(registry.NAMES.GOV_REPORT_SUBMISSION, {
      provider: 'disability_authority',
      result: 'ok',
    });
    registry.inc(registry.NAMES.GOV_REPORT_SUBMISSION, {
      provider: 'disability_authority',
      result: 'failed',
      reason: 'TIMEOUT',
    });
    registry.inc(registry.NAMES.GOV_REPORT_SUBMISSION, { provider: 'mudad', result: 'ok' }, 5);

    let captured = '';
    const fakeRes = {
      set: () => fakeRes,
      send: body => {
        captured = String(body);
        return fakeRes;
      },
      status: () => fakeRes,
    };
    await metricsModule.metricsHandler({ query: {}, headers: {} }, fakeRes);

    // Sanitized metric name: dots → underscores
    expect(captured).toMatch(
      /gov_report_submission\{[^}]*provider="disability_authority"[^}]*result="ok"[^}]*\}\s+1/
    );
    expect(captured).toMatch(
      /gov_report_submission\{[^}]*provider="disability_authority"[^}]*reason="TIMEOUT"[^}]*result="failed"[^}]*\}\s+1/
    );
    expect(captured).toMatch(
      /gov_report_submission\{[^}]*provider="mudad"[^}]*result="ok"[^}]*\}\s+5/
    );
  });

  it('empty registry does not emit gov_* lines', async () => {
    let captured = '';
    const fakeRes = {
      set: () => fakeRes,
      send: body => {
        captured = String(body);
        return fakeRes;
      },
      status: () => fakeRes,
    };
    await metricsModule.metricsHandler({ query: {}, headers: {} }, fakeRes);
    expect(captured).not.toMatch(/^gov_adapter_consent\{/m);
    expect(captured).not.toMatch(/^gov_report_submission\{/m);
  });
});
