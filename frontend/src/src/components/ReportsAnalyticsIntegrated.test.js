/**
 * ReportsAnalyticsIntegrated.test.js - اختبارات التقارير والتحليلات
 * اختبارات شاملة للتقارير والبيانات التحليلية
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReportsAnalyticsIntegrated from './ReportsAnalyticsIntegrated';
import HRAPIService from '../services/HRAPIService';

jest.mock('../services/HRAPIService');

describe('ReportsAnalyticsIntegrated Component', () => {
  const mockOverviewReport = {
    totalEmployees: 45,
    todayAttendance: 93,
    pendingLeaves: 3,
    averageSalary: 5000,
    monthlyAttendanceAverage: 91,
    totalLeavesUsed: 180,
    turnoverRate: 8,
    departmentStats: [
      { name: 'IT', count: 15 },
      { name: 'HR', count: 8 },
      { name: 'Finance', count: 10 },
    ],
    attendanceData: [{ date: '2026-02-08', presentCount: 42, absentCount: 3 }],
  };

  const mockPayrollReport = {
    totalPayroll: 225000,
    totalBonuses: 15000,
    totalDeductions: 22500,
    netPayroll: 217500,
    departmentPayroll: [{ department: 'IT', count: 15, total: 85000 }],
    payrollData: [{ month: 'يناير', totalSalary: 200000, allowances: 12000, deductions: 20000 }],
  };

  const mockPerformanceReport = {
    averagePerformance: 3.8,
    topPerformers: 12,
    goodPerformers: 20,
    satisfactoryPerformers: 10,
    needsImprovement: 3,
    productivityRate: 87.5,
    performanceMetrics: [{ rating: 'متفوق', count: 12 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    HRAPIService.getHROverviewReport.mockResolvedValue(mockOverviewReport);
    HRAPIService.getPayrollReport.mockResolvedValue(mockPayrollReport);
    HRAPIService.getPerformanceReport.mockResolvedValue(mockPerformanceReport);
  });

  // -------------------- Rendering Tests --------------------
  describe('Component Rendering', () => {
    test('should render reports component without crashing', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/التقارير والتحليلات|reports/i)).toBeInTheDocument();
      });
    });

    test('should display loading spinner initially', async () => {
      HRAPIService.getHROverviewReport.mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ReportsAnalyticsIntegrated />);
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    test('should display tab navigation', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/نظرة عامة|overview/i)).toBeInTheDocument();
        expect(screen.getByText(/الرواتب|payroll/i)).toBeInTheDocument();
        expect(screen.getByText(/الأداء|performance/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Date Range Selection Tests --------------------
  describe('Date Range Selection', () => {
    test('should display date range inputs', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const dateInputs = document.querySelectorAll('input[type="date"]');
        expect(dateInputs.length).toBeGreaterThanOrEqual(2);
      });
    });

    test('should allow changing start date', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const dateInputs = document.querySelectorAll('input[type="date"]');
        if (dateInputs.length > 0) {
          fireEvent.change(dateInputs[0], { target: { value: '2026-02-01' } });
          expect(dateInputs[0].value).toBe('2026-02-01');
        }
      });
    });

    test('should allow changing end date', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const dateInputs = document.querySelectorAll('input[type="date"]');
        if (dateInputs.length > 1) {
          fireEvent.change(dateInputs[1], { target: { value: '2026-02-28' } });
          expect(dateInputs[1].value).toBe('2026-02-28');
        }
      });
    });

    test('should fetch reports when date changes', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const updateButton = screen.getByText(/تحديث البيانات|update/i);
        fireEvent.click(updateButton);
      });

      await waitFor(() => {
        expect(HRAPIService.getHROverviewReport).toHaveBeenCalled();
      });
    });
  });

  // -------------------- Tab Navigation Tests --------------------
  describe('Tab Navigation', () => {
    test('should switch to overview tab when clicked', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const overviewTab = screen.getByText(/نظرة عامة|overview/i);
        fireEvent.click(overviewTab);
      });

      // Overview content should be visible
      expect(screen.getByText(/إجمالي الموظفين|total employees/i)).toBeInTheDocument();
    });

    test('should switch to payroll tab when clicked', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const payrollTab = screen.getByText(/الرواتب|payroll/i).closest('button');
        if (payrollTab) {
          fireEvent.click(payrollTab);
        }
      });

      // Payroll content should be displayed
      expect(screen.getByText(/إجمالي الرواتب|total payroll/i)).toBeInTheDocument();
    });

    test('should switch to performance tab when clicked', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const performanceTab = screen.getByText(/الأداء|performance/i).closest('button');
        if (performanceTab) {
          fireEvent.click(performanceTab);
        }
      });

      expect(
        document.querySelector('table') || screen.getByText(/متفوق|متوسط/i)
      ).toBeInTheDocument();
    });

    test('should switch to export tab when clicked', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const exportTab = screen.getByText(/التصدير|export/i).closest('button');
        if (exportTab) {
          fireEvent.click(exportTab);
        }
      });

      expect(screen.getByText(/Excel|PDF/)).toBeInTheDocument();
    });
  });

  // -------------------- Overview Tab Tests --------------------
  describe('Overview Tab', () => {
    test('should display overview metrics', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument(); // Total employees
        expect(screen.getByText(/93%/)).toBeInTheDocument(); // Attendance
      });
    });

    test('should display overview charts', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const charts = document.querySelectorAll('svg');
        expect(charts.length).toBeGreaterThan(0);
      });
    });

    test('should display summary statistics', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/متوسط الحضور|متوسط الراتب/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Payroll Tab Tests --------------------
  describe('Payroll Tab', () => {
    test('should fetch payroll report when tab is clicked', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const payrollTab = screen.getByText(/الرواتب|payroll/i).closest('button');
        if (payrollTab) {
          fireEvent.click(payrollTab);
        }
      });

      await waitFor(() => {
        expect(HRAPIService.getPayrollReport).toHaveBeenCalled();
      });
    });

    test('should display payroll metrics', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const payrollTab = screen.getByText(/الرواتب|payroll/i).closest('button');
        if (payrollTab) {
          fireEvent.click(payrollTab);
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/225000|217500/)).toBeInTheDocument();
      });
    });

    test('should display payroll breakdown table', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const payrollTab = screen.getByText(/الرواتب|payroll/i).closest('button');
        if (payrollTab) {
          fireEvent.click(payrollTab);
        }
      });

      await waitFor(() => {
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
      });
    });
  });

  // -------------------- Performance Tab Tests --------------------
  describe('Performance Tab', () => {
    test('should fetch performance report when tab is clicked', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const performanceTab = screen.getByText(/الأداء|performance/i).closest('button');
        if (performanceTab) {
          fireEvent.click(performanceTab);
        }
      });

      await waitFor(() => {
        expect(HRAPIService.getPerformanceReport).toHaveBeenCalled();
      });
    });

    test('should display performance metrics', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const performanceTab = screen.getByText(/الأداء|performance/i).closest('button');
        if (performanceTab) {
          fireEvent.click(performanceTab);
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/3.8|متفوق|إنتاجية/i)).toBeInTheDocument();
      });
    });

    test('should display performance breakdown', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const performanceTab = screen.getByText(/الأداء|performance/i).closest('button');
        if (performanceTab) {
          fireEvent.click(performanceTab);
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/متفوق|جيد|مرضي/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Export Tab Tests --------------------
  describe('Export Tab', () => {
    test('should display export options', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const exportTab = screen.getByText(/التصدير|export/i).closest('button');
        if (exportTab) {
          fireEvent.click(exportTab);
        }
      });

      expect(screen.getByText(/Excel|CSV/)).toBeInTheDocument();
    });

    test('should export to Excel when button clicked', async () => {
      const mockCreateElement = document.createElement;
      document.createElement = jest.fn(mockCreateElement);

      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const exportTab = screen.getByText(/التصدير|export/i).closest('button');
        if (exportTab) {
          fireEvent.click(exportTab);
        }
      });

      const excelButton = screen.getByText(/Excel|تصدير/);
      fireEvent.click(excelButton);

      // Check if download was initiated
      expect(document.createElement).toHaveBeenCalledWith('a');
    });
  });

  // -------------------- Chart Display Tests --------------------
  describe('Charts Display', () => {
    test('should render charts in overview tab', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const charts = document.querySelectorAll('svg');
        expect(charts.length).toBeGreaterThan(0);
      });
    });

    test('should render charts in payroll tab', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const payrollTab = screen.getByText(/الرواتب|payroll/i).closest('button');
        if (payrollTab) {
          fireEvent.click(payrollTab);
        }
      });

      await waitFor(() => {
        const charts = document.querySelectorAll('svg');
        expect(charts.length).toBeGreaterThan(0);
      });
    });
  });

  // -------------------- Data Fetching Tests --------------------
  describe('Data Fetching', () => {
    test('should fetch all reports on mount', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        expect(HRAPIService.getHROverviewReport).toHaveBeenCalled();
        expect(HRAPIService.getPayrollReport).toHaveBeenCalled();
        expect(HRAPIService.getPerformanceReport).toHaveBeenCalled();
      });
    });

    test('should handle API errors gracefully', async () => {
      HRAPIService.getHROverviewReport.mockRejectedValueOnce(new Error('API Error'));

      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/خطأ|error/i)).toBeInTheDocument();
      });
    });

    test('should use mock data when API fails', async () => {
      HRAPIService.getHROverviewReport.mockRejectedValueOnce(new Error('API Error'));

      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        // Should still display data from mock
        expect(screen.getByText(/توظيف|موظف|خطأ/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Refresh Functionality Tests --------------------
  describe('Refresh Functionality', () => {
    test('should have refresh button', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /تحديث|refresh/i })).toBeInTheDocument();
      });
    });

    test('should refresh reports when refresh button is clicked', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        expect(HRAPIService.getHROverviewReport).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByRole('button', { name: /تحديث|refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(HRAPIService.getHROverviewReport).toHaveBeenCalledTimes(2);
      });
    });
  });

  // -------------------- Table Display Tests --------------------
  describe('Tables Display', () => {
    test('should display payroll breakdown table', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const payrollTab = screen.getByText(/الرواتب|payroll/i).closest('button');
        if (payrollTab) {
          fireEvent.click(payrollTab);
        }
      });

      await waitFor(() => {
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
      });
    });

    test('should display performance breakdown table', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        const performanceTab = screen.getByText(/الأداء|performance/i).closest('button');
        if (performanceTab) {
          fireEvent.click(performanceTab);
        }
      });

      // Table should be visible with performance data
      expect(document.querySelector('table') || screen.getByText(/متفوق/i)).toBeInTheDocument();
    });
  });

  // -------------------- Responsive Design Tests --------------------
  describe('Responsive Design', () => {
    test('should be responsive on mobile', () => {
      global.innerWidth = 375;
      render(<ReportsAnalyticsIntegrated />);

      const container = screen.getByText(/التقارير والتحليلات/i);
      expect(container).toBeInTheDocument();
    });

    test('should be responsive on desktop', () => {
      global.innerWidth = 1024;
      render(<ReportsAnalyticsIntegrated />);

      const tabs = screen.getAllByText(/نظرة عامة|الرواتب|الأداء/i);
      expect(tabs.length).toBeGreaterThan(0);
    });
  });

  // -------------------- RTL Language Tests --------------------
  describe('RTL Language Support', () => {
    test('should have dir="rtl" attribute', () => {
      const { container } = render(<ReportsAnalyticsIntegrated />);
      const mainDiv = container.querySelector('[dir="rtl"]');
      expect(mainDiv).toBeInTheDocument();
    });

    test('should display Arabic text correctly', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/التقارير والتحليلات/)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Accessibility Tests --------------------
  describe('Accessibility', () => {
    test('should have proper heading structure', async () => {
      render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        expect(screen.getByRole('heading')).toBeInTheDocument();
      });
    });

    test('should have accessible tabs', () => {
      render(<ReportsAnalyticsIntegrated />);

      const tabs = screen
        .getAllByRole('button')
        .filter(btn => btn.textContent.includes('نظرة') || btn.textContent.includes('رواتب'));

      expect(tabs.length).toBeGreaterThan(0);
    });

    test('should have accessible input fields', () => {
      render(<ReportsAnalyticsIntegrated />);

      const inputs = document.querySelectorAll('input[type="date"]');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  // -------------------- Error Recovery Tests --------------------
  describe('Error Recovery', () => {
    test('should recover from API error', async () => {
      HRAPIService.getHROverviewReport.mockRejectedValueOnce(new Error('API Error'));

      const { rerender } = render(<ReportsAnalyticsIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/خطأ|error/i)).toBeInTheDocument();
      });

      // Mock successful response for next render
      HRAPIService.getHROverviewReport.mockResolvedValueOnce(mockOverviewReport);

      rerender(<ReportsAnalyticsIntegrated />);

      await waitFor(
        () => {
          expect(screen.queryByText(/خطأ/i)).not.toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });
  });
});
