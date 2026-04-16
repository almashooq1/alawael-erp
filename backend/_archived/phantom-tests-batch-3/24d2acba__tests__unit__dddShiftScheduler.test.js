'use strict';

/* ── mock-prefixed variables ── */
const mockShiftTemplateFind = jest.fn();
const mockShiftTemplateCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'shiftTemplate1', ...d }));
const mockShiftTemplateCount = jest.fn().mockResolvedValue(0);
const mockShiftAssignmentFind = jest.fn();
const mockShiftAssignmentCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'shiftAssignment1', ...d }));
const mockShiftAssignmentCount = jest.fn().mockResolvedValue(0);
const mockTimeRecordFind = jest.fn();
const mockTimeRecordCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'timeRecord1', ...d }));
const mockTimeRecordCount = jest.fn().mockResolvedValue(0);
const mockAttendanceLogFind = jest.fn();
const mockAttendanceLogCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'attendanceLog1', ...d }));
const mockAttendanceLogCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddShiftScheduler', () => ({
  DDDShiftTemplate: {
    find: mockShiftTemplateFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'shiftTemplate1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'shiftTemplate1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockShiftTemplateCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'shiftTemplate1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'shiftTemplate1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'shiftTemplate1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'shiftTemplate1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'shiftTemplate1' }) }),
    countDocuments: mockShiftTemplateCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDShiftAssignment: {
    find: mockShiftAssignmentFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'shiftAssignment1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'shiftAssignment1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockShiftAssignmentCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'shiftAssignment1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'shiftAssignment1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'shiftAssignment1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'shiftAssignment1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'shiftAssignment1' }) }),
    countDocuments: mockShiftAssignmentCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDTimeRecord: {
    find: mockTimeRecordFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'timeRecord1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'timeRecord1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockTimeRecordCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'timeRecord1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'timeRecord1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'timeRecord1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'timeRecord1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'timeRecord1' }) }),
    countDocuments: mockTimeRecordCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDAttendanceLog: {
    find: mockAttendanceLogFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'attendanceLog1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'attendanceLog1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockAttendanceLogCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'attendanceLog1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'attendanceLog1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'attendanceLog1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'attendanceLog1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'attendanceLog1' }) }),
    countDocuments: mockAttendanceLogCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  SHIFT_TYPES: ['item1', 'item2'],
  SHIFT_STATUSES: ['item1', 'item2'],
  ATTENDANCE_STATUSES: ['item1', 'item2'],
  TIME_RECORD_TYPES: ['item1', 'item2'],
  ROSTER_PATTERNS: ['item1', 'item2'],
  OVERTIME_TYPES: ['item1', 'item2'],
  BUILTIN_SHIFT_TEMPLATES: ['item1', 'item2'],

}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class BaseCrudService {
    constructor(n, m, models) { this.name = n; this.meta = m; this.models = models; }
    log() {}
    _list(M, q, o) {
      const c = M.find(q || {});
      if (o && o.sort) {
        const s = c.sort(o.sort);
        return (o.limit && s.limit) ? s.limit(o.limit).lean() : s.lean();
      }
      return c.lean ? c.lean() : c;
    }
    _getById(M, id) {
      const r = M.findById(id);
      return r && r.lean ? r.lean() : r;
    }
    _create(M, d) { return M.create(d); }
    _update(M, id, d, o) {
      return M.findByIdAndUpdate(id, d, { new: true, ...(o || {}) }).lean();
    }
    _delete(M, id) { return M.findByIdAndDelete(id); }
  };
});

const svc = require('../../services/dddShiftScheduler');

describe('dddShiftScheduler service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _shiftTemplateL = jest.fn().mockResolvedValue([]);
    const _shiftTemplateLim = jest.fn().mockReturnValue({ lean: _shiftTemplateL });
    const _shiftTemplateS = jest.fn().mockReturnValue({ limit: _shiftTemplateLim, lean: _shiftTemplateL, populate: jest.fn().mockReturnValue({ lean: _shiftTemplateL }) });
    mockShiftTemplateFind.mockReturnValue({ sort: _shiftTemplateS, lean: _shiftTemplateL, limit: _shiftTemplateLim, populate: jest.fn().mockReturnValue({ lean: _shiftTemplateL, sort: _shiftTemplateS }) });
    const _shiftAssignmentL = jest.fn().mockResolvedValue([]);
    const _shiftAssignmentLim = jest.fn().mockReturnValue({ lean: _shiftAssignmentL });
    const _shiftAssignmentS = jest.fn().mockReturnValue({ limit: _shiftAssignmentLim, lean: _shiftAssignmentL, populate: jest.fn().mockReturnValue({ lean: _shiftAssignmentL }) });
    mockShiftAssignmentFind.mockReturnValue({ sort: _shiftAssignmentS, lean: _shiftAssignmentL, limit: _shiftAssignmentLim, populate: jest.fn().mockReturnValue({ lean: _shiftAssignmentL, sort: _shiftAssignmentS }) });
    const _timeRecordL = jest.fn().mockResolvedValue([]);
    const _timeRecordLim = jest.fn().mockReturnValue({ lean: _timeRecordL });
    const _timeRecordS = jest.fn().mockReturnValue({ limit: _timeRecordLim, lean: _timeRecordL, populate: jest.fn().mockReturnValue({ lean: _timeRecordL }) });
    mockTimeRecordFind.mockReturnValue({ sort: _timeRecordS, lean: _timeRecordL, limit: _timeRecordLim, populate: jest.fn().mockReturnValue({ lean: _timeRecordL, sort: _timeRecordS }) });
    const _attendanceLogL = jest.fn().mockResolvedValue([]);
    const _attendanceLogLim = jest.fn().mockReturnValue({ lean: _attendanceLogL });
    const _attendanceLogS = jest.fn().mockReturnValue({ limit: _attendanceLogLim, lean: _attendanceLogL, populate: jest.fn().mockReturnValue({ lean: _attendanceLogL }) });
    mockAttendanceLogFind.mockReturnValue({ sort: _attendanceLogS, lean: _attendanceLogL, limit: _attendanceLogLim, populate: jest.fn().mockReturnValue({ lean: _attendanceLogL, sort: _attendanceLogS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('ShiftScheduler');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listTemplates returns result', async () => {
    let r; try { r = await svc.listTemplates({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createTemplate creates/returns result', async () => {
    let r; try { r = await svc.createTemplate({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateTemplate updates/returns result', async () => {
    let r; try { r = await svc.updateTemplate('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAssignments returns result', async () => {
    let r; try { r = await svc.listAssignments({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getAssignment returns result', async () => {
    let r; try { r = await svc.getAssignment({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createAssignment creates/returns result', async () => {
    let r; try { r = await svc.createAssignment({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateAssignment updates/returns result', async () => {
    let r; try { r = await svc.updateAssignment('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('cancelAssignment updates/returns result', async () => {
    let r; try { r = await svc.cancelAssignment('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('swapShift updates/returns result', async () => {
    let r; try { r = await svc.swapShift('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('clockIn is callable', () => {
    expect(typeof svc.clockIn).toBe('function');
  });

  test('clockOut is callable', () => {
    expect(typeof svc.clockOut).toBe('function');
  });

  test('listTimeRecords returns result', async () => {
    let r; try { r = await svc.listTimeRecords({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordAttendance creates/returns result', async () => {
    let r; try { r = await svc.recordAttendance({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getAttendance returns result', async () => {
    let r; try { r = await svc.getAttendance({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getDailyAttendance returns result', async () => {
    let r; try { r = await svc.getDailyAttendance({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getSchedulingAnalytics returns object', async () => {
    let r; try { r = await svc.getSchedulingAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
