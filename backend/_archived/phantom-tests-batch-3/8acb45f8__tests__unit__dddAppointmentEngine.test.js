'use strict';

/* ── mock-prefixed variables ── */
const mockAppointmentFind = jest.fn();
const mockAppointmentCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'appointment1', ...d }));
const mockAppointmentCount = jest.fn().mockResolvedValue(0);
const mockResourceAllocationFind = jest.fn();
const mockResourceAllocationCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'resourceAllocation1', ...d }));
const mockResourceAllocationCount = jest.fn().mockResolvedValue(0);
const mockWaitlistFind = jest.fn();
const mockWaitlistCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'waitlist1', ...d }));
const mockWaitlistCount = jest.fn().mockResolvedValue(0);
const mockResourceFind = jest.fn();
const mockResourceCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'resource1', ...d }));
const mockResourceCount = jest.fn().mockResolvedValue(0);
const mockAvailabilitySlotFind = jest.fn();
const mockAvailabilitySlotCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'availabilitySlot1', ...d }));
const mockAvailabilitySlotCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddAppointmentEngine', () => ({
  DDDAppointment: {
    find: mockAppointmentFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'appointment1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'appointment1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockAppointmentCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'appointment1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'appointment1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'appointment1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'appointment1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'appointment1' }) }),
    countDocuments: mockAppointmentCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDResourceAllocation: {
    find: mockResourceAllocationFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'resourceAllocation1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'resourceAllocation1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockResourceAllocationCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resourceAllocation1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resourceAllocation1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resourceAllocation1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resourceAllocation1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resourceAllocation1' }) }),
    countDocuments: mockResourceAllocationCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDWaitlist: {
    find: mockWaitlistFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'waitlist1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'waitlist1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockWaitlistCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'waitlist1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'waitlist1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'waitlist1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'waitlist1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'waitlist1' }) }),
    countDocuments: mockWaitlistCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDResource: {
    find: mockResourceFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'resource1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'resource1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockResourceCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resource1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resource1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resource1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resource1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resource1' }) }),
    countDocuments: mockResourceCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDAvailabilitySlot: {
    find: mockAvailabilitySlotFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'availabilitySlot1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'availabilitySlot1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockAvailabilitySlotCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'availabilitySlot1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'availabilitySlot1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'availabilitySlot1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'availabilitySlot1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'availabilitySlot1' }) }),
    countDocuments: mockAvailabilitySlotCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  APPOINTMENT_TYPES: ['item1', 'item2'],
  APPOINTMENT_STATUSES: ['item1', 'item2'],
  RECURRENCE_PATTERNS: ['item1', 'item2'],
  WAITLIST_PRIORITIES: ['item1', 'item2'],
  CANCELLATION_REASONS: ['item1', 'item2'],
  BUILTIN_APPOINTMENT_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddAppointmentEngine');

describe('dddAppointmentEngine service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _appointmentL = jest.fn().mockResolvedValue([]);
    const _appointmentLim = jest.fn().mockReturnValue({ lean: _appointmentL });
    const _appointmentS = jest.fn().mockReturnValue({ limit: _appointmentLim, lean: _appointmentL, populate: jest.fn().mockReturnValue({ lean: _appointmentL }) });
    mockAppointmentFind.mockReturnValue({ sort: _appointmentS, lean: _appointmentL, limit: _appointmentLim, populate: jest.fn().mockReturnValue({ lean: _appointmentL, sort: _appointmentS }) });
    const _resourceAllocationL = jest.fn().mockResolvedValue([]);
    const _resourceAllocationLim = jest.fn().mockReturnValue({ lean: _resourceAllocationL });
    const _resourceAllocationS = jest.fn().mockReturnValue({ limit: _resourceAllocationLim, lean: _resourceAllocationL, populate: jest.fn().mockReturnValue({ lean: _resourceAllocationL }) });
    mockResourceAllocationFind.mockReturnValue({ sort: _resourceAllocationS, lean: _resourceAllocationL, limit: _resourceAllocationLim, populate: jest.fn().mockReturnValue({ lean: _resourceAllocationL, sort: _resourceAllocationS }) });
    const _waitlistL = jest.fn().mockResolvedValue([]);
    const _waitlistLim = jest.fn().mockReturnValue({ lean: _waitlistL });
    const _waitlistS = jest.fn().mockReturnValue({ limit: _waitlistLim, lean: _waitlistL, populate: jest.fn().mockReturnValue({ lean: _waitlistL }) });
    mockWaitlistFind.mockReturnValue({ sort: _waitlistS, lean: _waitlistL, limit: _waitlistLim, populate: jest.fn().mockReturnValue({ lean: _waitlistL, sort: _waitlistS }) });
    const _resourceL = jest.fn().mockResolvedValue([]);
    const _resourceLim = jest.fn().mockReturnValue({ lean: _resourceL });
    const _resourceS = jest.fn().mockReturnValue({ limit: _resourceLim, lean: _resourceL, populate: jest.fn().mockReturnValue({ lean: _resourceL }) });
    mockResourceFind.mockReturnValue({ sort: _resourceS, lean: _resourceL, limit: _resourceLim, populate: jest.fn().mockReturnValue({ lean: _resourceL, sort: _resourceS }) });
    const _availabilitySlotL = jest.fn().mockResolvedValue([]);
    const _availabilitySlotLim = jest.fn().mockReturnValue({ lean: _availabilitySlotL });
    const _availabilitySlotS = jest.fn().mockReturnValue({ limit: _availabilitySlotLim, lean: _availabilitySlotL, populate: jest.fn().mockReturnValue({ lean: _availabilitySlotL }) });
    mockAvailabilitySlotFind.mockReturnValue({ sort: _availabilitySlotS, lean: _availabilitySlotL, limit: _availabilitySlotLim, populate: jest.fn().mockReturnValue({ lean: _availabilitySlotL, sort: _availabilitySlotS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc).not.toBeNull();
  });


  test('listAppointments is callable', () => {
    expect(typeof svc.listAppointments).toBe('function');
  });

  test('getAppointment is callable', () => {
    expect(typeof svc.getAppointment).toBe('function');
  });

  test('createAppointment is callable', () => {
    expect(typeof svc.createAppointment).toBe('function');
  });

  test('updateAppointment is callable', () => {
    expect(typeof svc.updateAppointment).toBe('function');
  });

  test('cancelAppointment is callable', () => {
    expect(typeof svc.cancelAppointment).toBe('function');
  });

  test('checkIn is callable', () => {
    expect(typeof svc.checkIn).toBe('function');
  });

  test('checkOut is callable', () => {
    expect(typeof svc.checkOut).toBe('function');
  });

  test('checkConflicts is callable', () => {
    expect(typeof svc.checkConflicts).toBe('function');
  });

  test('generateRecurring is callable', () => {
    expect(typeof svc.generateRecurring).toBe('function');
  });

  test('addToWaitlist is callable', () => {
    expect(typeof svc.addToWaitlist).toBe('function');
  });

  test('listWaitlist is callable', () => {
    expect(typeof svc.listWaitlist).toBe('function');
  });

  test('processWaitlist is callable', () => {
    expect(typeof svc.processWaitlist).toBe('function');
  });

  test('autoSchedule is callable', () => {
    expect(typeof svc.autoSchedule).toBe('function');
  });

  test('getCalendar is callable', () => {
    expect(typeof svc.getCalendar).toBe('function');
  });

  test('getStats is callable', () => {
    expect(typeof svc.getStats).toBe('function');
  });
});
