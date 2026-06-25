'use strict';

/**
 * whatsapp-appointment-sync-behavioral-wave1522.test.js — behavioral counterpart
 * to the static guard whatsapp-appointment-sync-wave1497.
 *
 * applyAppointmentAction is the SECURITY GUARD in front of clinical-session
 * mutation from the WhatsApp Inbox: before it lets staff cancel / mark-no-show a
 * session, it must verify the session belongs to the conversation's beneficiary
 * AND to the caller's branch, then dispatch to the right facade method. The
 * static guard reads the source; it cannot prove the ownership / branch / action
 * branches actually gate. This drives the real function with a mocked sessions
 * domain (no DB, no boot) and asserts every guard + both dispatch paths.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/whatsapp-appointment-sync-behavioral-wave1522.test.js
 */

jest.unmock('mongoose'); // need real mongoose.isValidObjectId

const mongoose = require('mongoose');

// Mutable mock of the lazily-resolved sessions domain facade.
let mockSessionsService;
jest.mock('../domains/sessions', () => ({
  get service() {
    return mockSessionsService;
  },
}));

const svc = require('../services/whatsapp/whatsappAppointmentSync.service');

const SESSION_ID = new mongoose.Types.ObjectId();
const BENE = new mongoose.Types.ObjectId();
const BRANCH = new mongoose.Types.ObjectId();

function readyService(session) {
  return {
    getSessionById: jest.fn(async () => session),
    cancelSession: jest.fn(async () => ({ _id: SESSION_ID, status: 'cancelled', attendance: { status: null } })),
    markNoShow: jest.fn(async () => ({ _id: SESSION_ID, status: 'completed', attendance: { status: 'absent' } })),
  };
}

const ownedSession = () => ({ _id: SESSION_ID, beneficiaryId: BENE, branchId: BRANCH, status: 'scheduled' });

beforeEach(() => {
  mockSessionsService = readyService(ownedSession());
});

describe('W1522 input validation', () => {
  test('invalid action → 400', async () => {
    await expect(svc.applyAppointmentAction({ sessionId: String(SESSION_ID), action: 'delete' })).rejects.toMatchObject({ statusCode: 400 });
  });
  test('invalid sessionId → 400', async () => {
    await expect(svc.applyAppointmentAction({ sessionId: 'nope', action: 'cancel' })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('W1522 domain readiness', () => {
  test('503 when the sessions domain is not initialized', async () => {
    mockSessionsService = undefined;
    await expect(svc.applyAppointmentAction({ sessionId: String(SESSION_ID), action: 'cancel' })).rejects.toMatchObject({ statusCode: 503 });
  });
});

describe('W1522 ownership + branch guards', () => {
  test('404 when the session does not exist', async () => {
    mockSessionsService = readyService(null);
    await expect(svc.applyAppointmentAction({ sessionId: String(SESSION_ID), action: 'cancel' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('403 when the session belongs to a different beneficiary', async () => {
    await expect(
      svc.applyAppointmentAction({ sessionId: String(SESSION_ID), action: 'cancel', beneficiaryId: String(new mongoose.Types.ObjectId()) })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockSessionsService.cancelSession).not.toHaveBeenCalled();
  });

  test('403 on cross-branch access', async () => {
    await expect(
      svc.applyAppointmentAction({ sessionId: String(SESSION_ID), action: 'cancel', branchScope: String(new mongoose.Types.ObjectId()) })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockSessionsService.cancelSession).not.toHaveBeenCalled();
  });
});

describe('W1522 dispatch (only after the guards pass)', () => {
  test('cancel → cancelSession with the normalized reason + summarized result', async () => {
    const out = await svc.applyAppointmentAction({
      sessionId: String(SESSION_ID),
      action: 'cancel',
      reason: '  موعد متعارض  ',
      beneficiaryId: String(BENE),
      branchScope: String(BRANCH),
      actorId: 'staff-1',
    });
    expect(mockSessionsService.cancelSession).toHaveBeenCalledWith(String(SESSION_ID), 'موعد متعارض', 'staff-1');
    expect(mockSessionsService.markNoShow).not.toHaveBeenCalled();
    expect(out).toMatchObject({ id: String(SESSION_ID), status: 'cancelled' });
  });

  test('cancel with no reason → falls back to the Arabic default', async () => {
    await svc.applyAppointmentAction({ sessionId: String(SESSION_ID), action: 'cancel', beneficiaryId: String(BENE) });
    expect(mockSessionsService.cancelSession).toHaveBeenCalledWith(String(SESSION_ID), 'تم الإلغاء عبر واتساب', null);
  });

  test('no_show → markNoShow + attendance surfaced in the summary', async () => {
    const out = await svc.applyAppointmentAction({ sessionId: String(SESSION_ID), action: 'no_show', beneficiaryId: String(BENE) });
    expect(mockSessionsService.markNoShow).toHaveBeenCalledWith(String(SESSION_ID), null);
    expect(mockSessionsService.cancelSession).not.toHaveBeenCalled();
    expect(out).toMatchObject({ status: 'completed', attendanceStatus: 'absent' });
  });
});
