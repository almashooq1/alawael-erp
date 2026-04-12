/**
 * Unit tests for visitor-advanced.service.js
 * Advanced Visitor Registry — Registration, Check-in/out, Blacklist, Analytics
 */
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../../utils/sanitize', () => ({ escapeRegex: jest.fn(s => s) }));

const Visitor = require('../../models/Visitor');
const {
  visitorAdvancedService: service,
  VisitorBlacklist,
  VisitorLog,
} = require('../../services/visitor-advanced.service');

/* Chainable query mock that resolves to val */
function Q(val) {
  const q = {};
  ['lean', 'select', 'populate', 'sort', 'skip', 'limit'].forEach(m => {
    q[m] = jest.fn(() => q);
  });
  q.exec = jest.fn().mockResolvedValue(val);
  q.then = (cb, ecb) => Promise.resolve(val).then(cb, ecb);
  q.catch = ecb => Promise.resolve(val).catch(ecb);
  return q;
}

describe('VisitorAdvancedService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Visitor defaults
    Visitor.find.mockReturnValue(Q([]));
    Visitor.findById.mockReturnValue(Q(null));
    Visitor.findOne.mockReturnValue(Q(null));
    Visitor.countDocuments.mockResolvedValue(0);
    Visitor.create.mockResolvedValue({ _id: 'v1', visitorId: 'VIS-2025-00001', fullName: 'زائر' });
    Visitor.aggregate.mockReturnValue({
      exec: jest.fn(async () => []),
      then: cb => Promise.resolve([]).then(cb),
      catch: () => {},
    });
    Visitor.deleteMany.mockResolvedValue({ deletedCount: 0 });
    Visitor.insertMany.mockResolvedValue([]);
    // VisitorBlacklist defaults
    VisitorBlacklist.findOne.mockReturnValue(Q(null));
    VisitorBlacklist.find.mockReturnValue(Q([]));
    VisitorBlacklist.countDocuments.mockResolvedValue(0);
    VisitorBlacklist.create.mockResolvedValue({ _id: 'bl1' });
    VisitorBlacklist.findByIdAndUpdate.mockResolvedValue(null);
    // VisitorLog defaults
    VisitorLog.create.mockResolvedValue({});
    VisitorLog.find.mockReturnValue(Q([]));
    VisitorLog.deleteMany.mockResolvedValue({ deletedCount: 0 });
  });

  // ─── getVisitors ────────────────────────────────────────────────
  describe('getVisitors', () => {
    it('returns paginated visitors with defaults', async () => {
      Visitor.find.mockReturnValue(Q([{ _id: 'v1' }]));
      Visitor.countDocuments.mockResolvedValue(1);
      const r = await service.getVisitors();
      expect(r.data).toHaveLength(1);
      expect(r.pagination).toMatchObject({ page: 1, limit: 25, total: 1 });
    });

    it('applies status and purpose filters', async () => {
      await service.getVisitors({ status: 'checked_in', purpose: 'meeting', branch: 'b1' });
      const filter = Visitor.find.mock.calls[0][0];
      expect(filter.status).toBe('checked_in');
      expect(filter.purpose).toBe('meeting');
      expect(filter.branch).toBe('b1');
    });

    it('builds $or search filter', async () => {
      await service.getVisitors({ search: 'أحمد' });
      const filter = Visitor.find.mock.calls[0][0];
      expect(filter.$or).toHaveLength(6);
    });

    it('applies date range filter', async () => {
      await service.getVisitors({ dateFrom: '2025-01-01', dateTo: '2025-12-31' });
      const filter = Visitor.find.mock.calls[0][0];
      expect(filter.createdAt.$gte).toBeInstanceOf(Date);
      expect(filter.createdAt.$lte).toBeInstanceOf(Date);
    });

    it('applies custom sorting', async () => {
      const q = Q([]);
      Visitor.find.mockReturnValue(q);
      await service.getVisitors({ sortBy: 'fullName', sortOrder: 'asc' });
      expect(q.sort).toHaveBeenCalledWith({ fullName: 1 });
    });
  });

  // ─── getVisitorById ─────────────────────────────────────────────
  describe('getVisitorById', () => {
    it('returns visitor with logs and visit history', async () => {
      Visitor.findById.mockReturnValue(Q({ _id: 'v1', nationalId: '123', fullName: 'زائر' }));
      VisitorLog.find.mockReturnValue(Q([{ action: 'checked_in' }]));
      // Visitor.find for past visits — will be the second call
      Visitor.find.mockReturnValue(Q([{ _id: 'v2' }]));
      const r = await service.getVisitorById('v1');
      expect(r.fullName).toBe('زائر');
      expect(r.logs).toHaveLength(1);
      expect(r.totalPreviousVisits).toBe(1);
    });

    it('returns empty visitHistory when no nationalId', async () => {
      Visitor.findById.mockReturnValue(Q({ _id: 'v1', fullName: 'زائر' }));
      const r = await service.getVisitorById('v1');
      expect(r.totalPreviousVisits).toBe(0);
    });

    it('throws if visitor not found', async () => {
      await expect(service.getVisitorById('missing')).rejects.toThrow('الزائر غير موجود');
    });
  });

  // ─── registerVisitor ────────────────────────────────────────────
  describe('registerVisitor', () => {
    it('creates a visitor with generated ID', async () => {
      const created = { _id: 'v1', fullName: 'أحمد', visitorId: 'VIS-2025-00001' };
      Visitor.create.mockResolvedValue(created);
      const r = await service.registerVisitor(
        { fullName: 'أحمد', phone: '0501234567' },
        'u1',
        'مشرف'
      );
      expect(r.fullName).toBe('أحمد');
      expect(Visitor.create).toHaveBeenCalled();
      expect(VisitorLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'pre_registered' })
      );
    });

    it('throws if blacklisted', async () => {
      VisitorBlacklist.findOne.mockReturnValue(Q({ reason: 'سلوك عدواني' }));
      await expect(
        service.registerVisitor({ fullName: 'محظور', nationalId: '123' }, 'u1', 'مشرف')
      ).rejects.toThrow('محظور');
    });
  });

  // ─── updateVisitor ──────────────────────────────────────────────
  describe('updateVisitor', () => {
    it('updates visitor and strips status/timestamps', async () => {
      Visitor.findByIdAndUpdate.mockResolvedValue({ _id: 'v1', fullName: 'محدث' });
      const r = await service.updateVisitor(
        'v1',
        { fullName: 'محدث', status: 'checked_in', checkInTime: 'x', checkOutTime: 'y' },
        'u1',
        'مشرف'
      );
      expect(r.fullName).toBe('محدث');
      const setArg = Visitor.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(setArg.status).toBeUndefined();
      expect(setArg.checkInTime).toBeUndefined();
    });

    it('throws if not found', async () => {
      Visitor.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.updateVisitor('x', {}, 'u1', 'مشرف')).rejects.toThrow(
        'الزائر غير موجود'
      );
    });
  });

  // ─── checkIn ────────────────────────────────────────────────────
  describe('checkIn', () => {
    const makeDoc = (overrides = {}) => ({
      _id: 'v1',
      fullName: 'زائر',
      status: 'pre_registered',
      save: jest.fn().mockResolvedValue(true),
      ...overrides,
    });

    it('checks in a pre-registered visitor', async () => {
      const doc = makeDoc();
      Visitor.findById.mockReturnValue(Q(doc));
      const r = await service.checkIn('v1', { badgeNumber: 'B-001' }, 'u1', 'مشرف');
      expect(doc.status).toBe('checked_in');
      expect(doc.checkInTime).toBeInstanceOf(Date);
      expect(doc.badgeNumber).toBe('B-001');
      expect(doc.save).toHaveBeenCalled();
    });

    it('generates badge if not provided', async () => {
      const doc = makeDoc();
      Visitor.findById.mockReturnValue(Q(doc));
      await service.checkIn('v1', {}, 'u1', 'مشرف');
      expect(doc.badgeNumber).toMatch(/^B-/);
    });

    it('throws if already checked in', async () => {
      Visitor.findById.mockReturnValue(Q(makeDoc({ status: 'checked_in' })));
      await expect(service.checkIn('v1', {}, 'u1', 'مشرف')).rejects.toThrow('مسجل دخوله بالفعل');
    });

    it('throws if already checked out', async () => {
      Visitor.findById.mockReturnValue(Q(makeDoc({ status: 'checked_out' })));
      await expect(service.checkIn('v1', {}, 'u1', 'مشرف')).rejects.toThrow('غادر بالفعل');
    });

    it('throws if not found', async () => {
      await expect(service.checkIn('x', {}, 'u1', 'مشرف')).rejects.toThrow('الزائر غير موجود');
    });

    it('throws if blacklisted at check-in time', async () => {
      Visitor.findById.mockReturnValue(Q(makeDoc({ nationalId: '123' })));
      VisitorBlacklist.findOne.mockReturnValue(Q({ reason: 'ممنوع' }));
      await expect(service.checkIn('v1', {}, 'u1', 'مشرف')).rejects.toThrow('محظور');
    });
  });

  // ─── checkOut ───────────────────────────────────────────────────
  describe('checkOut', () => {
    it('checks out with duration', async () => {
      const now = new Date();
      const doc = {
        _id: 'v1',
        fullName: 'زائر',
        status: 'checked_in',
        checkInTime: new Date(now.getTime() - 60 * 60000),
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({ _id: 'v1', fullName: 'زائر' }),
      };
      Visitor.findById.mockReturnValue(Q(doc));
      const r = await service.checkOut('v1', {}, 'u1', 'مشرف');
      expect(doc.status).toBe('checked_out');
      expect(doc.checkOutTime).toBeInstanceOf(Date);
      expect(r.durationMinutes).toBeGreaterThanOrEqual(0);
    });

    it('throws if not found', async () => {
      await expect(service.checkOut('x', {}, 'u1', 'مشرف')).rejects.toThrow('الزائر غير موجود');
    });

    it('throws if not checked in', async () => {
      Visitor.findById.mockReturnValue(Q({ _id: 'v1', status: 'pre_registered', save: jest.fn() }));
      await expect(service.checkOut('v1', {}, 'u1', 'مشرف')).rejects.toThrow('غير مسجل دخوله');
    });
  });

  // ─── cancelVisit ────────────────────────────────────────────────
  describe('cancelVisit', () => {
    it('cancels a visit', async () => {
      const doc = {
        _id: 'v1',
        fullName: 'زائر',
        status: 'pre_registered',
        notes: '',
        save: jest.fn().mockResolvedValue(true),
      };
      Visitor.findById.mockReturnValue(Q(doc));
      await service.cancelVisit('v1', 'لم يعد مطلوباً', 'u1', 'مشرف');
      expect(doc.status).toBe('cancelled');
    });

    it('throws if already checked out', async () => {
      Visitor.findById.mockReturnValue(Q({ _id: 'v1', status: 'checked_out', save: jest.fn() }));
      await expect(service.cancelVisit('v1', '', 'u1', 'مشرف')).rejects.toThrow('لا يمكن إلغاء');
    });

    it('throws if not found', async () => {
      await expect(service.cancelVisit('x', '', 'u1', 'مشرف')).rejects.toThrow('الزائر غير موجود');
    });
  });

  // ─── markNoShow ─────────────────────────────────────────────────
  describe('markNoShow', () => {
    it('marks pre-registered visitor as no-show', async () => {
      const doc = {
        _id: 'v1',
        fullName: 'زائر',
        status: 'pre_registered',
        save: jest.fn().mockResolvedValue(true),
      };
      Visitor.findById.mockReturnValue(Q(doc));
      await service.markNoShow('v1', 'u1', 'مشرف');
      expect(doc.status).toBe('no_show');
    });

    it('throws if not pre_registered', async () => {
      Visitor.findById.mockReturnValue(Q({ _id: 'v1', status: 'checked_in', save: jest.fn() }));
      await expect(service.markNoShow('v1', 'u1', 'مشرف')).rejects.toThrow('للمسجلين مسبقاً');
    });

    it('throws if not found', async () => {
      await expect(service.markNoShow('x', 'u1', 'مشرف')).rejects.toThrow('الزائر غير موجود');
    });
  });

  // ─── getTodayStats ──────────────────────────────────────────────
  describe('getTodayStats', () => {
    it('returns today stats', async () => {
      Visitor.countDocuments
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3) // checked_in
        .mockResolvedValueOnce(4) // checked_out
        .mockResolvedValueOnce(1) // cancelled
        .mockResolvedValueOnce(0) // no_show
        .mockResolvedValueOnce(3); // currentlyInside
      const r = await service.getTodayStats();
      expect(r.total).toBe(10);
      expect(r.checkedIn).toBe(3);
      expect(r.checkedOut).toBe(4);
      expect(r.currentlyInside).toBe(3);
      expect(r.preRegistered).toBe(2); // 10-3-4-1-0
    });
  });

  // ─── getAnalytics ───────────────────────────────────────────────
  describe('getAnalytics', () => {
    it('returns analytics structure for 30d period', async () => {
      Visitor.countDocuments.mockResolvedValue(50);
      const r = await service.getAnalytics({ period: '30d' });
      expect(r.summary.totalVisitors).toBe(50);
      expect(r.summary.avgDailyVisitors).toBeGreaterThanOrEqual(0);
      expect(r.byPurpose).toEqual([]);
      expect(r.byStatus).toEqual([]);
      expect(r.dailyTrend).toEqual([]);
      expect(r.topHosts).toEqual([]);
      expect(r.peakHours).toEqual([]);
      expect(r.frequentVisitors).toEqual([]);
    });
  });

  // ─── Blacklist ──────────────────────────────────────────────────
  describe('getBlacklist', () => {
    it('returns paginated blacklist', async () => {
      VisitorBlacklist.find.mockReturnValue(Q([{ _id: 'bl1' }]));
      VisitorBlacklist.countDocuments.mockResolvedValue(1);
      const r = await service.getBlacklist();
      expect(r.data).toHaveLength(1);
      expect(r.pagination.total).toBe(1);
    });

    it('applies search filter', async () => {
      await service.getBlacklist({ search: 'أحمد' });
      const filter = VisitorBlacklist.find.mock.calls[0][0];
      expect(filter.$or).toBeDefined();
    });
  });

  describe('addToBlacklist', () => {
    it('adds entry to blacklist', async () => {
      VisitorBlacklist.create.mockResolvedValue({ _id: 'bl1', fullName: 'محظور', reason: 'سلوك' });
      const r = await service.addToBlacklist({ fullName: 'محظور', reason: 'سلوك' }, 'u1', 'مشرف');
      expect(r.fullName).toBe('محظور');
    });

    it('throws if missing name or reason', async () => {
      await expect(service.addToBlacklist({ fullName: 'test' }, 'u1', '')).rejects.toThrow(
        'الاسم والسبب مطلوبان'
      );
    });
  });

  describe('removeFromBlacklist', () => {
    it('deactivates entry', async () => {
      VisitorBlacklist.findByIdAndUpdate.mockResolvedValue({ _id: 'bl1', isActive: false });
      const r = await service.removeFromBlacklist('bl1', 'u1', 'مشرف');
      expect(r.isActive).toBe(false);
    });

    it('throws if not found', async () => {
      await expect(service.removeFromBlacklist('x', 'u1', 'مشرف')).rejects.toThrow(
        'السجل غير موجود'
      );
    });
  });

  // ─── Logs & Queries ─────────────────────────────────────────────
  describe('getVisitorLogs', () => {
    it('returns logs for visitor', async () => {
      VisitorLog.find.mockReturnValue(Q([{ action: 'checked_in' }]));
      const r = await service.getVisitorLogs('v1');
      expect(r).toHaveLength(1);
    });
  });

  describe('getRecentLogs', () => {
    it('returns recent logs', async () => {
      VisitorLog.find.mockReturnValue(Q([{ action: 'checked_in' }]));
      const r = await service.getRecentLogs();
      expect(r).toHaveLength(1);
    });
  });

  describe('getCurrentlyInside', () => {
    it('returns checked-in visitors', async () => {
      Visitor.find.mockReturnValue(Q([{ _id: 'v1', status: 'checked_in' }]));
      const r = await service.getCurrentlyInside();
      expect(r).toHaveLength(1);
    });
  });

  describe('getExpectedToday', () => {
    it('returns pre-registered visitors for today', async () => {
      Visitor.find.mockReturnValue(Q([{ _id: 'v1', status: 'pre_registered' }]));
      const r = await service.getExpectedToday();
      expect(r).toHaveLength(1);
    });
  });

  // ─── seedDemoData ───────────────────────────────────────────────
  describe('seedDemoData', () => {
    it('seeds 20 demo visitors', async () => {
      Visitor.insertMany.mockResolvedValue(new Array(20).fill({}));
      const r = await service.seedDemoData();
      expect(r.count).toBe(20);
      expect(Visitor.deleteMany).toHaveBeenCalled();
      expect(VisitorLog.deleteMany).toHaveBeenCalled();
      expect(Visitor.insertMany).toHaveBeenCalled();
    });
  });
});
