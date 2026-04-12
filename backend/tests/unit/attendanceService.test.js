/**
 * Unit tests — attendanceService.js
 * 3 class constructors: AttendanceService, LeaveService, ReportService
 * Dependencies: ../models/attendanceModel → 7 models
 */
'use strict';

/* ── mock declarations ──────────────────────────────────────────── */
const mockRecordFindOne = jest.fn();
const mockRecordFind = jest.fn();
const mockRecordSave = jest.fn();

const mockScheduleFindOne = jest.fn();
const mockLeaveFindById = jest.fn();
const mockLeaveFind = jest.fn();
const mockLeaveSave = jest.fn();

const mockBalanceFindOne = jest.fn();
const mockBalanceSave = jest.fn();

const mockMonthlyReportSave = jest.fn();
const mockMonthlyReportFind = jest.fn();

jest.mock('../../models/attendanceModel', () => {
  const MockAttendanceRecord = jest.fn().mockImplementation(data => ({
    ...data,
    save: mockRecordSave,
    calculateWorkDuration: jest.fn(),
  }));
  MockAttendanceRecord.findOne = (...a) => mockRecordFindOne(...a);
  MockAttendanceRecord.find = (...a) => mockRecordFind(...a);

  const MockSchedule = { findOne: (...a) => mockScheduleFindOne(...a) };

  const MockLeave = jest.fn().mockImplementation(data => ({
    ...data,
    save: mockLeaveSave,
  }));
  MockLeave.findById = (...a) => mockLeaveFindById(...a);
  MockLeave.find = (...a) => mockLeaveFind(...a);

  const MockLeaveBalance = jest.fn().mockImplementation(data => ({
    ...data,
    save: mockBalanceSave,
  }));
  MockLeaveBalance.findOne = (...a) => mockBalanceFindOne(...a);

  const MockMonthlyReport = jest.fn().mockImplementation(data => ({
    ...data,
    save: mockMonthlyReportSave,
  }));
  MockMonthlyReport.find = (...a) => mockMonthlyReportFind(...a);

  return {
    AttendanceRecord: MockAttendanceRecord,
    Schedule: MockSchedule,
    Leave: MockLeave,
    LeaveBalance: MockLeaveBalance,
    EmployeeAttendanceProfile: {},
    Absence: {},
    MonthlyReport: MockMonthlyReport,
  };
});

const {
  AttendanceService,
  LeaveService,
  ReportService,
} = require('../../services/attendanceService');

let attn, leave, report;

beforeEach(() => {
  jest.clearAllMocks();
  attn = new AttendanceService();
  leave = new LeaveService();
  report = new ReportService();
});

/* ================================================================ */
describe('AttendanceService', () => {
  /* ── pure functions ───────────────────────────────────────────── */
  describe('getDayName', () => {
    it('returns Arabic day name', () => {
      expect(attn.getDayName(new Date('2025-06-01'))).toBe('الأحد'); // Sunday
      expect(attn.getDayName(new Date('2025-06-02'))).toBe('الاثنين'); // Monday
    });
  });

  describe('getWorkHoursFromSchedule', () => {
    it('calculates hours from ms timestamps', () => {
      const start = new Date('2025-06-01T08:00:00Z');
      const end = new Date('2025-06-01T16:00:00Z');
      expect(attn.getWorkHoursFromSchedule(start, end)).toBe(8);
    });

    it('returns 8 when no times', () => {
      expect(attn.getWorkHoursFromSchedule(null, null)).toBe(8);
    });
  });

  describe('calculateLateness', () => {
    it('returns minutes late', () => {
      const checkIn = new Date('2025-06-01T08:15:00Z');
      const scheduled = new Date('2025-06-01T08:00:00Z');
      expect(attn.calculateLateness(checkIn, scheduled)).toBe(15);
    });

    it('returns 0 when early', () => {
      const checkIn = new Date('2025-06-01T07:50:00Z');
      const scheduled = new Date('2025-06-01T08:00:00Z');
      expect(attn.calculateLateness(checkIn, scheduled)).toBe(0);
    });
  });

  describe('calculateEarlyCheckout', () => {
    it('returns minutes early', () => {
      const checkOut = new Date('2025-06-01T15:30:00Z');
      const scheduled = new Date('2025-06-01T16:00:00Z');
      expect(attn.calculateEarlyCheckout(checkOut, scheduled)).toBe(30);
    });
  });

  describe('calculateOvertime', () => {
    it('returns positive overtime', () => {
      expect(attn.calculateOvertime(10, 8)).toBe(2);
    });

    it('returns 0 when no overtime', () => {
      expect(attn.calculateOvertime(7, 8)).toBe(0);
    });
  });

  /* ── async methods ────────────────────────────────────────────── */
  describe('getEmployeeSchedule', () => {
    it('returns day schedule from workDays', async () => {
      mockScheduleFindOne.mockResolvedValue({
        workDays: [
          { day: 'الأحد', startTime: '08:00', endTime: '16:00', isWorking: true },
          { day: 'الاثنين', startTime: '09:00', endTime: '17:00', isWorking: true },
        ],
      });
      const sched = await attn.getEmployeeSchedule('E1', new Date('2025-06-01')); // Sunday
      expect(sched.startTime).toBeInstanceOf(Date);
      expect(sched.endTime).toBeInstanceOf(Date);
    });

    it('returns null when no schedule', async () => {
      mockScheduleFindOne.mockResolvedValue(null);
      expect(await attn.getEmployeeSchedule('E1', new Date())).toBeNull();
    });
  });

  describe('checkIn', () => {
    const mockAllDaysSchedule = {
      workDays: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(
        day => ({ day, startTime: '08:00', endTime: '16:00', isWorking: true })
      ),
    };

    it('creates new record on success', async () => {
      mockRecordFindOne.mockResolvedValue(null); // no existing
      mockScheduleFindOne.mockResolvedValue(mockAllDaysSchedule);
      mockRecordSave.mockResolvedValue(true);

      const res = await attn.checkIn('E1', {});
      expect(res.success).toBe(true);
      expect(res.message).toContain('بنجاح');
    });

    it('rejects when already checked in', async () => {
      mockRecordFindOne.mockResolvedValue({ _id: 'existing', checkInTime: new Date() });
      await expect(attn.checkIn('E1', {})).rejects.toThrow('حدث خطأ داخلي');
    });
  });

  describe('checkOut', () => {
    it('updates existing record', async () => {
      const record = {
        _id: 'R1',
        checkInTime: new Date('2025-06-01T08:00:00Z'),
        calculateWorkDuration: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      };
      mockRecordFindOne.mockResolvedValue(record);
      mockScheduleFindOne.mockResolvedValue(null);

      const res = await attn.checkOut('E1', { checkOutTime: new Date('2025-06-01T16:00:00Z') });
      expect(res.success).toBe(true);
      expect(record.save).toHaveBeenCalled();
    });

    it('fails when no record found', async () => {
      mockRecordFindOne.mockResolvedValue(null);
      await expect(attn.checkOut('E1', { checkOutTime: new Date() })).rejects.toThrow(
        'حدث خطأ داخلي'
      );
    });
  });

  describe('getAttendanceRecords', () => {
    it('returns sorted records', async () => {
      mockRecordFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ _id: 'R1' }]),
        }),
      });
      const recs = await attn.getAttendanceRecords('E1', new Date(), new Date());
      expect(recs).toHaveLength(1);
    });
  });

  describe('manualEntry', () => {
    it('creates manual record', async () => {
      mockRecordSave.mockResolvedValue(true);
      const res = await attn.manualEntry('E1', {
        checkInTime: '2025-06-01T08:00:00Z',
        date: '2025-06-01',
        reason: 'test',
      });
      expect(res.success).toBe(true);
      expect(res.data.verificationMethod).toBe('الحضور اليدوي');
    });
  });
});

/* ================================================================ */
describe('LeaveService', () => {
  describe('calculateLeaveDuration', () => {
    it('counts inclusive days', () => {
      expect(leave.calculateLeaveDuration('2025-06-01', '2025-06-03')).toBe(3);
    });

    it('returns 1 for same day', () => {
      expect(leave.calculateLeaveDuration('2025-06-01', '2025-06-01')).toBe(1);
    });
  });

  describe('checkLeaveBalance', () => {
    it('returns available for annual leave with balance', async () => {
      mockBalanceFindOne.mockResolvedValue({
        annualLeaveRemaining: 10,
        sickLeaveRemaining: 5,
      });
      const res = await leave.checkLeaveBalance('E1', 'إجازة سنوية', 3);
      expect(res.available).toBe(true);
      expect(res.remaining).toBe(10);
      expect(res.fieldName).toBe('annualLeave');
    });

    it('returns unavailable when insufficient', async () => {
      mockBalanceFindOne.mockResolvedValue({ annualLeaveRemaining: 1 });
      const res = await leave.checkLeaveBalance('E1', 'إجازة سنوية', 5);
      expect(res.available).toBe(false);
    });

    it('returns unavailable when no balance record', async () => {
      mockBalanceFindOne.mockResolvedValue(null);
      const res = await leave.checkLeaveBalance('E1', 'إجازة سنوية', 1);
      expect(res.available).toBe(false);
    });

    it('sick leave maps correctly', async () => {
      mockBalanceFindOne.mockResolvedValue({ sickLeaveRemaining: 3 });
      const res = await leave.checkLeaveBalance('E1', 'إجازة مرضية', 2);
      expect(res.available).toBe(true);
      expect(res.fieldName).toBe('sickLeave');
    });
  });

  describe('requestLeave', () => {
    it('creates leave on success', async () => {
      mockBalanceFindOne.mockResolvedValue({ annualLeaveRemaining: 10 });
      mockLeaveSave.mockResolvedValue(true);
      const res = await leave.requestLeave('E1', {
        leaveType: 'إجازة سنوية',
        startDate: '2025-06-01',
        endDate: '2025-06-03',
        reason: 'vacation',
      });
      expect(res.success).toBe(true);
    });
  });

  describe('approveLeave', () => {
    it('approves and updates balance', async () => {
      const doc = {
        _id: 'L1',
        employeeId: 'E1',
        leaveType: 'إجازة سنوية',
        duration: 3,
        save: jest.fn().mockResolvedValue(true),
      };
      mockLeaveFindById.mockResolvedValue(doc);
      mockBalanceFindOne.mockResolvedValue({
        annualLeaveUsed: 0,
        annualLeaveAllocation: 21,
        save: jest.fn().mockResolvedValue(true),
      });

      const res = await leave.approveLeave('L1', 'ADMIN-1');
      expect(res.success).toBe(true);
      expect(doc.status).toBe('موافق عليه');
    });

    it('rejects with rejection reason', async () => {
      const doc = {
        _id: 'L1',
        save: jest.fn().mockResolvedValue(true),
      };
      mockLeaveFindById.mockResolvedValue(doc);
      const res = await leave.approveLeave('L1', 'ADMIN', 'overdue');
      expect(doc.status).toBe('مرفوض');
      expect(doc.rejectionReason).toBe('overdue');
    });

    it('throws when not found', async () => {
      mockLeaveFindById.mockResolvedValue(null);
      await expect(leave.approveLeave('bad', 'A')).rejects.toThrow('حدث خطأ داخلي');
    });
  });

  describe('getLeaveBalance', () => {
    it('returns existing balance', async () => {
      mockBalanceFindOne.mockResolvedValue({ employeeId: 'E1', annualLeaveRemaining: 10 });
      const b = await leave.getLeaveBalance('E1');
      expect(b.annualLeaveRemaining).toBe(10);
    });

    it('creates new balance when none exists', async () => {
      mockBalanceFindOne.mockResolvedValue(null);
      mockBalanceSave.mockResolvedValue(true);
      const b = await leave.getLeaveBalance('E1');
      expect(b.employeeId).toBe('E1');
    });
  });

  describe('getPendingLeaveRequests', () => {
    it('returns pending leaves sorted', async () => {
      mockLeaveFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([{ _id: 'L1', status: 'مرسل' }]),
        }),
      });
      const leaves = await leave.getPendingLeaveRequests();
      expect(leaves).toHaveLength(1);
    });
  });
});

/* ================================================================ */
describe('ReportService', () => {
  describe('countWorkingDays', () => {
    it('excludes Friday and Saturday', () => {
      // June 2025: Sun June 1 to Sat June 7 = 5 working days (Sun-Thu)
      const count = report.countWorkingDays(new Date(2025, 5, 1), new Date(2025, 5, 7));
      expect(count).toBe(5);
    });
  });

  describe('generateMonthlyReport', () => {
    it('creates report with stats', async () => {
      mockRecordFind.mockResolvedValue([
        {
          status: 'حاضر',
          checkInStatus: 'متأخر',
          workDuration: 7,
          overtimeMinutes: 60,
          latenessMinutes: 15,
        },
        {
          status: 'غياب',
          checkInStatus: null,
          workDuration: 0,
          overtimeMinutes: 0,
          latenessMinutes: 0,
        },
      ]);
      mockMonthlyReportSave.mockResolvedValue(true);

      const res = await report.generateMonthlyReport('E1', 2025, 6);
      expect(res.success).toBe(true);
      expect(res.stats.totalDaysPresent).toBe(1);
      expect(res.stats.totalDaysAbsent).toBe(1);
      expect(res.stats.totalDaysLate).toBe(1);
    });
  });

  describe('getMonthlyReports', () => {
    it('returns sorted reports', async () => {
      mockMonthlyReportFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ month: 1 }, { month: 2 }]),
      });
      const rpts = await report.getMonthlyReports('E1', 2025);
      expect(rpts).toHaveLength(2);
    });
  });

  describe('getComprehensiveReport', () => {
    it('returns full summary', async () => {
      mockRecordFind.mockReturnValue({
        sort: jest
          .fn()
          .mockResolvedValue([{ status: 'حاضر', workDuration: 8, overtimeMinutes: 0 }]),
      });
      mockLeaveFind.mockResolvedValue([{ _id: 'L1' }]);

      const rpt = await report.getComprehensiveReport('E1', new Date(), new Date());
      expect(rpt.attendanceSummary.present).toBe(1);
      expect(rpt.attendanceSummary.onLeave).toBe(1);
      expect(rpt.timeSummary.averageDailyHours).toBe(8);
    });
  });
});
