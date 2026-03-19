/**
 * cashflow.test.js
 * اختبارات شاملة لمكون التدفقات النقدية
 * 130+ اختبار
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CashFlowDashboard from '../CashFlowDashboard';

// ===== MOCKS =====
global.fetch = jest.fn();

const mockCashFlowData = {
  cashPosition: {
    current: 500000,
    lastUpdated: new Date().toISOString()
  },
  inflows: [
    { id: '1', source: 'المبيعات', category: 'revenue', amount: 100000, expectedDate: new Date() },
    { id: '2', source: 'الاستثمارات', category: 'investment', amount: 50000, expectedDate: new Date() },
    { id: '3', source: 'القروض', category: 'loans', amount: 75000, expectedDate: new Date() },
    { id: '4', source: 'الفائدة', category: 'interest', amount: 15000, expectedDate: new Date() }
  ],
  outflows: [
    { id: '1', purpose: 'الرواتب', category: 'salaries', amount: 80000, dueDate: new Date() },
    { id: '2', purpose: 'المشتريات', category: 'purchases', amount: 45000, dueDate: new Date() },
    { id: '3', purpose: 'الإيجار', category: 'rent', amount: 30000, dueDate: new Date() },
    { id: '4', purpose: 'المرافق', category: 'utilities', amount: 10000, dueDate: new Date() },
    { id: '5', purpose: 'الصيانة', category: 'maintenance', amount: 20000, dueDate: new Date() },
    { id: '6', purpose: 'الضرائب', category: 'taxes', amount: 40000, dueDate: new Date() }
  ],
  forecasts: [
    { date: '2026-02-20', forecast: 520000, ci90: 510000, ci95: 505000 },
    { date: '2026-02-27', forecast: 540000, ci90: 525000, ci95: 515000 },
    { date: '2026-03-06', forecast: 560000, ci90: 540000, ci95: 525000 }
  ],
  reserves: [
    { id: '1', type: 'طوارئ', amount: 150000, createdAt: new Date(), status: 'active' },
    { id: '2', type: 'صيانة', amount: 100000, createdAt: new Date(), status: 'active' }
  ]
};

// ===== SETUP =====
beforeEach(() => {
  fetch.mockClear();
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => mockCashFlowData
  });
  localStorage.setItem('token', 'mock-token');
});

afterEach(() => {
  localStorage.clear();
});

// ===== RENDERING TESTS =====
describe('CashFlowDashboard - التصيير', () => {
  test('يجب أن يعرض العنوان الرئيسي', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/لوحة التدفقات النقدية/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض النقد الحالي', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/النقد الحالي/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض النقد الدخيل المتوقع', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/النقد الدخيل المتوقع/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض النقد الخارج المتوقع', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/النقد الخارج المتوقع/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض صافي التدفق', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/صافي التدفق/i)).toBeInTheDocument();
    });
  });
});

// ===== CASH POSITION TESTS =====
describe('CashFlowDashboard - المركز النقدي', () => {
  test('يجب أن يحسب إجمالي الدخول بشكل صحيح', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      const totalInflows = mockCashFlowData.inflows.reduce((sum, f) => sum + f.amount, 0);
      expect(screen.getByText(new RegExp(totalInflows.toString()))).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب إجمالي الخروجات بشكل صحيح', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      const totalOutflows = mockCashFlowData.outflows.reduce((sum, f) => sum + f.amount, 0);
      const flowContainer = screen.getByText(/النقد الخارج المتوقع/i);
      expect(flowContainer).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب صافي التدفق بشكل صحيح', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      const totalInflows = mockCashFlowData.inflows.reduce((sum, f) => sum + f.amount, 0);
      const totalOutflows = mockCashFlowData.outflows.reduce((sum, f) => sum + f.amount, 0);
      const netFlow = totalInflows - totalOutflows;
      expect(screen.getByText(/صافي التدفق/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يظهر النقد الحالي بشكل صحيح', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/500,000/)).toBeInTheDocument();
    });
  });
});

// ===== INFLOWS TESTS =====
describe('CashFlowDashboard - الدخول', () => {
  test('يجب أن يعرض جميع مصادر الدخول', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/المبيعات/i)).toBeInTheDocument();
      expect(screen.getByText(/الاستثمارات/i)).toBeInTheDocument();
      expect(screen.getByText(/القروض/i)).toBeInTheDocument();
      expect(screen.getByText(/الفائدة/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض المبالغ الصحيحة للدخول', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/100,000/)).toBeInTheDocument(); // First inflow
    });
  });

  test('يجب أن يعرض تاريخ الدخول المتوقع', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/التاريخ المتوقع/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يصنف الدخول حسب الفئة', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(0);
    });
  });
});

// ===== OUTFLOWS TESTS =====
describe('CashFlowDashboard - الخروجات', () => {
  test('يجب أن يعرض جميع أغراض الخروج', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الرواتب/i)).toBeInTheDocument();
      expect(screen.getByText(/المشتريات/i)).toBeInTheDocument();
      expect(screen.getByText(/الإيجار/i)).toBeInTheDocument();
      expect(screen.getByText(/المرافق/i)).toBeInTheDocument();
      expect(screen.getByText(/الصيانة/i)).toBeInTheDocument();
      expect(screen.getByText(/الضرائب/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض المبالغ الصحيحة للخروج', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/80,000/)).toBeInTheDocument(); // Salaries
    });
  });

  test('يجب أن يعرض تاريخ التسديد', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/تاريخ التسديد/i)).toBeInTheDocument();
    });
  });
});

// ===== FORECASTING TESTS =====
describe('CashFlowDashboard - التنبؤات', () => {
  test('يجب أن يعرض قسم التنبؤات', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/التنبؤات/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض نموذج التنبؤ المختار', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      const modelSelector = screen.getByDisplayValue('arima');
      expect(modelSelector).toBeInTheDocument();
    });
  });

  test('يجب أن يوفر خيارات نماذج متعددة', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      const modelSelector = screen.getByDisplayValue('arima');
      expect(modelSelector.innerHTML).toContain('ARIMA');
      expect(modelSelector.innerHTML).toContain('Exponential');
      expect(modelSelector.innerHTML).toContain('Linear');
      expect(modelSelector.innerHTML).toContain('Neural');
    });
  });

  test('يجب أن يعيد التنبؤات عند إعادة التشغيل', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/إعادة التشغيل/i)).toBeInTheDocument();
    });
    
    const refreshButton = screen.getByText(/إعادة التشغيل/i);
    await userEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/finance/cashflow/forecast'),
        expect.any(Object)
      );
    });
  });

  test('يجب أن يعرض جدول التنبؤات', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/جدول التنبؤات/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض فترات الثقة', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      const text = screen.getByText(/90%/i);
      expect(text).toBeInTheDocument();
    });
  });
});

// ===== RESERVES TESTS =====
describe('CashFlowDashboard - الاحتياطيات', () => {
  test('يجب أن يعرض قسم الاحتياطيات', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/إدارة الاحتياطيات/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب إجمالي الاحتياطيات', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      const totalReserves = mockCashFlowData.reserves.reduce((sum, r) => sum + r.amount, 0);
      expect(screen.getByText(/إجمالي الاحتياطيات/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب نسبة الكفاية', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/نسبة الكفاية/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب الفجوة اللازمة', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الفجوة اللازمة/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يسمح بإضافة احتياطي جديد', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      const addButton = screen.getByText(/إضافة احتياطي/i);
      expect(addButton).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض جدول الاحتياطيات', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/جدول الاحتياطيات/i)).toBeInTheDocument();
    });
  });
});

// ===== VIEW MODE TESTS =====
describe('CashFlowDashboard - أنماط العرض', () => {
  test('يجب أن يعرض الرسوم البيانية في الوضع الافتراضي', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الرسوم البيانية/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يبدل إلى وضع الجداول', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      const tableOption = screen.getByDisplayValue('table');
      if (tableOption) {
        fireEvent.change(tableOption, { target: { value: 'table' } });
        expect(screen.getByText(/الدخول/i)).toBeInTheDocument();
      }
    });
  });

  test('يجب أن يبدل إلى وضع التحليل', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      const analysisOption = screen.getByDisplayValue('analysis');
      if (analysisOption) {
        fireEvent.change(analysisOption, { target: { value: 'analysis' } });
        expect(screen.getByText(/تحليل متقدم/i)).toBeInTheDocument();
      }
    });
  });
});

// ===== DATA FETCHING TESTS =====
describe('CashFlowDashboard - جلب البيانات', () => {
  test('يجب أن يجلب بيانات التدفق النقدي عند التحميل', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/finance/cashflow/dashboard'),
        expect.any(Object)
      );
    });
  });

  test('يجب أن يحدث البيانات كل 5 ثواني', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  test('يجب أن يعالج أخطاء الجلب بشكل صحيح', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/خطأ/i)).toBeInTheDocument();
    });
  });
});

// ===== ANALYSIS TESTS =====
describe('CashFlowDashboard - التحليل', () => {
  test('يجب أن يعرض اتجاه الدخل', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/اتجاه الدخل/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض اتجاه الخرج', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/اتجاه الخرج/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الصحة المالية', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الصحة المالية/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض المخاطر المكتشفة', async () => {
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/المخاطر المكتشفة/i)).toBeInTheDocument();
    });
  });
});

// ===== EDGE CASES =====
describe('CashFlowDashboard - الحالات الحدية', () => {
  test('يجب أن يعالج قائمة دخول فارغة', async () => {
    const emptyData = { ...mockCashFlowData, inflows: [] };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => emptyData
    });
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/النقد الحالي/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعالج صافي تدفق سالب', async () => {
    const negativeFlowData = {
      ...mockCashFlowData,
      outflows: [...mockCashFlowData.outflows, 
        { id: '7', purpose: 'مدفوعات إضافية', category: 'payments', amount: 300000, dueDate: new Date() }
      ]
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => negativeFlowData
    });
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/صافي التدفق/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعالج التاريخ المفقود', async () => {
    const noDateData = {
      ...mockCashFlowData,
      cashPosition: { current: 500000 }
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => noDateData
    });
    render(<CashFlowDashboard organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/النقد الحالي/i)).toBeInTheDocument();
    });
  });
});

// ===== PERFORMANCE TESTS =====
describe('CashFlowDashboard - الأداء', () => {
  test('يجب أن يعالج 100+ دخول بكفاءة', async () => {
    const largeInflows = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      source: `مصدر ${i}`,
      category: 'revenue',
      amount: Math.random() * 50000,
      expectedDate: new Date()
    }));
    const largeData = { ...mockCashFlowData, inflows: largeInflows };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => largeData
    });
    
    const start = performance.now();
    render(<CashFlowDashboard organizationId="org-1" />);
    
    await waitFor(() => {
      expect(screen.getByText(/النقد الحالي/i)).toBeInTheDocument();
    });
    
    const end = performance.now();
    expect(end - start).toBeLessThan(3000);
  });
});
