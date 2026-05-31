/**
 * Render smoke test for pages/CDSS/CDSSDashboard.jsx.
 *
 * Why: the dashboard service layer is unit-tested (services-cdssService-adapters),
 * but the live "حدث خطأ غير متوقع" boundary is a RENDER error — the one thing a
 * static read can't rule out under MUI v9 / recharts v3 / framer-motion v12. This
 * test executes the full render path (loading → data → all six tabs mounted) and
 * asserts the page reaches its header without throwing, for BOTH a populated
 * response and the empty-instance case (prod DB currently has zero CDSS rows, so
 * empty-but-rendered is the real production state — it must not crash).
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// jsdom lacks the browser APIs the dashboard's KPI counter (IntersectionObserver)
// and recharts ResponsiveContainer (ResizeObserver) touch on mount.
beforeAll(() => {
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  global.IntersectionObserver = NoopObserver;
  global.ResizeObserver = NoopObserver;
  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
});

// Keep the real constants (ALERT_SEVERITIES / RULE_CATEGORIES the component reads),
// override only the data-fetching functions so no network is touched.
const mockData = {
  stats: null,
  alerts: [],
  rules: [],
  suggestions: [],
  drugs: [],
  decisionLog: [],
  riskAssessments: [],
  diagnoses: [],
};

jest.mock('services/cdssService', () => {
  const actual = jest.requireActual('services/cdssService');
  return {
    __esModule: true,
    ...actual,
    getStats: jest.fn(() => Promise.resolve(mockData.stats)),
    getAlerts: jest.fn(() => Promise.resolve(mockData.alerts)),
    getRules: jest.fn(() => Promise.resolve(mockData.rules)),
    getRehabSuggestions: jest.fn(() => Promise.resolve(mockData.suggestions)),
    getDrugLibrary: jest.fn(() => Promise.resolve(mockData.drugs)),
    getDecisionLog: jest.fn(() => Promise.resolve(mockData.decisionLog)),
    getRiskAssessments: jest.fn(() => Promise.resolve(mockData.riskAssessments)),
    getDifferentialDiagnoses: jest.fn(() => Promise.resolve(mockData.diagnoses)),
  };
});

import CDSSDashboard from 'pages/CDSS/CDSSDashboard';

const POPULATED = {
  stats: {
    activeAlerts: 23,
    criticalAlerts: 4,
    pendingSuggestions: 11,
    rulesActive: 58,
    rulesTriggeredToday: 9,
    trend: { alerts: [18, 22, 15, 28, 23, 19, 23], riskScores: [38, 41, 45, 39, 44, 40, 42] },
  },
  alerts: [
    {
      _id: 'a1',
      severity: 'critical',
      type: 'drug_interaction',
      message: 'تفاعل دوائي خطير',
      beneficiaryName: 'أحمد العتيبي',
      beneficiaryId: 'b1',
      triggeredAt: new Date().toISOString(),
      status: 'active',
      ruleCode: 'DR-INT-001',
    },
  ],
  rules: [
    {
      _id: 'r1',
      code: 'DR-INT-001',
      name: 'تفاعل دوائي',
      category: 'medication',
      severity: 'critical',
      condition: 'a AND b',
      action: 'إشعار فوري',
      isActive: true,
      triggerCount: 3,
      evidenceLevel: 'A',
    },
  ],
  suggestions: [
    {
      _id: 's1',
      beneficiaryName: 'فاطمة الشهري',
      beneficiaryId: 'b2',
      diagnosis: 'إصابة نخاع شوكي',
      suggestedPlan: {
        sessions: 3,
        frequency: 'أسبوعياً',
        modalities: ['تدريب القوة'],
        goals: ['تحسين الحركة'],
        duration: '8 أسابيع',
        evidenceBased: true,
        referencedGuideline: 'SCIRE 2024',
      },
      confidenceScore: 88,
      status: 'pending',
    },
  ],
  drugs: [
    {
      _id: 'd1',
      code: 'BACLO',
      name: 'باكلوفين',
      category: 'مرخيات العضلات',
      interactions: ['بنزوديازيبين'],
      contraindications: ['فشل كلوي'],
      highRisk: true,
    },
  ],
  decisionLog: [
    {
      _id: 'l1',
      action: 'override',
      alertCode: 'SESS-ABS-002',
      clinician: 'د. هاني',
      reason: 'إجازة طارئة',
      timestamp: new Date().toISOString(),
    },
  ],
  riskAssessments: [
    {
      _id: 'ra1',
      beneficiaryId: 'b1',
      beneficiaryName: 'أحمد',
      assessmentType: 'fall_risk',
      toolUsed: 'Morse Scale',
      overallScore: 78,
      riskLevel: 'very_high',
      domains: [{ domain: 'سلامة الدواء', score: 92, flag: true }],
      recommendedInterventions: ['مراقبة مكثفة'],
      generatedBy: 'AI-Auto',
      mlAssisted: true,
      mlConfidenceScore: 0.82,
      generatedAt: new Date().toISOString(),
    },
  ],
  diagnoses: [
    {
      _id: 'dd1',
      beneficiaryId: 'b2',
      beneficiaryName: 'نورة',
      symptoms: ['ضعف عضلي'],
      clinicalFindings: ['رنح'],
      candidates: [{ icdCode: 'G35', name: 'التصلب المتعدد', probability: 62, reasoning: 'نمط الأعراض' }],
      investigations: ['رنين مغناطيسي'],
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  ],
};

const EMPTY = {
  stats: { activeAlerts: 0, criticalAlerts: 0, pendingSuggestions: 0, rulesActive: 0 },
  alerts: [],
  rules: [],
  suggestions: [],
  drugs: [],
  decisionLog: [],
  riskAssessments: [],
  diagnoses: [],
};

afterEach(() => {
  Object.assign(mockData, {
    stats: null,
    alerts: [],
    rules: [],
    suggestions: [],
    drugs: [],
    decisionLog: [],
    riskAssessments: [],
    diagnoses: [],
  });
});

describe('CDSSDashboard renders without throwing', () => {
  test('populated backend data → header + critical banner render', async () => {
    Object.assign(mockData, POPULATED);
    render(<CDSSDashboard />);
    // Reaching the header proves it got past loading and rendered the full tree.
    expect(await screen.findByText('نظام دعم القرار السريري')).toBeTruthy();
    // critical-alert banner (stats.criticalAlerts > 0) renders without crashing
    await waitFor(() => expect(screen.getByText(/تنبيه حرج يستوجب/)).toBeTruthy());
  });

  test('empty instance (prod state: zero CDSS rows) → still renders, no crash', async () => {
    Object.assign(mockData, EMPTY);
    render(<CDSSDashboard />);
    expect(await screen.findByText('نظام دعم القرار السريري')).toBeTruthy();
    // overview tab panels render (KPIs + severity breakdown), not an error boundary
    expect(await screen.findByText('توزيع التنبيهات')).toBeTruthy();
  });

  test('Risk Assessments tab renders the new surface', async () => {
    Object.assign(mockData, POPULATED);
    render(<CDSSDashboard />);
    await screen.findByText('نظام دعم القرار السريري');
    fireEvent.click(screen.getByText('تقييمات المخاطر'));
    // the auto-generate tool + a risk card both prove the new tab mounted
    expect(await screen.findByText('توليد تقييم مخاطر آلي')).toBeTruthy();
    expect(await screen.findByText('مراقبة مكثفة')).toBeTruthy();
  });

  test('Differential Diagnoses tab renders the new surface', async () => {
    Object.assign(mockData, POPULATED);
    render(<CDSSDashboard />);
    await screen.findByText('نظام دعم القرار السريري');
    fireEvent.click(screen.getByText('التشخيصات التفريقية'));
    expect(await screen.findByText('التصلب المتعدد')).toBeTruthy();
    expect(await screen.findByText('G35')).toBeTruthy();
  });
});
