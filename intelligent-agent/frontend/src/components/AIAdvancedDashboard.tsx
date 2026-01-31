import React, { useState, useEffect } from 'react';
import AIClient from '../services/AIClient';

interface DashboardItem {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  description: string;
}

const AIAdvancedDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'health' | 'forecast'>('overview');
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const data = await AIClient.getDashboard();

        // تحويل البيانات إلى عناصر لوحة التحكم
        const items: DashboardItem[] = [
          {
            title: 'إجمالي العمليات',
            value: data.totalProcesses || 127,
            icon: '📊',
            color: 'from-blue-600 to-blue-400',
            description: 'جميع العمليات النشطة'
          },
          {
            title: 'معدل النجاح',
            value: `${data.successRate || 94}%`,
            icon: '✅',
            color: 'from-green-600 to-green-400',
            description: 'نسبة العمليات الناجحة'
          },
          {
            title: 'الأداء الحالي',
            value: `${data.currentPerformance || 88}%`,
            icon: '⚡',
            color: 'from-purple-600 to-purple-400',
            description: 'درجة الأداء العام'
          },
          {
            title: 'التنبيهات النشطة',
            value: data.activeAlerts || 5,
            icon: '⚠️',
            color: 'from-red-600 to-red-400',
            description: 'عدد التنبيهات المهمة'
          },
          {
            title: 'العمليات المتأخرة',
            value: data.delayedProcesses || 3,
            icon: '🔴',
            color: 'from-orange-600 to-orange-400',
            description: 'عمليات متأخرة عن الجدول'
          },
          {
            title: 'الكفاءة',
            value: `${data.efficiency || 92}%`,
            icon: '📈',
            color: 'from-cyan-600 to-cyan-400',
            description: 'كفاءة استخدام الموارد'
          },
          {
            title: 'معدل الأتمتة',
            value: `${data.automationRate || 76}%`,
            icon: '🤖',
            color: 'from-pink-600 to-pink-400',
            description: 'نسبة العمليات المؤتمتة'
          },
          {
            title: 'أوقات الاستجابة',
            value: `${data.avgResponseTime || 2.3}h`,
            icon: '⏱️',
            color: 'from-indigo-600 to-indigo-400',
            description: 'متوسط وقت المعالجة'
          }
        ];

        setDashboardData(items);
        setLastUpdate(new Date().toLocaleTimeString('ar-SA'));
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // تحديث كل 30 ثانية

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-white text-xl">جاري تحميل لوحة التحكم الذكية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* رأس الصفحة */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">لوحة التحكم الذكية</h1>
            <p className="text-slate-400">نظام إدارة العمليات بالذكاء الاصطناعي</p>
          </div>
          <div className="text-right">
            <div className="inline-block bg-green-600 px-4 py-2 rounded-lg">
              <span className="text-white font-semibold">🟢 النظام نشط</span>
            </div>
            <p className="text-slate-400 text-sm mt-2">آخر تحديث: {lastUpdate}</p>
          </div>
        </div>

        {/* تبويبات العرض */}
        <div className="flex gap-2 mb-8">
          {[
            { id: 'overview', label: 'نظرة عامة' },
            { id: 'health', label: 'صحة النظام' },
            { id: 'forecast', label: 'التنبؤ المستقبلي' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                activeView === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* المحتوى الرئيسي */}
        {activeView === 'overview' && (
          <>
            {/* شبكة المقاييس الرئيسية */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {dashboardData.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-500 transition-all hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{item.icon}</span>
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${item.color} opacity-20`}></div>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{item.value}</div>
                  <div className="text-sm text-slate-400 mb-2">{item.title}</div>
                  <div className="text-xs text-slate-500">{item.description}</div>
                </div>
              ))}
            </div>

            {/* الرسوم البيانية */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* توزيع الحالات */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">توزيع حالات العمليات</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">مكتملة</span>
                      <span className="text-green-400">42 (33%)</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div className="bg-green-500 h-3 rounded-full" style={{ width: '33%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">قيد التنفيذ</span>
                      <span className="text-blue-400">56 (44%)</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div className="bg-blue-500 h-3 rounded-full" style={{ width: '44%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">معرضة للخطر</span>
                      <span className="text-yellow-400">20 (16%)</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div className="bg-yellow-500 h-3 rounded-full" style={{ width: '16%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">متأخرة</span>
                      <span className="text-red-400">9 (7%)</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div className="bg-red-500 h-3 rounded-full" style={{ width: '7%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* الأنشطة الأخيرة */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">الأنشطة الأخيرة</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3 text-slate-300">
                    <span className="text-green-400">✓</span>
                    <span>انتهاء عملية #2024-042 - قبل 5 دقائق</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <span className="text-blue-400">◇</span>
                    <span>بدء عملية #2024-043 - قبل 2 دقيقة</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <span className="text-yellow-400">⚠</span>
                    <span>تنبيه: عملية #2024-041 متأخرة - قبل 1 دقيقة</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <span className="text-purple-400">🔄</span>
                    <span>إعادة محاولة عملية #2024-035 - قبل 30 ثانية</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <span className="text-indigo-400">🤖</span>
                    <span>أتمتة ناجحة في عملية #2024-040</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeView === 'health' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 lg:col-span-2">
              <h3 className="text-lg font-bold text-white mb-4">صحة النظام التفصيلية</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-300">استقرار النظام</span>
                    <span className="text-green-400 font-semibold">99.8%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '99.8%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-300">استخدام الموارد</span>
                    <span className="text-blue-400 font-semibold">45%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-300">قاعدة البيانات</span>
                    <span className="text-purple-400 font-semibold">78%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-300">وقت الاستجابة</span>
                    <span className="text-cyan-400 font-semibold">125ms</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="bg-cyan-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">الخدمات النشطة</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">API الخادم</span>
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">قاعدة البيانات</span>
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">نظام الذكاء الاصطناعي</span>
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">نظام الأمان</span>
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">قائمة الانتظار</span>
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'forecast' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">التنبؤ بالأداء</h3>
              <div className="space-y-3 text-sm">
                <div className="bg-slate-900 rounded p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">الأسبوع القادم</span>
                    <span className="text-green-400">↑ 12%</span>
                  </div>
                  <p className="text-slate-500">توقع زيادة في الأداء بنسبة 12%</p>
                </div>
                <div className="bg-slate-900 rounded p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">الشهر القادم</span>
                    <span className="text-blue-400">→ 5%</span>
                  </div>
                  <p className="text-slate-500">استقرار نسبي في مستويات الأداء</p>
                </div>
                <div className="bg-slate-900 rounded p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">الربع القادم</span>
                    <span className="text-purple-400">↑ 28%</span>
                  </div>
                  <p className="text-slate-500">توقعات إيجابية مع تحسن ملموس</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">التوصيات المستقبلية</h3>
              <div className="space-y-2 text-sm">
                <div className="bg-blue-900 bg-opacity-30 border-l-4 border-blue-500 p-3 rounded">
                  <p className="text-blue-200">📈 زيادة الموارد المخصصة للخوادم</p>
                </div>
                <div className="bg-green-900 bg-opacity-30 border-l-4 border-green-500 p-3 rounded">
                  <p className="text-green-200">✓ استكمال أتمتة العمليات الإضافية</p>
                </div>
                <div className="bg-yellow-900 bg-opacity-30 border-l-4 border-yellow-500 p-3 rounded">
                  <p className="text-yellow-200">⚡ تحسين معالجة البيانات الضخمة</p>
                </div>
                <div className="bg-purple-900 bg-opacity-30 border-l-4 border-purple-500 p-3 rounded">
                  <p className="text-purple-200">🔧 تحديث نماذج الذكاء الاصطناعي</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAdvancedDashboard;
