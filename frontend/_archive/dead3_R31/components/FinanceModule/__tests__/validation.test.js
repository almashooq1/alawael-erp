/**
 * validation.test.js
 * اختبارات شاملة لمكون لوحة التحقق والامتثال
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ValidationDashboard from '../ValidationDashboard';

// ===== MOCKS =====
global.fetch = jest.fn();

const mockViolations = [
  {
    id: 'v1',
    severity: 'critical',
    type: 'policy',
    description: 'تجاوز حد الميزانية',
    status: 'open',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
    recommendations: ['مراجعة الميزانية', 'تقييد الصلاحيات']
  },
  {
    id: 'v2',
    severity: 'high',
    type: 'compliance',
    description: 'عدم الامتثال لمعايير الضريبة',
    status: 'pending',
    createdAt: '2026-01-14T10:00:00Z',
    updatedAt: '2026-01-14T10:00:00Z',
    recommendations: ['مراجعة ضريبية']
  },
  {
    id: 'v3',
    severity: 'medium',
    type: 'audit',
    description: 'مخالفة إجراءات التدقيق',
    status: 'resolved',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-12T10:00:00Z',
    recommendations: []
  },
  {
    id: 'v4',
    severity: 'low',
    type: 'system',
    description: 'تحذير نظامي بسيط',
    status: 'open',
    createdAt: '2026-01-13T10:00:00Z',
    updatedAt: '2026-01-13T10:00:00Z',
    recommendations: []
  }
];

const mockApiResponse = {
  violations: mockViolations,
  complianceRate: 85.5,
  statistics: {
    total: 4,
    critical: 1,
    high: 1,
    medium: 1,
    low: 1,
    resolved: 1
  }
};

// ===== SETUP =====
beforeEach(() => {
  fetch.mockClear();
  fetch.mockResolvedValue({
    ok: true,
    json: async () => mockApiResponse
  });
  localStorage.setItem('token', 'mock-token');
});

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// ===== HEADER TESTS =====
describe('ValidationDashboard - العنوان', () => {
  test('يجب أن يعرض عنوان لوحة التحقق', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/لوحة التحقق والامتثال/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض العنوان الفرعي', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/رقابة شاملة/)).toBeInTheDocument();
    });
  });
});

// ===== STATISTICS CARDS TESTS =====
describe('ValidationDashboard - البطاقات الإحصائية', () => {
  test('يجب أن يعرض بطاقة الانتهاكات الحرجة', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('انتهاكات حرجة')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض بطاقة الانتهاكات العالية', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('انتهاكات عالية')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض معدل الامتثال', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('معدل الامتثال')).toBeInTheDocument();
      expect(screen.getByText('85.5%')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض بطاقة المحلولة', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('تم حلها')).toBeInTheDocument();
    });
  });
});

// ===== FILTERS TESTS =====
describe('ValidationDashboard - الفلاتر', () => {
  test('يجب أن يعرض فلاتر الخطورة', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/مستوى الخطورة/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض فلتر نوع الانتهاك', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/نوع الانتهاك/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض فلتر النطاق الزمني', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/النطاق الزمني/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض فلتر الحالة', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الحالة/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض زر إعادة التعيين', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/إعادة تعيين/)).toBeInTheDocument();
    });
  });
});

// ===== VIOLATIONS TABLE TESTS =====
describe('ValidationDashboard - جدول الانتهاكات', () => {
  test('يجب أن يعرض عنوان الجدول', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/جدول الانتهاكات/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض أوصاف الانتهاكات', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('تجاوز حد الميزانية')).toBeInTheDocument();
      expect(screen.getByText('عدم الامتثال لمعايير الضريبة')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض أزرار العرض', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      const viewButtons = screen.getAllByText(/عرض/);
      expect(viewButtons.length).toBeGreaterThan(0);
    });
  });

  test('يجب أن يعرض أزرار الحل', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      const resolveButtons = screen.getAllByText(/حل/);
      expect(resolveButtons.length).toBeGreaterThan(0);
    });
  });

  test('يجب أن يعرض أعمدة الجدول', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('الخطورة')).toBeInTheDocument();
      expect(screen.getByText('النوع')).toBeInTheDocument();
      expect(screen.getByText('الوصف')).toBeInTheDocument();
      expect(screen.getByText('الحالة')).toBeInTheDocument();
    });
  });
});

// ===== MODAL TESTS =====
describe('ValidationDashboard - تفاصيل الانتهاك', () => {
  test('يجب أن يفتح نافذة التفاصيل عند النقر على زر العرض', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('تجاوز حد الميزانية')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByText(/عرض/);
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/تفاصيل الانتهاك/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض معلومات الانتهاك في النافذة', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('تجاوز حد الميزانية')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByText(/عرض/);
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('معلومات أساسية')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض زر الإغلاق في النافذة', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('تجاوز حد الميزانية')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByText(/عرض/);
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('إغلاق')).toBeInTheDocument();
    });
  });
});

// ===== EXPORT TESTS =====
describe('ValidationDashboard - التصدير', () => {
  test('يجب أن يعرض زر تصدير PDF', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/تصدير PDF/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض زر تصدير Excel', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/تصدير Excel/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض زر الطباعة', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/طباعة/)).toBeInTheDocument();
    });
  });
});

// ===== DATA FETCHING TESTS =====
describe('ValidationDashboard - جلب البيانات', () => {
  test('يجب أن يجلب البيانات عند التحميل', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/finance/validation'),
        expect.any(Object)
      );
    });
  });

  test('يجب أن يعالج أخطاء الجلب', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/❌/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض زر إعادة المحاولة عند الخطأ', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/إعادة محاولة/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعمل زر إعادة المحاولة', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/إعادة محاولة/i)).toBeInTheDocument();
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse
    });
    fireEvent.click(screen.getByText(/إعادة محاولة/i));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});

// ===== EDGE CASES =====
describe('ValidationDashboard - حالات حدية', () => {
  test('يجب أن يعالج عدم وجود انتهاكات', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ violations: [], complianceRate: 100, statistics: {} })
    });
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/لا توجد انتهاكات/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض زر التحديث', async () => {
    render(<ValidationDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/تحديث/)).toBeInTheDocument();
    });
  });
});