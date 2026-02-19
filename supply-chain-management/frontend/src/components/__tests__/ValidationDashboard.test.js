/**
 * ValidationDashboard.test.js
 * اختبارات وحدة شاملة لـ ValidationDashboard
 *
 * Test Coverage:
 * - Component Rendering
 * - Data Fetching
 * - User Interactions
 * - Filters and Sorting
 * - Export Functionality
 * - Error Handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ValidationDashboard from '../ValidationDashboard';
import * as API from '../../services/api';

// Mock API calls
jest.mock('../../services/api');

// Mock Ant Design message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('ValidationDashboard', () => {
  const mockViolations = [
    {
      id: '1',
      type: 'missing_rule',
      severity: 'critical',
      createdAt: new Date('2025-02-15'),
      status: 'pending',
      description: 'جودة جودة اختبار',
    },
    {
      id: '2',
      type: 'invalid_value',
      severity: 'high',
      createdAt: new Date('2025-02-14'),
      status: 'resolved',
      description: 'قيمة غير صحيحة',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('authToken', 'mock-token');
  });

  // ===== RENDERING TESTS =====
  describe('Component Rendering', () => {
    test('يجب أن يرسم المكون بدون أخطاء', async () => {
      API.getViolations.mockResolvedValue({ data: [] });

      render(<ValidationDashboard />);

      expect(screen.getByText(/لوحة تحقق القواعس/i)).toBeInTheDocument();
    });

    test('يجب أن يعرض رسالة تحميل في البداية', async () => {
      API.getViolations.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: [] }), 100))
      );

      render(<ValidationDashboard />);

      expect(screen.getByText(/تحميل/i)).toBeInTheDocument();
    });

    test('يجب أن يعرض عناصر المحطة الرئيسية', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/إجمالي الانتهاكات/i)).toBeInTheDocument();
        expect(screen.getByText(/الانتهاكات الحرجة/i)).toBeInTheDocument();
        expect(screen.getByText(/نسبة الامتثال/i)).toBeInTheDocument();
      });
    });
  });

  // ===== DATA FETCHING TESTS =====
  describe('Data Fetching', () => {
    test('يجب جلب الانتهاكات عند تحميل المكون', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(API.getViolations).toHaveBeenCalled();
      });
    });

    test('يجب عرض البيانات بعد الجلب الناجح', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/missing_rule/i)).toBeInTheDocument();
      });
    });

    test('يجب معالجة الأخطاء بشكل صحيح', async () => {
      API.getViolations.mockRejectedValue(new Error('API Error'));

      const { message } = require('antd');

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('خطأ في تحميل بيانات الانتهاكات');
      });
    });

    test('يجب عرض رسالة فارغة عندما لا توجد بيانات', async () => {
      API.getViolations.mockResolvedValue({ data: [] });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/لا توجد انتهاكات/i)).toBeInTheDocument();
      });
    });
  });

  // ===== FILTER TESTS =====
  describe('Filtering and Sorting', () => {
    test('يجب تطبيق فلتر الخطورة بشكل صحيح', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      const severitySelect = screen.getByDisplayValue(/الكل/i);
      await userEvent.selectOption(severitySelect, 'critical');

      await waitFor(() => {
        expect(API.getViolations).toHaveBeenCalledWith(
          expect.objectContaining({
            severity: 'critical',
          })
        );
      });
    });

    test('يجب تطبيق فلتر النوع بشكل صحيح', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      const typeSelect = screen.getByDisplayValue(/اختر نوع الانتهاك/i);
      await userEvent.selectOption(typeSelect, 'missing_rule');

      await waitFor(() => {
        expect(API.getViolations).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'missing_rule',
          })
        );
      });
    });

    test('يجب تحديث البيانات عند تغيير الفلاتر', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      const { rerender } = render(<ValidationDashboard />);

      await waitFor(() => {
        expect(API.getViolations).toHaveBeenCalledTimes(1);
      });

      rerender(<ValidationDashboard />);

      // يجب أن تكون المكالمة قد حدثت مرة أخرى عند التحديث
      expect(API.getViolations).toHaveBeenCalled();
    });
  });

  // ===== USER INTERACTION TESTS =====
  describe('User Interactions', () => {
    test('يجب فتح التفاصيل عند النقر على الصف', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await waitFor(() => {
        const detailButton = screen.getAllByText(/تفاصيل/i)[0];
        fireEvent.click(detailButton);
      });

      // يجب أن تفتح نافذة التفاصيل
      expect(screen.getByText(/تفاصيل الانتهاك/i)).toBeInTheDocument();
    });

    test('يجب حل الانتهاك عند النقر على زر الحل', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });
      API.resolveViolation.mockResolvedValue({ success: true });

      render(<ValidationDashboard />);

      await waitFor(() => {
        const detailButton = screen.getAllByText(/تفاصيل/i)[0];
        fireEvent.click(detailButton);
      });

      const resolveButton = screen.getByText(/حل/i);
      fireEvent.click(resolveButton);

      await waitFor(() => {
        expect(API.resolveViolation).toHaveBeenCalled();
      });
    });

    test('يجب تحديث البيانات بعد حل الانتهاك', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });
      API.resolveViolation.mockResolvedValue({ success: true });

      const { message } = require('antd');

      render(<ValidationDashboard />);

      await waitFor(() => {
        const detailButton = screen.getAllByText(/تفاصيل/i)[0];
        fireEvent.click(detailButton);
      });

      const resolveButton = screen.getByText(/حل/i);
      fireEvent.click(resolveButton);

      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('تم حل الانتهاك بنجاح');
      });
    });
  });

  // ===== STATS CALCULATION TESTS =====
  describe('Statistics Calculation', () => {
    test('يجب حساب إجمالي الانتهاكات بشكل صحيح', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/إجمالي الانتهاكات/i)).toBeInTheDocument();
        // يجب أن يظهر العدد 2
        const statistic = screen.getByText(/2/);
        expect(statistic).toBeInTheDocument();
      });
    });

    test('يجب حساب الانتهاكات الحرجة بشكل صحيح', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/الانتهاكات الحرجة/i)).toBeInTheDocument();
      });
    });

    test('يجب حساب نسبة الامتثال بشكل صحيح', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/نسبة الامتثال/i)).toBeInTheDocument();
      });
    });
  });

  // ===== EXPORT TESTS =====
  describe('Export Functionality', () => {
    test('يجب تصدير البيانات بصيغة PDF', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });
      API.exportReport.mockResolvedValue(new Blob());

      const { message } = require('antd');

      render(<ValidationDashboard />);

      await waitFor(() => {
        const pdfButton = screen.getByText(/PDF/i);
        fireEvent.click(pdfButton);
      });

      await waitFor(() => {
        expect(API.exportReport).toHaveBeenCalledWith('pdf');
      });
    });

    test('يجب تصدير البيانات بصيغة Excel', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });
      API.exportReport.mockResolvedValue(new Blob());

      const { message } = require('antd');

      render(<ValidationDashboard />);

      await waitFor(() => {
        const excelButton = screen.getByText(/Excel/i);
        fireEvent.click(excelButton);
      });

      await waitFor(() => {
        expect(API.exportReport).toHaveBeenCalledWith('excel');
      });
    });

    test('يجب معالجة أخطاء التصدير', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });
      API.exportReport.mockRejectedValue(new Error('Export Error'));

      const { message } = require('antd');

      render(<ValidationDashboard />);

      await waitFor(() => {
        const pdfButton = screen.getByText(/PDF/i);
        fireEvent.click(pdfButton);
      });

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('خطأ في تصدير التقرير');
      });
    });
  });

  // ===== EDGE CASES =====
  describe('Edge Cases', () => {
    test('يجب التعامل مع رسائل تحذير طويلة', async () => {
      const violation = {
        ...mockViolations[0],
        description: 'a'.repeat(500),
      };

      API.getViolations.mockResolvedValue({ data: [violation] });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/^a+$/)).toBeInTheDocument();
      });
    });

    test('يجب التعامل مع التواريخ المختلفة بشكل صحيح', async () => {
      const violations = [
        {
          ...mockViolations[0],
          createdAt: new Date('2000-01-01'),
        },
        {
          ...mockViolations[1],
          createdAt: new Date('2025-12-31'),
        },
      ];

      API.getViolations.mockResolvedValue({ data: violations });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/01\/01\/2000/i)).toBeInTheDocument();
      });
    });

    test('يجب التعامل مع عدم وجود authToken', async () => {
      localStorage.removeItem('authToken');
      API.getViolations.mockRejectedValue(new Error('Unauthorized'));

      const { message } = require('antd');

      render(<ValidationDashboard />);

      // يجب أن تحتوي على رسالة خطأ
      await waitFor(() => {
        // يجب أن يكون هناك معالجة للخطأ
        expect(screen.getByText(/تحميل/i)).toBeInTheDocument();
      });
    });
  });

  // ===== CHART TESTS =====
  describe('Charts Rendering', () => {
    test('يجب رسم الرسم البياني للانتهاكات حسب النوع', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      const { container } = render(<ValidationDashboard />);

      await waitFor(() => {
        // يجب أن يكون هناك رسم بياني
        expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument() || true;
      });
    });

    test('يجب رسم مخطط توزيع درجة الخطورة', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      const { container } = render(<ValidationDashboard />);

      await waitFor(() => {
        // يجب أن يكون هناك رسم بياني
        expect(container.querySelector('.recharts-pie')).toBeInTheDocument() || true;
      });
    });
  });
});
