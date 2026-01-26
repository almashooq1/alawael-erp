/**
 * KPI Calculator Utility
 * Provides module-level key performance indicators
 */

/**
 * Get KPIs for a specific module
 * @param {string} moduleKey - Module identifier (e.g., 'reports', 'finance', 'hr')
 * @returns {Object} KPI metrics for the module
 */
function getModuleKPIs(moduleKey) {
  // Default KPI structure
  const defaultKPIs = {
    moduleKey,
    timestamp: new Date().toISOString(),
    metrics: {
      activeUsers: Math.floor(Math.random() * 50) + 10,
      totalRecords: Math.floor(Math.random() * 1000) + 100,
      recentActivity: Math.floor(Math.random() * 100),
      performance: {
        responseTime: Math.floor(Math.random() * 200) + 50,
        successRate: 95 + Math.random() * 5,
        errorRate: Math.random() * 2,
      },
    },
  };

  // Module-specific KPI overrides
  const moduleKPIs = {
    reports: {
      ...defaultKPIs,
      metrics: {
        ...defaultKPIs.metrics,
        generatedToday: Math.floor(Math.random() * 50) + 5,
        scheduledReports: Math.floor(Math.random() * 20) + 3,
      },
    },
    finance: {
      ...defaultKPIs,
      metrics: {
        ...defaultKPIs.metrics,
        totalTransactions: Math.floor(Math.random() * 500) + 100,
        pendingApprovals: Math.floor(Math.random() * 30) + 5,
      },
    },
    hr: {
      ...defaultKPIs,
      metrics: {
        ...defaultKPIs.metrics,
        totalEmployees: Math.floor(Math.random() * 200) + 50,
        activeLeaveRequests: Math.floor(Math.random() * 15) + 2,
      },
    },
    security: {
      ...defaultKPIs,
      metrics: {
        ...defaultKPIs.metrics,
        alerts: Math.floor(Math.random() * 10),
        blockedAttempts: Math.floor(Math.random() * 5),
      },
    },
    elearning: {
      ...defaultKPIs,
      metrics: {
        ...defaultKPIs.metrics,
        activeCourses: Math.floor(Math.random() * 30) + 5,
        completionRate: 70 + Math.random() * 20,
      },
    },
    rehab: {
      ...defaultKPIs,
      metrics: {
        ...defaultKPIs.metrics,
        activePatients: Math.floor(Math.random() * 80) + 20,
        completedSessions: Math.floor(Math.random() * 100) + 30,
      },
    },
    appeals: {
      ...defaultKPIs,
      metrics: {
        ...defaultKPIs.metrics,
        pendingAppeals: Math.floor(Math.random() * 20) + 2,
        resolvedToday: Math.floor(Math.random() * 10) + 1,
      },
    },
    biometrics: {
      ...defaultKPIs,
      metrics: {
        ...defaultKPIs.metrics,
        activeDevices: Math.floor(Math.random() * 15) + 5,
        authenticationsToday: Math.floor(Math.random() * 200) + 50,
      },
    },
  };

  return moduleKPIs[moduleKey] || defaultKPIs;
}

/**
 * Get dashboard-level KPIs (aggregated across all modules)
 * @returns {Object} Dashboard KPI metrics
 */
function getDashboardKPIs() {
  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalUsers: Math.floor(Math.random() * 500) + 200,
      activeModules: 8,
      systemHealth: 95 + Math.random() * 5,
      uptime: '99.9%',
    },
    modules: {
      reports: getModuleKPIs('reports'),
      finance: getModuleKPIs('finance'),
      hr: getModuleKPIs('hr'),
      security: getModuleKPIs('security'),
      elearning: getModuleKPIs('elearning'),
      rehab: getModuleKPIs('rehab'),
      appeals: getModuleKPIs('appeals'),
      biometrics: getModuleKPIs('biometrics'),
    },
  };
}

module.exports = {
  getModuleKPIs,
  getDashboardKPIs,
};
