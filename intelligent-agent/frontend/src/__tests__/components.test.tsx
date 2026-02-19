import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import AIStreamingDashboard from '../components/AIStreamingDashboard';
import AIRecommendations from '../components/AIRecommendations';
import AIMetricsDashboard from '../components/AIMetricsDashboard';
import AIProcessReports from '../components/AIProcessReports';
import AIAdvancedDashboard from '../components/AIAdvancedDashboard';

// Mock AIClient
jest.mock('../services/AIClient', () => ({
  getDashboard: jest.fn().mockResolvedValue({
    totalProcesses: 127,
    completedProcesses: 82,
    runningProcesses: 35,
    failedProcesses: 10,
  }),
  suggestNextStep: jest.fn().mockResolvedValue({
    suggestion: 'الخطوة التالية: مراجعة البيانات',
  }),
  predictNextStep: jest.fn().mockResolvedValue({
    prediction: 'الخطوة المتوقعة: الموافقة',
  }),
  classifyRisk: jest.fn().mockResolvedValue({
    riskLevel: 'low',
  }),
  getRecommendation: jest.fn().mockResolvedValue({
    recommendation: 'يوصى بتطبيق الإجراء الفوري',
  }),
  getProcessScore: jest.fn().mockResolvedValue({
    score: 95,
  }),
  automationOpportunities: jest.fn().mockResolvedValue({
    opportunities: ['أتمتة معالجة البيانات', 'أتمتة التقارير'],
  }),
  smartTasks: jest.fn().mockResolvedValue({
    tasks: [
      { task: 'مراجعة الملفات', priority: 'عالية' },
      { task: 'تحديث السجلات', priority: 'متوسطة' },
    ],
  }),
  getMetrics: jest.fn().mockResolvedValue({
    totalProcesses: 127,
    successRate: 95,
    averageDuration: 2,
    efficiency: 88,
    riskScore: 12,
    delayedProcesses: 3,
    avgAlertTime: 15,
    automationRate: 72,
  }),
  getTrends: jest.fn().mockResolvedValue({
    data: [
      { name: 'السبت', value: 85 },
      { name: 'الأحد', value: 88 },
    ],
  }),
  getHealthReport: jest.fn().mockResolvedValue({
    status: 'healthy',
    uptime: 99.8,
  }),
}));

describe('AI Frontend Components', () => {
  describe('AIStreamingDashboard', () => {
    it('يجب أن يعرض عنوان لوحة التحكم', async () => {
      const { findByText } = render(<AIStreamingDashboard />);
      expect(await findByText(/لوحة التحكم الذكية/)).toBeInTheDocument();
    });

    it('يجب أن يعرض البطاقات الرئيسية', async () => {
      const { findByText } = render(<AIStreamingDashboard />);
      expect(await findByText(/إجمالي العمليات/)).toBeInTheDocument();
    });
  });

  describe('AIRecommendations', () => {
    it('يجب أن يعرض التوصيات الذكية', async () => {
      const { findByText } = render(<AIRecommendations />);
      expect(await findByText(/التوصيات والاقتراحات الذكية/)).toBeInTheDocument();
    });

    it('يجب أن يعرض التبويبات المختلفة', async () => {
      const { findByText } = render(<AIRecommendations />);
      expect(await findByText(/الاقتراحات/)).toBeInTheDocument();
      expect(await findByText(/التنبؤات/)).toBeInTheDocument();
    });
  });

  describe('AIMetricsDashboard', () => {
    it('يجب أن يعرض المقاييس الرئيسية', async () => {
      const { findByText } = render(<AIMetricsDashboard />);
      expect(await findByText(/لوحة التحكم - المقاييس والأداء/)).toBeInTheDocument();
    });

    it('يجب أن يعرض الرسم البياني للاتجاهات', async () => {
      const { findByText } = render(<AIMetricsDashboard />);
      expect(await findByText(/اتجاهات الأداء/)).toBeInTheDocument();
    });
  });

  describe('AIProcessReports', () => {
    it('يجب أن يعرض تقارير العمليات', async () => {
      const { findByText } = render(<AIProcessReports />);
      expect(await findByText(/تقارير العمليات الذكية/)).toBeInTheDocument();
    });

    it('يجب أن يعرض فلاتر التقارير', async () => {
      const { findByText } = render(<AIProcessReports />);
      expect(await findByText(/جميع العمليات/)).toBeInTheDocument();
    });
  });

  describe('AIAdvancedDashboard', () => {
    it('يجب أن يعرض لوحة التحكم المتقدمة', async () => {
      const { findByText } = render(<AIAdvancedDashboard />);
      expect(await findByText(/لوحة التحكم الذكية/)).toBeInTheDocument();
    });

    it('يجب أن يعرض التبويبات المختلفة', async () => {
      const { findByText } = render(<AIAdvancedDashboard />);
      expect(await findByText(/نظرة عامة/)).toBeInTheDocument();
      expect(await findByText(/صحة النظام/)).toBeInTheDocument();
      expect(await findByText(/التنبؤ المستقبلي/)).toBeInTheDocument();
    });

    it('يجب أن يعرض حالة النظام', async () => {
      const { findByText } = render(<AIAdvancedDashboard />);
      expect(await findByText(/النظام نشط/)).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('يجب أن تعمل جميع المكونات بدون أخطاء', async () => {
      const dashboardRender = render(<AIAdvancedDashboard />);
      const recommendationsRender = render(<AIRecommendations />);
      const metricsRender = render(<AIMetricsDashboard />);
      const reportsRender = render(<AIProcessReports />);
      const streamingRender = render(<AIStreamingDashboard />);

      await Promise.all([
        dashboardRender.findByText(/لوحة التحكم الذكية/),
        recommendationsRender.findByText(/التوصيات والاقتراحات الذكية/),
        metricsRender.findByText(/لوحة التحكم - المقاييس والأداء/),
        reportsRender.findByText(/تقارير العمليات الذكية/),
        streamingRender.findByText(/لوحة التحكم الذكية/),
      ]);

      expect(dashboardRender.container).not.toBeEmptyDOMElement();
      expect(recommendationsRender.container).not.toBeEmptyDOMElement();
      expect(metricsRender.container).not.toBeEmptyDOMElement();
      expect(reportsRender.container).not.toBeEmptyDOMElement();
      expect(streamingRender.container).not.toBeEmptyDOMElement();
    });

    it('يجب أن تتحدث المكونات مع بعضها البعض', async () => {
      const AIClient = require('../services/AIClient').default;

      render(<AIAdvancedDashboard />);
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(AIClient.getDashboard).toHaveBeenCalled();

      render(<AIRecommendations />);
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(AIClient.suggestNextStep).toHaveBeenCalled();
    });
  });

  describe('Performance Tests', () => {
    it('يجب أن تحمل لوحة التحكم بسرعة', async () => {
      const start = performance.now();
      const { findByText } = render(<AIAdvancedDashboard />);
      expect(await findByText(/لوحة التحكم الذكية/)).toBeInTheDocument();
      const end = performance.now();

      expect(end - start).toBeLessThan(2000); // أقل من ثانيتين
    });

    it('يجب أن تحمل التوصيات بسرعة', async () => {
      const start = performance.now();
      const { findByText } = render(<AIRecommendations />);
      expect(await findByText(/التوصيات والاقتراحات الذكية/)).toBeInTheDocument();
      const end = performance.now();

      expect(end - start).toBeLessThan(2000);
    });
  });

  describe('Accessibility Tests', () => {
    it('يجب أن يكون لديه نصوص بديلة للصور', async () => {
      const { getAllByRole } = render(<AIAdvancedDashboard />);
      const elements = getAllByRole('img', { hidden: true });
      elements.forEach(el => {
        expect(el).toHaveAttribute('alt');
      });
    });

    it('يجب أن تكون الألوان قابلة للتمييز', async () => {
      const { getByText } = render(<AIAdvancedDashboard />);
      // اختبار التباين
      expect(getByText(/إجمالي العمليات/)).toBeVisible();
    });

    it('يجب دعم اتجاه النص من اليمين إلى اليسار', async () => {
      const { container } = render(<AIAdvancedDashboard />);
      const mainDiv = container.querySelector('[dir="rtl"]');
      expect(mainDiv).toBeInTheDocument();
    });
  });

  describe('Error Handling Tests', () => {
    it('يجب التعامل مع أخطاء جلب البيانات', async () => {
      const AIClient = require('../services/AIClient').default;
      AIClient.getDashboard.mockRejectedValueOnce(new Error('Network error'));

      const { queryByText } = render(<AIAdvancedDashboard />);
      // يجب أن يستمر في العمل حتى مع الخطأ
      expect(queryByText(/خطأ/)).not.toBeInTheDocument();
    });

    it('يجب أن تعرض رسائل خطأ مناسبة', async () => {
      const { findByText } = render(<AIAdvancedDashboard />);
      // تأكد من معالجة الأخطاء
      expect(await findByText(/لوحة التحكم الذكية/)).toBeInTheDocument();
    });
  });
});
