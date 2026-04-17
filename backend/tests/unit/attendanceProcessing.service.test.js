/**
 * Unit tests — attendanceProcessing.service.js
 * Functional exports with multiple Mongoose models + logger
 */
'use strict';

/* ── mock declarations ──────────────────────────────────────────── */
const mockAttendanceLogFindById = jest.fn();
const mockDailyFind = jest.fn();
const mockDailyFindOne = jest.fn();
const mockDailyCountDocuments = jest.fn();
const mockShiftAssignmentFindOne = jest.fn();
const mockLeaveFindOne = jest.fn();
const mockPolicyFindOne = jest.fn();
const mockEmployeeFind = jest.fn();
const mockEmployeeFindById = jest.fn();

jest.mock('../../models/AttendanceLog', () => ({
  findById: (...a) => mockAttendanceLogFindById(...a),
}));

jest.mock('../../models/DailyAttendance', () => {
  const fn = jest.fn().mockImplementation(data => ({
    ...data,
    save: jest.fn().mockResolvedValue(true),
  }));
  fn.find = (...a) => mockDailyFind(...a);
  fn.findOne = (...a) => mockDailyFindOne(...a);
  fn.countDocuments = (...a) => mockDailyCountDocuments(...a);
  return fn;
});

jest.mock('../../models/WorkShift', () => ({}));

jest.mock('../../models/EmployeeShiftAssignment', () => ({
  findOne: (...a) => mockShiftAssignmentFindOne(...a),
}));

jest.mock('../../models/LeaveRequest', () => ({
  findOne: (...a) => mockLeaveFindOne(...a),
}));

jest.mock('../../models/AttendancePolicyModel', () => ({
  findOne: (...a) => mockPolicyFindOne(...a),
}));

jest.mock('../../models/HR/Employee', () => ({
  find: (...a) => mockEmployeeFind(...a),
  findById: (...a) => mockEmployeeFindById(...a),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const {
  processLog,
  processBatch,
  generateMonthlyReport,
  list,
  getStats,
  getEmployeeShift,
  recalculate,
} = require('../../services/attendanceProcessing.service');

beforeEach(() => jest.clearAllMocks());

/* ================================================================ */
describe('AttendanceProcessing', () => {
  /* ────────────────────────────────────────────────────────────── */
  describe('recalculate', () => {
    it('calculates lateMinutes accounting for grace', () => {
      const daily = {
        checkIn: new Date('2025-06-01T08:10:00Z'),
        checkOut: null,
        workDate: new Date('2025-06-01'),
      };
      const shift = {
        startTime: '08:00:00',
        endTime: '16:00:00',
        graceInMinutes: 5,
      };
      recalculate(daily, shift);
      expect(daily.lateMinutes).toBe(5); // 10 min late - 5 grace
    });

    it('sets lateMinutes to 0 when within grace', () => {
      const daily = {
        checkIn: new Date('2025-06-01T08:03:00Z'),
        checkOut: null,
        workDate: new Date('2025-06-01'),
      };
      const shift = { startTime: '08:00:00', endTime: '16:00:00', graceInMinutes: 5 };
      recalculate(daily, shift);
      expect(daily.lateMinutes).toBe(0);
    });

    it('calculates earlyLeaveMinutes', () => {
      const daily = {
        checkIn: new Date('2025-06-01T08:00:00Z'),
        checkOut: new Date('2025-06-01T15:30:00Z'),
        workDate: new Date('2025-06-01'),
      };
      const shift = { startTime: '08:00:00', endTime: '16:00:00', graceInMinutes: 0 };
      recalculate(daily, shift);
      expect(daily.earlyLeaveMinutes).toBe(30);
      expect(daily.overtimeMinutes).toBe(0);
    });

    it('calculates overtimeMinutes after threshold', () => {
      const daily = {
        checkIn: new Date('2025-06-01T08:00:00Z'),
        checkOut: new Date('2025-06-01T17:00:00Z'),
        workDate: new Date('2025-06-01'),
      };
      const shift = {
        startTime: '08:00:00',
        endTime: '16:00:00',
        graceInMinutes: 0,
        overtimeAfterMinutes: 30,
      };
      recalculate(daily, shift);
      expect(daily.overtimeMinutes).toBe(30); // 60 - 30 threshold
    });

    it('calculates workedMinutes minus break', () => {
      const daily = {
        checkIn: new Date('2025-06-01T08:00:00Z'),
        checkOut: new Date('2025-06-01T16:00:00Z'),
        breakMinutes: 60,
        workDate: new Date('2025-06-01'),
      };
      const shift = { startTime: '08:00:00', endTime: '16:00:00', graceInMinutes: 0 };
      recalculate(daily, shift);
      expect(daily.workedMinutes).toBe(420); // 480 - 60
    });

    it('calculates overtimeAmount with holiday multiplier', () => {
      const daily = {
        checkIn: new Date('2025-06-01T08:00:00Z'),
        checkOut: new Date('2025-06-01T17:30:00Z'),
        isHoliday: true,
        workDate: new Date('2025-06-01'),
      };
      const shift = {
        startTime: '08:00:00',
        endTime: '16:00:00',
        graceInMinutes: 0,
        overtimeAfterMinutes: 30,
        hourlyRate: 60,
      };
      recalculate(daily, shift);
      // overtime: 90-30 = 60 min = 1 hour, rate 60, multiplier 2.0 = 120
      expect(daily.overtimeAmount).toBe(120);
    });

    it('does nothing without shift or checkIn', () => {
      const daily = { workDate: new Date('2025-06-01') };
      recalculate(daily, null);
      expect(daily.lateMinutes).toBeUndefined();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getEmployeeShift', () => {
    it('returns shift from assignment', async () => {
      const shift = { _id: 'SHIFT-1', name: 'Morning' };
      mockShiftAssignmentFindOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({ shiftId: shift }),
        }),
      });
      const result = await getEmployeeShift({ _id: 'EMP-1' }, '2025-06-01');
      expect(result).toEqual(shift);
    });

    it('returns null when no assignment', async () => {
      mockShiftAssignmentFindOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });
      const result = await getEmployeeShift({ _id: 'EMP-1' }, '2025-06-01');
      expect(result).toBeNull();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('processBatch', () => {
    it('counts processed and failed', async () => {
      mockAttendanceLogFindById.mockResolvedValueOnce({
        _id: 'L1',
        employeeId: 'E1',
        punchTime: new Date(),
        punchType: 'checkin',
      });
      mockEmployeeFindById.mockResolvedValueOnce({ _id: 'E1', branchId: 'B1' });
      mockShiftAssignmentFindOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });
      mockDailyFindOne.mockResolvedValue(null);
      mockLeaveFindOne.mockResolvedValue(null);
      mockPolicyFindOne.mockResolvedValue(null);

      const res = await processBatch([{ id: 'L1' }]);
      expect(res.processed).toBe(1);
      expect(res.failed).toBe(0);
    });

    it('increments failed on error', async () => {
      mockAttendanceLogFindById.mockRejectedValue(new Error('fail'));
      const res = await processBatch([{ id: 'L1' }]);
      expect(res.failed).toBe(1);
      expect(res.errors).toHaveLength(1);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('list', () => {
    it('returns paginated data with populate', async () => {
      mockDailyFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([{ _id: 'D1' }]),
              }),
            }),
          }),
        }),
      });
      mockDailyCountDocuments.mockResolvedValue(1);

      const res = await list({ page: 1, perPage: 10 });
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
    });

    it('defaults page and perPage', async () => {
      mockDailyFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });
      mockDailyCountDocuments.mockResolvedValue(0);

      const res = await list();
      expect(res.page).toBe(1);
      expect(res.perPage).toBe(15);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getStats', () => {
    it('returns today counts for branch', async () => {
      mockDailyCountDocuments
        .mockResolvedValueOnce(10) // present
        .mockResolvedValueOnce(2) // absent
        .mockResolvedValueOnce(3) // late
        .mockResolvedValueOnce(1); // onLeave

      const res = await getStats('B1');
      expect(res.present).toBe(10);
      expect(res.absent).toBe(2);
      expect(res.late).toBe(3);
      expect(res.onLeave).toBe(1);
      expect(res.date).toBeDefined();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('generateMonthlyReport', () => {
    it('generates employee attendance summary', async () => {
      mockEmployeeFind.mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: 'E1', name: 'Ali' }]),
      });
      mockDailyFind.mockResolvedValue([
        { status: 'present', lateMinutes: 10, overtimeMinutes: 60, overtimeAmount: 100 },
        { status: 'absent', lateMinutes: 0, overtimeMinutes: 0, overtimeAmount: 0 },
      ]);

      const report = await generateMonthlyReport('B1', 2025, 6);
      expect(report).toHaveLength(1);
      expect(report[0].employee).toBe('Ali');
      expect(report[0].presentDays).toBe(1);
      expect(report[0].absentDays).toBe(1);
      expect(report[0].lateDays).toBe(1);
      expect(report[0].totalLateMin).toBe(10);
      expect(report[0].overtimeHours).toBe(1);
      expect(report[0].overtimeAmt).toBe(100);
      expect(report[0].workingDays).toBeGreaterThan(0);
    });
  });
});
