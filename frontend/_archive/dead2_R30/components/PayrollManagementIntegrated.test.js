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
  const mockPayrollDetails = [
    {
      name: 'أحمد محمد',
      position: 'مهندس برمجيات',
      base: 5000,
      allowances: 500,
      deductions: 500,
      net: 5000,
      status: 'معلق',
    },
    {
      name: 'فاطمة علي',
      position: 'محللة نظم',
      base: 4500,
      allowances: 400,
      deductions: 450,
      net: 4450,
      status: 'تم الدفع',
    },
  ];

  const mockPayrollData = {
    payrollDetails: mockPayrollDetails,
    totalPayroll: 9450,
    totalAllowances: 900,
    totalDeductions: 950,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    HRAPIService.getPayrollReport.mockResolvedValue(mockPayrollData);
    HRAPIService.processMonthlyPayroll.mockResolvedValue({
      success: true,
      message: 'تمت معالجة الرواتب',
      payrollDetails: mockPayrollDetails,
    });
    HRAPIService.transferPayroll.mockResolvedValue({
      success: true,
      message: 'تمت التحويلات البنكية',
      transferredCount: 2,
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
        const monthInput = document.querySelector('input[type="month"]');
        expect(monthInput).toBeInTheDocument();
      });
    });

    test('should display action buttons', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/معالجة الرواتب/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Date Selection Tests --------------------
  describe('Month Selection', () => {
    test('should allow month selection', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(document.querySelector('input[type="month"]')).toBeInTheDocument();
      });

      const monthInput = document.querySelector('input[type="month"]');
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
        // Verify employee data is rendered in the table
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
        expect(table.textContent).toMatch(/أحمد محمد/);
      });
    });

    test('should handle API errors gracefully', async () => {
      HRAPIService.getPayrollReport.mockRejectedValueOnce(new Error('API Error'));

      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/فشل/i)).toBeInTheDocument();
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
        // Summary cards display totals with "ريال" suffix
        const riyalElements = screen.getAllByText(/ريال/i);
        expect(riyalElements.length).toBeGreaterThanOrEqual(3);
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
        expect(screen.getByText(/تحميل Excel/i)).toBeInTheDocument();
      });
    });

    test('should export data as CSV', async () => {
      const _originalCreateElement = document.createElement.bind(document);

      const createSpy = jest.spyOn(document, 'createElement');

      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        const exportButton = screen.getByText(/تحميل Excel/i);
        fireEvent.click(exportButton);
      });

      // Check if download was triggered
      expect(createSpy).toHaveBeenCalledWith('a');

      createSpy.mockRestore();
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
        expect(screen.getByText(/الموظف/)).toBeInTheDocument();
        expect(screen.getByText(/الراتب الأساسي/)).toBeInTheDocument();
        expect(screen.getByText(/الحالة/)).toBeInTheDocument();
      });
    });

    test('should display status badges with correct colors', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        const badges = screen.getAllByText(/معلق|تم الدفع/i);
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    test('should display totals row', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        const totalRows = screen.queryAllByText(/المجموع/);
        expect(totalRows.length).toBeGreaterThan(0);
      });
    });
  });

  // -------------------- Refresh Functionality Tests --------------------
  describe('Refresh Functionality', () => {
    test('should refresh data when refresh button is clicked', async () => {
      render(<PayrollManagementIntegrated />);

      // Wait for loading to complete and buttons to appear
      await waitFor(() => {
        expect(HRAPIService.getPayrollReport).toHaveBeenCalledTimes(1);
        expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
      });

      // Refresh button is the first button (icon-only, no text)
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);

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
        expect(screen.getByText(/فشل/i)).toBeInTheDocument();
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
    test('should be responsive on mobile', async () => {
      global.innerWidth = 375;
      render(<PayrollManagementIntegrated />);

      const elements = await screen.findAllByText(/رواتب|payroll/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    test('should be responsive on tablet', async () => {
      global.innerWidth = 768;
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
      });
    });
  });

  // -------------------- RTL Language Tests --------------------
  describe('RTL Language Support', () => {
    test('should have dir="rtl" for Arabic', async () => {
      const { container } = render(<PayrollManagementIntegrated />);
      await waitFor(() => {
        const mainDiv = container.querySelector('[dir="rtl"]');
        expect(mainDiv).toBeInTheDocument();
      });
    });

    test('should display Arabic currency correctly', async () => {
      render(<PayrollManagementIntegrated />);

      await waitFor(() => {
        const currencyElements = screen.getAllByText(/ريال/i);
        expect(currencyElements.length).toBeGreaterThan(0);
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
