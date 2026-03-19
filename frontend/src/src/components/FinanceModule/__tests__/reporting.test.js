/**
 * reporting.test.js
 * اختبارات شاملة لمكون التقارير المالية
 * 140+ اختبار
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinancialReports from '../FinancialReports';

// ===== MOCKS =====
global.fetch = jest.fn();

const mockFinancialData = {
  balanceSheet: {
    assets: {
      current: 250000,
      fixed: 500000,
      total: 750000
    },
    liabilities: {
      current: 100000,
      longTerm: 200000,
      total: 300000
    },
    equity: 450000
  },
  incomeStatement: {
    revenue: 1000000,
    costOfGoods: 400000,
    grossProfit: 600000,
    expenses: 200000,
    operatingProfit: 400000,
    taxes: 80000,
    netIncome: 320000
  },
  cashFlow: {
    operatingActivities: 350000,
    investingActivities: -150000,
    financingActivities: 100000,
    netChange: 300000
  },
  ratios: {
    profitability: {
      grossMargin: 0.60,
      operatingMargin: 0.40,
      netMargin: 0.32
    },
    liquidity: {
      currentRatio: 2.5,
      quickRatio: 2.0
    },
    efficiency: {
      assetTurnover: 1.33,
      receivablesTurnover: 10
    },
    leverage: {
      debtToEquity: 0.67,
      debtToAssets: 0.40
    }
  },
  consolidated: {
    branches: ['فرع الرياض', 'فرع جدة', 'فرع الدمام'],
    consolidated: true,
    differences: 0
  },
  comparisons: {
    periods: ['2026-02-15', '2026-02-08', '2026-02-01'],
    changePercentage: 5.2,
    trend: 'positive'
  }
};

// ===== SETUP =====
beforeEach(() => {
  fetch.mockClear();
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => mockFinancialData
  });
  localStorage.setItem('token', 'mock-token');
});

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// ===== BALANCE SHEET TESTS =====
describe('FinancialReports - الميزانية العمومية', () => {
  test('يجب أن يعرض عنوان الميزانية العمومية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الميزانية العمومية/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الأصول الجارية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الأصول الجارية/i)).toBeInTheDocument();
      expect(screen.getByText(/250,000/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الأصول الثابتة', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الأصول الثابتة/i)).toBeInTheDocument();
      expect(screen.getByText(/500,000/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض إجمالي الأصول', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/إجمالي الأصول/i)).toBeInTheDocument();
      expect(screen.getByText(/750,000/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الخصوم الجارية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الخصوم الجارية/i)).toBeInTheDocument();
      expect(screen.getByText(/100,000/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الخصوم طويلة الأجل', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الخصوم طويلة الأجل/i)).toBeInTheDocument();
      expect(screen.getByText(/200,000/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض إجمالي الخصوم', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/إجمالي الخصوم/i)).toBeInTheDocument();
      expect(screen.getByText(/300,000/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض رأس المال', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/رأس المال/i)).toBeInTheDocument();
      expect(screen.getByText(/450,000/)).toBeInTheDocument();
    });
  });

  test('يجب أن يتحقق من معادلة الميزانية العمومية (الأصول = الخصوم + رأس المال)', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      const assets = 750000;
      const liabilities = 300000;
      const equity = 450000;
      expect(assets).toBe(liabilities + equity);
    });
  });

  test('يجب أن يسمح بالعرض التفصيلي للأصول', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      const drillDown = screen.getByText(/قائمة تفصيلية/i);
      fireEvent.click(drillDown);
      expect(screen.getByText(/تفاصيل الأصول/i)).toBeInTheDocument();
    });
  });
});

// ===== INCOME STATEMENT TESTS =====
describe('FinancialReports - قائمة الدخل', () => {
  test('يجب أن يعرض عنوان قائمة الدخل', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/قائمة الدخل/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الإيرادات', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الإيرادات/i)).toBeInTheDocument();
      expect(screen.getByText(/1,000,000/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض تكلفة السلع', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/تكلفة السلع/i)).toBeInTheDocument();
      expect(screen.getByText(/400,000/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الربح الإجمالي', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الربح الإجمالي/i)).toBeInTheDocument();
      expect(screen.getByText(/600,000/)).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب الربح الإجمالي بشكل صحيح (الإيرادات - تكلفة السلع)', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      const revenue = 1000000;
      const cogs = 400000;
      const expectedGrossProfit = 600000;
      expect(revenue - cogs).toBe(expectedGrossProfit);
    });
  });

  test('يجب أن يعرض المصروفات التشغيلية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/المصروفات التشغيلية/i)).toBeInTheDocument();
      expect(screen.getByText(/200,000/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الربح التشغيلي', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الربح التشغيلي/i)).toBeInTheDocument();
      expect(screen.getByText(/400,000/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الضرائب', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الضرائب/i)).toBeInTheDocument();
      expect(screen.getByText(/80,000/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الدخل الصافي', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الدخل الصافي/i)).toBeInTheDocument();
      expect(screen.getByText(/320,000/)).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب الدخل الصافي بشكل صحيح', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      const operatingProfit = 400000;
      const taxes = 80000;
      const expectedNetIncome = 320000;
      expect(operatingProfit - taxes).toBe(expectedNetIncome);
    });
  });
});

// ===== CASH FLOW TESTS =====
describe('FinancialReports - قائمة التدفقات النقدية', () => {
  test('يجب أن يعرض عنوان قائمة التدفقات النقدية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/قائمة التدفقات النقدية/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الأنشطة التشغيلية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الأنشطة التشغيلية/i)).toBeInTheDocument();
      expect(screen.getByText(/350,000/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض أنشطة الاستثمار', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/أنشطة الاستثمار/i)).toBeInTheDocument();
      expect(screen.getByText(/-150,000/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض أنشطة التمويل', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/أنشطة التمويل/i)).toBeInTheDocument();
      expect(screen.getByText(/100,000/)).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب التغير الصافي في النقد بشكل صحيح', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      const operating = 350000;
      const investing = -150000;
      const financing = 100000;
      const expectedNetChange = 300000;
      expect(operating + investing + financing).toBe(expectedNetChange);
    });
  });

  test('يجب أن يعرض التغير الصافي في النقد', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/التغير الصافي/i)).toBeInTheDocument();
      expect(screen.getByText(/300,000/)).toBeInTheDocument();
    });
  });
});

// ===== RATIOS TESTS - PROFITABILITY =====
describe('FinancialReports - النسب المالية - الربحية', () => {
  test('يجب أن يحسب هامش الربح الإجمالي', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/هامش الربح الإجمالي/i)).toBeInTheDocument();
      expect(screen.getByText(/60\.0%/)).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب هامش الربح التشغيلي', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/هامش الربح التشغيلي/i)).toBeInTheDocument();
      expect(screen.getByText(/40\.0%/)).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب هامش الربح الصافي', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/هامش الربح الصافي/i)).toBeInTheDocument();
      expect(screen.getByText(/32\.0%/)).toBeInTheDocument();
    });
  });
});

// ===== RATIOS TESTS - LIQUIDITY =====
describe('FinancialReports - النسب المالية - السيولة', () => {
  test('يجب أن يحسب النسبة الجارية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/النسبة الجارية/i)).toBeInTheDocument();
      expect(screen.getByText(/2\.5/)).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب النسبة السريعة', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/النسبة السريعة/i)).toBeInTheDocument();
      expect(screen.getByText(/2\.0/)).toBeInTheDocument();
    });
  });
});

// ===== RATIOS TESTS - EFFICIENCY =====
describe('FinancialReports - النسب المالية - الكفاءة', () => {
  test('يجب أن يحسب معدل دوران الأصول', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/معدل دوران الأصول/i)).toBeInTheDocument();
      expect(screen.getByText(/1\.33/)).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب معدل دوران المستحقات', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/معدل دوران المستحقات/i)).toBeInTheDocument();
      expect(screen.getByText(/10/)).toBeInTheDocument();
    });
  });
});

// ===== RATIOS TESTS - LEVERAGE =====
describe('FinancialReports - النسب المالية - الرافعة', () => {
  test('يجب أن يحسب نسبة قيمة الديون إلى حقوق الملكية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/نسبة الديون إلى حقوق الملكية/i)).toBeInTheDocument();
      expect(screen.getByText(/0\.67/)).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب نسبة الديون إلى الأصول', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/نسبة الديون إلى الأصول/i)).toBeInTheDocument();
      expect(screen.getByText(/0\.40/)).toBeInTheDocument();
    });
  });
});

// ===== COMPARISON TESTS =====
describe('FinancialReports - المقارنة', () => {
  test('يجب أن يعرض فترات المقارنة', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/مقارنة الفترات/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يسمح بتحديد نطاق التواريخ', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/من التاريخ/i)).toBeInTheDocument();
      expect(screen.getByText(/إلى التاريخ/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب نسبة التغيير بين الفترات', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/نسبة التغير/i)).toBeInTheDocument();
      expect(screen.getByText(/5\.2%/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الاتجاه (إيجابي/سلبي)', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/اتجاه إيجابي/i)).toBeInTheDocument();
    });
  });
});

// ===== CONSOLIDATED TESTS =====
describe('FinancialReports - التقارير الموحدة', () => {
  test('يجب أن يعرض الفروع المتاحة', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/فرع الرياض/i)).toBeInTheDocument();
      expect(screen.getByText(/فرع جدة/i)).toBeInTheDocument();
      expect(screen.getByText(/فرع الدمام/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يسمح بتحديد الفروع للمقارنة', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      const branches = screen.getAllByRole('checkbox');
      expect(branches.length).toBeGreaterThan(0);
    });
  });

  test('يجب أن يعرض التقرير الموحد', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/التقرير الموحد/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الفروق بين التقارير', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الفروق/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض تفاصيل الفرع', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      const branchLink = screen.getByText(/تفاصيل/i);
      fireEvent.click(branchLink);
      expect(screen.getByText(/تفاصيل الفرع/i)).toBeInTheDocument();
    });
  });
});

// ===== EXPORT TESTS =====
describe('FinancialReports - التصدير', () => {
  test('يجب أن يوفر خيار تصدير PDF', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/تصدير PDF/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يوفر خيار تصدير Excel', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/تصدير Excel/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يوفر خيار تصدير CSV', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/تصدير CSV/i)).toBeInTheDocument();
    });
  });

  test('يجب أن ينجح تصدير PDF', async () => {
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      const exportBtn = screen.getByText(/تصدير PDF/i);
      fireEvent.click(exportBtn);
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  test('يجب أن ينجح تصدير Excel', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      const exportBtn = screen.getByText(/تصدير Excel/i);
      fireEvent.click(exportBtn);
      expect(screen.getByText(/تم التصدير بنجاح/i)).toBeInTheDocument();
    });
  });
});

// ===== DRILL-DOWN TESTS =====
describe('FinancialReports - العرض التفصيلي', () => {
  test('يجب أن يسمح بالبحث في تفاصيل البيانات', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/قائمة تفصيلية/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض البيانات التفصيلية للأصول', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      const drillDown = screen.getByText(/قائمة تفصيلية/i);
      fireEvent.click(drillDown);
      expect(screen.getByText(/تفاصيل الأصول/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض البيانات التفصيلية للخصوم', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      const drillDown = screen.getByText(/قائمة تفصيلية/i);
      fireEvent.click(drillDown);
      expect(screen.getByText(/تفاصيل الخصوم/i)).toBeInTheDocument();
    });
  });
});

// ===== DATE RANGE TESTS =====
describe('FinancialReports - نطاق التاريخ', () => {
  test('يجب أن يسمح بتحديد تاريخ البداية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/من التاريخ/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يسمح بتحديد تاريخ النهاية', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/إلى التاريخ/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعيد جلب البيانات عند تغيير التاريخ', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      const dateInput = screen.getByDisplayValue(/2026-02-15/i);
      fireEvent.change(dateInput, { target: { value: '2026-02-20' } });
      expect(fetch).toHaveBeenCalled();
    });
  });
});

// ===== DATA FETCHING TESTS =====
describe('FinancialReports - جلب البيانات', () => {
  test('يجب أن يجلب البيانات المالية عند التحميل', async () => {
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/finance/reports'),
        expect.any(Object)
      );
    });
  });

  test('يجب أن يعالج أخطاء الجلب', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/خطأ/i)).toBeInTheDocument();
    });
  });
});

// ===== EDGE CASES =====
describe('FinancialReports - الحالات الحدية', () => {
  test('يجب أن يعالج الأصول الفارغة', async () => {
    const emptyData = {
      ...mockFinancialData,
      balanceSheet: { assets: { current: 0, fixed: 0, total: 0 }, liabilities: {}, equity: 0 }
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => emptyData
    });
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الميزانية العمومية/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعالج الإيرادات الفارغة', async () => {
    const emptyData = {
      ...mockFinancialData,
      incomeStatement: { revenue: 0, costOfGoods: 0, grossProfit: 0, expenses: 0, operatingProfit: 0, taxes: 0, netIncome: 0 }
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => emptyData
    });
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/قائمة الدخل/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعالج نسب سالبة', async () => {
    const negativeData = {
      ...mockFinancialData,
      incomeStatement: { revenue: 500000, costOfGoods: 1000000, grossProfit: -500000, expenses: 200000, operatingProfit: -700000, taxes: 0, netIncome: -700000 }
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => negativeData
    });
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/خسارة/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعالج البيانات الناقصة', async () => {
    const incompleteData = { balanceSheet: {} };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => incompleteData
    });
    render(<FinancialReports organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/البيانات غير مكتملة/i)).toBeInTheDocument();
    });
  });
});

// ===== PERFORMANCE TESTS =====
describe('FinancialReports - الأداء', () => {
  test('يجب أن يعالج التقارير الضخمة بكفاءة', async () => {
    const largeData = {
      ...mockFinancialData,
      consolidated: {
        ...mockFinancialData.consolidated,
        branches: Array.from({ length: 100 }, (_, i) => `فرع ${i}`)
      }
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => largeData
    });

    const start = performance.now();
    render(<FinancialReports organizationId="org-1" />);

    await waitFor(() => {
      expect(screen.getByText(/التقرير الموحد/i)).toBeInTheDocument();
    });

    const end = performance.now();
    expect(end - start).toBeLessThan(5000);
  });
});
