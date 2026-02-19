import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmployeeReportsService } from '../services/employee-reports.service';

/**
 * Employee Reports Service Unit Tests (6 cases)
 * Tests all reporting and analytics functions
 */

describe('EmployeeReportsService', () => {
  let reportsService: EmployeeReportsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      findOne: vi.fn(),
      find: vi.fn(),
      countDocuments: vi.fn(),
      aggregate: vi.fn(),
    };
    reportsService = new EmployeeReportsService(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateExecutiveSummary', () => {
    it('should generate comprehensive executive summary', async () => {
      // Test 1.1
      mockDb.countDocuments.mockResolvedValue(150);
      mockDb.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { department: 'IT', count: 50 },
          { department: 'HR', count: 30 },
          { department: 'Finance', count: 70 },
        ]),
      });

      const result = await reportsService.generateExecutiveSummary();

      expect(result.totalEmployees).toBe(150);
      expect(result.departments).toBeDefined();
      expect(result.averageSalary).toBeGreaterThan(0);
      expect(result.turnoverRate).toBeDefined();
    });

    it('should include key metrics', async () => {
      // Test 1.2
      const result = await reportsService.generateExecutiveSummary();

      expect(result.metrics).toBeDefined();
      expect(result.metrics.activeEmployees).toBeGreaterThanOrEqual(0);
      expect(result.metrics.attendanceRate).toBeGreaterThanOrEqual(0);
      expect(result.metrics.newHires).toBeGreaterThanOrEqual(0);
    });

    it('should highlight critical alerts', async () => {
      // Test 1.3
      const result = await reportsService.generateExecutiveSummary();

      expect(Array.isArray(result.alerts)).toBe(true);
      result.alerts.forEach(alert => {
        expect(alert.severity).toMatch(/Critical|High|Medium|Low/);
        expect(alert.message).toBeDefined();
      });
    });

    it('should provide trend analysis', async () => {
      // Test 1.4
      const result = await reportsService.generateExecutiveSummary();

      expect(result.trends).toBeDefined();
      expect(result.trends.headcount).toBeDefined();
      expect(result.trends.turnover).toBeDefined();
      expect(result.trends.performance).toBeDefined();
    });
  });

  describe('generateDepartmentReport', () => {
    it('should generate department-specific report', async () => {
      // Test 2.1
      const department = 'IT';
      mockDb.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: 'emp-001', department: 'IT', salary: 150000 },
          { _id: 'emp-002', department: 'IT', salary: 130000 },
        ]),
      });

      const result = await reportsService.generateDepartmentReport(department);

      expect(result.department).toBe('IT');
      expect(result.employeeCount).toBe(2);
      expect(result.avgSalary).toBeDefined();
    });

    it('should include performance metrics by department', async () => {
      // Test 2.2
      const result = await reportsService.generateDepartmentReport('IT');

      expect(result.performance).toBeDefined();
      expect(result.performance.avgRating).toBeGreaterThanOrEqual(0);
      expect(result.performance.avgRating).toBeLessThanOrEqual(5);
    });

    it('should calculate department KPIs', async () => {
      // Test 2.3
      const result = await reportsService.generateDepartmentReport('IT');

      expect(result.kpis).toBeDefined();
      expect(result.kpis.productivity).toBeGreaterThanOrEqual(0);
      expect(result.kpis.efficiency).toBeGreaterThanOrEqual(0);
    });

    it('should compare to other departments', async () => {
      // Test 2.4
      const result = await reportsService.generateDepartmentReport('IT');

      expect(result.benchmarking).toBeDefined();
      expect(result.benchmarking.ranking).toBeGreaterThan(0);
      expect(result.benchmarking.percentileRank).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateAttendanceReport', () => {
    it('should generate attendance analytics', async () => {
      // Test 3.1
      const result = await reportsService.generateAttendanceReport(
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result.totalWorkingDays).toBeGreaterThan(0);
      expect(result.averageAttendanceRate).toBeGreaterThanOrEqual(0);
      expect(result.averageAttendanceRate).toBeLessThanOrEqual(100);
    });

    it('should identify chronic absentees', async () => {
      // Test 3.2
      const result = await reportsService.generateAttendanceReport(
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(Array.isArray(result.absentees)).toBe(true);
      result.absentees.forEach(absentee => {
        expect(absentee.employeeId).toBeDefined();
        expect(absentee.absentDays).toBeGreaterThan(0);
      });
    });

    it('should track attendance patterns', async () => {
      // Test 3.3
      const result = await reportsService.generateAttendanceReport(
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result.patterns).toBeDefined();
      expect(result.patterns.mondayAbsenceRate).toBeDefined();
      expect(result.patterns.fridayAbsenceRate).toBeDefined();
    });

    it('should provide absence reasons breakdown', async () => {
      // Test 3.4
      const result = await reportsService.generateAttendanceReport(
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result.absenceReasons).toBeDefined();
      expect(result.absenceReasons.sick).toBeGreaterThanOrEqual(0);
      expect(result.absenceReasons.personal).toBeGreaterThanOrEqual(0);
      expect(result.absenceReasons.unauthorized).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateSalaryReport', () => {
    it('should generate salary analysis report', async () => {
      // Test 4.1
      mockDb.find.mockReturnValue({
        toArray: vi
          .fn()
          .mockResolvedValue([{ salary: 100000 }, { salary: 150000 }, { salary: 200000 }]),
      });

      const result = await reportsService.generateSalaryReport();

      expect(result.totalPayroll).toBe(450000);
      expect(result.averageSalary).toBe(150000);
      expect(result.medianSalary).toBe(150000);
    });

    it('should identify salary outliers', async () => {
      // Test 4.2
      const result = await reportsService.generateSalaryReport();

      expect(result.outliers).toBeDefined();
      expect(Array.isArray(result.outliers)).toBe(true);
    });

    it('should analyze salary by job level', async () => {
      // Test 4.3
      const result = await reportsService.generateSalaryReport();

      expect(result.byJobLevel).toBeDefined();
      expect(result.byJobLevel.junior).toBeDefined();
      expect(result.byJobLevel.senior).toBeDefined();
      expect(result.byJobLevel.manager).toBeDefined();
    });

    it('should track salary growth trends', async () => {
      // Test 4.4
      const result = await reportsService.generateSalaryReport();

      expect(result.trends).toBeDefined();
      expect(result.trends.averageIncrease).toBeGreaterThanOrEqual(0);
      expect(result.trends.increaseRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateTurnoverReport', () => {
    it('should calculate turnover metrics', async () => {
      // Test 5.1
      const result = await reportsService.generateTurnoverReport(2025);

      expect(result.year).toBe(2025);
      expect(result.totalEmployeesSeparated).toBeGreaterThanOrEqual(0);
      expect(result.turnoverRate).toBeGreaterThanOrEqual(0);
      expect(result.turnoverRate).toBeLessThanOrEqual(100);
    });

    it('should identify top reasons for leaving', async () => {
      // Test 5.2
      const result = await reportsService.generateTurnoverReport(2025);

      expect(result.reasonsForLeaving).toBeDefined();
      expect(Array.isArray(result.reasonsForLeaving)).toBe(true);
      result.reasonsForLeaving.forEach(reason => {
        expect(reason.reason).toBeDefined();
        expect(reason.count).toBeGreaterThanOrEqual(0);
      });
    });

    it('should identify high-risk departments', async () => {
      // Test 5.3
      const result = await reportsService.generateTurnoverReport(2025);

      expect(result.departmentRisks).toBeDefined();
      result.departmentRisks.forEach(dept => {
        expect(dept.department).toBeDefined();
        expect(dept.turnoverRate).toBeGreaterThanOrEqual(0);
      });
    });

    it('should forecast turnover trends', async () => {
      // Test 5.4
      const result = await reportsService.generateTurnoverReport(2025);

      expect(result.forecast).toBeDefined();
      expect(result.forecast.nextMonthPrediction).toBeGreaterThanOrEqual(0);
      expect(result.forecast.nextQuarterPrediction).toBeGreaterThanOrEqual(0);
    });
  });

  describe('exportReport', () => {
    it('should export report as PDF', async () => {
      // Test 6.1
      const report = {
        title: 'Executive Summary',
        totalEmployees: 150,
        data: [],
      };

      const result = await reportsService.exportReport(report, 'pdf');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should export report as CSV', async () => {
      // Test 6.2
      const report = {
        title: 'Attendance Report',
        data: [
          { employeeId: 'emp-001', attendance: 95 },
          { employeeId: 'emp-002', attendance: 92 },
        ],
      };

      const result = await reportsService.exportReport(report, 'csv');

      expect(typeof result).toBe('string');
      expect(result).toContain('employeeId');
      expect(result).toContain('emp-001');
    });

    it('should export report as Excel', async () => {
      // Test 6.3
      const report = {
        title: 'Salary Report',
        data: [],
      };

      const result = await reportsService.exportReport(report, 'xlsx');

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should include formatted headers and summaries', async () => {
      // Test 6.4
      const report = {
        title: 'Performance Report',
        summary: { avgRating: 4.2 },
        data: [],
      };

      const result = await reportsService.exportReport(report, 'csv');

      expect(result).toContain(report.title);
      if (report.summary) {
        expect(result).toContain('Summary');
      }
    });
  });
});

/**
 * Summary: 6 report service tests covering all reporting functions
 * - Test 1.1-1.4: Executive summary (4 tests)
 * - Test 2.1-2.4: Department reports (4 tests)
 * - Test 3.1-3.4: Attendance reports (4 tests)
 * - Test 4.1-4.4: Salary reports (4 tests)
 * - Test 5.1-5.4: Turnover reports (4 tests)
 * - Test 6.1-6.4: Export functions (4 tests)
 */
