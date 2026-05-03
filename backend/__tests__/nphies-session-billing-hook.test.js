/**
 * nphies-session-billing-hook.test.js
 *
 * Verifies that the reconciliation service's `applyClaimUpdate()` side-
 * effect correctly marks the linked TherapySession as billed when (and
 * only when) the claim transitions INTO APPROVED.
 *
 * Lifecycle scenarios covered:
 *   • PENDING_REVIEW → APPROVED + has session     → session.isBilled = true
 *   • PENDING_REVIEW → APPROVED + NO session      → no session update
 *   • APPROVED       → APPROVED (idempotent)      → no session update
 *   • PENDING_REVIEW → REJECTED                   → no session update
 *   • PENDING_REVIEW → APPROVED + already-billed  → no double-mark
 *   • Session model throws                        → claim still saved (hook is best-effort)
 */

'use strict';

const { createService } = require('../services/nphiesReconciliationService');

function makeClaim({ status = 'PENDING_REVIEW', session = null } = {}) {
  const obj = {
    _id: `claim-${Math.random().toString(36).slice(2, 8)}`,
    claimNumber: 'CLM-001',
    memberId: 'M-1',
    insurerId: 'I-1',
    totalAmount: 500,
    session,
    status: 'SUBMITTED',
    nphies: {
      submission: {
        status,
        claimReference: 'REF-001',
        submittedAt: new Date(Date.now() - 60_000),
      },
    },
  };
  obj.toObject = () => JSON.parse(JSON.stringify(obj));
  obj.save = jest.fn(async () => obj);
  return obj;
}

function makeClaimModel(initial) {
  return {
    findOne: jest.fn(async q => {
      if (q['nphies.submission.claimReference'] === initial.nphies.submission.claimReference) {
        return initial;
      }
      return null;
    }),
  };
}

function makeSessionModel({ throwOnUpdate = false, modifiedCount = 1 } = {}) {
  return {
    updateOne: jest.fn(async () => {
      if (throwOnUpdate) throw new Error('mongo-down');
      return { modifiedCount };
    }),
  };
}

const APPROVED_PAYLOAD = {
  claimReference: 'REF-001',
  status: 'APPROVED',
  approvedAmount: 500,
};

describe('nphies recon → session billing hook', () => {
  test('marks session billed on first transition to APPROVED', async () => {
    const claim = makeClaim({ session: 'sess-123' });
    const claimModel = makeClaimModel(claim);
    const sessionModel = makeSessionModel();
    const svc = createService({ claimModel, sessionModel });

    const r = await svc.processWebhook(APPROVED_PAYLOAD);

    expect(r.matched).toBe(true);
    expect(r.sessionUpdated).toBe(true);
    expect(claim.save).toHaveBeenCalled();
    expect(sessionModel.updateOne).toHaveBeenCalledWith(
      { _id: 'sess-123', isBilled: { $ne: true } },
      { $set: { isBilled: true, invoiceId: claim._id } }
    );
  });

  test('does NOT touch session when claim has no linked session', async () => {
    const claim = makeClaim({ session: null });
    const claimModel = makeClaimModel(claim);
    const sessionModel = makeSessionModel();
    const svc = createService({ claimModel, sessionModel });

    const r = await svc.processWebhook(APPROVED_PAYLOAD);

    expect(r.matched).toBe(true);
    expect(r.sessionUpdated).toBe(false);
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });

  test('does NOT re-update session when already APPROVED (idempotent)', async () => {
    const claim = makeClaim({ status: 'APPROVED', session: 'sess-123' });
    const claimModel = makeClaimModel(claim);
    const sessionModel = makeSessionModel();
    const svc = createService({ claimModel, sessionModel });

    await svc.processWebhook(APPROVED_PAYLOAD);

    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });

  test('does NOT touch session on REJECTED outcome', async () => {
    const claim = makeClaim({ session: 'sess-123' });
    const claimModel = makeClaimModel(claim);
    const sessionModel = makeSessionModel();
    const svc = createService({ claimModel, sessionModel });

    await svc.processWebhook({ ...APPROVED_PAYLOAD, status: 'REJECTED' });

    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });

  test('reports sessionUpdated:false when filter excludes already-billed session', async () => {
    const claim = makeClaim({ session: 'sess-123' });
    const claimModel = makeClaimModel(claim);
    // updateOne with `isBilled: { $ne: true }` returns modifiedCount: 0 if
    // the session was already billed by some other path.
    const sessionModel = makeSessionModel({ modifiedCount: 0 });
    const svc = createService({ claimModel, sessionModel });

    const r = await svc.processWebhook(APPROVED_PAYLOAD);

    expect(sessionModel.updateOne).toHaveBeenCalled();
    expect(r.sessionUpdated).toBe(false);
  });

  test('claim still saves when session model throws (best-effort hook)', async () => {
    const claim = makeClaim({ session: 'sess-123' });
    const claimModel = makeClaimModel(claim);
    const sessionModel = makeSessionModel({ throwOnUpdate: true });
    const svc = createService({ claimModel, sessionModel });

    const r = await svc.processWebhook(APPROVED_PAYLOAD);

    expect(r.matched).toBe(true);
    expect(claim.save).toHaveBeenCalled();
    expect(claim.nphies.submission.status).toBe('APPROVED');
    expect(r.sessionUpdated).toBe(false);
  });

  test('null sessionModel injection skips the hook entirely', async () => {
    const claim = makeClaim({ session: 'sess-123' });
    const claimModel = makeClaimModel(claim);
    const svc = createService({ claimModel, sessionModel: null });

    const r = await svc.processWebhook(APPROVED_PAYLOAD);

    expect(r.matched).toBe(true);
    expect(r.sessionUpdated).toBe(false);
  });

  test('treats ACCEPTED status alias the same as APPROVED', async () => {
    const claim = makeClaim({ session: 'sess-123' });
    const claimModel = makeClaimModel(claim);
    const sessionModel = makeSessionModel();
    const svc = createService({ claimModel, sessionModel });

    await svc.processWebhook({ ...APPROVED_PAYLOAD, status: 'ACCEPTED' });

    expect(sessionModel.updateOne).toHaveBeenCalledTimes(1);
  });
});
