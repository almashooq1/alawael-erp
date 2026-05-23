/**
 * mudad-wps-orchestrator-wave282.test.js — Monthly WPS end-to-end (W282).
 *
 * The orchestrator is the missing glue. Tests cover:
 *   (1) idempotency key is deterministic for same (branchId, period)
 *   (2) MFA tier 2 enforced when enforceMfa:true
 *   (3) no-payroll path returns status='no_payroll'
 *   (4) duplicate-batch path returns existing batchId
 *   (5) validation-failure path returns status='validation_failed' + failures
 *   (6) upload-failure path: audit emitted + error propagated
 *   (7) happy path: full chain → status='submitted' or 'partial_success'
 *   (8) hrNotifier called on per-employee failures
 *   (9) missing required collaborators (payrollLoader, uploader) → clear errors
 */

'use strict';

jest.unmock('mongoose');

const orchestratorFactory = require('../services/mudad-wps-orchestrator.service');

describe('W282 — Mudad WPS monthly orchestrator', () => {
  // ── Helpers ──────────────────────────────────────────────────────────
  function makeMudadService(opts = {}) {
    return {
      async createBatchForPeriod({ branchId, period, records, idempotencyKey }) {
        if (opts.throwDuplicate) {
          const err = new Error('Duplicate batch');
          err.code = 'MUDAD_DUPLICATE_BATCH';
          err.existingBatchId = 'existing-batch-123';
          throw err;
        }
        return {
          _id: `batch-${branchId}-${period.year}-${period.month}`,
          recordCount: records.length,
          idempotencyKey,
        };
      },
      async generateWPSFile(batchId) {
        return { fileContent: `SIF-MOCK\n${batchId}` };
      },
      async validateBatch() {
        return opts.validationErrors
          ? { errors: opts.validationErrors, warnings: [] }
          : { errors: [], warnings: [] };
      },
    };
  }

  function makeOrch({
    mudadService,
    payrollRecords = [],
    uploadFn,
    statusFn,
    notifyFn,
    audit,
    enforceMfa = false,
  } = {}) {
    return orchestratorFactory({
      mudadService,
      payrollLoader: async () => payrollRecords,
      uploader: uploadFn || (async (_b, _f) => ({ submissionId: 'sub-1', acceptedAt: new Date() })),
      statusPoller: statusFn,
      hrNotifier: notifyFn,
      auditLogger: audit,
      enforceMfa,
    });
  }

  // ── 1. Idempotency key determinism ───────────────────────────────────
  it('batchKey deterministic for same (branchId, period)', () => {
    const orch = orchestratorFactory({ mudadService: makeMudadService() });
    const k1 = orch._batchKey('branch-1', { year: 2026, month: 5 });
    const k2 = orch._batchKey('branch-1', { year: 2026, month: 5 });
    expect(k1).toBe(k2);
    expect(k1).toHaveLength(24);
    // Different period → different key
    expect(orch._batchKey('branch-1', { year: 2026, month: 6 })).not.toBe(k1);
  });

  // ── 2. MFA gate ──────────────────────────────────────────────────────
  it('enforceMfa:true rejects actor with tier < 2', async () => {
    const orch = makeOrch({ mudadService: makeMudadService(), enforceMfa: true });
    await expect(
      orch.executeMonthlyWPSUpload({
        branchId: 'b1',
        period: { year: 2026, month: 5 },
        actor: { userId: 'u1', mfaTier: 1 },
      })
    ).rejects.toMatchObject({ code: 'MUDAD_WPS_MFA_INSUFFICIENT' });
  });

  it('enforceMfa:true accepts actor with tier 2', async () => {
    const orch = makeOrch({
      mudadService: makeMudadService(),
      payrollRecords: [],
      enforceMfa: true,
    });
    const result = await orch.executeMonthlyWPSUpload({
      branchId: 'b1',
      period: { year: 2026, month: 5 },
      actor: { userId: 'u1', mfaTier: 2 },
    });
    expect(result.status).toBe('no_payroll');
  });

  // ── 3. No-payroll early exit ─────────────────────────────────────────
  it('no payroll records → status=no_payroll, no batch created', async () => {
    const orch = makeOrch({ mudadService: makeMudadService(), payrollRecords: [] });
    const result = await orch.executeMonthlyWPSUpload({
      branchId: 'b1',
      period: { year: 2026, month: 5 },
      actor: { userId: 'u1', mfaTier: 2 },
    });
    expect(result.status).toBe('no_payroll');
    expect(result.batchId).toBeNull();
    expect(result.perEmployeeCount).toBe(0);
  });

  // ── 4. Duplicate batch handled ───────────────────────────────────────
  it('createBatchForPeriod returns DUPLICATE → status=duplicate_batch with existingId', async () => {
    const orch = makeOrch({
      mudadService: makeMudadService({ throwDuplicate: true }),
      payrollRecords: [{ employee: 'e1', netSalary: 5000, iban: 'SA' + '1'.repeat(22) }],
    });
    const result = await orch.executeMonthlyWPSUpload({
      branchId: 'b1',
      period: { year: 2026, month: 5 },
      actor: { userId: 'u1', mfaTier: 2 },
    });
    expect(result.status).toBe('duplicate_batch');
    expect(result.batchId).toBe('existing-batch-123');
  });

  // ── 5. Validation failure short-circuits before upload ──────────────
  it('validation errors → status=validation_failed with failures list', async () => {
    const validationErrors = [
      { employeeId: 'e1', field: 'iban', message: 'Invalid IBAN', severity: 'error' },
    ];
    const orch = makeOrch({
      mudadService: makeMudadService({ validationErrors }),
      payrollRecords: [{ employee: 'e1', netSalary: 5000, iban: 'bad' }],
    });
    const result = await orch.executeMonthlyWPSUpload({
      branchId: 'b1',
      period: { year: 2026, month: 5 },
      actor: { userId: 'u1', mfaTier: 2 },
    });
    expect(result.status).toBe('validation_failed');
    expect(result.failures).toEqual(validationErrors);
  });

  // ── 6. Upload failure surfaces + audits ─────────────────────────────
  it('uploader throw → audit emits + error propagated', async () => {
    const events = [];
    const audit = { log: async e => events.push(e) };
    const uploadFn = async () => {
      const err = new Error('Mudad endpoint timeout');
      err.code = 'MUDAD_UPLOAD_TIMEOUT';
      throw err;
    };
    const orch = makeOrch({
      mudadService: makeMudadService(),
      payrollRecords: [{ employee: 'e1', netSalary: 5000, iban: 'SA' + '1'.repeat(22) }],
      uploadFn,
      audit,
    });
    await expect(
      orch.executeMonthlyWPSUpload({
        branchId: 'b1',
        period: { year: 2026, month: 5 },
        actor: { userId: 'u1', mfaTier: 2 },
      })
    ).rejects.toMatchObject({ code: 'MUDAD_UPLOAD_TIMEOUT' });

    const uploadFailEvent = events.find(e => e.action === 'execute_upload_failed');
    expect(uploadFailEvent).toBeTruthy();
    expect(uploadFailEvent.errorCode).toBe('MUDAD_UPLOAD_TIMEOUT');
  });

  // ── 7. Happy path ────────────────────────────────────────────────────
  it('happy path → status=submitted, submissionId set, audit completed', async () => {
    const events = [];
    const audit = { log: async e => events.push(e) };
    const orch = makeOrch({
      mudadService: makeMudadService(),
      payrollRecords: Array.from({ length: 12 }, (_, i) => ({
        employee: `e${i}`,
        netSalary: 5000 + i * 100,
        iban: 'SA' + '1'.repeat(22),
      })),
      statusFn: async () => ({ perEmployeeStatuses: [] }),
      audit,
    });
    const result = await orch.executeMonthlyWPSUpload({
      branchId: 'b1',
      period: { year: 2026, month: 5 },
      actor: { userId: 'u1', mfaTier: 2 },
    });
    expect(result.status).toBe('submitted');
    expect(result.submissionId).toBe('sub-1');
    expect(result.perEmployeeCount).toBe(12);
    expect(result.failures).toEqual([]);
    expect(events.some(e => e.action === 'execute_completed')).toBe(true);
  });

  // ── 8. HR notifier on partial failure ────────────────────────────────
  it('per-employee failures → hrNotifier called + status=partial_success', async () => {
    const notifyCalls = [];
    const notifyFn = async args => notifyCalls.push(args);
    const orch = makeOrch({
      mudadService: makeMudadService(),
      payrollRecords: [{ employee: 'e1', netSalary: 5000, iban: 'SA' + '1'.repeat(22) }],
      statusFn: async () => ({
        perEmployeeStatuses: [
          { employeeId: 'e1', status: 'failed', reason: 'IBAN rejected by bank' },
        ],
      }),
      notifyFn,
    });
    const result = await orch.executeMonthlyWPSUpload({
      branchId: 'b1',
      period: { year: 2026, month: 5 },
      actor: { userId: 'u1', mfaTier: 2 },
    });
    expect(result.status).toBe('partial_success');
    expect(result.failures.length).toBe(1);
    expect(notifyCalls.length).toBe(1);
    expect(notifyCalls[0].failures[0].employeeId).toBe('e1');
  });

  // ── 9. Misconfiguration errors ───────────────────────────────────────
  it('missing payrollLoader → clear error code', async () => {
    const orch = orchestratorFactory({
      mudadService: makeMudadService(),
      payrollLoader: null,
      uploader: async () => ({ submissionId: 'x' }),
    });
    await expect(
      orch.executeMonthlyWPSUpload({
        branchId: 'b1',
        period: { year: 2026, month: 5 },
        actor: { userId: 'u1', mfaTier: 2 },
      })
    ).rejects.toMatchObject({ code: 'MUDAD_WPS_PAYROLL_LOADER_MISSING' });
  });

  it('missing uploader → clear error code (after payroll loaded)', async () => {
    const orch = orchestratorFactory({
      mudadService: makeMudadService(),
      payrollLoader: async () => [{ employee: 'e1', netSalary: 5000, iban: 'SA' + '1'.repeat(22) }],
      uploader: null,
    });
    await expect(
      orch.executeMonthlyWPSUpload({
        branchId: 'b1',
        period: { year: 2026, month: 5 },
        actor: { userId: 'u1', mfaTier: 2 },
      })
    ).rejects.toMatchObject({ code: 'MUDAD_WPS_UPLOADER_MISSING' });
  });
});
