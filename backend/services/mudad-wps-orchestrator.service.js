/**
 * mudad-wps-orchestrator.service.js — Monthly WPS end-to-end (W282 Phase 3 #4).
 *
 * Closes the CLAUDE.md known-issue: `mudad.service.js` had the pieces
 * (config CRUD, batch create, generateWPSFile, validateBatch, 4 models)
 * but `executeMonthlyWPSUpload()` was missing. This orchestrator wires
 * the lifecycle end-to-end:
 *
 *   1. collectPayroll(branchId, period) — read finalized payroll records
 *      from the payroll service for the month.
 *   2. createBatch + addSalaryRecords — populates MudadBatch + per-employee
 *      MudadSalaryRecord rows.
 *   3. generateWPSFile — produces SAMA-spec SIF (Salary Information File).
 *   4. validateBatch — pre-flight check (IBAN, nationalId, salary>0).
 *   5. uploadBatch — calls the adapter (mock or live).
 *   6. pollStatus — periodic status query until terminal state.
 *   7. notifyHR — alert on failed-employees.
 *
 * Idempotency: batchKey = sha256(branchId + period.year + period.month)
 * prevents double-upload if the cron retries.
 *
 * MFA (W275 service-layer pattern): factory option `enforceMfa:true`
 * makes executeMonthlyWPSUpload reject actors with mfaTier < 2.
 * Payroll-touching operations need step-up.
 */

'use strict';

const crypto = require('crypto');

function mudadWpsOrchestratorFactory({
  mudadService,
  payrollLoader = null, // async (branchId, period) → [{ employee, netSalary, iban, ... }]
  uploader = null, // async (batchId, fileContent) → { submissionId, acceptedAt }
  statusPoller = null, // async (submissionId) → { status, perEmployeeStatuses }
  hrNotifier = null, // async ({ batchId, failures }) → void
  auditLogger = null,
  enforceMfa = false,
} = {}) {
  if (!mudadService) throw new Error('mudadWpsOrchestrator: mudadService required');

  function batchKey(branchId, period) {
    return crypto
      .createHash('sha256')
      .update(`${branchId}|${period.year}|${period.month}`)
      .digest('hex')
      .slice(0, 24);
  }

  async function audit(action, payload) {
    if (!auditLogger) return;
    try {
      await auditLogger.log({
        component: 'mudad-wps',
        action,
        timestamp: new Date(),
        ...payload,
      });
    } catch {
      /* best-effort */
    }
  }

  /**
   * executeMonthlyWPSUpload — the orchestration. Idempotent.
   *
   * @param {{ branchId, period: { year, month }, actor }} input
   * @returns {{ batchId, submissionId?, status, idempotencyKey, perEmployeeCount, failures }}
   */
  async function executeMonthlyWPSUpload({ branchId, period, actor }) {
    if (!branchId || !period?.year || !period?.month) {
      const err = new Error('branchId + period.{year,month} required');
      err.code = 'MUDAD_WPS_INVALID_INPUT';
      throw err;
    }
    if (enforceMfa) {
      const tier = actor?.mfaTier || 0;
      if (tier < 2) {
        const err = new Error('Monthly WPS upload requires MFA tier 2');
        err.code = 'MUDAD_WPS_MFA_INSUFFICIENT';
        throw err;
      }
    }

    const idempotencyKey = batchKey(branchId, period);
    await audit('execute_started', { branchId, period, idempotencyKey, actorId: actor?.userId });

    // Step 1: collect payroll
    if (!payrollLoader) {
      const err = new Error('payrollLoader not configured — wire one at construction');
      err.code = 'MUDAD_WPS_PAYROLL_LOADER_MISSING';
      throw err;
    }
    const payrollRecords = await payrollLoader(branchId, period);
    if (!Array.isArray(payrollRecords) || payrollRecords.length === 0) {
      await audit('execute_no_payroll', { branchId, period, idempotencyKey });
      return {
        batchId: null,
        status: 'no_payroll',
        idempotencyKey,
        perEmployeeCount: 0,
        failures: [],
      };
    }

    // Step 2: create batch + records (delegate to existing mudadService)
    let batch;
    try {
      batch = await mudadService.createBatchForPeriod({
        branchId,
        period,
        records: payrollRecords,
        idempotencyKey,
      });
    } catch (err) {
      // If a batch with this idempotencyKey already exists, mudadService
      // should return it. We surface the duplicate via a distinct path:
      if (err.code === 'MUDAD_DUPLICATE_BATCH') {
        await audit('execute_duplicate_batch', { branchId, period, idempotencyKey });
        return {
          batchId: err.existingBatchId,
          status: 'duplicate_batch',
          idempotencyKey,
          perEmployeeCount: 0,
          failures: [],
        };
      }
      throw err;
    }

    // Step 3: generate SIF
    const { fileContent } = await mudadService.generateWPSFile(batch._id);

    // Step 4: pre-flight validate
    const validation = await mudadService.validateBatch(batch._id);
    if (validation?.errors?.length > 0) {
      await audit('execute_validation_failed', {
        branchId,
        batchId: String(batch._id),
        idempotencyKey,
        errorCount: validation.errors.length,
      });
      return {
        batchId: String(batch._id),
        status: 'validation_failed',
        idempotencyKey,
        perEmployeeCount: payrollRecords.length,
        failures: validation.errors,
      };
    }

    // Step 5: upload via adapter
    if (!uploader) {
      const err = new Error('uploader not configured — wire one at construction');
      err.code = 'MUDAD_WPS_UPLOADER_MISSING';
      throw err;
    }
    let uploadResult;
    try {
      uploadResult = await uploader(String(batch._id), fileContent, { idempotencyKey });
    } catch (err) {
      await audit('execute_upload_failed', {
        branchId,
        batchId: String(batch._id),
        idempotencyKey,
        errorCode: err.code,
      });
      throw err;
    }

    // Step 6: poll status (best-effort within request; cron does follow-up)
    let perEmployeeStatuses = [];
    if (statusPoller && uploadResult.submissionId) {
      try {
        const polled = await statusPoller(uploadResult.submissionId);
        perEmployeeStatuses = polled.perEmployeeStatuses || [];
      } catch {
        // poll failure non-fatal — the cron picks up next run
      }
    }

    const failures = perEmployeeStatuses.filter(s => s.status === 'failed');

    // Step 7: notify HR on any failure
    if (failures.length > 0 && hrNotifier) {
      try {
        await hrNotifier({
          batchId: String(batch._id),
          submissionId: uploadResult.submissionId,
          failures,
          period,
          branchId,
        });
      } catch {
        // notification failure non-fatal
      }
    }

    await audit('execute_completed', {
      branchId,
      batchId: String(batch._id),
      submissionId: uploadResult.submissionId,
      idempotencyKey,
      perEmployeeCount: payrollRecords.length,
      failureCount: failures.length,
    });

    return {
      batchId: String(batch._id),
      submissionId: uploadResult.submissionId,
      status: failures.length > 0 ? 'partial_success' : 'submitted',
      idempotencyKey,
      perEmployeeCount: payrollRecords.length,
      failures,
    };
  }

  return {
    executeMonthlyWPSUpload,
    _batchKey: batchKey, // for tests
  };
}

module.exports = mudadWpsOrchestratorFactory;
