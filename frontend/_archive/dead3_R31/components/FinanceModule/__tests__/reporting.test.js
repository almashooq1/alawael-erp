/**
 * reporting.test.js
 * اختبارات شاملة لمكون التقارير المالية
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FinancialReports from '../FinancialReports';

// ===== MOCKS =====
global.fetch = jest.fn();

const mockReportData = {
  assets: {
    current: [
      { name: 'النقد والمعادل', value: 100000 },
      { name: 'الذمم المدينة', value: 150000 },
    ],
    currentTotal: 250000,
    fixed: [
      { name: 'المباني', value: 300000 },
      { name: 'المعدات', value: 200000 },
    ],
    fixedTotal: 500000,
    total: 750000,
  },
  liabilities: {
    current: [
      { name: 'الذمم الدائنة', value: 60000 },
      { name: 'مستحقات الموظفين', value: 40000 },
    ],
    currentTotal: 100000,
    longTerm: [{ name: 'قروض بنكية', value: 200000 }],
    longTermTotal: 200000,
    total: 300000,
  },
  equity: [
    { name: 'رأس المال', value: 350000 },
    { name: 'أرباح مبقاة', value: 100000 },
  ],
  equityTotal: 450000,
  isBalanced: true,
  revenues: [{ name: 'إيرادات المبيعات', amount: 1000000 }],
  totalRevenues: 1000000,
  operatingExpenses: [{ name: 'رواتب', amount: 200000 }],
  totalOperatingExpenses: 200000,
  operatingIncome: 400000,
  otherItems: [{ name: 'إيرادات أخرى', amount: 5000 }],
  incomeTax: 80000,
  netIncome: 320000,
  operatingCashFlow: [{ name: 'صافي الدخل', amount: 320000 }],
  netOperatingCashFlow: 350000,
  investingCashFlow: [{ name: 'شراء معدات', amount: -150000 }],
  netInvestingCashFlow: -150000,
  financingCashFlow: [{ name: 'قروض', amount: 100000 }],
  netFinancingCashFlow: 100000,
  beginningCash: 200000,
  netCashChange: 300000,
  endingCash: 500000,
  profitabilityRatios: [
    { name: 'هامش الربح الإجمالي', value: 0.6, status: 'good', description: 'نسبة جيدة' },
    { name: 'هامش الربح التشغيلي', value: 0.4, status: 'good', description: 'نسبة جيدة' },
    { name: 'هامش الربح الصافي', value: 0.32, status: 'good', description: 'نسبة جيدة' },
  ],
  liquidityRatios: [
    { name: 'النسبة الجارية', value: 2.5, status: 'good', description: 'سيولة جيدة' },
    { name: 'النسبة السريعة', value: 2.0, status: 'good', description: 'سيولة عالية' },
  ],
  efficiencyRatios: [
    { name: 'معدل دوران الأصول', value: 1.33, status: 'medium', description: 'كفاءة متوسطة' },
    { name: 'معدل دوران المستحقات', value: 10.0, status: 'good', description: 'كفاءة جيدة' },
  ],
  leverageRatios: [
    {
      name: 'نسبة الديون إلى حقوق الملكية',
      value: 0.67,
      status: 'good',
      description: 'رافعة مناسبة',
    },
    { name: 'نسبة الديون إلى الأصول', value: 0.4, status: 'good', description: 'رافعة مقبولة' },
  ],
  branches: [
    {
      name: 'فرع الرياض',
      revenues: 500000,
      expenses: 300000,
      netIncome: 200000,
      assets: 400000,
      liabilities: 150000,
    },
    {
      name: 'فرع جدة',
      revenues: 300000,
      expenses: 200000,
      netIncome: 100000,
      assets: 250000,
      liabilities: 100000,
    },
    {
      name: 'فرع الدمام',
      revenues: 200000,
      expenses: 150000,
      netIncome: 50000,
      assets: 100000,
      liabilities: 50000,
    },
  ],
  totalExpenses: 650000,
  totalNetIncome: 350000,
  totalAssets: 750000,
  totalLiabilities: 300000,
};

// ===== SETUP =====
beforeEach(() => {
  fetch.mockClear();
  fetch.mockResolvedValue({
    ok: true,
    json: async () => mockReportData,
  });
  localStorage.setItem('token', 'mock-token');
});

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

const clickTab = async tabText => {
  const tab = screen.getByText(new RegExp(tabText));
  fireEvent.click(tab);
  await waitFor(() => expect(fetch).toHaveBeenCalled());
};

// ===== BALANCE SHEET TESTS =====
describe('FinancialReports - الميزانية', () => {
  test('يجب أن يعرض عنوان قائمة المركز المالي', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/قائمة المركز المالي/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض قسم الأصول', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('الأصول')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الأصول الحالية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getAllByText(/الأصول الحالية/i).length).toBeGreaterThan(0);
    });
  });

  test('يجب أن يعرض الأصول الثابتة', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getAllByText(/الأصول الثابتة/i).length).toBeGreaterThan(0);
    });
  });

  test('يجب أن يعرض إجمالي الأصول', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('إجمالي الأصول')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض قسم الالتزامات', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('الالتزامات')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض حقوق المساهمين', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('حقوق المساهمين')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض حالة التوازن', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/متوازن/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض بنود الأصول الحالية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('النقد والمعادل')).toBeInTheDocument();
      expect(screen.getByText('الذمم المدينة')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض بنود الأصول الثابتة', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('المباني')).toBeInTheDocument();
      expect(screen.getByText('المعدات')).toBeInTheDocument();
    });
  });
});

// ===== INCOME STATEMENT TESTS =====
describe('FinancialReports - قائمة الدخل', () => {
  test('يجب أن يعرض قائمة الدخل بعد النقر على التبويب', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('الدخل');
    await waitFor(() => {
      expect(screen.getByText('قائمة الدخل')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض قسم الإيرادات', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('الدخل');
    await waitFor(() => {
      expect(screen.getByText('الإيرادات')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض تكاليف التشغيل', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('الدخل');
    await waitFor(() => {
      expect(screen.getByText('تكاليف التشغيل')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الدخل من العمليات', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('الدخل');
    await waitFor(() => {
      expect(screen.getByText('الدخل من العمليات')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض قسم الضرائب', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('الدخل');
    await waitFor(() => {
      expect(screen.getByText('الضرائب')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض صافي الدخل', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('الدخل');
    await waitFor(() => {
      expect(screen.getByText('صافي الدخل')).toBeInTheDocument();
    });
  });
});

// ===== CASH FLOW TESTS =====
describe('FinancialReports - التدفقات النقدية', () => {
  test('يجب أن يعرض قائمة التدفقات النقدية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('التدفقات النقدية');
    await waitFor(() => {
      expect(screen.getByText('قائمة التدفقات النقدية')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض التدفقات التشغيلية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('التدفقات النقدية');
    await waitFor(() => {
      expect(screen.getByText(/التدفقات من العمليات التشغيلية/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض التدفقات الاستثمارية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('التدفقات النقدية');
    await waitFor(() => {
      expect(screen.getByText(/التدفقات من الأنشطة الاستثمارية/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض التدفقات التمويلية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('التدفقات النقدية');
    await waitFor(() => {
      expect(screen.getByText(/التدفقات من الأنشطة التمويلية/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض ملخص التدفقات', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('التدفقات النقدية');
    await waitFor(() => {
      expect(screen.getByText(/النقد في بداية الفترة/i)).toBeInTheDocument();
      expect(screen.getByText(/النقد في نهاية الفترة/i)).toBeInTheDocument();
    });
  });
});

// ===== RATIOS TESTS =====
describe('FinancialReports - النسب المالية', () => {
  test('يجب أن يعرض نسب الربحية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('النسب المالية');
    await waitFor(() => {
      expect(screen.getByText('نسب الربحية')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض هامش الربح الإجمالي', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('النسب المالية');
    await waitFor(() => {
      expect(screen.getByText('هامش الربح الإجمالي')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض نسب السيولة', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('النسب المالية');
    await waitFor(() => {
      expect(screen.getByText('نسب السيولة')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض النسبة الجارية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('النسب المالية');
    await waitFor(() => {
      expect(screen.getByText('النسبة الجارية')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض نسب الكفاءة', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('النسب المالية');
    await waitFor(() => {
      expect(screen.getByText('نسب الكفاءة')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض نسب الرفع المالي', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('النسب المالية');
    await waitFor(() => {
      expect(screen.getByText('نسب الرفع المالي')).toBeInTheDocument();
    });
  });
});

// ===== CONSOLIDATED TESTS =====
describe('FinancialReports - التقرير الموحد', () => {
  test('يجب أن يعرض عنوان التقرير الموحد', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('موحد');
    await waitFor(() => {
      expect(screen.getByText(/التقرير الموحد/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الأداء حسب الفرع', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('موحد');
    await waitFor(() => {
      expect(screen.getByText('الأداء حسب الفرع')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض أسماء الفروع', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await clickTab('موحد');
    await waitFor(() => {
      expect(screen.getByText('فرع الرياض')).toBeInTheDocument();
      expect(screen.getByText('فرع جدة')).toBeInTheDocument();
      expect(screen.getByText('فرع الدمام')).toBeInTheDocument();
    });
  });
});

// ===== DATE & EXPORT TESTS =====
describe('FinancialReports - التاريخ والتصدير', () => {
  test('يجب أن يعرض حقول التاريخ', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('من:')).toBeInTheDocument();
      expect(screen.getByText('إلى:')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض زر التحميل', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/تحميل/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض زر الطباعة', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/طباعة/i)).toBeInTheDocument();
    });
  });
});

// ===== TAB NAVIGATION TESTS =====
describe('FinancialReports - التبويبات', () => {
  test('يجب أن يعرض جميع التبويبات', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getAllByText(/الميزانية/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/الدخل/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/التدفقات النقدية/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/النسب المالية/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/موحد/).length).toBeGreaterThan(0);
    });
  });

  test('يجب أن يبدل بين التبويبات', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/قائمة المركز المالي/i)).toBeInTheDocument();
    });
    await clickTab('الدخل');
    await waitFor(() => {
      expect(screen.getByText('قائمة الدخل')).toBeInTheDocument();
    });
  });
});

// ===== DATA FETCHING TESTS =====
describe('FinancialReports - جلب البيانات', () => {
  test('يجب أن يجلب البيانات عند التحميل', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/finance/reports'),
        expect.any(Object)
      );
    });
  });

  test('يجب أن يعالج أخطاء الجلب', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/❌/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض زر إعادة المحاولة عند الخطأ', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/إعادة محاولة/i)).toBeInTheDocument();
    });
  });
});

// ===== EDGE CASES =====
describe('FinancialReports - حالات حدية', () => {
  test('يجب أن يعالج البيانات الفارغة', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/قائمة المركز المالي/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض عنوان التقارير المالية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/التقارير المالية/i)).toBeInTheDocument();
    });
  });
});
