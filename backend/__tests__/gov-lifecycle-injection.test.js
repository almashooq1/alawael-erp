'use strict';
/**
 * gov-lifecycle-injection.test.js — Wave 312
 *
 * Verifies the GOV_CONSENT + GOV_REPORT_SUBMISSION counters are actually
 * emitted at the right moments by the 3 wired services:
 *   - sehhaty.service        → GOV_CONSENT { provider:'sehhaty', result }
 *   - mudad-wps-orchestrator → GOV_REPORT_SUBMISSION { provider:'mudad', result }
 *   - disabilityAuthorityAdapter → GOV_REPORT_SUBMISSION { provider:'disability_authority', result }
 *
 * Pure unit tests — no DB, hand-built stub models + adapters.
 */

const path = require('path');

describe('W312 — GOV lifecycle counter injection', () => {
  let registry;

  beforeAll(() => {
    registry = require(path.join('..', 'intelligence', 'risk-metrics.registry'));
  });

  beforeEach(() => {
    registry._reset();
    // Force re-resolution of cached lazy registry references inside services
    // (services capture _riskMetrics once, but they call inc each time, so
    // _reset() between tests is sufficient).
  });

  // ─── Sehhaty ────────────────────────────────────────────────────────────
  describe('sehhaty.service', () => {
    const sehhatyFactory = require('../services/sehhaty.service');

    function buildSvc({ consentDoc, adapterResult, adapterThrows } = {}) {
      const ConsentModel = {
        findById: jest.fn().mockResolvedValue(consentDoc),
      };
      const adapter = {
        importHealthSummary: adapterThrows
          ? jest.fn().mockRejectedValue(adapterThrows)
          : jest
              .fn()
              .mockResolvedValue(adapterResult || { summary: { foo: 1 }, importedAt: new Date() }),
      };
      return sehhatyFactory({ adapter, ConsentModel });
    }

    it('emits result=granted when consent passes', async () => {
      const svc = buildSvc({
        consentDoc: {
          _id: 'c1',
          beneficiaryId: 'b1',
          type: 'health_summary_import',
          revokedAt: null,
          expiresAt: null,
        },
      });
      await svc.importHealthSummary({
        beneficiaryId: 'b1',
        nationalId: '1234567890',
        consentRecordId: 'c1',
      });
      const g = registry.snapshotGrouped();
      expect(g['gov.adapter.consent']['provider=sehhaty,result=granted']).toBe(1);
    });

    it('emits result=missing when consent record not found', async () => {
      const svc = buildSvc({ consentDoc: null });
      await expect(
        svc.importHealthSummary({ beneficiaryId: 'b1', nationalId: '1', consentRecordId: 'cX' })
      ).rejects.toThrow();
      const g = registry.snapshotGrouped();
      expect(g['gov.adapter.consent']['provider=sehhaty,result=missing']).toBe(1);
    });

    it('emits result=expired when consent is past expiry', async () => {
      const svc = buildSvc({
        consentDoc: {
          _id: 'c1',
          beneficiaryId: 'b1',
          type: 'health_summary_import',
          expiresAt: new Date(Date.now() - 1000),
        },
      });
      await expect(
        svc.importHealthSummary({ beneficiaryId: 'b1', nationalId: '1', consentRecordId: 'c1' })
      ).rejects.toThrow();
      const g = registry.snapshotGrouped();
      expect(g['gov.adapter.consent']['provider=sehhaty,result=expired']).toBe(1);
    });

    it('emits result=revoked when consent has revokedAt', async () => {
      const svc = buildSvc({
        consentDoc: {
          _id: 'c1',
          beneficiaryId: 'b1',
          type: 'health_summary_import',
          revokedAt: new Date(),
        },
      });
      await expect(
        svc.importHealthSummary({ beneficiaryId: 'b1', nationalId: '1', consentRecordId: 'c1' })
      ).rejects.toThrow();
      const g = registry.snapshotGrouped();
      expect(g['gov.adapter.consent']['provider=sehhaty,result=revoked']).toBe(1);
    });
  });

  // ─── Mudad WPS orchestrator ─────────────────────────────────────────────
  describe('mudad-wps-orchestrator', () => {
    const orchestratorFactory = require('../services/mudad-wps-orchestrator.service');

    function buildOrch({
      payroll,
      uploadResult,
      uploadThrows,
      validationErrors,
      createThrows,
    } = {}) {
      return orchestratorFactory({
        mudadService: {
          createBatchForPeriod: createThrows
            ? jest.fn().mockRejectedValue(createThrows)
            : jest.fn().mockResolvedValue({ _id: 'batch1' }),
          generateWPSFile: jest.fn().mockResolvedValue({ fileContent: 'SIF' }),
          validateBatch: jest.fn().mockResolvedValue({ errors: validationErrors || [] }),
        },
        payrollLoader: jest.fn().mockResolvedValue(payroll || []),
        uploader: uploadThrows
          ? jest.fn().mockRejectedValue(uploadThrows)
          : jest.fn().mockResolvedValue(uploadResult || { submissionId: 'sub1' }),
        statusPoller: null,
        hrNotifier: null,
      });
    }

    const period = { year: 2026, month: 5 };

    it('emits result=skipped reason=NO_PAYROLL when payroll empty', async () => {
      const orch = buildOrch({ payroll: [] });
      await orch.executeMonthlyWPSUpload({ branchId: 'b1', period });
      const g = registry.snapshotGrouped();
      expect(g['gov.report.submission']['provider=mudad,reason=NO_PAYROLL,result=skipped']).toBe(1);
    });

    it('emits result=skipped reason=DUPLICATE_BATCH on duplicate', async () => {
      const orch = buildOrch({
        payroll: [{ employeeId: 'e1' }],
        createThrows: Object.assign(new Error('dup'), {
          code: 'MUDAD_DUPLICATE_BATCH',
          existingBatchId: 'oldBatch',
        }),
      });
      await orch.executeMonthlyWPSUpload({ branchId: 'b1', period });
      const g = registry.snapshotGrouped();
      expect(
        g['gov.report.submission']['provider=mudad,reason=DUPLICATE_BATCH,result=skipped']
      ).toBe(1);
    });

    it('emits result=failed reason=VALIDATION on validation errors', async () => {
      const orch = buildOrch({
        payroll: [{ employeeId: 'e1' }],
        validationErrors: [{ field: 'iban', msg: 'bad' }],
      });
      await orch.executeMonthlyWPSUpload({ branchId: 'b1', period });
      const g = registry.snapshotGrouped();
      expect(g['gov.report.submission']['provider=mudad,reason=VALIDATION,result=failed']).toBe(1);
    });

    it('emits result=ok on full success', async () => {
      const orch = buildOrch({ payroll: [{ employeeId: 'e1' }] });
      await orch.executeMonthlyWPSUpload({ branchId: 'b1', period });
      const g = registry.snapshotGrouped();
      expect(g['gov.report.submission']['provider=mudad,result=ok']).toBe(1);
    });

    it('emits result=failed reason=<errcode> on uploader throw', async () => {
      const orch = buildOrch({
        payroll: [{ employeeId: 'e1' }],
        uploadThrows: Object.assign(new Error('boom'), { code: 'MUDAD_NETWORK' }),
      });
      await expect(orch.executeMonthlyWPSUpload({ branchId: 'b1', period })).rejects.toThrow();
      const g = registry.snapshotGrouped();
      expect(g['gov.report.submission']['provider=mudad,reason=MUDAD_NETWORK,result=failed']).toBe(
        1
      );
    });
  });

  // ─── Disability Authority adapter ───────────────────────────────────────
  describe('disabilityAuthorityAdapter.submitPeriodicReport', () => {
    const da = require('../services/disabilityAuthorityAdapter');

    it('emits provider=disability_authority,result=ok on successful mock submit', async () => {
      await da.submitPeriodicReport({
        reportNumber: 'R-2026-05',
        period: { startDate: '2026-05-01', endDate: '2026-05-31' },
        payload: { x: 1 },
      });
      const g = registry.snapshotGrouped();
      expect(g['gov.report.submission']['provider=disability_authority,result=ok']).toBe(1);
    });

    it('emits provider=disability_authority,result=failed,reason=DA_INVALID_INPUT on bad input', async () => {
      await expect(da.submitPeriodicReport({})).rejects.toThrow();
      const g = registry.snapshotGrouped();
      expect(
        g['gov.report.submission'][
          'provider=disability_authority,reason=DA_INVALID_INPUT,result=failed'
        ]
      ).toBe(1);
    });
  });
});
