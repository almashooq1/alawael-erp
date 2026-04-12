/**
 * Bus Tracking Service — Unit Tests
 * Comprehensive tests for busTracking.service.js (singleton, all sync, in-memory)
 */

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const service = require('../../services/busTracking.service');

// ═══════════════════════════════════════════════════════════════════════════
// 1. MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

describe('BusTrackingService — Module exports', () => {
  test('exports a singleton object (not a class)', () => {
    expect(typeof service).toBe('object');
    expect(service).not.toBeNull();
  });

  test.each([
    'createBus',
    'getBusById',
    'getAllBuses',
    'updateBus',
    'deleteBus',
    'createRoute',
    'getRouteById',
    'getAllRoutes',
    'updateRoute',
    'deleteRoute',
    'registerStudent',
    'getStudentById',
    'getStudentsByBus',
    'getStudentsByParent',
    'startTrip',
    'endTrip',
    'getTripById',
    'getActiveTrips',
    'getTripHistory',
    'updateBusLocation',
    'getBusLocation',
    'getAllBusLocations',
    'recordBoarding',
    'getBoardingHistory',
    'getParentDashboard',
    'trackBusForParent',
    'getParentNotifications',
    'markNotificationRead',
    'markAllNotificationsRead',
    'raiseSOS',
    'getSafetyAlerts',
    'acknowledgeAlert',
    'arriveAtStop',
    'getDashboard',
    'getETAForStudent',
  ])('has method: %s', method => {
    expect(typeof service[method]).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. SEED DATA VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

describe('BusTrackingService — Seed data', () => {
  test('has 3 seeded buses', () => {
    const buses = service.getAllBuses();
    expect(buses.length).toBe(3);
  });

  test('bus 1000 has correct plate and capacity', () => {
    const bus = service.getBusById(1000);
    expect(bus.plateNumber).toBe('أ ب ج 1234');
    expect(bus.capacity).toBe(40);
    expect(bus.status).toBe('active');
    expect(bus.model).toBe('تويوتا كوستر');
  });

  test('bus 1001 is active with capacity 30', () => {
    const bus = service.getBusById(1001);
    expect(bus.plateNumber).toBe('د ه و 5678');
    expect(bus.capacity).toBe(30);
    expect(bus.status).toBe('active');
  });

  test('bus 1002 is in maintenance', () => {
    const bus = service.getBusById(1002);
    expect(bus.plateNumber).toBe('ز ح ط 9012');
    expect(bus.status).toBe('maintenance');
  });

  test('has 3 seeded routes', () => {
    const routes = service.getAllRoutes();
    expect(routes.length).toBe(3);
  });

  test('route 2000 has 5 stops', () => {
    const route = service.getRouteById(2000);
    expect(route.name).toContain('الشمالي');
    expect(route.stops).toHaveLength(5);
  });

  test('route 2001 has 4 stops', () => {
    const route = service.getRouteById(2001);
    expect(route.stops).toHaveLength(4);
  });

  test('route 2002 has 3 stops', () => {
    const route = service.getRouteById(2002);
    expect(route.stops).toHaveLength(3);
  });

  test('has 8 seeded students', () => {
    const allStudents = [
      service.getStudentById(4000),
      service.getStudentById(4001),
      service.getStudentById(4002),
      service.getStudentById(4003),
      service.getStudentById(4004),
      service.getStudentById(4005),
      service.getStudentById(4006),
      service.getStudentById(4007),
    ];
    expect(allStudents).toHaveLength(8);
    allStudents.forEach(s => expect(s).toBeDefined());
  });

  test('students 4000 and 4001 share parent phone 0512345678', () => {
    const s0 = service.getStudentById(4000);
    const s1 = service.getStudentById(4001);
    expect(s0.parentPhone).toBe('0512345678');
    expect(s1.parentPhone).toBe('0512345678');
  });

  test('students 4000-4002 are on bus 1000', () => {
    const students = service.getStudentsByBus(1000);
    const ids = students.map(s => s.id);
    expect(ids).toContain(4000);
    expect(ids).toContain(4001);
    expect(ids).toContain(4002);
  });

  test('students 4003-4005 are on bus 1001', () => {
    const students = service.getStudentsByBus(1001);
    const ids = students.map(s => s.id);
    expect(ids).toContain(4003);
    expect(ids).toContain(4004);
    expect(ids).toContain(4005);
  });

  test('students 4006-4007 are on bus 1002', () => {
    const students = service.getStudentsByBus(1002);
    const ids = students.map(s => s.id);
    expect(ids).toContain(4006);
    expect(ids).toContain(4007);
  });

  test('bus 1000 has a seeded location', () => {
    const loc = service.getBusLocation(1000);
    expect(loc.lat).toBe(24.72);
    expect(loc.lng).toBe(46.68);
    expect(loc.speed).toBe(45);
  });

  test('bus 1001 has a seeded location', () => {
    const loc = service.getBusLocation(1001);
    expect(loc.lat).toBe(24.7);
    expect(loc.lng).toBe(46.67);
    expect(loc.speed).toBe(30);
  });

  test('buses are linked to routes after seed', () => {
    expect(service.getBusById(1000).routeId).toBe(2000);
    expect(service.getBusById(1001).routeId).toBe(2001);
    expect(service.getBusById(1002).routeId).toBe(2002);
  });

  test('post-seed auto-increment IDs are correct', () => {
    expect(service._nextBusId).toBe(1003);
    expect(service._nextRouteId).toBe(2003);
    expect(service._nextTripId).toBe(3000);
    expect(service._nextStudentId).toBe(4008);
  });

  test('route stops have ascending order', () => {
    const route = service.getRouteById(2000);
    route.stops.forEach((s, i) => {
      expect(s.order).toBe(i + 1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. BUS CRUD
// ═══════════════════════════════════════════════════════════════════════════

describe('BusTrackingService — Bus CRUD', () => {
  describe('createBus', () => {
    test('creates a bus with valid data', () => {
      const bus = service.createBus({
        plateNumber: 'ت ث خ 3456',
        capacity: 20,
        model: 'باص صغير',
      });
      expect(bus.id).toBe(1003);
      expect(bus.plateNumber).toBe('ت ث خ 3456');
      expect(bus.capacity).toBe(20);
      expect(bus.status).toBe('active');
      expect(bus.createdAt).toBeInstanceOf(Date);
    });

    test('auto-increments bus ID', () => {
      const bus = service.createBus({ plateNumber: 'ت ق 9999', capacity: 15 });
      expect(bus.id).toBe(1004);
    });

    test('applies default values for optional fields', () => {
      const bus = service.getBusById(1003);
      expect(bus.model).toBe('باص صغير');
      expect(bus.color).toBe('أصفر');
      expect(bus.type).toBe('school');
      expect(bus.driverId).toBeNull();
    });

    test('throws if no plateNumber', () => {
      expect(() => service.createBus({ capacity: 10 })).toThrow(
        'الحقول المطلوبة: رقم اللوحة، السعة'
      );
    });

    test('throws if no capacity', () => {
      expect(() => service.createBus({ plateNumber: 'ض ظ 1111' })).toThrow(
        'الحقول المطلوبة: رقم اللوحة، السعة'
      );
    });

    test('throws if both plateNumber and capacity missing', () => {
      expect(() => service.createBus({})).toThrow('الحقول المطلوبة: رقم اللوحة، السعة');
    });

    test('stores features array', () => {
      const bus = service.createBus({
        plateNumber: 'ف ع 1010',
        capacity: 25,
        features: ['ac', 'camera'],
      });
      expect(bus.features).toEqual(['ac', 'camera']);
    });
  });

  describe('getBusById', () => {
    test('returns bus by numeric id', () => {
      const bus = service.getBusById(1000);
      expect(bus).toBeDefined();
      expect(bus.id).toBe(1000);
    });

    test('returns bus by string id (parseInt)', () => {
      const bus = service.getBusById('1001');
      expect(bus.id).toBe(1001);
    });

    test('throws for non-existent bus', () => {
      expect(() => service.getBusById(9999)).toThrow('الحافلة غير موجودة');
    });
  });

  describe('getAllBuses', () => {
    test('returns all buses when no filters', () => {
      const buses = service.getAllBuses();
      expect(buses.length).toBeGreaterThanOrEqual(3);
    });

    test('filters by status=active', () => {
      const active = service.getAllBuses({ status: 'active' });
      active.forEach(b => expect(b.status).toBe('active'));
    });

    test('filters by status=maintenance', () => {
      const maint = service.getAllBuses({ status: 'maintenance' });
      maint.forEach(b => expect(b.status).toBe('maintenance'));
      expect(maint.length).toBeGreaterThanOrEqual(1);
    });

    test('filters by search on plateNumber', () => {
      const results = service.getAllBuses({ search: '1234' });
      expect(results.some(b => b.plateNumber.includes('1234'))).toBe(true);
    });

    test('filters by search on model', () => {
      const results = service.getAllBuses({ search: 'تويوتا' });
      expect(results.some(b => b.model.includes('تويوتا'))).toBe(true);
    });

    test('search returns empty for no match', () => {
      const results = service.getAllBuses({ search: 'غير_موجود_أبداً' });
      expect(results).toHaveLength(0);
    });
  });

  describe('updateBus', () => {
    test('updates allowed fields', () => {
      const updated = service.updateBus(1000, { color: 'أزرق', model: 'تويوتا محدث' });
      expect(updated.color).toBe('أزرق');
      expect(updated.model).toBe('تويوتا محدث');
      expect(updated.updatedAt).toBeInstanceOf(Date);
    });

    test('does not overwrite fields not in data', () => {
      const before = service.getBusById(1000);
      const plate = before.plateNumber;
      service.updateBus(1000, { color: 'أحمر' });
      expect(service.getBusById(1000).plateNumber).toBe(plate);
    });

    test('throws for non-existent bus', () => {
      expect(() => service.updateBus(9999, { color: 'أبيض' })).toThrow('الحافلة غير موجودة');
    });

    test('accepts string id via parseInt', () => {
      const updated = service.updateBus('1001', { color: 'رمادي' });
      expect(updated.color).toBe('رمادي');
    });
  });

  describe('deleteBus', () => {
    let tempBusId;

    test('deletes an existing bus and returns it', () => {
      const temp = service.createBus({ plateNumber: 'حذف 0000', capacity: 10 });
      tempBusId = temp.id;
      const deleted = service.deleteBus(tempBusId);
      expect(deleted.id).toBe(tempBusId);
      expect(() => service.getBusById(tempBusId)).toThrow('الحافلة غير موجودة');
    });

    test('throws when deleting non-existent bus', () => {
      expect(() => service.deleteBus(99999)).toThrow('الحافلة غير موجودة');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. ROUTE CRUD
// ═══════════════════════════════════════════════════════════════════════════

describe('BusTrackingService — Route CRUD', () => {
  describe('createRoute', () => {
    test('creates a route with valid data and auto-orders stops', () => {
      const route = service.createRoute({
        name: 'مسار اختباري',
        stops: [
          { name: 'محطة أ', lat: 24.0, lng: 46.0 },
          { name: 'محطة ب', lat: 24.1, lng: 46.1 },
          { name: 'محطة ج', lat: 24.2, lng: 46.2 },
        ],
      });
      expect(route.id).toBe(2003);
      expect(route.name).toBe('مسار اختباري');
      expect(route.stops).toHaveLength(3);
      expect(route.stops[0].order).toBe(1);
      expect(route.stops[1].order).toBe(2);
      expect(route.stops[2].order).toBe(3);
      expect(route.status).toBe('active');
    });

    test('sets estimatedDuration = stops.length * 5 when not provided', () => {
      const route = service.createRoute({
        name: 'مسار وقت',
        stops: [{ name: 'أ' }, { name: 'ب' }],
      });
      expect(route.estimatedDuration).toBe(10); // 2 * 5
    });

    test('uses provided estimatedDuration', () => {
      const route = service.createRoute({
        name: 'مسار مخصص',
        stops: [{ name: 'أ' }, { name: 'ب' }],
        estimatedDuration: 30,
      });
      expect(route.estimatedDuration).toBe(30);
    });

    test('throws if no name', () => {
      expect(() => service.createRoute({ stops: [{ name: 'أ' }, { name: 'ب' }] })).toThrow(
        'اسم المسار ومحطتان على الأقل مطلوبة'
      );
    });

    test('throws if stops missing', () => {
      expect(() => service.createRoute({ name: 'مسار' })).toThrow(
        'اسم المسار ومحطتان على الأقل مطلوبة'
      );
    });

    test('throws if fewer than 2 stops', () => {
      expect(() => service.createRoute({ name: 'مسار', stops: [{ name: 'فقط' }] })).toThrow(
        'اسم المسار ومحطتان على الأقل مطلوبة'
      );
    });

    test('throws if stops is not an array', () => {
      expect(() => service.createRoute({ name: 'مسار', stops: 'not-array' })).toThrow(
        'اسم المسار ومحطتان على الأقل مطلوبة'
      );
    });

    test('assigns default lat/lng when not provided', () => {
      const route = service.createRoute({
        name: 'مسار افتراضي',
        stops: [{ name: 'أ' }, { name: 'ب' }],
      });
      // First stop: lat ~ 24.7 + 0*0.01, lng ~ 46.7 + 0*0.01
      expect(route.stops[0].lat).toBeCloseTo(24.7, 1);
      expect(route.stops[1].lat).toBeCloseTo(24.71, 1);
    });
  });

  describe('getRouteById', () => {
    test('returns route by numeric id', () => {
      const route = service.getRouteById(2000);
      expect(route).toBeDefined();
      expect(route.id).toBe(2000);
    });

    test('returns route by string id', () => {
      const route = service.getRouteById('2001');
      expect(route.id).toBe(2001);
    });

    test('throws for non-existent route', () => {
      expect(() => service.getRouteById(9999)).toThrow('المسار غير موجود');
    });
  });

  describe('getAllRoutes', () => {
    test('returns all routes when no filters', () => {
      const routes = service.getAllRoutes();
      expect(routes.length).toBeGreaterThanOrEqual(3);
    });

    test('filters by type', () => {
      const morning = service.getAllRoutes({ type: 'morning' });
      morning.forEach(r => expect(r.type).toBe('morning'));
      expect(morning.length).toBeGreaterThanOrEqual(1);
    });

    test('filters by status=active', () => {
      const active = service.getAllRoutes({ status: 'active' });
      active.forEach(r => expect(r.status).toBe('active'));
    });

    test('filters by search on name', () => {
      const results = service.getAllRoutes({ search: 'الشمالي' });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toContain('الشمالي');
    });
  });

  describe('updateRoute', () => {
    test('updates name and description', () => {
      const updated = service.updateRoute(2000, {
        name: 'المسار الشمالي المحدث',
        description: 'وصف جديد',
      });
      expect(updated.name).toBe('المسار الشمالي المحدث');
      expect(updated.description).toBe('وصف جديد');
    });

    test('re-maps stops with auto-ordering when stops provided', () => {
      const updated = service.updateRoute(2000, {
        stops: [
          { name: 'محطة جديدة 1', lat: 24.8, lng: 46.8 },
          { name: 'محطة جديدة 2', lat: 24.9, lng: 46.9 },
        ],
      });
      expect(updated.stops).toHaveLength(2);
      expect(updated.stops[0].order).toBe(1);
      expect(updated.stops[1].order).toBe(2);
    });

    test('throws for non-existent route', () => {
      expect(() => service.updateRoute(9999, { name: 'x' })).toThrow('المسار غير موجود');
    });
  });

  describe('deleteRoute', () => {
    test('deletes an existing route and returns it', () => {
      const route = service.createRoute({
        name: 'مسار للحذف',
        stops: [{ name: 'أ' }, { name: 'ب' }],
      });
      const deleted = service.deleteRoute(route.id);
      expect(deleted.id).toBe(route.id);
      expect(() => service.getRouteById(route.id)).toThrow('المسار غير موجود');
    });

    test('throws when deleting non-existent route', () => {
      expect(() => service.deleteRoute(99999)).toThrow('المسار غير موجود');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. STUDENT REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

describe('BusTrackingService — Student Registration', () => {
  describe('registerStudent', () => {
    test('registers a student with valid data', () => {
      const student = service.registerStudent({
        name: 'طالب اختباري',
        busId: 1000,
        parentPhone: '0599999999',
        grade: 'الصف الأول',
      });
      expect(student.id).toBe(4008);
      expect(student.name).toBe('طالب اختباري');
      expect(student.busId).toBe(1000);
      expect(student.parentPhone).toBe('0599999999');
      expect(student.status).toBe('active');
    });

    test('auto-increments student ID', () => {
      const s = service.registerStudent({
        name: 'طالب ثاني',
        busId: 1001,
        parentPhone: '0588888888',
      });
      expect(s.id).toBe(4009);
    });

    test('applies defaults for optional fields', () => {
      const s = service.getStudentById(4008);
      expect(s.parentName).toBe('ولي الأمر');
      expect(s.specialNeeds).toBeNull();
      expect(s.rfidTag).toBeNull();
    });

    test('throws if name missing', () => {
      expect(() => service.registerStudent({ busId: 1000, parentPhone: '0500000000' })).toThrow(
        'الحقول المطلوبة: اسم الطالب، رقم الحافلة، هاتف ولي الأمر'
      );
    });

    test('throws if busId missing', () => {
      expect(() => service.registerStudent({ name: 'طالب', parentPhone: '0500000000' })).toThrow(
        'الحقول المطلوبة: اسم الطالب، رقم الحافلة، هاتف ولي الأمر'
      );
    });

    test('throws if parentPhone missing', () => {
      expect(() => service.registerStudent({ name: 'طالب', busId: 1000 })).toThrow(
        'الحقول المطلوبة: اسم الطالب، رقم الحافلة، هاتف ولي الأمر'
      );
    });

    test('throws if all fields missing', () => {
      expect(() => service.registerStudent({})).toThrow(
        'الحقول المطلوبة: اسم الطالب، رقم الحافلة، هاتف ولي الأمر'
      );
    });
  });

  describe('getStudentById', () => {
    test('returns student by id', () => {
      const s = service.getStudentById(4000);
      expect(s.name).toBe('عبدالله أحمد');
    });

    test('returns student by string id', () => {
      const s = service.getStudentById('4001');
      expect(s.name).toBe('سارة خالد');
    });

    test('throws for non-existent student', () => {
      expect(() => service.getStudentById(99999)).toThrow('الطالب غير موجود');
    });
  });

  describe('getStudentsByBus', () => {
    test('returns active students on bus 1000', () => {
      const students = service.getStudentsByBus(1000);
      expect(students.length).toBeGreaterThanOrEqual(3);
      students.forEach(s => {
        expect(s.busId).toBe(1000);
        expect(s.status).toBe('active');
      });
    });

    test('accepts string busId', () => {
      const students = service.getStudentsByBus('1001');
      students.forEach(s => expect(s.busId).toBe(1001));
    });

    test('returns empty for bus with no students', () => {
      // create a bus with no students
      const bus = service.createBus({ plateNumber: 'فارغ 0001', capacity: 5 });
      const students = service.getStudentsByBus(bus.id);
      expect(students).toHaveLength(0);
    });
  });

  describe('getStudentsByParent', () => {
    test('returns 2 students for shared parent phone', () => {
      const students = service.getStudentsByParent('0512345678');
      expect(students.length).toBe(2);
      const ids = students.map(s => s.id);
      expect(ids).toContain(4000);
      expect(ids).toContain(4001);
    });

    test('returns 1 student for unique parent phone', () => {
      const students = service.getStudentsByParent('0598765432');
      expect(students.length).toBe(1);
      expect(students[0].id).toBe(4002);
    });

    test('returns empty for unknown parent phone', () => {
      const students = service.getStudentsByParent('0000000000');
      expect(students).toHaveLength(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. TRIP LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════

describe('BusTrackingService — Trip Lifecycle', () => {
  let tripId;

  describe('startTrip', () => {
    test('starts a trip with valid busId and routeId', () => {
      const trip = service.startTrip({ busId: 1000, routeId: 2000 });
      tripId = trip.id;
      expect(trip.id).toBe(3000);
      expect(trip.busId).toBe(1000);
      expect(trip.routeId).toBe(2000);
      expect(trip.status).toBe('in-progress');
      expect(trip.studentsOnBoard).toBe(0);
      expect(trip.startedAt).toBeInstanceOf(Date);
      expect(trip.endedAt).toBeNull();
    });

    test('creates notifications for parents of students on bus', () => {
      // Bus 1000 has students 4000-4002 + 4008 (from earlier test)
      // Parents: 0512345678 (2 students), 0598765432 (1), 0599999999 (1 from test)
      const notifs = service.getParentNotifications('0512345678');
      const tripNotifs = notifs.filter(n => n.type === 'trip_started' && n.tripId === tripId);
      expect(tripNotifs.length).toBeGreaterThanOrEqual(1);
    });

    test('sets currentStop to first stop of route', () => {
      const trip = service.getTripById(tripId);
      const route = service.getRouteById(2000);
      // After updateRoute in route test, stops were changed; let's just verify it has a currentStop
      expect(trip.currentStop).toBeDefined();
      expect(trip.currentStopIndex).toBe(0);
    });

    test('throws if busId missing', () => {
      expect(() => service.startTrip({ routeId: 2001 })).toThrow('رقم الحافلة والمسار مطلوبان');
    });

    test('throws if routeId missing', () => {
      expect(() => service.startTrip({ busId: 1001 })).toThrow('رقم الحافلة والمسار مطلوبان');
    });

    test('throws if bus already has an active trip', () => {
      // Bus 1000 already has trip 3000 in-progress
      expect(() => service.startTrip({ busId: 1000, routeId: 2000 })).toThrow(
        'الحافلة لديها رحلة نشطة بالفعل'
      );
    });

    test('throws if bus does not exist', () => {
      expect(() => service.startTrip({ busId: 99999, routeId: 2000 })).toThrow(
        'الحافلة غير موجودة'
      );
    });

    test('throws if route does not exist', () => {
      expect(() => service.startTrip({ busId: 1001, routeId: 99999 })).toThrow('المسار غير موجود');
    });

    test('starts a second trip on a different bus', () => {
      const trip2 = service.startTrip({ busId: 1001, routeId: 2001 });
      expect(trip2.id).toBe(3001);
      expect(trip2.busId).toBe(1001);
      expect(trip2.status).toBe('in-progress');
    });
  });

  describe('endTrip', () => {
    test('ends an active trip', () => {
      const ended = service.endTrip(3001);
      expect(ended.status).toBe('completed');
      expect(ended.endedAt).toBeInstanceOf(Date);
      expect(ended.currentStop).toBe('الوجهة النهائية');
    });

    test('creates completion notifications for parents', () => {
      const notifs = service.getParentNotifications('0567891234');
      const completed = notifs.filter(n => n.type === 'trip_completed' && n.tripId === 3001);
      expect(completed.length).toBeGreaterThanOrEqual(1);
    });

    test('throws for non-existent trip', () => {
      expect(() => service.endTrip(99999)).toThrow('الرحلة غير موجودة');
    });

    test('throws if trip is not in-progress', () => {
      // Trip 3001 is already completed
      expect(() => service.endTrip(3001)).toThrow('الرحلة ليست نشطة');
    });
  });

  describe('getTripById', () => {
    test('returns trip by id', () => {
      const trip = service.getTripById(3000);
      expect(trip).toBeDefined();
      expect(trip.id).toBe(3000);
    });

    test('returns trip by string id', () => {
      const trip = service.getTripById('3001');
      expect(trip.id).toBe(3001);
    });

    test('throws for non-existent trip', () => {
      expect(() => service.getTripById(99999)).toThrow('الرحلة غير موجودة');
    });
  });

  describe('getActiveTrips', () => {
    test('returns only in-progress trips', () => {
      const active = service.getActiveTrips();
      active.forEach(t => expect(t.status).toBe('in-progress'));
      // Trip 3000 is still active
      expect(active.some(t => t.id === 3000)).toBe(true);
    });

    test('does not include completed trips', () => {
      const active = service.getActiveTrips();
      expect(active.some(t => t.id === 3001)).toBe(false);
    });
  });

  describe('getTripHistory', () => {
    test('returns all trips sorted by startTime desc', () => {
      const history = service.getTripHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < history.length; i++) {
        expect(new Date(history[i - 1].startedAt) >= new Date(history[i].startedAt)).toBe(true);
      }
    });

    test('filters by busId', () => {
      const history = service.getTripHistory({ busId: 1000 });
      history.forEach(t => expect(t.busId).toBe(1000));
    });

    test('filters by status', () => {
      const history = service.getTripHistory({ status: 'completed' });
      history.forEach(t => expect(t.status).toBe('completed'));
    });

    test('filters by type', () => {
      const history = service.getTripHistory({ type: 'morning' });
      history.forEach(t => expect(t.type).toBe('morning'));
    });

    test('returns empty for non-matching busId', () => {
      const history = service.getTripHistory({ busId: 99999 });
      expect(history).toHaveLength(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. LOCATION
// ═══════════════════════════════════════════════════════════════════════════

describe('BusTrackingService — Location', () => {
  describe('updateBusLocation', () => {
    test('updates location for existing bus', () => {
      const loc = service.updateBusLocation(1000, {
        lat: 24.75,
        lng: 46.7,
        speed: 50,
        heading: 45,
      });
      expect(loc.busId).toBe(1000);
      expect(loc.lat).toBe(24.75);
      expect(loc.lng).toBe(46.7);
      expect(loc.speed).toBe(50);
      expect(loc.timestamp).toBeInstanceOf(Date);
    });

    test('updates bus.currentLocation', () => {
      const bus = service.getBusById(1000);
      expect(bus.currentLocation.lat).toBe(24.75);
      expect(bus.currentLocation.lng).toBe(46.7);
      expect(bus.lastLocationUpdate).toBeInstanceOf(Date);
    });

    test('appends to active trip locationLog', () => {
      // Trip 3000 is active on bus 1000
      const trip = service.getTripById(3000);
      expect(trip.locationLog.length).toBeGreaterThanOrEqual(1);
    });

    test('creates speed alert when speed > 80', () => {
      const alertsBefore = service.getSafetyAlerts({ type: 'overspeeding' }).length;
      service.updateBusLocation(1000, { lat: 24.76, lng: 46.71, speed: 90 });
      const alertsAfter = service.getSafetyAlerts({ type: 'overspeeding' });
      expect(alertsAfter.length).toBe(alertsBefore + 1);
      const latest = alertsAfter[0]; // sorted desc
      expect(latest.severity).toBe('warning');
      expect(latest.message).toContain('90');
    });

    test('creates critical alert when speed > 120', () => {
      const alertsBefore = service.getSafetyAlerts({ severity: 'critical' }).length;
      service.updateBusLocation(1000, { lat: 24.77, lng: 46.72, speed: 130 });
      const alertsAfter = service.getSafetyAlerts({ severity: 'critical' });
      expect(alertsAfter.length).toBeGreaterThan(alertsBefore);
      const latest = alertsAfter[0];
      expect(latest.severity).toBe('critical');
    });

    test('no speed alert when speed <= 80', () => {
      const alertsBefore = service.getSafetyAlerts({ type: 'overspeeding' }).length;
      service.updateBusLocation(1001, { lat: 24.71, lng: 46.68, speed: 60 });
      const alertsAfter = service.getSafetyAlerts({ type: 'overspeeding' }).length;
      expect(alertsAfter).toBe(alertsBefore);
    });

    test('throws if lat missing', () => {
      expect(() => service.updateBusLocation(1000, { lng: 46.0 })).toThrow(
        'الإحداثيات مطلوبة (lat, lng)'
      );
    });

    test('throws if lng missing', () => {
      expect(() => service.updateBusLocation(1000, { lat: 24.0 })).toThrow(
        'الإحداثيات مطلوبة (lat, lng)'
      );
    });

    test('throws if bus does not exist', () => {
      expect(() => service.updateBusLocation(99999, { lat: 24.0, lng: 46.0 })).toThrow(
        'الحافلة غير موجودة'
      );
    });

    test('defaults speed to 0 when not provided', () => {
      const loc = service.updateBusLocation(1002, { lat: 24.8, lng: 46.8 });
      expect(loc.speed).toBe(0);
    });
  });

  describe('getBusLocation', () => {
    test('returns location for bus with location data', () => {
      const loc = service.getBusLocation(1000);
      expect(loc).toBeDefined();
      expect(loc.busId).toBe(1000);
      expect(typeof loc.lat).toBe('number');
      expect(typeof loc.lng).toBe('number');
    });

    test('accepts string id', () => {
      const loc = service.getBusLocation('1001');
      expect(loc.busId).toBe(1001);
    });

    test('throws for bus with no location', () => {
      const bus = service.createBus({ plateNumber: 'بلا موقع', capacity: 10 });
      expect(() => service.getBusLocation(bus.id)).toThrow('لا يوجد موقع محدد للحافلة');
    });
  });

  describe('getAllBusLocations', () => {
    test('returns all tracked locations', () => {
      const locs = service.getAllBusLocations();
      expect(locs.length).toBeGreaterThanOrEqual(2);
      locs.forEach(l => {
        expect(l).toHaveProperty('busId');
        expect(l).toHaveProperty('lat');
        expect(l).toHaveProperty('lng');
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. BOARDING
// ═══════════════════════════════════════════════════════════════════════════

describe('BusTrackingService — Boarding', () => {
  describe('recordBoarding', () => {
    test('records a boarding event and increments studentsOnBoard', () => {
      const trip = service.getTripById(3000);
      const before = trip.studentsOnBoard;
      const event = service.recordBoarding({
        tripId: 3000,
        studentId: 4000,
        type: 'boarding',
      });
      expect(event.tripId).toBe(3000);
      expect(event.studentId).toBe(4000);
      expect(event.type).toBe('boarding');
      expect(event.studentName).toBe('عبدالله أحمد');
      expect(trip.studentsOnBoard).toBe(before + 1);
    });

    test('records an alighting event and decrements studentsOnBoard', () => {
      const trip = service.getTripById(3000);
      const before = trip.studentsOnBoard;
      const event = service.recordBoarding({
        tripId: 3000,
        studentId: 4000,
        type: 'alighting',
      });
      expect(event.type).toBe('alighting');
      expect(trip.studentsOnBoard).toBe(before - 1);
    });

    test('studentsOnBoard does not go below 0', () => {
      const trip = service.getTripById(3000);
      // Force to 0
      trip.studentsOnBoard = 0;
      service.recordBoarding({
        tripId: 3000,
        studentId: 4001,
        type: 'alighting',
      });
      expect(trip.studentsOnBoard).toBe(0);
    });

    test('creates parent notification on boarding', () => {
      service.recordBoarding({
        tripId: 3000,
        studentId: 4001,
        type: 'boarding',
      });
      const notifs = service.getParentNotifications('0512345678');
      const boarding = notifs.filter(n => n.type === 'student_boarded');
      expect(boarding.length).toBeGreaterThanOrEqual(1);
    });

    test('creates parent notification on alighting', () => {
      service.recordBoarding({
        tripId: 3000,
        studentId: 4002,
        type: 'alighting',
      });
      const notifs = service.getParentNotifications('0598765432');
      const alighting = notifs.filter(n => n.type === 'student_alighted');
      expect(alighting.length).toBeGreaterThanOrEqual(1);
    });

    test('defaults type to boarding', () => {
      const event = service.recordBoarding({
        tripId: 3000,
        studentId: 4002,
      });
      expect(event.type).toBe('boarding');
    });

    test('uses trip currentStop as default stopName', () => {
      const trip = service.getTripById(3000);
      const event = service.recordBoarding({
        tripId: 3000,
        studentId: 4000,
        type: 'boarding',
      });
      expect(event.stopName).toBe(trip.currentStop);
    });

    test('throws if tripId missing', () => {
      expect(() => service.recordBoarding({ studentId: 4000 })).toThrow(
        'رقم الرحلة والطالب مطلوبان'
      );
    });

    test('throws if studentId missing', () => {
      expect(() => service.recordBoarding({ tripId: 3000 })).toThrow('رقم الرحلة والطالب مطلوبان');
    });

    test('throws if trip is not in-progress', () => {
      // Trip 3001 is completed
      expect(() => service.recordBoarding({ tripId: 3001, studentId: 4003 })).toThrow(
        'الرحلة ليست نشطة'
      );
    });

    test('throws if student does not exist', () => {
      expect(() => service.recordBoarding({ tripId: 3000, studentId: 99999 })).toThrow(
        'الطالب غير موجود'
      );
    });

    test('stores method and verifiedBy', () => {
      const event = service.recordBoarding({
        tripId: 3000,
        studentId: 4000,
        type: 'boarding',
        method: 'rfid',
        verifiedBy: 'النظام',
      });
      expect(event.method).toBe('rfid');
      expect(event.verifiedBy).toBe('النظام');
    });
  });

  describe('getBoardingHistory', () => {
    test('returns all boarding events without filters', () => {
      const history = service.getBoardingHistory();
      expect(history.length).toBeGreaterThanOrEqual(1);
    });

    test('filters by tripId', () => {
      const history = service.getBoardingHistory({ tripId: 3000 });
      history.forEach(e => expect(e.tripId).toBe(3000));
    });

    test('filters by studentId', () => {
      const history = service.getBoardingHistory({ studentId: 4000 });
      history.forEach(e => expect(e.studentId).toBe(4000));
    });

    test('filters by busId', () => {
      const history = service.getBoardingHistory({ busId: 1000 });
      history.forEach(e => expect(e.busId).toBe(1000));
    });

    test('filters by type=boarding', () => {
      const history = service.getBoardingHistory({ type: 'boarding' });
      history.forEach(e => expect(e.type).toBe('boarding'));
    });

    test('filters by type=alighting', () => {
      const history = service.getBoardingHistory({ type: 'alighting' });
      history.forEach(e => expect(e.type).toBe('alighting'));
    });

    test('returns empty for non-matching filter', () => {
      const history = service.getBoardingHistory({ tripId: 99999 });
      expect(history).toHaveLength(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. PARENT PORTAL
// ═══════════════════════════════════════════════════════════════════════════

describe('BusTrackingService — Parent Portal', () => {
  describe('getParentDashboard', () => {
    test('returns dashboard for parent with students', () => {
      const dash = service.getParentDashboard('0512345678');
      expect(dash).toHaveProperty('students');
      expect(dash).toHaveProperty('activeBuses');
      expect(dash).toHaveProperty('recentNotifications');
      expect(dash).toHaveProperty('totalStudents');
      expect(dash.totalStudents).toBe(2);
      expect(dash.students).toHaveLength(2);
    });

    test('returns activeBuses when trip is in-progress', () => {
      // Bus 1000 has active trip 3000
      const dash = service.getParentDashboard('0512345678');
      expect(dash.activeBuses.length).toBeGreaterThanOrEqual(1);
      const activeBus = dash.activeBuses.find(b => b.id === 1000);
      if (activeBus) {
        expect(activeBus).toHaveProperty('plateNumber');
        expect(activeBus).toHaveProperty('tripStatus');
      }
    });

    test('returns recent notifications', () => {
      const dash = service.getParentDashboard('0512345678');
      expect(Array.isArray(dash.recentNotifications)).toBe(true);
    });

    test('throws if parentPhone is missing', () => {
      expect(() => service.getParentDashboard('')).toThrow('رقم هاتف ولي الأمر مطلوب');
    });

    test('throws if parentPhone is null', () => {
      expect(() => service.getParentDashboard(null)).toThrow('رقم هاتف ولي الأمر مطلوب');
    });

    test('throws if parentPhone is undefined', () => {
      expect(() => service.getParentDashboard(undefined)).toThrow('رقم هاتف ولي الأمر مطلوب');
    });

    test('returns message when no students found', () => {
      const dash = service.getParentDashboard('0000000000');
      expect(dash.students).toHaveLength(0);
      expect(dash.message).toBe('لم يتم تسجيل طلاب لهذا الرقم');
    });

    test('student status reflects boarding event', () => {
      const dash = service.getParentDashboard('0512345678');
      // Students should have status info
      dash.students.forEach(s => {
        expect(s).toHaveProperty('status');
        expect(s).toHaveProperty('busPlate');
      });
    });
  });

  describe('trackBusForParent', () => {
    test('returns bus tracking info when parent has student on bus', () => {
      const result = service.trackBusForParent(1000, '0512345678');
      expect(result).toHaveProperty('bus');
      expect(result).toHaveProperty('location');
      expect(result).toHaveProperty('trip');
      expect(result).toHaveProperty('route');
      expect(result).toHaveProperty('myStudents');
      expect(result.bus.id).toBe(1000);
    });

    test('myStudents contains only students on the specified bus', () => {
      const result = service.trackBusForParent(1000, '0512345678');
      result.myStudents.forEach(s => {
        // All should be students of this parent on bus 1000
        expect([4000, 4001]).toContain(s.id);
      });
    });

    test('includes trip info when trip is active', () => {
      const result = service.trackBusForParent(1000, '0512345678');
      expect(result.trip).not.toBeNull();
      expect(result.trip).toHaveProperty('id');
      expect(result.trip).toHaveProperty('status');
    });

    test('includes location info', () => {
      const result = service.trackBusForParent(1000, '0512345678');
      expect(result.location).not.toBeNull();
      expect(result.location).toHaveProperty('lat');
      expect(result.location).toHaveProperty('lng');
    });

    test('throws if parent has no student on bus', () => {
      // Parent 0567891234 has student on bus 1001, not 1000
      expect(() => service.trackBusForParent(1000, '0567891234')).toThrow(
        'غير مصرح — ليس لديك طالب على هذه الحافلة'
      );
    });

    test('throws for completely unknown parent phone', () => {
      expect(() => service.trackBusForParent(1000, '0000000000')).toThrow(
        'غير مصرح — ليس لديك طالب على هذه الحافلة'
      );
    });

    test('returns route info when bus has routeId', () => {
      const result = service.trackBusForParent(1000, '0512345678');
      // Bus 1000 has routeId 2000 (though we updated it in route tests, it still has a routeId)
      if (result.route) {
        expect(result.route).toHaveProperty('name');
        expect(result.route).toHaveProperty('stops');
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

describe('BusTrackingService — Notifications', () => {
  describe('getParentNotifications', () => {
    test('returns notifications for parent sorted desc by createdAt', () => {
      const notifs = service.getParentNotifications('0512345678');
      expect(notifs.length).toBeGreaterThanOrEqual(1);
      for (let i = 1; i < notifs.length; i++) {
        expect(new Date(notifs[i - 1].createdAt) >= new Date(notifs[i].createdAt)).toBe(true);
      }
    });

    test('respects limit parameter', () => {
      const notifs = service.getParentNotifications('0512345678', { limit: 2 });
      expect(notifs.length).toBeLessThanOrEqual(2);
    });

    test('default limit is 50', () => {
      const notifs = service.getParentNotifications('0512345678');
      expect(notifs.length).toBeLessThanOrEqual(50);
    });

    test('filters unreadOnly when true', () => {
      const notifs = service.getParentNotifications('0512345678', { unreadOnly: true });
      notifs.forEach(n => expect(n.read).toBe(false));
    });

    test('returns empty for parent with no notifications', () => {
      const notifs = service.getParentNotifications('0000000000');
      expect(notifs).toHaveLength(0);
    });
  });

  describe('markNotificationRead', () => {
    test('marks a notification as read', () => {
      const notifs = service.getParentNotifications('0512345678', { unreadOnly: true });
      expect(notifs.length).toBeGreaterThanOrEqual(1);
      const notifId = notifs[0].id;
      const updated = service.markNotificationRead(notifId);
      expect(updated.read).toBe(true);
      expect(updated.id).toBe(notifId);
    });

    test('accepts string id', () => {
      const notifs = service.getParentNotifications('0512345678', { unreadOnly: true });
      if (notifs.length > 0) {
        const updated = service.markNotificationRead(String(notifs[0].id));
        expect(updated.read).toBe(true);
      }
    });

    test('throws for non-existent notification', () => {
      expect(() => service.markNotificationRead(999999)).toThrow('الإشعار غير موجود');
    });
  });

  describe('markAllNotificationsRead', () => {
    test('marks all unread notifications for a parent', () => {
      // First, ensure there are unread ones
      const before = service.getParentNotifications('0598765432', { unreadOnly: true });
      const result = service.markAllNotificationsRead('0598765432');
      expect(result).toHaveProperty('markedRead');
      expect(result.markedRead).toBe(before.length);

      // Verify all are now read
      const after = service.getParentNotifications('0598765432', { unreadOnly: true });
      expect(after).toHaveLength(0);
    });

    test('returns 0 if no unread notifications', () => {
      // Call again — all should already be read
      const result = service.markAllNotificationsRead('0598765432');
      expect(result.markedRead).toBe(0);
    });

    test('returns 0 for unknown parent', () => {
      const result = service.markAllNotificationsRead('0000000000');
      expect(result.markedRead).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. SAFETY
// ═══════════════════════════════════════════════════════════════════════════

describe('BusTrackingService — Safety', () => {
  describe('raiseSOS', () => {
    test('creates a critical SOS alert', () => {
      const alert = service.raiseSOS(1000, { message: 'حالة طوارئ' });
      expect(alert.type).toBe('sos');
      expect(alert.severity).toBe('critical');
      expect(alert.busId).toBe(1000);
      expect(alert.acknowledged).toBe(false);
      expect(alert.message).toContain('حالة طوارئ');
    });

    test('uses default message when none provided', () => {
      const alert = service.raiseSOS(1001);
      expect(alert.message).toContain('SOS');
      expect(alert.message).toContain('د ه و 5678');
    });

    test('notifies all parents of students on bus', () => {
      // Bus 1000: parents 0512345678 (x2), 0598765432, 0599999999
      const notifsBefore = service.getParentNotifications('0512345678').length;
      service.raiseSOS(1000);
      const notifsAfter = service.getParentNotifications('0512345678');
      expect(notifsAfter.length).toBeGreaterThan(notifsBefore);
      const safetyNotif = notifsAfter.find(n => n.type === 'safety_alert');
      expect(safetyNotif).toBeDefined();
      expect(safetyNotif.message).toContain('تنبيه طوارئ');
    });

    test('includes location in alert when available', () => {
      const alert = service.raiseSOS(1000);
      // Bus 1000 has location from earlier updates
      expect(alert.location).not.toBeNull();
    });

    test('throws if bus does not exist', () => {
      expect(() => service.raiseSOS(99999)).toThrow('الحافلة غير موجودة');
    });
  });

  describe('getSafetyAlerts', () => {
    test('returns all alerts sorted desc', () => {
      const alerts = service.getSafetyAlerts();
      expect(alerts.length).toBeGreaterThanOrEqual(1);
      for (let i = 1; i < alerts.length; i++) {
        expect(new Date(alerts[i - 1].createdAt) >= new Date(alerts[i].createdAt)).toBe(true);
      }
    });

    test('filters by busId', () => {
      const alerts = service.getSafetyAlerts({ busId: 1000 });
      alerts.forEach(a => expect(a.busId).toBe(1000));
    });

    test('filters by type=sos', () => {
      const alerts = service.getSafetyAlerts({ type: 'sos' });
      alerts.forEach(a => expect(a.type).toBe('sos'));
      expect(alerts.length).toBeGreaterThanOrEqual(1);
    });

    test('filters by type=overspeeding', () => {
      const alerts = service.getSafetyAlerts({ type: 'overspeeding' });
      alerts.forEach(a => expect(a.type).toBe('overspeeding'));
    });

    test('filters by severity=critical', () => {
      const alerts = service.getSafetyAlerts({ severity: 'critical' });
      alerts.forEach(a => expect(a.severity).toBe('critical'));
    });

    test('filters unacknowledged', () => {
      const alerts = service.getSafetyAlerts({ unacknowledged: true });
      alerts.forEach(a => expect(a.acknowledged).toBe(false));
    });

    test('returns empty for non-matching filter', () => {
      const alerts = service.getSafetyAlerts({ busId: 99999 });
      expect(alerts).toHaveLength(0);
    });
  });

  describe('acknowledgeAlert', () => {
    test('acknowledges an existing alert', () => {
      const alerts = service.getSafetyAlerts({ unacknowledged: true });
      expect(alerts.length).toBeGreaterThanOrEqual(1);
      const alertId = alerts[0].id;
      const ack = service.acknowledgeAlert(alertId);
      expect(ack.acknowledged).toBe(true);
      expect(ack.acknowledgedAt).toBeInstanceOf(Date);
    });

    test('accepts string id', () => {
      const alerts = service.getSafetyAlerts({ unacknowledged: true });
      if (alerts.length > 0) {
        const ack = service.acknowledgeAlert(String(alerts[0].id));
        expect(ack.acknowledged).toBe(true);
      }
    });

    test('throws for non-existent alert', () => {
      expect(() => service.acknowledgeAlert(999999)).toThrow('التنبيه غير موجود');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. WAYPOINT — arriveAtStop
// ═══════════════════════════════════════════════════════════════════════════

describe('BusTrackingService — Waypoint', () => {
  // Restore route 2000 to a known state for waypoint tests
  beforeAll(() => {
    service.updateRoute(2000, {
      stops: [
        { name: 'المركز الرئيسي', lat: 24.71, lng: 46.67 },
        { name: 'حي النزهة - محطة 1', lat: 24.72, lng: 46.68 },
        { name: 'حي الملقا', lat: 24.73, lng: 46.69 },
        { name: 'حي الياسمين', lat: 24.74, lng: 46.695 },
      ],
    });
  });

  describe('arriveAtStop', () => {
    test('advances trip to next stop', () => {
      const result = service.arriveAtStop(3000, {});
      expect(result.tripId).toBe(3000);
      expect(result.stopIndex).toBe(1);
      expect(result.currentStop).toBe('حي النزهة - محطة 1');
      expect(result).toHaveProperty('remainingStops');
      expect(result).toHaveProperty('eta');
    });

    test('calculates remaining stops correctly', () => {
      const result = service.arriveAtStop(3000, {});
      // Now at stop index 2, total 4 stops, remaining = 4 - 2 - 1 = 1
      expect(result.stopIndex).toBe(2);
      expect(result.remainingStops).toBe(1);
    });

    test('can specify explicit stopIndex', () => {
      const result = service.arriveAtStop(3000, { stopIndex: 3 });
      expect(result.stopIndex).toBe(3);
      expect(result.currentStop).toBe('حي الياسمين');
      expect(result.remainingStops).toBe(0);
    });

    test('notifies parents whose students are at that stop', () => {
      // Student 4001 (سارة خالد) has stopName='حي الملقا', parent='0512345678'
      // We need a fresh trip to test this properly
      // First end the current trip 3000
      service.endTrip(3000);

      // Start a new trip on bus 1000
      const newTrip = service.startTrip({ busId: 1000, routeId: 2000 });

      // Update student 4000 stop to match second stop
      const student = service.getStudentById(4000);
      student.stopName = 'حي النزهة - محطة 1';

      const notifsBefore = service
        .getParentNotifications('0512345678')
        .filter(n => n.type === 'bus_arriving').length;

      service.arriveAtStop(newTrip.id, { stopIndex: 1 }); // Arrive at 'حي النزهة - محطة 1'

      const notifsAfter = service
        .getParentNotifications('0512345678')
        .filter(n => n.type === 'bus_arriving');
      expect(notifsAfter.length).toBeGreaterThan(notifsBefore);
    });

    test('throws if trip is not in-progress', () => {
      // Trip 3000 was ended above
      expect(() => service.arriveAtStop(3000, {})).toThrow('الرحلة ليست نشطة');
    });

    test('throws for non-existent trip', () => {
      expect(() => service.arriveAtStop(99999, {})).toThrow('الرحلة غير موجودة');
    });

    test('throws when no more stops available', () => {
      // Get the currently active trip
      const active = service.getActiveTrips();
      const trip = active.find(t => t.busId === 1000);
      if (trip) {
        const route = service.routes.get(trip.routeId);
        expect(() => service.arriveAtStop(trip.id, { stopIndex: route.stops.length })).toThrow(
          'لا توجد محطات أخرى — استخدم إنهاء الرحلة'
        );
      }
    });

    test('updates trip currentStop and currentStopIndex', () => {
      const active = service.getActiveTrips().find(t => t.busId === 1000);
      if (active) {
        service.arriveAtStop(active.id, { stopIndex: 2 });
        const trip = service.getTripById(active.id);
        expect(trip.currentStopIndex).toBe(2);
        expect(trip.currentStop).toBe('حي الملقا');
      }
    });

    test('recalculates ETA based on remaining stops', () => {
      const active = service.getActiveTrips().find(t => t.busId === 1000);
      if (active) {
        const result = service.arriveAtStop(active.id, { stopIndex: 3 });
        expect(result.eta).toBeInstanceOf(Date);
        expect(result.remainingStops).toBe(0);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

describe('BusTrackingService — Dashboard', () => {
  test('returns kpi, activeTrips, and recentAlerts', () => {
    const dash = service.getDashboard();
    expect(dash).toHaveProperty('kpi');
    expect(dash).toHaveProperty('activeTrips');
    expect(dash).toHaveProperty('recentAlerts');
  });

  test('kpi has all 12 fields', () => {
    const { kpi } = service.getDashboard();
    expect(kpi).toHaveProperty('totalBuses');
    expect(kpi).toHaveProperty('activeBuses');
    expect(kpi).toHaveProperty('inMaintenanceBuses');
    expect(kpi).toHaveProperty('totalRoutes');
    expect(kpi).toHaveProperty('activeTrips');
    expect(kpi).toHaveProperty('todayTrips');
    expect(kpi).toHaveProperty('completedToday');
    expect(kpi).toHaveProperty('totalStudents');
    expect(kpi).toHaveProperty('studentsOnBoard');
    expect(kpi).toHaveProperty('totalBoardingToday');
    expect(kpi).toHaveProperty('activeAlerts');
    expect(kpi).toHaveProperty('criticalAlerts');
  });

  test('kpi.totalBuses counts all buses', () => {
    const { kpi } = service.getDashboard();
    const allBuses = service.getAllBuses();
    expect(kpi.totalBuses).toBe(allBuses.length);
  });

  test('kpi.activeBuses counts only active status buses', () => {
    const { kpi } = service.getDashboard();
    const active = service.getAllBuses({ status: 'active' });
    expect(kpi.activeBuses).toBe(active.length);
  });

  test('kpi.inMaintenanceBuses counts maintenance buses', () => {
    const { kpi } = service.getDashboard();
    const maint = service.getAllBuses({ status: 'maintenance' });
    expect(kpi.inMaintenanceBuses).toBe(maint.length);
  });

  test('kpi.totalRoutes matches routes Map size', () => {
    const { kpi } = service.getDashboard();
    expect(kpi.totalRoutes).toBe(service.routes.size);
  });

  test('kpi.activeTrips matches getActiveTrips length', () => {
    const { kpi } = service.getDashboard();
    const active = service.getActiveTrips();
    expect(kpi.activeTrips).toBe(active.length);
  });

  test('kpi values are numbers', () => {
    const { kpi } = service.getDashboard();
    Object.values(kpi).forEach(v => expect(typeof v).toBe('number'));
  });

  test('activeTrips array has expected structure', () => {
    const { activeTrips } = service.getDashboard();
    if (activeTrips.length > 0) {
      const t = activeTrips[0];
      expect(t).toHaveProperty('tripId');
      expect(t).toHaveProperty('busId');
      expect(t).toHaveProperty('busPlate');
      expect(t).toHaveProperty('currentStop');
      expect(t).toHaveProperty('studentsOnBoard');
    }
  });

  test('recentAlerts limited to 10 unacknowledged', () => {
    const { recentAlerts } = service.getDashboard();
    expect(recentAlerts.length).toBeLessThanOrEqual(10);
    recentAlerts.forEach(a => expect(a.acknowledged).toBe(false));
  });

  test('recentAlerts sorted desc by createdAt', () => {
    const { recentAlerts } = service.getDashboard();
    for (let i = 1; i < recentAlerts.length; i++) {
      expect(new Date(recentAlerts[i - 1].createdAt) >= new Date(recentAlerts[i].createdAt)).toBe(
        true
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. ETA
// ═══════════════════════════════════════════════════════════════════════════

describe('BusTrackingService — ETA', () => {
  // Ensure a known active trip state for ETA tests
  let etaTripId;

  beforeAll(() => {
    // End any active trip on bus 1000
    const activeOnBus1000 = service.getActiveTrips().find(t => t.busId === 1000);
    if (activeOnBus1000) {
      service.endTrip(activeOnBus1000.id);
    }

    // Restore route 2000 to a known state
    service.updateRoute(2000, {
      stops: [
        { name: 'المركز الرئيسي', lat: 24.71, lng: 46.67 },
        { name: 'حي النزهة - محطة 1', lat: 24.72, lng: 46.68 },
        { name: 'حي الملقا', lat: 24.73, lng: 46.69 },
        { name: 'حي الياسمين', lat: 24.74, lng: 46.695 },
      ],
    });

    // Restore student stop names
    service.getStudentById(4000).stopName = 'حي النزهة - محطة 1';
    service.getStudentById(4001).stopName = 'حي الملقا';
    service.getStudentById(4002).stopName = 'حي الياسمين';

    // Start a fresh trip
    const trip = service.startTrip({ busId: 1000, routeId: 2000 });
    etaTripId = trip.id;
  });

  test('returns hasActiveTrip=false when no active trip for student', () => {
    // Student 4003 is on bus 1001 which has no active trip currently
    // First ensure no active trip on bus 1001
    const activeOn1001 = service.getActiveTrips().find(t => t.busId === 1001);
    if (activeOn1001) service.endTrip(activeOn1001.id);

    const eta = service.getETAForStudent(4003);
    expect(eta.hasActiveTrip).toBe(false);
    expect(eta.message).toBe('لا توجد رحلة نشطة');
  });

  test('returns ETA info when student has active trip ahead', () => {
    // Student 4002 at 'حي الياسمين' (stop index 3), trip at index 0
    const eta = service.getETAForStudent(4002);
    expect(eta.hasActiveTrip).toBe(true);
    expect(eta.passed).toBe(false);
    expect(eta.stopsAway).toBeGreaterThan(0);
    expect(eta.etaMinutes).toBeGreaterThan(0);
    expect(eta.eta).toBeInstanceOf(Date);
    expect(eta.stopName).toBe('حي الياسمين');
  });

  test('stopsAway calculation is correct', () => {
    // Trip at index 0, student 4000 at 'حي النزهة - محطة 1' (index 1)
    const eta = service.getETAForStudent(4000);
    expect(eta.hasActiveTrip).toBe(true);
    expect(eta.stopsAway).toBe(1);
    expect(eta.etaMinutes).toBe(5); // 1 * 5
  });

  test('returns passed=true when bus has passed student stop', () => {
    // Move trip forward past stop 1
    service.arriveAtStop(etaTripId, { stopIndex: 2 });

    // Student 4000 at index 1, trip now at index 2 → passed
    const eta = service.getETAForStudent(4000);
    expect(eta.hasActiveTrip).toBe(true);
    expect(eta.passed).toBe(true);
    expect(eta.message).toBe('الحافلة تجاوزت المحطة');
  });

  test('ETA for student at current stop shows passed', () => {
    // Student 4001 is at 'حي الملقا' (index 2), trip is at index 2
    const eta = service.getETAForStudent(4001);
    expect(eta.hasActiveTrip).toBe(true);
    expect(eta.passed).toBe(true);
  });

  test('ETA for student ahead of current stop', () => {
    // Student 4002 at index 3, trip at index 2 → 1 stop away
    const eta = service.getETAForStudent(4002);
    expect(eta.hasActiveTrip).toBe(true);
    expect(eta.passed).toBe(false);
    expect(eta.stopsAway).toBe(1);
    expect(eta.etaMinutes).toBe(5);
  });

  test('throws for non-existent student', () => {
    expect(() => service.getETAForStudent(99999)).toThrow('الطالب غير موجود');
  });

  test('handles student with no stopName match in route', () => {
    // Register student with stop not in route
    const s = service.registerStudent({
      name: 'طالب بلا محطة',
      busId: 1000,
      parentPhone: '0577777777',
      stopName: 'محطة غير موجودة',
    });
    const eta = service.getETAForStudent(s.id);
    // findIndex returns -1 → studentStopIdx (-1) <= currentIdx (2) → passed
    expect(eta.hasActiveTrip).toBe(true);
    expect(eta.passed).toBe(true);
  });

  test('etaMinutes = stopsAway * 5', () => {
    // Move back trip for testing
    const trip = service.getTripById(etaTripId);
    trip.currentStopIndex = 0;

    const eta = service.getETAForStudent(4002); // index 3, current 0 → 3 stops away
    expect(eta.stopsAway).toBe(3);
    expect(eta.etaMinutes).toBe(15);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 15. EDGE CASES & INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

describe('BusTrackingService — Edge cases', () => {
  test('parseInt handles numeric string IDs across all getById methods', () => {
    expect(service.getBusById('1000').id).toBe(1000);
    expect(service.getRouteById('2001').id).toBe(2001);
    expect(service.getStudentById('4000').id).toBe(4000);
  });

  test('getAllBuses with multiple combined filters', () => {
    const results = service.getAllBuses({ status: 'active', search: 'تويوتا' });
    results.forEach(b => {
      expect(b.status).toBe('active');
      expect(b.model.toLowerCase()).toContain('تويوتا');
    });
  });

  test('boarding history can filter by multiple criteria', () => {
    const history = service.getBoardingHistory({ type: 'boarding', busId: 1000 });
    history.forEach(e => {
      expect(e.type).toBe('boarding');
      expect(e.busId).toBe(1000);
    });
  });

  test('location log in active trip is maintained', () => {
    const active = service.getActiveTrips();
    if (active.length > 0) {
      const trip = active[0];
      expect(Array.isArray(trip.locationLog)).toBe(true);
    }
  });

  test('bus features are stored as array', () => {
    const bus = service.getBusById(1000);
    expect(Array.isArray(bus.features)).toBe(true);
  });

  test('notification has all required fields', () => {
    const notifs = service.getParentNotifications('0512345678');
    if (notifs.length > 0) {
      const n = notifs[0];
      expect(n).toHaveProperty('id');
      expect(n).toHaveProperty('type');
      expect(n).toHaveProperty('parentPhone');
      expect(n).toHaveProperty('message');
      expect(n).toHaveProperty('read');
      expect(n).toHaveProperty('createdAt');
    }
  });

  test('safety alert has all required fields', () => {
    const alerts = service.getSafetyAlerts();
    if (alerts.length > 0) {
      const a = alerts[0];
      expect(a).toHaveProperty('id');
      expect(a).toHaveProperty('type');
      expect(a).toHaveProperty('busId');
      expect(a).toHaveProperty('message');
      expect(a).toHaveProperty('severity');
      expect(a).toHaveProperty('acknowledged');
      expect(a).toHaveProperty('createdAt');
    }
  });

  test('trip type defaults to morning', () => {
    // All trips we started defaulted to morning
    const trips = service.getTripHistory();
    const morningTrips = trips.filter(t => t.type === 'morning');
    expect(morningTrips.length).toBeGreaterThanOrEqual(1);
  });

  test('createBus parses capacity as integer', () => {
    const bus = service.createBus({ plateNumber: 'رقم 7777', capacity: '35' });
    expect(bus.capacity).toBe(35);
  });

  test('student emergencyContact defaults to parentPhone', () => {
    const s = service.registerStudent({
      name: 'طوارئ',
      busId: 1000,
      parentPhone: '0566666666',
    });
    expect(s.emergencyContact).toBe('0566666666');
  });

  test('route estimatedDuration is preserved', () => {
    const route = service.getRouteById(2001);
    expect(route.estimatedDuration).toBe(20);
  });

  test('delete operations remove from Map', () => {
    const bus = service.createBus({ plateNumber: 'مؤقت 1', capacity: 5 });
    expect(service.buses.has(bus.id)).toBe(true);
    service.deleteBus(bus.id);
    expect(service.buses.has(bus.id)).toBe(false);
  });

  test('route delete removes from Map', () => {
    const route = service.createRoute({
      name: 'مسار مؤقت',
      stops: [{ name: 'أ' }, { name: 'ب' }],
    });
    expect(service.routes.has(route.id)).toBe(true);
    service.deleteRoute(route.id);
    expect(service.routes.has(route.id)).toBe(false);
  });
});
