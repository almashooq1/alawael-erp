/**
 * Phase 3 MongoDB Integration Test
 * Verifies that all models and services are properly connected to MongoDB
 */

const { connectDB } = require('../config/database');
const dbmodels = require('../models');

describe('Phase 3 - MongoDB Migration Verification', () => {
  let testUserId; // Test user ID for foreign key references

  beforeAll(async () => {
    // Connect to database
    await connectDB();
    // Create a test user for references
    const mongoose = require('mongoose');
    testUserId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    // Cleanup
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  });

  describe('Database Connection', () => {
    test('should connect to MongoDB successfully', async () => {
      const mongoose = require('mongoose');
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
    });
  });

  describe('Model Imports', () => {
    test('should export all Phase 3 models', () => {
      const {
        Asset,
        Schedule,
        Analytics,
        Report,
        DisabilityProgram,
        DisabilitySession,
        Goal,
        Assessment,
        Maintenance,
        MaintenancePrediction,
        Webhook,
        WebhookDelivery,
      } = dbmodels;

      expect(Asset).toBeDefined();
      expect(Schedule).toBeDefined();
      expect(Analytics).toBeDefined();
      expect(Report).toBeDefined();
      expect(DisabilityProgram).toBeDefined();
      expect(DisabilitySession).toBeDefined();
      expect(Goal).toBeDefined();
      expect(Assessment).toBeDefined();
      expect(Maintenance).toBeDefined();
      expect(MaintenancePrediction).toBeDefined();
      expect(Webhook).toBeDefined();
      expect(WebhookDelivery).toBeDefined();
    });
  });

  describe('Asset Model', () => {
    test('should create and save an asset', async () => {
      const { Asset } = dbmodels;

      const testAsset = new Asset({
        name: 'Test Asset',
        category: 'equipment',
        description: 'Test Description',
        value: 5000,
        location: 'Building A',
        status: 'active',
        purchaseDate: new Date(),
        depreciationRate: 0.1,
        createdBy: testUserId,
      });

      const saved = await testAsset.save();
      expect(saved._id).toBeDefined();
      expect(saved.name).toBe('Test Asset');

      // Cleanup
      await Asset.findByIdAndDelete(saved._id);
    });
  });

  describe('Schedule Model', () => {
    test('should create and save a schedule', async () => {
      const { Schedule } = dbmodels;

      const testSchedule = new Schedule({
        title: 'Test Schedule',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        resourceId: 'test-resource-1',
        type: 'meeting',
        status: 'pending',
        createdBy: testUserId,
      });

      const saved = await testSchedule.save();
      expect(saved._id).toBeDefined();
      expect(saved.title).toBe('Test Schedule');

      // Cleanup
      await Schedule.findByIdAndDelete(saved._id);
    });
  });

  describe('Analytics Model with TTL', () => {
    test('should create and save analytics event', async () => {
      const { Analytics } = dbmodels;

      const testEvent = new Analytics({
        eventName: 'test_event',
        module: 'disability',
        action: 'create',
        status: 'success',
        duration: 125,
        statusCode: 200,
        endpoint: '/api/disability',
        method: 'POST',
      });

      const saved = await testEvent.save();
      expect(saved._id).toBeDefined();
      expect(saved.eventName).toBe('test_event');

      // Cleanup
      await Analytics.findByIdAndDelete(saved._id);
    });
  });

  describe('Report Model with TTL', () => {
    test('should create and save a report', async () => {
      const { Report } = dbmodels;

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const testReport = new Report({
        title: 'Test Report',
        type: 'disability-summary',
        format: 'json',
        status: 'completed',
        requestedBy: testUserId,
        requestedAt: new Date(),
        expiresAt: futureDate,
      });

      const saved = await testReport.save();
      expect(saved._id).toBeDefined();
      expect(saved.title).toBe('Test Report');

      // Cleanup
      await Report.findByIdAndDelete(saved._id);
    });
  });

  describe('DisabilityProgram Model', () => {
    test('should create and save a disability program', async () => {
      const { DisabilityProgram } = dbmodels;

      const testProgram = new DisabilityProgram({
        name: 'Test Program',
        category: 'physical',
        duration: 12,
        targetParticipants: 10,
        status: 'active',
      });

      const saved = await testProgram.save();
      expect(saved._id).toBeDefined();
      expect(saved.name).toBe('Test Program');

      // Cleanup
      await DisabilityProgram.findByIdAndDelete(saved._id);
    });
  });

  describe('Maintenance Model', () => {
    test('should create and save maintenance record', async () => {
      const { Maintenance } = dbmodels;

      const testMaintenance = new Maintenance({
        title: 'Test Maintenance',
        type: 'preventive',
        category: 'mechanical',
        priority: 'medium',
        status: 'scheduled',
        createdBy: testUserId,
      });

      const saved = await testMaintenance.save();
      expect(saved._id).toBeDefined();
      expect(saved.title).toBe('Test Maintenance');

      // Cleanup
      await Maintenance.findByIdAndDelete(saved._id);
    });
  });

  describe('Webhook Model', () => {
    test('should create and save webhook', async () => {
      const { Webhook } = dbmodels;

      const testWebhook = new Webhook({
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['asset.created'],
        authType: 'none',
        isActive: true,
      });

      const saved = await testWebhook.save();
      expect(saved._id).toBeDefined();
      expect(saved.name).toBe('Test Webhook');

      // Cleanup
      await Webhook.findByIdAndDelete(saved._id);
    });
  });
});
