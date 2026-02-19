/**
 * ============================================
 * EMPLOYEE REPORTS SERVICE
 * خدمة التقارير المتقدمة
 * ============================================
 */

import { employeeService } from './employee.service';
import { employeeAIService } from './employee-ai.service';
import { globalLogger } from '../utils/advanced.logger';
import { performanceMonitor } from '../utils/performance.monitor';

interface ReportOptions {
  format?: 'json' | 'csv' | 'pdf';
  filters?: {
    department?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  };
}

interface ExecutiveReport {
  generatedAt: Date;
  totalEmployees: number;
  activeEmployees: number;
  departmentBreakdown: any;
  performanceMetrics: any;
  atRiskEmployees: any;
  recommendations: string[];
}

class EmployeeReportsService {
  /**
   * Generate comprehensive executive report
   */
  async generateExecutiveReport(options?: ReportOptions): Promise<ExecutiveReport> {
    return performanceMonitor.measure('GENERATE_EXECUTIVE_REPORT', async () => {
      try {
        globalLogger.info('Generating executive report', 'EmployeeReportsService');

        const { employees } = await employeeService.getAllEmployees({ limit: 10000 });
        const stats = await employeeService.getStatistics();

        const activeEmployees = employees.filter(e => e.status === 'Active');
        const atRiskEmployees = employees.filter(e => (e.aiInsights?.retentionRisk || 0) >= 0.7);

        // Department breakdown
        interface DeptBreakdown {
          [key: string]: {
            count: number;
            activeCount: number;
            averagePerformance: number;
            atRiskCount: number;
          };
        }
        const deptBreakdown: DeptBreakdown = {};

        activeEmployees.forEach(emp => {
          if (!deptBreakdown[emp.department]) {
            deptBreakdown[emp.department] = {
              count: 0,
              activeCount: 0,
              averagePerformance: 0,
              atRiskCount: 0,
            };
          }

          deptBreakdown[emp.department].count++;
          deptBreakdown[emp.department].activeCount++;
          deptBreakdown[emp.department].averagePerformance += emp.performanceRating || 0;

          if ((emp.aiInsights?.retentionRisk || 0) >= 0.7) {
            deptBreakdown[emp.department].atRiskCount++;
          }
        });

        Object.keys(deptBreakdown).forEach(dept => {
          deptBreakdown[dept].averagePerformance =
            deptBreakdown[dept].averagePerformance / deptBreakdown[dept].count;
        });

        // Performance metrics
        const performanceMetrics = {
          averageRating: stats.avgPerformance || 0,
          highPerformers: activeEmployees.filter(e => (e.performanceRating || 0) >= 4.5).length,
          lowPerformers: activeEmployees.filter(e => (e.performanceRating || 0) < 2.5).length,
          noRating: activeEmployees.filter(e => !e.performanceRating).length,
        };

        // Recommendations
        const recommendations: string[] = [];

        if (atRiskEmployees.length > activeEmployees.length * 0.2) {
          recommendations.push(
            `⚠️ High retention risk: ${atRiskEmployees.length} employees (${((atRiskEmployees.length / activeEmployees.length) * 100).toFixed(1)}%) at risk`
          );
        }

        if (performanceMetrics.lowPerformers > activeEmployees.length * 0.15) {
          recommendations.push(
            `📊 Performance concern: ${performanceMetrics.lowPerformers} employees with low performance ratings`
          );
        }

        if (performanceMetrics.noRating > activeEmployees.length * 0.1) {
          recommendations.push(
            `📋 Missing evaluations: ${performanceMetrics.noRating} employees without performance ratings`
          );
        }

        // High performing departments
        const topDepts = Object.entries(deptBreakdown)
          .sort((a, b) => b[1].averagePerformance - a[1].averagePerformance)
          .slice(0, 3)
          .map(([dept]) => `${dept} (${deptBreakdown[dept].averagePerformance.toFixed(1)}/5)`);

        if (topDepts.length > 0) {
          recommendations.push(`🏆 Top performing departments: ${topDepts.join(', ')}`);
        }

        const report: ExecutiveReport = {
          generatedAt: new Date(),
          totalEmployees: employees.length,
          activeEmployees: activeEmployees.length,
          departmentBreakdown: deptBreakdown,
          performanceMetrics,
          atRiskEmployees: {
            count: atRiskEmployees.length,
            percentage: ((atRiskEmployees.length / activeEmployees.length) * 100).toFixed(1),
            topRisks: atRiskEmployees
              .sort(
                (a, b) => (b.aiInsights?.retentionRisk || 0) - (a.aiInsights?.retentionRisk || 0)
              )
              .slice(0, 5)
              .map(emp => ({
                employeeId: emp.employeeId,
                name: emp.fullName,
                risk: (emp.aiInsights?.retentionRisk || 0).toFixed(2),
              })),
          },
          recommendations,
        };

        globalLogger.info('Executive report generated successfully', 'EmployeeReportsService', {
          totalEmployees: report.totalEmployees,
          atRiskCount: (report.atRiskEmployees as any).count,
        });

        return report;
      } catch (error) {
        globalLogger.error(
          'Failed to generate executive report',
          'EmployeeReportsService',
          error as Error
        );
        throw error;
      }
    });
  }

  /**
   * Generate department performance report
   */
  async generateDepartmentReport(department: string): Promise<any> {
    return performanceMonitor.measure('GENERATE_DEPT_REPORT', async () => {
      try {
        const employees = await employeeService.getEmployeesByDepartment(department);

        if (employees.length === 0) {
          throw new Error(`No employees found in department: ${department}`);
        }

        const activeEmployees = employees.filter(e => e.status === 'Active');
        const atRiskEmployees = employees.filter(e => (e.aiInsights?.retentionRisk || 0) >= 0.7);

        const report = {
          department,
          generatedAt: new Date(),
          totalEmployees: employees.length,
          activeEmployees: activeEmployees.length,
          inactiveEmployees: employees.length - activeEmployees.length,
          averagePerformance: (
            activeEmployees.reduce((sum, e) => sum + (e.performanceRating || 0), 0) /
            activeEmployees.length
          ).toFixed(2),
          averageSalary: (
            activeEmployees.reduce((sum, e) => sum + (e.salary || 0), 0) / activeEmployees.length
          ).toFixed(2),
          totalPayroll: activeEmployees.reduce((sum, e) => sum + (e.salary || 0), 0),
          atRiskEmployees: atRiskEmployees.length,
          topPerformers: activeEmployees
            .sort((a, b) => (b.performanceRating || 0) - (a.performanceRating || 0))
            .slice(0, 3)
            .map(e => ({
              employeeId: e.employeeId,
              name: e.fullName,
              position: e.position,
              rating: e.performanceRating,
            })),
          atRiskList: atRiskEmployees
            .sort((a, b) => (b.aiInsights?.retentionRisk || 0) - (a.aiInsights?.retentionRisk || 0))
            .map(e => ({
              employeeId: e.employeeId,
              name: e.fullName,
              position: e.position,
              retentionRisk: (e.aiInsights?.retentionRisk || 0).toFixed(2),
            })),
        };

        return report;
      } catch (error) {
        globalLogger.error(
          `Failed to generate department report for ${department}`,
          'EmployeeReportsService',
          error as Error
        );
        throw error;
      }
    });
  }

  /**
   * Generate training needs analysis
   */
  async generateTrainingNeeds(): Promise<any> {
    return performanceMonitor.measure('GENERATE_TRAINING_NEEDS', async () => {
      try {
        const { employees } = await employeeService.getAllEmployees({ limit: 10000 });

        interface TrainingCatalog {
          [key: string]: {
            count: number;
            employees: Array<{
              employeeId: string;
              name: string;
              department: string;
            }>;
          };
        }

        const trainingNeeds: TrainingCatalog = {};

        for (const emp of employees) {
          if (emp.status !== 'Active') continue;

          const trainings = emp.aiInsights?.recommendedTrainings || [];

          for (const training of trainings) {
            if (!trainingNeeds[training]) {
              trainingNeeds[training] = {
                count: 0,
                employees: [],
              };
            }

            trainingNeeds[training].count++;
            trainingNeeds[training].employees.push({
              employeeId: emp.employeeId,
              name: emp.fullName,
              department: emp.department,
            });
          }
        }

        // Sort by count
        const sortedTrainings = Object.entries(trainingNeeds)
          .sort((a, b) => b[1].count - a[1].count)
          .reduce((acc: TrainingCatalog, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {});

        return {
          generatedAt: new Date(),
          totalTrainingGaps: Object.keys(sortedTrainings).length,
          trainingNeeds: sortedTrainings,
          priorityTrainings: Object.entries(sortedTrainings)
            .slice(0, 5)
            .map(([training, data]) => ({
              training,
              employeeCount: data.count,
            })),
        };
      } catch (error) {
        globalLogger.error(
          'Failed to generate training needs',
          'EmployeeReportsService',
          error as Error
        );
        throw error;
      }
    });
  }

  /**
   * Generate career development report
   */
  async generateCareerDevelopmentReport(): Promise<any> {
    return performanceMonitor.measure('GENERATE_CAREER_REPORT', async () => {
      try {
        const { employees } = await employeeService.getAllEmployees({ limit: 10000 });

        const report = {
          generatedAt: new Date(),
          totalEmployees: employees.length,
          careerPaths: {
            leadership: employees.filter(e =>
              (e.aiInsights?.careerPathSuggestions || []).some((p: string) =>
                p.toLowerCase().includes('leadership')
              )
            ).length,
            specialist: employees.filter(e =>
              (e.aiInsights?.careerPathSuggestions || []).some((p: string) =>
                p.toLowerCase().includes('specialist')
              )
            ).length,
            management: employees.filter(e =>
              (e.aiInsights?.careerPathSuggestions || []).some((p: string) =>
                p.toLowerCase().includes('management')
              )
            ).length,
          },
          developmentAreas: employees
            .filter(e => (e.aiInsights?.developmentAreas || []).length > 0)
            .map(e => ({
              employeeId: e.employeeId,
              name: e.fullName,
              developmentAreas: e.aiInsights?.developmentAreas || [],
            }))
            .slice(0, 20),
          seniorEmployees: employees.filter(e => {
            const hireDate = new Date(e.hireDate || new Date());
            const tenure = (Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
            return tenure >= 5 && e.status === 'Active';
          }).length,
        };

        return report;
      } catch (error) {
        globalLogger.error(
          'Failed to generate career development report',
          'EmployeeReportsService',
          error as Error
        );
        throw error;
      }
    });
  }

  /**
   * Export data in CSV format
   */
  async exportToCSV(employees: any[]): Promise<string> {
    try {
      const headers = [
        'Employee ID',
        'Name',
        'Email',
        'Department',
        'Position',
        'Hire Date',
        'Status',
        'Performance Rating',
        'Retention Risk',
        'Salary',
      ];

      const rows = employees.map(emp => [
        emp.employeeId,
        emp.fullName,
        emp.email,
        emp.department,
        emp.position,
        emp.hireDate,
        emp.status,
        emp.performanceRating || 'N/A',
        (emp.aiInsights?.retentionRisk || 0).toFixed(2),
        emp.salary || 'N/A',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map((cell: any) => `"${cell}"`).join(',')),
      ].join('\n');

      return csv;
    } catch (error) {
      globalLogger.error('Failed to export to CSV', 'EmployeeReportsService', error as Error);
      throw error;
    }
  }

  /**
   * Export data as JSON
   */
  async exportToJSON(employees: any[]): Promise<string> {
    try {
      return JSON.stringify(
        {
          generatedAt: new Date(),
          totalEmployees: employees.length,
          data: employees,
        },
        null,
        2
      );
    } catch (error) {
      globalLogger.error('Failed to export to JSON', 'EmployeeReportsService', error as Error);
      throw error;
    }
  }
}

export const employeeReportsService = new EmployeeReportsService();
