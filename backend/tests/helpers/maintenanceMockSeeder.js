/* eslint-disable no-unused-vars */
function reseedMaintenanceServiceMocks(
  advancedMaintenanceService,
  maintenanceAIService,
  maintenanceAnalyticsService
) {
  advancedMaintenanceService.createSmartMaintenanceSchedule.mockResolvedValue({
    success: true,
    schedule: { scheduleId: 'SCH-001', _id: 'MOCK-001' },
  });
  advancedMaintenanceService.getActiveSchedules.mockResolvedValue({
    success: true,
    schedules: [],
    count: 0,
  });
  advancedMaintenanceService.createTasksFromSchedule.mockResolvedValue({
    success: true,
    tasks: [],
  });
  advancedMaintenanceService.getUpcomingTasks.mockResolvedValue({
    success: true,
    tasks: [],
    count: 0,
    overdue: 0,
  });
  advancedMaintenanceService.updateTaskProgress.mockResolvedValue({
    success: true,
    task: { progress: 50, status: 'جارية' },
  });
  advancedMaintenanceService.reportMaintenanceIssue.mockResolvedValue({
    success: true,
    issue: { issueId: 'ISSUE-001', _id: 'ISSUE-MOCK-001' },
  });
  advancedMaintenanceService.autodiagnosisIssue.mockResolvedValue({
    success: true,
    issue: { diagnosis: { rootCause: 'مشكلة الفرامل' } },
  });
  advancedMaintenanceService.checkInventoryCriticalLevels.mockResolvedValue({
    success: true,
    summary: { lowStock: 5, needsReorder: 3 },
  });

  maintenanceAIService.predictMaintenanceNeeds.mockResolvedValue({
    success: true,
    predictions: [],
    confidence: 0.85,
  });
  maintenanceAIService.detectAnomalies.mockResolvedValue({
    success: true,
    anomalies: [],
    riskLevel: 'منخفضة',
  });
  maintenanceAIService.getSmartRecommendations.mockResolvedValue({
    success: true,
    recommendations: [],
    priorityCount: 3,
  });

  maintenanceAnalyticsService.generateComprehensiveReport.mockResolvedValue({
    success: true,
    report: { vehicleInfo: {}, tasksSummary: {}, costAnalysis: {} },
  });
  maintenanceAnalyticsService.getProviderPerformanceReport.mockResolvedValue({
    success: true,
    report: [],
  });
  maintenanceAnalyticsService.getInventoryHealthReport.mockResolvedValue({
    success: true,
    report: { totalParts: 100, byStatus: {}, totalValue: 5000 },
  });
  maintenanceAnalyticsService.getComplianceReport.mockResolvedValue({
    success: true,
    report: { complianceStatus: 'متوافق', violations: [], overallCompliance: 100 },
  });
}

module.exports = {
  reseedMaintenanceServiceMocks,
};
