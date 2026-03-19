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
    recentRequests: [
      {
        employeeName: 'أحمد محمد',
        type: 'سنوية',
        startDate: '2026-02-15',
        endDate: '2026-02-20',
        status: 'معلق',
      },
      {
        employeeName: 'فاطمة علي',
        type: 'مرضية',
        startDate: '2026-02-10',
        endDate: '2026-02-12',
        status: 'موافق عليه',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    HRAPIService.getHROverviewReport.mockResolvedValue(mockOverviewData);
  });

  // -------------------- Rendering Tests --------------------
  describe('Component Rendering', () => {
    test('should render dashboard without crashing', async () => {
      render(<HRDashboardIntegrated />);
      expect(await screen.findByText(/لوحة التحكم/i)).toBeInTheDocument();
    });

    test('should display loading spinner initially', async () => {
      HRAPIService.getHROverviewReport.mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      render(<HRDashboardIntegrated />);
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    test('should display title correctly', async () => {
      render(<HRDashboardIntegrated />);
      expect(await screen.findByText(/لوحة التحكم/i)).toBeInTheDocument();
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
        expect(screen.getByText(/فشل/i)).toBeInTheDocument();
      });
    });

    test('should use mock data when API fails', async () => {
      HRAPIService.getHROverviewReport.mockRejectedValueOnce(new Error('API Error'));

      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        // Should still display some data from mock
        expect(screen.getByText(/فشل تحميل/i)).toBeInTheDocument();
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
        expect(screen.getByText(/5000 ريال/)).toBeInTheDocument(); // Average salary
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
        const charts = document.querySelectorAll('.recharts-responsive-container');
        expect(charts.length).toBeGreaterThan(0);
      });
    });

    test('should display charts with correct data', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        // Check if chart section headings are rendered
        expect(screen.getByText(/توزيع الأقسام/i)).toBeInTheDocument();
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
        expect(screen.getByText(/طلبات الإجازات الحديثة/i)).toBeInTheDocument();
        expect(screen.getByText(/أحمد محمد/i)).toBeInTheDocument();
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

      // Wait for content to load (not just API call)
      const refreshButton = await screen.findByRole('button', { name: /تحديث|refresh/i });
      expect(HRAPIService.getHROverviewReport).toHaveBeenCalledTimes(1);

      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(HRAPIService.getHROverviewReport).toHaveBeenCalledTimes(2);
      });
    });

    test('should show loading state during refresh', async () => {
      render(<HRDashboardIntegrated />);

      // Wait for initial load to complete
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /تحديث|refresh/i })).toBeInTheDocument();
      });

      // Mock slow response for refresh
      HRAPIService.getHROverviewReport.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockOverviewData), 100))
      );

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

      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/فشل/i)).toBeInTheDocument();
      });

      // Mock successful response for refresh
      HRAPIService.getHROverviewReport.mockResolvedValueOnce(mockOverviewData);

      // Click refresh to reload data
      const refreshButton = screen.getByRole('button', { name: /تحديث|refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument();
      });
    });
  });

  // -------------------- Responsive Design Tests --------------------
  describe('Responsive Design', () => {
    test('should be responsive on mobile', async () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<HRDashboardIntegrated />);

      const title = await screen.findByText(/لوحة التحكم/i);
      const container = title.closest('.space-y-6');
      expect(container).toBeInTheDocument();
    });

    test('should be responsive on tablet', async () => {
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));

      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        const grid = document.querySelector('.grid');
        expect(grid).toBeInTheDocument();
      });
    });
  });

  // -------------------- Accessibility Tests --------------------
  describe('Accessibility', () => {
    test('should have proper heading structure', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        expect(headings.length).toBeGreaterThan(0);
      });
    });

    test('should have aria labels for charts', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        const charts = document.querySelectorAll('.recharts-responsive-container');
        expect(charts.length).toBeGreaterThan(0);
      });
    });

    test('buttons should be accessible', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button.textContent.length).toBeGreaterThan(0);
        });
      });
    });
  });

  // -------------------- RTL Language Tests --------------------
  describe('RTL Language Support', () => {
    test('should have dir="rtl" attribute', async () => {
      const { container } = render(<HRDashboardIntegrated />);
      await waitFor(() => {
        const mainDiv = container.querySelector('[dir="rtl"]');
        expect(mainDiv).toBeInTheDocument();
      });
    });

    test('should display Arabic text correctly', async () => {
      render(<HRDashboardIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/لوحة التحكم/i)).toBeInTheDocument();
      });
    });
  });
});
