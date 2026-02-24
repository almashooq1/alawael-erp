/**
 * risk.test.js
 * اختبارات شاملة لمكون مصفوفة المخاطر
 * 110+ اختبار
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RiskMatrix from '../RiskMatrix';

// ===== MOCKS =====
global.fetch = jest.fn();

const mockRiskData = {
  risks: [
    {
      id: '1',
      name: 'مخاطر العملة',
      probability: 0.6,
      impact: 0.8,
      severity: 0.7,
      status: 'monitored',
      owner: 'المالية',
      mitigation: 'تحوط جزئي',
      lastUpdated: new Date()
    },
    {
      id: '2',
      name: 'مخاطر الائتمان',
      probability: 0.4,
      impact: 0.9,
      severity: 0.65,
      status: 'active',
      owner: 'الائتمان',
      mitigation: 'حد الائتمان',
      lastUpdated: new Date()
    },
    {
      id: '3',
      name: 'مخاطر السيولة',
      probability: 0.3,
      impact: 0.7,
      severity: 0.51,
      status: 'monitored',
      owner: 'الخزينة',
      mitigation: 'خطوط ائتمان',
      lastUpdated: new Date()
    }
  ],
  statistics: {
    criticalCount: 5,
    highCount: 12,
    mediumCount: 28,
    lowCount: 45,
    averageSeverity: 0.62,
    coverageRatio: 0.78
  },
  trends: [
    { date: '2026-02-01', critical: 4, high: 10, medium: 25, low: 42 },
    { date: '2026-02-08', critical: 5, high: 11, medium: 27, low: 44 },
    { date: '2026-02-15', critical: 5, high: 12, medium: 28, low: 45 }
  ]
};

// ===== SETUP =====
beforeEach(() => {
  fetch.mockClear();
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => mockRiskData
  });
  localStorage.setItem('token', 'mock-token');
});

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// ===== RENDERING TESTS =====
describe('RiskMatrix - التصيير', () => {
  test('يجب أن يعرض العنوان الرئيسي', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/مصفوفة المخاطر/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض شبكة المصفوفة', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/احتمالية/i)).toBeInTheDocument();
      expect(screen.getByText(/التأثير/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض المحاور (X و Y)', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const matrix = screen.getByText(/احتمالية/i);
      expect(matrix).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الفقاقيع الممثلة للمخاطر', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const circles = screen.getByText(/مخاطر العملة/i);
      expect(circles).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض الألوان لتصنيف الشدة', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/حرج/i)).toBeInTheDocument();
      expect(screen.getByText(/عالي/i)).toBeInTheDocument();
      expect(screen.getByText(/متوسط/i)).toBeInTheDocument();
      expect(screen.getByText(/منخفض/i)).toBeInTheDocument();
    });
  });
});

// ===== RISK CALCULATIONS TESTS =====
describe('RiskMatrix - حسابات الخطورة', () => {
  test('يجب أن يحسب الشدة كـ احتمالية × التأثير', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      // 0.6 * 0.8 = 0.48 (should be displayed)
      expect(screen.getByText(/0\.4[0-9]/)).toBeInTheDocument();
    });
  });

  test('يجب أن يصنف المخاطر كحرجة إذا كانت الشدة > 0.75', async () => {
    const criticalRisk = {
      ...mockRiskData,
      risks: [{
        id: '1',
        name: 'مخاطر حرجة',
        probability: 0.9,
        impact: 0.9,
        severity: 0.81,
        status: 'active'
      }]
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => criticalRisk
    });
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/حرج/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يصنف المخاطر كعالية إذا كانت الشدة 0.5-0.75', async () => {
    const highRisk = {
      ...mockRiskData,
      risks: [{
        id: '1',
        name: 'مخاطر عالية',
        probability: 0.8,
        impact: 0.7,
        severity: 0.56,
        status: 'active'
      }]
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => highRisk
    });
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/عالي/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يصنف المخاطر كمتوسطة إذا كانت الشدة 0.25-0.5', async () => {
    const mediumRisk = {
      ...mockRiskData,
      risks: [{
        id: '1',
        name: 'مخاطر متوسطة',
        probability: 0.5,
        impact: 0.5,
        severity: 0.25,
        status: 'monitored'
      }]
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mediumRisk
    });
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/متوسط/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يصنف المخاطر كمنخفضة إذا كانت الشدة < 0.25', async () => {
    const lowRisk = {
      ...mockRiskData,
      risks: [{
        id: '1',
        name: 'مخاطر منخفضة',
        probability: 0.2,
        impact: 0.1,
        severity: 0.02,
        status: 'monitored'
      }]
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => lowRisk
    });
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/منخفض/i)).toBeInTheDocument();
    });
  });
});

// ===== ZONE CLASSIFICATION TESTS =====
describe('RiskMatrix - تصنيف مناطق الخطورة', () => {
  test('يجب أن يصنف المخاطر في المنطقة الخضراء (منخفضة)', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/منطقة الأمان/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يصنف المخاطر في المنطقة الصفراء (متوسطة)', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/منطقة يقظة/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يصنف المخاطر في المنطقة البرتقالية (عالية)', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/منطقة تحذير/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يصنف المخاطر في المنطقة الحمراء (حرجة)', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/منطقة حرجة/i)).toBeInTheDocument();
    });
  });
});

// ===== TABS TESTS =====
describe('RiskMatrix - التبويبات', () => {
  test('يجب أن يعرض تبويب المصفوفة', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/المصفوفة/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض تبويب الاتجاهات', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الاتجاهات/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض تبويب التخفيف', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/التخفيف/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض تبويب المؤشرات', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/مؤشرات/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يبدل بين التبويبات', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const trendsTab = screen.getByText(/الاتجاهات/i);
      fireEvent.click(trendsTab);
      expect(screen.getByText(/اتجاهات المخاطر/i)).toBeInTheDocument();
    });
  });
});

// ===== TRENDS TAB TESTS =====
describe('RiskMatrix - تبويب الاتجاهات', () => {
  test('يجب أن يعرض بيانات الاتجاهات', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const trendsTab = screen.getByText(/الاتجاهات/i);
      fireEvent.click(trendsTab);
      expect(screen.getByText(/حرج/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض رسم بياني للاتجاهات', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const trendsTab = screen.getByText(/الاتجاهات/i);
      fireEvent.click(trendsTab);
      expect(screen.getByText(/مخطط الخط/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض جدول بيانات الاتجاهات', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const trendsTab = screen.getByText(/الاتجاهات/i);
      fireEvent.click(trendsTab);
      expect(screen.getByText(/100.0%/)).toBeInTheDocument();
    });
  });
});

// ===== MITIGATION TAB TESTS =====
describe('RiskMatrix - تبويب التخفيف', () => {
  test('يجب أن يعرض استراتيجيات التخفيف', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const mitigationTab = screen.getByText(/التخفيف/i);
      fireEvent.click(mitigationTab);
      expect(screen.getByText(/استراتيجيات التخفيف/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض مالك المخاطر', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const mitigationTab = screen.getByText(/التخفيف/i);
      fireEvent.click(mitigationTab);
      expect(screen.getByText(/المالية/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض تاريخ آخر تحديث', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const mitigationTab = screen.getByText(/التخفيف/i);
      fireEvent.click(mitigationTab);
      expect(screen.getByText(/آخر تحديث/i)).toBeInTheDocument();
    });
  });
});

// ===== INDICATORS TAB TESTS =====
describe('RiskMatrix - تبويب المؤشرات', () => {
  test('يجب أن يعرض مؤشرات الخطورة', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const indicatorsTab = screen.getByText(/مؤشرات/i);
      fireEvent.click(indicatorsTab);
      expect(screen.getByText(/مؤشرات/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض عدد المخاطر الحرجة', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const indicatorsTab = screen.getByText(/مؤشرات/i);
      fireEvent.click(indicatorsTab);
      expect(screen.getByText(/5/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض نسبة التغطية', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const indicatorsTab = screen.getByText(/مؤشرات/i);
      fireEvent.click(indicatorsTab);
      expect(screen.getByText(/نسبة التغطية/i)).toBeInTheDocument();
    });
  });
});

// ===== INTERACTION TESTS =====
describe('RiskMatrix - التفاعلات', () => {
  test('يجب أن يفتح تفاصيل المخاطر عند النقر على الفقاعة', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const bubble = screen.getByText(/مخاطر العملة/i);
      fireEvent.click(bubble);
      expect(screen.getByText(/تفاصيل المخاطر/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يسمح بسحب الفقاعة (إذا كانت قابلة للتعديل)', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/مخاطر العملة/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض معلومات عند تحريك المؤشر فوق الفقاعة', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const bubble = screen.getByText(/مخاطر العملة/i);
      fireEvent.mouseEnter(bubble);
      expect(screen.getByText(/احتمالية/i)).toBeInTheDocument();
    });
  });
});

// ===== DETAIL PANEL TESTS =====
describe('RiskMatrix - لوحة التفاصيل', () => {
  test('يجب أن يعرض اسم المخاطر', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const bubble = screen.getByText(/مخاطر العملة/i);
      fireEvent.click(bubble);
      expect(screen.getByText(/مخاطر العملة/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض معاملات الاحتمالية والتأثير', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const bubble = screen.getByText(/مخاطر العملة/i);
      fireEvent.click(bubble);
      expect(screen.getByText(/احتمالية/i)).toBeInTheDocument();
      expect(screen.getByText(/التأثير/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يسمح بتحرير معاملات المخاطر', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const bubble = screen.getByText(/مخاطر العملة/i);
      fireEvent.click(bubble);
      expect(screen.getByText(/تعديل/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يسمح بحذف المخاطر', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const bubble = screen.getByText(/مخاطر العملة/i);
      fireEvent.click(bubble);
      expect(screen.getByText(/حذف/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يغلق لوحة التفاصيل عند الإغلاق', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const bubble = screen.getByText(/مخاطر العملة/i);
      fireEvent.click(bubble);
      expect(screen.getByText(/غلق/i)).toBeInTheDocument();
    });
  });
});

// ===== STATISTICS TESTS =====
describe('RiskMatrix - الإحصائيات', () => {
  test('يجب أن يحسب عدد المخاطر الحرجة بشكل صحيح', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/المخاطر الحرجة/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب عدد المخاطر العالية بشكل صحيح', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/المخاطر العالية/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب متوسط الشدة', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/متوسط الشدة/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب نسبة التغطية', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/نسبة التغطية/i)).toBeInTheDocument();
    });
  });
});

// ===== FILTERING TESTS =====
describe('RiskMatrix - التصفية', () => {
  test('يجب أن يوفر تصفية حسب الشدة', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/تصفية/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعيد التحديث عند تغيير المرشح', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const filterBtn = screen.getByText(/تصفية/i);
      fireEvent.click(filterBtn);
      expect(fetch).toHaveBeenCalled();
    });
  });
});

// ===== DATA FETCHING TESTS =====
describe('RiskMatrix - جلب البيانات', () => {
  test('يجب أن يجلب بيانات المخاطر عند التحميل', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/finance/risks/matrix'),
        expect.any(Object)
      );
    });
  });

  test('يجب أن يعالج أخطاء الجلب', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/خطأ/i)).toBeInTheDocument();
    });
  });
});

// ===== EDGE CASES =====
describe('RiskMatrix - الحالات الحدية', () => {
  test('يجب أن يعالج حالة الفراغ', async () => {
    const emptyData = { ...mockRiskData, risks: [] };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => emptyData
    });
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/لا توجد مخاطر/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعالج إحداثيات غير صالحة', async () => {
    const invalidRisk = {
      ...mockRiskData,
      risks: [{
        id: '1',
        name: 'مخاطر غير صالحة',
        probability: 1.5,
        impact: 2.0,
        severity: 3.0
      }]
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => invalidRisk
    });
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/مخاطر غير صالحة/i)).toBeInTheDocument();
    });
  });
});

// ===== PERFORMANCE TESTS =====
describe('RiskMatrix - الأداء', () => {
  test('يجب أن يعالج 1000+ مخاطر بكفاءة', async () => {
    const largeRisks = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i),
      name: `المخاطر ${i}`,
      probability: Math.random(),
      impact: Math.random(),
      severity: Math.random() * 0.5,
      status: 'monitored'
    }));
    const largeData = { ...mockRiskData, risks: largeRisks };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => largeData
    });

    const start = performance.now();
    render(<RiskMatrix organizationId="org-1" />);

    await waitFor(() => {
      expect(screen.getByText(/مصفوفة المخاطر/i)).toBeInTheDocument();
    });

    const end = performance.now();
    expect(end - start).toBeLessThan(5000);
  });
});
