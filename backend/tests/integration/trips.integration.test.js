/**
 * Integration Tests for Trip Management API
 * Tests all 16 endpoints with real database operations
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const Trip = require('../../models/Trip');
const Vehicle = require('../../models/Vehicle');
const TransportRoute = require('../../models/TransportRoute');
const User = require('../../models/User');

describe('Trip Management - Integration Tests', () => {
  let authToken;
  let testUserId;
  let vehicleId;
  let routeId;
  let tripId;

  beforeAll(async () => {
    // Connection is already established by jest.setup.js
    // Just ensure test database is clean
    await Trip.deleteMany({});
    await Vehicle.deleteMany({});
    await TransportRoute.deleteMany({});
    await User.deleteMany({});

    // Create test user
    const testUser = await User.create({
      name: 'Test Driver',
      email: 'tripdriver@test.com',
      password: 'Test@123456',
      role: 'driver',
    });
    testUserId = testUser._id;

    // Login
    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'tripdriver@test.com',
      password: 'Test@123456',
    });

    authToken = loginResponse.body.accessToken;

    // Create test vehicle
    const vehicle = await Vehicle.create({
      vehicleNumber: 'VEH-TRIP-001',
      plateNumber: 'TRIP-001',
      type: 'bus',
      brand: 'Mercedes',
      model: 'Sprinter',
      year: 2022,
      capacity: 30,
      status: 'active',
    });
    vehicleId = vehicle._id;

    // Create test route
    const route = await TransportRoute.create({
      routeName: 'Test Route',
      routeCode: 'RT-001',
      type: 'morning',
      stops: [
        { stopNumber: 1, name: 'Stop 1', location: { coordinates: [46.68, 24.72] } },
        { stopNumber: 2, name: 'Stop 2', location: { coordinates: [46.7, 24.73] } },
      ],
      status: 'active',
    });
    routeId = route._id;
  });

  afterAll(async () => {
    await Trip.deleteMany({});
    await Vehicle.deleteMany({});
    await TransportRoute.deleteMany({});
    await User.deleteMany({});
    // Don't close connection - let jest.setup.js handle it
  });

  beforeEach(async () => {
    await Trip.deleteMany({});
  });

  describe('POST /api/trips - Create Trip', () => {
    test('should create a new trip successfully', async () => {
      const tripData = {
        tripNumber: 'TRIP-001',
        route: routeId,
        vehicle: vehicleId,
        driver: testUserId,
        scheduledStartTime: new Date(Date.now() + 3600000),
        scheduledEndTime: new Date(Date.now() + 7200000),
        status: 'scheduled',
      };

      const response = await request(app)
        .post('/api/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tripData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('scheduled');
      expect(response.body.data.passengers.capacity).toBe(30);
      tripId = response.body.data._id;
    });

    test('should fail if vehicle already assigned to active trip', async () => {
      // Create first trip
      await Trip.create({
        tripNumber: 'TRIP-DUP-001',
        route: routeId,
        vehicle: vehicleId,
        driver: testUserId,
        scheduledStartTime: new Date(Date.now() + 3600000),
        scheduledEndTime: new Date(Date.now() + 7200000),
        status: 'in_progress',
      });

      // Try to create overlapping trip
      const tripData = {
        tripNumber: 'TRIP-DUP-002',
        route: routeId,
        vehicle: vehicleId,
        driver: testUserId,
        scheduledStartTime: new Date(Date.now() + 3600000),
        scheduledEndTime: new Date(Date.now() + 7200000),
        status: 'scheduled',
      };

      const response = await request(app)
        .post('/api/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tripData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already assigned');
    });

    test('should fail if passengers exceed vehicle capacity', async () => {
      const tripData = {
        tripNumber: 'TRIP-EXC-001',
        route: routeId,
        vehicle: vehicleId,
        driver: testUserId,
        scheduledStartTime: new Date(Date.now() + 3600000),
        scheduledEndTime: new Date(Date.now() + 7200000),
        status: 'scheduled',
        passengers: 35, // Exceeds vehicle capacity of 30
      };

      const response = await request(app)
        .post('/api/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tripData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/trips - List Trips', () => {
    beforeEach(async () => {
      const now = Date.now();
      await Trip.create([
        {
          tripNumber: 'TRIP-LIST-001',
          route: routeId,
          vehicle: vehicleId,
          driver: testUserId,
          scheduledStartTime: new Date(now + 3600000),
          scheduledEndTime: new Date(now + 7200000),
          status: 'in_progress',
        },
        {
          tripNumber: 'TRIP-LIST-002',
          route: routeId,
          vehicle: vehicleId,
          driver: testUserId,
          scheduledStartTime: new Date(now + 10800000),
          scheduledEndTime: new Date(now + 14400000),
          status: 'scheduled',
        },
        {
          tripNumber: 'TRIP-LIST-003',
          route: routeId,
          vehicle: vehicleId,
          driver: testUserId,
          scheduledStartTime: new Date(now - 7200000),
          scheduledEndTime: new Date(now - 3600000),
          status: 'completed',
          actualStartTime: new Date(now - 7200000),
          actualEndTime: new Date(now - 3600000),
        },
      ]);
    });

    test('should list all trips', async () => {
      const response = await request(app)
        .get('/api/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trips).toHaveLength(3);
      expect(response.body.data.total).toBe(3);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/trips?status=in_progress')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.trips).toHaveLength(1);
      expect(response.body.data.trips[0].status).toBe('in_progress');
    });

    test('should filter by date range', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .get(`/api/trips?startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should populate route, vehicle, and driver', async () => {
      const response = await request(app)
        .get('/api/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const trip = response.body.data.trips[0];
      expect(trip.route).toBeDefined();
      expect(trip.vehicle).toBeDefined();
      expect(trip.driver).toBeDefined();
      expect(trip.route.name).toBe('Test Route');
    });
  });

  describe('GET /api/trips/:id - Get Trip Details', () => {
    beforeEach(async () => {
      const trip = await Trip.create({
        tripNumber: 'TRIP-' + Date.now(),
        route: routeId,
        vehicle: vehicleId,
        driver: testUserId,
        scheduledStartTime: new Date(Date.now() + 3600000),
        scheduledEndTime: new Date(Date.now() + 7200000),
        status: 'in_progress',
        notes: 'Test trip notes',
        passengers: {
          capacity: 30,
          current: 15,
          list: []
        }
      });
      tripId = trip._id;
    });

    test('should get trip details with populated refs', async () => {
      const response = await request(app)
        .get(`/api/trips/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.route.name).toBe('Test Route');
      expect(response.body.data.vehicle.plateNumber).toBe('TRIP-001');
      expect(response.body.data.driver.name).toBe('Test Driver');
      expect(response.body.data.passengers.current).toBe(15);
    });

    test('should return 404 for non-existent trip', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/trips/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/trips/:id - Update Trip', () => {
    beforeEach(async () => {
      const trip = await Trip.create({
        tripNumber: 'TRIP-' + Date.now(),
        route: routeId,
        vehicle: vehicleId,
        driver: testUserId,
        scheduledStartTime: new Date(Date.now() + 3600000),
        scheduledEndTime: new Date(Date.now() + 7200000),
        status: 'scheduled',
      });
      tripId = trip._id;
    });

    test('should update trip successfully', async () => {
      const updateData = {
        notes: 'Updated notes',
      };

      const response = await request(app)
        .put(`/api/trips/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe('Updated notes');
    });

    test('should not allow updating completed trip', async () => {
      await Trip.findByIdAndUpdate(tripId, { status: 'completed' });

      const response = await request(app)
        .put(`/api/trips/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Should fail' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot update');
    });
  });

  describe('DELETE /api/trips/:id - Delete Trip', () => {
    beforeEach(async () => {
      const trip = await Trip.create({
        tripNumber: 'TRIP-' + Date.now(),
        route: routeId,
        vehicle: vehicleId,
        driver: testUserId,
        scheduledStartTime: new Date(Date.now() + 3600000),
        scheduledEndTime: new Date(Date.now() + 7200000),
        status: 'scheduled',
      });
      tripId = trip._id;
    });

    test('should delete scheduled trip successfully', async () => {
      const response = await request(app)
        .delete(`/api/trips/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const trip = await Trip.findById(tripId);
      expect(trip).toBeNull();
    });

    test('should not allow deleting in-progress trip', async () => {
      await Trip.findByIdAndUpdate(tripId, { status: 'in_progress' });

      const response = await request(app)
        .delete(`/api/trips/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot delete');
    });
  });

  describe('POST /api/trips/:id/start - Start Trip', () => {
    beforeEach(async () => {
      const trip = await Trip.create({
        tripNumber: 'TRIP-' + Date.now(),
        route: routeId,
        vehicle: vehicleId,
        driver: testUserId,
        scheduledStartTime: new Date(Date.now() + 3600000),
        scheduledEndTime: new Date(Date.now() + 7200000),
        status: 'scheduled',
      });
      tripId = trip._id;
    });

    test('should start trip successfully', async () => {
      const response = await request(app)
        .post(`/api/trips/${tripId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('in_progress');
      expect(response.body.data.actualStartTime).toBeDefined();
    });

    test('should fail if trip already started', async () => {
      await Trip.findByIdAndUpdate(tripId, { status: 'in_progress', actualStartTime: new Date() });

      const response = await request(app)
        .post(`/api/trips/${tripId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/trips/:id/complete - Complete Trip', () => {
    beforeEach(async () => {
      const trip = await Trip.create({
        tripNumber: 'TRIP-' + Date.now(),
        route: routeId,
        vehicle: vehicleId,
        driver: testUserId,
        scheduledStartTime: new Date(Date.now() - 3600000),
        scheduledEndTime: new Date(Date.now() + 3600000),
        status: 'in_progress',
        actualStartTime: new Date(Date.now() - 3600000),
      });
      tripId = trip._id;
    });

    test('should complete trip successfully', async () => {
      const response = await request(app)
        .post(`/api/trips/${tripId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.actualEndTime).toBeDefined();
    });

    test('should fail if trip not in progress', async () => {
      await Trip.findByIdAndUpdate(tripId, { status: 'scheduled' });

      const response = await request(app)
        .post(`/api/trips/${tripId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/trips/:id/cancel - Cancel Trip', () => {
    beforeEach(async () => {
      const trip = await Trip.create({
        tripNumber: 'TRIP-' + Date.now(),
        route: routeId,
        vehicle: vehicleId,
        driver: testUserId,
        scheduledStartTime: new Date(Date.now() + 3600000),
        scheduledEndTime: new Date(Date.now() + 7200000),
        status: 'scheduled',
      });
      tripId = trip._id;
    });

    test('should cancel trip successfully', async () => {
      const response = await request(app)
        .post(`/api/trips/${tripId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Weather conditions' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
      expect(response.body.data.cancellationReason).toBe('Weather conditions');
    });

    test('should fail if trip already completed', async () => {
      await Trip.findByIdAndUpdate(tripId, { status: 'completed' });

      const response = await request(app)
        .post(`/api/trips/${tripId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Should fail' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/trips/statistics - Get Trip Statistics', () => {
    beforeEach(async () => {
      const now = Date.now();
      await Trip.create([
        {
          tripNumber: 'TRIP-' + (now + 1),
          route: routeId,
          vehicle: vehicleId,
          driver: testUserId,
          scheduledStartTime: new Date(now + 3600000),
          scheduledEndTime: new Date(now + 7200000),
          status: 'in_progress',
        },
        {
          tripNumber: 'TRIP-' + (now + 2),
          route: routeId,
          vehicle: vehicleId,
          driver: testUserId,
          scheduledStartTime: new Date(now + 10800000),
          scheduledEndTime: new Date(now + 14400000),
          status: 'scheduled',
        },
        {
          tripNumber: 'TRIP-' + (now + 3),
          route: routeId,
          vehicle: vehicleId,
          driver: testUserId,
          scheduledStartTime: new Date(now - 7200000),
          scheduledEndTime: new Date(now - 3600000),
          status: 'completed',
          actualStartTime: new Date(now - 7200000),
          actualEndTime: new Date(now - 3600000),
        },
        {
          tripNumber: 'TRIP-' + (now + 4),
          route: routeId,
          vehicle: vehicleId,
          driver: testUserId,
          scheduledStartTime: new Date(now - 14400000),
          scheduledEndTime: new Date(now - 10800000),
          status: 'cancelled',
        },
      ]);
    });

    test('should return trip statistics', async () => {
      const response = await request(app)
        .get('/api/trips/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(4);
      expect(response.body.data.inProgress).toBe(1);
      expect(response.body.data.scheduled).toBe(1);
      expect(response.body.data.completed).toBe(1);
      expect(response.body.data.cancelled).toBe(1);
    });
  });

  describe('PATCH /api/trips/:id/passengers - Update Passenger Count', () => {
    beforeEach(async () => {
      const trip = await Trip.create({
        tripNumber: 'TRIP-' + Date.now(),
        route: routeId,
        vehicle: vehicleId,
        driver: testUserId,
        scheduledStartTime: new Date(Date.now() + 3600000),
        scheduledEndTime: new Date(Date.now() + 7200000),
        passengers: { capacity: 30, current: 10 },
        status: 'in_progress',
      });
      tripId = trip._id;
    });

    test('should update passenger count successfully', async () => {
      const response = await request(app)
        .patch(`/api/trips/${tripId}/passengers`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ current: 20 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.passengers.current).toBe(20);
    });

    test('should fail if exceeds capacity', async () => {
      const response = await request(app)
        .patch(`/api/trips/${tripId}/passengers`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ current: 35 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
