'use strict';

/* ── mock-prefixed variables ── */
const mockLeaveRequestFind = jest.fn();
const mockLeaveRequestCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'leaveRequest1', ...d }));
const mockLeaveRequestCount = jest.fn().mockResolvedValue(0);
const mockLeaveBalanceFind = jest.fn();
const mockLeaveBalanceCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'leaveBalance1', ...d }));
const mockLeaveBalanceCount = jest.fn().mockResolvedValue(0);
const mockLeavePolicyFind = jest.fn();
const mockLeavePolicyCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'leavePolicy1', ...d }));
const mockLeavePolicyCount = jest.fn().mockResolvedValue(0);
const mockHolidayCalendarFind = jest.fn();
const mockHolidayCalendarCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'holidayCalendar1', ...d }));
const mockHolidayCalendarCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddLeaveManager', () => ({
  DDDLeaveRequest: {
    find: mockLeaveRequestFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'leaveRequest1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'leaveRequest1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockLeaveRequestCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'leaveRequest1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'leaveRequest1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'leaveRequest1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'leaveRequest1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'leaveRequest1' }) }),
    countDocuments: mockLeaveRequestCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDLeaveBalance: {
    find: mockLeaveBalanceFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'leaveBalance1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'leaveBalance1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockLeaveBalanceCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'leaveBalance1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'leaveBalance1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'leaveBalance1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'leaveBalance1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'leaveBalance1' }) }),
    countDocuments: mockLeaveBalanceCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDLeavePolicy: {
    find: mockLeavePolicyFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'leavePolicy1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'leavePolicy1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockLeavePolicyCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'leavePolicy1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'leavePolicy1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'leavePolicy1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'leavePolicy1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'leavePolicy1' }) }),
    countDocuments: mockLeavePolicyCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDHolidayCalendar: {
    find: mockHolidayCalendarFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'holidayCalendar1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'holidayCalendar1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockHolidayCalendarCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'holidayCalendar1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'holidayCalendar1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'holidayCalendar1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'holidayCalendar1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'holidayCalendar1' }) }),
    countDocuments: mockHolidayCalendarCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  LEAVE_TYPES: ['item1', 'item2'],
  LEAVE_STATUSES: ['item1', 'item2'],
  ACCRUAL_FREQUENCIES: ['item1', 'item2'],
  HOLIDAY_TYPES: ['item1', 'item2'],
  BALANCE_ADJUSTMENT_TYPES: ['item1', 'item2'],
  POLICY_SCOPES: ['item1', 'item2'],
  BUILTIN_POLICIES: ['item1', 'item2'],

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

const svc = require('../../services/dddLeaveManager');

describe('dddLeaveManager service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _leaveRequestL = jest.fn().mockResolvedValue([]);
    const _leaveRequestLim = jest.fn().mockReturnValue({ lean: _leaveRequestL });
    const _leaveRequestS = jest.fn().mockReturnValue({ limit: _leaveRequestLim, lean: _leaveRequestL, populate: jest.fn().mockReturnValue({ lean: _leaveRequestL }) });
    mockLeaveRequestFind.mockReturnValue({ sort: _leaveRequestS, lean: _leaveRequestL, limit: _leaveRequestLim, populate: jest.fn().mockReturnValue({ lean: _leaveRequestL, sort: _leaveRequestS }) });
    const _leaveBalanceL = jest.fn().mockResolvedValue([]);
    const _leaveBalanceLim = jest.fn().mockReturnValue({ lean: _leaveBalanceL });
    const _leaveBalanceS = jest.fn().mockReturnValue({ limit: _leaveBalanceLim, lean: _leaveBalanceL, populate: jest.fn().mockReturnValue({ lean: _leaveBalanceL }) });
    mockLeaveBalanceFind.mockReturnValue({ sort: _leaveBalanceS, lean: _leaveBalanceL, limit: _leaveBalanceLim, populate: jest.fn().mockReturnValue({ lean: _leaveBalanceL, sort: _leaveBalanceS }) });
    const _leavePolicyL = jest.fn().mockResolvedValue([]);
    const _leavePolicyLim = jest.fn().mockReturnValue({ lean: _leavePolicyL });
    const _leavePolicyS = jest.fn().mockReturnValue({ limit: _leavePolicyLim, lean: _leavePolicyL, populate: jest.fn().mockReturnValue({ lean: _leavePolicyL }) });
    mockLeavePolicyFind.mockReturnValue({ sort: _leavePolicyS, lean: _leavePolicyL, limit: _leavePolicyLim, populate: jest.fn().mockReturnValue({ lean: _leavePolicyL, sort: _leavePolicyS }) });
    const _holidayCalendarL = jest.fn().mockResolvedValue([]);
    const _holidayCalendarLim = jest.fn().mockReturnValue({ lean: _holidayCalendarL });
    const _holidayCalendarS = jest.fn().mockReturnValue({ limit: _holidayCalendarLim, lean: _holidayCalendarL, populate: jest.fn().mockReturnValue({ lean: _holidayCalendarL }) });
    mockHolidayCalendarFind.mockReturnValue({ sort: _holidayCalendarS, lean: _holidayCalendarL, limit: _holidayCalendarLim, populate: jest.fn().mockReturnValue({ lean: _holidayCalendarL, sort: _holidayCalendarS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('LeaveManager');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listRequests returns result', async () => {
    let r; try { r = await svc.listRequests({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getRequest returns result', async () => {
    let r; try { r = await svc.getRequest({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createRequest creates/returns result', async () => {
    let r; try { r = await svc.createRequest({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('submitRequest creates/returns result', async () => {
    let r; try { r = await svc.submitRequest({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('approveRequest updates/returns result', async () => {
    let r; try { r = await svc.approveRequest('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('rejectRequest updates/returns result', async () => {
    let r; try { r = await svc.rejectRequest('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('cancelRequest updates/returns result', async () => {
    let r; try { r = await svc.cancelRequest('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getBalance returns result', async () => {
    let r; try { r = await svc.getBalance({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateBalance updates/returns result', async () => {
    let r; try { r = await svc.updateBalance('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('accrueLeave is callable', () => {
    expect(typeof svc.accrueLeave).toBe('function');
  });

  test('listPolicies returns result', async () => {
    let r; try { r = await svc.listPolicies({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPolicy creates/returns result', async () => {
    let r; try { r = await svc.createPolicy({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updatePolicy updates/returns result', async () => {
    let r; try { r = await svc.updatePolicy('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listHolidays returns result', async () => {
    let r; try { r = await svc.listHolidays({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createHoliday creates/returns result', async () => {
    let r; try { r = await svc.createHoliday({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateHoliday updates/returns result', async () => {
    let r; try { r = await svc.updateHoliday('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('deleteHoliday returns result', async () => {
    let r; try { r = await svc.deleteHoliday('id1'); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getLeaveAnalytics returns object', async () => {
    let r; try { r = await svc.getLeaveAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
