'use strict';

/* ─── Dependency mocks ─────────────────────────────────────────────────────── */
const mockGetMaintenanceStatistics = jest.fn();
const mockGetMaintenanceHistory = jest.fn();
const mockGetMaintenanceRecommendations = jest.fn();
jest.mock('../../services/maintenanceService', () => ({
  getMaintenanceStatistics: (...a) => mockGetMaintenanceStatistics(...a),
  getMaintenanceHistory: (...a) => mockGetMaintenanceHistory(...a),
  getMaintenanceRecommendations: (...a) => mockGetMaintenanceRecommendations(...a),
}));

const mockGetFuelHistory = jest.fn();
const mockGetFuelAlerts = jest.fn();
jest.mock('../../services/fuelService', () => ({
  getFuelHistory: (...a) => mockGetFuelHistory(...a),
  getFuelAlerts: (...a) => mockGetFuelAlerts(...a),
}));

const mockGetViolationStatistics = jest.fn();
const mockGetViolations = jest.fn();
const mockGetDriverViolationPoints = jest.fn();
const mockGetViolationAlerts = jest.fn();
jest.mock('../../services/violationsService', () => ({
  getViolationStatistics: (...a) => mockGetViolationStatistics(...a),
  getViolations: (...a) => mockGetViolations(...a),
  getDriverViolationPoints: (...a) => mockGetDriverViolationPoints(...a),
  getViolationAlerts: (...a) => mockGetViolationAlerts(...a),
}));

jest.mock('../../services/bookingService', () => ({}));
jest.mock('../../services/driverRatingService', () => ({}));
jest.mock('../../services/alertNotificationService', () => ({}));
jest.mock('../../services/costBudgetService', () => ({}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

/* ═══════════════════════════════════════════════════════════════════════════ */
describe('dashboardService', () => {
  let svc;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      svc = require('../../services/dashboardService');
    });
  });

  /* ─── getMainDashboard ─────────────────────────────────────────────────── */
  describe('getMainDashboard', () => {
    test('returns success:true with overview and all sections', async () => {
      mockGetMaintenanceStatistics.mockResolvedValue({
        data: { totalRecords: 5, totalCost: 2000 },
      });
      mockGetViolationStatistics.mockResolvedValue({
        data: { total: 3, pending: 1, unpaidFines: 500, totalPoints: 6 },
      });

      const result = await svc.getMainDashboard();
      expect(result.success).toBe(true);
      expect(result.data.overview).toBeDefined();
      expect(result.data.vehicles).toBeDefined();
      expect(result.data.drivers).toBeDefined();
      expect(result.data.trips).toBeDefined();
      expect(result.data.maintenance).toBeDefined();
      expect(result.data.fuel).toBeDefined();
      expect(result.data.violations).toBeDefined();
      expect(result.data.alerts).toBeDefined();
      expect(result.data.timestamp).toBeDefined();
    });

    test('returns success:true with defaults when inner calls fail', async () => {
      mockGetMaintenanceStatistics.mockRejectedValue(new Error('fail'));
      mockGetViolationStatistics.mockRejectedValue(new Error('fail'));

      const result = await svc.getMainDashboard();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  /* ─── getVehiclesSummary ───────────────────────────────────────────────── */
  describe('getVehiclesSummary', () => {
    test('returns static vehicle summary', async () => {
      const r = await svc.getVehiclesSummary();
      expect(r.total).toBe(9);
      expect(r.active).toBe(7);
      expect(r.byStatus).toBeDefined();
    });
  });

  /* ─── getDriversSummary ────────────────────────────────────────────────── */
  describe('getDriversSummary', () => {
    test('returns default zero drivers', async () => {
      const r = await svc.getDriversSummary();
      expect(r.total).toBe(0);
    });
  });

  /* ─── getTripsSummary ──────────────────────────────────────────────────── */
  describe('getTripsSummary', () => {
    test('returns default zero trips', async () => {
      const r = await svc.getTripsSummary();
      expect(r.today).toBe(0);
      expect(r.active).toBe(0);
    });
  });

  /* ─── getMaintenanceSummary ────────────────────────────────────────────── */
  describe('getMaintenanceSummary', () => {
    test('returns stats from maintenanceService', async () => {
      mockGetMaintenanceStatistics.mockResolvedValue({
        data: { totalRecords: 10, totalCost: 5000 },
      });
      const r = await svc.getMaintenanceSummary();
      expect(r.monthlyRecords).toBe(10);
      expect(r.monthlyCost).toBe(5000);
    });

    test('returns zeros on error', async () => {
      mockGetMaintenanceStatistics.mockRejectedValue(new Error('db'));
      const r = await svc.getMaintenanceSummary();
      expect(r.monthlyRecords).toBe(0);
      expect(r.monthlyCost).toBe(0);
    });
  });

  /* ─── getViolationsSummary ─────────────────────────────────────────────── */
  describe('getViolationsSummary', () => {
    test('returns stats from violationsService', async () => {
      mockGetViolationStatistics.mockResolvedValue({
        data: { total: 5, pending: 2, unpaidFines: 800, totalPoints: 10 },
      });
      const r = await svc.getViolationsSummary();
      expect(r.total).toBe(5);
      expect(r.pending).toBe(2);
    });

    test('returns zeros on error', async () => {
      mockGetViolationStatistics.mockRejectedValue(new Error('fail'));
      const r = await svc.getViolationsSummary();
      expect(r.total).toBe(0);
    });
  });

  /* ─── getVehicleDashboard ──────────────────────────────────────────────── */
  describe('getVehicleDashboard', () => {
    test('returns vehicle dashboard with all sections', async () => {
      mockGetMaintenanceHistory.mockResolvedValue({ data: [] });
      mockGetFuelHistory.mockResolvedValue({ data: [] });
      mockGetViolations.mockResolvedValue({ data: [] });
      mockGetMaintenanceRecommendations.mockResolvedValue({ data: { overdue: 0 } });
      mockGetViolationAlerts.mockResolvedValue({ data: { alerts: [] } });
      mockGetFuelAlerts.mockResolvedValue({ data: { alerts: [] } });

      const r = await svc.getVehicleDashboard('v1');
      expect(r.success).toBe(true);
      expect(r.data.vehicleId).toBe('v1');
      expect(r.data.maintenance).toBeDefined();
      expect(r.data.fuel).toBeDefined();
      expect(r.data.violations).toBeDefined();
    });

    test('returns success:false on error', async () => {
      mockGetMaintenanceHistory.mockRejectedValue(new Error('fail'));
      const r = await svc.getVehicleDashboard('v1');
      expect(r.success).toBe(false);
    });
  });

  /* ─── getDriverDashboard ───────────────────────────────────────────────── */
  describe('getDriverDashboard', () => {
    test('returns driver dashboard with performance', async () => {
      mockGetViolations.mockResolvedValue({ data: { total: 2 } });
      mockGetDriverViolationPoints.mockResolvedValue({ data: 6 });
      mockGetViolationAlerts.mockResolvedValue({ data: { alerts: [] } });

      const r = await svc.getDriverDashboard('d1');
      expect(r.success).toBe(true);
      expect(r.data.driverId).toBe('d1');
      expect(r.data.performance).toBeDefined();
      expect(r.data.performance.score).toBeDefined();
      expect(r.data.performance.rating).toBeDefined();
    });

    test('returns success:false on error', async () => {
      mockGetViolations.mockRejectedValue(new Error('fail'));
      const r = await svc.getDriverDashboard('d1');
      expect(r.success).toBe(false);
    });
  });

  /* ─── calculateDriverPerformance ───────────────────────────────────────── */
  describe('calculateDriverPerformance', () => {
    test('returns ممتاز for no violations', () => {
      const r = svc.calculateDriverPerformance({ total: 10 }, {});
      expect(r.rating).toBe('ممتاز');
      expect(parseFloat(r.score)).toBeGreaterThanOrEqual(90);
    });

    test('returns ضعيف for many violations', () => {
      const r = svc.calculateDriverPerformance(null, { total: 15 });
      expect(r.rating).toBe('ضعيف');
      expect(parseFloat(r.score)).toBeLessThan(50);
    });

    test('caps score between 0 and 100', () => {
      const high = svc.calculateDriverPerformance({ total: 500 }, {});
      expect(parseFloat(high.score)).toBeLessThanOrEqual(100);
      const low = svc.calculateDriverPerformance(null, { total: 30 });
      expect(parseFloat(low.score)).toBeGreaterThanOrEqual(0);
    });
  });

  /* ─── getPerformanceDescription ────────────────────────────────────────── */
  describe('getPerformanceDescription', () => {
    test('returns correct description per range', () => {
      expect(svc.getPerformanceDescription(95)).toContain('متميز');
      expect(svc.getPerformanceDescription(80)).toContain('جيد');
      expect(svc.getPerformanceDescription(65)).toContain('مقبول');
      expect(svc.getPerformanceDescription(40)).toContain('ضعيف');
    });
  });

  /* ─── getVehicleAlerts ─────────────────────────────────────────────────── */
  describe('getVehicleAlerts', () => {
    test('returns overdue maintenance alert', async () => {
      mockGetMaintenanceRecommendations.mockResolvedValue({ data: { overdue: 2 } });
      mockGetViolationAlerts.mockResolvedValue({ data: { alerts: [] } });
      mockGetFuelAlerts.mockResolvedValue({ data: { alerts: [] } });

      const alerts = await svc.getVehicleAlerts('v1');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('maintenance_overdue');
      expect(alerts[0].severity).toBe('critical');
    });

    test('returns empty array when all clear', async () => {
      mockGetMaintenanceRecommendations.mockResolvedValue({ data: { overdue: 0 } });
      mockGetViolationAlerts.mockResolvedValue({ data: { alerts: [] } });
      mockGetFuelAlerts.mockResolvedValue({ data: { alerts: [] } });

      const alerts = await svc.getVehicleAlerts('v1');
      expect(alerts).toHaveLength(0);
    });

    test('returns empty on errors (graceful)', async () => {
      mockGetMaintenanceRecommendations.mockRejectedValue(new Error('fail'));
      const alerts = await svc.getVehicleAlerts('v1');
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  /* ─── getAdvancedStatistics ────────────────────────────────────────────── */
  describe('getAdvancedStatistics', () => {
    test('returns success with period data', async () => {
      mockGetMaintenanceStatistics.mockResolvedValue({ data: {} });
      mockGetFuelHistory.mockResolvedValue({ data: { summary: {} } });
      mockGetViolationStatistics.mockResolvedValue({ data: {} });

      const r = await svc.getAdvancedStatistics('month');
      expect(r.success).toBe(true);
      expect(r.data.period).toBe('month');
      expect(r.data.trends).toBeDefined();
    });

    test('returns success:false on error', async () => {
      mockGetMaintenanceStatistics.mockRejectedValue(new Error('fail'));
      const r = await svc.getAdvancedStatistics();
      expect(r.success).toBe(false);
    });
  });

  /* ─── getStartDate ─────────────────────────────────────────────────────── */
  describe('getStartDate', () => {
    test('week returns date ~7 days ago', () => {
      const d = new Date(svc.getStartDate('week'));
      const diff = (Date.now() - d.getTime()) / 86400000;
      expect(diff).toBeCloseTo(7, 0);
    });

    test('month returns date ~30 days ago', () => {
      const d = new Date(svc.getStartDate('month'));
      expect(d.getTime()).toBeLessThan(Date.now());
    });

    test('quarter returns date ~90 days ago', () => {
      const d = new Date(svc.getStartDate('quarter'));
      expect(d.getTime()).toBeLessThan(Date.now());
    });

    test('year returns date ~365 days ago', () => {
      const d = new Date(svc.getStartDate('year'));
      const diff = (Date.now() - d.getTime()) / 86400000;
      expect(diff).toBeCloseTo(365, 1);
    });

    test('default falls back to month', () => {
      const d1 = new Date(svc.getStartDate('unknown'));
      const d2 = new Date(svc.getStartDate('month'));
      expect(Math.abs(d1 - d2)).toBeLessThan(1000);
    });
  });

  /* ─── calculateTrends ──────────────────────────────────────────────────── */
  describe('calculateTrends', () => {
    test('returns stable/improving defaults', () => {
      const r = svc.calculateTrends({}, {}, {});
      expect(r.overall).toBe('improving');
      expect(r.maintenanceCost).toBe('stable');
    });
  });
});
