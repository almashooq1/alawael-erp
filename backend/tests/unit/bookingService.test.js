/**
 * Unit tests — bookingService.js
 * Singleton (module.exports = new BookingService()). In-memory arrays, no DB.
 */
'use strict';

let service;

beforeEach(() => {
  jest.isolateModules(() => {
    service = require('../../services/bookingService');
  });
});

describe('BookingService', () => {
  /* ────────────────────────────────────────────────────────────── */
  describe('initializeMockData', () => {
    it('seeds 1 default booking', () => {
      expect(service.bookings).toHaveLength(1);
      expect(service.bookings[0].id).toBe(1000);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('createBooking', () => {
    it('creates booking with auto id and price', () => {
      const b = service.createBooking({
        vehicleId: 'V1',
        bookingType: 'daily-rental',
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-07-03'),
      });
      expect(b.id).toBe(1001);
      expect(b.status).toBe('pending');
      expect(b.price).toBeGreaterThan(0);
      expect(b.depositAmount).toBe(b.price * 0.2);
      expect(b.depositPaid).toBe(false);
    });

    it('increments counter for each booking', () => {
      service.createBooking({
        bookingType: 'trip',
        startDate: '2025-07-01',
        endDate: '2025-07-02',
      });
      const b2 = service.createBooking({
        bookingType: 'trip',
        startDate: '2025-07-01',
        endDate: '2025-07-02',
      });
      expect(b2.id).toBe(1002);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('calculateBookingPrice', () => {
    it('daily-rental rate is 300/day', () => {
      const price = service.calculateBookingPrice({
        bookingType: 'daily-rental',
        startDate: '2025-07-01',
        endDate: '2025-07-02',
        specialRequirements: [],
      });
      expect(price).toBe(300);
    });

    it('adds 100 per special requirement', () => {
      const price = service.calculateBookingPrice({
        bookingType: 'daily-rental',
        startDate: '2025-07-01',
        endDate: '2025-07-02',
        specialRequirements: ['wifi', 'gps'],
      });
      expect(price).toBe(500); // 300 + 200
    });

    it('adds 15% for premium insurance', () => {
      const price = service.calculateBookingPrice({
        bookingType: 'daily-rental',
        startDate: '2025-07-01',
        endDate: '2025-07-02',
        specialRequirements: [],
        insuranceType: 'premium',
      });
      expect(price).toBe(Math.round(300 * 1.15));
    });

    it('defaults rate to 200 for unknown type', () => {
      const price = service.calculateBookingPrice({
        bookingType: 'unknown',
        startDate: '2025-07-01',
        endDate: '2025-07-02',
      });
      expect(price).toBe(200);
    });

    it('monthly-rental rate is 5000/day (30-day period)', () => {
      const price = service.calculateBookingPrice({
        bookingType: 'monthly-rental',
        startDate: '2025-07-01',
        endDate: '2025-07-31',
      });
      expect(price).toBe(5000 * 30);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getBookings', () => {
    it('returns all bookings without filters', () => {
      const result = service.getBookings();
      expect(result.count).toBe(1);
      expect(result.bookings).toHaveLength(1);
    });

    it('filters by status', () => {
      service.createBooking({
        bookingType: 'trip',
        startDate: '2025-07-01',
        endDate: '2025-07-02',
      });
      const confirmed = service.getBookings({ status: 'confirmed' });
      expect(confirmed.count).toBe(1); // only seed booking
    });

    it('filters by vehicleId', () => {
      const result = service.getBookings({ vehicleId: 'VRN-TEST-001' });
      expect(result.count).toBe(1);
    });

    it('filters by driverId', () => {
      const result = service.getBookings({ driverId: 'DRV-001' });
      expect(result.count).toBe(1);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getBookingDetails', () => {
    it('returns booking with timeline and documents', () => {
      const d = service.getBookingDetails(1000);
      expect(d.id).toBe(1000);
      expect(d.timeline).toBeDefined();
      expect(d.documents.required).toContain('رخصة القيادة');
    });

    it('returns null for unknown id', () => {
      expect(service.getBookingDetails(9999)).toBeNull();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('updateBookingStatus', () => {
    it('updates status', () => {
      const b = service.updateBookingStatus(1000, 'completed');
      expect(b.status).toBe('completed');
    });

    it('returns null for unknown id', () => {
      expect(service.updateBookingStatus(9999, 'x')).toBeNull();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('confirmBooking', () => {
    it('sets confirmed+deposit+number', () => {
      const b = service.confirmBooking(1000, { method: 'card' });
      expect(b.status).toBe('confirmed');
      expect(b.depositPaid).toBe(true);
      expect(b.confirmationNumber).toMatch(/^BK-/);
    });

    it('returns null for bad id', () => {
      expect(service.confirmBooking(9999, {})).toBeNull();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('cancelBooking', () => {
    it('cancels and calculates refund', () => {
      const b = service.cancelBooking(1000, 'personal');
      expect(b.status).toBe('cancelled');
      expect(b.cancellationReason).toBe('personal');
      expect(b.refundAmount).toBeDefined();
    });

    it('returns null for unknown id', () => {
      expect(service.cancelBooking(9999, 'x')).toBeNull();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('calculateRefund', () => {
    it('90% when >7 days away', () => {
      const b = { startDate: new Date(Date.now() + 10 * 86400000), depositAmount: 1000 };
      expect(service.calculateRefund(b)).toBe(900);
    });

    it('50% when 4-7 days away', () => {
      const b = { startDate: new Date(Date.now() + 5 * 86400000), depositAmount: 1000 };
      expect(service.calculateRefund(b)).toBe(500);
    });

    it('0% when ≤3 days away', () => {
      const b = { startDate: new Date(Date.now() + 1 * 86400000), depositAmount: 1000 };
      expect(service.calculateRefund(b)).toBe(0);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('checkVehicleAvailability', () => {
    it('returns available=true when no conflicts', () => {
      const result = service.checkVehicleAvailability('VRN-OTHER', '2025-07-01', '2025-07-10');
      expect(result.available).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('detects conflict with existing booking', () => {
      // Seed booking is VRN-TEST-001 with startDate ~+1d, endDate ~+2d
      const { startDate, endDate } = service.bookings[0];
      const result = service.checkVehicleAvailability('VRN-TEST-001', startDate, endDate);
      expect(result.available).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('addAdditionalServices', () => {
    it('adds services and recalculates totalPrice', () => {
      const b = service.addAdditionalServices(1000, ['wifi', 'gps-device']);
      expect(b.additionalServices).toHaveLength(2);
      expect(b.totalPrice).toBe(b.price + 50 + 100);
    });

    it('ignores unknown service names', () => {
      const b = service.addAdditionalServices(1000, ['nonexistent']);
      expect(b.additionalServices).toHaveLength(0);
    });

    it('returns null for bad id', () => {
      expect(service.addAdditionalServices(9999, ['wifi'])).toBeNull();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getBookingStatistics', () => {
    it('returns counts and revenue', () => {
      const s = service.getBookingStatistics();
      expect(s.total).toBe(1);
      expect(s.byStatus.confirmed).toBe(1);
      expect(s.revenue.total).toBeGreaterThan(0);
      expect(s.averageBookingPrice).toBeGreaterThan(0);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getUtilizationReport', () => {
    it('returns utilization metrics', () => {
      // Create a booking in range
      service.createBooking({
        vehicleId: 'V-UTL',
        bookingType: 'daily-rental',
        startDate: '2025-07-05',
        endDate: '2025-07-10',
        status: 'confirmed',
      });
      // update its status (createBooking sets pending)
      service.updateBookingStatus(1001, 'confirmed');

      const rpt = service.getUtilizationReport('V-UTL', '2025-07-01', '2025-07-31');
      expect(rpt.vehicleId).toBe('V-UTL');
      expect(rpt.totalDays).toBe(30);
      expect(rpt.bookingCount).toBeGreaterThanOrEqual(1);
      expect(rpt.utilizationRate).toBeGreaterThan(0);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getBookingDocuments', () => {
    it('returns required and optional docs', () => {
      const docs = service.getBookingDocuments(1000);
      expect(docs.required).toContain('رخصة القيادة');
      expect(docs.optional).toContain('تصريح عمل');
    });
  });
});
