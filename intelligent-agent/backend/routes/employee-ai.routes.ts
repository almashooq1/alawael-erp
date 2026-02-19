/**
 * ============================================
 * EMPLOYEE AI ROUTES
 * مسارات الذكاء الاصطناعي للموظفين
 * ============================================
 */

import { Router, Request, Response } from 'express';
import { employeeAIService } from '../services/employee-ai.service';
import { employeeService } from '../services/employee.service';
import { globalLogger } from '../utils/advanced.logger';
import { globalErrorTracker, ErrorCategory } from '../utils/error.tracker';

const router = Router();

/**
 * POST /api/employees/ai/insights/:employeeId - Generate AI insights
 */
router.post('/:employeeId/insights', async (req: Request, res: Response) => {
  try {
    const employee = await employeeService.getEmployee(req.params.employeeId);

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
    }

    await employeeAIService.generateAIInsights(employee);

    res.status(200).json({
      status: 'success',
      message: 'AI insights generated successfully',
      data: employee.aiInsights,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.INTERNAL,
      context: { endpoint: 'POST /api/employees/:id/insights' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to generate AI insights',
      errorId,
    });
  }
});

/**
 * GET /api/employees/ai/summary/:employeeId - Get AI summary
 */
router.get('/:employeeId/summary', async (req: Request, res: Response) => {
  try {
    const summary = await employeeAIService.getAISummary(req.params.employeeId);

    if (!summary) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: summary,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.DATABASE,
      context: { endpoint: 'GET /api/employees/:id/summary' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch AI summary',
      errorId,
    });
  }
});

/**
 * GET /api/employees/ai/retention-risk - Get all at-risk employees
 */
router.get('/analytics/retention-risk', async (req: Request, res: Response) => {
  try {
    const threshold = parseFloat(req.query.threshold as string) || 0.7;
    const employees = await employeeService.getAtRiskEmployees(threshold);

    const riskData = await Promise.all(
      employees.map(async emp => ({
        employeeId: emp.employeeId,
        name: emp.fullName,
        department: emp.department,
        position: emp.position,
        retentionRisk: emp.aiInsights.retentionRisk.toFixed(2),
        developmentAreas: emp.aiInsights.developmentAreas,
        recommendedActions: emp.aiInsights.recommendedTrainings,
      }))
    );

    res.status(200).json({
      status: 'success',
      data: riskData,
      count: riskData.length,
      threshold,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.DATABASE,
      context: { endpoint: 'GET /api/employees/ai/retention-risk' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch retention risk data',
      errorId,
    });
  }
});

/**
 * GET /api/employees/ai/performance-predictions - Get performance predictions
 */
router.get('/analytics/performance-predictions', async (req: Request, res: Response) => {
  try {
    const { employees } = await employeeService.getAllEmployees({
      limit: 1000,
    });

    const predictions = await Promise.all(
      employees.map(async emp => ({
        employeeId: emp.employeeId,
        name: emp.fullName,
        department: emp.department,
        currentRating: emp.performanceRating,
        predictedRating: emp.aiInsights.performancePrediction.toFixed(2),
        developmentAreas: emp.aiInsights.developmentAreas,
        recommendations: emp.aiInsights.recommendedTrainings,
      }))
    );

    res.status(200).json({
      status: 'success',
      data: predictions,
      count: predictions.length,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.DATABASE,
      context: { endpoint: 'GET /api/employees/ai/performance-predictions' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch performance predictions',
      errorId,
    });
  }
});

/**
 * GET /api/employees/ai/career-paths/:employeeId - Get career path suggestions
 */
router.get('/:employeeId/career-paths', async (req: Request, res: Response) => {
  try {
    const summary = await employeeAIService.getAISummary(req.params.employeeId);

    if (!summary) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        employeeId: (summary as any).employeeId,
        name: (summary as any).name,
        position: (summary as any).position,
        careerPathSuggestions: (summary as any).aiInsights.careerPathSuggestions,
      },
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.DATABASE,
      context: { endpoint: 'GET /api/employees/:id/career-paths' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch career path suggestions',
      errorId,
    });
  }
});

/**
 * POST /api/employees/ai/bulk-update - Bulk update AI insights
 */
router.post('/bulk-update', async (req: Request, res: Response) => {
  try {
    globalLogger.info('Starting bulk AI update', 'EmployeeAIRoutes');

    const result = await employeeAIService.bulkUpdateAIInsights();

    res.status(200).json({
      status: 'success',
      message: 'Bulk AI update completed',
      data: result,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.INTERNAL,
      context: { endpoint: 'POST /api/employees/ai/bulk-update' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Bulk update failed',
      errorId,
    });
  }
});

/**
 * GET /api/employees/ai/department-insights/:department - Department AI insights
 */
router.get('/analytics/department/:department', async (req: Request, res: Response) => {
  try {
    const employees = await employeeService.getEmployeesByDepartment(req.params.department);

    if (employees.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No employees found in department',
      });
    }

    const avgPerformance =
      employees.reduce((sum, e) => sum + e.aiInsights.performancePrediction, 0) / employees.length;
    const avgRetentionRisk =
      employees.reduce((sum, e) => sum + e.aiInsights.retentionRisk, 0) / employees.length;
    const atRiskCount = employees.filter(e => e.aiInsights.retentionRisk >= 0.7).length;

    const allTrainings = new Set<string>();
    employees.forEach(e => {
      e.aiInsights.recommendedTrainings.forEach(t => allTrainings.add(t));
    });

    res.status(200).json({
      status: 'success',
      data: {
        department: req.params.department,
        totalEmployees: employees.length,
        averagePerformance: avgPerformance.toFixed(2),
        averageRetentionRisk: avgRetentionRisk.toFixed(2),
        atRiskEmployees: atRiskCount,
        recommendedTrainings: Array.from(allTrainings),
      },
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.DATABASE,
      context: { endpoint: 'GET /api/employees/ai/department/:dept' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch department insights',
      errorId,
    });
  }
});

export default router;
