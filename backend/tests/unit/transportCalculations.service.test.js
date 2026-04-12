/**
 * Unit tests for transportCalculations.service.js — Transport & Fleet Management
 * Pure business logic — NO DB, NO side effects, NO mocks needed.
 */
const {
  TRANSPORT_CONSTANTS,
  calculateHaversineDistance,
  nearestNeighborSort,
  twoOptOptimize,
  calculateRouteTotalDistance,
  optimizeRoute,
  calculateEstimatedTimes,
  estimateRouteDuration,
  sortWaypointsByDirection,
  checkVehicleEligibility,
  calculateVehicleOccupancy,
  calculateNextMaintenanceDue,
  checkVehicleCapacityForPassengers,
  getPreTripChecklist,
  validatePreTripInspection,
  calculateTripDelay,
  calculateActualTripDuration,
  calculateTripStatistics,
  validateGpsCoordinates,
  checkSpeedLimit,
  calculateGpsDistance,
  detectGpsStops,
  calculateFleetStatistics,
  calculateTripStatisticsPeriod,
  buildPickupNotificationMessage,
  buildDropoffNotificationMessage,
  buildDelayNotificationMessage,
  calculateFuelConsumption,
} = require('../../services/transport/transportCalculations.service');

describe('transportCalculations.service', () => {
  /* ── TRANSPORT_CONSTANTS ───────────────────────────────────────── */
  describe('TRANSPORT_CONSTANTS', () => {
    test('exports vehicle status enum', () => {
      expect(TRANSPORT_CONSTANTS.VEHICLE_STATUS.ACTIVE).toBeDefined();
      expect(TRANSPORT_CONSTANTS.VEHICLE_STATUS.MAINTENANCE).toBeDefined();
    });
    test('exports trip status enum', () => {
      expect(TRANSPORT_CONSTANTS.TRIP_STATUS.COMPLETED).toBeDefined();
      expect(TRANSPORT_CONSTANTS.TRIP_STATUS.CANCELLED).toBeDefined();
    });
    test('exports speed limits', () => {
      expect(TRANSPORT_CONSTANTS.SPEED_LIMITS.CITY_MAX).toBeGreaterThan(0);
    });
    test('exports maintenance intervals', () => {
      expect(TRANSPORT_CONSTANTS.MAINTENANCE_INTERVALS.OIL_CHANGE).toBeGreaterThan(0);
    });
  });

  /* ── calculateHaversineDistance ─────────────────────────────────── */
  describe('calculateHaversineDistance', () => {
    test('returns 0 for same point', () => {
      expect(calculateHaversineDistance(24.7, 46.7, 24.7, 46.7)).toBe(0);
    });
    test('returns correct ~Riyadh-Jeddah distance', () => {
      const d = calculateHaversineDistance(24.7136, 46.6753, 21.4858, 39.1925);
      expect(d).toBeGreaterThan(800);
      expect(d).toBeLessThan(1000);
    });
    test('returns positive for any two distinct points', () => {
      expect(calculateHaversineDistance(0, 0, 1, 1)).toBeGreaterThan(0);
    });
  });

  /* ── nearestNeighborSort ───────────────────────────────────────── */
  describe('nearestNeighborSort', () => {
    test('sorts by nearest neighbor from start', () => {
      const start = { lat: 24.7, lng: 46.7 };
      const points = [
        { lat: 25.0, lng: 47.0 },
        { lat: 24.71, lng: 46.71 },
        { lat: 24.9, lng: 46.8 },
      ];
      const sorted = nearestNeighborSort(start, points);
      expect(sorted).toHaveLength(3);
      // Closest to start should be first
      expect(sorted[0].lat).toBe(24.71);
    });
    test('returns empty for empty waypoints', () => {
      expect(nearestNeighborSort({ lat: 0, lng: 0 }, [])).toEqual([]);
    });
  });

  /* ── calculateRouteTotalDistance ────────────────────────────────── */
  describe('calculateRouteTotalDistance', () => {
    test('returns round-trip distance', () => {
      const start = { lat: 24.7, lng: 46.7 };
      const wps = [
        { lat: 24.8, lng: 46.8 },
        { lat: 24.9, lng: 46.9 },
      ];
      const d = calculateRouteTotalDistance(start, wps);
      expect(d).toBeGreaterThan(0);
    });
    test('returns 0 for empty waypoints', () => {
      expect(calculateRouteTotalDistance({ lat: 0, lng: 0 }, [])).toBe(0);
    });
    test('returns 0 for null start', () => {
      expect(calculateRouteTotalDistance(null, [{ lat: 0, lng: 0 }])).toBe(0);
    });
  });

  /* ── optimizeRoute ─────────────────────────────────────────────── */
  describe('optimizeRoute', () => {
    test('returns optimized route with times', () => {
      const start = { lat: 24.7, lng: 46.7 };
      const wps = [
        { lat: 24.75, lng: 46.75, beneficiaryId: 'b1' },
        { lat: 24.8, lng: 46.8, beneficiaryId: 'b2' },
      ];
      const result = optimizeRoute(start, wps, '07:00');
      expect(result.isValid).toBe(true);
      expect(result.waypoints).toHaveLength(2);
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.estimatedDuration).toBeGreaterThan(0);
      expect(result.stopCount).toBe(2);
    });
    test('returns invalid for empty waypoints', () => {
      const result = optimizeRoute({ lat: 0, lng: 0 }, []);
      expect(result.isValid).toBe(false);
    });
    test('each waypoint has estimatedTime and order', () => {
      const result = optimizeRoute({ lat: 24.7, lng: 46.7 }, [{ lat: 24.8, lng: 46.8 }], '08:00');
      expect(result.waypoints[0].estimatedTime).toMatch(/^\d{2}:\d{2}$/);
      expect(result.waypoints[0].order).toBe(1);
    });
  });

  /* ── estimateRouteDuration ─────────────────────────────────────── */
  describe('estimateRouteDuration', () => {
    test('includes stop time', () => {
      const d1 = estimateRouteDuration(10, 0);
      const d2 = estimateRouteDuration(10, 5);
      expect(d2).toBeGreaterThan(d1);
    });
    test('returns 0 for 0 distance and 0 stops', () => {
      expect(estimateRouteDuration(0, 0)).toBe(0);
    });
  });

  /* ── sortWaypointsByDirection ───────────────────────────────────── */
  describe('sortWaypointsByDirection', () => {
    test('pickup: farthest first', () => {
      const center = { lat: 24.7, lng: 46.7 };
      const wps = [
        { lat: 24.71, lng: 46.71 },
        { lat: 25.0, lng: 47.0 },
      ];
      const sorted = sortWaypointsByDirection(center, wps, 'pickup');
      expect(sorted[0].distanceFromCenter).toBeGreaterThan(sorted[1].distanceFromCenter);
    });
    test('dropoff: nearest first', () => {
      const center = { lat: 24.7, lng: 46.7 };
      const wps = [
        { lat: 25.0, lng: 47.0 },
        { lat: 24.71, lng: 46.71 },
      ];
      const sorted = sortWaypointsByDirection(center, wps, 'dropoff');
      expect(sorted[0].distanceFromCenter).toBeLessThan(sorted[1].distanceFromCenter);
    });
    test('returns empty for null input', () => {
      expect(sortWaypointsByDirection(null, [])).toEqual([]);
    });
  });

  /* ── checkVehicleEligibility ───────────────────────────────────── */
  describe('checkVehicleEligibility', () => {
    test('eligible for active vehicle with valid dates', () => {
      const result = checkVehicleEligibility({
        id: 'v1',
        status: TRANSPORT_CONSTANTS.VEHICLE_STATUS.ACTIVE,
        registrationExpiry: '2030-12-31',
        insuranceExpiry: '2030-12-31',
        nextInspectionDate: '2030-12-31',
      });
      expect(result.isEligible).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
    test('ineligible for inactive status', () => {
      const result = checkVehicleEligibility({ status: 'retired' });
      expect(result.isEligible).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
    test('ineligible when registration expired', () => {
      const result = checkVehicleEligibility({
        status: TRANSPORT_CONSTANTS.VEHICLE_STATUS.ACTIVE,
        registrationExpiry: '2020-01-01',
      });
      expect(result.isEligible).toBe(false);
    });
    test('returns issues for null vehicle', () => {
      const result = checkVehicleEligibility(null);
      expect(result.isEligible).toBe(false);
    });
  });

  /* ── calculateVehicleOccupancy ─────────────────────────────────── */
  describe('calculateVehicleOccupancy', () => {
    test('calculates occupancy rate', () => {
      const result = calculateVehicleOccupancy(30, 15);
      expect(result.isValid).toBe(true);
      expect(result.occupancyRate).toBe(50);
      expect(result.availableSeats).toBe(15);
      expect(result.isFull).toBe(false);
    });
    test('detects full vehicle', () => {
      const result = calculateVehicleOccupancy(10, 10);
      expect(result.isFull).toBe(true);
    });
    test('detects over capacity', () => {
      const result = calculateVehicleOccupancy(10, 12);
      expect(result.isOverCapacity).toBe(true);
    });
    test('invalid for 0 capacity', () => {
      expect(calculateVehicleOccupancy(0, 5).isValid).toBe(false);
    });
  });

  /* ── calculateNextMaintenanceDue ───────────────────────────────── */
  describe('calculateNextMaintenanceDue', () => {
    test('calculates next oil change', () => {
      const result = calculateNextMaintenanceDue(8000, 'oil_change');
      expect(result.isValid).toBe(true);
      expect(result.nextServiceMileage).toBeGreaterThan(8000);
      expect(result.remainingKm).toBeGreaterThan(0);
    });
    test('warns near maintenance', () => {
      // Close to interval boundary
      const interval = TRANSPORT_CONSTANTS.MAINTENANCE_INTERVALS.OIL_CHANGE;
      const result = calculateNextMaintenanceDue(interval - 10, 'oil_change');
      expect(result.isWarning).toBe(true);
    });
    test('invalid for negative mileage', () => {
      expect(calculateNextMaintenanceDue(-1).isValid).toBe(false);
    });
  });

  /* ── checkVehicleCapacityForPassengers ──────────────────────────── */
  describe('checkVehicleCapacityForPassengers', () => {
    test('valid when within capacity', () => {
      const vehicle = { capacity: 10, wheelchairAccessible: true, wheelchairSlots: 2 };
      const passengers = [{ requiresWheelchair: false }, { requiresWheelchair: true }];
      const result = checkVehicleCapacityForPassengers(vehicle, passengers);
      expect(result.isValid).toBe(true);
      expect(result.wheelchairPassengers).toBe(1);
    });
    test('invalid when over capacity', () => {
      const vehicle = { capacity: 2, wheelchairAccessible: true, wheelchairSlots: 1 };
      const passengers = [
        { requiresWheelchair: false },
        { requiresWheelchair: false },
        { requiresWheelchair: false },
      ];
      const result = checkVehicleCapacityForPassengers(vehicle, passengers);
      expect(result.isValid).toBe(false);
    });
    test('invalid when wheelchair not supported', () => {
      const vehicle = { capacity: 10, wheelchairAccessible: false, wheelchairSlots: 0 };
      const passengers = [{ requiresWheelchair: true }];
      const result = checkVehicleCapacityForPassengers(vehicle, passengers);
      expect(result.isValid).toBe(false);
    });
  });

  /* ── getPreTripChecklist ───────────────────────────────────────── */
  describe('getPreTripChecklist', () => {
    test('returns non-empty checklist object', () => {
      const checklist = getPreTripChecklist();
      expect(typeof checklist).toBe('object');
      const categories = Object.keys(checklist);
      expect(categories.length).toBeGreaterThan(0);
    });
  });

  /* ── validatePreTripInspection ─────────────────────────────────── */
  describe('validatePreTripInspection', () => {
    test('passes when all required items checked', () => {
      const checklist = getPreTripChecklist();
      const data = {};
      for (const items of Object.values(checklist)) {
        for (const item of items) {
          if (item.required) data[item.key] = true;
        }
      }
      const result = validatePreTripInspection(data);
      expect(result.passed).toBe(true);
      expect(result.completionRate).toBe(100);
    });
    test('fails when data is null', () => {
      const result = validatePreTripInspection(null);
      expect(result.passed).toBe(false);
    });
    test('fails when required items fail', () => {
      const checklist = getPreTripChecklist();
      const keys = [];
      for (const items of Object.values(checklist)) {
        for (const item of items) {
          if (item.required) keys.push(item.key);
        }
      }
      if (keys.length > 0) {
        const data = { [keys[0]]: false };
        const result = validatePreTripInspection(data);
        expect(result.passed).toBe(false);
      }
    });
  });

  /* ── calculateTripDelay ────────────────────────────────────────── */
  describe('calculateTripDelay', () => {
    test('detects delay', () => {
      const result = calculateTripDelay('08:00', '08:30');
      expect(result.isDelayed).toBe(true);
      expect(result.delayMinutes).toBe(30);
    });
    test('detects early arrival', () => {
      const result = calculateTripDelay('08:30', '08:00');
      expect(result.isEarly).toBe(true);
      expect(result.earlyMinutes).toBe(30);
    });
    test('on time = not delayed', () => {
      const result = calculateTripDelay('08:00', '08:00');
      expect(result.isDelayed).toBe(false);
      expect(result.isEarly).toBe(false);
    });
    test('handles null input', () => {
      const result = calculateTripDelay(null, null);
      expect(result.isDelayed).toBe(false);
    });
  });

  /* ── calculateActualTripDuration ───────────────────────────────── */
  describe('calculateActualTripDuration', () => {
    test('calculates duration', () => {
      const result = calculateActualTripDuration('07:00', '08:30');
      expect(result.isValid).toBe(true);
      expect(result.durationMinutes).toBe(90);
      expect(result.durationHours).toBe(1.5);
    });
    test('handles midnight crossover', () => {
      const result = calculateActualTripDuration('23:00', '01:00');
      expect(result.durationMinutes).toBe(120);
    });
    test('invalid for null input', () => {
      expect(calculateActualTripDuration(null, null).isValid).toBe(false);
    });
  });

  /* ── calculateTripStatistics ───────────────────────────────────── */
  describe('calculateTripStatistics', () => {
    test('calculates stats with passengers', () => {
      const trip = { actualStartTime: '07:00', actualEndTime: '08:00' };
      const passengers = [
        { pickupStatus: 'picked_up', dropoffStatus: 'dropped_off' },
        { pickupStatus: 'absent', dropoffStatus: null },
      ];
      const result = calculateTripStatistics(trip, passengers);
      expect(result.isValid).toBe(true);
      expect(result.totalPassengers).toBe(2);
      expect(result.pickedUp).toBe(1);
      expect(result.absent).toBe(1);
      expect(result.attendanceRate).toBe(50);
    });
    test('invalid for null trip', () => {
      expect(calculateTripStatistics(null, []).isValid).toBe(false);
    });
  });

  /* ── validateGpsCoordinates ────────────────────────────────────── */
  describe('validateGpsCoordinates', () => {
    test('valid coordinates', () => {
      expect(validateGpsCoordinates(24.7, 46.7)).toBe(true);
    });
    test('invalid latitude', () => {
      expect(validateGpsCoordinates(91, 0)).toBe(false);
    });
    test('invalid longitude', () => {
      expect(validateGpsCoordinates(0, 181)).toBe(false);
    });
    test('null coordinates', () => {
      expect(validateGpsCoordinates(null, null)).toBe(false);
    });
    test('NaN', () => {
      expect(validateGpsCoordinates(NaN, 0)).toBe(false);
    });
  });

  /* ── checkSpeedLimit ───────────────────────────────────────────── */
  describe('checkSpeedLimit', () => {
    test('ok speed in city', () => {
      const result = checkSpeedLimit(40, 'city');
      expect(result.isExceeded).toBe(false);
      expect(result.severity).toBe('ok');
    });
    test('critical excess', () => {
      const result = checkSpeedLimit(150, 'city');
      expect(result.isExceeded).toBe(true);
      expect(result.severity).toBe('critical');
    });
    test('school zone', () => {
      const result = checkSpeedLimit(50, 'school_zone');
      expect(result.isExceeded).toBe(true);
    });
    test('invalid speed', () => {
      expect(checkSpeedLimit(-1).isValid).toBe(false);
    });
  });

  /* ── calculateGpsDistance ───────────────────────────────────────── */
  describe('calculateGpsDistance', () => {
    test('calculates total distance from GPS points', () => {
      const points = [
        { lat: 24.7, lng: 46.7 },
        { lat: 24.8, lng: 46.8 },
        { lat: 24.9, lng: 46.9 },
      ];
      const result = calculateGpsDistance(points);
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.pointCount).toBe(3);
    });
    test('returns 0 for < 2 points', () => {
      expect(calculateGpsDistance([{ lat: 0, lng: 0 }]).totalDistance).toBe(0);
    });
  });

  /* ── detectGpsStops ────────────────────────────────────────────── */
  describe('detectGpsStops', () => {
    test('detects stopped vehicles', () => {
      const points = [
        { lat: 24.7, lng: 46.7, recordedAt: '2024-01-01T07:00:00Z' },
        { lat: 24.7, lng: 46.7, recordedAt: '2024-01-01T07:05:00Z' },
        { lat: 24.7, lng: 46.7, recordedAt: '2024-01-01T07:10:00Z' },
        { lat: 25.0, lng: 47.0, recordedAt: '2024-01-01T07:30:00Z' },
      ];
      const stops = detectGpsStops(points, 2);
      expect(stops.length).toBeGreaterThan(0);
      expect(stops[0].durationMinutes).toBeGreaterThanOrEqual(2);
    });
    test('returns empty for < 2 points', () => {
      expect(detectGpsStops([{ lat: 0, lng: 0 }])).toEqual([]);
    });
  });

  /* ── calculateFleetStatistics ──────────────────────────────────── */
  describe('calculateFleetStatistics', () => {
    test('calculates fleet stats', () => {
      const vehicles = [
        {
          status: TRANSPORT_CONSTANTS.VEHICLE_STATUS.ACTIVE,
          capacity: 15,
          wheelchairAccessible: true,
        },
        {
          status: TRANSPORT_CONSTANTS.VEHICLE_STATUS.ACTIVE,
          capacity: 20,
          wheelchairAccessible: false,
        },
        {
          status: TRANSPORT_CONSTANTS.VEHICLE_STATUS.MAINTENANCE,
          capacity: 10,
          wheelchairAccessible: false,
        },
      ];
      const result = calculateFleetStatistics(vehicles);
      expect(result.total).toBe(3);
      expect(result.active).toBe(2);
      expect(result.maintenance).toBe(1);
      expect(result.totalCapacity).toBe(35);
      expect(result.wheelchairCapable).toBe(1);
      expect(result.utilizationRate).toBeGreaterThan(0);
    });
    test('returns zeros for empty array', () => {
      const result = calculateFleetStatistics([]);
      expect(result.total).toBe(0);
      expect(result.utilizationRate).toBe(0);
    });
  });

  /* ── calculateTripStatisticsPeriod ─────────────────────────────── */
  describe('calculateTripStatisticsPeriod', () => {
    test('filters and calculates period stats', () => {
      const trips = [
        {
          status: TRANSPORT_CONSTANTS.TRIP_STATUS.COMPLETED,
          tripDate: '2024-01-15',
          actualDistanceKm: 30,
          actualPassengers: 10,
        },
        {
          status: TRANSPORT_CONSTANTS.TRIP_STATUS.CANCELLED,
          tripDate: '2024-01-20',
          actualDistanceKm: 0,
          actualPassengers: 0,
        },
        {
          status: TRANSPORT_CONSTANTS.TRIP_STATUS.COMPLETED,
          tripDate: '2024-02-15',
          actualDistanceKm: 40,
          actualPassengers: 12,
        },
      ];
      const result = calculateTripStatisticsPeriod(trips, {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      });
      expect(result.total).toBe(2);
      expect(result.completed).toBe(1);
      expect(result.cancelled).toBe(1);
    });
    test('returns 0 for null input', () => {
      expect(calculateTripStatisticsPeriod(null).total).toBe(0);
    });
  });

  /* ── Notification builders ─────────────────────────────────────── */
  describe('Notification builders', () => {
    test('pickup notification', () => {
      const msg = buildPickupNotificationMessage('أحمد', 'ABC-123', 'خالد', '08:30');
      expect(msg.type).toBe('pickup');
      expect(msg.bodyAr).toContain('أحمد');
      expect(msg.bodyAr).toContain('ABC-123');
      expect(msg.data.driverName).toBe('خالد');
    });
    test('dropoff notification', () => {
      const msg = buildDropoffNotificationMessage('سارة', '14:00');
      expect(msg.type).toBe('dropoff');
      expect(msg.bodyAr).toContain('سارة');
    });
    test('delay notification with reason', () => {
      const msg = buildDelayNotificationMessage('أحمد', 15, 'ازدحام');
      expect(msg.type).toBe('delay');
      expect(msg.bodyAr).toContain('15');
      expect(msg.bodyAr).toContain('ازدحام');
    });
    test('delay notification without reason', () => {
      const msg = buildDelayNotificationMessage('أحمد', 10);
      expect(msg.bodyAr).not.toContain('السبب');
    });
  });

  /* ── calculateFuelConsumption ───────────────────────────────────── */
  describe('calculateFuelConsumption', () => {
    test('calculates fuel usage', () => {
      const result = calculateFuelConsumption(100);
      expect(result.isValid).toBe(true);
      expect(result.fuelLiters).toBeGreaterThan(0);
      expect(result.fuelCost).toBeGreaterThan(0);
      expect(result.costPerKm).toBeGreaterThan(0);
    });
    test('invalid for negative distance', () => {
      expect(calculateFuelConsumption(-10).isValid).toBe(false);
    });
    test('custom rates', () => {
      const result = calculateFuelConsumption(200, 15, 2.0);
      expect(result.fuelConsumptionPer100Km).toBe(15);
      expect(result.fuelPricePerLiter).toBe(2.0);
      expect(result.fuelLiters).toBe(30);
    });
  });
});
