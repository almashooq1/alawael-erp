/**
 * ============================================
 * EMPLOYEE ANALYTICS ROUTES
 * مسارات التحليلات المتقدمة
 * ============================================
 */

import { Router, Request, Response } from 'express';
import { employeeService } from '../services/employee.service';
import { globalLogger } from '../utils/advanced.logger';
import { globalErrorTracker, ErrorCategory } from '../utils/error.tracker';
import { performanceMonitor } from '../utils/performance.monitor';

const router = Router();

/**
 * GET /api/employees/analytics/department-report - Department performance report
 */
router.get('/department-report', async (req: Request, res: Response) => {
  return performanceMonitor.measure('GET_DEPARTMENT_REPORT', async () => {
    try {
      const { employees } = await employeeService.getAllEmployees({ limit: 10000 });

      interface DeptStats {
        [key: string]: {
          totalEmployees: number;
          activeEmployees: number;
          averageSalary: number;
          averagePerformance: number;
          totalPayroll: number;
          onLeave: number;
          resigned: number;
        };
      }

      const deptStats: DeptStats = {};

      employees.forEach(emp => {
        if (!deptStats[emp.department]) {
          deptStats[emp.department] = {
            totalEmployees: 0,
            activeEmployees: 0,
            averageSalary: 0,
            averagePerformance: 0,
            totalPayroll: 0,
            onLeave: 0,
            resigned: 0,
          };
        }

        const dept = deptStats[emp.department];
        dept.totalEmployees++;
        dept.totalPayroll += emp.salary || 0;

        if (emp.status === 'Active') dept.activeEmployees++;
        if (emp.status === 'On-Leave') dept.onLeave++;
        if (emp.status === 'Resigned') dept.resigned++;

        dept.averagePerformance +=
          emp.evaluationHistory && emp.evaluationHistory.length > 0
            ? emp.evaluationHistory.reduce((sum, e) => sum + (e.rating || 0), 0) /
              emp.evaluationHistory.length
            : 0;
      });

      // Calculate averages
      Object.keys(deptStats).forEach(dept => {
        deptStats[dept].averageSalary =
          deptStats[dept].totalPayroll / deptStats[dept].totalEmployees;
        deptStats[dept].averagePerformance =
          deptStats[dept].averagePerformance / deptStats[dept].totalEmployees;
      });

      res.status(200).json({
        status: 'success',
        data: deptStats,
        timestamp: new Date(),
      });
    } catch (error) {
      const errorId = globalErrorTracker.trackError(error as Error, {
        category: ErrorCategory.INTERNAL,
        context: { endpoint: 'GET /api/employees/analytics/department-report' },
        statusCode: 500,
      });

      res.status(500).json({
        status: 'error',
        message: 'Failed to generate department report',
        errorId,
      });
    }
  });
});

/**
 * GET /api/employees/analytics/attendance-report - Attendance analytics
 */
router.get('/attendance-report', async (req: Request, res: Response) => {
  return performanceMonitor.measure('GET_ATTENDANCE_REPORT', async () => {
    try {
      const { employees } = await employeeService.getAllEmployees({ limit: 10000 });

      interface AttendanceStats {
        totalEmployees: number;
        averageAttendanceRate: number;
        highAbsenteesCount: number;
        perfectAttendanceCount: number;
        averageLeaveDaysUsed: number;
        totalLeaveDaysUsed: number;
        topAbsentees: Array<{
          employeeId: string;
          name: string;
          attendanceRate: number;
        }>;
      }

      const stats: AttendanceStats = {
        totalEmployees: employees.length,
        averageAttendanceRate: 0,
        highAbsenteesCount: 0,
        perfectAttendanceCount: 0,
        averageLeaveDaysUsed: 0,
        totalLeaveDaysUsed: 0,
        topAbsentees: [],
      };

      const absenceRates = employees.map(emp => {
        const totalDays = emp.attendanceRecord ? emp.attendanceRecord.length : 0;
        const presentDays = emp.attendanceRecord
          ? emp.attendanceRecord.filter((record: any) => record.status === 'Present').length
          : 0;
        const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100;

        return {
          employeeId: emp.employeeId,
          name: emp.fullName,
          attendanceRate: parseFloat(attendanceRate.toFixed(2)),
        };
      });

      stats.averageAttendanceRate =
        absenceRates.reduce((sum, a) => sum + a.attendanceRate, 0) / absenceRates.length;
      stats.highAbsenteesCount = absenceRates.filter(a => a.attendanceRate < 90).length;
      stats.perfectAttendanceCount = absenceRates.filter(a => a.attendanceRate === 100).length;
      stats.averageLeaveDaysUsed =
        employees.reduce((sum, e) => sum + (e.usedLeaveDays || 0), 0) / employees.length;
      stats.totalLeaveDaysUsed = employees.reduce((sum, e) => sum + (e.usedLeaveDays || 0), 0);
      stats.topAbsentees = absenceRates
        .sort((a, b) => a.attendanceRate - b.attendanceRate)
        .slice(0, 10);

      res.status(200).json({
        status: 'success',
        data: stats,
        timestamp: new Date(),
      });
    } catch (error) {
      const errorId = globalErrorTracker.trackError(error as Error, {
        category: ErrorCategory.INTERNAL,
        context: { endpoint: 'GET /api/employees/analytics/attendance-report' },
        statusCode: 500,
      });

      res.status(500).json({
        status: 'error',
        message: 'Failed to generate attendance report',
        errorId,
      });
    }
  });
});

/**
 * GET /api/employees/analytics/salary-report - Salary distribution analysis
 */
router.get('/salary-report', async (req: Request, res: Response) => {
  return performanceMonitor.measure('GET_SALARY_REPORT', async () => {
    try {
      const { employees } = await employeeService.getAllEmployees({ limit: 10000 });

      const salaries = employees
        .filter(e => e.salary && e.status === 'Active')
        .map(e => e.salary)
        .sort((a, b) => (a || 0) - (b || 0));

      const totalPayroll = salaries.reduce((sum, s) => sum + s, 0);
      const avgSalary = totalPayroll / salaries.length;
      const medianSalary = salaries[Math.floor(salaries.length / 2)];
      const minSalary = salaries[0];
      const maxSalary = salaries[salaries.length - 1];

      // Salary distribution by range
      const distribution = {
        '0-50k': employees.filter(e => (e.salary || 0) < 50000).length,
        '50k-100k': employees.filter(e => (e.salary || 0) >= 50000 && (e.salary || 0) < 100000)
          .length,
        '100k-150k': employees.filter(e => (e.salary || 0) >= 100000 && (e.salary || 0) < 150000)
          .length,
        '150k-200k': employees.filter(e => (e.salary || 0) >= 150000 && (e.salary || 0) < 200000)
          .length,
        '200k+': employees.filter(e => (e.salary || 0) >= 200000).length,
      };

      res.status(200).json({
        status: 'success',
        data: {
          totalPayroll: parseFloat(totalPayroll.toFixed(2)),
          averageSalary: parseFloat(avgSalary.toFixed(2)),
          medianSalary,
          minSalary,
          maxSalary,
          salaryRange: maxSalary - minSalary,
          distribution,
          activeEmployees: employees.filter(e => e.status === 'Active').length,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      const errorId = globalErrorTracker.trackError(error as Error, {
        category: ErrorCategory.INTERNAL,
        context: { endpoint: 'GET /api/employees/analytics/salary-report' },
        statusCode: 500,
      });

      res.status(500).json({
        status: 'error',
        message: 'Failed to generate salary report',
        errorId,
      });
    }
  });
});

/**
 * GET /api/employees/analytics/turnover-report - Employee turnover analysis
 */
router.get('/turnover-report', async (req: Request, res: Response) => {
  return performanceMonitor.measure('GET_TURNOVER_REPORT', async () => {
    try {
      const { employees } = await employeeService.getAllEmployees({ limit: 10000 });

      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);

      const resignedThisYear = employees.filter(
        e => e.status === 'Resigned' && e.resignationDate && new Date(e.resignationDate) > lastYear
      ).length;

      const terminatedThisYear = employees.filter(
        e =>
          e.status === 'Terminated' && e.terminationDate && new Date(e.terminationDate) > lastYear
      ).length;

      const activeEmployees = employees.filter(e => e.status === 'Active').length;
      const totalEmployeesLastYear = employees.length + resignedThisYear + terminatedThisYear;

      const turnoverRate =
        totalEmployeesLastYear > 0
          ? ((resignedThisYear + terminatedThisYear) / totalEmployeesLastYear) * 100
          : 0;

      // Top reasons for resignation
      interface ResignationReasons {
        [key: string]: number;
      }
      const resignationReasons: ResignationReasons = {};
      employees
        .filter(e => e.status === 'Resigned')
        .forEach(e => {
          const reason =
            e.documents && e.documents.length > 0 ? e.documents[0].name : 'Not specified';
          resignationReasons[reason] = (resignationReasons[reason] || 0) + 1;
        });

      res.status(200).json({
        status: 'success',
        data: {
          resignedThisYear,
          terminatedThisYear,
          totalSeparations: resignedThisYear + terminatedThisYear,
          activeEmployees,
          turnoverRate: parseFloat(turnoverRate.toFixed(2)),
          resignationReasons,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      const errorId = globalErrorTracker.trackError(error as Error, {
        category: ErrorCategory.INTERNAL,
        context: { endpoint: 'GET /api/employees/analytics/turnover-report' },
        statusCode: 500,
      });

      res.status(500).json({
        status: 'error',
        message: 'Failed to generate turnover report',
        errorId,
      });
    }
  });
});

/**
 * GET /api/employees/analytics/performance-distribution - Performance rating distribution
 */
router.get('/performance-distribution', async (req: Request, res: Response) => {
  return performanceMonitor.measure('GET_PERFORMANCE_DISTRIBUTION', async () => {
    try {
      const { employees } = await employeeService.getAllEmployees({ limit: 10000 });

      const distribution = {
        '1-2': 0,
        '2-3': 0,
        '3-4': 0,
        '4-5': 0,
        'no-rating': 0,
      };

      const avgPerformance = employees
        .filter(e => e.performanceRating)
        .map(e => e.performanceRating);

      employees.forEach(emp => {
        const rating = emp.performanceRating || 0;
        if (rating === 0) {
          distribution['no-rating']++;
        } else if (rating <= 2) {
          distribution['1-2']++;
        } else if (rating <= 3) {
          distribution['2-3']++;
        } else if (rating <= 4) {
          distribution['3-4']++;
        } else {
          distribution['4-5']++;
        }
      });

      const avg =
        avgPerformance.length > 0
          ? avgPerformance.reduce((sum, r) => sum + r, 0) / avgPerformance.length
          : 0;

      res.status(200).json({
        status: 'success',
        data: {
          distribution,
          averageRating: parseFloat(avg.toFixed(2)),
          highPerformers: employees.filter(e => (e.performanceRating || 0) >= 4.5).length,
          lowPerformers: employees.filter(e => (e.performanceRating || 0) < 2.5).length,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      const errorId = globalErrorTracker.trackError(error as Error, {
        category: ErrorCategory.INTERNAL,
        context: { endpoint: 'GET /api/employees/analytics/performance-distribution' },
        statusCode: 500,
      });

      res.status(500).json({
        status: 'error',
        message: 'Failed to generate performance report',
        errorId,
      });
    }
  });
});

export default router;
