/**
 * Unit Tests — attendanceEngine.js
 * Class with static async methods — requires model + logger mocks
 */
'use strict';

/* ───── Mock logger ───── */
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

/* ───── Helpers placed on global so jest.mock factories can access them ───── */
global._mockSmartAttendance = {};
global._mockWorkShift = {};
global._mockEmployee = {};

/* ───── Mock SmartAttendance model ───── */
jest.mock('../../models/advanced_attendance.model', () => {
  const chain = {};
  chain.populate = jest.fn().mockReturnValue(chain);
  chain.sort = jest.fn().mockReturnValue(chain);
  chain.skip = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.lean = jest.fn().mockResolvedValue([]);
  chain.select = jest.fn().mockReturnValue(chain);

  const Model = function (data) {
    return {
      ...data,
      save: jest
        .fn()
        .mockResolvedValue({ _id: 'rec1', ...data, toObject: () => ({ _id: 'rec1', ...data }) }),
    };
  };
  Model.findOne = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
  Model.findById = jest.fn().mockResolvedValue(null);
  Model.find = jest.fn().mockReturnValue(chain);
  Model.countDocuments = jest.fn().mockResolvedValue(0);
  Model.aggregate = jest.fn().mockResolvedValue([]);

  global._mockSmartAttendance = Model;
  return Model;
});

/* ───── Mock WorkShift model ───── */
jest.mock('../../models/workShift.model', () => {
  const Model = {
    find: jest
      .fn()
      .mockReturnValue({
        sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      }),
    findById: jest.fn().mockResolvedValue(null),
    getEmployeeShift: jest.fn().mockResolvedValue(null),
    assignShift: jest.fn().mockResolvedValue({ success: true }),
  };
  global._mockWorkShift = Model;
  return Model;
});

/* ───── Mock Employee model ───── */
jest.mock('../../models/employee.model', () => {
  const selectChain = { select: jest.fn() };
  const Model = {
    findById: jest.fn().mockReturnValue(selectChain),
    countDocuments: jest.fn().mockResolvedValue(10),
  };
  selectChain.select.mockResolvedValue(null); // default: no employee
  global._mockEmployee = Model;
  return Model;
});

const AttendanceEngine = require('../../services/hr/attendanceEngine');
const SmartAttendance = global._mockSmartAttendance;
const WorkShift = global._mockWorkShift;
const Employee = global._mockEmployee;

// ═══════════════════════════════════════
//  Helper factory
// ═══════════════════════════════════════
const fakeEmployee = (overrides = {}) => ({
  _id: 'emp1',
  fullName: 'أحمد',
  department: 'rehab',
  position: 'therapist',
  ...overrides,
});

const fakeShift = (overrides = {}) => ({
  shiftName: 'الوردية الصباحية',
  shiftCode: 'MORN',
  startTime: '08:00',
  endTime: '16:00',
  shiftType: 'regular',
  color: '#4CAF50',
  calculateLateness: jest.fn().mockReturnValue({ isLate: false, lateMinutes: 0, isAbsent: false }),
  calculateEarlyLeave: jest.fn().mockReturnValue({ isEarlyLeave: false, earlyMinutes: 0 }),
  calculateOvertime: jest.fn().mockReturnValue({ hasOvertime: false, minutes: 0 }),
  workDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
  ...overrides,
});

const fakeRecord = (overrides = {}) => ({
  _id: 'rec1',
  employeeId: 'emp1',
  date: new Date(),
  checkInTime: new Date(),
  checkOutTime: null,
  attendanceStatus: 'present',
  approvalStatus: 'approved',
  lateness: { isLate: false, minutes: 0 },
  earlyLeave: null,
  workDuration: null,
  isDeleted: false,
  modificationHistory: [],
  toObject() {
    return { ...this };
  },
  save: jest.fn().mockImplementation(function () {
    return Promise.resolve(this);
  }),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  // Reset defaults
  Employee.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
  SmartAttendance.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
  SmartAttendance.findById.mockResolvedValue(null);
  WorkShift.getEmployeeShift.mockResolvedValue(null);
});

// ═══════════════════════════════════════
//  checkIn
// ═══════════════════════════════════════
describe('AttendanceEngine.checkIn', () => {
  it('throws when employee not found', async () => {
    await expect(AttendanceEngine.checkIn('emp1')).rejects.toThrow('الموظف غير موجود');
  });

  it('returns success:false when already checked in', async () => {
    Employee.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeEmployee()) });
    const existing = fakeRecord({ checkInTime: new Date() });
    SmartAttendance.findOne.mockResolvedValue(existing);
    const r = await AttendanceEngine.checkIn('emp1');
    expect(r.success).toBe(false);
    expect(r.message).toContain('بالفعل');
  });

  it('creates new record and returns success:true', async () => {
    Employee.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeEmployee()) });
    SmartAttendance.findOne.mockResolvedValue(null);

    const r = await AttendanceEngine.checkIn('emp1', { method: 'biometric' });
    expect(r.success).toBe(true);
    expect(r.message).toContain('تسجيل الحضور');
  });

  it('detects lateness when shift exists', async () => {
    Employee.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeEmployee()) });
    SmartAttendance.findOne.mockResolvedValue(null);
    const shift = fakeShift();
    shift.calculateLateness.mockReturnValue({ isLate: true, lateMinutes: 15, isAbsent: false });
    WorkShift.getEmployeeShift.mockResolvedValue(shift);

    const r = await AttendanceEngine.checkIn('emp1');
    expect(r.success).toBe(true);
    expect(r.lateness.isLate).toBe(true);
    expect(r.lateness.lateMinutes).toBe(15);
  });
});

// ═══════════════════════════════════════
//  checkOut
// ═══════════════════════════════════════
describe('AttendanceEngine.checkOut', () => {
  it('throws when employee not found', async () => {
    await expect(AttendanceEngine.checkOut('emp1')).rejects.toThrow('الموظف غير موجود');
  });

  it('throws when no check-in record for today', async () => {
    Employee.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeEmployee()) });
    SmartAttendance.findOne.mockResolvedValue(null);
    await expect(AttendanceEngine.checkOut('emp1')).rejects.toThrow('لم يتم تسجيل حضور');
  });

  it('returns success:false if already checked out', async () => {
    Employee.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeEmployee()) });
    SmartAttendance.findOne.mockResolvedValue(fakeRecord({ checkOutTime: new Date() }));
    const r = await AttendanceEngine.checkOut('emp1');
    expect(r.success).toBe(false);
  });

  it('saves checkout and returns success:true', async () => {
    Employee.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeEmployee()) });
    const rec = fakeRecord({ checkOutTime: null });
    SmartAttendance.findOne.mockResolvedValue(rec);
    const r = await AttendanceEngine.checkOut('emp1');
    expect(r.success).toBe(true);
    expect(rec.save).toHaveBeenCalled();
  });

  it('detects early leave when shift present', async () => {
    Employee.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeEmployee()) });
    const rec = fakeRecord({ checkOutTime: null });
    SmartAttendance.findOne.mockResolvedValue(rec);
    const shift = fakeShift();
    shift.calculateEarlyLeave.mockReturnValue({ isEarlyLeave: true, earlyMinutes: 30 });
    WorkShift.getEmployeeShift.mockResolvedValue(shift);
    const r = await AttendanceEngine.checkOut('emp1');
    expect(r.earlyLeave.isEarlyLeave).toBe(true);
  });
});

// ═══════════════════════════════════════
//  getTodayStatus
// ═══════════════════════════════════════
describe('AttendanceEngine.getTodayStatus', () => {
  it('returns hasRecord:false when no record', async () => {
    SmartAttendance.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const r = await AttendanceEngine.getTodayStatus('emp1');
    expect(r.hasRecord).toBe(false);
    expect(r.isCheckedIn).toBe(false);
  });

  it('returns checked-in status', async () => {
    const rec = fakeRecord();
    SmartAttendance.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(rec) });
    const r = await AttendanceEngine.getTodayStatus('emp1');
    expect(r.hasRecord).toBe(true);
    expect(r.isCheckedIn).toBe(true);
    expect(r.isCheckedOut).toBe(false);
  });
});

// ═══════════════════════════════════════
//  getEmployeeRecords
// ═══════════════════════════════════════
describe('AttendanceEngine.getEmployeeRecords', () => {
  it('returns records + pagination', async () => {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest
        .fn()
        .mockResolvedValue([
          { _id: 'r1', employeeId: 'emp1', date: new Date(), checkInTime: new Date() },
        ]),
    };
    SmartAttendance.find.mockReturnValue(chain);
    SmartAttendance.countDocuments.mockResolvedValue(1);

    const r = await AttendanceEngine.getEmployeeRecords('emp1', { month: 6, year: 2025 });
    expect(r.records).toHaveLength(1);
    expect(r.pagination.total).toBe(1);
  });
});

// ═══════════════════════════════════════
//  updateRecord
// ═══════════════════════════════════════
describe('AttendanceEngine.updateRecord', () => {
  it('throws when record not found', async () => {
    await expect(AttendanceEngine.updateRecord('bad', {}, 'u1')).rejects.toThrow('السجل غير موجود');
  });

  it('returns no-change when nothing differs', async () => {
    const rec = fakeRecord({ checkInTime: '10:00' });
    SmartAttendance.findById.mockResolvedValue(rec);
    const r = await AttendanceEngine.updateRecord('rec1', { checkInTime: '10:00' }, 'u1');
    expect(r.success).toBe(false);
    expect(r.message).toContain('لا توجد');
  });

  it('saves changes & returns success', async () => {
    const rec = fakeRecord({ checkInTime: '10:00', modificationHistory: [] });
    SmartAttendance.findById.mockResolvedValue(rec);
    const r = await AttendanceEngine.updateRecord('rec1', { checkInTime: '09:00' }, 'u1');
    expect(r.success).toBe(true);
    expect(r.changes).toBe(1);
    expect(rec.save).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════
//  approveRecord / rejectRecord
// ═══════════════════════════════════════
describe('AttendanceEngine.approveRecord / rejectRecord', () => {
  it('approve sets approvalStatus=approved', async () => {
    const rec = fakeRecord();
    SmartAttendance.findById.mockResolvedValue(rec);
    const r = await AttendanceEngine.approveRecord('rec1', 'u1', 'OK');
    expect(r.success).toBe(true);
    expect(rec.approvalStatus).toBe('approved');
  });

  it('reject sets approvalStatus=rejected', async () => {
    const rec = fakeRecord();
    SmartAttendance.findById.mockResolvedValue(rec);
    const r = await AttendanceEngine.rejectRecord('rec1', 'u1', 'reason');
    expect(r.success).toBe(true);
    expect(rec.approvalStatus).toBe('rejected');
  });

  it('throws when record not found', async () => {
    await expect(AttendanceEngine.approveRecord('bad', 'u1')).rejects.toThrow();
    await expect(AttendanceEngine.rejectRecord('bad', 'u1')).rejects.toThrow();
  });
});

// ═══════════════════════════════════════
//  getPendingApprovals
// ═══════════════════════════════════════
describe('AttendanceEngine.getPendingApprovals', () => {
  it('returns records and pagination', async () => {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: 'x', employeeId: 'e1' }]),
    };
    SmartAttendance.find.mockReturnValue(chain);
    SmartAttendance.countDocuments.mockResolvedValue(1);

    const r = await AttendanceEngine.getPendingApprovals();
    expect(r.records).toHaveLength(1);
    expect(r.pagination.total).toBe(1);
  });
});

// ═══════════════════════════════════════
//  Shift management
// ═══════════════════════════════════════
describe('AttendanceEngine shift management', () => {
  it('getShifts returns shifts from model', async () => {
    const chain = {
      sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ shiftName: 'AM' }]) }),
    };
    WorkShift.find.mockReturnValue(chain);
    const shifts = await AttendanceEngine.getShifts();
    expect(shifts).toHaveLength(1);
  });

  it('getEmployeeShift returns shift for employee', async () => {
    Employee.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ department: 'rehab' }),
    });
    WorkShift.getEmployeeShift.mockResolvedValue(fakeShift());
    const shift = await AttendanceEngine.getEmployeeShift('emp1');
    expect(shift.shiftName).toBeDefined();
  });
});

// ═══════════════════════════════════════
//  _formatRecord (static private)
// ═══════════════════════════════════════
describe('AttendanceEngine._formatRecord', () => {
  it('extracts expected fields from record object', () => {
    const raw = {
      _id: 'r1',
      employeeId: 'e1',
      date: new Date(),
      checkInTime: new Date(),
      checkOutTime: null,
      checkInMethod: 'web_portal',
      attendanceStatus: 'present',
      approvalStatus: 'approved',
      lateness: null,
      earlyLeave: null,
      workDuration: null,
      extraField: 'shouldNotAppear',
    };
    const formatted = AttendanceEngine._formatRecord(raw);
    expect(formatted._id).toBe('r1');
    expect(formatted.extraField).toBeUndefined();
  });

  it('handles mongoose document with toObject', () => {
    const doc = { toObject: () => ({ _id: 'r1', employeeId: 'e1' }) };
    const formatted = AttendanceEngine._formatRecord(doc);
    expect(formatted._id).toBe('r1');
  });
});

// ═══════════════════════════════════════
//  _getWorkingDaysCount (static private)
// ═══════════════════════════════════════
describe('AttendanceEngine._getWorkingDaysCount', () => {
  it('returns correct count for a known month', () => {
    // January 2025 has 31 days, 4 Fridays+ 4 Saturdays = ~8/9 off days
    const count = AttendanceEngine._getWorkingDaysCount(1, 2025, null);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(31);
  });

  it('respects shift workDays', () => {
    const shift = { workDays: ['sunday', 'monday', 'tuesday'] }; // 3 workdays
    const count = AttendanceEngine._getWorkingDaysCount(1, 2025, shift);
    expect(count).toBeLessThanOrEqual(15); // ~13-14 for 3 days/week
  });
});
