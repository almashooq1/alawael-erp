/**
 * Unit Tests — routeOptimization.service.js
 * Pure functions: Haversine, 2-opt, route optimization, fleet stats, etc.
 */

const svc = require('../../services/transport/routeOptimization.service');

// ─── Riyadh area GPS coords for realistic tests ───
const RIYADH = { lat: 24.7136, lng: 46.6753 };
const JEDDAH = { lat: 21.4858, lng: 39.1925 };
const DAMMAM = { lat: 26.3927, lng: 49.9777 };

const STOP_A = { lat: 24.72, lng: 46.68, name: 'A' };
const STOP_B = { lat: 24.73, lng: 46.69, name: 'B' };
const STOP_C = { lat: 24.74, lng: 46.7, name: 'C' };
const STOP_D = { lat: 24.75, lng: 46.71, name: 'D' };
const STOP_E = { lat: 24.76, lng: 46.72, name: 'E' };

describe('routeOptimization.service', () => {
  // ═══════════════════════════════════════════
  //  Constants
  // ═══════════════════════════════════════════
  describe('Constants', () => {
    it('exports EARTH_RADIUS_KM = 6371', () => {
      expect(svc.EARTH_RADIUS_KM).toBe(6371);
    });
    it('exports DEFAULT_CITY_SPEED_KMH = 30', () => {
      expect(svc.DEFAULT_CITY_SPEED_KMH).toBe(30);
    });
    it('exports DEFAULT_STOP_DURATION_MINUTES = 3', () => {
      expect(svc.DEFAULT_STOP_DURATION_MINUTES).toBe(3);
    });
    it('exports VEHICLE_TYPES with 4 types', () => {
      expect(Object.keys(svc.VEHICLE_TYPES)).toHaveLength(4);
      expect(svc.VEHICLE_TYPES.BUS).toBe('bus');
      expect(svc.VEHICLE_TYPES.WHEELCHAIR_VAN).toBe('wheelchair_van');
    });
    it('exports TRIP_STATUS with 4 states', () => {
      expect(Object.keys(svc.TRIP_STATUS)).toHaveLength(4);
      expect(svc.TRIP_STATUS.COMPLETED).toBe('completed');
    });
    it('exports MAX_TRIP_DISTANCE_KM and MAX_STOPS_PER_ROUTE', () => {
      expect(svc.MAX_TRIP_DISTANCE_KM).toBe(200);
      expect(svc.MAX_STOPS_PER_ROUTE).toBe(30);
    });
    it('exports aliases AVG_CITY_SPEED_KMH and STOP_DURATION_MINUTES', () => {
      expect(svc.AVG_CITY_SPEED_KMH).toBe(svc.DEFAULT_CITY_SPEED_KMH);
      expect(svc.STOP_DURATION_MINUTES).toBe(svc.DEFAULT_STOP_DURATION_MINUTES);
    });
  });

  // ═══════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════
  describe('validateCoordinates', () => {
    it('accepts valid coordinates', () => {
      expect(() => svc.validateCoordinates(24.7, 46.7)).not.toThrow();
    });
    it('rejects non-number lat', () => {
      expect(() => svc.validateCoordinates('a', 46)).toThrow();
    });
    it('rejects NaN', () => {
      expect(() => svc.validateCoordinates(NaN, 46)).toThrow();
    });
    it('rejects lat out of range', () => {
      expect(() => svc.validateCoordinates(91, 46)).toThrow();
    });
    it('rejects lng out of range', () => {
      expect(() => svc.validateCoordinates(24, 181)).toThrow();
    });
  });

  describe('degreesToRadians', () => {
    it('converts 180° to π', () => {
      expect(svc.degreesToRadians(180)).toBeCloseTo(Math.PI, 10);
    });
    it('converts 0° to 0', () => {
      expect(svc.degreesToRadians(0)).toBe(0);
    });
  });

  describe('roundDistance', () => {
    it('rounds to 2 decimals', () => {
      expect(svc.roundDistance(1.23456)).toBe(1.23);
    });
  });

  describe('roundMinutes', () => {
    it('rounds to integer', () => {
      expect(svc.roundMinutes(5.7)).toBe(6);
    });
  });

  // ═══════════════════════════════════════════
  //  Haversine
  // ═══════════════════════════════════════════
  describe('haversineDistance', () => {
    it('returns 0 for same point', () => {
      expect(svc.haversineDistance(24.7, 46.7, 24.7, 46.7)).toBe(0);
    });
    it('calculates Riyadh-Jeddah ≈ 850 km', () => {
      const d = svc.haversineDistance(RIYADH.lat, RIYADH.lng, JEDDAH.lat, JEDDAH.lng);
      expect(d).toBeGreaterThan(800);
      expect(d).toBeLessThan(900);
    });
    it('throws for invalid coordinates', () => {
      expect(() => svc.haversineDistance(100, 0, 0, 0)).toThrow();
    });
  });

  describe('haversineDistanceMeters', () => {
    it('returns distance in meters (× 1000)', () => {
      const km = svc.haversineDistance(RIYADH.lat, RIYADH.lng, JEDDAH.lat, JEDDAH.lng);
      const m = svc.haversineDistanceMeters(RIYADH.lat, RIYADH.lng, JEDDAH.lat, JEDDAH.lng);
      expect(m).toBeCloseTo(km * 1000, 1);
    });
  });

  describe('calculateTotalDistance', () => {
    it('returns 0 for less than 2 points', () => {
      expect(svc.calculateTotalDistance([])).toBe(0);
      expect(svc.calculateTotalDistance([RIYADH])).toBe(0);
    });
    it('sums sequential distances', () => {
      const d = svc.calculateTotalDistance([RIYADH, JEDDAH, DAMMAM]);
      expect(d).toBeGreaterThan(0);
    });
    it('returns 0 for non-array', () => {
      expect(svc.calculateTotalDistance(null)).toBe(0);
    });
  });

  // ═══════════════════════════════════════════
  //  Nearest Neighbor
  // ═══════════════════════════════════════════
  describe('nearestNeighborSort', () => {
    it('returns empty for empty input', () => {
      expect(svc.nearestNeighborSort(RIYADH, [])).toEqual([]);
    });
    it('returns single point for single input', () => {
      const result = svc.nearestNeighborSort(RIYADH, [STOP_A]);
      expect(result).toHaveLength(1);
    });
    it('sorts 3 points by nearest first', () => {
      const sorted = svc.nearestNeighborSort(RIYADH, [STOP_C, STOP_A, STOP_B]);
      expect(sorted).toHaveLength(3);
      // A is closest to RIYADH
      expect(sorted[0].name).toBe('A');
    });
    it('throws for invalid start point', () => {
      expect(() => svc.nearestNeighborSort(null, [STOP_A])).toThrow();
    });
  });

  // ═══════════════════════════════════════════
  //  2-opt
  // ═══════════════════════════════════════════
  describe('twoOptSwap', () => {
    it('reverses segment between indices', () => {
      const route = [1, 2, 3, 4, 5];
      const result = svc.twoOptSwap(route, 1, 3);
      expect(result).toEqual([1, 2, 4, 3, 5]);
    });
  });

  describe('twoOptImprove', () => {
    it('returns unchanged for < 4 points', () => {
      const r = svc.twoOptImprove([STOP_A, STOP_B]);
      expect(r.improved).toBe(false);
      expect(r.iterations).toBe(0);
    });
    it('returns route with improved flag for >= 4 points', () => {
      const points = [STOP_A, STOP_B, STOP_C, STOP_D, STOP_E];
      const r = svc.twoOptImprove(points);
      expect(r).toHaveProperty('route');
      expect(r).toHaveProperty('improved');
      expect(r).toHaveProperty('iterations');
      expect(r.route.length).toBe(5);
    });
  });

  // ═══════════════════════════════════════════
  //  Time Helpers
  // ═══════════════════════════════════════════
  describe('timeToMinutes', () => {
    it('converts "08:30" to 510', () => {
      expect(svc.timeToMinutes('08:30')).toBe(510);
    });
    it('converts "0:00" to 0', () => {
      expect(svc.timeToMinutes('0:00')).toBe(0);
    });
    it('throws for invalid format', () => {
      expect(() => svc.timeToMinutes('abc')).toThrow();
    });
    it('throws for null', () => {
      expect(() => svc.timeToMinutes(null)).toThrow();
    });
    it('throws for out-of-range hours', () => {
      expect(() => svc.timeToMinutes('25:00')).toThrow();
    });
  });

  describe('minutesToTime', () => {
    it('converts 510 to "08:30"', () => {
      expect(svc.minutesToTime(510)).toBe('08:30');
    });
    it('handles midnight wrap', () => {
      expect(svc.minutesToTime(1440)).toBe('00:00');
    });
    it('handles negative minutes', () => {
      // -60 → 1380 → 23:00
      expect(svc.minutesToTime(-60)).toBe('23:00');
    });
  });

  // ═══════════════════════════════════════════
  //  calculateEstimatedTimes
  // ═══════════════════════════════════════════
  describe('calculateEstimatedTimes', () => {
    it('returns empty for empty waypoints', () => {
      expect(svc.calculateEstimatedTimes([], '08:00')).toEqual([]);
    });
    it('calculates times for multiple waypoints', () => {
      const result = svc.calculateEstimatedTimes([STOP_A, STOP_B, STOP_C], '07:00');
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('estimatedTime');
      expect(result[0]).toHaveProperty('order', 1);
      expect(result[0]).toHaveProperty('distanceFromPrev');
    });
    it('first stop has 0 distance from prev', () => {
      const result = svc.calculateEstimatedTimes([STOP_A], '08:00');
      expect(result[0].distanceFromPrev).toBe(0);
    });
    it('respects custom speed option', () => {
      const fast = svc.calculateEstimatedTimes([STOP_A, STOP_B], '08:00', { speedKmh: 60 });
      const slow = svc.calculateEstimatedTimes([STOP_A, STOP_B], '08:00', { speedKmh: 15 });
      expect(fast[1].estimatedMinutes).toBeLessThan(slow[1].estimatedMinutes);
    });
    it('throws for zero speed', () => {
      expect(() => svc.calculateEstimatedTimes([STOP_A], '08:00', { speedKmh: 0 })).toThrow();
    });
  });

  // ═══════════════════════════════════════════
  //  estimateRouteDuration
  // ═══════════════════════════════════════════
  describe('estimateRouteDuration', () => {
    it('calculates travel + stop time', () => {
      // 30 km at 30 km/h = 60 min travel + 5 stops × 3 min = 15 min = 75 min
      const d = svc.estimateRouteDuration(30, 5);
      expect(d).toBe(75);
    });
    it('respects custom options', () => {
      const d = svc.estimateRouteDuration(60, 2, { speedKmh: 60, stopDurationMinutes: 5 });
      expect(d).toBe(70); // 60 min + 10 min
    });
  });

  // ═══════════════════════════════════════════
  //  optimizeRoute
  // ═══════════════════════════════════════════
  describe('optimizeRoute', () => {
    it('optimizes a 3-stop route', () => {
      const result = svc.optimizeRoute(RIYADH, [STOP_A, STOP_B, STOP_C], '07:00');
      expect(result).toHaveProperty('waypoints');
      expect(result).toHaveProperty('totalDistanceKm');
      expect(result).toHaveProperty('estimatedDurationMinutes');
      expect(result).toHaveProperty('stopsCount', 3);
      expect(result.waypoints).toHaveLength(3);
    });
    it('throws for invalid branch location', () => {
      expect(() => svc.optimizeRoute(null, [STOP_A], '07:00')).toThrow();
    });
    it('throws for empty waypoints', () => {
      expect(() => svc.optimizeRoute(RIYADH, [], '07:00')).toThrow();
    });
    it('throws for non-array waypoints', () => {
      expect(() => svc.optimizeRoute(RIYADH, 'abc', '07:00')).toThrow();
    });
    it('throws for too many stops', () => {
      const tooMany = Array.from({ length: 31 }, (_, i) => ({
        lat: 24.7 + i * 0.001,
        lng: 46.7 + i * 0.001,
      }));
      expect(() => svc.optimizeRoute(RIYADH, tooMany, '07:00')).toThrow();
    });
    it('throws for invalid waypoint coordinates', () => {
      expect(() => svc.optimizeRoute(RIYADH, [{ lat: 999, lng: 999 }], '07:00')).toThrow();
    });
    it('applies 2-opt when enough points', () => {
      const result = svc.optimizeRoute(RIYADH, [STOP_A, STOP_B, STOP_C, STOP_D, STOP_E], '07:00');
      expect(result).toHaveProperty('twoOptImproved');
      expect(result).toHaveProperty('twoOptIterations');
    });
    it('skips 2-opt when use2opt=false', () => {
      const result = svc.optimizeRoute(RIYADH, [STOP_A, STOP_B, STOP_C, STOP_D, STOP_E], '07:00', {
        use2opt: false,
      });
      expect(result.optimizationApplied).toBe(false);
    });
  });

  // ═══════════════════════════════════════════
  //  compareRoutes
  // ═══════════════════════════════════════════
  describe('compareRoutes', () => {
    it('calculates improvement percentage', () => {
      const r = svc.compareRoutes(100, 80);
      expect(r.savedKm).toBe(20);
      expect(r.improvementPercentage).toBe(20);
      expect(r.isImproved).toBe(true);
    });
    it('marks non-improved when optimized is larger', () => {
      const r = svc.compareRoutes(80, 100);
      expect(r.isImproved).toBe(false);
    });
    it('throws for zero distances', () => {
      expect(() => svc.compareRoutes(0, 50)).toThrow();
    });
  });

  // ═══════════════════════════════════════════
  //  calculateTripCost
  // ═══════════════════════════════════════════
  describe('calculateTripCost', () => {
    it('calculates fuel cost for 100 km', () => {
      const r = svc.calculateTripCost(100);
      expect(r.fuelCost).toBeGreaterThan(0);
      expect(r.distanceKm).toBe(100);
      expect(r).toHaveProperty('totalCost');
      expect(r).toHaveProperty('costPerKm');
    });
    it('includes driver cost when duration given', () => {
      const r = svc.calculateTripCost(100, { durationMinutes: 120 });
      expect(r.driverTripCost).toBeGreaterThan(0);
    });
    it('throws for negative distance', () => {
      expect(() => svc.calculateTripCost(-10)).toThrow();
    });
    it('returns 0 costPerKm for 0 distance', () => {
      const r = svc.calculateTripCost(0);
      expect(r.costPerKm).toBe(0);
    });
  });

  // ═══════════════════════════════════════════
  //  checkVehicleConflict
  // ═══════════════════════════════════════════
  describe('checkVehicleConflict', () => {
    it('returns true for overlapping trips', () => {
      const t1 = { date: '2025-01-01', startTime: '08:00', endTime: '10:00' };
      const t2 = { date: '2025-01-01', startTime: '09:00', endTime: '11:00' };
      expect(svc.checkVehicleConflict(t1, t2)).toBe(true);
    });
    it('returns false for different dates', () => {
      const t1 = { date: '2025-01-01', startTime: '08:00', endTime: '10:00' };
      const t2 = { date: '2025-01-02', startTime: '08:00', endTime: '10:00' };
      expect(svc.checkVehicleConflict(t1, t2)).toBe(false);
    });
    it('returns false for non-overlapping times', () => {
      const t1 = { date: '2025-01-01', startTime: '08:00', endTime: '10:00' };
      const t2 = { date: '2025-01-01', startTime: '10:00', endTime: '12:00' };
      expect(svc.checkVehicleConflict(t1, t2)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════
  //  checkVehicleCapacity (object style)
  // ═══════════════════════════════════════════
  describe('checkVehicleCapacity — object style', () => {
    it('accommodates when within capacity', () => {
      const vehicle = { capacity: 10, wheelchairSlots: 2 };
      const passengers = [{ name: 'A' }, { name: 'B', needsWheelchair: true }];
      const r = svc.checkVehicleCapacity(vehicle, passengers);
      expect(r.canAccommodate).toBe(true);
      expect(r.totalPassengers).toBe(2);
      expect(r.wheelchairCount).toBe(1);
      expect(r.availableSeats).toBe(8);
    });
    it('rejects over-capacity', () => {
      const vehicle = { capacity: 2, wheelchairSlots: 1 };
      const passengers = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
      const r = svc.checkVehicleCapacity(vehicle, passengers);
      expect(r.canAccommodate).toBe(false);
      expect(r.message).toBeTruthy();
    });
    it('rejects insufficient wheelchair slots', () => {
      const vehicle = { capacity: 10, wheelchairSlots: 0 };
      const passengers = [{ needsWheelchair: true }];
      const r = svc.checkVehicleCapacity(vehicle, passengers);
      expect(r.canAccommodate).toBe(false);
    });
  });

  // ═══════════════════════════════════════════
  //  checkVehicleCapacity (numeric style)
  // ═══════════════════════════════════════════
  describe('checkVehicleCapacity — numeric style', () => {
    it('returns isSuitable for capacity ok', () => {
      const r = svc.checkVehicleCapacity(10, 5);
      expect(r.isCapacityOk).toBe(true);
      expect(r.isSuitable).toBe(true);
      expect(r.availableSeats).toBe(5);
    });
    it('rejects over-capacity', () => {
      const r = svc.checkVehicleCapacity(2, 5);
      expect(r.isCapacityOk).toBe(false);
    });
    it('checks wheelchair with numeric params', () => {
      const r = svc.checkVehicleCapacity(10, 3, true, 0);
      expect(r.isWheelchairOk).toBe(false);
      expect(r.isSuitable).toBe(false);
    });
    it('throws for invalid capacity', () => {
      expect(() => svc.checkVehicleCapacity(null, 5)).toThrow();
    });
  });

  // ═══════════════════════════════════════════
  //  calculateFleetStats
  // ═══════════════════════════════════════════
  describe('calculateFleetStats', () => {
    it('returns zeros for empty trips', () => {
      const r = svc.calculateFleetStats([]);
      expect(r.totalTrips).toBe(0);
      expect(r.completionRate).toBe(0);
    });
    it('calculates stats from trips', () => {
      const trips = [
        { status: 'completed', actualDistanceKm: 50, actualPassengers: 8 },
        { status: 'completed', actualDistanceKm: 30, actualPassengers: 5 },
        { status: 'cancelled', estimatedDistanceKm: 20, expectedPassengers: 6 },
      ];
      const r = svc.calculateFleetStats(trips);
      expect(r.totalTrips).toBe(3);
      expect(r.completedTrips).toBe(2);
      expect(r.cancelledTrips).toBe(1);
      expect(r.totalDistanceKm).toBe(100);
      expect(r.totalPassengers).toBe(19);
    });
  });

  // ═══════════════════════════════════════════
  //  generateVehicleMonthlyReport
  // ═══════════════════════════════════════════
  describe('generateVehicleMonthlyReport', () => {
    it('generates report from trips', () => {
      const trips = [
        { status: 'completed', actualDistanceKm: 50, actualPassengers: 8, durationMinutes: 60 },
      ];
      const r = svc.generateVehicleMonthlyReport('V001', trips);
      expect(r.vehicleId).toBe('V001');
      expect(r.period.tripsCount).toBe(1);
      expect(r.distances.totalKm).toBeGreaterThan(0);
      expect(r.costs).toHaveProperty('fuelCost');
      expect(r.efficiency).toHaveProperty('completionRate');
    });
    it('throws for missing vehicleId', () => {
      expect(() => svc.generateVehicleMonthlyReport(null, [])).toThrow();
    });
    it('throws for non-array trips', () => {
      expect(() => svc.generateVehicleMonthlyReport('V1', 'bad')).toThrow();
    });
  });

  // ═══════════════════════════════════════════
  //  estimateReturnTime
  // ═══════════════════════════════════════════
  describe('estimateReturnTime', () => {
    it('adds duration to start time', () => {
      expect(svc.estimateReturnTime('08:00', 90)).toBe('09:30');
    });
    it('handles midnight wrap', () => {
      expect(svc.estimateReturnTime('23:00', 120)).toBe('01:00');
    });
  });

  // ═══════════════════════════════════════════
  //  estimateFuelCost
  // ═══════════════════════════════════════════
  describe('estimateFuelCost', () => {
    it('calculates liters and cost', () => {
      const r = svc.estimateFuelCost(100);
      expect(r.liters).toBeGreaterThan(0);
      expect(r.cost).toBeGreaterThan(0);
    });
    it('respects vehicle consumption', () => {
      const r = svc.estimateFuelCost(100, { fuelConsumptionPer100km: 20 });
      expect(r.liters).toBe(20);
    });
    it('respects custom fuel price', () => {
      const r = svc.estimateFuelCost(100, {}, 3);
      expect(r.cost).toBe(r.liters * 3);
    });
  });

  // ═══════════════════════════════════════════
  //  getPreTripChecklist
  // ═══════════════════════════════════════════
  describe('getPreTripChecklist', () => {
    it('returns 3 categories', () => {
      const c = svc.getPreTripChecklist();
      expect(c).toHaveProperty('exterior');
      expect(c).toHaveProperty('interior');
      expect(c).toHaveProperty('safety');
    });
    it('each item has key, labelAr, required', () => {
      const c = svc.getPreTripChecklist();
      const item = c.exterior[0];
      expect(item).toHaveProperty('key');
      expect(item).toHaveProperty('labelAr');
      expect(item).toHaveProperty('required');
    });
  });

  // ═══════════════════════════════════════════
  //  validatePreTripInspection
  // ═══════════════════════════════════════════
  describe('validatePreTripInspection', () => {
    it('passes when all required items pass', () => {
      const checklist = svc.getPreTripChecklist();
      const allItems = [...checklist.exterior, ...checklist.interior, ...checklist.safety];
      const results = {};
      allItems.forEach(item => {
        results[item.key] = true;
      });
      const r = svc.validatePreTripInspection(results);
      expect(r.passed).toBe(true);
      expect(r.failedRequired).toHaveLength(0);
    });
    it('fails when a required item fails', () => {
      const r = svc.validatePreTripInspection({});
      expect(r.passed).toBe(false);
      expect(r.failedRequired.length).toBeGreaterThan(0);
    });
    it('throws for invalid input', () => {
      expect(() => svc.validatePreTripInspection(null)).toThrow();
    });
  });

  // ═══════════════════════════════════════════
  //  calculateRouteTotalDistance (alias)
  // ═══════════════════════════════════════════
  describe('calculateRouteTotalDistance', () => {
    it('is alias for calculateTotalDistance', () => {
      expect(svc.calculateRouteTotalDistance).toBe(svc.calculateTotalDistance);
    });
  });

  // ═══════════════════════════════════════════
  //  addEstimatedTimes
  // ═══════════════════════════════════════════
  describe('addEstimatedTimes', () => {
    it('returns empty for empty waypoints', () => {
      expect(svc.addEstimatedTimes([], RIYADH, '08:00')).toEqual([]);
    });
    it('includes distance from branch for first stop', () => {
      const result = svc.addEstimatedTimes([STOP_A, STOP_B], RIYADH, '08:00');
      expect(result).toHaveLength(2);
      expect(result[0].distanceFromPrevKm).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('estimatedTime');
      expect(result[0]).toHaveProperty('travelMinutes');
    });
    it('throws for zero speed', () => {
      expect(() => svc.addEstimatedTimes([STOP_A], RIYADH, '08:00', { speedKmh: 0 })).toThrow();
    });
  });
});
