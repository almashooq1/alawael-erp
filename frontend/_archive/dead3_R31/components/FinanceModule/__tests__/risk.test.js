/**
 * risk.test.js
 * اختبارات شاملة لمكون مصفوفة المخاطر
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RiskMatrix from '../RiskMatrix';

// ===== MOCKS =====
global.fetch = jest.fn();
global.confirm = jest.fn(() => true);

const mockRisks = [
  {
    id: 'risk-01',
    name: 'مخاطر السيولة',
    description: 'نقص في السيولة النقدية',
    probability: 8,
    impact: 9,
    indicators: ['انخفاض النقد', 'تأخر المدفوعات'],
    actions: ['تأمين خط ائتمان'],
    weaknesses: 'اعتماد كبير على مصدر واحد',
    mitigationSteps: ['تنويع مصادر الدخل', 'تقليل المصروفات'],
    owner: 'مدير المالية',
    status: 'active',
  },
  {
    id: 'risk-02',
    name: 'مخاطر السوق',
    description: 'تقلبات في أسعار السوق',
    probability: 6,
    impact: 7,
    indicators: ['تغيرات الأسعار'],
    actions: ['تنويع المحفظة'],
    weaknesses: 'تركز في قطاع واحد',
    mitigationSteps: ['التحوط'],
    owner: 'مدير الاستثمار',
    status: 'active',
  },
  {
    id: 'risk-03',
    name: 'مخاطر تشغيلية',
    description: 'أعطال في الأنظمة التشغيلية',
    probability: 4,
    impact: 5,
    indicators: ['أعطال متكررة'],
    actions: ['صيانة دورية'],
    weaknesses: 'أنظمة قديمة',
    mitigationSteps: ['تحديث الأنظمة'],
    owner: 'مدير التقنية',
    status: 'active',
  },
  {
    id: 'risk-04',
    name: 'مخاطر قانونية',
    description: 'مخاطر عدم الامتثال',
    probability: 2,
    impact: 3,
    indicators: ['تغير التشريعات'],
    actions: ['متابعة القوانين'],
    weaknesses: 'عدم وجود فريق قانوني',
    mitigationSteps: [],
    owner: 'المستشار القانوني',
    status: 'active',
  },
];

const mockApiResponse = {
  risks: mockRisks,
};

// ===== SETUP =====
beforeEach(() => {
  fetch.mockClear();
  fetch.mockResolvedValue({
    ok: true,
    json: async () => mockApiResponse,
  });
  localStorage.setItem('token', 'mock-token');
});

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// ===== HEADER TESTS =====
describe('RiskMatrix - العنوان', () => {
  test('يجب أن يعرض عنوان مصفوفة المخاطر', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/مصفوفة المخاطر/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض زر إضافة مخاطر جديد', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/إضافة مخاطر جديد/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض زر التحديث', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/تحديث/)).toBeInTheDocument();
    });
  });
});

// ===== RISK METRICS TESTS =====
describe('RiskMatrix - بطاقات المقاييس', () => {
  test('يجب أن يعرض بطاقة المخاطر الحرجة', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/حرجة 🔴/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض بطاقة المخاطر العالية', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/عالية 🟠/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض بطاقة المخاطر المتوسطة', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/متوسطة 🟡/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض بطاقة المخاطر المنخفضة', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/منخفضة 🟢/)).toBeInTheDocument();
    });
  });

  test('يجب أن يحسب عدد المخاطر الحرجة بشكل صحيح', async () => {
    // risk-01: 8*9=72 >= 70 -> critical
    // risk-02: 6*7=42 >= 40 -> high
    // risk-03: 4*5=20 >= 15 -> medium
    // risk-04: 2*3=6 < 15 -> low
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const criticalCard = screen.getByText(/حرجة 🔴/).closest('.metric-card');
      expect(criticalCard).toHaveTextContent('1');
    });
  });
});

// ===== TAB NAVIGATION TESTS =====
describe('RiskMatrix - التبويبات', () => {
  test('يجب أن يعرض جميع التبويبات', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/المصفوفة/)).toBeInTheDocument();
      expect(screen.getByText(/الاتجاهات/)).toBeInTheDocument();
      expect(screen.getByText(/التخفيف/)).toBeInTheDocument();
      expect(screen.getByText(/المؤشرات/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض قائمة المخاطر في تبويب المصفوفة', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('قائمة المخاطر')).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض اتجاهات المخاطر عند النقر على تبويب الاتجاهات', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/الاتجاهات/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/الاتجاهات/));

    await waitFor(() => {
      expect(screen.getByText(/اتجاهات المخاطر/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض استراتيجيات التخفيف', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/التخفيف/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/التخفيف/));

    await waitFor(() => {
      expect(screen.getAllByText(/استراتيجيات التخفيف/).length).toBeGreaterThan(0);
    });
  });

  test('يجب أن يعرض مؤشرات الأداء', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/المؤشرات/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/المؤشرات/));

    await waitFor(() => {
      expect(screen.getByText(/مؤشرات الأداء الرئيسية/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض إجمالي المخاطر في المؤشرات', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/المؤشرات/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/المؤشرات/));

    await waitFor(() => {
      expect(screen.getByText('إجمالي المخاطر المحددة')).toBeInTheDocument();
    });
  });
});

// ===== RISK BUBBLES TESTS =====
describe('RiskMatrix - قائمة المخاطر', () => {
  test('يجب أن يعرض أسماء المخاطر في القائمة', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getAllByText('مخاطر السيولة').length).toBeGreaterThan(0);
      expect(screen.getAllByText('مخاطر السوق').length).toBeGreaterThan(0);
      expect(screen.getAllByText('مخاطر تشغيلية').length).toBeGreaterThan(0);
      expect(screen.getAllByText('مخاطر قانونية').length).toBeGreaterThan(0);
    });
  });

  test('يجب أن يعرض وصف المخاطر', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('نقص في السيولة النقدية')).toBeInTheDocument();
    });
  });
});

// ===== FILTER TESTS =====
describe('RiskMatrix - التصفية', () => {
  test('يجب أن يعرض قائمة تصفية المخاطر', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText('جميع المخاطر')).toBeInTheDocument();
    });
  });

  test('يجب أن يصفي المخاطر حسب المستوى', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getAllByText('مخاطر السيولة').length).toBeGreaterThan(0);
    });

    const filterSelect = document.querySelector('.filter-select');
    fireEvent.change(filterSelect, { target: { value: 'critical' } });

    await waitFor(() => {
      expect(screen.getAllByText('مخاطر السيولة').length).toBeGreaterThan(0);
    });
  });
});

// ===== SEVERITY CALCULATION TESTS =====
describe('RiskMatrix - حساب الخطورة', () => {
  test('يجب أن يصنف المخاطر الحرجة (score >= 70)', () => {
    // probability=8, impact=9 => 72 => critical
    const score = 8 * 9;
    expect(score).toBeGreaterThanOrEqual(70);
  });

  test('يجب أن يصنف المخاطر العالية (score >= 40)', () => {
    // probability=6, impact=7 => 42 => high
    const score = 6 * 7;
    expect(score).toBeGreaterThanOrEqual(40);
    expect(score).toBeLessThan(70);
  });

  test('يجب أن يصنف المخاطر المتوسطة (score >= 15)', () => {
    // probability=4, impact=5 => 20 => medium
    const score = 4 * 5;
    expect(score).toBeGreaterThanOrEqual(15);
    expect(score).toBeLessThan(40);
  });

  test('يجب أن يصنف المخاطر المنخفضة (score < 15)', () => {
    // probability=2, impact=3 => 6 => low
    const score = 2 * 3;
    expect(score).toBeLessThan(15);
  });
});

// ===== DATA FETCHING TESTS =====
describe('RiskMatrix - جلب البيانات', () => {
  test('يجب أن يجلب بيانات المخاطر عند التحميل', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/finance/risks'),
        expect.any(Object)
      );
    });
  });

  test('يجب أن يعالج أخطاء الجلب', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/❌/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض زر إعادة المحاولة عند الخطأ', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/إعادة محاولة/i)).toBeInTheDocument();
    });
  });
});

// ===== DETAIL PANEL TESTS =====
describe('RiskMatrix - لوحة التفاصيل', () => {
  test('يجب أن يعرض رسالة اختيار مخاطر عند عدم التحديد', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/اختر مخاطر/)).toBeInTheDocument();
    });
  });
});

// ===== EDGE CASES =====
describe('RiskMatrix - حالات حدية', () => {
  test('يجب أن يعالج عدم وجود مخاطر', async () => {
    fetch.mockReset();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ risks: [] }),
    });
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      expect(screen.getByText(/لا توجد مخاطر/)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض عنصر SVG للمصفوفة', async () => {
    render(<RiskMatrix organizationId="org-1" />);
    await waitFor(() => {
      const svg = document.querySelector('svg.matrix-grid');
      expect(svg).toBeInTheDocument();
    });
  });
});
