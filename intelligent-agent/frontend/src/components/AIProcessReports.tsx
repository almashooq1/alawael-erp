import React, { useState, useEffect } from 'react';
import AIClient from '../services/AIClient';

interface ProcessReport {
  id: string;
  name: string;
  status: 'completed' | 'in-progress' | 'delayed' | 'at-risk';
  progress: number;
  riskLevel: 'low' | 'medium' | 'high';
  efficiency: number;
  estimatedCompletion: string;
  recommendations: string[];
}

const AIProcessReports: React.FC = () => {
  const [reports, setReports] = useState<ProcessReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress' | 'delayed'>('all');
  const [accountingReport, setAccountingReport] = useState<any>(null);
  const [accountingError, setAccountingError] = useState<string>('');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const reportData = await AIClient.getHealthReport();

        // محاكاة معالجة البيانات
        const processedReports: ProcessReport[] = [
          {
            id: '1',
            name: 'معالجة الطلب #2024-001',
            status: 'completed',
            progress: 100,
            riskLevel: 'low',
            efficiency: 98,
            estimatedCompletion: 'مكتملة',
            recommendations: ['تم الانتهاء بنجاح', 'الأداء ممتاز']
          },
          {
            id: '2',
            name: 'معالجة الطلب #2024-002',
            status: 'in-progress',
            progress: 65,
            riskLevel: 'low',
            efficiency: 92,
            estimatedCompletion: '2 ساعة',
            recommendations: ['الخطوة التالية: المراجعة المالية', 'لا توجد مشاكل']
          },
          {
            id: '3',
            name: 'معالجة الطلب #2024-003',
            status: 'delayed',
            progress: 40,
            riskLevel: 'high',
            efficiency: 65,
            estimatedCompletion: '4 ساعات',
            recommendations: ['تطبيق إجراء سريع', 'تعيين موارد إضافية']
          },
          {
            id: '4',
            name: 'معالجة الطلب #2024-004',
            status: 'at-risk',
            progress: 30,
            riskLevel: 'medium',
            efficiency: 75,
            estimatedCompletion: '3 ساعات',
            recommendations: ['مراقبة عن كثب', 'تحديث البيانات مطلوب']
          }
        ];

        setReports(processedReports);
        try {
          const advancedReport = await AIClient.getAccountingAdvancedReport();
          setAccountingReport(advancedReport?.data || advancedReport);
        } catch (error: any) {
          setAccountingError(error?.message || 'تعذر تحميل تقرير المحاسبة');
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const filteredReports = filter === 'all' ? reports : reports.filter(r => r.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'from-green-600 to-green-400';
      case 'in-progress': return 'from-blue-600 to-blue-400';
      case 'delayed': return 'from-red-600 to-red-400';
      case 'at-risk': return 'from-yellow-600 to-yellow-400';
      default: return 'from-slate-600 to-slate-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'مكتملة';
      case 'in-progress': return 'قيد التنفيذ';
      case 'delayed': return 'متأخرة';
      case 'at-risk': return 'معرضة للخطر';
      default: return 'غير معروفة';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return '✓';
      case 'medium': return '⚠️';
      case 'high': return '🔴';
      default: return '?';
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-white">جاري تحميل التقارير...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">تقارير العمليات الذكية</h1>

        {/* تقرير المحاسبة الذكي */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">التقرير المالي الذكي</h2>
            {accountingReport?.signals && (
              <span className="text-xs px-3 py-1 rounded-full bg-blue-600 text-white">
                المخاطر: {accountingReport.insights?.risk?.level === 'high'
                  ? 'مرتفعة'
                  : accountingReport.insights?.risk?.level === 'medium'
                  ? 'متوسطة'
                  : 'منخفضة'}
              </span>
            )}
          </div>

          {accountingError && (
            <div className="bg-red-900 bg-opacity-40 text-red-200 p-3 rounded mb-4">
              {accountingError}
            </div>
          )}

          {accountingReport && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-900 rounded p-3">
                  <div className="text-xs text-slate-400">الأصول</div>
                  <div className="text-lg font-bold text-white">
                    {accountingReport.insights?.metrics?.totalAssets?.toLocaleString('ar-SA')} ر.س
                  </div>
                </div>
                <div className="bg-slate-900 rounded p-3">
                  <div className="text-xs text-slate-400">الخصوم</div>
                  <div className="text-lg font-bold text-white">
                    {accountingReport.insights?.metrics?.totalLiabilities?.toLocaleString('ar-SA')} ر.س
                  </div>
                </div>
                <div className="bg-slate-900 rounded p-3">
                  <div className="text-xs text-slate-400">صافي الربح</div>
                  <div className="text-lg font-bold text-green-400">
                    {accountingReport.insights?.metrics?.netProfit?.toLocaleString('ar-SA')} ر.س
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 rounded p-3">
                  <div className="text-xs text-slate-400">السيولة</div>
                  <div className="text-sm text-white">{accountingReport.signals?.liquidity}</div>
                </div>
                <div className="bg-slate-900 rounded p-3">
                  <div className="text-xs text-slate-400">المديونية</div>
                  <div className="text-sm text-white">{accountingReport.signals?.leverage}</div>
                </div>
                <div className="bg-slate-900 rounded p-3">
                  <div className="text-xs text-slate-400">الربحية</div>
                  <div className="text-sm text-white">{accountingReport.signals?.profitability}</div>
                </div>
              </div>

              {accountingReport.executiveSummary && (
                <div className="mt-4 bg-slate-900 rounded p-3">
                  <div className="text-xs text-slate-400 mb-2">الملخص التنفيذي</div>
                  <ul className="text-sm text-slate-200 space-y-1">
                    {accountingReport.executiveSummary.map((line: string, idx: number) => (
                      <li key={idx}>• {line}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* فلاتر */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { value: 'all', label: 'جميع العمليات' },
            { value: 'completed', label: 'المكتملة' },
            { value: 'in-progress', label: 'قيد التنفيذ' },
            { value: 'delayed', label: 'المتأخرة' }
          ].map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value as any)}
              className={`px-4 py-2 rounded font-medium transition-colors whitespace-nowrap ${
                filter === btn.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* ملخص إحصائي */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-900 bg-opacity-30 rounded-lg p-4 border border-green-700">
            <div className="text-2xl font-bold text-green-400">{reports.filter(r => r.status === 'completed').length}</div>
            <div className="text-sm text-green-300">عمليات مكتملة</div>
          </div>
          <div className="bg-blue-900 bg-opacity-30 rounded-lg p-4 border border-blue-700">
            <div className="text-2xl font-bold text-blue-400">{reports.filter(r => r.status === 'in-progress').length}</div>
            <div className="text-sm text-blue-300">قيد التنفيذ</div>
          </div>
          <div className="bg-yellow-900 bg-opacity-30 rounded-lg p-4 border border-yellow-700">
            <div className="text-2xl font-bold text-yellow-400">{reports.filter(r => r.status === 'at-risk').length}</div>
            <div className="text-sm text-yellow-300">معرضة للخطر</div>
          </div>
          <div className="bg-red-900 bg-opacity-30 rounded-lg p-4 border border-red-700">
            <div className="text-2xl font-bold text-red-400">{reports.filter(r => r.status === 'delayed').length}</div>
            <div className="text-sm text-red-300">متأخرة</div>
          </div>
        </div>

        {/* قائمة التقارير */}
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-500 transition-all">
              {/* رأس التقرير */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${getStatusColor(report.status)}`}></div>
                  <h3 className="text-lg font-bold text-white">{report.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getRiskIcon(report.riskLevel)}</span>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    report.status === 'completed' ? 'bg-green-600 text-white' :
                    report.status === 'in-progress' ? 'bg-blue-600 text-white' :
                    report.status === 'delayed' ? 'bg-red-600 text-white' :
                    'bg-yellow-600 text-white'
                  }`}>
                    {getStatusLabel(report.status)}
                  </span>
                </div>
              </div>

              {/* شريط التقدم */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">نسبة الإنجاز</span>
                  <span className="text-slate-300 font-semibold">{report.progress}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${getStatusColor(report.status)} transition-all`}
                    style={{ width: `${report.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* مقاييس الأداء */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-900 rounded p-3">
                  <div className="text-xs text-slate-500">الكفاءة</div>
                  <div className="text-xl font-bold text-blue-400">{report.efficiency}%</div>
                </div>
                <div className="bg-slate-900 rounded p-3">
                  <div className="text-xs text-slate-500">درجة المخاطر</div>
                  <div className={`text-lg font-bold ${
                    report.riskLevel === 'low' ? 'text-green-400' :
                    report.riskLevel === 'medium' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {report.riskLevel === 'low' ? 'منخفضة' :
                     report.riskLevel === 'medium' ? 'متوسطة' :
                     'عالية'}
                  </div>
                </div>
                <div className="bg-slate-900 rounded p-3">
                  <div className="text-xs text-slate-500">الانتهاء المتوقع</div>
                  <div className="text-lg font-bold text-purple-400">{report.estimatedCompletion}</div>
                </div>
              </div>

              {/* التوصيات */}
              <div className="border-t border-slate-700 pt-4">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">التوصيات الذكية:</h4>
                <ul className="space-y-1">
                  {report.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-slate-400 flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIProcessReports;
