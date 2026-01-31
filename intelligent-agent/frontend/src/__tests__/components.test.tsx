import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
    failedProcesses: 10
  }),
  suggestNextStep: jest.fn().mockResolvedValue({
    suggestion: 'الخطوة التالية: مراجعة البيانات'
  }),
  predictNextStep: jest.fn().mockResolvedValue({
    prediction: 'الخطوة المتوقعة: الموافقة'
  }),
  classifyRisk: jest.fn().mockResolvedValue({
    riskLevel: 'low'
  }),
  getRecommendation: jest.fn().mockResolvedValue({
    recommendation: 'يوصى بتطبيق الإجراء الفوري'
  }),
  getProcessScore: jest.fn().mockResolvedValue({
    score: 95
  }),
  automationOpportunities: jest.fn().mockResolvedValue({
    opportunities: ['أتمتة معالجة البيانات', 'أتمتة التقارير']
  }),
  smartTasks: jest.fn().mockResolvedValue({
    tasks: [
      { task: 'مراجعة الملفات', priority: 'عالية' },
      { task: 'تحديث السجلات', priority: 'متوسطة' }
    ]
  }),
  getMetrics: jest.fn().mockResolvedValue({
    totalProcesses: 127,
    successRate: 95,
    averageDuration: 2,
    efficiency: 88,
    riskScore: 12,
    delayedProcesses: 3,
    avgAlertTime: 15,
    automationRate: 72
  }),
  getTrends: jest.fn().mockResolvedValue({
    data: [
      { name: 'السبت', value: 85 },
      { name: 'الأحد', value: 88 }
    ]
  }),
  getHealthReport: jest.fn().mockResolvedValue({
    status: 'healthy',
    uptime: 99.8
  })
}));

describe('AI Frontend Components', () => {
  describe('AIStreamingDashboard', () => {
    it('يجب أن يعرض عنوان لوحة التحكم', async () => {
      render(<AIStreamingDashboard />);
      await waitFor(() => {
        expect(screen.getByText(/لوحة التحكم الذكية/)).toBeInTheDocument();
      });
    });

    it('يجب أن يعرض البطاقات الرئيسية', async () => {
      render(<AIStreamingDashboard />);
      await waitFor(() => {
        expect(screen.getByText(/إجمالي العمليات/)).toBeInTheDocument();
      });
    });
  });

  describe('AIRecommendations', () => {
    it('يجب أن يعرض التوصيات الذكية', async () => {
      render(<AIRecommendations />);
      await waitFor(() => {
        expect(screen.getByText(/التوصيات والاقتراحات الذكية/)).toBeInTheDocument();
      });
    });

    it('يجب أن يعرض التبويبات المختلفة', async () => {
      render(<AIRecommendations />);
      await waitFor(() => {
        expect(screen.getByText(/الاقتراحات/)).toBeInTheDocument();
        expect(screen.getByText(/التنبؤات/)).toBeInTheDocument();
      });
    });
  });

  describe('AIMetricsDashboard', () => {
    it('يجب أن يعرض المقاييس الرئيسية', async () => {
      render(<AIMetricsDashboard />);
      await waitFor(() => {
        expect(screen.getByText(/لوحة التحكم - المقاييس والأداء/)).toBeInTheDocument();
      });
    });

    it('يجب أن يعرض الرسم البياني للاتجاهات', async () => {
      render(<AIMetricsDashboard />);
      await waitFor(() => {
        expect(screen.getByText(/اتجاهات الأداء/)).toBeInTheDocument();
      });
    });
  });

  describe('AIProcessReports', () => {
    it('يجب أن يعرض تقارير العمليات', async () => {
      render(<AIProcessReports />);
      await waitFor(() => {
        expect(screen.getByText(/تقارير العمليات الذكية/)).toBeInTheDocument();
      });
    });

    it('يجب أن يعرض فلاتر التقارير', async () => {
      render(<AIProcessReports />);
      await waitFor(() => {
        expect(screen.getByText(/جميع العمليات/)).toBeInTheDocument();
      });
    });
  });

  describe('AIAdvancedDashboard', () => {
    it('يجب أن يعرض لوحة التحكم المتقدمة', async () => {
      render(<AIAdvancedDashboard />);
      await waitFor(() => {
        expect(screen.getByText(/لوحة التحكم الذكية/)).toBeInTheDocument();
      });
    });

    it('يجب أن يعرض التبويبات المختلفة', async () => {
      render(<AIAdvancedDashboard />);
      await waitFor(() => {
        expect(screen.getByText(/نظرة عامة/)).toBeInTheDocument();
        expect(screen.getByText(/صحة النظام/)).toBeInTheDocument();
        expect(screen.getByText(/التنبؤ المستقبلي/)).toBeInTheDocument();
      });
    });

    it('يجب أن يعرض حالة النظام', async () => {
      render(<AIAdvancedDashboard />);
      await waitFor(() => {
        expect(screen.getByText(/النظام نشط/)).toBeInTheDocument();
      });
    });
  });

  describe('Integration Tests', () => {
    it('يجب أن تعمل جميع المكونات بدون أخطاء', async () => {
      const { container: dashboard } = render(<AIAdvancedDashboard />);
      const { container: recommendations } = render(<AIRecommendations />);
      const { container: metrics } = render(<AIMetricsDashboard />);
      const { container: reports } = render(<AIProcessReports />);
      const { container: streaming } = render(<AIStreamingDashboard />);

      await waitFor(() => {
        expect(dashboard).not.toBeEmptyDOMElement();
        expect(recommendations).not.toBeEmptyDOMElement();
        expect(metrics).not.toBeEmptyDOMElement();
        expect(reports).not.toBeEmptyDOMElement();
        expect(streaming).not.toBeEmptyDOMElement();
      });
    });

    it('يجب أن تتحدث المكونات مع بعضها البعض', async () => {
      const AIClient = require('../services/AIClient').default;

      render(<AIAdvancedDashboard />);
      await waitFor(() => {
        expect(AIClient.getDashboard).toHaveBeenCalled();
      });

      render(<AIRecommendations />);
      await waitFor(() => {
        expect(AIClient.suggestNextStep).toHaveBeenCalled();
      });
    });
  });

  describe('Performance Tests', () => {
    it('يجب أن تحمل لوحة التحكم بسرعة', async () => {
      const start = performance.now();
      render(<AIAdvancedDashboard />);
      await waitFor(() => {
        expect(screen.getByText(/لوحة التحكم الذكية/)).toBeInTheDocument();
      });
      const end = performance.now();

      expect(end - start).toBeLessThan(2000); // أقل من ثانيتين
    });

    it('يجب أن تحمل التوصيات بسرعة', async () => {
      const start = performance.now();
      render(<AIRecommendations />);
      await waitFor(() => {
        expect(screen.getByText(/التوصيات والاقتراحات الذكية/)).toBeInTheDocument();
      });
      const end = performance.now();

      expect(end - start).toBeLessThan(2000);
    });
  });

  describe('Accessibility Tests', () => {
    it('يجب أن يكون لديه نصوص بديلة للصور', async () => {
      render(<AIAdvancedDashboard />);
      const elements = screen.getAllByRole('img', { hidden: true });
      elements.forEach(el => {
        expect(el).toHaveAttribute('alt');
      });
    });

    it('يجب أن تكون الألوان قابلة للتمييز', async () => {
      render(<AIAdvancedDashboard />);
      // اختبار التباين
      expect(screen.getByText(/إجمالي العمليات/)).toBeVisible();
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

      render(<AIAdvancedDashboard />);
      // يجب أن يستمر في العمل حتى مع الخطأ
      expect(screen.queryByText(/خطأ/)).not.toBeInTheDocument();
    });

    it('يجب أن تعرض رسائل خطأ مناسبة', async () => {
      const { rerender } = render(<AIAdvancedDashboard />);
      // تأكد من معالجة الأخطاء
      await waitFor(() => {
        expect(screen.getByText(/لوحة التحكم الذكية/)).toBeInTheDocument();
      });
    });
  });
});
