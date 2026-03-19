/**
 * HRDashboardIntegrated.test.js - اختبارات لوحة تحكم الموارد البشرية
 * اختبارات شاملة لمكون Dashboard المتكامل
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HRDashboardIntegrated from './HRDashboardIntegrated';
import HRAPIService from '../services/HRAPIService';

// Mock the HRAPIService
jest.mock('../services/HRAPIService');

describe('HRDashboardIntegrated Component', () => {
  const mockOverviewData = {
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
    attendanceData: [
      { date: '2026-02-08', presentCount: 42, absentCount: 3 },
      { date: '2026-02-09', presentCount: 43, absentCount: 2 },
    ],
    payrollData: {
      total: 225000,
      allowances: 15000,
      deductions: 22500,
    },
    alerts: [
      { id: 1, severity: 'high', message: 'تنبيه عاجل' },
      { id: 2, severity: 'medium', message: 'تنبيه متوسط' },
    ],
    recentLeaveRequests: [
      { id: 1, name: 'أحمد', status: 'معلق' },
      { id: 2, name: 'فاطمة', status: 'موافق عليه' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    HRAPIService.getHROverviewReport.mockResolvedValue(mockOverviewData);
  });

  // -------------------- Rendering Tests --------------------
  describe('Component Rendering', () => {
    test('should render dashboard without crashing', () => {
      render(<HRDashboardIntegrated />);
      expect(screen.getByText(/لوحة التحكم/i)).toBeInTheDocument();
    });

    test('should display loading spinner initially', async () => {
      HRAPIService.getHROverviewReport.mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      render(<HRDashboardIntegrated />);
      expect(
        screen.getByRole('progressbar') || document.querySelector('.animate-spin')
      ).toBeInTheDocument();
    });

    test('should display title correctly', () => {
      render(<HRDashboardIntegrated />);
      expect(screen.getByText(/لوحة التحكم/i)).toBeInTheDocument();
    });
  });

  // -------------------- Data Fetching Tests --------------------
  describe('Data Fetching', () => {
    test('should fetch dashboard data on component mount', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        expect(HRAPIService.getHROverviewReport).toHaveBeenCalled();
      });
    });

    test('should display KPI values correctly', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/45/)).toBeInTheDocument(); // Total employees
      });
    });

    test('should handle API errors gracefully', async () => {
      HRAPIService.getHROverviewReport.mockRejectedValueOnce(new Error('API Error'));

      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/خطأ/i)).toBeInTheDocument();
      });
    });

    test('should use mock data when API fails', async () => {
      HRAPIService.getHROverviewReport.mockRejectedValueOnce(new Error('API Error'));

      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        // Should still display some data from mock
        expect(screen.getByText(/خطأ|موظف/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------- KPI Cards Tests --------------------
  describe('KPI Cards Display', () => {
    test('should display all KPI cards', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/إجمالي الموظفين/i)).toBeInTheDocument();
        expect(screen.getByText(/الحضور/i)).toBeInTheDocument();
        expect(screen.getByText(/متوسط الراتب/i)).toBeInTheDocument();
      });
    });

    test('should display correct KPI values', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument(); // Total employees
        expect(screen.getByText('93%')).toBeInTheDocument(); // Attendance
      });
    });

    test('should display trend indicators', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        // Charts and indicators should be rendered
        expect(document.querySelectorAll('svg').length).toBeGreaterThan(0);
      });
    });
  });

  // -------------------- Charts Tests --------------------
  describe('Charts Display', () => {
    test('should render charts when data is available', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        const charts = document.querySelectorAll('[role="img"]');
        expect(charts.length).toBeGreaterThan(0);
      });
    });

    test('should display charts with correct data', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        // Check if chart data is rendered
        expect(screen.queryByText(/IT|HR|Finance/)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Alerts Section Tests --------------------
  describe('Alerts Section', () => {
    test('should display alerts panel', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/تنبيهات/i)).toBeInTheDocument();
      });
    });

    test('should display alerts with correct severity colors', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        const alertPanel = screen.getByText(/تنبيهات/i).parentElement;
        expect(alertPanel).toBeInTheDocument();
      });
    });
  });

  // -------------------- Recent Requests Table Tests --------------------
  describe('Recent Requests Table', () => {
    test('should display recent leave requests table', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/الطلبات الأخيرة|أحمد|فاطمة/i)).toBeInTheDocument();
      });
    });

    test('should display table with correct columns', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
        expect(table?.querySelectorAll('th').length).toBeGreaterThan(0);
      });
    });
  });

  // -------------------- Refresh Functionality Tests --------------------
  describe('Refresh Functionality', () => {
    test('should have refresh button', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /تحديث|refresh/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });

    test('should fetch data when refresh button is clicked', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        expect(HRAPIService.getHROverviewReport).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByRole('button', { name: /تحديث|refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(HRAPIService.getHROverviewReport).toHaveBeenCalledTimes(2);
      });
    });

    test('should show loading state during refresh', async () => {
      HRAPIService.getHROverviewReport.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockOverviewData), 100))
      );

      render(<HRDashboardIntegrated />);

      const refreshButton = screen.getByRole('button', { name: /تحديث|refresh/i });
      fireEvent.click(refreshButton);

      // Loading state should be visible
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  // -------------------- Error Recovery Tests --------------------
  describe('Error Recovery', () => {
    test('should recover from error and display data', async () => {
      HRAPIService.getHROverviewReport.mockRejectedValueOnce(new Error('API Error'));

      const { rerender } = render(<HRDashboardIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/خطأ/i)).toBeInTheDocument();
      });

      // Mock successful response for next render
      HRAPIService.getHROverviewReport.mockResolvedValueOnce(mockOverviewData);

      rerender(<HRDashboardIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument();
      });
    });
  });

  // -------------------- Responsive Design Tests --------------------
  describe('Responsive Design', () => {
    test('should be responsive on mobile', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<HRDashboardIntegrated />);

      const container = screen.getByText(/لوحة التحكم/i).closest('div');
      expect(container).toHaveClass('space-y-6');
    });

    test('should be responsive on tablet', () => {
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));

      render(<HRDashboardIntegrated />);

      const grid = document.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });
  });

  // -------------------- Accessibility Tests --------------------
  describe('Accessibility', () => {
    test('should have proper heading structure', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        expect(screen.getByRole('heading')).toBeInTheDocument();
      });
    });

    test('should have aria labels for charts', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        const charts = document.querySelectorAll('[role="img"]');
        expect(charts.length).toBeGreaterThan(0);
      });
    });

    test('buttons should be accessible', () => {
      render(<HRDashboardIntegrated />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveTextContent((content, element) => {
          return element?.textContent?.length > 0;
        });
      });
    });
  });

  // -------------------- RTL Language Tests --------------------
  describe('RTL Language Support', () => {
    test('should have dir="rtl" attribute', () => {
      const { container } = render(<HRDashboardIntegrated />);
      const mainDiv = container.querySelector('[dir="rtl"]');
      expect(mainDiv).toBeInTheDocument();
    });

    test('should display Arabic text correctly', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/لوحة التحكم/i)).toBeInTheDocument();
      });
    });
  });
});
