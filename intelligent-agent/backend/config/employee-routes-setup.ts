/**
 * ============================================
 * APPLICATION SETUP - Employee Routes Integration
 * إعداد التطبيق - تكامل مسارات الموظفين
 * ============================================
 */

import express, { Express } from 'express';
import employeeRoutes from './routes/employee.routes';
import employeeAIRoutes from './routes/employee-ai.routes';
import employeeAnalyticsRoutes from './routes/employee-analytics.routes';
import employeeReportsRoutes from './routes/employee-reports.routes';
import { globalLogger } from './utils/advanced.logger';
import { validateRequest } from './middleware/validation.middleware';

/**
 * Register Employee Management Routes
 * تسجيل مسارات نظام إدارة الموظفين
 */
export function registerEmployeeRoutes(app: Express): void {
  try {
    // Middleware
    app.use(express.json());
    app.use(validateRequest);

    // Employee Management Routes
    app.use('/api/employees', employeeRoutes);

    // AI & Intelligence Routes
    app.use('/api/employees/ai', employeeAIRoutes);

    // Analytics Routes
    app.use('/api/employees/analytics', employeeAnalyticsRoutes);

    // Reports Routes
    app.use('/api/employees/reports', employeeReportsRoutes);

    globalLogger.info('Employee management routes registered successfully', 'AppSetup', {
      routes: [
        '/api/employees',
        '/api/employees/ai',
        '/api/employees/analytics',
        '/api/employees/reports',
      ],
    });

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date(),
        services: {
          employees: 'active',
          ai: 'active',
          analytics: 'active',
          reports: 'active',
        },
      });
    });

    // API Documentation endpoint
    app.get('/api/docs/employee-system', (req, res) => {
      res.json({
        title: 'Employee Management System',
        version: '1.0.0',
        description: 'Comprehensive employee management with AI intelligence',
        endpoints: {
          'Employee Management': {
            'POST /api/employees': 'Create new employee',
            'GET /api/employees': 'List all employees (paginated)',
            'GET /api/employees/:employeeId': 'Get single employee',
            'PUT /api/employees/:employeeId': 'Update employee',
            'GET /api/employees/search': 'Search employees',
            'POST /api/employees/:employeeId/leave': 'Process leave request',
            'POST /api/employees/:employeeId/attendance': 'Record attendance',
            'POST /api/employees/:employeeId/evaluation': 'Add evaluation',
            'POST /api/employees/:employeeId/terminate': 'Terminate employee',
          },
          'AI & Intelligence': {
            'POST /api/employees/:employeeId/insights': 'Generate AI insights',
            'GET /api/employees/:employeeId/summary': 'Get AI summary',
            'GET /api/employees/analytics/retention-risk': 'Retention risk analysis',
            'GET /api/employees/analytics/performance-predictions': 'Performance predictions',
            'GET /api/employees/:employeeId/career-paths': 'Career path suggestions',
            'POST /api/employees/ai/bulk-update': 'Bulk update AI insights',
          },
          Analytics: {
            'GET /api/employees/analytics/department-report': 'Department performance',
            'GET /api/employees/analytics/attendance-report': 'Attendance analytics',
            'GET /api/employees/analytics/salary-report': 'Salary distribution',
            'GET /api/employees/analytics/turnover-report': 'Turnover analysis',
            'GET /api/employees/analytics/performance-distribution': 'Performance distribution',
          },
          Reports: {
            'GET /api/employees/reports/executive': 'Executive summary',
            'GET /api/employees/reports/department/:department': 'Department report',
            'GET /api/employees/reports/training-needs': 'Training needs analysis',
            'GET /api/employees/reports/career-development': 'Career development report',
            'GET /api/employees/reports/all-departments': 'All department reports',
            'GET /api/employees/reports/export': 'Export employee data',
            'GET /api/employees/reports/health-check': 'System health check',
          },
        },
      });
    });

    globalLogger.info('Employee system API documentation endpoint registered', 'AppSetup');
  } catch (error) {
    globalLogger.error('Failed to register employee routes', 'AppSetup', error as Error);
    throw error;
  }
}

/**
 * Quick Integration Template
 * نموذج التكامل السريع
 */

/*
// In your main.ts or app.ts:

import express from 'express';
import { registerEmployeeRoutes } from './config/employee-setup';

const app = express();

// Other middleware...

// Register employee management routes
registerEmployeeRoutes(app);

// Start server
app.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('API Documentation: http://localhost:3000/api/docs/employee-system');
});
*/

/**
 * Complete Routes Map
 * خريطة المسارات الكاملة
 */

export const EMPLOYEE_ROUTES_MAP = {
  // Core Employee Operations
  createEmployee: 'POST /api/employees',
  listEmployees: 'GET /api/employees',
  getEmployee: 'GET /api/employees/:employeeId',
  updateEmployee: 'PUT /api/employees/:employeeId',
  searchEmployees: 'GET /api/employees/search',
  getDepartmentEmployees: 'GET /api/employees/department/:department',
  getManagerTeam: 'GET /api/employees/managers/:managerId/team',

  // Leave & Attendance
  processLeaveRequest: 'POST /api/employees/:employeeId/leave',
  recordAttendance: 'POST /api/employees/:employeeId/attendance',

  // Performance Management
  addEvaluation: 'POST /api/employees/:employeeId/evaluation',
  terminateEmployee: 'POST /api/employees/:employeeId/terminate',

  // AI Intelligence
  generateAIInsights: 'POST /api/employees/:employeeId/insights',
  getAISummary: 'GET /api/employees/:employeeId/summary',
  getRetentionRiskAnalysis: 'GET /api/employees/analytics/retention-risk',
  getPerformancePredictions: 'GET /api/employees/analytics/performance-predictions',
  getCareerPaths: 'GET /api/employees/:employeeId/career-paths',
  getDepartmentInsights: 'GET /api/employees/analytics/department/:department',
  bulkUpdateAIInsights: 'POST /api/employees/ai/bulk-update',

  // Analytics
  getDepartmentReport: 'GET /api/employees/analytics/department-report',
  getAttendanceReport: 'GET /api/employees/analytics/attendance-report',
  getSalaryReport: 'GET /api/employees/analytics/salary-report',
  getTurnoverReport: 'GET /api/employees/analytics/turnover-report',
  getPerformanceDistribution: 'GET /api/employees/analytics/performance-distribution',

  // Reports & Export
  getExecutiveReport: 'GET /api/employees/reports/executive',
  getDepartmentDetailedReport: 'GET /api/employees/reports/department/:department',
  getTrainingNeeds: 'GET /api/employees/reports/training-needs',
  getCareerDevelopment: 'GET /api/employees/reports/career-development',
  getAllDepartmentReports: 'GET /api/employees/reports/all-departments',
  exportEmployeeData: 'GET /api/employees/reports/export',
  getHealthCheck: 'GET /api/employees/reports/health-check',
};

export default registerEmployeeRoutes;
