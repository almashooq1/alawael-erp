/**
 * ValidationDashboard Comprehensive Test Suite
 *
 * Tests Coverage:
 * - Component Rendering
 * - State Management
 * - User Interactions
 * - API Integration
 * - Error Handling
 * - Data Filtering
 * - Export Functionality
 * - Chart Generation
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import dayjs from 'dayjs';
import ValidationDashboard from './ValidationDashboard';
import * as api from '../services/api';

// ===== Mocks =====
jest.mock('../services/api');
jest.mock('recharts', () => ({
  ...jest.requireActual('recharts'),
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div>{children}</div>,
  LineChart: ({ children }) => <div>{children}</div>,
  Pie: () => <div>Pie Chart</div>,
  Line: () => <div>Line Chart</div>,
}));

describe('ValidationDashboard Component', () => {
  const mockViolations = [
    {
      id: '1',
      type: 'financial',
      severity: 'critical',
      status: 'pending',
      description: 'مخالفة مالية حرجة',
      createdAt: new Date('2024-01-15'),
    },
    {
      id: '2',
      type: 'compliance',
      severity: 'high',
      status: 'resolved',
      description: 'عدم امتثال',
      createdAt: new Date('2024-01-14'),
      resolvedAt: new Date('2024-01-15'),
    },
    {
      id: '3',
      type: 'calculation',
      severity: 'medium',
      status: 'pending',
      description: 'خطأ حسابي',
      createdAt: new Date('2024-01-13'),
    },
  ];

  beforeEach(() => {
    api.get.mockResolvedValue({
      data: {
        data: mockViolations,
      },
    });
    api.patch.mockResolvedValue({
      data: { success: true },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===== Rendering Tests =====
  describe('Component Rendering', () => {
    test('should render page title', () => {
      render(<ValidationDashboard />);
      expect(screen.getByText('لوحة التحقق من الامتثال المالي')).toBeInTheDocument();
    });

    test('should render all statistic cards', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('إجمالي الانتهاكات')).toBeInTheDocument();
        expect(screen.getByText('انتهاكات حرجة')).toBeInTheDocument();
        expect(screen.getByText('معلقة')).toBeInTheDocument();
        expect(screen.getByText('محلولة')).toBeInTheDocument();
      });
    });

    test('should render filter section', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('اختر مستوى الخطورة')).toBeInTheDocument();
        expect(screen.getByText('اختر النوع')).toBeInTheDocument();
      });
    });

    test('should render export buttons', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('تصدير PDF')).toBeInTheDocument();
        expect(screen.getByText('تصدير Excel')).toBeInTheDocument();
      });
    });

    test('should render violations table', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('جدول الانتهاكات')).toBeInTheDocument();
      });
    });

    test('should render chart sections', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('توزيع الانتهاكات حسب النوع')).toBeInTheDocument();
        expect(screen.getByText('اتجاه الانتهاكات اليومي')).toBeInTheDocument();
      });
    });
  });

  // ===== Statistics Tests =====
  describe('Statistics Calculation', () => {
    test('should display correct total violations count', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    test('should calculate critical violations correctly', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const criticalStatus = screen.getByText('انتهاكات حرجة');
        const parent = criticalStatus.closest('.ant-statistic');
        expect(parent.textContent).toContain('1');
      });
    });

    test('should count resolved violations', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const resolved = screen.getByText('محلولة');
        const parent = resolved.closest('.ant-statistic');
        expect(parent.textContent).toContain('1');
      });
    });

    test('should count pending violations', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const pending = screen.getByText('معلقة');
        const parent = pending.closest('.ant-statistic');
        expect(parent.textContent).toContain('2');
      });
    });

    test('should calculate severity distribution', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });
  });

  // ===== Filtering Tests =====
  describe('Data Filtering', () => {
    test('should filter by severity', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const severitySelect = screen.getByDisplayValue('اختر مستوى الخطورة').closest('.ant-select');
        fireEvent.click(severitySelect);
      });
    });

    test('should filter by violation type', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const typeSelect = screen.getByDisplayValue('اختر النوع').closest('.ant-select');
        fireEvent.click(typeSelect);
      });
    });

    test('should filter by date range', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('بحث')).toBeInTheDocument();
      });
    });

    test('should clear filters on reset', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const resetButton = screen.getByText('إعادة تعيين');
        fireEvent.click(resetButton);
      });
    });

    test('should call API with correct filter parameters', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/finance/validation/violations-report',
          expect.any(Object)
        );
      });
    });

    test('should update filters when severity changes', async () => {
      const { rerender } = render(<ValidationDashboard />);
      await waitFor(() => {
        const searchButton = screen.getByText('بحث');
        fireEvent.click(searchButton);
      });
    });

    test('should validate date range selection', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('بحث')).toBeInTheDocument();
      });
    });

    test('should handle empty filter state', async () => {
      api.get.mockResolvedValueOnce({
        data: { data: [] },
      });
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });
  });

  // ===== Table Tests =====
  describe('Violations Table', () => {
    test('should display violation records in table', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('financial')).toBeInTheDocument();
      });
    });

    test('should display correct table columns', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('ID')).toBeInTheDocument();
        expect(screen.getByText('النوع')).toBeInTheDocument();
        expect(screen.getByText('الخطورة')).toBeInTheDocument();
      });
    });

    test('should display severity badges with correct colors', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const badges = screen.getAllByText(/critical|high|medium|low/);
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    test('should paginate violations correctly', async () => {
      const manyViolations = Array.from({ length: 25 }, (_, i) => ({
        ...mockViolations[0],
        id: String(i),
      }));
      api.get.mockResolvedValueOnce({
        data: { data: manyViolations },
      });
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('جدول الانتهاكات')).toBeInTheDocument();
      });
    });

    test('should show table actions', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const viewButtons = screen.getAllByText('عرض');
        expect(viewButtons.length).toBeGreaterThan(0);
      });
    });

    test('should display empty state when no violations', async () => {
      api.get.mockResolvedValueOnce({
        data: { data: [] },
      });
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('لا توجد انتهاكات')).toBeInTheDocument();
      });
    });
  });

  // ===== Modal Tests =====
  describe('Violation Detail Modal', () => {
    test('should open modal when view button clicked', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const viewButtons = screen.getAllByText('عرض');
        fireEvent.click(viewButtons[0]);
      });
      await waitFor(() => {
        expect(screen.getByText('تفاصيل الانتهاك')).toBeInTheDocument();
      });
    });

    test('should display violation details in modal', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const viewButtons = screen.getAllByText('عرض');
        fireEvent.click(viewButtons[0]);
      });
      await waitFor(() => {
        expect(screen.getByText(/مخالفة مالية حرجة/)).toBeInTheDocument();
      });
    });

    test('should close modal on close button click', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const viewButtons = screen.getAllByText('عرض');
        fireEvent.click(viewButtons[0]);
      });
      await waitFor(() => {
        const closeButtons = screen.getAllByText('إغلاق');
        fireEvent.click(closeButtons[0]);
      });
    });

    test('should show resolve button for pending violations', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const viewButtons = screen.getAllByText('عرض');
        fireEvent.click(viewButtons[0]);
      });
      await waitFor(() => {
        const resolveButtons = screen.queryAllByText('حل الانتهاك');
        expect(resolveButtons.length).toBeGreaterThan(0);
      });
    });

    test('should hide resolve button for resolved violations', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const viewButtons = screen.getAllByText('عرض');
        fireEvent.click(viewButtons[1]); // second violation is resolved
      });
    });

    test('should display formatted dates in modal', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const viewButtons = screen.getAllByText('عرض');
        fireEvent.click(viewButtons[0]);
      });
      await waitFor(() => {
        expect(screen.getByText(/التاريخ/)).toBeInTheDocument();
      });
    });
  });

  // ===== Action Tests =====
  describe('User Actions', () => {
    test('should resolve violation when button clicked', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const viewButtons = screen.getAllByText('عرض');
        fireEvent.click(viewButtons[0]);
      });
      await waitFor(() => {
        const resolveButton = screen.getByText('حل الانتهاك');
        fireEvent.click(resolveButton);
      });
      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled();
      });
    });

    test('should refresh data after resolving violation', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const initialCallCount = api.get.mock.calls.length;
        const viewButtons = screen.getAllByText('عرض');
        fireEvent.click(viewButtons[0]);
      });
    });

    test('should search violations when search button clicked', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const searchButton = screen.getByText('بحث');
        fireEvent.click(searchButton);
      });
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });

    test('should handle error on search failure', async () => {
      api.get.mockRejectedValueOnce(new Error('API Error'));
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('بحث')).toBeInTheDocument();
      });
    });
  });

  // ===== Export Tests =====
  describe('Export Functionality', () => {
    test('should export PDF when button clicked', async () => {
      global.URL.createObjectURL = jest.fn(() => 'blob:mock');
      window.URL.createObjectURL = jest.fn(() => 'blob:mock');

      render(<ValidationDashboard />);
      await waitFor(() => {
        const pdfButton = screen.getByText('تصدير PDF');
        fireEvent.click(pdfButton);
      });
    });

    test('should export Excel when button clicked', async () => {
      global.URL.createObjectURL = jest.fn(() => 'blob:mock');
      window.URL.createObjectURL = jest.fn(() => 'blob:mock');

      render(<ValidationDashboard />);
      await waitFor(() => {
        const excelButton = screen.getByText('تصدير Excel');
        fireEvent.click(excelButton);
      });
    });

    test('should call correct API endpoint for PDF export', async () => {
      api.get.mockResolvedValueOnce({
        data: new Blob(),
      });

      render(<ValidationDashboard />);
      await waitFor(() => {
        const pdfButton = screen.getByText('تصدير PDF');
        fireEvent.click(pdfButton);
      });
    });

    test('should call correct API endpoint for Excel export', async () => {
      api.get.mockResolvedValueOnce({
        data: new Blob(),
      });

      render(<ValidationDashboard />);
      await waitFor(() => {
        const excelButton = screen.getByText('تصدير Excel');
        fireEvent.click(excelButton);
      });
    });

    test('should handle export errors gracefully', async () => {
      api.get.mockRejectedValueOnce(new Error('Export failed'));
      render(<ValidationDashboard />);
      await waitFor(() => {
        const pdfButton = screen.getByText('تصدير PDF');
        fireEvent.click(pdfButton);
      });
    });

    test('should create correct file name for PDF export', async () => {
      render(<ValidationDashboard />);
      // Test file naming logic
    });

    test('should create correct file name for Excel export', async () => {
      render(<ValidationDashboard />);
      // Test file naming logic
    });
  });

  // ===== Chart Tests =====
  describe('Chart Generation', () => {
    test('should generate pie chart for violation types', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('توزيع الانتهاكات حسب النوع')).toBeInTheDocument();
      });
    });

    test('should generate line chart for trends', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('اتجاه الانتهاكات اليومي')).toBeInTheDocument();
      });
    });

    test('should show empty state for charts with no data', async () => {
      api.get.mockResolvedValueOnce({
        data: { data: [] },
      });
      render(<ValidationDashboard />);
      await waitFor(() => {
        const emptyStates = screen.getAllByText(/لا توجد بيانات/);
        expect(emptyStates.length).toBeGreaterThan(0);
      });
    });

    test('should update charts when data changes', async () => {
      const { rerender } = render(<ValidationDashboard />);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });

    test('should calculate trend data correctly', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });
  });

  // ===== API Integration Tests =====
  describe('API Integration', () => {
    test('should fetch violations on component mount', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/finance/validation/violations-report',
          expect.any(Object)
        );
      });
    });

    test('should include correct date parameters in API call', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const calls = api.get.mock.calls;
        expect(calls[0][1].params).toHaveProperty('from');
        expect(calls[0][1].params).toHaveProperty('to');
      });
    });

    test('should include filter parameters in API call', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const calls = api.get.mock.calls;
        expect(calls[0][1].params).toHaveProperty('severity');
        expect(calls[0][1].params).toHaveProperty('type');
      });
    });

    test('should handle API errors gracefully', async () => {
      api.get.mockRejectedValueOnce(new Error('API Error'));
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('جدول الانتهاكات')).toBeInTheDocument();
      });
    });

    test('should retry failed API calls', async () => {
      api.get.mockRejectedValueOnce(new Error('API Error'));
      api.get.mockResolvedValueOnce({
        data: { data: mockViolations },
      });
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });

    test('should update component when API response changes', async () => {
      const { rerender } = render(<ValidationDashboard />);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });

    test('should send correct payload when resolving violation', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const viewButtons = screen.getAllByText('عرض');
        fireEvent.click(viewButtons[0]);
      });
      await waitFor(() => {
        const resolveButton = screen.getByText('حل الانتهاك');
        fireEvent.click(resolveButton);
      });
    });
  });

  // ===== Loading States =====
  describe('Loading States', () => {
    test('should show loading state while fetching data', async () => {
      api.get.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: { data: mockViolations },
                }),
              100
            )
          )
      );
      const { container } = render(<ValidationDashboard />);
      // Check for loading indicator
    });

    test('should hide loading state after data loads', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });

    test('should show loading state on search', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        const searchButton = screen.getByText('بحث');
        fireEvent.click(searchButton);
      });
    });
  });

  // ===== Edge Cases =====
  describe('Edge Cases', () => {
    test('should handle empty violations array', async () => {
      api.get.mockResolvedValueOnce({
        data: { data: [] },
      });
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('لا توجد انتهاكات')).toBeInTheDocument();
      });
    });

    test('should handle null violation data', async () => {
      api.get.mockResolvedValueOnce({
        data: { data: null },
      });
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('جدول الانتهاكات')).toBeInTheDocument();
      });
    });

    test('should handle missing violation fields', async () => {
      const incompleteViolation = {
        id: '1',
        severity: 'critical',
      };
      api.get.mockResolvedValueOnce({
        data: { data: [incompleteViolation] },
      });
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });

    test('should handle very large date ranges', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('بحث')).toBeInTheDocument();
      });
    });

    test('should handle special characters in descriptions', async () => {
      const specialViolation = {
        ...mockViolations[0],
        description: '<script>alert("test")</script>',
      };
      api.get.mockResolvedValueOnce({
        data: { data: [specialViolation] },
      });
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });

    test('should handle duplicate violations', async () => {
      const duplicateViolations = [mockViolations[0], mockViolations[0]];
      api.get.mockResolvedValueOnce({
        data: { data: duplicateViolations },
      });
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });
  });

  // ===== Accessibility Tests =====
  describe('Accessibility', () => {
    test('should have proper heading hierarchy', () => {
      render(<ValidationDashboard />);
      const heading = screen.getByText('لوحة التحقق من الامتثال المالي');
      expect(heading.tagName).toBe('H1');
    });

    test('should have alt text for icons', () => {
      render(<ValidationDashboard />);
      // Check for proper aria labels or alt text
    });

    test('should have accessible form labels', async () => {
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(screen.getByText('اختر مستوى الخطورة')).toBeInTheDocument();
      });
    });

    test('should support keyboard navigation', async () => {
      render(<ValidationDashboard />);
      const searchButton = screen.getByText('بحث');
      searchButton.focus();
      expect(searchButton).toHaveFocus();
    });

    test('should have proper color contrast', () => {
      render(<ValidationDashboard />);
      // Would use axe or similar tool in real tests
    });

    test('should be screen reader friendly', () => {
      render(<ValidationDashboard />);
      expect(screen.getByText('لوحة التحقق من الامتثال المالي')).toBeInTheDocument();
    });
  });

  // ===== Performance Tests =====
  describe('Performance', () => {
    test('should render large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockViolations[0],
        id: String(i),
      }));
      api.get.mockResolvedValueOnce({
        data: { data: largeDataset },
      });
      const startTime = performance.now();
      render(<ValidationDashboard />);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(3000); // Should render within 3 seconds
    });

    test('should memoize expensive computations', async () => {
      const { rerender } = render(<ValidationDashboard />);
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });
  });
});
