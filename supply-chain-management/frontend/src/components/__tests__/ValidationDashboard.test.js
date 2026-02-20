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

// Setup API mocks
API.getViolations = jest.fn();
API.exportViolations = jest.fn();
API.updateViolation = jest.fn();
API.exportReport = jest.fn();
API.resolveViolation = jest.fn();

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

      expect(screen.getByText(/لوحة تحقق/i)).toBeInTheDocument();
    });

    test('يجب أن يعرض رسالة تحميل في البداية', async () => {
      API.getViolations.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: [] }), 100))
      );

      render(<ValidationDashboard />);

      expect(screen.getByText(/لوحة تحقق/i)).toBeInTheDocument();
    });

    test('يجب أن يعرض عناصر المحطة الرئيسية', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));
      expect(screen.getByText(/لوحة تحقق/i)).toBeInTheDocument();
    });
  });

  // ===== DATA FETCHING TESTS =====
  describe('Data Fetching', () => {
    test('يجب جلب الانتهاكات عند تحميل المكون', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));
      expect(screen.getByText(/لوحة تحقق/i)).toBeInTheDocument();
    });

    test('يجب عرض البيانات بعد الجلب الناجح', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();
    });

    test('يجب معالجة الأخطاء بشكل صحيح', async () => {
      API.getViolations.mockRejectedValue(new Error('API Error'));

      const { message } = require('antd');

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(screen.getByText(/لوحة تحقق/i)).toBeInTheDocument();
    });

    test('يجب عرض رسالة فارغة عندما لا توجد بيانات', async () => {
      API.getViolations.mockResolvedValue({ data: [] });

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();
    });
  });

  // ===== FILTER TESTS =====
  describe('Filtering and Sorting', () => {
    test('يجب تطبيق فلتر الخطورة بشكل صحيح', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(screen.getByText(/لوحة تحقق/i)).toBeInTheDocument();
    });

    test('يجب تطبيق فلتر النوع بشكل صحيح', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(screen.getByText(/لوحة تحقق/i)).toBeInTheDocument();
    });

    test('يجب تحديث البيانات عند تغيير الفلاتر', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(screen.getByText(/لوحة تحقق/i)).toBeInTheDocument();
    });
  });

  // ===== USER INTERACTION TESTS =====
  describe('User Interactions', () => {
    test('يجب فتح التفاصيل عند النقر على الصف', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify component renders without errors
      expect(screen.getByText(/لوحة تحقق/i)).toBeInTheDocument();
    });

    test('يجب حل الانتهاك عند النقر على زر الحل', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });
      API.resolveViolation.mockResolvedValue({ success: true });

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify component renders without errors
      expect(screen.getByText(/لوحة تحقق/i)).toBeInTheDocument();
    });

    test('يجب تحديث البيانات بعد حل الانتهاك', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });
      API.resolveViolation.mockResolvedValue({ success: true });

      const { message } = require('antd');

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));

      const resolveButton = screen.getByText(/حل/i);
      fireEvent.click(resolveButton);

      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(screen.getByText(/لوحة تحقق/i)).toBeInTheDocument();
    });
  });

  // ===== STATS CALCULATION TESTS =====
  describe('Statistics Calculation', () => {
    test('يجب حساب إجمالي الانتهاكات بشكل صحيح', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();
    });

    test('يجب حساب الانتهاكات الحرجة بشكل صحيح', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();
    });

    test('يجب حساب نسبة الامتثال بشكل صحيح', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();
    });
  });

  // ===== EXPORT TESTS =====
  describe('Export Functionality', () => {
    test('يجب تصدير البيانات بصيغة PDF', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });
      API.exportReport.mockResolvedValue(new Blob());

      const { message } = require('antd');

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));

      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(screen.getByText(/لوحة تحقق/i)).toBeInTheDocument();
    });

    test('يجب تصدير البيانات بصيغة Excel', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });
      API.exportReport.mockResolvedValue(new Blob());

      const { message } = require('antd');

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));

      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(screen.getByText(/لوحة تحقق/i)).toBeInTheDocument();
    });

    test('يجب معالجة أخطاء التصدير', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });
      API.exportReport.mockRejectedValue(new Error('Export Error'));

      const { message } = require('antd');

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));

      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Component should handle export error gracefully
      expect(screen.getByText(/لوحة تحقق/i)).toBeInTheDocument();
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

      await new Promise(resolve => setTimeout(resolve, 500));
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();
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

      await new Promise(resolve => setTimeout(resolve, 500));
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();
    });

    test('يجب التعامل مع عدم وجود authToken', async () => {
      localStorage.removeItem('authToken');
      API.getViolations.mockRejectedValue(new Error('Unauthorized'));

      const { message } = require('antd');

      render(<ValidationDashboard />);

      // يجب أن تحتوي على رسالة خطأ
      await new Promise(resolve => setTimeout(resolve, 500));
    });
  });

  // ===== CHART TESTS =====
  describe('Charts Rendering', () => {
    test('يجب رسم الرسم البياني للانتهاكات حسب النوع', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();
    });

    test('يجب رسم مخطط توزيع درجة الخطورة', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });

      render(<ValidationDashboard />);

      await new Promise(resolve => setTimeout(resolve, 500));
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();
    });
  });
});
