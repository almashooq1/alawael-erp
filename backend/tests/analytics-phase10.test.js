const AnalyticsServiceClass = require('../services/analyticsService');
const analyticsService = new AnalyticsServiceClass();
const AnalyticsCache = require('../models/AnalyticsCache');
const Employee = require('../models/Employee');
const Integration = require('../models/Integration');

// Mock Mongoose Models
jest.mock('../models/AnalyticsCache');
jest.mock('../models/Employee');
jest.mock('../models/Integration');
jest.mock('../models/Document');

describe('Analytics Service (Phase 10)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Check if caching logic works
  test('getMetric should return cached data if valid', async () => {
    const mockCache = {
      key: 'hr_overview',
      data: { cached: true },
      expiresAt: new Date(Date.now() + 10000), // Future date
    };
    AnalyticsCache.findOne.mockResolvedValue(mockCache);

    const result = await analyticsService.getHRMetrics();

    expect(result).toEqual({ cached: true });
    expect(AnalyticsCache.findOne).toHaveBeenCalledWith({ key: 'hr_overview' });
    expect(Employee.countDocuments).not.toHaveBeenCalled(); // Should not hit DB
  });

  // Test 2: Check if fresh calculation works
  test('getMetric should calculate fresh data if cache expired/missing', async () => {
    AnalyticsCache.findOne.mockResolvedValue(null);
    Employee.countDocuments.mockResolvedValue(100);
    AnalyticsCache.findOneAndUpdate.mockResolvedValue({});

    const result = await analyticsService.getHRMetrics();

    expect(result.totalEmployees).toBe(100);
    expect(Employee.countDocuments).toHaveBeenCalled();
    expect(AnalyticsCache.findOneAndUpdate).toHaveBeenCalled();
  });

  // Test 3: System Health Aggregation
  test('getSystemHealth should aggregate integration status', async () => {
    AnalyticsCache.findOne.mockResolvedValue(null);
    Integration.countDocuments
      .mockResolvedValueOnce(10) // Total
      .mockResolvedValueOnce(8) // Active
      .mockResolvedValueOnce(1); // Error

    const result = await analyticsService.getSystemHealth();

    expect(result.integrationHealth.total).toBe(10);
    expect(result.integrationHealth.active).toBe(8);
    expect(result.integrationHealth.issues).toBe(1);
  });

  // Test 4: AI Insights Logic
  test('getAIInsights should generate warnings for errors', async () => {
    AnalyticsCache.findOne.mockResolvedValue(null);

    // Mock getHRMetrics internal call
    jest.spyOn(analyticsService, 'getHRMetrics').mockResolvedValue({ activeEmployees: 10 });

    // Mock getSystemHealth internal call
    jest.spyOn(analyticsService, 'getSystemHealth').mockResolvedValue({
      integrationHealth: { issues: 2 },
    });

    const result = await analyticsService.getAIInsights();

    // Should find the MAINTENANCE warning because issues > 0
    const maintenanceInsight = result.find(i => i.category === 'MAINTENANCE');
    expect(maintenanceInsight).toBeDefined();
    expect(maintenanceInsight.severity).toBe('HIGH');
  });
});
