/**
 * wave138-credential-tracker.test.js — Wave 138.
 */

'use strict';

const {
  createCredentialTrackerService,
  computeStatus,
  DEFAULT_GRACE_DAYS_BY_SEVERITY,
} = require('../intelligence/credential-tracker.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

const NOW = new Date('2026-05-19T00:00:00Z');

function buildCredentialModel(seed = []) {
  const store = seed.map((s, i) => ({ _id: s._id || `c-${i + 1}`, ...s }));
  let counter = store.length;
  function M(data) {
    Object.assign(this, data);
    this._id = `c-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {};
    this.save = async () => {
      const idx = store.findIndex(r => String(r._id) === String(this._id));
      if (idx >= 0) store[idx] = { ...this };
      else store.push({ ...this });
      return this;
    };
  }
  M.findById = function (id) {
    const m = store.find(r => String(r._id) === String(id));
    if (!m) return Promise.resolve(null);
    const inst = new M(m);
    inst._id = m._id;
    return Promise.resolve(inst);
  };
  M.find = function (q = {}) {
    const matches = store.filter(r => {
      if (q.employeeId && String(r.employeeId) !== String(q.employeeId)) return false;
      if (q.expiresAt) {
        if (
          q.expiresAt.$gte &&
          new Date(r.expiresAt).getTime() < new Date(q.expiresAt.$gte).getTime()
        ) {
          return false;
        }
        if (
          q.expiresAt.$lte &&
          new Date(r.expiresAt).getTime() > new Date(q.expiresAt.$lte).getTime()
        ) {
          return false;
        }
      }
      if (q.status) {
        if (q.status.$in && !q.status.$in.includes(r.status)) return false;
        if (q.status.$ne && r.status === q.status.$ne) return false;
        if (typeof q.status === 'string' && r.status !== q.status) return false;
      }
      return true;
    });
    let sortFn = null;
    const cursor = {
      sort(s) {
        sortFn = (a, b) => {
          for (const k of Object.keys(s)) {
            const av = new Date(a[k]).getTime();
            const bv = new Date(b[k]).getTime();
            if (av < bv) return -s[k];
            if (av > bv) return s[k];
          }
          return 0;
        };
        return cursor;
      },
      lean: async () => {
        const arr = [...matches];
        if (sortFn) arr.sort(sortFn);
        return arr;
      },
      then(r) {
        const arr = [...matches];
        if (sortFn) arr.sort(sortFn);
        return r(arr);
      },
    };
    return cursor;
  };
  // Attach SEVERITY_BY_KIND for the service to use.
  M.SEVERITY_BY_KIND = {
    'scfhs-license': 'critical',
    iqama: 'critical',
    bls: 'high',
    acls: 'high',
    pals: 'high',
    cpr: 'medium',
    'driver-license': 'high',
    'pdpl-training': 'medium',
    'continuing-education': 'low',
    other: 'medium',
  };
  M._store = store;
  return M;
}

// ─── computeStatus pure helper ────────────────────────────────

describe('credential-tracker — computeStatus', () => {
  test('valid when expiry > 30 days away', () => {
    expect(
      computeStatus({
        expiresAt: '2027-01-01T00:00:00Z',
        atDate: NOW,
      }).status
    ).toBe('valid');
  });

  test('expiring-soon when expiry within 30 days', () => {
    expect(
      computeStatus({
        expiresAt: '2026-06-05T00:00:00Z', // 17 days away
        atDate: NOW,
      }).status
    ).toBe('expiring-soon');
  });

  test('expired when expiry in past', () => {
    expect(
      computeStatus({
        expiresAt: '2026-04-01T00:00:00Z',
        atDate: NOW,
      }).status
    ).toBe('expired');
  });

  test('valid when no expiresAt provided', () => {
    expect(computeStatus({ atDate: NOW }).status).toBe('valid');
  });
});

// ─── addCredential ─────────────────────────────────────────────

describe('credential-tracker — addCredential', () => {
  test('happy path: SCFHS license stored with initial status', async () => {
    const Cred = buildCredentialModel();
    const svc = createCredentialTrackerService({
      credentialModel: Cred,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.addCredential({
      employeeId: 'emp-1',
      kind: 'scfhs-license',
      issueNumber: 'SCFHS-A12345',
      labelAr: 'ترخيص هيئة التخصصات الصحية',
      expiresAt: new Date('2027-01-01T00:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.credential.status).toBe('valid');
    expect(Cred._store).toHaveLength(1);
  });

  test('expiring-soon credential gets status=expiring-soon on add', async () => {
    const Cred = buildCredentialModel();
    const svc = createCredentialTrackerService({
      credentialModel: Cred,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.addCredential({
      employeeId: 'emp-1',
      kind: 'bls',
      issueNumber: 'BLS-X',
      labelAr: 'شهادة الإسعافات الأولية',
      expiresAt: new Date('2026-06-01T00:00:00Z'), // 13 days away
    });
    expect(r.credential.status).toBe('expiring-soon');
  });

  test('missing employee → EMPLOYEE_REQUIRED', async () => {
    const svc = createCredentialTrackerService({
      credentialModel: buildCredentialModel(),
      logger: SILENT,
    });
    const r = await svc.addCredential({
      kind: 'bls',
      issueNumber: 'X',
      labelAr: 'X',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('EMPLOYEE_REQUIRED');
  });

  test('missing labelAr → VALIDATION_FAILED', async () => {
    const svc = createCredentialTrackerService({
      credentialModel: buildCredentialModel(),
      logger: SILENT,
    });
    const r = await svc.addCredential({
      employeeId: 'emp-1',
      kind: 'bls',
      issueNumber: 'X',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('VALIDATION_FAILED');
  });
});

// ─── verifyCredential ──────────────────────────────────────────

describe('credential-tracker — verifyCredential', () => {
  test('sets verifiedAt + actor; flips pending-renewal → valid', async () => {
    const Cred = buildCredentialModel([
      {
        _id: 'c-pending',
        employeeId: 'emp-1',
        kind: 'scfhs-license',
        status: 'pending-renewal',
        expiresAt: new Date('2027-01-01T00:00:00Z'),
      },
    ]);
    const svc = createCredentialTrackerService({
      credentialModel: Cred,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.verifyCredential({
      credentialId: 'c-pending',
      actorId: 'hr-1',
      actorRole: 'hr_admin',
      note: 'verified via SCFHS portal',
    });
    expect(r.ok).toBe(true);
    expect(Cred._store[0].verifiedAt).toBeTruthy();
    expect(Cred._store[0].status).toBe('valid');
  });

  test('missing actor → ACTOR_REQUIRED', async () => {
    const svc = createCredentialTrackerService({
      credentialModel: buildCredentialModel([]),
      logger: SILENT,
    });
    const r = await svc.verifyCredential({ credentialId: 'x' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ACTOR_REQUIRED');
  });
});

// ─── renewCredential ───────────────────────────────────────────

describe('credential-tracker — renewCredential', () => {
  test('updates expiresAt + resets status + clears verification', async () => {
    const Cred = buildCredentialModel([
      {
        _id: 'c-1',
        employeeId: 'emp-1',
        kind: 'bls',
        status: 'expired',
        expiresAt: new Date('2026-04-01T00:00:00Z'),
        verifiedAt: new Date('2025-12-01T00:00:00Z'),
        verifiedByActorId: 'old-hr',
        reminderCount: 3,
      },
    ]);
    const svc = createCredentialTrackerService({
      credentialModel: Cred,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.renewCredential({
      credentialId: 'c-1',
      newExpiresAt: new Date('2028-04-01T00:00:00Z'),
      documentRef: 's3://creds/new-bls.pdf',
    });
    expect(r.ok).toBe(true);
    expect(Cred._store[0].status).toBe('valid');
    expect(Cred._store[0].verifiedAt).toBeNull();
    expect(Cred._store[0].reminderCount).toBe(0);
  });

  test('new expiry in past → EXPIRY_NOT_IN_FUTURE', async () => {
    const Cred = buildCredentialModel([
      { _id: 'c-1', employeeId: 'emp-1', kind: 'bls', status: 'expired' },
    ]);
    const svc = createCredentialTrackerService({
      credentialModel: Cred,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.renewCredential({
      credentialId: 'c-1',
      newExpiresAt: new Date('2024-01-01T00:00:00Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('EXPIRY_NOT_IN_FUTURE');
  });
});

// ─── suspendCredential ─────────────────────────────────────────

describe('credential-tracker — suspendCredential', () => {
  test('suspends with reason + statusChangedAt', async () => {
    const Cred = buildCredentialModel([
      { _id: 'c-1', employeeId: 'emp-1', kind: 'bls', status: 'valid' },
    ]);
    const svc = createCredentialTrackerService({
      credentialModel: Cred,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.suspendCredential({
      credentialId: 'c-1',
      reason: 'investigation ongoing',
      actorId: 'hr-1',
    });
    expect(r.ok).toBe(true);
    expect(Cred._store[0].status).toBe('suspended');
    expect(Cred._store[0].statusReason).toBe('investigation ongoing');
  });

  test('reason too short rejected', async () => {
    const Cred = buildCredentialModel([
      { _id: 'c-1', employeeId: 'emp-1', kind: 'bls', status: 'valid' },
    ]);
    const svc = createCredentialTrackerService({
      credentialModel: Cred,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.suspendCredential({
      credentialId: 'c-1',
      reason: 'x',
      actorId: 'hr-1',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('REASON_TOO_SHORT');
  });
});

// ─── getEmployeeBlockingCredentials ─────────────────────────────

describe('credential-tracker — getEmployeeBlockingCredentials', () => {
  test('critical (SCFHS) blocks immediately on expiry day', async () => {
    const Cred = buildCredentialModel([
      {
        _id: 'c-license',
        employeeId: 'emp-1',
        kind: 'scfhs-license',
        status: 'expired',
        expiresAt: new Date('2026-05-18T00:00:00Z'), // expired yesterday
      },
    ]);
    const svc = createCredentialTrackerService({
      credentialModel: Cred,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.getEmployeeBlockingCredentials({ employeeId: 'emp-1' });
    expect(r.ok).toBe(true);
    expect(r.hasBlocking).toBe(true);
    expect(r.blocking[0].kind).toBe('scfhs-license');
  });

  test('high-severity (BLS) does NOT block within grace window (7 days)', async () => {
    const Cred = buildCredentialModel([
      {
        _id: 'c-bls',
        employeeId: 'emp-1',
        kind: 'bls',
        status: 'expired',
        expiresAt: new Date('2026-05-15T00:00:00Z'), // expired 4 days ago, within 7d grace
      },
    ]);
    const svc = createCredentialTrackerService({
      credentialModel: Cred,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.getEmployeeBlockingCredentials({ employeeId: 'emp-1' });
    expect(r.hasBlocking).toBe(false);
  });

  test('high-severity BLS blocks past 7-day grace', async () => {
    const Cred = buildCredentialModel([
      {
        _id: 'c-bls',
        employeeId: 'emp-1',
        kind: 'bls',
        status: 'expired',
        expiresAt: new Date('2026-05-01T00:00:00Z'), // 18 days ago, past 7d grace
      },
    ]);
    const svc = createCredentialTrackerService({
      credentialModel: Cred,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.getEmployeeBlockingCredentials({ employeeId: 'emp-1' });
    expect(r.hasBlocking).toBe(true);
    expect(r.blocking[0].blockReason).toBe('expired-past-grace');
  });

  test('suspended credential ALWAYS blocks', async () => {
    const Cred = buildCredentialModel([
      {
        _id: 'c-cpr',
        employeeId: 'emp-1',
        kind: 'cpr', // medium, normally never blocks on expiry
        status: 'suspended',
        expiresAt: new Date('2027-01-01T00:00:00Z'), // valid expiry
      },
    ]);
    const svc = createCredentialTrackerService({
      credentialModel: Cred,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.getEmployeeBlockingCredentials({ employeeId: 'emp-1' });
    expect(r.hasBlocking).toBe(true);
    expect(r.blocking[0].blockReason).toBe('suspended');
  });

  test('valid critical credential does NOT block', async () => {
    const Cred = buildCredentialModel([
      {
        _id: 'c-license',
        employeeId: 'emp-1',
        kind: 'scfhs-license',
        status: 'valid',
        expiresAt: new Date('2027-05-19T00:00:00Z'),
      },
    ]);
    const svc = createCredentialTrackerService({
      credentialModel: Cred,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.getEmployeeBlockingCredentials({ employeeId: 'emp-1' });
    expect(r.hasBlocking).toBe(false);
  });
});

// ─── scanExpiringSoon ──────────────────────────────────────────

describe('credential-tracker — scanExpiringSoon', () => {
  test('returns credentials expiring within window', async () => {
    const Cred = buildCredentialModel([
      {
        _id: 'c-soon-1',
        employeeId: 'emp-1',
        kind: 'bls',
        status: 'valid',
        expiresAt: new Date('2026-05-25T00:00:00Z'), // 6 days
      },
      {
        _id: 'c-soon-2',
        employeeId: 'emp-2',
        kind: 'scfhs-license',
        status: 'valid',
        expiresAt: new Date('2026-06-10T00:00:00Z'), // 22 days
      },
      {
        _id: 'c-far',
        employeeId: 'emp-3',
        kind: 'bls',
        status: 'valid',
        expiresAt: new Date('2027-01-01T00:00:00Z'),
      },
    ]);
    const svc = createCredentialTrackerService({
      credentialModel: Cred,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.scanExpiringSoon({ daysAhead: 30 });
    expect(r.total).toBe(2);
  });

  test('severity filter narrows results', async () => {
    const Cred = buildCredentialModel([
      {
        _id: 'c-bls',
        employeeId: 'emp-1',
        kind: 'bls',
        status: 'valid',
        expiresAt: new Date('2026-05-25T00:00:00Z'),
      },
      {
        _id: 'c-scfhs',
        employeeId: 'emp-2',
        kind: 'scfhs-license',
        status: 'valid',
        expiresAt: new Date('2026-05-25T00:00:00Z'),
      },
    ]);
    const svc = createCredentialTrackerService({
      credentialModel: Cred,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.scanExpiringSoon({ daysAhead: 30, severity: 'critical' });
    expect(r.total).toBe(1);
    expect(r.credentials[0].kind).toBe('scfhs-license');
  });
});

// ─── listByEmployee ────────────────────────────────────────────

describe('credential-tracker — listByEmployee', () => {
  test('returns all credentials sorted by expiry', async () => {
    const Cred = buildCredentialModel([
      {
        employeeId: 'emp-1',
        kind: 'bls',
        expiresAt: new Date('2027-01-01T00:00:00Z'),
      },
      {
        employeeId: 'emp-1',
        kind: 'scfhs-license',
        expiresAt: new Date('2026-12-01T00:00:00Z'),
      },
    ]);
    const svc = createCredentialTrackerService({
      credentialModel: Cred,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.listByEmployee({ employeeId: 'emp-1' });
    expect(r.ok).toBe(true);
    expect(r.credentials).toHaveLength(2);
    expect(new Date(r.credentials[0].expiresAt).getTime()).toBeLessThan(
      new Date(r.credentials[1].expiresAt).getTime()
    );
  });
});

// ─── constants ─────────────────────────────────────────────────

describe('credential-tracker — constants', () => {
  test('grace days match policy', () => {
    expect(DEFAULT_GRACE_DAYS_BY_SEVERITY.critical).toBe(0);
    expect(DEFAULT_GRACE_DAYS_BY_SEVERITY.high).toBe(7);
    expect(DEFAULT_GRACE_DAYS_BY_SEVERITY.medium).toBe(30);
    expect(DEFAULT_GRACE_DAYS_BY_SEVERITY.low).toBe(90);
  });
});
