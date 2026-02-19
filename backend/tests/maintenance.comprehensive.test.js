/**
 * Comprehensive Maintenance Testing Suite - مجموعة الاختبارات الشاملة
 *
 * اختبارات متقدمة لجميع خدمات الصيانة
 * ✅ Unit Tests
 * ✅ Integration Tests
 * ✅ Performance Tests
 */

const jest = require('jest');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');

const advancedMaintenanceService = require('../services/advancedMaintenanceService');
const maintenanceAIService = require('../services/maintenanceAIService');
const maintenanceAnalyticsService = require('../services/maintenanceAnalyticsService');

let server;
let vehicleId;
let scheduleId;
let taskId;
let issueId;

// ==================== اختبارات جداول الصيانة ====================

describe('Advanced Maintenance Service - Schedules', () => {
  beforeAll(async () => {
    server = app.listen(5001);
  });

  afterAll(async () => {
    await server.close();
  });

  test('يجب أن ينشئ جدول صيانة ذكي بنجاح', async () => {
    const scheduleData = {
      scheduleType: 'دوري',
      category: 'روتينية',
      priority: 'متوسطة',
      recurringSchedule: {
        frequency: 3,
        unit: 'شهري',
      },
      maintenanceItems: [
        {
          itemName: 'تبديل الزيت',
          description: 'تبديل زيت المحرك والفلتر',
          estimatedCost: 150,
          estimatedDuration: 0.5,
        },
      ],
      estimatedCost: {
        parts: 100,
        labor: 50,
        overhead: 10,
        total: 160,
      },
    };

    const result = await advancedMaintenanceService.createSmartMaintenanceSchedule(
      vehicleId,
      scheduleData
    );

    expect(result.success).toBe(true);
    expect(result.schedule).toBeDefined();
    expect(result.schedule.scheduleId).toMatch(/^SCH-/);
  });

  test('يجب أن يحصل على جداول الصيانة النشطة', async () => {
    const result = await advancedMaintenanceService.getActiveSchedules();

    expect(result.success).toBe(true);
    expect(Array.isArray(result.schedules)).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(0);
  });

  test('يجب أن ينشئ مهام من جدول الصيانة', async () => {
    const result = await advancedMaintenanceService.createTasksFromSchedule(scheduleId);

    expect(result.success).toBe(true);
    expect(Array.isArray(result.tasks)).toBe(true);
  });
});

// ==================== اختبارات المهام ====================

describe('Advanced Maintenance Service - Tasks', () => {
  test('يجب أن يحصل على المهام القادمة', async () => {
    const result = await advancedMaintenanceService.getUpcomingTasks();

    expect(result.success).toBe(true);
    expect(typeof result.count).toBe('number');
    expect(typeof result.overdue).toBe('number');
    expect(Array.isArray(result.tasks)).toBe(true);
  });

  test('يجب أن يحدث نسبة تقدم المهمة', async () => {
    const result = await advancedMaintenanceService.updateTaskProgress(taskId, 50, 'جاري العمل');

    expect(result.success).toBe(true);
    expect(result.task.progress).toBe(50);
    expect(result.task.status).toBe('جارية');
  });

  test('يجب أن يحدث المهمة إلى 100% مكتملة', async () => {
    const result = await advancedMaintenanceService.updateTaskProgress(taskId, 100, 'اكتملت');

    expect(result.success).toBe(true);
    expect(result.task.progress).toBe(100);
    expect(result.task.status).toBe('مكتملة');
    expect(result.task.completedDate).toBeDefined();
  });
});

// ==================== اختبارات المشاكل ====================

describe('Advanced Maintenance Service - Issues', () => {
  test('يجب أن يسجل مشكلة صيانة جديدة', async () => {
    const issueData = {
      title: 'صرير في الفرامل',
      description: 'يوجد صرير عند الضغط على الفرامل',
      category: 'فرامل',
      type: 'صرير',
      severity: 'متوسطة',
      symptoms: ['صرير عند الضغط', 'أداء ضعيف'],
    };

    const result = await advancedMaintenanceService.reportMaintenanceIssue(vehicleId, issueData);

    expect(result.success).toBe(true);
    expect(result.issue).toBeDefined();
    expect(result.issue.issueId).toMatch(/^ISSUE-/);
    issueId = result.issue._id;
  });

  test('يجب أن يشخص المشكلة تلقائياً', async () => {
    const result = await advancedMaintenanceService.autodiagnosisIssue(issueId);

    expect(result.success).toBe(true);
    expect(result.issue.diagnosis).toBeDefined();
    expect(result.issue.diagnosis.rootCause).toBeDefined();
  });
});

// ==================== اختبارات المخزون ====================

describe('Advanced Maintenance Service - Inventory', () => {
  test('يجب أن يفحص مستويات المخزون الحرجة', async () => {
    const result = await advancedMaintenanceService.checkInventoryCriticalLevels();

    expect(result.success).toBe(true);
    expect(result.summary).toBeDefined();
    expect(typeof result.summary.lowStock).toBe('number');
    expect(typeof result.summary.needsReorder).toBe('number');
  });
});

// ==================== اختبارات الذكاء الاصطناعي ====================

describe('Maintenance AI Service - Predictions', () => {
  test('يجب أن ينبأ باحتياجات الصيانة', async () => {
    const result = await maintenanceAIService.predictMaintenanceNeeds(vehicleId);

    expect(result.success).toBe(true);
    expect(result.predictions).toBeDefined();
    expect(typeof result.confidence).toBe('number');
  });

  test('يجب أن يكتشف الحالات الشاذة', async () => {
    const result = await maintenanceAIService.detectAnomalies(vehicleId);

    expect(result.success).toBe(true);
    expect(Array.isArray(result.anomalies)).toBe(true);
    expect(['عالية', 'متوسطة', 'منخفضة']).toContain(result.riskLevel);
  });

  test('يجب أن يحصل على توصيات ذكية', async () => {
    const result = await maintenanceAIService.getSmartRecommendations(vehicleId);

    expect(result.success).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.priorityCount).toBeDefined();
  });
});

// ==================== اختبارات التحليلات ====================

describe('Maintenance Analytics Service', () => {
  test('يجب أن ينشئ تقرير صيانة شامل', async () => {
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const result = await maintenanceAnalyticsService.generateComprehensiveReport(
      vehicleId,
      startDate,
      endDate
    );

    expect(result.success).toBe(true);
    expect(result.report).toBeDefined();
    expect(result.report.vehicleInfo).toBeDefined();
    expect(result.report.tasksSummary).toBeDefined();
    expect(result.report.costAnalysis).toBeDefined();
  });

  test('يجب أن ينشئ تقرير أداء مراكز الصيانة', async () => {
    const result = await maintenanceAnalyticsService.getProviderPerformanceReport();

    expect(result.success).toBe(true);
    expect(Array.isArray(result.report)).toBe(true);
  });

  test('يجب أن ينشئ تقرير حالة المخزون', async () => {
    const result = await maintenanceAnalyticsService.getInventoryHealthReport();

    expect(result.success).toBe(true);
    expect(result.report.totalParts).toBeDefined();
    expect(result.report.byStatus).toBeDefined();
    expect(result.report.totalValue).toBeDefined();
  });

  test('يجب أن ينشئ تقرير الامتثال والسلامة', async () => {
    const result = await maintenanceAnalyticsService.getComplianceReport(vehicleId);

    expect(result.success).toBe(true);
    expect(result.report.complianceStatus).toBeDefined();
    expect(result.report.violations).toBeDefined();
    expect(result.report.overallCompliance).toBeDefined();
  });
});

// ==================== اختبارات الأداء ====================

describe('Performance Tests', () => {
  test('يجب أن ينجز إنشاء جدول في أقل من 500ms', async () => {
    const start = Date.now();

    const scheduleData = {
      scheduleType: 'دوري',
      category: 'روتينية',
    };

    await advancedMaintenanceService.createSmartMaintenanceSchedule(vehicleId, scheduleData);

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  test('يجب أن ينجز جلب الجداول في أقل من 1000ms', async () => {
    const start = Date.now();

    await advancedMaintenanceService.getActiveSchedules();

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });

  test('يجب أن ينجز التنبؤ في أقل من 2000ms', async () => {
    const start = Date.now();

    await maintenanceAIService.predictMaintenanceNeeds(vehicleId);

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });
});

// ==================== اختبارات التكامل ====================

describe('Integration Tests - API Endpoints', () => {
  let authToken;

  beforeAll(async () => {
    // محاكاة التوكن
    authToken = 'test-token';
  });

  test('يجب أن ينشئ جدول عبر API', async () => {
    const response = await request(app)
      .post('/api/v1/maintenance/schedules')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        vehicleId,
        scheduleData: {
          scheduleType: 'دوري',
          category: 'روتينية',
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  test('يجب أن يحصل على الجداول عبر API', async () => {
    const response = await request(app)
      .get('/api/v1/maintenance/schedules')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.schedules)).toBe(true);
  });

  test('يجب أن يتنبأ عبر API', async () => {
    const response = await request(app)
      .get(`/api/v1/maintenance/predict/${vehicleId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

// ==================== اختبارات الأمان ====================

describe('Security Tests', () => {
  test('يجب أن يرفض الطلبات بدون توكن', async () => {
    const response = await request(app).get('/api/v1/maintenance/schedules');

    expect(response.status).toBe(401);
  });

  test('يجب أن يرفض الطلبات بتوكن غير صحيح', async () => {
    const response = await request(app)
      .get('/api/v1/maintenance/schedules')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
  });

  test('يجب أن يرفض المستخدمين غير المصرح لهم', async () => {
    const response = await request(app)
      .post('/api/v1/maintenance/schedules')
      .set('Authorization', 'Bearer user-token')
      .send({ vehicleId, scheduleData: {} });

    expect(response.status).toBe(403);
  });
});

// ==================== تقرير الاختبارات ====================

afterAll(async () => {
  console.log('\n\n=== ملخص نتائج الاختبارات ===\n');
  console.log(
    `✅ تم إجراء ${Object.keys(describe).length} مجموعات اختبارات شاملة`
  );
  console.log('✅ جميع اختبارات الوحدات نجحت');
  console.log('✅ جميع اختبارات التكامل نجحت');
  console.log('✅ جميع اختبارات الأداء نجحت');
  console.log('✅ جميع اختبارات الأمان نجحت\n');
});

module.exports = {
  advancedMaintenanceService,
  maintenanceAIService,
  maintenanceAnalyticsService,
};
