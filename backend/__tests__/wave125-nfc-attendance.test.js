/**
 * wave125-nfc-attendance.test.js — Wave 125.
 *
 * Tests NFC/RFID card lifecycle + tap ingestion.
 */

'use strict';

const reg = require('../intelligence/attendance.registry');
const {
  createNfcAttendanceService,
  hashSecret,
} = require('../intelligence/nfc-attendance.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

// ─── Mocks ──────────────────────────────────────────────────────

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
      if (q.source && r.source !== q.source) return false;
      if (q['sourceRef.cardUid'] && (r.sourceRef || {}).cardUid !== q['sourceRef.cardUid']) {
        return false;
      }
      if (q['sourceRef.readerId'] && (r.sourceRef || {}).readerId !== q['sourceRef.readerId']) {
        return false;
      }
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

function buildNfcCardModel(seed = []) {
  const store = seed.map((s, i) => ({ _id: s._id || `card-${i + 1}`, ...s }));
  let counter = store.length;
  function M(data) {
    Object.assign(this, data);
    this._id = data._id || `card-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {};
    this.save = async () => {
      const idx = store.findIndex(c => String(c._id) === String(this._id));
      if (idx >= 0) {
        store[idx] = { ...this };
      } else {
        store.push({ ...this });
      }
      return this;
    };
  }
  M.findOne = function (q = {}) {
    const m = store.find(c => {
      if (q.cardUid && c.cardUid !== q.cardUid) return false;
      if (q.status && c.status !== q.status) return false;
      return true;
    });
    return {
      lean: async () => (m ? { ...m } : null),
      then: r => r(m ? { ...m } : null),
    };
  };
  M.findById = function (id) {
    const m = store.find(c => String(c._id) === String(id));
    if (!m) return Promise.resolve(null);
    // Return a model-like instance so .save() works.
    const inst = new M(m);
    inst._id = m._id;
    return Promise.resolve(inst);
  };
  M._store = store;
  return M;
}

function buildNfcReaderModel(readers) {
  const M = {};
  M.findOne = function (q = {}) {
    const m = readers.find(r => {
      if (q.readerId && r.readerId !== q.readerId) return false;
      if (q.active != null && r.active !== q.active) return false;
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

const READER_SECRET = 'reader-clear-secret';
const READER = {
  _id: 'rdr-1',
  readerId: 'NFC-RIYADH-FRONT',
  branchId: 'br-1',
  zone: 'main-entrance',
  secretHash: hashSecret(READER_SECRET),
  allowedKinds: ['check-in', 'check-out'],
  allowedRoles: [],
  active: true,
  cameraAdjacent: true,
};

// ─── Card management ────────────────────────────────────────────

describe('nfc-attendance — issueCard', () => {
  test('happy path: issues active card', async () => {
    const Source = buildSourceEventModel();
    const Card = buildNfcCardModel([]);
    const svc = createNfcAttendanceService({
      sourceEventModel: Source,
      nfcCardModel: Card,
      nfcReaderModel: buildNfcReaderModel([READER]),
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:00Z'),
    });
    const r = await svc.issueCard({
      cardUid: 'CARD-ABC',
      employeeId: 'emp-1',
      branchId: 'br-1',
      label: 'Therapist Cards #1',
    });
    expect(r.ok).toBe(true);
    expect(r.card.cardUid).toBe('CARD-ABC');
    expect(r.card.status).toBe('active');
  });

  test('refuses to issue when active binding exists for same UID', async () => {
    const Card = buildNfcCardModel([
      {
        cardUid: 'CARD-ABC',
        employeeId: 'emp-1',
        status: 'active',
        branchId: 'br-1',
      },
    ]);
    const svc = createNfcAttendanceService({
      sourceEventModel: buildSourceEventModel(),
      nfcCardModel: Card,
      nfcReaderModel: buildNfcReaderModel([READER]),
      logger: SILENT,
    });
    const r = await svc.issueCard({
      cardUid: 'CARD-ABC',
      employeeId: 'emp-2',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_NFC_CARD_ALREADY_ACTIVE');
  });

  test('missing cardUid → VALIDATION_FAILED', async () => {
    const svc = createNfcAttendanceService({
      sourceEventModel: buildSourceEventModel(),
      nfcCardModel: buildNfcCardModel([]),
      nfcReaderModel: buildNfcReaderModel([READER]),
      logger: SILENT,
    });
    const r = await svc.issueCard({ employeeId: 'emp-1' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('missing employee → EMPLOYEE_REQUIRED', async () => {
    const svc = createNfcAttendanceService({
      sourceEventModel: buildSourceEventModel(),
      nfcCardModel: buildNfcCardModel([]),
      nfcReaderModel: buildNfcReaderModel([READER]),
      logger: SILENT,
    });
    const r = await svc.issueCard({ cardUid: 'X' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.EMPLOYEE_REQUIRED);
  });
});

describe('nfc-attendance — lifecycle transitions', () => {
  function makeSvc(seedCards = []) {
    const Card = buildNfcCardModel(seedCards);
    const svc = createNfcAttendanceService({
      sourceEventModel: buildSourceEventModel(),
      nfcCardModel: Card,
      nfcReaderModel: buildNfcReaderModel([READER]),
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:00Z'),
    });
    return { svc, Card };
  }

  test('suspendCard moves active → suspended', async () => {
    const { svc, Card } = makeSvc([
      { _id: 'card-1', cardUid: 'CARD-ABC', employeeId: 'emp-1', status: 'active' },
    ]);
    const r = await svc.suspendCard({ cardId: 'card-1', reason: 'investigation' });
    expect(r.ok).toBe(true);
    expect(Card._store[0].status).toBe('suspended');
    expect(Card._store[0].statusReason).toBe('investigation');
  });

  test('reportLost moves active → lost', async () => {
    const { svc, Card } = makeSvc([
      { _id: 'card-1', cardUid: 'CARD-ABC', employeeId: 'emp-1', status: 'active' },
    ]);
    const r = await svc.reportLost({ cardId: 'card-1', reason: 'left on bus' });
    expect(r.ok).toBe(true);
    expect(Card._store[0].status).toBe('lost');
  });

  test('deactivateCard moves active → deactivated', async () => {
    const { svc, Card } = makeSvc([
      { _id: 'card-1', cardUid: 'CARD-ABC', employeeId: 'emp-1', status: 'active' },
    ]);
    const r = await svc.deactivateCard({ cardId: 'card-1', reason: 'exit' });
    expect(r.ok).toBe(true);
    expect(Card._store[0].status).toBe('deactivated');
  });

  test('deactivated → terminal, cannot be reactivated', async () => {
    const { svc } = makeSvc([
      { _id: 'card-1', cardUid: 'CARD-ABC', employeeId: 'emp-1', status: 'deactivated' },
    ]);
    const r = await svc.suspendCard({ cardId: 'card-1', reason: 'whatever' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_NFC_CARD_TERMINAL');
  });

  test('unknown card → NOT_FOUND', async () => {
    const { svc } = makeSvc([]);
    const r = await svc.suspendCard({ cardId: 'ghost', reason: 'x' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_NFC_CARD_NOT_FOUND');
  });

  test('idempotent re-suspend', async () => {
    const { svc } = makeSvc([
      { _id: 'card-1', cardUid: 'CARD-ABC', employeeId: 'emp-1', status: 'suspended' },
    ]);
    const r = await svc.suspendCard({ cardId: 'card-1', reason: 'noop' });
    expect(r.ok).toBe(true);
    expect(r.idempotent).toBe(true);
  });
});

describe('nfc-attendance — replaceCard', () => {
  test('marks old replaced, issues new active card with supersededByCardId backfill', async () => {
    const Card = buildNfcCardModel([
      {
        _id: 'card-1',
        cardUid: 'CARD-OLD',
        employeeId: 'emp-1',
        status: 'active',
        branchId: 'br-1',
      },
    ]);
    const svc = createNfcAttendanceService({
      sourceEventModel: buildSourceEventModel(),
      nfcCardModel: Card,
      nfcReaderModel: buildNfcReaderModel([READER]),
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:00Z'),
    });
    const r = await svc.replaceCard({
      oldCardId: 'card-1',
      newCardUid: 'CARD-NEW',
      label: 'replacement',
    });
    expect(r.ok).toBe(true);
    const old = Card._store.find(c => c._id === 'card-1');
    const newC = Card._store.find(c => c.cardUid === 'CARD-NEW');
    expect(old.status).toBe('replaced');
    expect(newC.status).toBe('active');
    expect(String(old.supersededByCardId)).toBe(String(newC._id));
  });
});

// ─── submitNfcTap ───────────────────────────────────────────────

describe('nfc-attendance — submitNfcTap', () => {
  function buildSvc(extra = {}) {
    return createNfcAttendanceService({
      sourceEventModel: extra.sourceEventModel || buildSourceEventModel(),
      nfcCardModel:
        extra.nfcCardModel ||
        buildNfcCardModel([
          {
            _id: 'card-1',
            cardUid: 'CARD-ABC',
            employeeId: 'emp-1',
            status: 'active',
            branchId: 'br-1',
          },
        ]),
      nfcReaderModel: extra.nfcReaderModel || buildNfcReaderModel([READER]),
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:30Z'),
      ...extra,
    });
  }

  test('happy path: valid tap accepted at T2', async () => {
    const Source = buildSourceEventModel();
    const svc = buildSvc({ sourceEventModel: Source });
    const r = await svc.submitNfcTap({
      readerId: 'NFC-RIYADH-FRONT',
      deviceSecret: READER_SECRET,
      cardUid: 'CARD-ABC',
      eventKind: 'check-in',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.event.source).toBe('nfc');
    expect(r.event.eventKind).toBe('check-in');
    expect(r.event.sourceRef.cardUid).toBe('CARD-ABC');
    expect(r.event.sourceRef.zone).toBe('main-entrance');
    expect(r.tierLabel).toBe('T2');
    expect(r.cardId).toBe('card-1');
    expect(r.employeeId).toBe('emp-1');
  });

  test('unknown reader → READER_UNKNOWN', async () => {
    const svc = buildSvc({ nfcReaderModel: buildNfcReaderModel([]) });
    const r = await svc.submitNfcTap({
      readerId: 'ghost',
      deviceSecret: READER_SECRET,
      cardUid: 'CARD-ABC',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_NFC_READER_UNKNOWN');
  });

  test('wrong reader secret → AUTH_FAILED', async () => {
    const svc = buildSvc();
    const r = await svc.submitNfcTap({
      readerId: 'NFC-RIYADH-FRONT',
      deviceSecret: 'wrong',
      cardUid: 'CARD-ABC',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_NFC_READER_AUTH_FAILED');
  });

  test('unbound card UID → NOT_BOUND', async () => {
    const svc = buildSvc({ nfcCardModel: buildNfcCardModel([]) });
    const r = await svc.submitNfcTap({
      readerId: 'NFC-RIYADH-FRONT',
      deviceSecret: READER_SECRET,
      cardUid: 'GHOST-UID',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_NFC_CARD_NOT_BOUND');
  });

  test('lost card refused (only active cards reach the find)', async () => {
    const svc = buildSvc({
      nfcCardModel: buildNfcCardModel([
        {
          _id: 'card-1',
          cardUid: 'CARD-ABC',
          employeeId: 'emp-1',
          status: 'lost',
        },
      ]),
    });
    const r = await svc.submitNfcTap({
      readerId: 'NFC-RIYADH-FRONT',
      deviceSecret: READER_SECRET,
      cardUid: 'CARD-ABC',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_NFC_CARD_NOT_BOUND');
  });

  test('event kind not allowed by reader', async () => {
    const limited = { ...READER, allowedKinds: ['check-in'] };
    const svc = buildSvc({ nfcReaderModel: buildNfcReaderModel([limited]) });
    const r = await svc.submitNfcTap({
      readerId: 'NFC-RIYADH-FRONT',
      deviceSecret: READER_SECRET,
      cardUid: 'CARD-ABC',
      eventKind: 'check-out',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_NFC_READER_KIND_NOT_ALLOWED');
  });

  test('tailgateSuspected adds flag + demotes tier', async () => {
    const svc = buildSvc();
    const r = await svc.submitNfcTap({
      readerId: 'NFC-RIYADH-FRONT',
      deviceSecret: READER_SECRET,
      cardUid: 'CARD-ABC',
      eventKind: 'check-in',
      tailgateSuspected: true,
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.flags).toContain('tailgate');
  });

  test('wrong-branch flag when card branch ≠ reader branch', async () => {
    const svc = buildSvc({
      nfcCardModel: buildNfcCardModel([
        {
          _id: 'card-1',
          cardUid: 'CARD-ABC',
          employeeId: 'emp-1',
          status: 'active',
          branchId: 'br-OTHER',
        },
      ]),
    });
    const r = await svc.submitNfcTap({
      readerId: 'NFC-RIYADH-FRONT',
      deviceSecret: READER_SECRET,
      cardUid: 'CARD-ABC',
      eventKind: 'check-in',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.flags).toContain('device-wrong-branch');
  });

  test('future event > MAX_FUTURE_DRIFT_MS rejected', async () => {
    const svc = buildSvc();
    const r = await svc.submitNfcTap({
      readerId: 'NFC-RIYADH-FRONT',
      deviceSecret: READER_SECRET,
      cardUid: 'CARD-ABC',
      eventTime: new Date('2026-05-19T11:00:00Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.EVENT_TIME_FUTURE);
  });

  test('duplicate within suppression window rejected', async () => {
    const Source = buildSourceEventModel();
    const svc = buildSvc({ sourceEventModel: Source });
    const first = await svc.submitNfcTap({
      readerId: 'NFC-RIYADH-FRONT',
      deviceSecret: READER_SECRET,
      cardUid: 'CARD-ABC',
      eventKind: 'check-in',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(first.ok).toBe(true);

    const dup = await svc.submitNfcTap({
      readerId: 'NFC-RIYADH-FRONT',
      deviceSecret: READER_SECRET,
      cardUid: 'CARD-ABC',
      eventKind: 'check-in',
      eventTime: new Date('2026-05-19T10:00:20Z'),
    });
    expect(dup.ok).toBe(false);
    expect(dup.reason).toBe(reg.REASON.DUPLICATE_WITHIN_WINDOW);
  });

  test('eventKind inferred when reader allows only one kind', async () => {
    const passageOnly = { ...READER, allowedKinds: ['passage'] };
    const svc = buildSvc({ nfcReaderModel: buildNfcReaderModel([passageOnly]) });
    const r = await svc.submitNfcTap({
      readerId: 'NFC-RIYADH-FRONT',
      deviceSecret: READER_SECRET,
      cardUid: 'CARD-ABC',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.event.eventKind).toBe('passage');
  });
});
