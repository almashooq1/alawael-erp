'use strict';

const mockSendOpsAlert = jest.fn().mockResolvedValue({ success: true });
jest.mock('../../services/ops-alerter', () => ({
  sendOpsAlert: (...args) => mockSendOpsAlert(...args),
}));

const { runSmoke, PROBES, fireAlertOnFailure } = require('../../scripts/post-deploy-smoke');

// Default 200 responses for every probe path — tests can override
// individual entries by passing a partial map.
const DEFAULT_OK = {
  '/health': { status: 200, body: 'ok' },
  '/api/zatca-phase2/status': { status: 200, body: '{}' },
  '/api/admin/insurance-tariffs': { status: 200, body: '[]' },
  '/api/admin/zatca-credentials': { status: 200, body: '[]' },
  '/api/admin/nphies-claims': { status: 200, body: '[]' },
  '/api/admin/therapy-sessions': { status: 200, body: '[]' },
  '/api/admin/pii-access-audit': { status: 200, body: '{"data":[]}' },
  '/api/management-review/reference': { status: 200, body: '{}' },
  '/api/evidence/reference': { status: 200, body: '{}' },
  '/api/compliance-calendar/reference': { status: 200, body: '{}' },
  '/api/pdpl/retention-periods': { status: 200, body: '{}' },
  '/api/admin/capa': { status: 200, body: '{}' },
  '/api/v1/admin/ops/integration-health': { status: 200, body: '{}' },
  '/api/v1/admin/ops/dlq': { status: 200, body: '{}' },
  '/api/docs/integration.json': { status: 200, body: '{"openapi":"3.1.0"}' },
  // Phase 29 World-Class QMS — 17 module endpoints
  '/api/v1/fmea/reference': { status: 200, body: '{}' },
  '/api/v1/rca/reference': { status: 200, body: '{}' },
  '/api/v1/spc/reference': { status: 200, body: '{}' },
  '/api/v1/pareto-a3/reference': { status: 200, body: '{}' },
  '/api/v1/standards': { status: 200, body: '[]' },
  '/api/v1/controlled-documents/reference': { status: 200, body: '{}' },
  '/api/v1/supplier-quality/reference': { status: 200, body: '{}' },
  '/api/v1/calibration/reference': { status: 200, body: '{}' },
  '/api/v1/change-control/reference': { status: 200, body: '{}' },
  '/api/v1/audit-scheduler/reference': { status: 200, body: '{}' },
  '/api/v1/coq/reference': { status: 200, body: '{}' },
  '/api/v1/predictive-risk/reference': { status: 200, body: '{}' },
  '/api/v1/trend-forecast/forecast': { status: 400, body: '{}' }, // POST-only — 400 on GET is "mounted"
  '/api/v1/quality-narrative/kinds': { status: 200, body: '[]' },
  '/api/v1/inspection-submissions': { status: 401, body: '' }, // auth-gated
  '/api/v1/benchmarks': { status: 200, body: '[]' },
  '/api/v1/quality/command-center': { status: 200, body: '{}' },
};

// Build a fake fetcher we drive per-test. The runner threads it through
// via the `fetcher` option so we don't actually open sockets.
function fakeFetcher(overrides) {
  const map = { ...DEFAULT_OK, ...overrides };
  return jest.fn(async fullUrl => {
    for (const [pattern, response] of Object.entries(map)) {
      if (fullUrl.includes(pattern)) {
        if (response instanceof Error) throw response;
        return response;
      }
    }
    throw new Error(`unmocked: ${fullUrl}`);
  });
}

describe('scripts/post-deploy-smoke', () => {
  describe('PROBES sanity', () => {
    test('every probe declares name + path + expect', () => {
      for (const p of PROBES) {
        expect(typeof p.name).toBe('string');
        expect(typeof p.path).toBe('string');
        expect(p.path.startsWith('/')).toBe(true);
        expect(typeof p.expect).toBe('function');
      }
    });

    test('liveness probe is critical', () => {
      const liveness = PROBES.find(p => p.name === 'liveness');
      expect(liveness.critical).toBe(true);
    });

    test('zatca-phase2-mounted is critical (404 on this is the bug we want to catch)', () => {
      const z = PROBES.find(p => p.name === 'zatca-phase2-mounted');
      expect(z.critical).toBe(true);
    });

    test('every admin bounded context shipped this session has a critical probe', () => {
      // These routes were the focus of 2026-05-02. If the registry
      // pattern regresses (someone forgets to dualMount a new admin
      // bounded context) we want to know on the next deploy.
      for (const name of [
        'insurance-tariffs',
        'zatca-credentials',
        'nphies-claims',
        'therapy-sessions',
      ]) {
        const probe = PROBES.find(p => p.name === name);
        expect(probe).toBeDefined();
        expect(probe.critical).toBe(true);
        expect(probe.path.startsWith('/api/admin/')).toBe(true);
      }
    });

    test('every Phase 29 module has a critical mount probe', () => {
      const expectedPhase29Probes = [
        'phase29-fmea',
        'phase29-rca',
        'phase29-spc',
        'phase29-pareto-a3',
        'phase29-standards',
        'phase29-controlled-documents',
        'phase29-supplier-quality',
        'phase29-calibration',
        'phase29-change-control',
        'phase29-audit-scheduler',
        'phase29-coq',
        'phase29-predictive-risk',
        'phase29-trend-forecast',
        'phase29-quality-narrative',
        'phase29-inspections',
        'phase29-benchmarks',
        'phase29-command-center',
      ];
      for (const name of expectedPhase29Probes) {
        const probe = PROBES.find(p => p.name === name);
        expect(probe).toBeDefined();
        expect(probe.critical).toBe(true);
        // All Phase 29 endpoints live under /api/v1/
        expect(probe.path.startsWith('/api/v1/')).toBe(true);
        // Reject 404 (unmounted) + 5xx (boot failure); accept everything else.
        expect(probe.expect({ status: 404 })).toBe(false);
        expect(probe.expect({ status: 500 })).toBe(false);
        expect(probe.expect({ status: 200 })).toBe(true);
        expect(probe.expect({ status: 401 })).toBe(true);
      }
    });

    test('admin-route probes accept 401 (running without token in deploy)', () => {
      // The deploy doesn't generate a JWT so admin endpoints will return
      // 401. The probe must accept 401 as "mounted" — what we're guarding
      // against is 404 (unmounted) or 5xx (boot failure).
      const insuranceTariffs = PROBES.find(p => p.name === 'insurance-tariffs');
      expect(insuranceTariffs.expect({ status: 401 })).toBe(true);
      expect(insuranceTariffs.expect({ status: 404 })).toBe(false);
      expect(insuranceTariffs.expect({ status: 500 })).toBe(false);
      expect(insuranceTariffs.expect({ status: 200 })).toBe(true);
    });
  });

  describe('runSmoke', () => {
    test('passes when every probe returns the expected response', async () => {
      const fetcher = fakeFetcher({
        '/health': { status: 200, body: 'ok' },
        '/api/zatca-phase2/status': { status: 200, body: '{}' },
        '/api/v1/admin/ops/integration-health': { status: 200, body: '{}' },
        '/api/v1/admin/ops/dlq': { status: 200, body: '{}' },
        '/api/docs/integration.json': { status: 200, body: '{"openapi":"3.1.0"}' },
      });

      const report = await runSmoke({
        base: 'http://test',
        token: 'fake-token',
        fetcher,
      });
      expect(report.ok).toBe(true);
      expect(report.criticalFailures).toBe(0);
      const outcomes = report.results.map(r => r.outcome);
      expect(outcomes).not.toContain('fail');
      expect(outcomes).not.toContain('error');
    });

    test('flips ok=false on critical probe failure', async () => {
      const fetcher = fakeFetcher({
        '/health': { status: 503, body: '' }, // critical liveness fails
        '/api/zatca-phase2/status': { status: 200, body: '{}' },
        '/api/v1/admin/ops/integration-health': { status: 200, body: '{}' },
        '/api/v1/admin/ops/dlq': { status: 200, body: '{}' },
        '/api/docs/integration.json': { status: 200, body: '{"openapi":"3.0"}' },
      });
      const report = await runSmoke({ base: 'http://test', token: 't', fetcher });
      expect(report.ok).toBe(false);
      expect(report.criticalFailures).toBeGreaterThanOrEqual(1);
    });

    test('catches the unmounted-route bug (404 on a critical probe)', async () => {
      // Simulates the exact failure mode that hid the ZATCA routes — the
      // service starts, /health is fine, but /api/zatca-phase2/status is 404.
      const fetcher = fakeFetcher({
        '/health': { status: 200, body: 'ok' },
        '/api/zatca-phase2/status': { status: 404, body: 'Not Found' },
        '/api/v1/admin/ops/integration-health': { status: 200, body: '{}' },
        '/api/v1/admin/ops/dlq': { status: 200, body: '{}' },
        '/api/docs/integration.json': { status: 200, body: '{"openapi":"3"}' },
      });
      const report = await runSmoke({ base: 'http://test', token: 't', fetcher });
      const z = report.results.find(r => r.name === 'zatca-phase2-mounted');
      expect(z.outcome).toBe('fail');
      expect(z.status).toBe(404);
      expect(report.ok).toBe(false);
    });

    test('treats network error as outcome=error, marks critical failure', async () => {
      const fetcher = fakeFetcher({
        '/health': new Error('ECONNREFUSED'),
        '/api/zatca-phase2/status': { status: 200, body: '{}' },
        '/api/v1/admin/ops/integration-health': { status: 200, body: '{}' },
        '/api/v1/admin/ops/dlq': { status: 200, body: '{}' },
        '/api/docs/integration.json': { status: 200, body: '{"openapi":"3"}' },
      });
      const report = await runSmoke({ base: 'http://test', token: 't', fetcher });
      const liveness = report.results.find(r => r.name === 'liveness');
      expect(liveness.outcome).toBe('error');
      expect(liveness.error).toMatch(/ECONNREFUSED/);
      expect(report.ok).toBe(false);
    });

    test('skips needsAuth probes when no token is set', async () => {
      const fetcher = fakeFetcher({
        '/health': { status: 200, body: 'ok' },
        '/api/zatca-phase2/status': { status: 200, body: '{}' },
        '/api/docs/integration.json': { status: 200, body: '{"openapi":"3"}' },
      });
      const report = await runSmoke({ base: 'http://test', token: null, fetcher });
      const skipped = report.results.filter(r => r.outcome === 'skipped');
      expect(skipped.length).toBeGreaterThan(0);
      for (const r of skipped) {
        expect(r.reason).toBe('no_token');
      }
    });

    test('non-critical failure does NOT flip overall ok', async () => {
      const fetcher = fakeFetcher({
        '/health': { status: 200, body: 'ok' },
        '/api/zatca-phase2/status': { status: 200, body: '{}' },
        '/api/v1/admin/ops/integration-health': { status: 200, body: '{}' },
        '/api/v1/admin/ops/dlq': { status: 200, body: '{}' },
        // OpenAPI is non-critical; 500 here is acceptable for the gate
        '/api/docs/integration.json': { status: 500, body: '' },
      });
      const report = await runSmoke({ base: 'http://test', token: 't', fetcher });
      expect(report.ok).toBe(true); // non-critical fail does not gate
      const openapi = report.results.find(r => r.name === 'openapi-json');
      expect(openapi.outcome).toBe('fail');
    });

    describe('fireAlertOnFailure', () => {
      beforeEach(() => mockSendOpsAlert.mockClear());

      test('does NOT fire when report.ok is true', async () => {
        await fireAlertOnFailure({ ok: true, criticalFailures: 0, results: [], base: 'http://x' });
        expect(mockSendOpsAlert).not.toHaveBeenCalled();
      });

      test('does NOT fire when there are 0 critical failures', async () => {
        await fireAlertOnFailure({
          ok: true,
          criticalFailures: 0,
          base: 'http://x',
          results: [{ name: 'noncrit', critical: false, outcome: 'fail' }],
        });
        expect(mockSendOpsAlert).not.toHaveBeenCalled();
      });

      test('fires with kind=post_deploy_smoke_failed when critical fails', async () => {
        await fireAlertOnFailure({
          ok: false,
          criticalFailures: 2,
          base: 'http://prod',
          results: [
            {
              name: 'liveness',
              path: '/health',
              critical: true,
              outcome: 'error',
              error: 'ECONNREFUSED',
            },
            {
              name: 'zatca-mounted',
              path: '/api/zatca-phase2/status',
              critical: true,
              outcome: 'fail',
              status: 404,
            },
            { name: 'opt', path: '/x', critical: false, outcome: 'fail' },
          ],
        });
        expect(mockSendOpsAlert).toHaveBeenCalledTimes(1);
        const call = mockSendOpsAlert.mock.calls[0][0];
        expect(call.kind).toBe('post_deploy_smoke_failed');
        expect(call.severity).toBe('critical');
        expect(call.body).toContain('liveness');
        expect(call.body).toContain('zatca-mounted');
        // Non-critical failures are NOT named in the body
        expect(call.body).not.toContain(' opt ');
        expect(call.metadata.failed).toHaveLength(2);
        expect(call.metadata.base).toBe('http://prod');
      });

      test('alerter throw does NOT propagate (best-effort)', async () => {
        mockSendOpsAlert.mockRejectedValueOnce(new Error('alerter-down'));
        await expect(
          fireAlertOnFailure({
            ok: false,
            criticalFailures: 1,
            base: 'http://x',
            results: [
              { name: 'liveness', path: '/health', critical: true, outcome: 'fail', status: 500 },
            ],
          })
        ).resolves.not.toThrow();
      });
    });

    test('expect() throwing is treated as fail (not crash)', async () => {
      const customProbe = {
        name: 'throwing',
        path: '/x',
        critical: true,
        expect: () => {
          throw new Error('predicate-blew-up');
        },
      };
      const fetcher = fakeFetcher({ '/x': { status: 200, body: 'ok' } });
      const report = await runSmoke({
        base: 'http://test',
        token: null,
        probes: [customProbe],
        fetcher,
      });
      expect(report.results[0].outcome).toBe('fail');
      expect(report.ok).toBe(false);
    });
  });
});
