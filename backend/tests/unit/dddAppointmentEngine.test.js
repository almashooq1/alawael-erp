'use strict';

/* ── helpers ── */
const chain = () => {
  const c = {};
  const methods = [
    'find',
    'findById',
    'findByIdAndUpdate',
    'findOne',
    'sort',
    'skip',
    'limit',
    'lean',
    'populate',
    'countDocuments',
    'create',
  ];
  methods.forEach(m => {
    c[m] = jest.fn().mockReturnValue(c);
  });
  c.then = undefined; // prevent Jest from treating as thenable
  return c;
};

const makeModel = (extra = {}) => {
  const c = chain();
  const M = jest.fn(() => c);
  Object.assign(M, c, extra);
  return M;
};

/* ── globals for the service ── */
let service, DDDAppointment, DDDWaitlist;

beforeEach(() => {
  jest.resetModules();
  DDDAppointment = makeModel();
  DDDWaitlist = makeModel();
  global.DDDAppointment = DDDAppointment;
  global.DDDWaitlist = DDDWaitlist;
  global.oid = jest.fn(v => v);
  global.model = jest.fn(() => null);

  jest.mock('../../services/base/BaseCrudService', () => {
    return class BaseCrudService {
      constructor() {}
      log() {}
      _create(M, data) {
        return M.create(data);
      }
      _update(M, id, data, opts) {
        return M.findByIdAndUpdate(id, data, { new: true, ...opts }).lean();
      }
      _list(M, filter, opts) {
        return M.find(filter)
          .sort(opts.sort || {})
          .lean();
      }
    };
  });

  service = require('../../services/dddAppointmentEngine');
});

afterEach(() => {
  delete global.DDDAppointment;
  delete global.DDDWaitlist;
  delete global.oid;
  delete global.model;
  jest.restoreAllMocks();
});

/* ════════════════════════════════════════════════════ */
describe('dddAppointmentEngine', () => {
  /* ── listAppointments ── */
  describe('listAppointments', () => {
    it('returns paginated appointments', async () => {
      const docs = [{ _id: 'a1' }];
      DDDAppointment.find.mockReturnThis();
      DDDAppointment.sort.mockReturnThis();
      DDDAppointment.skip.mockReturnThis();
      DDDAppointment.limit.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue(docs);
      DDDAppointment.countDocuments.mockResolvedValue(1);

      const r = await service.listAppointments({});
      expect(r).toEqual({ data: docs, total: 1, page: 1, pages: 1 });
    });

    it('applies beneficiaryId filter', async () => {
      DDDAppointment.find.mockReturnThis();
      DDDAppointment.sort.mockReturnThis();
      DDDAppointment.skip.mockReturnThis();
      DDDAppointment.limit.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue([]);
      DDDAppointment.countDocuments.mockResolvedValue(0);

      await service.listAppointments({ beneficiaryId: 'b1' });
      expect(global.oid).toHaveBeenCalledWith('b1');
    });

    it('applies therapistId filter', async () => {
      DDDAppointment.find.mockReturnThis();
      DDDAppointment.sort.mockReturnThis();
      DDDAppointment.skip.mockReturnThis();
      DDDAppointment.limit.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue([]);
      DDDAppointment.countDocuments.mockResolvedValue(0);

      await service.listAppointments({ therapistId: 't1' });
      expect(global.oid).toHaveBeenCalledWith('t1');
    });

    it('applies status filter', async () => {
      DDDAppointment.find.mockReturnThis();
      DDDAppointment.sort.mockReturnThis();
      DDDAppointment.skip.mockReturnThis();
      DDDAppointment.limit.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue([]);
      DDDAppointment.countDocuments.mockResolvedValue(0);

      await service.listAppointments({ status: 'scheduled' });
      expect(DDDAppointment.find).toHaveBeenCalled();
    });

    it('respects page and limit params', async () => {
      DDDAppointment.find.mockReturnThis();
      DDDAppointment.sort.mockReturnThis();
      DDDAppointment.skip.mockReturnThis();
      DDDAppointment.limit.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue([]);
      DDDAppointment.countDocuments.mockResolvedValue(50);

      const r = await service.listAppointments({ page: 2, limit: 10 });
      expect(DDDAppointment.skip).toHaveBeenCalledWith(10);
      expect(DDDAppointment.limit).toHaveBeenCalledWith(10);
      expect(r.pages).toBe(5);
    });
  });

  /* ── getAppointment ── */
  describe('getAppointment', () => {
    it('returns appointment by id', async () => {
      DDDAppointment.findById.mockReturnThis();
      DDDAppointment.populate.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue({ _id: 'a1' });
      const r = await service.getAppointment('a1');
      expect(r).toEqual({ _id: 'a1' });
    });
  });

  /* ── createAppointment ── */
  describe('createAppointment', () => {
    it('creates appointment with auto-code', async () => {
      DDDAppointment.countDocuments.mockResolvedValue(5);
      DDDAppointment.find.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue([]);
      DDDAppointment.create.mockResolvedValue({ _id: 'new1', code: 'APT-X' });

      const r = await service.createAppointment({ type: 'assessment' });
      expect(DDDAppointment.create).toHaveBeenCalled();
      expect(r.conflict).toBe(false);
      expect(r.appointment).toHaveProperty('_id');
    });

    it('checks conflicts before creating', async () => {
      DDDAppointment.countDocuments.mockResolvedValue(0);
      DDDAppointment.find.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue([]);
      DDDAppointment.create.mockResolvedValue({ _id: 'new2' });

      await service.createAppointment({
        therapistId: 't1',
        startAt: new Date(),
        endAt: new Date(),
      });
      // checkConflicts uses DDDAppointment.find
      expect(DDDAppointment.find).toHaveBeenCalled();
    });
  });

  /* ── updateAppointment ── */
  describe('updateAppointment', () => {
    it('updates appointment by id', async () => {
      DDDAppointment.findByIdAndUpdate.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue({ _id: 'a1', status: 'confirmed' });
      const r = await service.updateAppointment('a1', { status: 'confirmed' });
      expect(r.status).toBe('confirmed');
    });
  });

  /* ── cancelAppointment ── */
  describe('cancelAppointment', () => {
    it('cancels an appointment with reason', async () => {
      DDDAppointment.findByIdAndUpdate.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue({ _id: 'a1', status: 'cancelled' });
      const r = await service.cancelAppointment('a1', 'patient_request', 'u1');
      expect(DDDAppointment.findByIdAndUpdate).toHaveBeenCalled();
      expect(r.status).toBe('cancelled');
    });
  });

  /* ── checkIn ── */
  describe('checkIn', () => {
    it('checks in an appointment', async () => {
      DDDAppointment.findByIdAndUpdate.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue({ _id: 'a1', status: 'checked_in' });
      const r = await service.checkIn('a1');
      expect(r.status).toBe('checked_in');
    });
  });

  /* ── checkOut ── */
  describe('checkOut', () => {
    it('checks out an appointment', async () => {
      DDDAppointment.findByIdAndUpdate.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue({ _id: 'a1', status: 'completed' });
      const r = await service.checkOut('a1');
      expect(r.status).toBe('completed');
    });
  });

  /* ── checkConflicts ── */
  describe('checkConflicts', () => {
    it('returns conflicts array', async () => {
      DDDAppointment.find.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue([{ _id: 'conflict1' }]);
      const r = await service.checkConflicts('t1', new Date(), new Date());
      expect(Array.isArray(r)).toBe(true);
    });

    it('returns empty when no conflicts', async () => {
      DDDAppointment.find.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue([]);
      const r = await service.checkConflicts('t1', new Date(), new Date());
      expect(r).toEqual([]);
    });
  });

  /* ── generateRecurring ── */
  describe('generateRecurring', () => {
    it('generates recurring appointments', async () => {
      // createAppointment internally: countDocuments, checkConflicts(find+lean), create
      DDDAppointment.countDocuments.mockResolvedValue(0);
      DDDAppointment.find.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue([]); // no conflicts
      DDDAppointment.create.mockImplementation(d => Promise.resolve({ _id: 'r1', ...d }));

      const template = {
        therapistId: 't1',
        beneficiaryId: 'b1',
        type: 'therapy',
        startAt: new Date(),
        durationMinutes: 45,
      };
      const r = await service.generateRecurring(template, 'weekly', 3);
      // returns an array of appointments directly
      expect(Array.isArray(r)).toBe(true);
      expect(r).toHaveLength(3);
    });

    it('defaults to 10 when count not specified', async () => {
      DDDAppointment.countDocuments.mockResolvedValue(0);
      DDDAppointment.find.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue([]);
      DDDAppointment.create.mockImplementation(d => Promise.resolve({ _id: 'r', ...d }));

      const template = { startAt: new Date(), durationMinutes: 30 };
      const r = await service.generateRecurring(template, 'daily');
      expect(r).toHaveLength(10);
    });
  });

  /* ── addToWaitlist ── */
  describe('addToWaitlist', () => {
    it('adds entry to waitlist', async () => {
      DDDWaitlist.create.mockResolvedValue({ _id: 'w1', status: 'waiting' });
      const r = await service.addToWaitlist({ beneficiaryId: 'b1', serviceType: 'PT' });
      expect(r).toHaveProperty('_id');
    });
  });

  /* ── listWaitlist ── */
  describe('listWaitlist', () => {
    it('returns paginated waitlist', async () => {
      DDDWaitlist.find.mockReturnThis();
      DDDWaitlist.sort.mockReturnThis();
      DDDWaitlist.skip.mockReturnThis();
      DDDWaitlist.limit.mockReturnThis();
      DDDWaitlist.lean.mockResolvedValue([]);
      DDDWaitlist.countDocuments.mockResolvedValue(0);

      const r = await service.listWaitlist({});
      expect(r).toHaveProperty('data');
      expect(r).toHaveProperty('total');
    });
  });

  /* ── processWaitlist ── */
  describe('processWaitlist', () => {
    it('processes waiting entries', async () => {
      DDDWaitlist.find.mockReturnThis();
      DDDWaitlist.sort.mockReturnThis();
      DDDWaitlist.limit.mockReturnThis();
      DDDWaitlist.lean.mockResolvedValue([{ _id: 'w1', status: 'waiting' }]);
      DDDWaitlist.findByIdAndUpdate.mockResolvedValue({});
      global.model.mockReturnValue(null);

      const r = await service.processWaitlist('PT');
      expect(r).toHaveProperty('processed');
    });

    it('returns empty when no waiting entries', async () => {
      DDDWaitlist.find.mockReturnThis();
      DDDWaitlist.sort.mockReturnThis();
      DDDWaitlist.limit.mockReturnThis();
      DDDWaitlist.lean.mockResolvedValue([]);

      const r = await service.processWaitlist('PT');
      expect(r.processed).toBe(0);
    });
  });

  /* ── autoSchedule ── */
  describe('autoSchedule', () => {
    it('returns not available when resource models missing', async () => {
      global.model.mockReturnValue(null);
      const r = await service.autoSchedule('b1', 'PT');
      expect(r).toEqual({ scheduled: false, reason: 'Resource models not available' });
    });

    it('returns suggestions when slots are available', async () => {
      const mockResource = makeModel();
      const mockSlot = makeModel();
      global.model.mockImplementation(n => {
        if (n === 'DDDResource') return mockResource;
        if (n === 'DDDAvailabilitySlot') return mockSlot;
        return null;
      });
      mockResource.find.mockReturnThis();
      mockResource.limit.mockReturnThis();
      mockResource.lean.mockResolvedValue([{ _id: 'r1', name: 'Dr.A', linkedUserId: 'u1' }]);
      mockSlot.find.mockReturnThis();
      mockSlot.lean.mockResolvedValue([
        {
          resourceId: 'r1',
          dayOfWeek: new Date().getDay(),
          startTime: '09:00',
          endTime: '10:00',
          isActive: true,
        },
      ]);
      DDDAppointment.find.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue([]);

      const r = await service.autoSchedule('b1', 'PT', null, new Date());
      expect(r).toHaveProperty('suggestions');
      expect(r).toHaveProperty('count');
    });
  });

  /* ── getCalendar ── */
  describe('getCalendar', () => {
    it('returns calendar grouped by date', async () => {
      const now = new Date();
      const appt = { _id: 'a1', startAt: now };
      DDDAppointment.find.mockReturnThis();
      DDDAppointment.sort.mockReturnThis();
      DDDAppointment.populate.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue([appt]);

      const r = await service.getCalendar({});
      expect(r).toHaveProperty('calendar');
      expect(r).toHaveProperty('totalAppointments', 1);
    });

    it('applies therapistId filter', async () => {
      DDDAppointment.find.mockReturnThis();
      DDDAppointment.sort.mockReturnThis();
      DDDAppointment.populate.mockReturnThis();
      DDDAppointment.lean.mockResolvedValue([]);

      await service.getCalendar({ therapistId: 't1' });
      expect(global.oid).toHaveBeenCalledWith('t1');
    });
  });

  /* ── getStats ── */
  describe('getStats', () => {
    it('returns appointment statistics', async () => {
      DDDAppointment.countDocuments
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(5) // todayCount
        .mockResolvedValueOnce(3) // cancelledThisMonth
        .mockResolvedValueOnce(2); // noShowThisMonth
      DDDWaitlist.countDocuments.mockResolvedValue(10);

      const r = await service.getStats();
      expect(r).toHaveProperty('total', 100);
      expect(r).toHaveProperty('todayCount', 5);
      expect(r).toHaveProperty('waitlistCount', 10);
      expect(r).toHaveProperty('templateCount');
    });
  });
});
