/**
 * Unit tests for smartFleetDashboard.service.js — Smart Fleet Dashboard
 * Class export, all static methods. Uses Vehicle, Trip, Driver models.
 */

/* ── chainable query helper ─────────────────────────────────────────── */
global.__sfdQ = function (val) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    then: (r, e) => Promise.resolve(val).then(r, e),
  };
};

jest.mock('../../models/Vehicle', () => ({
  find: jest.fn(() => global.__sfdQ([])),
}));
jest.mock('../../models/Trip', () => ({
  find: jest.fn(() => global.__sfdQ([])),
}));
jest.mock('../../models/Driver', () => ({
  findById: jest.fn(() => global.__sfdQ(null)),
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

/* ── SUT ────────────────────────────────────────────────────────────── */
const SFD = require('../../services/smartFleetDashboard.service');
const Vehicle = require('../../models/Vehicle');
const Trip = require('../../models/Trip');
const Driver = require('../../models/Driver');
const Q = global.__sfdQ;

/* ── Reset ──────────────────────────────────────────────────────────── */
beforeEach(() => {
  jest.clearAllMocks();
  Vehicle.find.mockImplementation(() => Q([]));
  Trip.find.mockImplementation(() => Q([]));
  Driver.findById.mockImplementation(() => Q(null));
});

/* ═══════════════════════════════════════════════════════════════════════ */
describe('SmartFleetDashboardService', () => {
  /* ── getFleetSnapshot ────────────────────────────────────────────── */
  describe('getFleetSnapshot', () => {
    test('returns snapshot with counts', async () => {
      const vehicles = [
        {
          _id: 'v1',
          plateNumber: 'AB-123',
          type: 'bus',
          status: 'active',
          gpsTracking: {
            currentLocation: { coordinates: [46.7, 24.6] },
            currentSpeed: 60,
            heading: 90,
            lastUpdateTime: Date.now(),
          },
          maintenance: { fuelConsumption: { currentFuelLevel: 75 } },
          assignedDriver: { name: 'Ali' },
        },
        {
          _id: 'v2',
          plateNumber: 'CD-456',
          type: 'van',
          status: 'maintenance',
          gpsTracking: {},
          maintenance: {},
          assignedDriver: null,
        },
      ];
      const trips = [{ _id: 't1', statistics: { totalDistance: 50 } }];

      Vehicle.find.mockImplementation(() => Q(vehicles));
      // Trip.find is called twice: once for snapshot, once for weekly analytics
      Trip.find
        .mockImplementationOnce(() => Q(trips)) // active trips
        .mockImplementationOnce(() => Q([])); // weekly trips in calculateFleetAnalytics

      const snap = await SFD.getFleetSnapshot();
      expect(snap.fleet.total).toBe(2);
      expect(snap.fleet.active).toBe(1);
      expect(snap.fleet.maintenance).toBe(1);
      expect(snap.vehicles).toHaveLength(2);
      expect(snap.vehicles[0].currentSpeed).toBe(60);
      expect(snap.analytics).toBeDefined();
    });

    test('throws on error', async () => {
      Vehicle.find.mockImplementation(() => {
        throw new Error('DB');
      });
      await expect(SFD.getFleetSnapshot()).rejects.toThrow('DB');
    });
  });

  /* ── calculateFleetAnalytics ─────────────────────────────────────── */
  describe('calculateFleetAnalytics', () => {
    test('computes distance, fuel, safety, efficiency', async () => {
      const vehicles = [
        { maintenance: { fuelConsumption: { currentFuelLevel: 80 } } },
        { maintenance: { fuelConsumption: { currentFuelLevel: 60 } } },
      ];
      const trips = [
        {
          statistics: { totalDistance: 100, totalDuration: 120 },
          incidents: [{ type: 'accident' }],
        },
        { statistics: { totalDistance: 50, totalDuration: 60 }, incidents: [] },
      ];
      Trip.find.mockImplementation(() => Q([])); // weekly trips

      const analytics = await SFD.calculateFleetAnalytics(vehicles, trips);
      expect(analytics.distance.daily).toBe(150);
      expect(analytics.fuel.averageConsumption).toBe(70);
      expect(analytics.safety.violations).toBe(1);
      expect(analytics.efficiency.utilizationRate).toBe(100);
      expect(analytics.efficiency.averageTripDuration).toBe(90);
    });
  });

  /* ── generateVehicleAlerts ───────────────────────────────────────── */
  describe('generateVehicleAlerts', () => {
    test('maintenance overdue alert', async () => {
      const v = { plateNumber: 'AB-1', maintenance: { status: 'overdue' } };
      const alerts = await SFD.generateVehicleAlerts(v);
      expect(alerts.some(a => a.type === 'maintenance_overdue')).toBe(true);
    });

    test('low fuel alert — critical', async () => {
      const v = { plateNumber: 'AB-1', maintenance: { fuelConsumption: { currentFuelLevel: 3 } } };
      const alerts = await SFD.generateVehicleAlerts(v);
      expect(alerts.some(a => a.type === 'low_fuel' && a.severity === 'critical')).toBe(true);
    });

    test('low fuel alert — high', async () => {
      const v = { plateNumber: 'AB-1', maintenance: { fuelConsumption: { currentFuelLevel: 10 } } };
      const alerts = await SFD.generateVehicleAlerts(v);
      expect(alerts.some(a => a.type === 'low_fuel' && a.severity === 'high')).toBe(true);
    });

    test('tire wear alert', async () => {
      const v = { plateNumber: 'AB-1', maintenance: { tires: { averageWear: 95 } } };
      const alerts = await SFD.generateVehicleAlerts(v);
      expect(alerts.some(a => a.type === 'tire_wear')).toBe(true);
    });

    test('GPS signal lost alert', async () => {
      const old = Date.now() - 15 * 60 * 1000; // 15 min ago
      const v = { plateNumber: 'AB-1', gpsTracking: { lastUpdateTime: old } };
      const alerts = await SFD.generateVehicleAlerts(v);
      expect(alerts.some(a => a.type === 'gps_signal_lost')).toBe(true);
    });

    test('no alerts for healthy vehicle', async () => {
      const v = {
        plateNumber: 'AB-1',
        maintenance: {
          status: 'ok',
          fuelConsumption: { currentFuelLevel: 80 },
          tires: { averageWear: 30 },
        },
        gpsTracking: { lastUpdateTime: Date.now() },
      };
      const alerts = await SFD.generateVehicleAlerts(v);
      expect(alerts).toHaveLength(0);
    });
  });

  /* ── categorizeAlerts ────────────────────────────────────────────── */
  describe('categorizeAlerts', () => {
    test('splits by severity', () => {
      const alerts = [
        { severity: 'critical' },
        { severity: 'high' },
        { severity: 'high' },
        { severity: 'medium' },
        { severity: 'low' },
      ];
      const cat = SFD.categorizeAlerts(alerts);
      expect(cat.critical).toHaveLength(1);
      expect(cat.high).toHaveLength(2);
      expect(cat.medium).toHaveLength(1);
      expect(cat.low).toHaveLength(1);
    });
  });

  /* ── calculateSafetyScore ────────────────────────────────────────── */
  describe('calculateSafetyScore', () => {
    test('perfect score with no violations', () => {
      const violations = { speeding: 0, harshBraking: 0, harshAcceleration: 0, routeDeviation: 0 };
      const incidents = { accidents: 0, breakdowns: 0 };
      expect(SFD.calculateSafetyScore(violations, incidents)).toBe(100);
    });

    test('deductions applied', () => {
      const violations = { speeding: 5, harshBraking: 3, harshAcceleration: 2, routeDeviation: 4 };
      const incidents = { accidents: 1, breakdowns: 1 };
      const score = SFD.calculateSafetyScore(violations, incidents);
      // 100 - 10 - 3 - 2 - 2 - 20 - 5 = 58
      expect(score).toBe(58);
    });

    test('clamped to 0', () => {
      const violations = {
        speeding: 50,
        harshBraking: 50,
        harshAcceleration: 50,
        routeDeviation: 50,
      };
      const incidents = { accidents: 10, breakdowns: 10 };
      expect(SFD.calculateSafetyScore(violations, incidents)).toBe(0);
    });
  });

  /* ── generateDriverRecommendations ───────────────────────────────── */
  describe('generateDriverRecommendations', () => {
    test('speeding recommendation', () => {
      const metrics = {
        violations: { speeding: 10, harshBraking: 0 },
        fuelEfficiency: 10,
        onTimePercentage: 90,
      };
      const recs = SFD.generateDriverRecommendations(metrics);
      expect(recs.some(r => r.category === 'safety')).toBe(true);
    });

    test('harsh braking recommendation', () => {
      const metrics = {
        violations: { speeding: 0, harshBraking: 5 },
        fuelEfficiency: 10,
        onTimePercentage: 90,
      };
      const recs = SFD.generateDriverRecommendations(metrics);
      expect(recs.some(r => r.category === 'driving_style')).toBe(true);
    });

    test('fuel efficiency recommendation', () => {
      const metrics = {
        violations: { speeding: 0, harshBraking: 0 },
        fuelEfficiency: 4,
        onTimePercentage: 90,
      };
      const recs = SFD.generateDriverRecommendations(metrics);
      expect(recs.some(r => r.category === 'efficiency')).toBe(true);
    });

    test('punctuality recommendation', () => {
      const metrics = {
        violations: { speeding: 0, harshBraking: 0 },
        fuelEfficiency: 10,
        onTimePercentage: 70,
      };
      const recs = SFD.generateDriverRecommendations(metrics);
      expect(recs.some(r => r.category === 'punctuality')).toBe(true);
    });

    test('no recommendations for perfect driver', () => {
      const metrics = {
        violations: { speeding: 0, harshBraking: 0 },
        fuelEfficiency: 10,
        onTimePercentage: 95,
      };
      const recs = SFD.generateDriverRecommendations(metrics);
      expect(recs).toHaveLength(0);
    });
  });

  /* ── calculateDriverRating ───────────────────────────────────────── */
  describe('calculateDriverRating', () => {
    test('computes weighted overall rating', () => {
      const metrics = {
        safetyScore: 90,
        fuelEfficiency: 8,
        onTimePercentage: 85,
        totalDistance: 400,
      };
      const rating = SFD.calculateDriverRating(metrics);
      expect(rating.overall).toBeGreaterThan(0);
      expect(rating.overall).toBeLessThanOrEqual(100);
      expect(rating).toHaveProperty('level');
    });
  });

  /* ── getRatingLevel ──────────────────────────────────────────────── */
  describe('getRatingLevel', () => {
    test('excellent', () => expect(SFD.getRatingLevel(95)).toBe('ممتاز'));
    test('very good', () => expect(SFD.getRatingLevel(85)).toBe('جيد جداً'));
    test('good', () => expect(SFD.getRatingLevel(75)).toBe('جيد'));
    test('acceptable', () => expect(SFD.getRatingLevel(65)).toBe('مقبول'));
    test('needs improvement', () => expect(SFD.getRatingLevel(50)).toBe('يحتاج تحسين'));
  });

  /* ── getTimeframeRange ───────────────────────────────────────────── */
  describe('getTimeframeRange', () => {
    test('daily', () => {
      const { startDate, endDate } = SFD.getTimeframeRange('daily');
      expect(startDate).toBeInstanceOf(Date);
      expect(endDate).toBeInstanceOf(Date);
      expect(endDate - startDate).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    });

    test('hourly', () => {
      const { startDate, endDate } = SFD.getTimeframeRange('hourly');
      expect(endDate - startDate).toBeLessThanOrEqual(60 * 60 * 1000 + 1000);
    });

    test('weekly', () => {
      const { startDate } = SFD.getTimeframeRange('weekly');
      expect(startDate).toBeInstanceOf(Date);
    });

    test('monthly', () => {
      const { startDate } = SFD.getTimeframeRange('monthly');
      expect(startDate.getDate()).toBe(1);
    });

    test('yearly', () => {
      const { startDate } = SFD.getTimeframeRange('yearly');
      expect(startDate.getMonth()).toBe(0);
      expect(startDate.getDate()).toBe(1);
    });

    test('default fallback', () => {
      const { startDate, endDate } = SFD.getTimeframeRange('unknown');
      expect(endDate - startDate).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 1000);
    });
  });

  /* ── categorizeIncidents ─────────────────────────────────────────── */
  describe('categorizeIncidents', () => {
    test('counts by type', () => {
      const trips = [
        {
          incidents: [{ type: 'accident' }, { type: 'breakdown' }],
          alerts: [{ type: 'speeding' }, { type: 'route_deviation' }],
        },
        {
          incidents: [{ type: 'other_thing' }],
          alerts: [{ type: 'speeding' }],
        },
      ];
      const cat = SFD.categorizeIncidents(trips);
      expect(cat.accidents).toBe(1);
      expect(cat.breakdowns).toBe(1);
      expect(cat.other).toBe(1);
      expect(cat.speedingViolations).toBe(2);
      expect(cat.routeDeviations).toBe(1);
    });
  });

  /* ── getDriverPerformanceReport ──────────────────────────────────── */
  describe('getDriverPerformanceReport', () => {
    test('returns performance report', async () => {
      const driver = { _id: 'd1', name: 'Ali', email: 'a@b.com', phone: '050' };
      Driver.findById.mockImplementation(() => Q(driver));
      Trip.find.mockImplementation(() =>
        Q([
          {
            statistics: { totalDistance: 100, totalDuration: 60 },
            alerts: [{ type: 'speeding' }],
            incidents: [{ type: 'accident' }],
            fuelData: { efficiency: 8 },
            arrivedOnTime: true,
          },
        ])
      );

      const report = await SFD.getDriverPerformanceReport('d1', 30);
      expect(report.success).toBe(true);
      expect(report.driver.name).toBe('Ali');
      expect(report.metrics.totalTrips).toBe(1);
      expect(report.metrics.totalDistance).toBe(100);
      expect(report.metrics.violations.speeding).toBe(1);
      expect(report.metrics.incidents.accidents).toBe(1);
      expect(report.recommendations).toBeDefined();
      expect(report.rating).toBeDefined();
    });

    test('throws when driver not found', async () => {
      Driver.findById.mockImplementation(() => Q(null));
      await expect(SFD.getDriverPerformanceReport('nope')).rejects.toThrow('السائق غير موجود');
    });
  });

  /* ── getFleetKPIs ────────────────────────────────────────────────── */
  describe('getFleetKPIs', () => {
    test('returns KPI object', async () => {
      Trip.find.mockImplementation(() => Q([]));
      Vehicle.find.mockImplementation(() => Q([{ isActive: true }]));
      const kpis = await SFD.getFleetKPIs('daily');
      expect(kpis).toHaveProperty('operational');
      expect(kpis).toHaveProperty('financial');
      expect(kpis).toHaveProperty('safety');
      expect(kpis).toHaveProperty('environmental');
    });

    test('throws on error', async () => {
      Trip.find.mockImplementation(() => {
        throw new Error('DB');
      });
      await expect(SFD.getFleetKPIs()).rejects.toThrow('DB');
    });
  });

  /* ── getDailyReport ──────────────────────────────────────────────── */
  describe('getDailyReport', () => {
    test('returns daily summary', async () => {
      Trip.find.mockImplementation(() =>
        Q([
          {
            _id: 't1',
            vehicle: { plateNumber: 'AB-1' },
            driver: { name: 'Ali' },
            statistics: { totalDistance: 100, totalDuration: 60 },
            fuelData: { consumed: 15 },
            incidents: [{}],
            status: 'completed',
          },
        ])
      );

      const report = await SFD.getDailyReport('2024-06-15');
      expect(report.date).toBe('2024-06-15');
      expect(report.summary.totalTrips).toBe(1);
      expect(report.summary.totalDistance).toBe(100);
      expect(report.summary.incidents).toBe(1);
      expect(report.details).toHaveLength(1);
    });

    test('defaults to today', async () => {
      Trip.find.mockImplementation(() => Q([]));
      const report = await SFD.getDailyReport();
      expect(report.date).toBeDefined();
      expect(report.summary.totalTrips).toBe(0);
    });
  });
});
