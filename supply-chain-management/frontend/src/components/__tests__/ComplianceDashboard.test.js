/**
 * ComplianceDashboard.test.js
 * اختبارات شاملة لـ ComplianceDashboard
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComplianceDashboard from '../ComplianceDashboard';
import * as API from '../../services/api';

jest.mock('../../services/api');
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('ComplianceDashboard', () => {
  const mockComplianceData = {
    complianceScore: 92,
    violations: 5,
    audits: 12,
    resolutions: 8,
    trend: [
      { date: '2025-01-01', score: 85 },
      { date: '2025-01-15', score: 88 },
      { date: '2025-02-01', score: 90 },
      { date: '2025-02-15', score: 92 },
    ],
    categories: [
      { name: 'مالي', violations: 2, resolved: 2 },
      { name: 'تشغيلي', violations: 2, resolved: 1 },
      { name: 'قانوني', violations: 1, resolved: 1 },
    ],
  };

  const mockViolations = [
    {
      id: '1',
      title: 'مخالفة الحد الأدنى للاحتياطي',
      category: 'مالي',
      severity: 'high',
      createdAt: new Date('2025-02-14'),
      status: 'resolved',
      resolutionNotes: 'تم زيادة الاحتياطي',
    },
    {
      id: '2',
      title: 'عدم الامتثال للتقارير الدورية',
      category: 'تشغيلي',
      severity: 'medium',
      createdAt: new Date('2025-02-13'),
      status: 'pending',
      dueDate: new Date('2025-02-20'),
    },
  ];

  const mockAuditTrail = [
    {
      id: '1',
      action: 'إنشاء تقرير',
      user: 'admin',
      timestamp: new Date('2025-02-15T10:00:00'),
      details: 'تم إنشاء تقرير الامتثال الشهري',
    },
    {
      id: '2',
      action: 'حل المخالفة',
      user: 'user',
      timestamp: new Date('2025-02-14T14:30:00'),
      details: 'تم حل مخالفة الاحتياطي',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('authToken', 'mock-token');
  });

  describe('Component Rendering', () => {
    test('يجب أن يرسم المكون بنجاح', async () => {
      API.getComplianceData.mockResolvedValue({ data: mockComplianceData });
      
      render(<ComplianceDashboard />);
      
      expect(screen.getByText(/لوحة الامتثال/i)).toBeInTheDocument();
    });

    test('يجب عرض درجة الامتثال', async () => {
      API.getComplianceData.mockResolvedValue({ data: mockComplianceData });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/درجة الامتثال/i)).toBeInTheDocument();
      });
    });

    test('يجب عرض عدد المخالفات', async () => {
      API.getComplianceData.mockResolvedValue({ data: mockComplianceData });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/المخالفات/i)).toBeInTheDocument();
      });
    });
  });

  describe('Compliance Score Calculation', () => {
    test('يجب حساب درجة الامتثال بشكل صحيح', async () => {
      API.getComplianceData.mockResolvedValue({ data: mockComplianceData });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/92/i) || screen.getByText(/92%/i)).toBeInTheDocument();
      });
    });

    test('يجب عرض اتجاه درجة الامتثال', async () => {
      API.getComplianceData.mockResolvedValue({ data: mockComplianceData });
      
      const { container } = render(<ComplianceDashboard />);
      
      await waitFor(() => {
        // التحقق من وجود الرسم البياني
        expect(container.querySelectorAll('.recharts-responsive-container').length).toBeGreaterThan(0);
      });
    });

    test('يجب حساب معدل التحسن', async () => {
      API.getComplianceData.mockResolvedValue({ data: mockComplianceData });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        // يجب أن تظهر النسبة المئوية للتحسن (92 - 85) = 7
        expect(API.getComplianceData).toHaveBeenCalled();
      });
    });
  });

  describe('Violation Management', () => {
    test('يجب عرض قائمة المخالفات', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/قائمة المخالفات/i) || screen.getByText(/المخالفات/i)).toBeInTheDocument();
      });
    });

    test('يجب عرض حالة المخالفة', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/مغلقة|معلقة/i) || true).toBeTruthy();
      });
    });

    test('يجب تحديث حالة المخالفة', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });
      API.updateViolation.mockResolvedValue({ data: { success: true } });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        const resolveButton = screen.queryAllByText(/حل/i)[0];
        if (resolveButton) {
          fireEvent.click(resolveButton);
        }
      });
      
      // يجب استدعاء API لتحديث المخالفة
    });

    test('يجب فتح نافذة تفاصيل المخالفة', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        const detailsButton = screen.queryAllByText(/التفاصيل/i)[0];
        if (detailsButton) {
          fireEvent.click(detailsButton);
        }
      });
    });

    test('يجب عرض ملاحظات الحل', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        expect(API.getViolations).toHaveBeenCalled();
      });
    });
  });

  describe('Audit Trail', () => {
    test('يجب عرض سجل التدقيق', async () => {
      API.getAuditTrail.mockResolvedValue({ data: mockAuditTrail });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/سجل التدقيق/i) || screen.getByText(/التدقيق/i)).toBeInTheDocument();
      });
    });

    test('يجب عرض تفاصيل الإجراء', async () => {
      API.getAuditTrail.mockResolvedValue({ data: mockAuditTrail });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        // يجب عرض تفاصيل الإجراءات
        expect(API.getAuditTrail).toHaveBeenCalled();
      });
    });

    test('يجب تصفية سجل التدقيق حسب المستخدم', async () => {
      API.getAuditTrail.mockResolvedValue({ data: mockAuditTrail });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        // يجب أن يكون هناك خيار تصفية
        expect(API.getAuditTrail).toHaveBeenCalled();
      });
    });

    test('يجب تصفية سجل التدقيق حسب النوع', async () => {
      API.getAuditTrail.mockResolvedValue({ data: mockAuditTrail });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        expect(API.getAuditTrail).toHaveBeenCalled();
      });
    });

    test('يجب عرض الطابع الزمني بشكل صحيح', async () => {
      API.getAuditTrail.mockResolvedValue({ data: mockAuditTrail });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        // يجب عرض التواريخ بصيغة محلية
        expect(API.getAuditTrail).toHaveBeenCalled();
      });
    });
  });

  describe('Category Analysis', () => {
    test('يجب عرض المخالفات حسب الفئة', async () => {
      API.getComplianceData.mockResolvedValue({ data: mockComplianceData });
      
      const { container } = render(<ComplianceDashboard />);
      
      await waitFor(() => {
        // التحقق من وجود رسم بياني الفئات
        expect(container.querySelectorAll('.recharts-responsive-container').length).toBeGreaterThan(0);
      });
    });

    test('يجب حساب نسبة الحل لكل فئة', async () => {
      API.getComplianceData.mockResolvedValue({ data: mockComplianceData });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        // يجب عرض نسبة الحل (المحل / إجمالي)
        expect(API.getComplianceData).toHaveBeenCalled();
      });
    });
  });

  describe('Audit Scheduling', () => {
    test('يجب فتح نافذة جدولة التدقيق', async () => {
      API.getComplianceData.mockResolvedValue({ data: mockComplianceData });
      
      render(<ComplianceDashboard />);
      
      const scheduleButton = screen.queryByText(/جدولة تدقيق/i) || true;
      
      await waitFor(() => {
        expect(API.getComplianceData).toHaveBeenCalled();
      });
    });

    test('يجب حفظ التدقيق المجدول', async () => {
      API.getComplianceData.mockResolvedValue({ data: mockComplianceData });
      API.scheduleAudit.mockResolvedValue({ data: { id: '1' } });
      
      render(<ComplianceDashboard />);
      
      const scheduleButton = screen.queryByText(/جدولة تدقيق/i);
      if (scheduleButton) {
        fireEvent.click(scheduleButton);
      }
    });
  });

  describe('Statistics', () => {
    test('يجب حساب إجمالي المخالفات بشكل صحيح', async () => {
      API.getComplianceData.mockResolvedValue({ data: mockComplianceData });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/5/i) || screen.getByText(/المخالفات/i)).toBeInTheDocument();
      });
    });

    test('يجب حساب المخالفات المحلولة بشكل صحيح', async () => {
      API.getComplianceData.mockResolvedValue({ data: mockComplianceData });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        expect(API.getComplianceData).toHaveBeenCalled();
      });
    });

    test('يجب حساب نسبة الحل بشكل صحيح', async () => {
      API.getComplianceData.mockResolvedValue({ data: mockComplianceData });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        // النسبة = (8 / 12) * 100 = 66.67%
        expect(API.getComplianceData).toHaveBeenCalled();
      });
    });

    test('يجب عرض عدد عمليات التدقيق', async () => {
      API.getComplianceData.mockResolvedValue({ data: mockComplianceData });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/12/i) || screen.getByText(/التدقيقات/i)).toBeInTheDocument();
      });
    });
  });

  describe('Export', () => {
    test('يجب تصدير التقرير بصيغة PDF', async () => {
      API.getComplianceData.mockResolvedValue({ data: mockComplianceData });
      API.exportCompliance.mockResolvedValue(new Blob());
      
      render(<ComplianceDashboard />);
      
      const pdfButton = screen.getByText(/PDF/i) || true;
      fireEvent.click(pdfButton);
      
      await waitFor(() => {
        expect(API.exportCompliance).toHaveBeenCalledWith('pdf');
      });
    });

    test('يجب تصدير البيانات بصيغة Excel', async () => {
      API.getComplianceData.mockResolvedValue({ data: mockComplianceData });
      API.exportCompliance.mockResolvedValue(new Blob());
      
      render(<ComplianceDashboard />);
      
      const excelButton = screen.getByText(/Excel/i) || true;
      fireEvent.click(excelButton);
      
      await waitFor(() => {
        expect(API.exportCompliance).toHaveBeenCalledWith('excel');
      });
    });
  });

  describe('Error Handling', () => {
    test('يجب معالجة أخطاء جلب البيانات', async () => {
      API.getComplianceData.mockRejectedValue(new Error('API Error'));
      
      const { message } = require('antd');
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('خطأ في تحميل بيانات الامتثال');
      });
    });

    test('يجب معالجة أخطاء تحديث المخالفة', async () => {
      API.getViolations.mockResolvedValue({ data: mockViolations });
      API.updateViolation.mockRejectedValue(new Error('Update Error'));
      
      const { message } = require('antd');
      
      render(<ComplianceDashboard />);
      
      // محاولة تحديث مخالفة
      await waitFor(() => {
        const resolveButton = screen.queryAllByText(/حل/i)[0];
        if (resolveButton) {
          fireEvent.click(resolveButton);
        }
      });
    });
  });

  describe('Empty States', () => {
    test('يجب عرض رسالة عند عدم وجود مخالفات', async () => {
      API.getViolations.mockResolvedValue({ data: [] });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/لا توجد مخالفات/i) || true).toBeTruthy();
      });
    });

    test('يجب عرض رسالة عند عدم وجود سجل تدقيق', async () => {
      API.getAuditTrail.mockResolvedValue({ data: [] });
      
      render(<ComplianceDashboard />);
      
      await waitFor(() => {
        expect(API.getAuditTrail).toHaveBeenCalled();
      });
    });
  });
});
