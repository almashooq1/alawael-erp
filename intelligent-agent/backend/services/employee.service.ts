/**
 * ============================================
 * EMPLOYEE SERVICE - ADVANCED OPERATIONS
 * خدمة الموظفين - العمليات المتقدمة
 * ============================================
 */

import { Employee, IEmployee } from '../models/employee.model';
import { globalLogger } from '../utils/advanced.logger';
import { globalErrorTracker, ErrorCategory } from '../utils/error.tracker';
import { performanceMonitor } from '../utils/performance.monitor';

/**
 * Employee Statistics Interface
 */
export interface EmployeeStats {
  total: number;
  byDepartment: Record<string, number>;
  byStatus: Record<string, number>;
  byEmploymentType: Record<string, number>;
  averageSalary: number;
  totalPayroll: number;
  averagePerformance: number;
  atRiskCount: number;
}

/**
 * Employee Service
 */
export class EmployeeService {
  /**
   * Create new employee
   */
  async createEmployee(data: Partial<IEmployee>, createdBy: string): Promise<IEmployee> {
    return performanceMonitor.measure('createEmployee', async () => {
      try {
        const employee = new Employee({
          ...data,
          createdBy,
          lastModifiedBy: createdBy,
        });

        await employee.save();

        globalLogger.info('Employee created', 'EmployeeService', {
          employeeId: employee.employeeId,
          name: employee.fullName,
        });

        return employee;
      } catch (error) {
        globalErrorTracker.trackError(error as Error, {
          category: ErrorCategory.DATABASE,
          context: { operation: 'createEmployee', data },
        });
        throw error;
      }
    });
  }

  /**
   * Update employee
   */
  async updateEmployee(
    employeeId: string,
    updateData: Partial<IEmployee>,
    modifiedBy: string
  ): Promise<IEmployee | null> {
    return performanceMonitor.measure('updateEmployee', async () => {
      try {
        const employee = await Employee.findOneAndUpdate(
          { employeeId },
          {
            ...updateData,
            lastModifiedBy: modifiedBy,
          },
          { new: true }
        );

        if (!employee) {
          throw new Error(`Employee not found: ${employeeId}`);
        }

        globalLogger.info('Employee updated', 'EmployeeService', {
          employeeId,
          changes: Object.keys(updateData),
        });

        return employee;
      } catch (error) {
        globalErrorTracker.trackError(error as Error, {
          category: ErrorCategory.DATABASE,
          context: { operation: 'updateEmployee', employeeId },
        });
        throw error;
      }
    });
  }

  /**
   * Get employee by ID
   */
  async getEmployee(employeeId: string): Promise<IEmployee | null> {
    return performanceMonitor.measure('getEmployee', async () => {
      try {
        return await Employee.findOne({ employeeId, deletedAt: null });
      } catch (error) {
        globalErrorTracker.trackError(error as Error, {
          category: ErrorCategory.DATABASE,
          context: { operation: 'getEmployee', employeeId },
        });
        throw error;
      }
    });
  }

  /**
   * Get comprehensive employee profile
   */
  async getEmployeeProfile(employeeId: string): Promise<{
    employee: IEmployee;
    summary: {
      fullName: string;
      age: number;
      tenure: { years: number; months: number };
      status: IEmployee['status'];
      department: string;
      position: string;
      employmentType: IEmployee['employmentType'];
      workLocation: string;
    };
    leave: {
      totalDays: number;
      usedDays: number;
      remainingDays: number;
      utilizationRate: number;
      lastLeave?: IEmployee['leaveHistory'][number];
    };
    attendance: {
      last30Days: {
        total: number;
        present: number;
        absent: number;
        late: number;
        halfDay: number;
        averageHoursWorked: number;
      };
      lastRecord?: IEmployee['attendanceRecord'][number];
    };
    performance: {
      rating: number;
      lastEvaluationDate?: Date;
      recentEvaluations: IEmployee['evaluationHistory'];
      kpis: IEmployee['kpis'];
    };
    documents: {
      total: number;
      expiringSoon: Array<IEmployee['documents'][number] & { daysRemaining: number }>;
    };
    aiInsights: IEmployee['aiInsights'];
  }> {
    return performanceMonitor.measure('getEmployeeProfile', async () => {
      try {
        const employee = await Employee.findOne({ employeeId, deletedAt: null });

        if (!employee) {
          throw new Error(`Employee not found: ${employeeId}`);
        }

        const now = new Date();
        const age = (employee as any).getAge ? (employee as any).getAge() : 0;
        const tenure = (employee as any).getTenure
          ? (employee as any).getTenure()
          : { years: 0, months: 0 };

        const leaveHistory = employee.leaveHistory || [];
        const lastLeave =
          leaveHistory.length > 0 ? leaveHistory[leaveHistory.length - 1] : undefined;
        const utilizationRate = employee.totalLeaveDays
          ? Math.round((employee.usedLeaveDays / employee.totalLeaveDays) * 100)
          : 0;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentAttendance = (employee.attendanceRecord || []).filter(
          record => new Date(record.date) >= thirtyDaysAgo
        );

        const attendanceStats = recentAttendance.reduce(
          (acc, record) => {
            acc.total += 1;
            if (record.status === 'Present') acc.present += 1;
            if (record.status === 'Absent') acc.absent += 1;
            if (record.status === 'Late') acc.late += 1;
            if (record.status === 'Half-Day') acc.halfDay += 1;
            if (record.hoursWorked) {
              acc.hoursTotal += record.hoursWorked;
              acc.hoursCount += 1;
            }
            return acc;
          },
          { total: 0, present: 0, absent: 0, late: 0, halfDay: 0, hoursTotal: 0, hoursCount: 0 }
        );

        const avgHours = attendanceStats.hoursCount
          ? Math.round((attendanceStats.hoursTotal / attendanceStats.hoursCount) * 100) / 100
          : 0;

        const documents = employee.documents || [];
        const expiringSoon = documents
          .filter(doc => doc.expiryDate)
          .map(doc => {
            const expiryDate = new Date(doc.expiryDate as Date);
            const daysRemaining = Math.ceil(
              (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            return { ...doc, daysRemaining };
          })
          .filter(doc => doc.daysRemaining <= 30)
          .sort((a, b) => a.daysRemaining - b.daysRemaining);

        const recentEvaluations = (employee.evaluationHistory || []).slice(-3);

        return {
          employee,
          summary: {
            fullName: (employee as any).fullName || `${employee.firstName} ${employee.lastName}`,
            age,
            tenure,
            status: employee.status,
            department: employee.department,
            position: employee.position,
            employmentType: employee.employmentType,
            workLocation: employee.workLocation,
          },
          leave: {
            totalDays: employee.totalLeaveDays,
            usedDays: employee.usedLeaveDays,
            remainingDays: employee.remainingLeaveDays,
            utilizationRate,
            lastLeave,
          },
          attendance: {
            last30Days: {
              total: attendanceStats.total,
              present: attendanceStats.present,
              absent: attendanceStats.absent,
              late: attendanceStats.late,
              halfDay: attendanceStats.halfDay,
              averageHoursWorked: avgHours,
            },
            lastRecord:
              employee.attendanceRecord && employee.attendanceRecord.length > 0
                ? employee.attendanceRecord[employee.attendanceRecord.length - 1]
                : undefined,
          },
          performance: {
            rating: employee.performanceRating,
            lastEvaluationDate: employee.lastEvaluationDate,
            recentEvaluations,
            kpis: employee.kpis || [],
          },
          documents: {
            total: documents.length,
            expiringSoon,
          },
          aiInsights: employee.aiInsights,
        };
      } catch (error) {
        globalErrorTracker.trackError(error as Error, {
          category: ErrorCategory.DATABASE,
          context: { operation: 'getEmployeeProfile', employeeId },
        });
        throw error;
      }
    });
  }

  /**
   * Get all employees
   */
  async getAllEmployees(filters?: {
    department?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ employees: IEmployee[]; total: number }> {
    return performanceMonitor.measure('getAllEmployees', async () => {
      try {
        const query: any = { deletedAt: null };

        if (filters?.department) {
          query.department = filters.department;
        }
        if (filters?.status) {
          query.status = filters.status;
        }

        const skip = filters?.skip || 0;
        const limit = filters?.limit || 50;

        const [employees, total] = await Promise.all([
          Employee.find(query).skip(skip).limit(limit).exec(),
          Employee.countDocuments(query),
        ]);

        return { employees, total };
      } catch (error) {
        globalErrorTracker.trackError(error as Error, {
          category: ErrorCategory.DATABASE,
          context: { operation: 'getAllEmployees', filters },
        });
        throw error;
      }
    });
  }

  /**
   * Get employees by department
   */
  async getEmployeesByDepartment(department: string): Promise<IEmployee[]> {
    return performanceMonitor.measure('getEmployeesByDepartment', async () => {
      return Employee.findByDepartment(department);
    });
  }

  /**
   * Get team for manager
   */
  async getManagerTeam(managerId: string): Promise<IEmployee[]> {
    return performanceMonitor.measure('getManagerTeam', async () => {
      return Employee.findReports(managerId);
    });
  }

  /**
   * Get at-risk employees
   */
  async getAtRiskEmployees(riskThreshold: number = 0.7): Promise<IEmployee[]> {
    return performanceMonitor.measure('getAtRiskEmployees', async () => {
      const employees = await Employee.findAtRisk(riskThreshold);
      globalLogger.warn(`Found ${employees.length} at-risk employees`, 'EmployeeService', {
        riskThreshold,
      });
      return employees;
    });
  }

  /**
   * Process leave request
   */
  async processLeaveRequest(
    employeeId: string,
    leaveData: {
      startDate: Date;
      endDate: Date;
      leaveType: string;
      reason: string;
    },
    approvedBy: string
  ): Promise<IEmployee | null> {
    return performanceMonitor.measure('processLeaveRequest', async () => {
      try {
        const employee = await Employee.findOne({ employeeId });

        if (!employee) {
          throw new Error(`Employee not found: ${employeeId}`);
        }

        // Calculate leave days
        const startDate = new Date(leaveData.startDate);
        const endDate = new Date(leaveData.endDate);
        const leaveDays = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (employee.remainingLeaveDays < leaveDays) {
          throw new Error('Insufficient leave balance');
        }

        // Add to leave history
        employee.leaveHistory.push({
          startDate,
          endDate,
          leaveType: leaveData.leaveType,
          status: 'Approved',
          reason: leaveData.reason,
        });

        // Update leave balance
        employee.usedLeaveDays += leaveDays;
        employee.updateLeaveBalance();
        employee.lastModifiedBy = approvedBy;

        await employee.save();

        globalLogger.info('Leave approved', 'EmployeeService', {
          employeeId,
          days: leaveDays,
          leaveType: leaveData.leaveType,
        });

        return employee;
      } catch (error) {
        globalErrorTracker.trackError(error as Error, {
          category: ErrorCategory.DATABASE,
          context: { operation: 'processLeaveRequest', employeeId },
        });
        throw error;
      }
    });
  }

  /**
   * Record attendance
   */
  async recordAttendance(
    employeeId: string,
    attendanceData: {
      date: Date;
      status: 'Present' | 'Absent' | 'Late' | 'Half-Day';
      hoursWorked?: number;
    }
  ): Promise<IEmployee | null> {
    return performanceMonitor.measure('recordAttendance', async () => {
      try {
        const employee = await Employee.findOne({ employeeId });

        if (!employee) {
          throw new Error(`Employee not found: ${employeeId}`);
        }

        employee.attendanceRecord.push(attendanceData);
        await employee.save();

        return employee;
      } catch (error) {
        globalErrorTracker.trackError(error as Error, {
          category: ErrorCategory.DATABASE,
          context: { operation: 'recordAttendance', employeeId },
        });
        throw error;
      }
    });
  }

  /**
   * Update performance evaluation
   */
  async updatePerformanceEvaluation(
    employeeId: string,
    evaluationData: {
      rating: number;
      reviewer: string;
      comments: string;
    }
  ): Promise<IEmployee | null> {
    return performanceMonitor.measure('updatePerformanceEvaluation', async () => {
      try {
        const employee = await Employee.findOne({ employeeId });

        if (!employee) {
          throw new Error(`Employee not found: ${employeeId}`);
        }

        // Add evaluation to history
        employee.evaluationHistory.push({
          date: new Date(),
          rating: evaluationData.rating,
          reviewer: evaluationData.reviewer,
          comments: evaluationData.comments,
        });

        // Update current rating (average of last 3 evaluations)
        const recent = employee.evaluationHistory.slice(-3);
        const avgRating = recent.reduce((sum, e) => sum + e.rating, 0) / recent.length;
        employee.performanceRating = Math.round(avgRating * 100) / 100;
        employee.lastEvaluationDate = new Date();

        await employee.save();

        globalLogger.info('Performance evaluation recorded', 'EmployeeService', {
          employeeId,
          rating: evaluationData.rating,
        });

        return employee;
      } catch (error) {
        globalErrorTracker.trackError(error as Error, {
          category: ErrorCategory.DATABASE,
          context: { operation: 'updatePerformanceEvaluation', employeeId },
        });
        throw error;
      }
    });
  }

  /**
   * Get employee statistics
   */
  async getStatistics(): Promise<EmployeeStats> {
    return performanceMonitor.measure('getStatistics', async () => {
      try {
        const employees = await Employee.find({ deletedAt: null });

        const stats: EmployeeStats = {
          total: employees.length,
          byDepartment: {},
          byStatus: {},
          byEmploymentType: {},
          averageSalary: 0,
          totalPayroll: 0,
          averagePerformance: 0,
          atRiskCount: 0,
        };

        let totalSalary = 0;
        let totalPerformance = 0;

        employees.forEach(emp => {
          // Department stats
          stats.byDepartment[emp.department] = (stats.byDepartment[emp.department] || 0) + 1;

          // Status stats
          stats.byStatus[emp.status] = (stats.byStatus[emp.status] || 0) + 1;

          // Employment type stats
          stats.byEmploymentType[emp.employmentType] =
            (stats.byEmploymentType[emp.employmentType] || 0) + 1;

          // Salary calculations
          totalSalary += emp.salary;

          // Performance calculations
          totalPerformance += emp.performanceRating;

          // At-risk count
          if (emp.aiInsights.retentionRisk >= 0.7) {
            stats.atRiskCount++;
          }
        });

        stats.averageSalary = employees.length > 0 ? totalSalary / employees.length : 0;
        stats.totalPayroll = totalSalary;
        stats.averagePerformance = employees.length > 0 ? totalPerformance / employees.length : 0;

        return stats;
      } catch (error) {
        globalErrorTracker.trackError(error as Error, {
          category: ErrorCategory.DATABASE,
          context: { operation: 'getStatistics' },
        });
        throw error;
      }
    });
  }

  /**
   * Search employees
   */
  async searchEmployees(query: string): Promise<IEmployee[]> {
    return performanceMonitor.measure('searchEmployees', async () => {
      try {
        const searchRegex = new RegExp(query, 'i');

        return await Employee.find({
          $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { email: searchRegex },
            { employeeId: searchRegex },
            { jobTitle: searchRegex },
          ],
          deletedAt: null,
        });
      } catch (error) {
        globalErrorTracker.trackError(error as Error, {
          category: ErrorCategory.DATABASE,
          context: { operation: 'searchEmployees', query },
        });
        throw error;
      }
    });
  }

  /**
   * Terminate employee
   */
  async terminateEmployee(
    employeeId: string,
    terminationReason: string,
    terminatedBy: string
  ): Promise<IEmployee | null> {
    return performanceMonitor.measure('terminateEmployee', async () => {
      try {
        const employee = await Employee.findOne({ employeeId });

        if (!employee) {
          throw new Error(`Employee not found: ${employeeId}`);
        }

        employee.status = 'Terminated';
        employee.terminationDate = new Date();
        employee.terminationReason = terminationReason;
        employee.lastModifiedBy = terminatedBy;

        await employee.save();

        globalLogger.warn('Employee terminated', 'EmployeeService', {
          employeeId,
          reason: terminationReason,
        });

        return employee;
      } catch (error) {
        globalErrorTracker.trackError(error as Error, {
          category: ErrorCategory.DATABASE,
          context: { operation: 'terminateEmployee', employeeId },
        });
        throw error;
      }
    });
  }

  /**
   * Export employee data
   */
  async exportEmployeeData(employeeIds: string[]): Promise<{
    format: string;
    data: IEmployee[];
    count: number;
    timestamp: Date;
  }> {
    return performanceMonitor.measure('exportEmployeeData', async () => {
      try {
        const employees = await Employee.find({
          employeeId: { $in: employeeIds },
          deletedAt: null,
        });

        return {
          format: 'JSON',
          data: employees,
          count: employees.length,
          timestamp: new Date(),
        };
      } catch (error) {
        globalErrorTracker.trackError(error as Error, {
          category: ErrorCategory.DATABASE,
          context: { operation: 'exportEmployeeData' },
        });
        throw error;
      }
    });
  }
}

/**
 * Create singleton instance
 */
export const employeeService = new EmployeeService();

export default EmployeeService;
