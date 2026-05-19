/**
 * wave124-qr-kiosk-attendance.test.js — Wave 124.
 *
 * Tests the QR token library, the QR-redemption flow, and the
 * kiosk submission flow.
 */

'use strict';

const reg = require('../intelligence/attendance.registry');
const qrLib = require('../intelligence/qr-token.lib');
const {
  createQrKioskAttendanceService,
  hashSecret,
} = require('../intelligence/qr-kiosk-attendance.service');

// ─── QR token library ───────────────────────────────────────────

describe('qr-token.lib — mint + verify', () => {
  const SECRET = 'branch-secret-xyz';

  test('round-trips: mint at T then verify at T succeeds', () => {
    const at = new Date('2026-05-19T10:00:00Z').getTime();
    const token = qrLib.mintQrToken({ branchId: 'br-1', secret: SECRET, at });
    const r = qrLib.verifyQrToken({ token, secret: SECRET, branchId: 'br-1', at });
    expect(r.ok).toBe(true);
    expect(r.branchId).toBe('br-1');
    expect(r.purpose).toBe('check-in');
  });

  test('previous window accepted (clock skew tolerance)', () => {
    const at = new Date('2026-05-19T10:00:00Z').getTime();
    const token = qrLib.mintQrToken({ branchId: 'br-1', secret: SECRET, at });
    // Verify 29s later — still in current window or previous one.
    const r = qrLib.verifyQrToken({
      token,
      secret: SECRET,
      branchId: 'br-1',
      at: at + 35 * 1000,
    });
    expect(r.ok).toBe(true);
  });

  test('two windows old rejected (TOKEN_EXPIRED)', () => {
    const at = new Date('2026-05-19T10:00:00Z').getTime();
    const token = qrLib.mintQrToken({ branchId: 'br-1', secret: SECRET, at });
    const r = qrLib.verifyQrToken({
      token,
      secret: SECRET,
      branchId: 'br-1',
      at: at + 90 * 1000, // 3 windows later
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('TOKEN_EXPIRED');
  });

  test('wrong secret → signature invalid', () => {
    const at = new Date('2026-05-19T10:00:00Z').getTime();
    const token = qrLib.mintQrToken({ branchId: 'br-1', secret: SECRET, at });
    const r = qrLib.verifyQrToken({
      token,
      secret: 'wrong-secret',
      branchId: 'br-1',
      at,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('TOKEN_SIGNATURE_INVALID');
  });

  test('branch mismatch detected', () => {
    const at = new Date('2026-05-19T10:00:00Z').getTime();
    const token = qrLib.mintQrToken({ branchId: 'br-1', secret: SECRET, at });
    const r = qrLib.verifyQrToken({
      token,
      secret: SECRET,
      branchId: 'br-2',
      at,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('TOKEN_BRANCH_MISMATCH');
  });

  test('malformed token rejected', () => {
    const r = qrLib.verifyQrToken({ token: 'not-a-token', secret: SECRET });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('TOKEN_MALFORMED');
  });

  test('purpose ∈ {check-in, check-out}', () => {
    const at = new Date('2026-05-19T10:00:00Z').getTime();
    const out = qrLib.mintQrToken({
      branchId: 'br-1',
      secret: SECRET,
      purpose: 'check-out',
      at,
    });
    const r = qrLib.verifyQrToken({ token: out, secret: SECRET, at });
    expect(r.ok).toBe(true);
    expect(r.purpose).toBe('check-out');

    expect(() =>
      qrLib.mintQrToken({ branchId: 'br-1', secret: SECRET, purpose: 'bogus', at })
    ).toThrow();
  });
});

// ─── Service test scaffolding ───────────────────────────────────

function buildSourceEventModel() {
  const store = [];
  let counter = 0;
  function M(data) {
    Object.assign(this, data);
    this._id = `evt-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {};
    this.save = async () => {
      store.push({ ...this });
      return this;
    };
  }
  M.find = function (q = {}) {
    const matches = store.filter(r => {
      if (q.employeeId && String(r.employeeId) !== String(q.employeeId)) return false;
      if (q.source && r.source !== q.source) return false;
      if (q.eventKind && r.eventKind !== q.eventKind) return false;
      if (q.eventTime && q.eventTime.$gte) {
        if (new Date(r.eventTime).getTime() < new Date(q.eventTime.$gte).getTime()) return false;
      }
      if (q.eventTime && q.eventTime.$lte) {
        if (new Date(r.eventTime).getTime() > new Date(q.eventTime.$lte).getTime()) return false;
      }
      return true;
    });
    return {
      lean: async () => matches.map(r => ({ ...r })),
      then: r => r(matches.map(x => ({ ...x }))),
    };
  };
  M._store = store;
  return M;
}

function buildKioskDeviceModel(devices) {
  const M = {};
  M.findOne = function (q = {}) {
    const m = devices.find(d => {
      if (q.deviceId && d.deviceId !== q.deviceId) return false;
      if (q.active != null && d.active !== q.active) return false;
      return true;
    });
    return {
      lean: async () => (m ? { ...m } : null),
      then: r => r(m ? { ...m } : null),
    };
  };
  M.updateOne = async () => ({ acknowledged: true });
  return M;
}

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

// ─── redeemQrScan ───────────────────────────────────────────────

describe('qr-kiosk-attendance — redeemQrScan', () => {
  const SECRET = 'br1-secret';

  function buildSvc(extra = {}) {
    return createQrKioskAttendanceService({
      sourceEventModel: extra.sourceEventModel || buildSourceEventModel(),
      kioskDeviceModel: buildKioskDeviceModel([]),
      branchSecretResolver: async ({ branchId }) => (branchId === 'br-1' ? SECRET : null),
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:30Z'),
      ...extra,
    });
  }

  test('valid token + accepted', async () => {
    const t0 = new Date('2026-05-19T10:00:00Z').getTime();
    const token = qrLib.mintQrToken({ branchId: 'br-1', secret: SECRET, at: t0 });
    const Source = buildSourceEventModel();
    const svc = buildSvc({ sourceEventModel: Source });

    const r = await svc.redeemQrScan({
      employeeId: 'emp-1',
      role: 'field_employee',
      token,
      eventTime: new Date('2026-05-19T10:00:10Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.event.source).toBe('qr-scan');
    expect(r.event.eventKind).toBe('check-in');
    expect(r.tierLabel).toBe('T3');
    expect(r.branchId).toBe('br-1');
  });

  test('expired token rejected', async () => {
    const t0 = new Date('2026-05-19T10:00:00Z').getTime();
    const token = qrLib.mintQrToken({ branchId: 'br-1', secret: SECRET, at: t0 });
    const svc = buildSvc({
      now: () => new Date('2026-05-19T10:02:00Z'), // 2 min later
    });

    const r = await svc.redeemQrScan({
      employeeId: 'emp-1',
      role: 'field_employee',
      token,
      eventTime: new Date('2026-05-19T10:02:00Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_QR_TOKEN_INVALID');
    expect(r.detail).toBe('TOKEN_EXPIRED');
  });

  test('malformed token → VALIDATION_FAILED', async () => {
    const svc = buildSvc();
    const r = await svc.redeemQrScan({
      employeeId: 'emp-1',
      role: 'field_employee',
      token: 'gibberish',
      eventTime: new Date('2026-05-19T10:00:10Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('signature invalid (wrong secret on server)', async () => {
    const t0 = new Date('2026-05-19T10:00:00Z').getTime();
    const token = qrLib.mintQrToken({ branchId: 'br-1', secret: 'rogue-secret', at: t0 });
    const svc = buildSvc();
    const r = await svc.redeemQrScan({
      employeeId: 'emp-1',
      role: 'field_employee',
      token,
      eventTime: new Date('2026-05-19T10:00:10Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_QR_TOKEN_INVALID');
    expect(r.detail).toBe('TOKEN_SIGNATURE_INVALID');
  });

  test('missing employee', async () => {
    const svc = buildSvc();
    const r = await svc.redeemQrScan({
      token: 'whatever',
      eventTime: new Date(),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.EMPLOYEE_REQUIRED);
  });

  test('event-time in the future rejected', async () => {
    const t0 = new Date('2026-05-19T10:00:00Z').getTime();
    const token = qrLib.mintQrToken({ branchId: 'br-1', secret: SECRET, at: t0 });
    const svc = buildSvc();
    const r = await svc.redeemQrScan({
      employeeId: 'emp-1',
      role: 'field_employee',
      token,
      eventTime: new Date('2026-05-19T11:00:00Z'), // 1h ahead
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.EVENT_TIME_FUTURE);
  });

  test('duplicate within suppression window rejected', async () => {
    const t0 = new Date('2026-05-19T10:00:00Z').getTime();
    const token = qrLib.mintQrToken({ branchId: 'br-1', secret: SECRET, at: t0 });
    const Source = buildSourceEventModel();
    const svc = buildSvc({ sourceEventModel: Source });

    const first = await svc.redeemQrScan({
      employeeId: 'emp-1',
      role: 'field_employee',
      token,
      eventTime: new Date('2026-05-19T10:00:10Z'),
    });
    expect(first.ok).toBe(true);

    // Mint a fresh token (else it'll fail token-not-current first).
    const token2 = qrLib.mintQrToken({
      branchId: 'br-1',
      secret: SECRET,
      at: new Date('2026-05-19T10:00:25Z').getTime(),
    });
    const dup = await svc.redeemQrScan({
      employeeId: 'emp-1',
      role: 'field_employee',
      token: token2,
      eventTime: new Date('2026-05-19T10:00:25Z'),
    });
    expect(dup.ok).toBe(false);
    expect(dup.reason).toBe(reg.REASON.DUPLICATE_WITHIN_WINDOW);
  });
});

// ─── mintBranchQrToken ──────────────────────────────────────────

describe('qr-kiosk-attendance — mintBranchQrToken', () => {
  test('returns token + expiresAtMs aligned to next window', async () => {
    const svc = createQrKioskAttendanceService({
      sourceEventModel: buildSourceEventModel(),
      kioskDeviceModel: buildKioskDeviceModel([]),
      branchSecretResolver: async () => 'secret',
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:30Z'),
    });
    const r = await svc.mintBranchQrToken({
      branchId: 'br-1',
      purpose: 'check-in',
      at: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(typeof r.token).toBe('string');
    expect(r.expiresAtMs).toBeGreaterThan(new Date('2026-05-19T10:00:00Z').getTime());
  });

  test('missing branch → BRANCH_REQUIRED', async () => {
    const svc = createQrKioskAttendanceService({
      sourceEventModel: buildSourceEventModel(),
      kioskDeviceModel: buildKioskDeviceModel([]),
      branchSecretResolver: async () => 'secret',
      logger: SILENT,
    });
    const r = await svc.mintBranchQrToken({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.BRANCH_REQUIRED);
  });
});

// ─── submitKioskEvent ───────────────────────────────────────────

describe('qr-kiosk-attendance — submitKioskEvent', () => {
  const DEVICE_SECRET = 'kiosk-clear-secret';
  const DEVICE = {
    _id: 'kdev-1',
    deviceId: 'KIOSK-RIYADH-1',
    branchId: 'br-1',
    secretHash: hashSecret(DEVICE_SECRET),
    allowedKinds: ['check-in', 'check-out'],
    allowedRoles: [],
    activeHours: [],
    pinRequired: true,
    photoRequired: false,
    active: true,
  };

  function buildSvc(extra = {}) {
    return createQrKioskAttendanceService({
      sourceEventModel: extra.sourceEventModel || buildSourceEventModel(),
      kioskDeviceModel: extra.kioskDeviceModel || buildKioskDeviceModel([DEVICE]),
      branchSecretResolver: async () => 'irrelevant-for-kiosk',
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:30Z'),
      ...extra,
    });
  }

  test('happy path: kiosk submission accepted', async () => {
    const Source = buildSourceEventModel();
    const svc = buildSvc({ sourceEventModel: Source });
    const r = await svc.submitKioskEvent({
      deviceId: 'KIOSK-RIYADH-1',
      deviceSecret: DEVICE_SECRET,
      employeeId: 'emp-1',
      role: 'therapist',
      eventKind: 'check-in',
      pin: '1234',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.event.source).toBe('kiosk');
    expect(r.event.sourceRef.deviceId).toBe('KIOSK-RIYADH-1');
    expect(r.event.sourceRef.pinUsed).toBe(true);
    expect(['T3', 'T4']).toContain(r.tierLabel);
  });

  test('unknown device → ATTENDANCE_KIOSK_UNKNOWN', async () => {
    const svc = buildSvc({ kioskDeviceModel: buildKioskDeviceModel([]) });
    const r = await svc.submitKioskEvent({
      deviceId: 'ghost',
      deviceSecret: DEVICE_SECRET,
      employeeId: 'emp-1',
      role: 'therapist',
      eventKind: 'check-in',
      pin: '1234',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_KIOSK_UNKNOWN');
  });

  test('wrong device secret → ATTENDANCE_KIOSK_AUTH_FAILED', async () => {
    const svc = buildSvc();
    const r = await svc.submitKioskEvent({
      deviceId: 'KIOSK-RIYADH-1',
      deviceSecret: 'wrong',
      employeeId: 'emp-1',
      role: 'therapist',
      eventKind: 'check-in',
      pin: '1234',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_KIOSK_AUTH_FAILED');
  });

  test('event kind not allowed → ATTENDANCE_KIOSK_KIND_NOT_ALLOWED', async () => {
    const checkInOnly = { ...DEVICE, allowedKinds: ['check-in'] };
    const svc = buildSvc({ kioskDeviceModel: buildKioskDeviceModel([checkInOnly]) });
    const r = await svc.submitKioskEvent({
      deviceId: 'KIOSK-RIYADH-1',
      deviceSecret: DEVICE_SECRET,
      employeeId: 'emp-1',
      role: 'therapist',
      eventKind: 'check-out',
      pin: '1234',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_KIOSK_KIND_NOT_ALLOWED');
  });

  test('PIN required but missing → ATTENDANCE_KIOSK_PIN_REQUIRED', async () => {
    const svc = buildSvc();
    const r = await svc.submitKioskEvent({
      deviceId: 'KIOSK-RIYADH-1',
      deviceSecret: DEVICE_SECRET,
      employeeId: 'emp-1',
      role: 'therapist',
      eventKind: 'check-in',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_KIOSK_PIN_REQUIRED');
  });

  test('photo required but missing → ATTENDANCE_KIOSK_PHOTO_REQUIRED', async () => {
    const photoDevice = { ...DEVICE, photoRequired: true };
    const svc = buildSvc({ kioskDeviceModel: buildKioskDeviceModel([photoDevice]) });
    const r = await svc.submitKioskEvent({
      deviceId: 'KIOSK-RIYADH-1',
      deviceSecret: DEVICE_SECRET,
      employeeId: 'emp-1',
      role: 'therapist',
      eventKind: 'check-in',
      pin: '1234',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_KIOSK_PHOTO_REQUIRED');
  });

  test('outside active hours → ATTENDANCE_KIOSK_OUTSIDE_ACTIVE_HOURS', async () => {
    const restrictedDevice = {
      ...DEVICE,
      // Tuesday 2026-05-19 = day 2; active 08:00-17:00 only.
      activeHours: [{ weekday: 2, startMin: 8 * 60, endMin: 17 * 60 }],
    };
    const svc = createQrKioskAttendanceService({
      sourceEventModel: buildSourceEventModel(),
      kioskDeviceModel: buildKioskDeviceModel([restrictedDevice]),
      branchSecretResolver: async () => 'x',
      logger: SILENT,
      now: () => new Date('2026-05-19T22:00:30Z'),
    });
    const r = await svc.submitKioskEvent({
      deviceId: 'KIOSK-RIYADH-1',
      deviceSecret: DEVICE_SECRET,
      employeeId: 'emp-1',
      role: 'therapist',
      eventKind: 'check-in',
      pin: '1234',
      eventTime: new Date('2026-05-19T22:00:00Z'), // 22:00 local — outside window
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_KIOSK_OUTSIDE_ACTIVE_HOURS');
  });

  test('photo + PIN both present → higher confidence + T3 (not demoted)', async () => {
    const photoDevice = { ...DEVICE, photoRequired: true };
    const Source = buildSourceEventModel();
    const svc = buildSvc({
      sourceEventModel: Source,
      kioskDeviceModel: buildKioskDeviceModel([photoDevice]),
    });
    const r = await svc.submitKioskEvent({
      deviceId: 'KIOSK-RIYADH-1',
      deviceSecret: DEVICE_SECRET,
      employeeId: 'emp-1',
      role: 'therapist',
      eventKind: 'check-in',
      pin: '1234',
      photoRef: 's3://bucket/photo.jpg',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.event.sourceRef.photoRef).toBe('s3://bucket/photo.jpg');
    expect(r.tierLabel).toBe('T3');
    expect(r.flags).not.toContain('low-confidence');
  });

  test('duplicate within suppression window rejected', async () => {
    const Source = buildSourceEventModel();
    const svc = buildSvc({ sourceEventModel: Source });
    const first = await svc.submitKioskEvent({
      deviceId: 'KIOSK-RIYADH-1',
      deviceSecret: DEVICE_SECRET,
      employeeId: 'emp-1',
      role: 'therapist',
      eventKind: 'check-in',
      pin: '1234',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(first.ok).toBe(true);

    const dup = await svc.submitKioskEvent({
      deviceId: 'KIOSK-RIYADH-1',
      deviceSecret: DEVICE_SECRET,
      employeeId: 'emp-1',
      role: 'therapist',
      eventKind: 'check-in',
      pin: '1234',
      eventTime: new Date('2026-05-19T10:00:30Z'),
    });
    expect(dup.ok).toBe(false);
    expect(dup.reason).toBe(reg.REASON.DUPLICATE_WITHIN_WINDOW);
  });
});

// ─── hashSecret deterministic ───────────────────────────────────

describe('hashSecret', () => {
  test('deterministic for same input', () => {
    expect(hashSecret('hello')).toBe(hashSecret('hello'));
  });
  test('differs for different inputs', () => {
    expect(hashSecret('a')).not.toBe(hashSecret('b'));
  });
});
