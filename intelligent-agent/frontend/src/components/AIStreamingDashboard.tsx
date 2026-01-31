import React, { useState, useEffect } from 'react';
import AIClient from '../services/AIClient';

interface DashboardData {
  summary?: {
    totalProcesses: number;
    completed: number;
    active: number;
    successRate: string;
    efficiency: string;
  };
  performance?: {
    averageCompletionTime: string;
    riskScore: string;
    bottlenecks: string[];
    trend: string;
  };
  forecast?: {
    estimatedCompletions: number;
    confidence: string;
    recommendation: string;
  };
}

const AIStreamingDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const data = await AIClient.getDashboard();
        setDashboardData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'فشل تحميل البيانات');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // تحديث كل 30 ثانية

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-4 text-center">جاري التحميل...</div>;
  if (error) return <div className="p-4 text-red-600 text-center">خطأ: {error}</div>;

  const summary = dashboardData.summary || {};
  const performance = dashboardData.performance || {};
  const forecast = dashboardData.forecast || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* رأس الصفحة */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">لوحة التحكم الذكية</h1>
          <p className="text-slate-300">نظام الذكاء الاصطناعي المتكامل للعمليات والأداء</p>
        </div>

        {/* البطاقات الرئيسية */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* إجمالي العمليات */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white shadow-lg">
            <div className="text-sm font-medium opacity-90">إجمالي العمليات</div>
            <div className="text-4xl font-bold mt-2">{summary.totalProcesses || 0}</div>
            <div className="text-xs mt-2 opacity-75">عملية نشطة</div>
          </div>

          {/* العمليات المنجزة */}
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 text-white shadow-lg">
            <div className="text-sm font-medium opacity-90">المنجزة</div>
            <div className="text-4xl font-bold mt-2">{summary.completed || 0}</div>
            <div className="text-xs mt-2 opacity-75">بمعدل نجاح {summary.successRate}</div>
          </div>

          {/* العمليات الجارية */}
          <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg p-6 text-white shadow-lg">
            <div className="text-sm font-medium opacity-90">جاري التنفيذ</div>
            <div className="text-4xl font-bold mt-2">{summary.active || 0}</div>
            <div className="text-xs mt-2 opacity-75">بكفاءة {summary.efficiency}</div>
          </div>

          {/* درجة المخاطر */}
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-6 text-white shadow-lg">
            <div className="text-sm font-medium opacity-90">درجة المخاطر</div>
            <div className="text-4xl font-bold mt-2">{performance.riskScore}</div>
            <div className="text-xs mt-2 opacity-75">من 100</div>
          </div>
        </div>

        {/* قسم الأداء والاتجاهات */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* الأداء */}
          <div className="bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">مقاييس الأداء</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-slate-300">
                <span>متوسط وقت الإنجاز</span>
                <span className="font-mono text-green-400">{performance.averageCompletionTime}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>الاتجاه الحالي</span>
                <span className={`font-bold ${performance.trend === 'تحسن' ? 'text-green-400' : 'text-red-400'}`}>
                  {performance.trend}
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-600">
                <div className="text-sm text-slate-400 mb-2">الاختناقات الرئيسية:</div>
                <div className="space-y-1">
                  {performance.bottlenecks?.map((bottleneck, idx) => (
                    <div key={idx} className="text-sm text-amber-400 flex items-center">
                      <span className="inline-block w-2 h-2 bg-amber-400 rounded-full ml-2"></span>
                      {bottleneck}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* التنبؤ والتوصيات */}
          <div className="bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">التنبؤ والتوصيات</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-slate-300">
                <span>العمليات المتوقعة (30 يوم)</span>
                <span className="font-mono text-blue-400">{forecast.estimatedCompletions || 0}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>مستوى الثقة</span>
                <span className="font-mono text-purple-400">{forecast.confidence}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-600">
                <div className="bg-slate-900 rounded p-3 border-l-4 border-yellow-400">
                  <div className="text-sm text-yellow-300 font-semibold">التوصية</div>
                  <div className="text-sm text-slate-300 mt-1">{forecast.recommendation}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* القسم السفلي - معلومات إضافية */}
        <div className="bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">معلومات إضافية</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-slate-900 rounded">
              <div className="text-sm text-slate-400">حالة النظام</div>
              <div className="text-lg font-bold text-green-400 mt-2">✓ يعمل بشكل طبيعي</div>
            </div>
            <div className="p-4 bg-slate-900 rounded">
              <div className="text-sm text-slate-400">آخر تحديث</div>
              <div className="text-lg font-bold text-blue-400 mt-2">{new Date().toLocaleTimeString('ar-SA')}</div>
            </div>
            <div className="p-4 bg-slate-900 rounded">
              <div className="text-sm text-slate-400">الإصدار</div>
              <div className="text-lg font-bold text-purple-400 mt-2">v1.0.0</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIStreamingDashboard;
