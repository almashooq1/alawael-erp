/**
 * Integration Tests for Vehicle Management API
 * Tests all 13 endpoints with real database operations
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const Vehicle = require('../../models/Vehicle');
const User = require('../../models/User');

describe('Vehicle Management - Integration Tests', () => {
  let authToken;
  let testUserId;
  let vehicleId;

  // Setup: Create test user and get auth token
  let testDriverId;
  beforeAll(async () => {
    // Connection is already established by jest.setup.js
    // Just ensure test database is clean
    await Vehicle.deleteMany({});
    await User.deleteMany({});

    // Create test user (manager for token)
    const testUser = await User.create({
      name: 'Test Manager',
      email: 'testmanager@test.com',
      password: 'Test@123456',
      role: 'manager',
    });
    testUserId = testUser._id;

    // Create test driver user
    const testDriver = await User.create({
      name: 'Test Driver',
      email: 'testdriver@test.com',
      password: 'Test@123456',
      role: 'driver',
    });
    testDriverId = testDriver._id;

    // Login to get token
    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'testmanager@test.com',
      password: 'Test@123456',
    });

    authToken = loginResponse.body.accessToken;
  });

  // Cleanup after all tests
  afterAll(async () => {
    await Vehicle.deleteMany({});
    await User.deleteMany({});
    // Don't close connection - let jest.setup.js handle it
  });

  // Clear vehicles before each test
  beforeEach(async () => {
    await Vehicle.deleteMany({});
  });

  describe('POST /api/vehicles - Create Vehicle', () => {
    test('should create a new vehicle successfully', async () => {
      const vehicleData = {
        vehicleNumber: 'VEH-ABC-001',
        plateNumber: 'ABC-1234',
        type: 'bus',
        brand: 'Mercedes',
        model: 'Sprinter',
        year: 2022,
        capacity: 30,
        status: 'active',
        fuelType: 'diesel',
        fuelLevel: 80,
      };

      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(vehicleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.plateNumber).toBe('ABC-1234');
      expect(response.body.data.type).toBe('bus');
      vehicleId = response.body.data._id;
    });

    test('should fail with duplicate plate number', async () => {
      const vehicleData = {
        vehicleNumber: 'VEH-DUP-001',
        plateNumber: 'DUP-1234',
        type: 'van',
        brand: 'Ford',
        model: 'Transit',
        year: 2021,
        capacity: 15,
      };

      // Create first vehicle
      await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(vehicleData);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(vehicleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    test('should fail with invalid year range', async () => {
      const vehicleData = {
        plateNumber: 'INV-1234',
        type: 'car',
        make: 'Toyota',
        model: 'Camry',
        year: 1985, // Invalid: before 1990
        capacity: 5,
      };

      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(vehicleData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/vehicles - List Vehicles', () => {
    beforeEach(async () => {
      // Create test vehicles
      await Vehicle.create([
        {
          vehicleNumber: 'VEH-001',
          plateNumber: 'BUS-001',
          type: 'bus',
          brand: 'Mercedes',
          model: 'Sprinter',
          year: 2022,
          capacity: 30,
          status: 'active',
          fuelLevel: 75,
        },
        {
          vehicleNumber: 'VEH-002',
          plateNumber: 'VAN-001',
          type: 'van',
          brand: 'Ford',
          model: 'Transit',
          year: 2021,
          capacity: 15,
          status: 'maintenance',
          fuelLevel: 50,
        },
        {
          vehicleNumber: 'VEH-003',
          plateNumber: 'CAR-001',
          type: 'car',
          brand: 'Toyota',
          model: 'Camry',
          year: 2020,
          capacity: 5,
          status: 'active',
          fuelLevel: 10,
        },
      ]);
    });

    test('should list all vehicles', async () => {
      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.vehicles).toHaveLength(3);
      expect(response.body.data.total).toBe(3);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/vehicles?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.vehicles).toHaveLength(2);
      expect(response.body.data.vehicles[0].status).toBe('active');
      expect(response.body.data.vehicles[1].status).toBe('active');
    });

    test('should filter by type', async () => {
      const response = await request(app)
        .get('/api/vehicles?type=bus')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.vehicles).toHaveLength(1);
      expect(response.body.data.vehicles[0].type).toBe('bus');
    });

    test('should search by plate number', async () => {
      const response = await request(app)
        .get('/api/vehicles?search=BUS')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.vehicles).toHaveLength(1);
      expect(response.body.data.vehicles[0].plateNumber).toBe('BUS-001');
    });

    test('should paginate results', async () => {
      const response = await request(app)
        .get('/api/vehicles?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.vehicles).toHaveLength(2);
      expect(response.body.data.currentPage).toBe(1);
      expect(response.body.data.totalPages).toBe(2);
    });
  });

  describe('GET /api/vehicles/:id - Get Vehicle Details', () => {
    beforeEach(async () => {
      const vehicle = await Vehicle.create({
        vehicleNumber: 'VEH-DETAIL-001',
        plateNumber: 'DETAIL-001',
        type: 'bus',
        brand: 'Mercedes',
        model: 'Sprinter',
        year: 2022,
        capacity: 30,
        status: 'active',
        driver: testDriverId,
      });
      vehicleId = vehicle._id;
    });

    test('should get vehicle details with populated driver', async () => {
      const response = await request(app)
        .get(`/api/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.plateNumber).toBe('DETAIL-001');
      expect(response.body.data.driver).toBeDefined();
      expect(response.body.data.driver.name).toBe('Test Driver');
    });

    test('should return 404 for non-existent vehicle', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/vehicles/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/vehicles/:id - Update Vehicle', () => {
    beforeEach(async () => {
      const vehicle = await Vehicle.create({
        vehicleNumber: 'VEH-UPDATE-001',
        plateNumber: 'UPDATE-001',
        type: 'van',
        brand: 'Ford',
        model: 'Transit',
        year: 2021,
        capacity: 15,
        status: 'active',
      });
      vehicleId = vehicle._id;
    });

    test('should update vehicle successfully', async () => {
      const updateData = {
        status: 'maintenance',
        fuelLevel: 60,
        mileage: 50000,
      };

      const response = await request(app)
        .put(`/api/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('maintenance');
      expect(response.body.data.fuelLevel).toBe(60);
      expect(response.body.data.mileage).toBe(50000);
    });

    test('should not allow updating to duplicate plate number', async () => {
      // Create another vehicle
      await Vehicle.create({
        vehicleNumber: 'VEH-OTHER-001',
        plateNumber: 'OTHER-001',
        type: 'car',
        brand: 'Toyota',
        model: 'Camry',
        year: 2020,
        capacity: 5,
      });

      const response = await request(app)
        .put(`/api/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ plateNumber: 'OTHER-001' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/vehicles/:id - Delete Vehicle', () => {
    beforeEach(async () => {
      const vehicle = await Vehicle.create({
        vehicleNumber: 'VEH-DELETE-001',
        plateNumber: 'DELETE-001',
        type: 'car',
        brand: 'Toyota',
        model: 'Camry',
        year: 2020,
        capacity: 5,
        status: 'active',
      });
      vehicleId = vehicle._id;
    });

    test('should delete vehicle successfully', async () => {
      const response = await request(app)
        .delete(`/api/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify deletion
      const vehicle = await Vehicle.findById(vehicleId);
      expect(vehicle).toBeNull();
    });

    test('should return 404 for non-existent vehicle', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/vehicles/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/vehicles/statistics - Get Statistics', () => {
    beforeEach(async () => {
      await Vehicle.create([
        {
          vehicleNumber: 'VEH-STAT-001',
          plateNumber: 'STAT-001',
          type: 'bus',
          brand: 'Mercedes',
          model: 'Sprinter',
          year: 2022,
          capacity: 30,
          status: 'active',
          fuelLevel: 80,
        },
        {
          vehicleNumber: 'VEH-STAT-002',
          plateNumber: 'STAT-002',
          type: 'van',
          brand: 'Ford',
          model: 'Transit',
          year: 2021,
          capacity: 15,
          status: 'inactive',
          fuelLevel: 60,
        },
        {
          vehicleNumber: 'VEH-STAT-003',
          plateNumber: 'STAT-003',
          type: 'car',
          brand: 'Toyota',
          model: 'Camry',
          year: 2020,
          capacity: 5,
          status: 'maintenance',
          fuelLevel: 15,
        },
        {
          vehicleNumber: 'VEH-STAT-004',
          plateNumber: 'STAT-004',
          type: 'bus',
          brand: 'Mercedes',
          model: 'Sprinter',
          year: 2019,
          capacity: 30,
          status: 'active',
          fuelLevel: 10,
        },
      ]);
    });

    test('should return vehicle statistics', async () => {
      const response = await request(app)
        .get('/api/vehicles/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(4);
      expect(response.body.data.active).toBe(2);
      expect(response.body.data.maintenance).toBe(1);
      expect(response.body.data.outOfService).toBe(1);
      expect(response.body.data.byType.bus).toBe(2);
      expect(response.body.data.byType.van).toBe(1);
      expect(response.body.data.byType.car).toBe(1);
      expect(response.body.data.lowFuelCount).toBeGreaterThan(0);
    });
  });

  describe('PATCH /api/vehicles/:id/gps - Update GPS Location', () => {
    beforeEach(async () => {
      const vehicle = await Vehicle.create({
        vehicleNumber: 'VEH-GPS-001',
        plateNumber: 'GPS-001',
        type: 'bus',
        brand: 'Mercedes',
        model: 'Sprinter',
        year: 2022,
        capacity: 30,
        status: 'active',
      });
      vehicleId = vehicle._id;
    });

    test('should update GPS location successfully', async () => {
      const gpsData = {
        latitude: 24.7136,
        longitude: 46.6753,
        speed: 60,
        heading: 45,
      };

      const response = await request(app)
        .patch(`/api/vehicles/${vehicleId}/gps`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(gpsData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentLocation).toBeDefined();
      expect(response.body.data.currentLocation.coordinates).toEqual([46.6753, 24.7136]);
      expect(response.body.data.currentSpeed).toBe(60);
    });

    test('should fail with invalid coordinates', async () => {
      const gpsData = {
        latitude: 200, // Invalid
        longitude: 300, // Invalid
      };

      const response = await request(app)
        .patch(`/api/vehicles/${vehicleId}/gps`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(gpsData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/vehicles/:id/maintenance - Add Maintenance Record', () => {
    beforeEach(async () => {
      const vehicle = await Vehicle.create({
        vehicleNumber: 'VEH-MAINT-001',
        plateNumber: 'MAINT-001',
        type: 'bus',
        brand: 'Mercedes',
        model: 'Sprinter',
        year: 2022,
        capacity: 30,
        status: 'active',
      });
      vehicleId = vehicle._id;
    });

    test('should add maintenance record successfully', async () => {
      const maintenanceData = {
        type: 'preventive',
        description: 'Oil change and filter replacement',
        cost: 500,
        workshop: 'Main Service Center',
      };

      const response = await request(app)
        .post(`/api/vehicles/${vehicleId}/maintenance`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(maintenanceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.maintenanceHistory).toHaveLength(1);
      expect(response.body.data.maintenanceHistory[0].type).toBe('preventive');
    });
  });

  describe('GET /api/vehicles/low-fuel - Get Low Fuel Vehicles', () => {
    beforeEach(async () => {
      await Vehicle.create([
        {
          vehicleNumber: 'VEH-FUEL-001',
          plateNumber: 'FUEL-001',
          type: 'bus',
          brand: 'Mercedes',
          model: 'Sprinter',
          year: 2022,
          capacity: 30,
          status: 'active',
          fuelLevel: 15,
        },
        {
          vehicleNumber: 'VEH-FUEL-002',
          plateNumber: 'FUEL-002',
          type: 'van',
          brand: 'Ford',
          model: 'Transit',
          year: 2021,
          capacity: 15,
          status: 'active',
          fuelLevel: 80,
        },
        {
          vehicleNumber: 'VEH-FUEL-003',
          plateNumber: 'FUEL-003',
          type: 'car',
          brand: 'Toyota',
          model: 'Camry',
          year: 2020,
          capacity: 5,
          status: 'active',
          fuelLevel: 10,
        },
      ]);
    });

    test('should return vehicles with fuel below threshold', async () => {
      const response = await request(app)
        .get('/api/vehicles/low-fuel?threshold=20')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(v => v.fuelLevel < 20)).toBe(true);
    });
  });

  describe('Authentication & Authorization', () => {
    test('should fail without auth token', async () => {
      const response = await request(app).get('/api/vehicles').expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
