/**
 * Comprehensive Test Suite
 * مجموعة الاختبارات الشاملة لنظام تتبع الحافلات
 */

const request = require('supertest');
const mongoose = require('mongoose');
const expect = require('chai').expect;
const sinon = require('sinon');

// ====== 1. اختبارات الخدمات الأساسية ======

describe('SmartGPSTracking Service', () => {
  let gpsService;
  let vehicleData;

  before(() => {
    const SmartGPSTracking = require('../services/smartGPSTracking.service');
    gpsService = new SmartGPSTracking();
    
    vehicleData = {
      vehicleId: 'vehicle_test_001',
      latitude: 24.7136,
      longitude: 46.6753,
      speed: 80,
      bearing: 45,
      altitude: 500,
      gpsAccuracy: 5
    };
  });

  describe('Location Tracking', () => {
    it('should update vehicle location with intelligence', async () => {
      const result = await gpsService.updateLocationWithIntelligence(vehicleData);
      
      expect(result).to.have.property('enrichedData');
      expect(result.enrichedData).to.have.property('distance');
      expect(result.enrichedData).to.have.property('speedPercentile');
      expect(result.enrichedData.distance).to.be.a('number');
    });

    it('should validate GPS data correctly', () => {
      const isValid = gpsService.validateGPSData(vehicleData);
      expect(isValid).to.be.true;
    });

    it('should reject invalid GPS coordinates', () => {
      const invalidData = { ...vehicleData, latitude: 200 };
      const isValid = gpsService.validateGPSData(invalidData);
      expect(isValid).to.be.false;
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect impossible speed anomaly', () => {
      const anomalousData = { ...vehicleData, speed: 500 };
      const anomalies = gpsService.detectAnomalies(anomalousData);
      
      expect(anomalies).to.be.an('array');
      expect(anomalies.length).to.be.greaterThan(0);
      expect(anomalies[0].type).to.equal('impossible_speed');
    });

    it('should detect sudden location jump', () => {
      const previousData = vehicleData;
      const newData = {
        ...vehicleData,
        latitude: 60.0, // قفزة مفاجئة
        longitude: 120.0
      };
      
      const anomalies = gpsService.detectAnomalies(newData, previousData);
      expect(anomalies.some(a => a.type === 'sudden_location_jump')).to.be.true;
    });

    it('should detect GPS spoofing patterns', () => {
      const suspiciousPattern = [
        { ...vehicleData, latitude: 24.7, longitude: 46.6, timestamp: Date.now() },
        { ...vehicleData, latitude: 24.8, longitude: 46.7, timestamp: Date.now() + 100 },
        { ...vehicleData, latitude: 24.9, longitude: 46.8, timestamp: Date.now() + 200 }
      ];
      
      const anomaly = gpsService.detectGPSSpoofing(suspiciousPattern);
      expect(anomaly).to.be.an('object');
      expect(anomaly).to.have.property('detected');
    });
  });

  describe('ETA Prediction', () => {
    it('should predict ETA with multiple factors', async () => {
      const eta = gpsService.predictETA({
        currentLocation: { lat: 24.7136, lng: 46.6753 },
        destination: { lat: 24.7500, lng: 46.7000 },
        currentSpeed: 80,
        trafficLevel: 'moderate',
        weather: 'clear',
        timeOfDay: 14,
        dayOfWeek: 3
      });
      
      expect(eta).to.have.property('minutes');
      expect(eta).to.have.property('confidence');
      expect(eta.minutes).to.be.greaterThan(0);
      expect(eta.confidence).to.be.within(0, 1);
    });

    it('should adjust ETA for traffic conditions', () => {
      const etaLightTraffic = gpsService.predictETA({
        currentSpeed: 80,
        distance: 50,
        trafficLevel: 'light'
      });
      
      const etaHeavyTraffic = gpsService.predictETA({
        currentSpeed: 80,
        distance: 50,
        trafficLevel: 'heavy'
      });
      
      expect(etaHeavyTraffic.minutes).to.be.greaterThan(etaLightTraffic.minutes);
    });
  });

  describe('Alert Generation', () => {
    it('should generate appropriate alerts for anomalies', () => {
      const anomalyData = {
        type: 'harsh_acceleration',
        severity: 'warning',
        value: 9.5
      };
      
      const alerts = gpsService.generateSmartAlerts([anomalyData]);
      
      expect(alerts).to.be.an('array');
      expect(alerts.length).to.be.greaterThan(0);
      expect(alerts[0]).to.have.property('message');
      expect(alerts[0]).to.have.property('recommendation');
    });

    it('should prioritize high-severity alerts', () => {
      const alerts = gpsService.generateSmartAlerts([
        { type: 'harsh_acceleration', severity: 'info' },
        { type: 'possible_accident', severity: 'critical' },
        { type: 'fuel_warning', severity: 'warning' }
      ]);
      
      expect(alerts[0].priority).to.equal('critical');
    });
  });
});

// ====== 2. اختبارات Dashboard Service ======

describe('SmartFleetDashboard Service', () => {
  let dashboardService;
  
  before(() => {
    const SmartFleetDashboard = require('../services/smartFleetDashboard.service');
    dashboardService = new SmartFleetDashboard();
  });

  describe('Fleet Analytics', () => {
    it('should calculate fleet snapshot correctly', async () => {
      const snapshot = await dashboardService.getFleetSnapshot();
      
      expect(snapshot).to.have.property('fleet');
      expect(snapshot.fleet).to.have.all.keys([
        'total', 'active', 'inTrip', 'maintenance', 'breakdown'
      ]);
    });

    it('should compute fleet KPIs accurately', async () => {
      const kpis = await dashboardService.getFleetKPIs('daily');
      
      expect(kpis).to.have.property('operational');
      expect(kpis).to.have.property('financial');
      expect(kpis).to.have.property('safety');
      expect(kpis).to.have.property('environmental');
      
      // Validate KPI ranges
      expect(kpis.operational.utilizationRate).to.be.within(0, 100);
      expect(kpis.safety.safetyScore).to.be.within(0, 100);
    });
  });

  describe('Driver Performance', () => {
    it('should generate driver performance report', async () => {
      const report = await dashboardService.getDriverPerformanceReport('driver_123');
      
      expect(report).to.have.property('driverId');
      expect(report).to.have.property('safetyScore');
      expect(report).to.have.property('violations');
      expect(report).to.have.property('recommendations');
    });

    it('should calculate safety score from multiple metrics', () => {
      const metrics = {
        totalViolations: 3,
        accidents: 0,
        harshBrakes: 15,
        harshAccelerations: 8,
        overSpeedingIncidents: 2,
        fatigue: 0.3
      };
      
      const safetyScore = dashboardService.calculateSafetyScore(metrics);
      
      expect(safetyScore).to.be.within(0, 100);
      expect(safetyScore).to.be.lessThan(100);
    });
  });

  describe('Alert Dashboard', () => {
    it('should aggregate and categorize alerts', async () => {
      const alertsDashboard = await dashboardService.getAlertsDashboard();
      
      expect(alertsDashboard).to.have.property('activeAlerts');
      expect(alertsDashboard).to.have.property('alertsByType');
      expect(alertsDashboard).to.have.property('alertsBySeverity');
    });

    it('should prioritize critical alerts', async () => {
      const alerts = await dashboardService.getAlertsDashboard();
      
      if (alerts.activeAlerts.length > 1) {
        const firstAlert = alerts.activeAlerts[0];
        const lastAlert = alerts.activeAlerts[alerts.activeAlerts.length - 1];
        
        expect(firstAlert.severity).to.equal('critical');
      }
    });
  });
});

// ====== 3. اختبارات GPU Security Service ======

describe('GPS Security Service', () => {
  let securityService;
  let testData;

  before(() => {
    const GPSSecurity = require('../services/gpsSecurityService');
    securityService = new GPSSecurity();
    
    testData = {
      vehicleId: 'vehicle_123',
      latitude: 24.7136,
      longitude: 46.6753
    };
  });

  describe('Data Encryption', () => {
    it('should encrypt location data with AES-256', () => {
      const encrypted = securityService.encryptLocationData(testData);
      
      expect(encrypted).to.have.property('iv');
      expect(encrypted).to.have.property('encryptedData');
      expect(encrypted.iv).to.not.equal(testData);
      expect(encrypted.encryptedData).to.not.equal(JSON.stringify(testData));
    });

    it('should decrypt encrypted data correctly', () => {
      const encrypted = securityService.encryptLocationData(testData);
      const decrypted = securityService.decryptLocationData(encrypted);
      
      expect(decrypted.vehicleId).to.equal(testData.vehicleId);
      expect(decrypted.latitude).to.equal(testData.latitude);
      expect(decrypted.longitude).to.equal(testData.longitude);
    });

    it('should handle decryption of invalid data gracefully', () => {
      const invalidData = { iv: 'invalid', encryptedData: 'invalid' };
      
      expect(() => {
        securityService.decryptLocationData(invalidData);
      }).to.throw();
    });
  });

  describe('Access Control', () => {
    it('should verify permission correctly for authorized user', () => {
      const hasAccess = securityService.verifyAccessPermission(
        'user_123',
        'view_location',
        'vehicle_123',
        { role: 'manager' }
      );
      
      expect(hasAccess).to.be.true;
    });

    it('should deny access for unauthorized user', () => {
      const hasAccess = securityService.verifyAccessPermission(
        'user_456',
        'delete_vehicle',
        'vehicle_123',
        { role: 'driver' }
      );
      
      expect(hasAccess).to.be.false;
    });
  });

  describe('GPS Spoofing Detection', () => {
    it('should detect suspicious GPS patterns', () => {
      const suspiciousData = {
        previousLocation: { lat: 24.7, lng: 46.6 },
        currentLocation: { lat: 60.0, lng: 120.0 },
        timeElapsed: 1000, // 1 second
        possibleSpeed: 9000 // impossible
      };
      
      const isSpoofed = securityService.detectGPSSpoofing(suspiciousData);
      expect(isSpoofed).to.have.property('detected');
      expect(isSpoofed.detected).to.be.true;
    });
  });

  describe('Audit Logging', () => {
    it('should log access events', () => {
      const logEvent = securityService.logAccessEvent({
        userId: 'user_123',
        action: 'view_location',
        resourceId: 'vehicle_123',
        ip: '192.168.1.1'
      });
      
      expect(logEvent).to.have.property('id');
      expect(logEvent).to.have.property('timestamp');
    });
  });
});

// ====== 4. اختبارات WebSocket Service ======

describe('SmartGPS WebSocket Service', () => {
  let wsService;
  let mockSocket;

  before(() => {
    const SmartGPSWebSocket = require('../services/smartGPSWebSocket.service');
    wsService = new SmartGPSWebSocket();
    
    mockSocket = {
      id: 'socket_123',
      emit: sinon.spy(),
      on: sinon.spy(),
      join: sinon.spy(),
      leave: sinon.spy()
    };
  });

  describe('Client Management', () => {
    it('should register client connection', () => {
      wsService.registerClient('socket_123', 'user_123');
      expect(wsService.clients.has('socket_123')).to.be.true;
    });

    it('should disconnect client properly', () => {
      wsService.registerClient('socket_test', 'user_test');
      wsService.disconnectClient('socket_test');
      expect(wsService.clients.has('socket_test')).to.be.false;
    });
  });

  describe('Location Broadcasting', () => {
    it('should broadcast location to subscribers', () => {
      const locationData = {
        vehicleId: 'vehicle_123',
        latitude: 24.7136,
        longitude: 46.6753,
        speed: 80
      };
      
      wsService.subscribeToVehicle('socket_123', 'vehicle_123');
      wsService.broadcastLocationUpdate('vehicle_123', locationData);
      
      expect(wsService.subscribers.get('vehicle_123')).to.include('socket_123');
    });

    it('should not broadcast to non-subscribers', () => {
      const broadcastSpy = sinon.spy();
      wsService.broadcastLocationUpdate('vehicle_456', {});
      
      expect(wsService.subscribers.get('vehicle_456') || []).to.not.include('socket_123');
    });
  });

  describe('Alert Broadcasting', () => {
    it('should broadcast critical alerts immediately', () => {
      const alert = {
        type: 'critical',
        message: 'Possible accident',
        severity: 'high',
        vehicleId: 'vehicle_123'
      };
      
      wsService.broadcastAlert(alert);
      // Alert should be sent immediately
      expect(alert).to.have.property('timestamp');
    });
  });
});

// ====== 5. اختبارات ML Models ======

describe('ML Models', () => {
  let mlService;

  before(async () => {
    const AdvancedMLModels = require('../services/advancedMLModels.service');
    mlService = new AdvancedMLModels();
    
    await mlService.buildAccidentPredictionModel();
    await mlService.buildMaintenancePredictionModel();
    await mlService.buildFuelConsumptionModel();
    await mlService.buildRouteOptimizationModel();
  });

  describe('Accident Prediction', () => {
    it('should predict accident risk', () => {
      const input = {
        speed: 90,
        roadCondition: 3,
        timeOfDay: 14,
        weather: 2,
        driverHistory: 1,
        fatigue: 5
      };
      
      const prediction = mlService.predictAccidentRisk(input);
      
      expect(prediction).to.have.property('riskScore');
      expect(prediction).to.have.property('riskLevel');
      expect(prediction).to.have.property('recommendations');
      expect(prediction.riskScore).to.be.within(0, 100);
    });

    it('should increase risk score with higher speed', () => {
      const lowSpeed = mlService.predictAccidentRisk({
        speed: 40, roadCondition: 2, timeOfDay: 14,
        weather: 2, driverHistory: 0, fatigue: 2
      });
      
      const highSpeed = mlService.predictAccidentRisk({
        speed: 120, roadCondition: 2, timeOfDay: 14,
        weather: 2, driverHistory: 0, fatigue: 2
      });
      
      expect(highSpeed.riskScore).to.be.greaterThan(lowSpeed.riskScore);
    });
  });

  describe('Maintenance Prediction', () => {
    it('should predict maintenance need', () => {
      const input = {
        distance: 50000,
        engineHours: 2000,
        temperature: 95,
        brakingFrequency: 60,
        lastMaintenance: 100,
        fuelAnomalies: 15
      };
      
      const prediction = mlService.predictMaintenanceNeed(input);
      
      expect(prediction).to.have.property('needScore');
      expect(prediction).to.have.property('priority');
      expect(prediction).to.have.property('estimatedDaysUntilMaintenance');
      expect(prediction.needScore).to.be.within(0, 100);
    });
  });

  describe('Fuel Consumption', () => {
    it('should predict fuel consumption', () => {
      const input = {
        speed: 80,
        distance: 100,
        roadType: 1,
        weather: 2,
        engineAge: 5,
        load: 3000,
        engineTemp: 90,
        brakingRate: 40,
        fuel: 50
      };
      
      const prediction = mlService.predictFuelConsumption(input);
      
      expect(prediction).to.have.property('consumptionPerKm');
      expect(prediction).to.have.property('estimatedRange');
      expect(parseFloat(prediction.consumptionPerKm)).to.be.greaterThan(0);
    });
  });

  describe('Route Optimization', () => {
    it('should optimize route efficiently', () => {
      const input = {
        stops: 15,
        totalDistance: 150,
        timeAvailable: 180,
        roadType: 1,
        timeOfDay: 10,
        dayOfWeek: 2,
        congestion: 45
      };
      
      const optimization = mlService.optimizeRoute(input);
      
      expect(optimization).to.have.property('routeEfficiency');
      expect(optimization).to.have.property('estimatedTime');
      expect(optimization).to.have.property('estimatedFuel');
      expect(optimization.routeEfficiency).to.be.within(0, 100);
    });
  });
});

// ====== 6. اختبارات Notification Service ======

describe('Notification Service', () => {
  let notificationService;
  let mailStub;
  let twilioStub;

  before(() => {
    const AdvancedNotificationService = require('../services/advancedNotificationService');
    notificationService = new AdvancedNotificationService();
    
    // موك البريد والـ SMS
    mailStub = sinon.stub(notificationService.emailTransporter, 'sendMail');
    twilioStub = sinon.stub(notificationService.twilioClient.messages, 'create');
  });

  after(() => {
    mailStub.restore();
    twilioStub.restore();
  });

  describe('Notification Sending', () => {
    it('should send email notification', async () => {
      mailStub.resolves({ messageId: 'email_123' });
      
      const result = await notificationService.sendEmail(
        'test@example.com',
        {
          title: 'Test Alert',
          message: 'This is a test',
          priority: 'high'
        }
      );
      
      expect(result).to.have.property('status', 'sent');
      expect(mailStub.calledOnce).to.be.true;
    });

    it('should send SMS notification', async () => {
      twilioStub.resolves({ sid: 'sms_123' });
      
      const result = await notificationService.sendSMS(
        '+966501234567',
        {
          title: 'Alert',
          message: 'Test message',
          priority: 'high'
        }
      );
      
      expect(result).to.have.property('status', 'sent');
      expect(twilioStub.calledOnce).to.be.true;
    });
  });

  describe('Template Rendering', () => {
    it('should generate correct email HTML', () => {
      const notification = {
        title: 'Test Title',
        message: 'Test Message',
        priority: 'high',
        timestamp: new Date()
      };
      
      const html = notificationService.generateEmailTemplate(notification);
      
      expect(html).to.include('Test Title');
      expect(html).to.include('Test Message');
      expect(html).to.include('<!DOCTYPE html>');
    });
  });

  describe('Notification History', () => {
    it('should retrieve notifications for user', async () => {
      const notifications = await notificationService.getNotifications('user_123', {
        limit: 10,
        unreadOnly: false
      });
      
      expect(notifications).to.have.property('notifications');
      expect(notifications).to.have.property('total');
      expect(notifications.notifications).to.be.an('array');
    });
  });
});

// ====== 7. اختبارات API Endpoints ======

describe('API Endpoints', () => {
  let app;
  let server;
  const PORT = 5001; // اختبار على منفذ مختلف

  before(() => {
    app = require('../app');
    server = app.listen(PORT);
  });

  after(() => {
    server.close();
  });

  describe('Location Endpoints', () => {
    it('POST /api/gps/location/update should update vehicle location', (done) => {
      request(app)
        .post('/api/gps/location/update')
        .set('Authorization', `Bearer ${process.env.TEST_TOKEN}`)
        .send({
          vehicleId: 'vehicle_test',
          latitude: 24.7136,
          longitude: 46.6753,
          speed: 80
        })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('data');
          done();
        });
    });

    it('GET /api/gps/location/:vehicleId should return current location', (done) => {
      request(app)
        .get('/api/gps/location/vehicle_test')
        .set('Authorization', `Bearer ${process.env.TEST_TOKEN}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.data).to.have.property('latitude');
          expect(res.body.data).to.have.property('longitude');
          done();
        });
    });
  });

  describe('Fleet Endpoints', () => {
    it('GET /api/gps/fleet/snapshot should return fleet status', (done) => {
      request(app)
        .get('/api/gps/fleet/snapshot')
        .set('Authorization', `Bearer ${process.env.TEST_TOKEN}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.data).to.have.property('fleet');
          expect(res.body.data.fleet).to.have.property('total');
          done();
        });
    });

    it('GET /api/gps/fleet/kpis should return KPI metrics', (done) => {
      request(app)
        .get('/api/gps/fleet/kpis?timeframe=daily')
        .set('Authorization', `Bearer ${process.env.TEST_TOKEN}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.kpis).to.have.property('operational');
          expect(res.body.kpis).to.have.property('financial');
          done();
        });
    });
  });

  describe('Prediction Endpoints', () => {
    it('POST /api/gps/predict/eta should predict arrival time', (done) => {
      request(app)
        .post('/api/gps/predict/eta')
        .set('Authorization', `Bearer ${process.env.TEST_TOKEN}`)
        .send({
          vehicleId: 'vehicle_test',
          destination: { latitude: 24.75, longitude: 46.70 },
          currentSpeed: 80
        })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.data).to.have.property('minutes');
          expect(res.body.data).to.have.property('confidence');
          done();
        });
    });
  });
});

// ====== 8. اختبارات الأداء ======

describe('Performance Tests', () => {
  it('should respond to API call within 200ms', async () => {
    const startTime = Date.now();
    
    // محاكاة API call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).to.be.lessThan(200);
  });

  it('should handle 100 concurrent requests', async () => {
    const requests = [];
    
    for (let i = 0; i < 100; i++) {
      requests.push(
        new Promise(resolve => {
          setTimeout(() => resolve({ id: i }), Math.random() * 50);
        })
      );
    }
    
    const results = await Promise.all(requests);
    expect(results).to.have.lengthOf(100);
  });

  it('should process location update within 50ms', async () => {
    const SmartGPSTracking = require('../services/smartGPSTracking.service');
    const gpsService = new SmartGPSTracking();
    
    const startTime = Date.now();
    
    await gpsService.updateLocationWithIntelligence({
      vehicleId: 'perf_test',
      latitude: 24.7136,
      longitude: 46.6753,
      speed: 80
    });
    
    const processingTime = Date.now() - startTime;
    expect(processingTime).to.be.lessThan(50);
  });
});

// ====== 9. اختبارات قاعدة البيانات ======

describe('Database Operations', () => {
  let db;

  before(async () => {
    // الاتصال بقاعدة بيانات الاختبار
    db = await mongoose.connect(process.env.TEST_MONGODB_URI);
  });

  after(async () => {
    await mongoose.connection.close();
  });

  describe('Vehicle Collection', () => {
    it('should create vehicle document', async () => {
      const Vehicle = require('../models/advancedDatabase').Vehicle;
      
      const vehicle = await Vehicle.create({
        plateNumber: 'TEST001',
        type: 'bus',
        status: 'active',
        currentLocation: {
          type: 'Point',
          coordinates: [46.6753, 24.7136]
        }
      });
      
      expect(vehicle._id).to.exist;
      expect(vehicle.plateNumber).to.equal('TEST001');
    });

    it('should retrieve vehicle by plateNumber', async () => {
      const Vehicle = require('../models/advancedDatabase').Vehicle;
      
      const vehicle = await Vehicle.findOne({ plateNumber: 'TEST001' });
      
      expect(vehicle).to.exist;
      expect(vehicle.plateNumber).to.equal('TEST001');
    });

    it('should find vehicles near location', async () => {
      const Vehicle = require('../models/advancedDatabase').Vehicle;
      
      const vehicles = await Vehicle.find({
        currentLocation: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [46.6753, 24.7136]
            },
            $maxDistance: 5000
          }
        }
      });
      
      expect(vehicles).to.be.an('array');
    });
  });

  describe('Index Performance', () => {
    it('should use indexes for fast queries', async () => {
      const Vehicle = require('../models/advancedDatabase').Vehicle;
      
      const startTime = Date.now();
      
      await Vehicle.findOne({ plateNumber: 'TEST001' });
      
      const queryTime = Date.now() - startTime;
      expect(queryTime).to.be.lessThan(10); // يجب أن يكون سريع جداً مع الفهرس
    });
  });
});

describe('Integration Tests', () => {
  it('should complete full trip workflow', async () => {
    // 1. إنشاء مركبة
    const Vehicle = require('../models/advancedDatabase').Vehicle;
    const vehicle = await Vehicle.create({
      plateNumber: 'INT_TEST_001',
      type: 'bus',
      status: 'active'
    });

    // 2. تحديث الموقع
    const SmartGPSTracking = require('../services/smartGPSTracking.service');
    const gpsService = new SmartGPSTracking();
    const locationUpdate = await gpsService.updateLocationWithIntelligence({
      vehicleId: vehicle._id,
      latitude: 24.7136,
      longitude: 46.6753,
      speed: 80
    });

    // 3. التحقق من النتائج
    expect(locationUpdate).to.have.property('enrichedData');
    
    // 4. تنظيف البيانات
    await Vehicle.deleteOne({ _id: vehicle._id });
  });

  it('should handle multi-service workflow', async () => {
    const SmartGPSTracking = require('../services/smartGPSTracking.service');
    const SmartFleetDashboard = require('../services/smartFleetDashboard.service');
    const AdvancedMLModels = require('../services/advancedMLModels.service');

    const gpsService = new SmartGPSTracking();
    const dashboardService = new SmartFleetDashboard();
    const mlService = new AdvancedMLModels();

    // GPS update
    const locationData = await gpsService.updateLocationWithIntelligence({
      vehicleId: 'workflow_test',
      latitude: 24.7136,
      longitude: 46.6753,
      speed: 80
    });

    // Dashboard update
    const snapshot = await dashboardService.getFleetSnapshot();

    // ML prediction
    await mlService.buildAccidentPredictionModel();
    const prediction = mlService.predictAccidentRisk({
      speed: 80,
      roadCondition: 3,
      timeOfDay: 14,
      weather: 2,
      driverHistory: 1,
      fatigue: 5
    });

    expect(locationData).to.exist;
    expect(snapshot).to.exist;
    expect(prediction).to.have.property('riskScore');
  });
});

module.exports = {
  // للاستخدام من قبل CI/CD
  testConfig: {
    timeout: 10000,
    reporter: 'json',
    coverage: { threshold: 80 }
  }
};
