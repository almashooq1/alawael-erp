/**
 * cashflow.test.js
 * اختبارات شاملة لمكون لوحة التدفقات النقدية
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CashFlowDashboard from '../CashFlowDashboard';

// ===== MOCKS =====
global.fetch = jest.fn();

const mockCashFlowData = {
  cashPosition: {
    current: 500000,
    lastUpdated: '2026-01-15T10:00:00Z',
  },
  inflows: [
    { source: 'مبيعات', category: 'إيرادات', amount: 200000, expectedDate: '2026-02-01T00:00:00Z' },
    { source: 'استثمارات', category: 'عوائد', amount: 50000, expectedDate: '2026-02-15T00:00:00Z' },
  ],
  outflows: [
    { purpose: 'رواتب', category: 'تشغيل', amount: 150000, dueDate: '2026-02-01T00:00:00Z' },
    { purpose: 'إيجار', category: 'ثابت', amount: 30000, dueDate: '2026-02-05T00:00:00Z' },
  ],
  forecasts: [
    { date: '2026-02', forecast: 520000, ci90: 480000, ci95: 460000 },
    { date: '2026-03', forecast: 550000, ci90: 500000, ci95: 480000 },
    { date: '2026-04', forecast: 580000, ci90: 520000, ci95: 500000 },
  ],
  reserves: [
    { type: 'طوارئ', amount: 100000, createdAt: '2025-06-01T00:00:00Z', status: 'active' },
    { type: 'تشغيلي', amount: 50000, createdAt: '2025-08-01T00:00:00Z', status: 'active' },
  ],
};

// ===== SETUP =====
beforeEach(() => {
  fetch.mockClear();
  fetch.mockResolvedValue({
    ok: true,
    json: async () => mockCashFlowData,
  });
  localStorage.setItem('token', 'mock-token');
});

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// ===== HEADER TESTS =====
describe('CashFlowDashboard - العنوان', () => {
  test('يجب أن يعرض عنوان لوحة التدفقات النقدية', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/لوحة التدفقات النقدية/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض زر التحديث', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/تحديث/)).toBeInTheDocument();
    });
  });
});

// ===== CASH POSITION TESTS =====
describe('CashFlowDashboard - بطاقات المركز النقدي', () => {
  test('يجب أن يعرض بطاقة النقد الحالي', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/النقد الحالي/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض بطاقة النقد الدخيل المتوقع', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/النقد الدخيل المتوقع/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض بطاقة النقد الخارج المتوقع', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/النقد الخارج المتوقع/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض بطاقة صافي التدفق', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/صافي التدفق/)).toBeInTheDocument();
    });
  });
});

// ===== VIEW MODE TESTS =====
describe('CashFlowDashboard - أوضاع العرض', () => {
  test('يجب أن يبدأ في وضع الرسوم البيانية', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getAllByText(/الدخل والخرج/).length).toBeGreaterThan(0);
    });
  });

  test('يجب أن يعرض محتوى الجداول عند التبديل', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/رسوم البيانات/)).toBeInTheDocument();
    });

    const select = document.querySelector('.chart-selector');
    fireEvent.change(select, { target: { value: 'table' } });

    await waitFor(() => {
      expect(screen.getByText(/المصدر/)).toBeInTheDocument();
      expect(screen.getByText(/الغرض/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض تفاصيل الدخول في وضع الجداول', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/رسوم البيانات/)).toBeInTheDocument();
    });

    const select = document.querySelector('.chart-selector');
    fireEvent.change(select, { target: { value: 'table' } });

    await waitFor(() => {
      expect(screen.getByText('مبيعات')).toBeInTheDocument();
      expect(screen.getByText('استثمارات')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض تفاصيل الخروج في وضع الجداول', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/رسوم البيانات/)).toBeInTheDocument();
    });

    const select = document.querySelector('.chart-selector');
    fireEvent.change(select, { target: { value: 'table' } });

    await waitFor(() => {
      expect(screen.getByText('رواتب')).toBeInTheDocument();
      expect(screen.getByText('إيجار')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض التحليلات في وضع التحليل', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/رسوم البيانات/)).toBeInTheDocument();
    });

    const select = document.querySelector('.chart-selector');
    fireEvent.change(select, { target: { value: 'analysis' } });

    await waitFor(() => {
      expect(screen.getByText('اتجاه الدخل')).toBeInTheDocument();
      expect(screen.getByText('اتجاه الخرج')).toBeInTheDocument();
      expect(screen.getByText('الصحة المالية')).toBeInTheDocument();
      expect(screen.getByText('المخاطر المكتشفة')).toBeInTheDocument();
    });
  });
});

// ===== FORECAST TESTS =====
describe('CashFlowDashboard - التنبؤات', () => {
  test('يجب أن يعرض قسم التنبؤات', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/التنبؤات/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض زر إعادة التشغيل', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/إعادة التشغيل/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض جدول التنبؤات', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('جدول التنبؤات')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض بيانات التنبؤات', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('التاريخ')).toBeInTheDocument();
      expect(screen.getByText('التنبؤ')).toBeInTheDocument();
    });
  });
});

// ===== RESERVES TESTS =====
describe('CashFlowDashboard - الاحتياطيات', () => {
  test('يجب أن يعرض قسم إدارة الاحتياطيات', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/إدارة الاحتياطيات/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض زر إضافة احتياطي', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/إضافة احتياطي/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض إجمالي الاحتياطيات', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('إجمالي الاحتياطيات')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض نسبة الكفاية', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('نسبة الكفاية')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض جدول الاحتياطيات', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('جدول الاحتياطيات')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض بيانات الاحتياطيات', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('طوارئ')).toBeInTheDocument();
      expect(screen.getByText('تشغيلي')).toBeInTheDocument();
    });
  });
});

// ===== DATA FETCHING TESTS =====
describe('CashFlowDashboard - جلب البيانات', () => {
  test('يجب أن يجلب البيانات عند التحميل', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/finance/cashflow'),
        expect.any(Object)
      );
    });
  });

  test('يجب أن يعالج أخطاء الجلب', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/❌/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض زر إعادة المحاولة عند الخطأ', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/إعادة محاولة/i)).toBeInTheDocument();
    });
  });
});

// ===== EDGE CASES =====
describe('CashFlowDashboard - حالات حدية', () => {
  test('يجب أن يعالج عدم وجود بيانات', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        cashPosition: { current: 0 },
        inflows: [],
        outflows: [],
        forecasts: [],
        reserves: [],
      }),
    });
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/لوحة التدفقات النقدية/)).toBeInTheDocument();
    });
  });
});
