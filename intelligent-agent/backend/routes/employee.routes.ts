/**
 * ============================================
 * EMPLOYEE ROUTES - API ENDPOINTS
 * المسارات - نقاط نهاية الواجهة البرمجية
 * ============================================
 */

import { Router, Request, Response } from 'express';
import { validateRequest, sanitizeRequest } from '../middleware/validation.middleware';
import { employeeService } from '../services/employee.service';
import { globalLogger } from '../utils/advanced.logger';
import { globalErrorTracker, ErrorCategory } from '../utils/error.tracker';

const router = Router();

/**
 * Validation rules
 */
const createEmployeeRules = [
  { field: 'firstName', type: 'string', required: true, min: 2, max: 50 },
  { field: 'lastName', type: 'string', required: true, min: 2, max: 50 },
  { field: 'email', type: 'email', required: true },
  { field: 'phone', type: 'string', required: true },
  { field: 'department', type: 'string', required: true },
  { field: 'position', type: 'string', required: true },
  { field: 'salary', type: 'number', required: true, min: 0 },
  { field: 'hireDate', type: 'string', required: true },
  { field: 'nationality', type: 'string', required: true },
  { field: 'gender', type: 'string', required: true },
  { field: 'employmentType', type: 'string', required: true },
];

/**
 * POST /api/employees - Create new employee
 */
router.post(
  '/',
  validateRequest(createEmployeeRules, 'body'),
  sanitizeRequest({
    firstName: 'string',
    lastName: 'string',
    email: 'email',
  }),
  async (req: Request, res: Response) => {
    try {
      const employee = await employeeService.createEmployee(
        {
          ...req.body,
          dateOfBirth: new Date(req.body.dateOfBirth),
          hireDate: new Date(req.body.hireDate),
        },
        req.user?.id || 'system'
      );

      globalLogger.info('Employee created via API', 'EmployeeRoutes', {
        employeeId: employee.employeeId,
      });

      res.status(201).json({
        status: 'success',
        message: 'Employee created successfully',
        data: employee,
      });
    } catch (error) {
      const errorId = globalErrorTracker.trackError(error as Error, {
        category: ErrorCategory.DATABASE,
        context: { endpoint: 'POST /api/employees' },
        statusCode: 500,
      });

      res.status(500).json({
        status: 'error',
        message: 'Failed to create employee',
        errorId,
      });
    }
  }
);

/**
 * GET /api/employees - Get all employees
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = parseInt(req.query.limit as string) || 50;
    const department = req.query.department as string;
    const status = req.query.status as string;

    const result = await employeeService.getAllEmployees({
      department,
      status,
      skip,
      limit,
    });

    res.status(200).json({
      status: 'success',
      data: result.employees,
      total: result.total,
      page: Math.floor(skip / limit) + 1,
      limit,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.DATABASE,
      context: { endpoint: 'GET /api/employees' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch employees',
      errorId,
    });
  }
});

/**
 * GET /api/employees/:employeeId - Get employee by ID
 */
router.get('/:employeeId', async (req: Request, res: Response) => {
  try {
    const employee = await employeeService.getEmployee(req.params.employeeId);

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: employee,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.NOT_FOUND,
      context: { endpoint: 'GET /api/employees/:id', employeeId: req.params.employeeId },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch employee',
      errorId,
    });
  }
});

/**
 * GET /api/employees/:employeeId/profile - Get comprehensive employee profile
 */
router.get('/:employeeId/profile', async (req: Request, res: Response) => {
  try {
    const profile = await employeeService.getEmployeeProfile(req.params.employeeId);

    res.status(200).json({
      status: 'success',
      data: profile,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.DATABASE,
      context: { endpoint: 'GET /api/employees/:id/profile', employeeId: req.params.employeeId },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch employee profile',
      errorId,
    });
  }
});

/**
 * PUT /api/employees/:employeeId - Update employee
 */
router.put('/:employeeId', async (req: Request, res: Response) => {
  try {
    const updateData = {
      ...req.body,
      dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined,
    };

    const employee = await employeeService.updateEmployee(
      req.params.employeeId,
      updateData,
      req.user?.id || 'system'
    );

    res.status(200).json({
      status: 'success',
      message: 'Employee updated successfully',
      data: employee,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.DATABASE,
      context: { endpoint: 'PUT /api/employees/:id', employeeId: req.params.employeeId },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to update employee',
      errorId,
    });
  }
});

/**
 * POST /api/employees/:employeeId/leave - Request leave
 */
router.post('/:employeeId/leave', async (req: Request, res: Response) => {
  try {
    const employee = await employeeService.processLeaveRequest(
      req.params.employeeId,
      {
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        leaveType: req.body.leaveType,
        reason: req.body.reason,
      },
      req.user?.id || 'system'
    );

    res.status(200).json({
      status: 'success',
      message: 'Leave request processed',
      data: employee,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.DATABASE,
      context: { endpoint: 'POST /api/employees/:id/leave' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to process leave request',
      errorId,
    });
  }
});

/**
 * POST /api/employees/:employeeId/attendance - Record attendance
 */
router.post('/:employeeId/attendance', async (req: Request, res: Response) => {
  try {
    const employee = await employeeService.recordAttendance(req.params.employeeId, {
      date: new Date(req.body.date),
      status: req.body.status,
      hoursWorked: req.body.hoursWorked,
    });

    res.status(200).json({
      status: 'success',
      message: 'Attendance recorded',
      data: employee,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.DATABASE,
      context: { endpoint: 'POST /api/employees/:id/attendance' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to record attendance',
      errorId,
    });
  }
});

/**
 * POST /api/employees/:employeeId/evaluation - Update evaluation
 */
router.post('/:employeeId/evaluation', async (req: Request, res: Response) => {
  try {
    const employee = await employeeService.updatePerformanceEvaluation(req.params.employeeId, {
      rating: req.body.rating,
      reviewer: req.user?.id || 'system',
      comments: req.body.comments,
    });

    res.status(200).json({
      status: 'success',
      message: 'Evaluation recorded',
      data: employee,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.DATABASE,
      context: { endpoint: 'POST /api/employees/:id/evaluation' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to record evaluation',
      errorId,
    });
  }
});

/**
 * GET /api/employees/department/:department - Get employees by department
 */
router.get('/department/:department', async (req: Request, res: Response) => {
  try {
    const employees = await employeeService.getEmployeesByDepartment(req.params.department);

    res.status(200).json({
      status: 'success',
      data: employees,
      count: employees.length,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.DATABASE,
      context: { endpoint: 'GET /api/employees/department/:dept' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch department employees',
      errorId,
    });
  }
});

/**
 * GET /api/employees/search - Search employees
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query must be at least 2 characters',
      });
    }

    const employees = await employeeService.searchEmployees(query);

    res.status(200).json({
      status: 'success',
      data: employees,
      count: employees.length,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.DATABASE,
      context: { endpoint: 'GET /api/employees/search' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Search failed',
      errorId,
    });
  }
});

/**
 * GET /api/employees/at-risk - Get at-risk employees
 */
router.get('/analytics/at-risk', async (req: Request, res: Response) => {
  try {
    const threshold = parseFloat(req.query.threshold as string) || 0.7;
    const employees = await employeeService.getAtRiskEmployees(threshold);

    res.status(200).json({
      status: 'success',
      data: employees,
      count: employees.length,
      threshold,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.DATABASE,
      context: { endpoint: 'GET /api/employees/at-risk' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch at-risk employees',
      errorId,
    });
  }
});

/**
 * GET /api/employees/statistics - Get employee statistics
 */
router.get('/analytics/statistics', async (req: Request, res: Response) => {
  try {
    const stats = await employeeService.getStatistics();

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.DATABASE,
      context: { endpoint: 'GET /api/employees/statistics' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch statistics',
      errorId,
    });
  }
});

/**
 * POST /api/employees/:employeeId/terminate - Terminate employee
 */
router.post('/:employeeId/terminate', async (req: Request, res: Response) => {
  try {
    const employee = await employeeService.terminateEmployee(
      req.params.employeeId,
      req.body.reason,
      req.user?.id || 'system'
    );

    res.status(200).json({
      status: 'success',
      message: 'Employee terminated',
      data: employee,
    });
  } catch (error) {
    const errorId = globalErrorTracker.trackError(error as Error, {
      category: ErrorCategory.DATABASE,
      context: { endpoint: 'POST /api/employees/:id/terminate' },
      statusCode: 500,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to terminate employee',
      errorId,
    });
  }
});

export default router;
