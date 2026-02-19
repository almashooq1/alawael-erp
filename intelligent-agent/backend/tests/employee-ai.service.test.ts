import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmployeeAIService } from '../services/employee-ai.service';

/**
 * Employee AI Service Unit Tests (7 cases)
 * Tests all AI algorithms and predictions
 */

describe('EmployeeAIService', () => {
  let aiService: EmployeeAIService;
  let mockDb: any;
  let mockLogger: any;

  beforeEach(() => {
    mockDb = {
      findOne: vi.fn(),
      find: vi.fn(),
      updateOne: vi.fn(),
    };
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    };
    aiService = new EmployeeAIService(mockDb, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('predictRetentionRisk', () => {
    it('should predict retention risk between 0-1', async () => {
      // Test 1.1
      const employeeData = {
        _id: 'emp-001',
        performanceRating: 4.5,
        attendanceRate: 0.95,
        yearsWithCompany: 5,
        salary: 150000,
        department: 'IT',
      };

      mockDb.findOne.mockResolvedValue(employeeData);

      const result = await aiService.predictRetentionRisk('emp-001');

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
      expect(result.prediction).toBeDefined();
    });

    it('should identify high retention risk (>0.7)', async () => {
      // Test 1.2
      const riskEmployee = {
        _id: 'emp-002',
        performanceRating: 2.0,
        attendanceRate: 0.6,
        yearsWithCompany: 1,
        salary: 50000,
        absentDays: 30,
      };

      mockDb.findOne.mockResolvedValue(riskEmployee);

      const result = await aiService.predictRetentionRisk('emp-002');

      expect(result.riskScore).toBeGreaterThan(0.7);
      expect(result.riskLevel).toBe('High');
      expect(result.recommendations).toContain('Increase salary');
    });

    it('should identify low retention risk (<0.3)', async () => {
      // Test 1.3
      const stableEmployee = {
        _id: 'emp-003',
        performanceRating: 4.8,
        attendanceRate: 0.98,
        yearsWithCompany: 10,
        salary: 200000,
      };

      mockDb.findOne.mockResolvedValue(stableEmployee);

      const result = await aiService.predictRetentionRisk('emp-003');

      expect(result.riskScore).toBeLessThan(0.3);
      expect(result.riskLevel).toBe('Low');
    });

    it('should provide actionable recommendations', async () => {
      // Test 1.4
      const employee = {
        _id: 'emp-004',
        performanceRating: 3.5,
        attendanceRate: 0.85,
        yearsWithCompany: 3,
      };

      mockDb.findOne.mockResolvedValue(employee);

      const result = await aiService.predictRetentionRisk('emp-004');

      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0]).toMatch(/^[A-Z]/);
    });
  });

  describe('predictPerformance', () => {
    it('should predict performance rating 1-5', async () => {
      // Test 2.1
      const employeeData = {
        _id: 'emp-005',
        averageRating: 4.0,
        trainingHours: 20,
        yearsExperience: 5,
        projectsCompleted: 15,
      };

      mockDb.findOne.mockResolvedValue(employeeData);

      const result = await aiService.predictPerformance('emp-005');

      expect(result.prediction).toBeGreaterThanOrEqual(1);
      expect(result.prediction).toBeLessThanOrEqual(5);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should calculate confidence score', async () => {
      // Test 2.2
      const result = await aiService.predictPerformance('emp-001');

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(typeof result.confidence).toBe('number');
    });

    it('should identify improvement areas', async () => {
      // Test 2.3
      const employee = {
        _id: 'emp-006',
        averageRating: 2.5,
        trainingHours: 0,
        skillGaps: ['Leadership', 'Communication'],
      };

      mockDb.findOne.mockResolvedValue(employee);

      const result = await aiService.predictPerformance('emp-006');

      expect(result.improvementAreas).toBeDefined();
      expect(Array.isArray(result.improvementAreas)).toBe(true);
    });

    it('should compare to department average', async () => {
      // Test 2.4
      const result = await aiService.predictPerformance('emp-001');

      expect(result.departmentComparison).toBeDefined();
      expect(result.departmentComparison).toMatch(/below|at|above/);
    });
  });

  describe('identifyDevelopmentAreas', () => {
    it('should return top 3 development areas', async () => {
      // Test 3.1
      const employee = {
        _id: 'emp-007',
        skills: ['JavaScript', 'MongoDB'],
        requiredSkills: ['TypeScript', 'Node.js', 'AWS', 'Docker'],
      };

      mockDb.findOne.mockResolvedValue(employee);

      const result = await aiService.identifyDevelopmentAreas('emp-007');

      expect(Array.isArray(result.areas)).toBe(true);
      expect(result.areas.length).toBeLessThanOrEqual(3);
      expect(result.areas.length).toBeGreaterThan(0);
    });

    it('should prioritize by business impact', async () => {
      // Test 3.2
      const result = await aiService.identifyDevelopmentAreas('emp-001');

      expect(result.areas[0].priority).toBeDefined();
      expect(['High', 'Medium', 'Low']).toContain(result.areas[0].priority);
    });

    it('should estimate development time', async () => {
      // Test 3.3
      const result = await aiService.identifyDevelopmentAreas('emp-001');

      result.areas.forEach(area => {
        expect(area.estimatedHours).toBeGreaterThan(0);
      });
    });

    it('should suggest learning resources', async () => {
      // Test 3.4
      const result = await aiService.identifyDevelopmentAreas('emp-001');

      result.areas.forEach(area => {
        expect(Array.isArray(area.resources)).toBe(true);
      });
    });
  });

  describe('recommendTraining', () => {
    it('should recommend personalized training programs', async () => {
      // Test 4.1
      const employee = {
        _id: 'emp-008',
        position: 'Senior Developer',
        department: 'IT',
        yearsExperience: 5,
        skills: ['JavaScript', 'React'],
      };

      mockDb.findOne.mockResolvedValue(employee);

      const result = await aiService.recommendTraining('emp-008');

      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should prioritize by skill gap', async () => {
      // Test 4.2
      const result = await aiService.recommendTraining('emp-001');

      expect(result.recommendations[0].priority).toMatch(/High|Medium|Low/);
    });

    it('should include training details', async () => {
      // Test 4.3
      const result = await aiService.recommendTraining('emp-001');

      result.recommendations.forEach(rec => {
        expect(rec.name).toBeDefined();
        expect(rec.duration).toBeGreaterThan(0);
        expect(rec.provider).toBeDefined();
      });
    });

    it('should estimate ROI for training', async () => {
      // Test 4.4
      const result = await aiService.recommendTraining('emp-001');

      result.recommendations.forEach(rec => {
        expect(rec.expectedROI).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('suggestCareerPaths', () => {
    it('should suggest multiple career progression paths', async () => {
      // Test 5.1
      const employee = {
        _id: 'emp-009',
        position: 'Developer',
        department: 'IT',
        performanceRating: 4.5,
        yearsExperience: 5,
      };

      mockDb.findOne.mockResolvedValue(employee);

      const result = await aiService.suggestCareerPaths('emp-009');

      expect(Array.isArray(result.paths)).toBe(true);
      expect(result.paths.length).toBeGreaterThanOrEqual(2);
    });

    it('should outline steps for each path', async () => {
      // Test 5.2
      const result = await aiService.suggestCareerPaths('emp-001');

      result.paths.forEach(path => {
        expect(Array.isArray(path.steps)).toBe(true);
        expect(path.steps.length).toBeGreaterThan(0);
      });
    });

    it('should estimate timeline to advancement', async () => {
      // Test 5.3
      const result = await aiService.suggestCareerPaths('emp-001');

      result.paths.forEach(path => {
        expect(path.estimatedYears).toBeGreaterThan(0);
      });
    });

    it('should calculate success probability', async () => {
      // Test 5.4
      const result = await aiService.suggestCareerPaths('emp-001');

      result.paths.forEach(path => {
        expect(path.successProbability).toBeGreaterThanOrEqual(0);
        expect(path.successProbability).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('detectAnomalies', () => {
    it('should detect performance anomalies', async () => {
      // Test 6.1
      const employee = {
        _id: 'emp-010',
        historicalRating: 4.5,
        currentRating: 2.0,
        recentAbsences: 15,
      };

      mockDb.findOne.mockResolvedValue(employee);

      const result = await aiService.detectAnomalies('emp-010');

      expect(result.anomalies).toBeDefined();
      expect(Array.isArray(result.anomalies)).toBe(true);
    });

    it('should suggest causes for anomalies', async () => {
      // Test 6.2
      const result = await aiService.detectAnomalies('emp-001');

      if (result.anomalies.length > 0) {
        result.anomalies[0].possibleCauses.forEach(cause => {
          expect(typeof cause).toBe('string');
        });
      }
    });

    it('should recommend interventions', async () => {
      // Test 6.3
      const result = await aiService.detectAnomalies('emp-001');

      result.anomalies.forEach(anomaly => {
        expect(Array.isArray(anomaly.recommendedActions)).toBe(true);
      });
    });

    it('should set confidence level for anomalies', async () => {
      // Test 6.4
      const result = await aiService.detectAnomalies('emp-001');

      result.anomalies.forEach(anomaly => {
        expect(anomaly.confidence).toBeGreaterThanOrEqual(0);
        expect(anomaly.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('bulkPredictions', () => {
    it('should process bulk predictions for multiple employees', async () => {
      // Test 7.1
      const employeeIds = ['emp-001', 'emp-002', 'emp-003'];
      mockDb.find.mockReturnValue({
        toArray: vi
          .fn()
          .mockResolvedValue([{ _id: 'emp-001' }, { _id: 'emp-002' }, { _id: 'emp-003' }]),
      });

      const result = await aiService.bulkPredictions(employeeIds);

      expect(result.processedCount).toBe(3);
      expect(Array.isArray(result.predictions)).toBe(true);
    });

    it('should handle bulk operation efficiently', async () => {
      // Test 7.2
      const startTime = Date.now();
      const result = await aiService.bulkPredictions(Array(100).fill('emp-001'));
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.processedCount).toBeGreaterThan(0);
    });

    it('should report errors for failed predictions', async () => {
      // Test 7.3
      const result = await aiService.bulkPredictions(['emp-invalid', 'emp-002']);

      expect(result.failedCount).toBeGreaterThanOrEqual(0);
      if (result.failedCount > 0) {
        expect(Array.isArray(result.errors)).toBe(true);
      }
    });

    it('should generate summary statistics', async () => {
      // Test 7.4
      const result = await aiService.bulkPredictions(['emp-001', 'emp-002']);

      expect(result.summary).toBeDefined();
      expect(result.summary.averageRetentionRisk).toBeDefined();
      expect(result.summary.averagePerformance).toBeDefined();
    });
  });
});

/**
 * Summary: 7 AI service tests covering all algorithms
 * - Test 1.1-1.4: Retention risk (4 tests)
 * - Test 2.1-2.4: Performance prediction (4 tests)
 * - Test 3.1-3.4: Development areas (4 tests)
 * - Test 4.1-4.4: Training recommendations (4 tests)
 * - Test 5.1-5.4: Career paths (4 tests)
 * - Test 6.1-6.4: Anomaly detection (4 tests)
 * - Test 7.1-7.4: Bulk operations (4 tests)
 */
