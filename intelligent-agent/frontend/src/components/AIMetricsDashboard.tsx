import React, { useState, useEffect } from 'react';
import AIClient from '../services/AIClient';

interface Metric {
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
}

interface ChartDataPoint {
  name: string;
  value: number;
}

const AIMetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [trends, setTrends] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [metricsData, trendsData] = await Promise.all([
          AIClient.getMetrics(),
          AIClient.getTrends()
        ]);

        // معالجة البيانات
        const processedMetrics: Metric[] = [
          { label: 'إجمالي العمليات', value: metricsData.totalProcesses || 0 },
          { label: 'معدل النجاح', value: `${metricsData.successRate || 0}%`, trend: 'up' },
          { label: 'متوسط المدة', value: `${metricsData.averageDuration || 0}h`, unit: 'ساعة' },
          { label: 'درجة الكفاءة', value: `${metricsData.efficiency || 0}%`, trend: 'up' },
          { label: 'درجة المخاطر', value: metricsData.riskScore || 0, trend: 'down' },
          { label: 'العمليات المتأخرة', value: metricsData.delayedProcesses || 0 },
          { label: 'وقت التنبيه المتوسط', value: `${metricsData.avgAlertTime || 0}min`, unit: 'دقيقة' },
          { label: 'معدل الأتمتة', value: `${metricsData.automationRate || 0}%`, trend: 'up' }
        ];

        const processedTrends: ChartDataPoint[] = trendsData.data || [
          { name: 'السبت', value: 85 },
          { name: 'الأحد', value: 88 },
          { name: 'الاثنين', value: 90 },
          { name: 'الثلاثاء', value: 87 },
          { name: 'الأربعاء', value: 92 },
          { name: 'الخميس', value: 94 },
          { name: 'الجمعة', value: 96 }
        ];

        setMetrics(processedMetrics);
        setTrends(processedTrends);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-white">جاري تحميل المقاييس...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">لوحة التحكم - المقاييس والأداء</h1>

        {/* شبكة المقاييس */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metrics.map((metric, idx) => (
            <div key={idx} className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-500 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">{metric.label}</span>
                {metric.trend === 'up' && <span className="text-green-400">↑</span>}
                {metric.trend === 'down' && <span className="text-red-400">↓</span>}
                {metric.trend === 'stable' && <span className="text-blue-400">→</span>}
              </div>
              <div className="text-2xl font-bold text-white">{metric.value}</div>
              {metric.unit && <div className="text-xs text-slate-500">{metric.unit}</div>}
            </div>
          ))}
        </div>

        {/* الرسم البياني للاتجاهات */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">اتجاهات الأداء</h2>

          {/* محاكاة رسم بياني بسيط */}
          <div className="flex items-end justify-between h-48 gap-2">
            {trends.map((point, idx) => {
              const maxValue = Math.max(...trends.map(t => t.value));
              const heightPercent = (point.value / maxValue) * 100;

              return (
                <div key={idx} className="flex flex-col items-center flex-1">
                  <div className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t"
                       style={{ height: `${heightPercent}%`, minHeight: '10px' }}>
                  </div>
                  <div className="text-xs text-slate-400 mt-2">{point.name}</div>
                  <div className="text-xs text-slate-500">{point.value}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* تحليل تفصيلي */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* الأداء العام */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4">الأداء العام</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">معدل النجاح</span>
                  <span className="text-green-400">95%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">الكفاءة</span>
                  <span className="text-blue-400">88%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">الأتمتة</span>
                  <span className="text-purple-400">72%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '72%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* إحصائيات الأمس */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4">إحصائيات اليوم</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">العمليات المكتملة</span>
                <span className="text-green-400 font-semibold">42</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">العمليات الجاري تنفيذها</span>
                <span className="text-blue-400 font-semibold">18</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">العمليات المتأخرة</span>
                <span className="text-yellow-400 font-semibold">5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">وقت الاستجابة المتوسط</span>
                <span className="text-purple-400 font-semibold">2.3h</span>
              </div>
            </div>
          </div>

          {/* التنبيهات المهمة */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4">تنبيهات مهمة</h3>
            <div className="space-y-2">
              <div className="bg-red-900 bg-opacity-30 border-l-4 border-red-500 p-2 rounded">
                <span className="text-red-300 text-sm">⚠️ 3 عمليات متأخرة</span>
              </div>
              <div className="bg-yellow-900 bg-opacity-30 border-l-4 border-yellow-500 p-2 rounded">
                <span className="text-yellow-300 text-sm">⚡ درجة مخاطر عالية في 2 عملية</span>
              </div>
              <div className="bg-blue-900 bg-opacity-30 border-l-4 border-blue-500 p-2 rounded">
                <span className="text-blue-300 text-sm">ℹ️ فرص أتمتة متاحة في 5 عمليات</span>
              </div>
              <div className="bg-green-900 bg-opacity-30 border-l-4 border-green-500 p-2 rounded">
                <span className="text-green-300 text-sm">✓ 95% من العمليات على المسار الصحيح</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIMetricsDashboard;
