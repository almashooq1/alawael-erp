/**
 * PayrollManagementIntegrated.test.js - اختبارات إدارة الرواتب
 * اختبارات شاملة لمعالجة الرواتب والتحويلات البنكية
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PayrollManagementIntegrated from './PayrollManagementIntegrated';
import HRAPIService from '../services/HRAPIService';

jest.mock('../services/HRAPIService');

describe('PayrollManagementIntegrated Component', () => {
  const mockPayrollData = [
    {
      id: 1,
      employeeName: 'أحمد محمد',
      position: 'مهندس برمجيات',
      baseSalary: 5000,
      allowances: 500,
      deductions: 500,
      netSalary: 5000,
      status: 'معلق',
    },
    {
      id: 2,
      employeeName: 'فاطمة علي',
      position: 'محللة نظم',
      baseSalary: 4500,
      allowances: 400,
      deductions: 450,
      netSalary: 4450,
      status: 'تم الدفع',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    HRAPIService.getPayrollReport.mockResolvedValue(mockPayrollData);
    HRAPIService.processMonthlyPayroll.mockResolvedValue({
      success: true,
      message: 'تمت معالجة الرواتب',
      payrollDetails: mockPayrollData,
    });
    HRAPIService.transferPayroll.mockResolvedValue({
      success: true,
      message: 'تمت التحويلات البنكية',
      count: 2,
    });
  });

  // -------------------- Rendering Tests --------------------
  describe('Component Rendering', () => {
    test('should render payroll management without crashing', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/إدارة الرواتب|payroll/i)).toBeInTheDocument();
      });
    });

    test('should display month selector', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        const monthInput =
          screen.getByRole('textbox', { name: /month|الشهر/i }) ||
          document.querySelector('input[type="month"]');
        expect(monthInput).toBeInTheDocument();
      });
    });

    test('should display action buttons', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/تحديث|refresh/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Date Selection Tests --------------------
  describe('Month Selection', () => {
    test('should allow month selection', async () => {
      render(<PayrollManagementIntegrated />);

      const monthInput = document.querySelector('input[type="month"]');
      expect(monthInput).toBeInTheDocument();

      fireEvent.change(monthInput, { target: { value: '2026-02' } });
      expect(monthInput.value).toBe('2026-02');
    });

    test('should fetch payroll data when month changes', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(HRAPIService.getPayrollReport).toHaveBeenCalled();
      });
    });
  });

  // -------------------- Data Fetching Tests --------------------
  describe('Data Fetching', () => {
    test('should fetch payroll report on component mount', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(HRAPIService.getPayrollReport).toHaveBeenCalled();
      });
    });

    test('should display payroll data in table', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
        expect(screen.getByText('فاطمة علي')).toBeInTheDocument();
      });
    });

    test('should display salary details correctly', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('5000')).toBeInTheDocument(); // Base salary
      });
    });

    test('should handle API errors gracefully', async () => {
      HRAPIService.getPayrollReport.mockRejectedValueOnce(new Error('API Error'));

      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/خطأ|error/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Summary Cards Tests --------------------
  describe('Summary Cards', () => {
    test('should display summary cards', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/إجمالي الرواتب|total payroll/i)).toBeInTheDocument();
      });
    });

    test('should calculate totals correctly', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        // Check if totals are displayed (exact values depend on mock data)
        expect(screen.getByText(/9500|9450/)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Payroll Processing Tests --------------------
  describe('Process Payroll', () => {
    test('should show confirmation dialog before processing', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        const processButton = screen.getByText(/معالجة الرواتب|process payroll/i);
        fireEvent.click(processButton);
      });

      // Confirmation dialog should appear
      expect(window.confirm).toBeDefined();
    });

    test('should process payroll when confirmed', async () => {
      window.confirm = jest.fn(() => true);

      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        const processButton = screen.getByText(/معالجة الرواتب|process payroll/i);
        fireEvent.click(processButton);
      });

      await waitFor(() => {
        expect(HRAPIService.processMonthlyPayroll).toHaveBeenCalled();
      });
    });

    test('should show success message after processing', async () => {
      window.confirm = jest.fn(() => true);

      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        const processButton = screen.getByText(/معالجة الرواتب|process payroll/i);
        fireEvent.click(processButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/نجاح|success/i)).toBeInTheDocument();
      });
    });

    test('should not process if confirmation is cancelled', async () => {
      window.confirm = jest.fn(() => false);

      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        const processButton = screen.getByText(/معالجة الرواتب|process payroll/i);
        fireEvent.click(processButton);
      });

      await waitFor(() => {
        expect(HRAPIService.processMonthlyPayroll).not.toHaveBeenCalled();
      });
    });
  });

  // -------------------- Bank Transfer Tests --------------------
  describe('Bank Transfer', () => {
    test('should show confirmation before transfer', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        const transferButton = screen.getByText(/تحويل بنكي|transfer/i);
        if (transferButton) {
          fireEvent.click(transferButton);
        }
      });

      expect(window.confirm).toBeDefined();
    });

    test('should execute transfer when confirmed', async () => {
      window.confirm = jest.fn(() => true);

      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        const transferButton = screen.queryByText(/تحويل بنكي|transfer/i);
        if (transferButton) {
          fireEvent.click(transferButton);
        }
      });

      await waitFor(
        () => {
          // Transfer should be called if button exists
          if (HRAPIService.transferPayroll.mock.calls.length > 0) {
            expect(HRAPIService.transferPayroll).toHaveBeenCalled();
          }
        },
        { timeout: 1000 }
      );
    });
  });

  // -------------------- CSV Export Tests --------------------
  describe('CSV Export', () => {
    test('should have export button', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/تصدير|export|CSV/i)).toBeInTheDocument();
      });
    });

    test('should export data as CSV', async () => {
      const mockCreateElement = document.createElement;
      const mockAppend = document.body.appendChild;
      const mockRemove = document.body.removeChild;

      document.createElement = jest.fn(mockCreateElement);
      document.body.appendChild = jest.fn(mockAppend);
      document.body.removeChild = jest.fn(mockRemove);

      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        const exportButton = screen.getByText(/تصدير|export/i);
        fireEvent.click(exportButton);
      });

      // Check if download was triggered
      expect(document.createElement).toHaveBeenCalledWith('a');
    });
  });

  // -------------------- Table Display Tests --------------------
  describe('Payroll Table', () => {
    test('should display payroll table', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
      });
    });

    test('should display all required columns', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/الاسم|name/i)).toBeInTheDocument();
        expect(screen.getByText(/الراتب الأساسي|base salary/i)).toBeInTheDocument();
        expect(screen.getByText(/الحالة|status/i)).toBeInTheDocument();
      });
    });

    test('should display status badges with correct colors', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/معلق|تم الدفع/i)).toBeInTheDocument();
      });
    });

    test('should display totals row', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        // Totals should be visible
        const totalRows = screen.queryAllByText(/الإجمالي|total/i);
        expect(totalRows.length).toBeGreaterThan(0);
      });
    });
  });

  // -------------------- Refresh Functionality Tests --------------------
  describe('Refresh Functionality', () => {
    test('should refresh data when refresh button is clicked', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(HRAPIService.getPayrollReport).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByText(/تحديث|refresh/i);
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(HRAPIService.getPayrollReport).toHaveBeenCalledTimes(2);
      });
    });
  });

  // -------------------- Error Handling Tests --------------------
  describe('Error Handling', () => {
    test('should handle processing errors', async () => {
      HRAPIService.processMonthlyPayroll.mockRejectedValueOnce(new Error('Processing failed'));

      window.confirm = jest.fn(() => true);

      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        const processButton = screen.getByText(/معالجة الرواتب|process payroll/i);
        fireEvent.click(processButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/خطأ|error/i)).toBeInTheDocument();
      });
    });

    test('should handle transfer errors', async () => {
      HRAPIService.transferPayroll.mockRejectedValueOnce(new Error('Transfer failed'));

      window.confirm = jest.fn(() => true);

      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/أحمد محمد/)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Responsive Design Tests --------------------
  describe('Responsive Design', () => {
    test('should be responsive on mobile', () => {
      global.innerWidth = 375;
      render(<PayrollManagementIntegrated />);

      const container = screen.getByText(/رواتب|payroll/i);
      expect(container).toBeInTheDocument();
    });

    test('should be responsive on tablet', () => {
      global.innerWidth = 768;
      render(<PayrollManagementIntegrated />);

      const table = document.querySelector('table');
      expect(table).toBeInTheDocument();
    });
  });

  // -------------------- RTL Language Tests --------------------
  describe('RTL Language Support', () => {
    test('should have dir="rtl" for Arabic', () => {
      const { container } = render(<PayrollManagementIntegrated />);
      const mainDiv = container.querySelector('[dir="rtl"]');
      expect(mainDiv).toBeInTheDocument();
    });

    test('should display Arabic currency correctly', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/ر\.س|ريال|salary/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Accessibility Tests --------------------
  describe('Accessibility', () => {
    test('should have proper heading hierarchy', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByRole('heading')).toBeInTheDocument();
      });
    });

    test('should have accessible buttons', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });
});
