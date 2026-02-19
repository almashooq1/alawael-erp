import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';
import { SAMAService } from '../../services/SAMAService';

interface AnalyticsData {
  recommendation: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
}

interface FinancialMetric {
  label: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

const AccountAnalytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetric[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        // Fetch budget recommendations
        const recommendations = await SAMAService.getBudgetRecommendations(token);
        setAnalyticsData(recommendations as AnalyticsData[]);

        // Fetch cash flow forecast
        const forecast = await SAMAService.getCashFlowForecast(token);
        setForecastData(forecast as any[]);

        // Fetch financial score
        const score = await SAMAService.getFinancialScore(token);
        const scoreData = score as any;
        setMetrics([
          {
            label: 'درجة الصحة المالية',
            value: scoreData.score,
            unit: 'نقطة',
            trend: 'up',
            change: 5,
          },
          {
            label: 'نسبة الادخار',
            value: 35,
            unit: '%',
            trend: 'up',
            change: 3,
          },
          {
            label: 'نسبة الدين',
            value: 45,
            unit: '%',
            trend: 'down',
            change: -5,
          },
        ]);

        setLoading(false);
      } catch (error) {
        console.error('Analytics error:', error);
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-500 bg-red-500/10';
      case 'medium':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'low':
        return 'border-green-500 bg-green-500/10';
      default:
        return '';
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري تحميل البيانات...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm mb-2">{metric.label}</p>
                <p className="text-3xl font-bold">{metric.value}</p>
                <p className="text-xs text-slate-500 mt-1">{metric.unit}</p>
              </div>
              {metric.trend === 'up' ? (
                <TrendingUp className="text-green-400" size={24} />
              ) : (
                <TrendingDown className="text-red-400" size={24} />
              )}
            </div>
            <div className={`mt-3 inline-block px-2 py-1 rounded text-xs font-semibold ${metric.trend === 'up' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
              {metric.trend === 'up' ? '+' : ''}{metric.change}% من الشهر الماضي
            </div>
          </div>
        ))}
      </div>

      {/* Cash Flow Forecast */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">توقعات التدفق النقدي</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={forecastData.length > 0 ? forecastData : [
            { name: 'أسبوع 1', realistic: 25000, optimistic: 28000, pessimistic: 22000 },
            { name: 'أسبوع 2', realistic: 23000, optimistic: 26000, pessimistic: 20000 },
            { name: 'أسبوع 3', realistic: 24000, optimistic: 27000, pessimistic: 21000 },
            { name: 'أسبوع 4', realistic: 26000, optimistic: 29000, pessimistic: 23000 },
          ]}>
            <defs>
              <linearGradient id="colorRealistic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorOptimistic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPessimistic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
            <Legend />
            <Area type="monotone" dataKey="realistic" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRealistic)" name="السيناريو الواقعي" />
            <Area type="monotone" dataKey="optimistic" stroke="#10B981" fillOpacity={1} fill="url(#colorOptimistic)" name="السيناريو المتفائل" />
            <Area type="monotone" dataKey="pessimistic" stroke="#EF4444" fillOpacity={1} fill="url(#colorPessimistic)" name="السيناريو المتشائم" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Budget Recommendations */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">توصيات تحسين الميزانية</h3>
        <div className="space-y-3">
          {analyticsData.length === 0 ? (
            <p className="text-slate-400 text-center py-8">لا توجد توصيات متاحة حالياً</p>
          ) : (
            analyticsData.map((rec, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${getPriorityColor(rec.priority)}`}>
                <div className="flex items-start gap-3">
                  <Target size={20} className="mt-1 flex-shrink-0" />
                  <div className="flex-grow">
                    <p className="font-semibold">{rec.recommendation}</p>
                    <p className="text-sm opacity-75 mt-1">{rec.impact}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    rec.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                    rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-green-500/20 text-green-300'
                  }`}>
                    {rec.priority === 'high' ? 'عالي الأولوية' :
                     rec.priority === 'medium' ? 'متوسط' : 'منخفض'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Investment Suggestions */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">اقتراحات الاستثمار</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'الودائع الثابتة', return: '3.5%', risk: 'منخفض', icon: '🏦' },
            { name: 'صناديق الاستثمار', return: '8.2%', risk: 'متوسط', icon: '📊' },
            { name: 'كفالات التأمين', return: '5.0%', risk: 'منخفض', icon: '🛡️' },
            { name: 'الأسهم المحلية', return: '12.0%', risk: 'عالي', icon: '📈' },
          ].map((investment, index) => (
            <div key={index} className="bg-slate-700 p-4 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl mb-2">{investment.icon}</p>
                  <p className="font-semibold">{investment.name}</p>
                  <p className="text-xs text-slate-400 mt-1">العائد المتوقع: {investment.return}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  investment.risk === 'منخفض' ? 'bg-green-500/20 text-green-300' :
                  investment.risk === 'متوسط' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {investment.risk}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountAnalytics;
