import React, { useEffect, useMemo, useState } from 'react';
import AIClient from '../services/AIClient';
import { useTheme } from '../contexts/ThemeContext';

interface InsightMetrics {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  currentRatio: number;
  debtToAssets: number;
  netMargin: number;
}

interface InsightPayload {
  metrics: InsightMetrics;
  risk: {
    score: number;
    level: 'low' | 'medium' | 'high';
  };
  recommendations: string[];
}

interface ForecastPayload {
  history: Array<{ month: string; revenue: number; expenses: number; netProfit: number }>;
  forecast: Array<{ month: string; revenue: number; expenses: number; netProfit: number }>;
  model: {
    historyMonths: number;
    forecastMonths: number;
    confidence: number;
  };
}

const UnifiedAccountingAIDashboard: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<InsightPayload | null>(null);
  const [forecast, setForecast] = useState<ForecastPayload | null>(null);
  const [error, setError] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError('');
      const [data, forecastData] = await Promise.all([
        AIClient.getAccountingInsights(),
        AIClient.getAccountingForecast({ historyMonths: 6, forecastMonths: 3 }),
      ]);
      setInsights(data);
      setForecast(forecastData?.data || forecastData);
      setLastUpdate(new Date().toLocaleTimeString('ar-SA'));
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل بيانات المحاسبة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const riskBadge = useMemo(() => {
    if (!insights) return { label: 'غير متوفر', color: theme.colors.text.secondary };
    const level = insights.risk.level;
    if (level === 'high') return { label: 'مخاطر عالية', color: theme.colors.error.main };
    if (level === 'medium') return { label: 'مخاطر متوسطة', color: theme.colors.warning.main };
    return { label: 'مخاطر منخفضة', color: theme.colors.success.main };
  }, [insights, theme.colors]);

  return (
    <div className="min-h-screen px-6 py-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">لوحة موحدة للمحاسبة والذكاء الاصطناعي</h2>
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              تحليل مالي لحظي مدعوم بتوصيات الذكاء الاصطناعي
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm" style={{ color: theme.colors.text.secondary }}>
              آخر تحديث: {lastUpdate || '—'}
            </div>
            <button
              className="mt-2 px-4 py-2 text-xs font-semibold"
              style={{
                backgroundColor: theme.colors.primary[600],
                color: theme.colors.text.inverse,
                borderRadius: theme.borderRadius.sm,
              }}
              onClick={fetchInsights}
            >
              تحديث البيانات
            </button>
          </div>
        </div>

        {loading && (
          <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface.primary }}>
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              جاري تحميل البيانات...
            </p>
          </div>
        )}

        {!loading && error && (
          <div
            className="rounded-lg p-6 mb-6"
            style={{
              backgroundColor: theme.colors.error.light,
              color: theme.colors.error.contrast,
            }}
          >
            {error}
          </div>
        )}

        {!loading && insights && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'إجمالي الأصول', value: insights.metrics.totalAssets },
                { label: 'إجمالي الخصوم', value: insights.metrics.totalLiabilities },
                { label: 'صافي الربح', value: insights.metrics.netProfit },
                { label: 'الإيرادات', value: insights.metrics.totalRevenue },
                { label: 'المصروفات', value: insights.metrics.totalExpenses },
                { label: 'حقوق الملكية', value: insights.metrics.totalEquity },
              ].map(item => (
                <div
                  key={item.label}
                  className="p-4 rounded-lg"
                  style={{
                    background: theme.colors.surface.primary,
                    border: `1px solid ${theme.colors.border.main}`,
                  }}
                >
                  <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                    {item.label}
                  </p>
                  <p className="text-xl font-bold mt-2">{item.value.toLocaleString('ar-SA')} ر.س</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div
                className="p-5 rounded-lg"
                style={{
                  background: theme.colors.surface.primary,
                  border: `1px solid ${theme.colors.border.main}`,
                }}
              >
                <h3 className="text-lg font-semibold mb-3">مؤشرات السلامة المالية</h3>
                <div className="space-y-3 text-sm" style={{ color: theme.colors.text.secondary }}>
                  <div className="flex justify-between">
                    <span>النسبة الجارية</span>
                    <span>{insights.metrics.currentRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>نسبة المديونية</span>
                    <span>{(insights.metrics.debtToAssets * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>هامش الربح</span>
                    <span>{(insights.metrics.netMargin * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div
                className="p-5 rounded-lg"
                style={{
                  background: theme.colors.surface.primary,
                  border: `1px solid ${theme.colors.border.main}`,
                }}
              >
                <h3 className="text-lg font-semibold mb-3">مستوى المخاطر</h3>
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm font-semibold px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: riskBadge.color,
                      color: theme.colors.text.inverse,
                    }}
                  >
                    {riskBadge.label}
                  </span>
                  <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                    الدرجة: {insights.risk.score}
                  </span>
                </div>
                <p className="mt-4 text-sm" style={{ color: theme.colors.text.secondary }}>
                  يتم احتساب المخاطر بناءً على السيولة والديون والربحية.
                </p>
              </div>

              <div
                className="p-5 rounded-lg"
                style={{
                  background: theme.colors.surface.primary,
                  border: `1px solid ${theme.colors.border.main}`,
                }}
              >
                <h3 className="text-lg font-semibold mb-3">توصيات الذكاء الاصطناعي</h3>
                <ul className="space-y-2 text-sm" style={{ color: theme.colors.text.secondary }}>
                  {insights.recommendations.length === 0 && <li>لا توجد توصيات عاجلة.</li>}
                  {insights.recommendations.map((rec, idx) => (
                    <li key={idx}>• {rec}</li>
                  ))}
                </ul>
              </div>
            </div>

            {forecast && (
              <div
                className="p-5 rounded-lg"
                style={{
                  background: theme.colors.surface.primary,
                  border: `1px solid ${theme.colors.border.main}`,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">التنبؤات المالية</h3>
                  <span className="text-xs" style={{ color: theme.colors.text.secondary }}>
                    دقة متوقعة: {(forecast.model.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs mb-2" style={{ color: theme.colors.text.secondary }}>
                      الأداء التاريخي
                    </p>
                    <ul className="space-y-2 text-sm">
                      {forecast.history.slice(-3).map(item => (
                        <li key={item.month} className="flex justify-between">
                          <span>{item.month}</span>
                          <span>{item.netProfit.toLocaleString('ar-SA')} ر.س</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs mb-2" style={{ color: theme.colors.text.secondary }}>
                      التوقعات القادمة
                    </p>
                    <ul className="space-y-2 text-sm">
                      {forecast.forecast.map(item => (
                        <li key={item.month} className="flex justify-between">
                          <span>{item.month}</span>
                          <span>{item.netProfit.toLocaleString('ar-SA')} ر.س</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UnifiedAccountingAIDashboard;
