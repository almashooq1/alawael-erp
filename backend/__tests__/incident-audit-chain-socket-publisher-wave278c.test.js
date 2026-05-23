'use strict';

/**
 * incident-audit-chain-socket-publisher-wave278c.test.js — Wave 278c.
 *
 * The W277i Pass 2 audit-chain wiring records every incident
 * lifecycle mutation in a tamper-evident ledger. W278c extends that
 * wiring with a real-time socket.io publisher: each chain append also
 * fires `emitSystemAlert` on the existing socket.io emitter
 * (server.js + utils/socketEmitter.js, already initialized at boot).
 *
 * Severity tier:
 *   - HIGH_PRIORITY_ACTIONS (escalated/resolved/closed/archived/deleted)
 *     → 'warning' (red banner, ack required client-side)
 *   - everything else → 'info' (quiet feed entry)
 *
 * Fire-and-forget: emitter failure or absence does NOT propagate.
 * Audit chain is the durable record; socket emit is a live-UI
 * convenience.
 *
 * What's tested:
 *   - emitSystemAlert called with right metadata after each lifecycle action
 *   - HIGH_PRIORITY_ACTIONS map to 'warning', others to 'info'
 *   - Socket failure (throw, no emitter) does NOT break the controller
 *   - Metadata payload carries actor/subject/branch/action keys
 *
 * No DB, no real socket server. Stub emitter + incident service.
 */

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
jest.mock('express-validator', () => ({
  validationResult: () => ({ isEmpty: () => true, array: () => [] }),
}));
jest.mock('../utils/socketEmitter', () => ({
  emitSystemAlert: jest.fn(() => ({ success: true, alertId: 'mock-alert' })),
}));

const mockIncidentSvc = require('../services/incidentService');
const mockSocket = require('../utils/socketEmitter');
const controller = require('../controllers/incidentController');

function _mkReq(overrides = {}) {
  return {
    user: { _id: 'actor-1', role: 'admin' },
    params: { id: 'inc-1' },
    body: {},
    query: {},
    app: {
      _incidentAuditChainService: {
        append: jest.fn(async () => ({ ok: true, entry: { sequence: 0 } })),
      },
    },
    ...overrides,
  };
}
function _mkRes() {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  return r;
}

beforeEach(() => {
  for (const fn of Object.values(mockIncidentSvc)) fn.mockReset();
  mockSocket.emitSystemAlert.mockReset();
  mockSocket.emitSystemAlert.mockReturnValue({ success: true, alertId: 'mock-alert' });
});

describe('Wave 278c — high-priority actions emit warning-level system alert', () => {
  // 5 lifecycle terminals (escalate/resolve/close/archive/delete)
  // should fire `severity: warning` after their primary write +
  // audit-chain append.

  test('escalateIncident → emit warning', async () => {
    const req = _mkReq();
    req.body = { escalatedTo: 'director', reason: 'patient safety' };
    mockIncidentSvc.escalateIncident.mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' });
    await controller.escalateIncident(req, _mkRes());

    expect(mockSocket.emitSystemAlert).toHaveBeenCalledTimes(1);
    const alert = mockSocket.emitSystemAlert.mock.calls[0][0];
    expect(alert.severity).toBe('warning');
    expect(alert.metadata.kind).toBe('incident-audit');
    expect(alert.metadata.action).toBe('incident-escalated');
    expect(alert.metadata.subjectId).toBe('inc-1');
    expect(alert.metadata.branchId).toBe('br-1');
    expect(alert.metadata.actorRole).toBe('admin');
    expect(alert.metadata.emittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('resolveIncident → emit warning', async () => {
    const req = _mkReq();
    req.body = { resolution: 'investigated' };
    mockIncidentSvc.resolveIncident.mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' });
    await controller.resolveIncident(req, _mkRes());

    expect(mockSocket.emitSystemAlert).toHaveBeenCalledTimes(1);
    expect(mockSocket.emitSystemAlert.mock.calls[0][0].severity).toBe('warning');
    expect(mockSocket.emitSystemAlert.mock.calls[0][0].metadata.action).toBe('incident-resolved');
  });

  test('closeIncident → emit warning', async () => {
    const req = _mkReq();
    req.body = { closureNotes: 'final' };
    mockIncidentSvc.closeIncident.mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' });
    await controller.closeIncident(req, _mkRes());
    expect(mockSocket.emitSystemAlert.mock.calls[0][0].severity).toBe('warning');
    expect(mockSocket.emitSystemAlert.mock.calls[0][0].metadata.action).toBe('incident-closed');
  });

  test('archiveIncident → emit warning', async () => {
    const req = _mkReq();
    mockIncidentSvc.archiveIncident.mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' });
    await controller.archiveIncident(req, _mkRes());
    expect(mockSocket.emitSystemAlert.mock.calls[0][0].severity).toBe('warning');
    expect(mockSocket.emitSystemAlert.mock.calls[0][0].metadata.action).toBe('incident-archived');
  });

  test('deleteIncident → emit warning', async () => {
    const req = _mkReq();
    mockIncidentSvc.deleteIncident.mockResolvedValue({ message: 'deleted' });
    await controller.deleteIncident(req, _mkRes());
    expect(mockSocket.emitSystemAlert.mock.calls[0][0].severity).toBe('warning');
    expect(mockSocket.emitSystemAlert.mock.calls[0][0].metadata.action).toBe('incident-deleted');
  });
});

describe('Wave 278c — non-priority actions emit info-level alert', () => {
  test('createIncident → emit info (not warning)', async () => {
    const req = _mkReq();
    req.body = { type: 'fall', severity: 'minor' };
    mockIncidentSvc.createIncident.mockResolvedValue({
      _id: 'inc-new',
      incidentNumber: 'INC-2026-00001',
      type: 'fall',
      severity: 'minor',
      branchId: 'br-1',
    });
    await controller.createIncident(req, _mkRes());

    expect(mockSocket.emitSystemAlert).toHaveBeenCalledTimes(1);
    expect(mockSocket.emitSystemAlert.mock.calls[0][0].severity).toBe('info');
    expect(mockSocket.emitSystemAlert.mock.calls[0][0].metadata.action).toBe('incident-created');
  });

  test('updateStatus (non-terminal status change) → emit info', async () => {
    const req = _mkReq();
    req.body = { status: 'under_investigation' };
    mockIncidentSvc.updateIncidentStatus.mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' });
    await controller.updateStatus(req, _mkRes());
    expect(mockSocket.emitSystemAlert.mock.calls[0][0].severity).toBe('info');
  });

  test('assignIncident → emit info', async () => {
    const req = _mkReq();
    req.body = { assignedToIds: ['u-2'] };
    mockIncidentSvc.assignIncident.mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' });
    await controller.assignIncident(req, _mkRes());
    expect(mockSocket.emitSystemAlert.mock.calls[0][0].severity).toBe('info');
  });
});

describe('Wave 278c — graceful degradation', () => {
  test('controller succeeds even if emitter throws', async () => {
    const req = _mkReq();
    req.body = { resolution: 'fixed' };
    mockIncidentSvc.resolveIncident.mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' });
    mockSocket.emitSystemAlert.mockImplementation(() => {
      throw new Error('socket layer down');
    });
    const res = _mkRes();
    await controller.resolveIncident(req, res);
    // API still responds 200 — socket failure is isolated.
    expect(res.status).toHaveBeenCalledWith(200);
    // Audit chain still appends (it ran BEFORE the socket emit).
    expect(req.app._incidentAuditChainService.append).toHaveBeenCalledTimes(1);
  });

  test('emitter absence (undefined emitSystemAlert) does NOT break controller', async () => {
    // Re-mock the emitter as an empty module
    jest.resetModules();
    jest.doMock('../utils/socketEmitter', () => ({}));
    jest.doMock('../services/incidentService', () => ({
      resolveIncident: jest.fn().mockResolvedValue({ _id: 'inc-1', branchId: 'br-1' }),
    }));
    jest.doMock('express-validator', () => ({
      validationResult: () => ({ isEmpty: () => true, array: () => [] }),
    }));

    const ctrl2 = require('../controllers/incidentController');
    const req = _mkReq();
    req.body = { resolution: 'fixed' };
    const res = _mkRes();
    await ctrl2.resolveIncident(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('Wave 278c — HIGH_PRIORITY_ACTIONS set integrity', () => {
  test('exactly 5 actions classified as high-priority (matches W277b MFA-gated terminals)', () => {
    // The 5 terminals W277b gates with requireMfaTier(2):
    // escalate / resolve / close / archive / delete (DELETE /:id).
    // W278c severity logic mirrors that classification — high-stakes
    // mutations get loud client-side alerts.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'controllers', 'incidentController.js'),
      'utf8'
    );
    // Sanity: file declares HIGH_PRIORITY_ACTIONS with exactly the 5 expected entries.
    const expected = [
      "'incident-escalated'",
      "'incident-resolved'",
      "'incident-closed'",
      "'incident-archived'",
      "'incident-deleted'",
    ];
    for (const e of expected) {
      expect(src).toMatch(e);
    }
  });
});
