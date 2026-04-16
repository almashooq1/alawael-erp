/* eslint-disable no-unused-vars */
/**
 * Cross-Phase Integration Tests
 * Tests complete workflows across multiple phases of the system
 * Ensures seamless integration between components
 * Framework v21.0+ with 23 phases
 *
 * Fixed: Removed MongoMemoryServer dep (mongoose already mocked by jest.setup.js).
 *        Made caching calls async (set/get are async in AdvancedCachingService).
 *        Replaced mongoose.Types.ObjectId with simple string IDs.
 */

const RealtimeMonitoringService = require('../../services/realtimeMonitoring.service');
const CachingService = require('../../services/advancedCaching.service');
const MLModelService = require('../../services/mlIntegration.service');

let auditService;
let monitoringService;
let cachingService;
let mlService;

describe('Cross-Phase Integration Workflows', () => {
  beforeEach(() => {
    // Mock AuditLogService (simple jest.fn — no DB needed)
    auditService = {
      createAuditLog: jest.fn(async data => ({
        _id: 'audit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        action: data.action,
        user: data.user,
        data: data.data,
        details: data.details,
        metadata: data,
        phase: data.phase,
        errorMessage: data.errorMessage,
        recovered: data.recovered,
      })),
    };

    // Use real services for monitoring, caching, and ML
    monitoringService = new RealtimeMonitoringService();
    cachingService = new CachingService();
    mlService = new MLModelService();
  });

  describe('Complete User Journey Workflow', () => {
    test('should execute full system workflow from user action to ML prediction', async () => {
      // Phase 1-4: User initiates action
      const auditLog = await auditService.createAuditLog({
        action: 'DATA_PROCESSING_STARTED',
        user: 'test_user',
        details: { timestamp: new Date() },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog._id).toBeDefined();

      // Phase 21: Monitor system metrics
      monitoringService.recordMetric('request_processing_time', 100);
      monitoringService.recordMetric('memory_usage', 65);
      const metrics = monitoringService.getMetrics();
      expect(metrics.length).toBeGreaterThan(0);

      // Phase 22: Cache results (async)
      const cacheKey = `result_${auditLog._id}`;
      await cachingService.set(cacheKey, { success: true, logId: auditLog._id.toString() }, 3600);
      const cached = await cachingService.get(cacheKey);
      expect(cached).toBeDefined();
      expect(cached.logId).toBe(auditLog._id.toString());

      // Phase 23: ML prediction
      mlService.addTrainingData([100, 65], 0.8);
      mlService.addTrainingData([110, 68], 0.85);
      mlService.trainModel('user_journey');
      const prediction = mlService.predict('user_journey', [105, 66]);
      expect(prediction.success).toBe(true);

      // Verify complete chain
      expect(auditLog._id).toBeDefined();
      expect(cached).not.toBeNull();
      expect(prediction.prediction).toBeDefined();
    });

    test('should handle multi-step workflow with monitoring and caching', async () => {
      const workflow = {
        steps: [],
        metrics: [],
        cache: {},
      };

      // Step 1: Record action
      const log = await auditService.createAuditLog({
        action: 'WORKFLOW_STARTED',
        step: 1,
      });
      workflow.steps.push(log._id);

      // Step 2: Monitor performance
      monitoringService.recordMetric('workflow_step_1_duration', 50);
      monitoringService.recordMetric('workflow_step_1_memory', 70);
      workflow.metrics.push(...monitoringService.getMetrics());

      // Step 3: Cache step results (async)
      await cachingService.set('workflow_step1', { completed: true }, 1800);

      // Step 4: Repeat for more steps
      for (let i = 2; i <= 5; i++) {
        const stepLog = await auditService.createAuditLog({
          action: 'WORKFLOW_STEP_COMPLETED',
          step: i,
        });
        workflow.steps.push(stepLog._id);

        monitoringService.recordMetric(`workflow_step_${i}_duration`, 50 + i * 5);
        monitoringService.recordMetric(`workflow_step_${i}_memory`, 70 + i * 2);

        await cachingService.set(`workflow_step${i}`, { completed: true, step: i }, 1800);
      }

      expect(workflow.steps.length).toBe(5);
      expect(workflow.metrics.length).toBeGreaterThan(0);
      const step5 = await cachingService.get('workflow_step5');
      expect(step5).toBeDefined();
    });
  });

  describe('Data Flow Across Phases', () => {
    test('should propagate data through audit, monitoring, caching, and ML', async () => {
      const testData = {
        value1: 100,
        value2: 200,
        value3: 300,
      };

      // Record in audit
      const auditEntry = await auditService.createAuditLog({
        action: 'DATA_FLOW_TEST',
        data: testData,
      });

      // Monitor the metrics
      monitoringService.recordMetric('data_value1', testData.value1);
      monitoringService.recordMetric('data_value2', testData.value2);
      monitoringService.recordMetric('data_value3', testData.value3);

      // Cache the data (async)
      const cacheKey = `dataflow_${auditEntry._id}`;
      await cachingService.set(cacheKey, testData, 3600);
      const cachedData = await cachingService.get(cacheKey);

      // Train ML on the data
      mlService.addTrainingData([testData.value1, testData.value2], testData.value3 / 1000);
      mlService.addTrainingData([150, 250], 0.45);
      mlService.trainModel('data_flow_test');

      // Verify data integrity through chain
      expect(auditEntry.data).toEqual(testData);
      expect(cachedData).toEqual(testData);
      expect(mlService.getModel('data_flow_test')).toBeDefined();
    });

    test('should maintain consistency across multi-phase operations', async () => {
      const initialValue = 42;
      const phases = [];

      // Phase 1: Audit logging
      const phase1 = await auditService.createAuditLog({
        action: 'CONSISTENCY_TEST',
        value: initialValue,
        phase: 1,
      });
      phases.push({ phase: 1, id: phase1._id });

      // Phase 2: Monitoring
      monitoringService.recordMetric('consistency_value', initialValue);
      phases.push({ phase: 2, metrics: monitoringService.getMetrics().length });

      // Phase 3: Caching (async)
      await cachingService.set('consistency_test', { value: initialValue }, 3600);
      const cachedItem = await cachingService.get('consistency_test');
      phases.push({ phase: 3, cached: cachedItem.value });

      // Phase 4: ML
      mlService.addTrainingData([initialValue], 0.5);
      mlService.trainModel('consistency_test');
      const modelExists = mlService.getModel('consistency_test') !== undefined;
      phases.push({ phase: 4, modelTrained: modelExists });

      // Verify all phases processed correctly
      expect(phases).toHaveLength(4);
      phases.forEach((p, index) => {
        expect(p.phase).toBe(index + 1);
      });
    });
  });

  describe('Error Recovery Across Phases', () => {
    test('should handle error in one phase and recover in others', async () => {
      let errorCaught = false;

      try {
        // Try invalid operation
        const result = mlService.predict('nonexistent_model', [1, 2, 3]);
        if (!result.success) {
          errorCaught = true;
        }
      } catch (e) {
        errorCaught = true;
      }

      expect(errorCaught).toBe(true);

      // Recover by using other phases
      const auditLog = await auditService.createAuditLog({
        action: 'ERROR_RECOVERY',
        error: 'Model not found',
        recovered: true,
      });
      expect(auditLog).toBeDefined();

      // Continue monitoring
      monitoringService.recordMetric('recovery_success', 1);
      expect(monitoringService.getMetrics().length).toBeGreaterThan(0);

      // Continue caching (async)
      await cachingService.set('recovery_status', { recovered: true }, 1800);
      const recoveryStatus = await cachingService.get('recovery_status');
      expect(recoveryStatus.recovered).toBe(true);
    });

    test('should maintain audit trail during multi-phase errors', async () => {
      const errorLog = [];

      // Simulate errors in different phases
      const result = mlService.predict('bad_model', []);
      if (!result.success) {
        errorLog.push({ phase: 23, error: result.error || 'ML error' });
      }

      // Log error in audit
      const auditEntry = await auditService.createAuditLog({
        action: 'PHASE_ERROR',
        phase: 23,
        errorMessage: 'ML prediction failed',
        recovered: true,
      });

      // Monitor the recovery
      monitoringService.recordMetric('error_recovered', 1);

      // Cache recovery status (async)
      await cachingService.set(
        'last_error_recovery',
        {
          timestamp: new Date(),
          phase: 23,
        },
        3600
      );

      expect(errorLog.length).toBeGreaterThan(0);
      expect(auditEntry._id).toBeDefined();
      const lastRecovery = await cachingService.get('last_error_recovery');
      expect(lastRecovery).toBeDefined();
    });
  });

  describe('Performance Across Phases', () => {
    test('should measure end-to-end performance', async () => {
      const timing = {};

      // Time audit operation
      const t1 = Date.now();
      const _auditLog = await auditService.createAuditLog({
        action: 'PERFORMANCE_TEST',
      });
      timing.audit = Date.now() - t1;

      // Time monitoring operation
      const t2 = Date.now();
      monitoringService.recordMetric('perf_test', 1);
      timing.monitor = Date.now() - t2;

      // Time caching operation (async)
      const t3 = Date.now();
      await cachingService.set('perf_test', { value: 1 }, 3600);
      timing.cache = Date.now() - t3;

      // Time ML operation
      const t4 = Date.now();
      mlService.addTrainingData([1, 2], 0.5);
      mlService.trainModel('perf_test');
      timing.ml = Date.now() - t4;

      // All operations should complete quickly
      expect(timing.audit).toBeLessThan(500);
      expect(timing.monitor).toBeLessThan(50);
      expect(timing.cache).toBeLessThan(50);
      expect(timing.ml).toBeLessThan(1000);

      // Log performance
      await auditService.createAuditLog({
        action: 'PERFORMANCE_MEASURED',
        timing,
      });
    });

    test('should handle concurrent phase operations efficiently', async () => {
      const operations = [];

      // Launch concurrent operations across phases
      for (let i = 0; i < 20; i++) {
        operations.push(
          auditService.createAuditLog({
            action: 'CONCURRENT_TEST',
            index: i,
          })
        );
        operations.push(
          new Promise(resolve => {
            monitoringService.recordMetric(`concurrent_${i}`, i);
            resolve(true);
          })
        );
        operations.push(cachingService.set(`concurrent_${i}`, { index: i }, 1800));
      }

      const start = Date.now();
      const results = await Promise.all(operations);
      const duration = Date.now() - start;

      expect(results.length).toBe(60); // 20 * 3 operations
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('State Consistency Across Phases', () => {
    test('should maintain state consistency in long-running workflows', async () => {
      const workflowId = 'consistency_test_' + Date.now();
      const state = {
        initialized: false,
        processing: false,
        completed: false,
      };

      // Initialize
      state.initialized = true;
      const _initLog = await auditService.createAuditLog({
        action: 'WORKFLOW_INITIALIZED',
        workflowId,
        state,
      });
      await cachingService.set(workflowId, state, 7200);

      // Process
      state.processing = true;
      await auditService.createAuditLog({
        action: 'WORKFLOW_PROCESSING',
        workflowId,
        state,
      });
      monitoringService.recordMetric(`workflow_${workflowId}_processing`, 1);

      // Complete
      state.processing = false;
      state.completed = true;
      const _completeLog = await auditService.createAuditLog({
        action: 'WORKFLOW_COMPLETED',
        workflowId,
        state,
      });
      monitoringService.recordMetric(`workflow_${workflowId}_completed`, 1);

      // Verify state progression
      const cachedState = await cachingService.get(workflowId);
      expect(cachedState.initialized).toBe(true);
      expect(cachedState.completed).toBe(true);
      expect(cachedState.processing).toBe(false);
    });
  });
});
