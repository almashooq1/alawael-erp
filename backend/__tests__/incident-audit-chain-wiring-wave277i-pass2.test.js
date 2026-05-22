'use strict';

/**
 * incident-audit-chain-wiring-wave277i-pass2.test.js — Wave 277i Pass 2.
 *
 * Pass 1 (commit 6d644c705) shipped the model + service in isolation.
 * Pass 2 wires append() into IncidentController lifecycle methods +
 * adds GET /:id/audit-chain. This test verifies the wiring without a
 * real DB or supertest — it injects a stub chain service onto a
 * fake req.app, invokes controller methods directly, and asserts the
 * stub captured the expected append() calls.
 *
 * What's tested:
 *   - All 10 lifecycle methods (create / update / status / assign /
 *     responder / escalate / resolve / close / archive / delete)
 *     call _appendAudit with the right action + subjectId + branchId
 *   - GET /:id/audit-chain returns entries + integrity
 *   - GET /:id/audit-chain returns 503 when service is unwired
 *   - Audit-write failure does NOT propagate (controller still succeeds)
 *   - Controller-level route wiring: /:id/audit-chain layer exists
 *
 * The W277i Pass 1 service tests cover the chain itself; this test
 * covers the CONTROLLER ↔ SERVICE binding.
 */

jest.unmock('mongoose');

// Mock the incident SERVICE (so we don't hit DB). jest.mock factories
// are hoisted ABOVE module-scope vars, so jest only allows references
// inside the factory if the var name starts with `mock` (case insensitive).
// We define stubs inside the factory then require them back via
// `jest.requireMock` AFTER the mock is installed.
jest.mock('../services/incidentService', () => ({
  createIncident: jest.fn(),
  updateIncident: jest.fn(),
  deleteIncident: jest.fn(),
  updateIncidentStatus: jest.fn(),
  assignIncident: jest.fn(),
  addResponder: jest.fn(),
  escalateIncident: jest.fn(),
  resolveIncident: jest.fn(),
  closeIncident: jest.fn(),
  archiveIncident: jest.fn(),
}));

// Mock the validation chain helper so we don't have to construct
// express-validator results.
jest.mock('express-validator', () => ({
  validationResult: () => ({ isEmpty: () => true, array: () => [] }),
}));

const _incidentSvcStubs = require('../services/incidentService');
const controller = require('../controllers/incidentController');

function _makeReq(overrides = {}) {
  return {
    user: { _id: 'actor-1', role: 'admin' },
    params: { id: 'inc-1' },
    body: {},
    query: {},
    app: { _incidentAuditChainService: null },
    ...overrides,
  };
}

function _makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function _makeChainStub() {
  const calls = [];
  return {
    calls,
    append: jest.fn(async args => {
      calls.push(args);
      return { ok: true, entry: { ...args, sequence: calls.length - 1 } };
    }),
    listEntries: jest.fn(async () => ({ ok: true, entries: [{ _id: 'e1' }, { _id: 'e2' }] })),
    verify: jest.fn(async () => ({ ok: true, intact: true, verifiedCount: 2 })),
    getHead: jest.fn(async () => ({ sequence: 1, hash: 'h'.repeat(64) })),
  };
}

beforeEach(() => {
  for (const fn of Object.values(_incidentSvcStubs)) fn.mockReset();
});

// ─── 10 lifecycle methods append the right action ────────────────

describe('Wave 277i Pass 2 — lifecycle methods append audit-chain entries', () => {
  test('createIncident → action=incident-created', async () => {
    const chain = _makeChainStub();
    const req = _makeReq({ app: { _incidentAuditChainService: chain } });
    req.body = { type: 'fall', severity: 'moderate' };
    _incidentSvcStubs.createIncident.mockResolvedValue({
      _id: 'inc-new',
      incidentNumber: 'INC-2026-00001',
      type: 'fall',
      severity: 'moderate',
      branchId: 'br-1',
    });
    await controller.createIncident(req, _makeRes());
    expect(chain.append).toHaveBeenCalledTimes(1);
    expect(chain.calls[0].action).toBe('incident-created');
    expect(chain.calls[0].subjectId).toBe('inc-new');
    expect(chain.calls[0].branchId).toBe('br-1');
    expect(chain.calls[0].actorId).toBe('actor-1');
    expect(chain.calls[0].actorRole).toBe('admin');
    expect(chain.calls[0].payload.incidentNumber).toBe('INC-2026-00001');
  });

  test('updateIncident → action=incident-updated', async () => {
    const chain = _makeChainStub();
    const req = _makeReq({ app: { _incidentAuditChainService: chain } });
    req.body = { title: 'updated', severity: 'major' };
    _incidentSvcStubs.updateIncident.mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' });
    await controller.updateIncident(req, _makeRes());
    expect(chain.calls[0].action).toBe('incident-updated');
    expect(chain.calls[0].payload.changedFields).toEqual(['title', 'severity']);
  });

  test('deleteIncident → action=incident-deleted', async () => {
    const chain = _makeChainStub();
    const req = _makeReq({ app: { _incidentAuditChainService: chain } });
    _incidentSvcStubs.deleteIncident.mockResolvedValue({ message: 'deleted' });
    await controller.deleteIncident(req, _makeRes());
    expect(chain.calls[0].action).toBe('incident-deleted');
    expect(chain.calls[0].subjectId).toBe('inc-1');
  });

  test('updateStatus → action=incident-status-changed (carries new status)', async () => {
    const chain = _makeChainStub();
    const req = _makeReq({ app: { _incidentAuditChainService: chain } });
    req.body = { status: 'closed', notes: 'all done' };
    _incidentSvcStubs.updateIncidentStatus.mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' });
    await controller.updateStatus(req, _makeRes());
    expect(chain.calls[0].action).toBe('incident-status-changed');
    expect(chain.calls[0].payload.to).toBe('closed');
    expect(chain.calls[0].payload.notes).toBe('all done');
  });

  test('assignIncident → action=incident-assigned', async () => {
    const chain = _makeChainStub();
    const req = _makeReq({ app: { _incidentAuditChainService: chain } });
    req.body = { assignedToIds: ['u-1', 'u-2'], teamLeadId: 'u-1' };
    _incidentSvcStubs.assignIncident.mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' });
    await controller.assignIncident(req, _makeRes());
    expect(chain.calls[0].action).toBe('incident-assigned');
    expect(chain.calls[0].payload.assignedToIds).toEqual(['u-1', 'u-2']);
  });

  test('addResponder → action=incident-responder-added', async () => {
    const chain = _makeChainStub();
    const req = _makeReq({ app: { _incidentAuditChainService: chain } });
    req.body = { responderId: 'u-3', role: 'medical' };
    _incidentSvcStubs.addResponder.mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' });
    await controller.addResponder(req, _makeRes());
    expect(chain.calls[0].action).toBe('incident-responder-added');
  });

  test('escalateIncident → action=incident-escalated', async () => {
    const chain = _makeChainStub();
    const req = _makeReq({ app: { _incidentAuditChainService: chain } });
    req.body = { escalatedTo: 'director', reason: 'patient safety' };
    _incidentSvcStubs.escalateIncident.mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' });
    await controller.escalateIncident(req, _makeRes());
    expect(chain.calls[0].action).toBe('incident-escalated');
    expect(chain.calls[0].payload.escalation.reason).toBe('patient safety');
  });

  test('resolveIncident → action=incident-resolved', async () => {
    const chain = _makeChainStub();
    const req = _makeReq({ app: { _incidentAuditChainService: chain } });
    req.body = { resolution: 'investigated, training delivered' };
    _incidentSvcStubs.resolveIncident.mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' });
    await controller.resolveIncident(req, _makeRes());
    expect(chain.calls[0].action).toBe('incident-resolved');
  });

  test('closeIncident → action=incident-closed', async () => {
    const chain = _makeChainStub();
    const req = _makeReq({ app: { _incidentAuditChainService: chain } });
    req.body = { closureNotes: 'final review complete' };
    _incidentSvcStubs.closeIncident.mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' });
    await controller.closeIncident(req, _makeRes());
    expect(chain.calls[0].action).toBe('incident-closed');
  });

  test('archiveIncident → action=incident-archived', async () => {
    const chain = _makeChainStub();
    const req = _makeReq({ app: { _incidentAuditChainService: chain } });
    _incidentSvcStubs.archiveIncident.mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' });
    await controller.archiveIncident(req, _makeRes());
    expect(chain.calls[0].action).toBe('incident-archived');
  });
});

// ─── Graceful degradation ─────────────────────────────────────────

describe('Wave 277i Pass 2 — graceful degradation when chain unwired', () => {
  test('createIncident SUCCEEDS when chain service is null (no crash)', async () => {
    const req = _makeReq({ app: { _incidentAuditChainService: null } });
    _incidentSvcStubs.createIncident.mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' });
    const res = _makeRes();
    await controller.createIncident(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('createIncident SUCCEEDS when chain append throws (audit failure isolated)', async () => {
    const chain = _makeChainStub();
    chain.append = jest.fn().mockRejectedValue(new Error('chain DB down'));
    const req = _makeReq({ app: { _incidentAuditChainService: chain } });
    _incidentSvcStubs.createIncident.mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' });
    const res = _makeRes();
    await controller.createIncident(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(chain.append).toHaveBeenCalledTimes(1);
  });
});

// ─── getAuditChain endpoint handler ───────────────────────────────

describe('Wave 277i Pass 2 — getAuditChain handler', () => {
  test('returns entries + integrity when wired', async () => {
    const chain = _makeChainStub();
    const req = _makeReq({ app: { _incidentAuditChainService: chain } });
    const res = _makeRes();
    await controller.getAuditChain(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data.entries).toHaveLength(2);
    expect(body.data.integrity.intact).toBe(true);
    expect(chain.listEntries).toHaveBeenCalledWith({ subjectId: 'inc-1', limit: 500 });
  });

  test('returns 503 AUDIT_CHAIN_NOT_WIRED when service is null', async () => {
    const req = _makeReq({ app: { _incidentAuditChainService: null } });
    const res = _makeRes();
    await controller.getAuditChain(req, res);
    expect(res.status).toHaveBeenCalledWith(503);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.reason).toBe('AUDIT_CHAIN_NOT_WIRED');
  });

  test('surfaces verifier-detected tamper (intact=false propagated)', async () => {
    const chain = _makeChainStub();
    chain.verify = jest.fn().mockResolvedValue({
      ok: true,
      intact: false,
      breakAtSequence: 5,
      reason: 'PAYLOAD_HASH_MISMATCH',
    });
    const req = _makeReq({ app: { _incidentAuditChainService: chain } });
    const res = _makeRes();
    await controller.getAuditChain(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.data.integrity.intact).toBe(false);
    expect(body.data.integrity.reason).toBe('PAYLOAD_HASH_MISMATCH');
    expect(body.data.integrity.breakAtSequence).toBe(5);
  });
});

// ─── Route wiring (the GET /:id/audit-chain layer exists) ───────

describe('Wave 277i Pass 2 — route wiring', () => {
  test('GET /:id/audit-chain is registered in incidentRoutes', () => {
    delete require.cache[require.resolve('../routes/incidentRoutes')];
    const router = require('../routes/incidentRoutes');
    const match = router.stack.find(
      layer =>
        layer.route &&
        layer.route.methods &&
        layer.route.methods.get &&
        layer.route.path === '/:id/audit-chain'
    );
    expect(match).toBeTruthy();
  });

  test('GET /:id/audit-chain carries NO MFA gate (read-only)', () => {
    delete require.cache[require.resolve('../routes/incidentRoutes')];
    const router = require('../routes/incidentRoutes');
    const layer = router.stack.find(
      l => l.route && l.route.path === '/:id/audit-chain' && l.route.methods && l.route.methods.get
    );
    expect(layer).toBeTruthy();
    const names = (layer.route.stack || []).map(s => s.name).filter(Boolean);
    expect(names).not.toContain('mfaTierGuard');
  });
});
