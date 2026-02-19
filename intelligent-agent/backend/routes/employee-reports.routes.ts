/**
 * ============================================
 * EMPLOYEE REPORTS ROUTES
 * مسارات التقارير الشاملة
 * ============================================
 */

import { Router, Request, Response } from 'express';
import { employeeReportsService } from '../services/employee-reports.service';
import { employeeService } from '../services/employee.service';
import { globalLogger } from '../utils/advanced.logger';
import { globalErrorTracker, ErrorCategory } from '../utils/error.tracker';

const router = Router();

/**
 * GET /api/employees/reports/executive - Executive summary report
 */
router.get('/executive', async (req: Request, res: Response) => {
  try {
    const report = await employeeReportsService.generateExecutiveReport();

    res.status(200).json({
      status: 'success',
      data: report,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.INTERNAL,
      context: { endpoint: 'GET /api/employees/reports/executive' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to generate executive report',
      errorId,
    });
  }
});

/**
 * GET /api/employees/reports/department/:department - Department report
 */
router.get('/department/:department', async (req: Request, res: Response) => {
  try {
    const report = await employeeReportsService.generateDepartmentReport(req.params.department);

    res.status(200).json({
      status: 'success',
      data: report,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.INTERNAL,
      context: {
        endpoint: 'GET /api/employees/reports/department/:dept',
        department: req.params.department,
      },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to generate department report',
      errorId,
    });
  }
});

/**
 * GET /api/employees/reports/training-needs - Training needs analysis
 */
router.get('/training-needs', async (req: Request, res: Response) => {
  try {
    const report = await employeeReportsService.generateTrainingNeeds();

    res.status(200).json({
      status: 'success',
      data: report,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.INTERNAL,
      context: { endpoint: 'GET /api/employees/reports/training-needs' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to generate training needs report',
      errorId,
    });
  }
});

/**
 * GET /api/employees/reports/career-development - Career development report
 */
router.get('/career-development', async (req: Request, res: Response) => {
  try {
    const report = await employeeReportsService.generateCareerDevelopmentReport();

    res.status(200).json({
      status: 'success',
      data: report,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.INTERNAL,
      context: { endpoint: 'GET /api/employees/reports/career-development' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to generate career development report',
      errorId,
    });
  }
});

/**
 * GET /api/employees/reports/export - Export employee data
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || 'json';
    const { department, status } = req.query;

    let employees = (await employeeService.getAllEmployees({ limit: 10000 })).employees;

    if (department) {
      employees = employees.filter(e => e.department === department);
    }

    if (status) {
      employees = employees.filter(e => e.status === status);
    }

    let data: string;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      data = await employeeReportsService.exportToCSV(employees);
      contentType = 'text/csv';
      filename = `employees-${new Date().toISOString()}.csv`;
    } else {
      data = await employeeReportsService.exportToJSON(employees);
      contentType = 'application/json';
      filename = `employees-${new Date().toISOString()}.json`;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.INTERNAL,
      context: { endpoint: 'GET /api/employees/reports/export' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to export employee data',
      errorId,
    });
  }
});

/**
 * GET /api/employees/reports/all-departments - All department reports
 */
router.get('/all-departments', async (req: Request, res: Response) => {
  try {
    const { employees } = await employeeService.getAllEmployees({ limit: 10000 });
    const departments = [...new Set(employees.map(e => e.department))];

    const reports = await Promise.all(
      departments.map(dept => employeeReportsService.generateDepartmentReport(dept))
    );

    res.status(200).json({
      status: 'success',
      data: {
        totalDepartments: departments.length,
        reports: reports,
      },
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.INTERNAL,
      context: { endpoint: 'GET /api/employees/reports/all-departments' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to generate department reports',
      errorId,
    });
  }
});

/**
 * GET /api/employees/reports/health-check - System health report
 */
router.get('/health-check', async (req: Request, res: Response) => {
  try {
    const { employees } = await employeeService.getAllEmployees({ limit: 10000 });
    const stats = await employeeService.getStatistics();

    const healthReport = {
      timestamp: new Date(),
      systemHealth: {
        dataIntegrity: 'OK',
        lastCheck: new Date(),
      },
      dataQuality: {
        totalRecords: employees.length,
        completeRecords: employees.filter(
          e => e.employeeId && e.fullName && e.email && e.department && e.position
        ).length,
        incompleteRecords: employees.filter(
          e => !e.employeeId || !e.fullName || !e.email || !e.department || !e.position
        ).length,
        missingPerformanceRatings: employees.filter(e => !e.performanceRating).length,
        missingAIInsights: employees.filter(e => !e.aiInsights).length,
      },
      employeeStatus: {
        active: employees.filter(e => e.status === 'Active').length,
        inactive: employees.filter(e => e.status === 'Inactive').length,
        onLeave: employees.filter(e => e.status === 'On-Leave').length,
        resigned: employees.filter(e => e.status === 'Resigned').length,
        terminated: employees.filter(e => e.status === 'Terminated').length,
      },
      recommendations: [] as string[],
    };

    // Add recommendations based on health check
    const recommendations = healthReport.recommendations;

    if (healthReport.dataQuality.incompleteRecords > employees.length * 0.05) {
      recommendations.push(
        `⚠️ ${healthReport.dataQuality.incompleteRecords} records have incomplete data`
      );
    }

    if (healthReport.dataQuality.missingPerformanceRatings > employees.length * 0.2) {
      recommendations.push(
        `📊 ${healthReport.dataQuality.missingPerformanceRatings} employees missing performance ratings`
      );
    }

    if (healthReport.dataQuality.missingAIInsights > employees.length * 0.1) {
      recommendations.push(
        `🤖 ${healthReport.dataQuality.missingAIInsights} employees missing AI insights - run bulk update`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ System is healthy');
    }

    res.status(200).json({
      status: 'success',
      data: healthReport,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.INTERNAL,
      context: { endpoint: 'GET /api/employees/reports/health-check' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to generate health check report',
      errorId,
    });
  }
});

export default router;
