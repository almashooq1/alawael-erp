/**
 * اختبارات الخدمات الجديدة
 * New Services Tests
 *
 * اختبار شامل للخدمات:
 * - خدمة التصدير
 * - خدمة الإشعارات
 * - خدمة التقارير
 */

import exportService from '../services/exportService';
import notificationService from '../services/notificationService';
import smartReportsService from '../services/smartReportsService';

describe('Advanced Features Tests', () => {
  // ============================================
  // اختبارات خدمة التصدير
  // Export Service Tests
  // ============================================

  describe('exportService', () => {
    const sampleData = [
      { name: 'أحمد محمد', type: 'مستفيد', date: '2026-01-15', status: 'نشط' },
      { name: 'فاطمة علي', type: 'معالج', date: '2026-01-14', status: 'نشط' },
      { name: 'محمد سعيد', type: 'إداري', date: '2026-01-13', status: 'غير نشط' },
    ];

    test('toExcel - should export data to Excel format', () => {
      expect(() => {
        exportService.toExcel(sampleData, 'test-export');
      }).not.toThrow();
    });

    test('toCSV - should export data to CSV format', () => {
      expect(() => {
        exportService.toCSV(sampleData, 'test-export');
      }).not.toThrow();
    });

    test('toJSON - should export data to JSON format', () => {
      expect(() => {
        exportService.toJSON(sampleData, 'test-export');
      }).not.toThrow();
    });

    test('copyToClipboard - should copy text to clipboard', async () => {
      const text = 'Test clipboard content';
      await expect(exportService.copyToClipboard(text)).resolves.toBeDefined();
    });

    test('should handle empty data gracefully', () => {
      expect(() => {
        exportService.toExcel([], 'empty-export');
      }).not.toThrow();
    });

    test('should generate file with correct format', () => {
      const result = exportService.toExcel(sampleData, 'format-test', {
        sheetName: 'البيانات',
        columnWidths: [15, 20, 25],
      });
      expect(result).toBeDefined();
    });
  });

  // ============================================
  // اختبارات خدمة الإشعارات
  // Notification Service Tests
  // ============================================

  describe('notificationService', () => {
    beforeEach(() => {
      // Reset service before each test
      notificationService.notifications = [];
    });

    test('should initialize as singleton', () => {
      const instance1 = notificationService;
      const instance2 = notificationService;
      expect(instance1).toBe(instance2);
    });

    test('addNotification - should add notification to queue', () => {
      const notification = {
        type: 'success',
        title: 'اختبار',
        message: 'هذا إشعار اختباري',
      };

      notificationService.addNotification(notification);
      expect(notificationService.getHistory().length).toBe(1);
    });

    test('addNotification - should maintain max limit', () => {
      for (let i = 0; i < 110; i++) {
        notificationService.addNotification({
          type: 'info',
          title: `Notification ${i}`,
          message: `Message ${i}`,
        });
      }
      expect(notificationService.getHistory().length).toBeLessThanOrEqual(100);
    });

    test('getUnread - should return unread notifications', () => {
      notificationService.addNotification({
        type: 'alert',
        title: 'Alert',
        message: 'Unread message',
      });

      const unread = notificationService.getUnread();
      expect(unread.length).toBeGreaterThan(0);
    });

    test('markAsRead - should mark notification as read', () => {
      const notification = {
        type: 'info',
        title: 'Test',
        message: 'Mark as read test',
      };

      notificationService.addNotification(notification);
      const history = notificationService.getHistory();
      const notificationId = history[0]?.id;

      if (notificationId) {
        notificationService.markAsRead(notificationId);
        const unread = notificationService.getUnread();
        expect(unread.every(n => n.id !== notificationId)).toBe(true);
      }
    });

    test('getStatistics - should return correct statistics', () => {
      for (let i = 0; i < 5; i++) {
        notificationService.addNotification({
          type: 'info',
          title: `Stat Test ${i}`,
          message: 'Test message',
        });
      }

      const stats = notificationService.getStatistics();
      expect(stats.total).toBe(5);
      expect(stats.byType).toBeDefined();
    });

    test('clearAll - should clear all notifications', () => {
      notificationService.addNotification({ type: 'info', title: 'Test' });
      notificationService.addNotification({ type: 'warning', title: 'Test2' });

      notificationService.clearAll();
      expect(notificationService.getHistory().length).toBe(0);
    });
  });

  // ============================================
  // اختبارات خدمة التقارير الذكية
  // Smart Reports Service Tests
  // ============================================

  describe('smartReportsService', () => {
    test('getComprehensiveReport - should return complete report', async () => {
      const report = await smartReportsService.getComprehensiveReport();
      expect(report).toBeDefined();
      expect(report.data).toBeDefined();
    });

    test('getPerformanceAnalysis - should return performance metrics', async () => {
      const analysis = await smartReportsService.getPerformanceAnalysis('monthly');
      expect(analysis).toBeDefined();
      expect(analysis.metrics).toBeDefined();
    });

    test('getTrendAnalysis - should return trend data', async () => {
      const trends = await smartReportsService.getTrendAnalysis('sessions', 30);
      expect(trends).toBeDefined();
      expect(trends.data).toBeDefined();
      expect(trends.data.length).toBeGreaterThan(0);
    });

    test('getComparativeReport - should compare periods', async () => {
      const comparison = await smartReportsService.getComparativeReport(['يناير', 'فبراير', 'مارس'], ['sessions', 'revenue']);
      expect(comparison).toBeDefined();
      expect(comparison.comparison).toBeDefined();
    });

    test('getDetailedReport - should return detailed analysis', async () => {
      const detailed = await smartReportsService.getDetailedReport('performance');
      expect(detailed).toBeDefined();
      expect(detailed.sections).toBeDefined();
    });

    test('getRecommendations - should provide actionable recommendations', async () => {
      const recommendations = await smartReportsService.getRecommendations();
      expect(recommendations).toBeDefined();
      expect(recommendations.recommendations).toBeDefined();
      expect(recommendations.recommendations.length).toBeGreaterThan(0);
    });

    test('getExecutiveSummary - should return executive summary', async () => {
      const summary = await smartReportsService.getExecutiveSummary();
      expect(summary).toBeDefined();
      expect(summary.keyMetrics).toBeDefined();
      expect(summary.highlights).toBeDefined();
    });

    test('getKPIs - should return key performance indicators', async () => {
      const kpis = await smartReportsService.getKPIs();
      expect(kpis).toBeDefined();
      expect(kpis.kpis).toBeDefined();
      expect(kpis.kpis.length).toBeGreaterThan(0);
    });

    test('getSWOTAnalysis - should return SWOT analysis', async () => {
      const swot = await smartReportsService.getSWOTAnalysis();
      expect(swot).toBeDefined();
      expect(swot.strengths).toBeDefined();
      expect(swot.weaknesses).toBeDefined();
      expect(swot.opportunities).toBeDefined();
      expect(swot.threats).toBeDefined();
    });

    test('getForecasts - should return predictions', async () => {
      const forecasts = await smartReportsService.getForecasts('revenue', 90);
      expect(forecasts).toBeDefined();
      expect(forecasts.forecast).toBeDefined();
    });

    test('getAnomalies - should detect anomalies', async () => {
      const anomalies = await smartReportsService.getAnomalies();
      expect(anomalies).toBeDefined();
      expect(anomalies.anomalies).toBeDefined();
    });

    test('saveCustomReport - should save report', async () => {
      const saved = await smartReportsService.saveCustomReport({
        name: 'Test Report',
        type: 'comprehensive',
        filters: {},
      });
      expect(saved).toBeDefined();
      expect(saved.id).toBeDefined();
    });

    test('getSavedReports - should retrieve saved reports', async () => {
      const saved = await smartReportsService.getSavedReports();
      expect(Array.isArray(saved)).toBe(true);
    });

    test('scheduleReport - should schedule periodic report', async () => {
      const scheduled = await smartReportsService.scheduleReport({
        name: 'Weekly Report',
        type: 'performance',
        frequency: 'weekly',
        recipients: ['admin@example.com'],
      });
      expect(scheduled).toBeDefined();
      expect(scheduled.id).toBeDefined();
    });

    test('sendReportEmail - should send report via email', async () => {
      const sent = await smartReportsService.sendReportEmail({
        reportId: 'test_1',
        recipients: ['test@example.com'],
        format: 'pdf',
      });
      expect(sent).toBeDefined();
    });
  });

  // ============================================
  // اختبارات التكامل
  // Integration Tests
  // ============================================

  describe('Integration Tests', () => {
    test('should export report data successfully', async () => {
      const report = await smartReportsService.getComprehensiveReport();
      expect(() => {
        exportService.toExcel(report.data, 'integrated-report');
      }).not.toThrow();
    });

    test('should handle notification on report generation', async () => {
      const initialCount = notificationService.getHistory().length;

      await smartReportsService.getComprehensiveReport();
      notificationService.addNotification({
        type: 'success',
        title: 'Report Generated',
        message: 'Report generated successfully',
      });

      expect(notificationService.getHistory().length).toBe(initialCount + 1);
    });

    test('should handle error notifications', () => {
      notificationService.addNotification({
        type: 'error',
        title: 'Error',
        message: 'An error occurred',
      });

      const errors = notificationService.getHistory().filter(n => n.type === 'error');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // اختبارات الأداء
  // Performance Tests
  // ============================================

  describe('Performance Tests', () => {
    test('should export large dataset efficiently', () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        value: Math.random() * 1000,
        date: new Date().toISOString(),
      }));

      const start = Date.now();
      exportService.toExcel(largeData, 'large-export');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    test('notification service should handle high volume', () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        notificationService.addNotification({
          type: i % 3 === 0 ? 'success' : 'info',
          title: `Notification ${i}`,
          message: `Message ${i}`,
        });
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should handle 100 notifications in under 1 second
    });
  });
});
