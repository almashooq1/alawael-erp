/**
 * Bus Tracking — backend integration tests
 *
 * Tests the /api/bus-tracking endpoints:
 *  - Dashboard & KPIs
 *  - Bus CRUD
 *  - Route CRUD
 *  - Student registration
 *  - Trip lifecycle (start → arrive → end)
 *  - Real-time GPS tracking
 *  - Boarding / alighting
 *  - Parent tracking portal
 *  - Notifications
 *  - Safety alerts & SOS
 */

const request = require('supertest');
const express = require('express');

// ── Minimal auth mock ──
jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'u1', name: 'Test Admin', role: 'admin' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

// Fresh service for each suite
let app;
beforeAll(() => {
  app = express();
  app.use(express.json());
  const router = require('../routes/busTracking.routes');
  app.use('/api/bus-tracking', router);
});

// ══════════════════════════════════════════════════════════
//  1. Dashboard & KPIs
// ══════════════════════════════════════════════════════════

describe('Bus Tracking — Dashboard', () => {
  test('GET /dashboard/overview → returns KPIs', async () => {
    const res = await request(app).get('/api/bus-tracking/dashboard/overview');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { kpi, activeTrips, recentAlerts } = res.body.data;
    expect(kpi).toHaveProperty('totalBuses');
    expect(kpi).toHaveProperty('activeBuses');
    expect(kpi).toHaveProperty('totalRoutes');
    expect(kpi).toHaveProperty('activeTrips');
    expect(kpi).toHaveProperty('totalStudents');
    expect(kpi).toHaveProperty('activeAlerts');
    expect(kpi.totalBuses).toBe(3); // seed
    expect(kpi.totalRoutes).toBe(3);
    expect(kpi.totalStudents).toBe(8);
    expect(Array.isArray(activeTrips)).toBe(true);
    expect(Array.isArray(recentAlerts)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════
//  2. Bus CRUD
// ══════════════════════════════════════════════════════════

describe('Bus Tracking — Bus CRUD', () => {
  test('GET /buses → lists seeded buses', async () => {
    const res = await request(app).get('/api/bus-tracking/buses');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    expect(res.body).toHaveProperty('total');
  });

  test('GET /buses?status=active → filters by status', async () => {
    const res = await request(app).get('/api/bus-tracking/buses?status=active');
    expect(res.status).toBe(200);
    res.body.data.forEach(b => expect(b.status).toBe('active'));
  });

  test('GET /buses?status=maintenance → returns maintenance buses', async () => {
    const res = await request(app).get('/api/bus-tracking/buses?status=maintenance');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    res.body.data.forEach(b => expect(b.status).toBe('maintenance'));
  });

  test('GET /buses?search=تويوتا → searches by model', async () => {
    const res = await request(app).get(
      `/api/bus-tracking/buses?search=${encodeURIComponent('تويوتا')}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  let newBusId;
  test('POST /buses → creates a new bus', async () => {
    const res = await request(app)
      .post('/api/bus-tracking/buses')
      .send({
        plateNumber: 'ت ج ر 4444',
        capacity: 35,
        model: 'مرسيدس سبرنتر',
        driverName: 'عبدالرحمن',
        driverPhone: '0599999999',
        features: ['ac', 'camera'],
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plateNumber).toBe('ت ج ر 4444');
    expect(res.body.data.capacity).toBe(35);
    newBusId = res.body.data.id;
  });

  test('GET /buses/:id → retrieves bus with students', async () => {
    const res = await request(app).get(`/api/bus-tracking/buses/${newBusId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.plateNumber).toBe('ت ج ر 4444');
    expect(Array.isArray(res.body.data.students)).toBe(true);
  });

  test('PUT /buses/:id → updates bus fields', async () => {
    const res = await request(app)
      .put(`/api/bus-tracking/buses/${newBusId}`)
      .send({ color: 'أحمر', status: 'inactive' });
    expect(res.status).toBe(200);
    expect(res.body.data.color).toBe('أحمر');
    expect(res.body.data.status).toBe('inactive');
  });

  test('DELETE /buses/:id → removes bus', async () => {
    const res = await request(app).delete(`/api/bus-tracking/buses/${newBusId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify deletion
    const check = await request(app).get(`/api/bus-tracking/buses/${newBusId}`);
    expect(check.status).toBe(404);
  });

  test('POST /buses → validation error for missing fields', async () => {
    const res = await request(app).post('/api/bus-tracking/buses').send({});
    expect(res.status).toBe(400);
  });

  test('GET /buses/:id → 404 for non-existent', async () => {
    const res = await request(app).get('/api/bus-tracking/buses/99999');
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  3. Route CRUD
// ══════════════════════════════════════════════════════════

describe('Bus Tracking — Route CRUD', () => {
  test('GET /routes → lists seeded routes', async () => {
    const res = await request(app).get('/api/bus-tracking/routes');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  test('GET /routes?type=morning → filters by type', async () => {
    const res = await request(app).get('/api/bus-tracking/routes?type=morning');
    expect(res.status).toBe(200);
    res.body.data.forEach(r => expect(r.type).toBe('morning'));
  });

  let newRouteId;
  test('POST /routes → creates a new route', async () => {
    const res = await request(app)
      .post('/api/bus-tracking/routes')
      .send({
        name: 'المسار الغربي — حي العليا',
        type: 'both',
        stops: [
          { name: 'المركز', lat: 24.71, lng: 46.67 },
          { name: 'حي العليا', lat: 24.72, lng: 46.69 },
          { name: 'حي السلام', lat: 24.73, lng: 46.7 },
        ],
        distance: 10,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toContain('العليا');
    expect(res.body.data.stops.length).toBe(3);
    expect(res.body.data.stops[0].order).toBe(1);
    newRouteId = res.body.data.id;
  });

  test('GET /routes/:id → retrieves route', async () => {
    const res = await request(app).get(`/api/bus-tracking/routes/${newRouteId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.stops.length).toBe(3);
  });

  test('PUT /routes/:id → updates route', async () => {
    const res = await request(app)
      .put(`/api/bus-tracking/routes/${newRouteId}`)
      .send({ description: 'مسار اختبار محدث' });
    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('مسار اختبار محدث');
  });

  test('DELETE /routes/:id → removes route', async () => {
    const res = await request(app).delete(`/api/bus-tracking/routes/${newRouteId}`);
    expect(res.status).toBe(200);
    const check = await request(app).get(`/api/bus-tracking/routes/${newRouteId}`);
    expect(check.status).toBe(404);
  });

  test('POST /routes → validation error for < 2 stops', async () => {
    const res = await request(app)
      .post('/api/bus-tracking/routes')
      .send({ name: 'مسار', stops: [{ name: 'A' }] });
    expect(res.status).toBe(400);
  });

  test('GET /routes/:id → 404 for non-existent', async () => {
    const res = await request(app).get('/api/bus-tracking/routes/99999');
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  4. Student Registration
// ══════════════════════════════════════════════════════════

describe('Bus Tracking — Students', () => {
  // Seeded bus IDs start at 1000
  const seedBusId = 1000;

  test('GET /students/bus/:busId → returns students for seeded bus', async () => {
    const res = await request(app).get(`/api/bus-tracking/students/bus/${seedBusId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    res.body.data.forEach(s => expect(s.busId).toBe(seedBusId));
  });

  let newStudentId;
  test('POST /students → registers a new student', async () => {
    const res = await request(app)
      .post('/api/bus-tracking/students')
      .send({
        name: 'حسن محمود',
        grade: 'الصف الثاني',
        busId: seedBusId,
        parentPhone: '0511111111',
        stopName: 'حي النزهة - محطة 1',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('حسن محمود');
    expect(res.body.data.parentPhone).toBe('0511111111');
    newStudentId = res.body.data.id;
  });

  test('GET /students/:id → retrieves student', async () => {
    const res = await request(app).get(`/api/bus-tracking/students/${newStudentId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('حسن محمود');
  });

  test('POST /students → validation error missing fields', async () => {
    const res = await request(app).post('/api/bus-tracking/students').send({ name: 'Test' });
    expect(res.status).toBe(400);
  });

  test('GET /students/:id → 404 for non-existent', async () => {
    const res = await request(app).get('/api/bus-tracking/students/99999');
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  5. Trip Lifecycle
// ══════════════════════════════════════════════════════════

describe('Bus Tracking — Trip Lifecycle', () => {
  const seedBusId = 1000;
  const seedRouteId = 2000;
  let tripId;

  test('POST /trips/start → starts a new trip', async () => {
    const res = await request(app)
      .post('/api/bus-tracking/trips/start')
      .send({ busId: seedBusId, routeId: seedRouteId, type: 'morning' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('in-progress');
    expect(res.body.data.busId).toBe(seedBusId);
    expect(res.body.data.routeId).toBe(seedRouteId);
    tripId = res.body.data.id;
  });

  test('POST /trips/start → cannot start duplicate trip for same bus', async () => {
    const res = await request(app)
      .post('/api/bus-tracking/trips/start')
      .send({ busId: seedBusId, routeId: seedRouteId });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('GET /trips/active → includes the new trip', async () => {
    const res = await request(app).get('/api/bus-tracking/trips/active');
    expect(res.status).toBe(200);
    expect(res.body.data.some(t => t.id === tripId)).toBe(true);
  });

  test('GET /trips/:id → retrieves trip details', async () => {
    const res = await request(app).get(`/api/bus-tracking/trips/${tripId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(tripId);
    expect(res.body.data.status).toBe('in-progress');
  });

  test('POST /trips/:id/arrive → advances to next stop', async () => {
    const res = await request(app).post(`/api/bus-tracking/trips/${tripId}/arrive`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.stopIndex).toBe(1);
    expect(res.body.data).toHaveProperty('remainingStops');
    expect(res.body.data).toHaveProperty('eta');
  });

  test('POST /trips/:id/arrive → advances again', async () => {
    const res = await request(app).post(`/api/bus-tracking/trips/${tripId}/arrive`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.stopIndex).toBe(2);
  });

  test('POST /trips/:id/end → completes the trip', async () => {
    const res = await request(app).post(`/api/bus-tracking/trips/${tripId}/end`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.endedAt).toBeTruthy();
  });

  test('POST /trips/:id/end → cannot end completed trip', async () => {
    const res = await request(app).post(`/api/bus-tracking/trips/${tripId}/end`).send({});
    expect(res.status).toBe(400);
  });

  test('GET /trips/history → includes completed trip', async () => {
    const res = await request(app).get('/api/bus-tracking/trips/history');
    expect(res.status).toBe(200);
    expect(res.body.data.some(t => t.id === tripId && t.status === 'completed')).toBe(true);
  });

  test('GET /trips/history?busId=... → filters by bus', async () => {
    const res = await request(app).get(`/api/bus-tracking/trips/history?busId=${seedBusId}`);
    expect(res.status).toBe(200);
    res.body.data.forEach(t => expect(t.busId).toBe(seedBusId));
  });

  test('POST /trips/start → validation error for missing fields', async () => {
    const res = await request(app).post('/api/bus-tracking/trips/start').send({});
    expect(res.status).toBe(400);
  });

  test('GET /trips/:id → 404 for non-existent', async () => {
    const res = await request(app).get('/api/bus-tracking/trips/99999');
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  6. Real-Time GPS Tracking
// ══════════════════════════════════════════════════════════

describe('Bus Tracking — GPS Tracking', () => {
  const seedBusId = 1000;

  test('POST /tracking/:busId/location → updates GPS', async () => {
    const res = await request(app)
      .post(`/api/bus-tracking/tracking/${seedBusId}/location`)
      .send({ lat: 24.725, lng: 46.685, speed: 55, heading: 90 });
    expect(res.status).toBe(200);
    expect(res.body.data.lat).toBe(24.725);
    expect(res.body.data.lng).toBe(46.685);
    expect(res.body.data.speed).toBe(55);
  });

  test('GET /tracking/:busId → gets current location', async () => {
    const res = await request(app).get(`/api/bus-tracking/tracking/${seedBusId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.lat).toBe(24.725);
    expect(res.body.data.lng).toBe(46.685);
  });

  test('GET /tracking → all bus locations', async () => {
    const res = await request(app).get('/api/bus-tracking/tracking');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2); // 2 seeded locations
  });

  test('POST /tracking → speed alert triggered for >80 km/h', async () => {
    const seedBusId2 = 1001;
    await request(app)
      .post(`/api/bus-tracking/tracking/${seedBusId2}/location`)
      .send({ lat: 24.7, lng: 46.67, speed: 95 });

    const alerts = await request(app).get('/api/bus-tracking/safety/alerts?type=overspeeding');
    expect(alerts.status).toBe(200);
    expect(alerts.body.data.some(a => a.busId === seedBusId2 && a.type === 'overspeeding')).toBe(
      true,
    );
  });

  test('POST /tracking → validation error for missing lat/lng', async () => {
    const res = await request(app)
      .post(`/api/bus-tracking/tracking/${seedBusId}/location`)
      .send({ speed: 10 });
    expect(res.status).toBe(400);
  });

  test('GET /tracking/:busId → 404 for bus without location', async () => {
    // Bus 1002 (maintenance) might have no location if seed didn't set one
    // Create a new bus, then try to track it
    const busRes = await request(app)
      .post('/api/bus-tracking/buses')
      .send({ plateNumber: 'خ ذ ض 7777', capacity: 20 });
    const newId = busRes.body.data.id;
    const res = await request(app).get(`/api/bus-tracking/tracking/${newId}`);
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  7. Boarding & Alighting
// ══════════════════════════════════════════════════════════

describe('Bus Tracking — Boarding & Alighting', () => {
  const seedBusId2 = 1001;
  const seedRouteId2 = 2001;
  let tripId;

  beforeAll(async () => {
    // Start a trip on bus 2 for boarding tests
    const res = await request(app)
      .post('/api/bus-tracking/trips/start')
      .send({ busId: seedBusId2, routeId: seedRouteId2 });
    tripId = res.body.data.id;
  });

  test('POST /boarding → records boarding event', async () => {
    const studentId = 4003; // نورة سعد on bus 1001
    const res = await request(app)
      .post('/api/bus-tracking/boarding')
      .send({ tripId, studentId, type: 'boarding' });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('boarding');
    expect(res.body.data.studentName).toBe('نورة سعد');
  });

  test('POST /boarding → records alighting event', async () => {
    const studentId = 4003;
    const res = await request(app)
      .post('/api/bus-tracking/boarding')
      .send({ tripId, studentId, type: 'alighting' });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('alighting');
  });

  test('GET /boarding/history → returns events', async () => {
    const res = await request(app).get('/api/bus-tracking/boarding/history');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /boarding/history?tripId → filters by trip', async () => {
    const res = await request(app).get(`/api/bus-tracking/boarding/history?tripId=${tripId}`);
    expect(res.status).toBe(200);
    res.body.data.forEach(e => expect(e.tripId).toBe(tripId));
  });

  test('POST /boarding → validation error for missing fields', async () => {
    const res = await request(app).post('/api/bus-tracking/boarding').send({});
    expect(res.status).toBe(400);
  });

  afterAll(async () => {
    await request(app).post(`/api/bus-tracking/trips/${tripId}/end`).send({});
  });
});

// ══════════════════════════════════════════════════════════
//  8. Parent Tracking Portal
// ══════════════════════════════════════════════════════════

describe('Bus Tracking — Parent Portal', () => {
  const parentPhone = '0512345678'; // parent of عبدالله أحمد + سارة خالد on bus 1000
  const seedBusId = 1000;

  test('GET /parent/dashboard?phone=... → returns parent dashboard', async () => {
    const res = await request(app).get(
      `/api/bus-tracking/parent/dashboard?phone=${parentPhone}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('students');
    expect(res.body.data).toHaveProperty('recentNotifications');
    expect(res.body.data.students.length).toBe(2); // 2 kids same parent
    expect(res.body.data.totalStudents).toBe(2);
  });

  test('GET /parent/dashboard → unknown phone returns empty', async () => {
    const res = await request(app).get('/api/bus-tracking/parent/dashboard?phone=0500000000');
    expect(res.status).toBe(200);
    expect(res.body.data.students.length).toBe(0);
    expect(res.body.data.message).toContain('لم يتم تسجيل');
  });

  test('GET /parent/track/:busId?phone=... → tracks bus for authorized parent', async () => {
    const res = await request(app).get(
      `/api/bus-tracking/parent/track/${seedBusId}?phone=${parentPhone}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('bus');
    expect(res.body.data).toHaveProperty('location');
    expect(res.body.data).toHaveProperty('myStudents');
    expect(res.body.data.bus.plateNumber).toBe('أ ب ج 1234');
  });

  test('GET /parent/track/:busId → 403 for unauthorized parent', async () => {
    const res = await request(app).get(
      `/api/bus-tracking/parent/track/${seedBusId}?phone=0500000000`,
    );
    expect(res.status).toBe(403);
  });

  test('GET /parent/eta/:studentId → returns ETA info', async () => {
    const studentId = 4000; // عبدالله أحمد
    const res = await request(app).get(`/api/bus-tracking/parent/eta/${studentId}`);
    expect(res.status).toBe(200);
    // No active trip = hasActiveTrip: false
    expect(res.body.data).toHaveProperty('hasActiveTrip');
  });

  test('GET /parent/dashboard → validation error without phone', async () => {
    const res = await request(app).get('/api/bus-tracking/parent/dashboard');
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════
//  9. ETA with active trip
// ══════════════════════════════════════════════════════════

describe('Bus Tracking — ETA Calculation', () => {
  const seedBusId = 1000;
  const seedRouteId = 2000;
  let tripId;

  beforeAll(async () => {
    // Start a fresh trip on bus 1000
    const res = await request(app)
      .post('/api/bus-tracking/trips/start')
      .send({ busId: seedBusId, routeId: seedRouteId });
    tripId = res.body.data.id;
  });

  test('ETA → student at stop 1 gets stopsAway estimate', async () => {
    const studentId = 4000; // عبدالله أحمد, stopName: حي النزهة - محطة 1 (index 1)
    const res = await request(app).get(`/api/bus-tracking/parent/eta/${studentId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.hasActiveTrip).toBe(true);
    expect(res.body.data.passed).toBe(false);
    expect(res.body.data.stopsAway).toBeGreaterThanOrEqual(1);
    expect(res.body.data.etaMinutes).toBeGreaterThanOrEqual(5);
    expect(res.body.data.stopName).toContain('النزهة');
  });

  test('ETA → after arriving at stop 2, student at stop 1 shows passed', async () => {
    // Arrive twice to reach stop index 2
    await request(app).post(`/api/bus-tracking/trips/${tripId}/arrive`).send({});
    await request(app).post(`/api/bus-tracking/trips/${tripId}/arrive`).send({});

    const studentId = 4000; // stop index 1
    const res = await request(app).get(`/api/bus-tracking/parent/eta/${studentId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.passed).toBe(true);
  });

  afterAll(async () => {
    await request(app).post(`/api/bus-tracking/trips/${tripId}/end`).send({});
  });
});

// ══════════════════════════════════════════════════════════
//  10. Notifications
// ══════════════════════════════════════════════════════════

describe('Bus Tracking — Notifications', () => {
  const parentPhone = '0512345678';

  test('GET /notifications?phone=... → returns parent notifications', async () => {
    const res = await request(app).get(
      `/api/bus-tracking/notifications?phone=${parentPhone}`,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Trip start notifications should exist from earlier tests
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('type');
    expect(res.body.data[0]).toHaveProperty('message');
    expect(res.body.data[0]).toHaveProperty('read');
  });

  test('PATCH /notifications/:id/read → marks notification read', async () => {
    // Grab first notification
    const list = await request(app).get(
      `/api/bus-tracking/notifications?phone=${parentPhone}`,
    );
    const notifId = list.body.data[0].id;

    const res = await request(app).patch(`/api/bus-tracking/notifications/${notifId}/read`);
    expect(res.status).toBe(200);
    expect(res.body.data.read).toBe(true);
  });

  test('POST /notifications/read-all → marks all as read', async () => {
    const res = await request(app)
      .post('/api/bus-tracking/notifications/read-all')
      .send({ phone: parentPhone });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('markedRead');
    expect(typeof res.body.data.markedRead).toBe('number');
  });

  test('GET /notifications?unreadOnly=true → returns 0 after mark-all-read', async () => {
    const res = await request(app).get(
      `/api/bus-tracking/notifications?phone=${parentPhone}&unreadOnly=true`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  test('GET /notifications → validation error without phone', async () => {
    const res = await request(app).get('/api/bus-tracking/notifications');
    expect(res.status).toBe(400);
  });

  test('PATCH /notifications/:id/read → 404 for non-existent', async () => {
    const res = await request(app).patch('/api/bus-tracking/notifications/99999/read');
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  11. Safety Alerts & SOS
// ══════════════════════════════════════════════════════════

describe('Bus Tracking — Safety Alerts', () => {
  const seedBusId = 1000;

  test('POST /safety/sos/:busId → raises SOS alert', async () => {
    const res = await request(app)
      .post(`/api/bus-tracking/safety/sos/${seedBusId}`)
      .send({ message: 'حالة طوارئ تجريبية' });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('sos');
    expect(res.body.data.severity).toBe('critical');
    expect(res.body.data.busId).toBe(seedBusId);
  });

  test('GET /safety/alerts → includes the SOS alert', async () => {
    const res = await request(app).get('/api/bus-tracking/safety/alerts');
    expect(res.status).toBe(200);
    expect(res.body.data.some(a => a.type === 'sos' && a.busId === seedBusId)).toBe(true);
  });

  test('GET /safety/alerts?severity=critical → filters by severity', async () => {
    const res = await request(app).get('/api/bus-tracking/safety/alerts?severity=critical');
    expect(res.status).toBe(200);
    res.body.data.forEach(a => expect(a.severity).toBe('critical'));
  });

  test('PATCH /safety/alerts/:id/acknowledge → acknowledges alert', async () => {
    const alerts = await request(app).get('/api/bus-tracking/safety/alerts');
    const alertId = alerts.body.data.find(a => a.type === 'sos').id;

    const res = await request(app).patch(`/api/bus-tracking/safety/alerts/${alertId}/acknowledge`);
    expect(res.status).toBe(200);
    expect(res.body.data.acknowledged).toBe(true);
    expect(res.body.data.acknowledgedAt).toBeTruthy();
  });

  test('PATCH /safety/alerts/:id/acknowledge → 404 for non-existent', async () => {
    const res = await request(app).patch('/api/bus-tracking/safety/alerts/99999/acknowledge');
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  12. Full Trip Flow Integration
// ══════════════════════════════════════════════════════════

describe('Bus Tracking — Full Trip Flow', () => {
  const bus3 = 1002; // ز ح ط 9012 (maintenance)
  const route3 = 2002;

  test('Full flow: activate bus → start trip → GPS → board → arrive → alight → end', async () => {
    // 1) Activate bus (it's in maintenance)
    const activate = await request(app)
      .put(`/api/bus-tracking/buses/${bus3}`)
      .send({ status: 'active' });
    expect(activate.body.data.status).toBe('active');

    // 2) Start trip
    const start = await request(app)
      .post('/api/bus-tracking/trips/start')
      .send({ busId: bus3, routeId: route3, type: 'afternoon' });
    expect(start.status).toBe(201);
    const tripId = start.body.data.id;

    // 3) Send GPS
    const gps = await request(app)
      .post(`/api/bus-tracking/tracking/${bus3}/location`)
      .send({ lat: 24.715, lng: 46.7, speed: 40 });
    expect(gps.status).toBe(200);

    // 4) Board student
    const studentId = 4006; // عمر بدر on bus 1002
    const board = await request(app)
      .post('/api/bus-tracking/boarding')
      .send({ tripId, studentId, type: 'boarding' });
    expect(board.status).toBe(201);

    // 5) Arrive at stop
    const arrive = await request(app)
      .post(`/api/bus-tracking/trips/${tripId}/arrive`)
      .send({});
    expect(arrive.status).toBe(200);

    // 6) Student alights
    const alight = await request(app)
      .post('/api/bus-tracking/boarding')
      .send({ tripId, studentId, type: 'alighting' });
    expect(alight.status).toBe(201);

    // 7) End trip
    const end = await request(app)
      .post(`/api/bus-tracking/trips/${tripId}/end`)
      .send({});
    expect(end.status).toBe(200);
    expect(end.body.data.status).toBe('completed');

    // 8) Verify parent received notifications
    const parentPhone = '0556789012'; // عمر بدر's parent
    const notifs = await request(app).get(
      `/api/bus-tracking/notifications?phone=${parentPhone}`,
    );
    expect(notifs.body.data.length).toBeGreaterThanOrEqual(4);
    // Should have: trip_started, student_boarded, bus_arriving/student_alighted, trip_completed
    const types = notifs.body.data.map(n => n.type);
    expect(types).toContain('trip_started');
    expect(types).toContain('student_boarded');
    expect(types).toContain('trip_completed');
  });
});

// ══════════════════════════════════════════════════════════
//  13. Dashboard after operations
// ══════════════════════════════════════════════════════════

describe('Bus Tracking — Post-Operations Dashboard', () => {
  test('Dashboard reflects all operations performed', async () => {
    const res = await request(app).get('/api/bus-tracking/dashboard/overview');
    expect(res.status).toBe(200);
    const { kpi } = res.body.data;
    // At minimum 3 seeded buses + 1 created in GPS tests
    expect(kpi.totalBuses).toBeGreaterThanOrEqual(3);
    expect(kpi.totalRoutes).toBeGreaterThanOrEqual(3);
    expect(kpi.totalStudents).toBeGreaterThanOrEqual(8);
    // Today's trips from our tests
    expect(kpi.todayTrips).toBeGreaterThanOrEqual(1);
    // Boarding events happened
    expect(kpi.totalBoardingToday).toBeGreaterThanOrEqual(1);
  });
});
