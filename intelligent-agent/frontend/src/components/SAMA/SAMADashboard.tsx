import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  CreditCard,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Wallet,
  Shield,
  Settings,
  LogOut,
} from 'lucide-react';
import PaymentManagement from './PaymentManagement';
import AccountAnalytics from './AccountAnalytics';
import FraudAlerts from './FraudAlerts';
import FinancialReports from './FinancialReports';
import { SAMAService } from '../../services/SAMAService';

interface DashboardData {
  accountBalance: number;
  monthlySpending: number;
  savingsRate: number;
  investmentValue: number;
  alerts: number;
  fraudScore: number;
  lastUpdated: string;
}

interface ChartData {
  name: string;
  value: number;
  percentage?: number;
}

const SAMADashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'analytics' | 'fraud' | 'reports'>('overview');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [spendingData, setSpendingData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState({ name: 'أحمد محمد', account: 'SA0300000000608410167519' });

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('يرجى تسجيل الدخول أولاً');
          return;
        }

        const data = await SAMAService.getDashboardData(token);
        setDashboardData(data as DashboardData);

        const spending = await SAMAService.getSpendingPatterns(token);
        setSpendingData(
          (spending as any[]).map((item: any) => ({
            name: item.category,
            value: item.amount,
            percentage: item.percentage,
          }))
        );

        setError(null);
      } catch (err) {
        setError('فشل في تحميل البيانات. يرجى المحاولة مجدداً.');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  };

  const handleRefresh = () => {
    setLoading(true);
    // Trigger data refresh
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin">
          <div className="h-16 w-16 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-lg">
              <CreditCard size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">نظام SAMA المتقدم</h1>
              <p className="text-sm text-slate-400">لوحة التحكم المالية الذكية</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold">{userInfo.name}</p>
              <p className="text-xs text-slate-400">{userInfo.account}</p>
            </div>
            <button onClick={handleRefresh} className="p-2 hover:bg-slate-800 rounded-lg transition">
              🔄
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-slate-800 rounded-lg transition">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 flex gap-8">
          {[
            { id: 'overview', label: '📊 نظرة عامة', icon: '📊' },
            { id: 'payments', label: '💰 الدفعات', icon: '💰' },
            { id: 'analytics', label: '📈 التحليلات', icon: '📈' },
            { id: 'fraud', label: '🛡️ الأمان', icon: '🛡️' },
            { id: 'reports', label: '📋 التقارير', icon: '📋' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-2 border-b-2 font-semibold transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500 text-red-200 p-4 rounded-lg flex items-center gap-3">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && dashboardData && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-blue-100 text-sm mb-1">رصيد الحساب</p>
                    <p className="text-3xl font-bold">{(dashboardData.accountBalance / 1000).toFixed(1)}K</p>
                    <p className="text-xs text-blue-200 mt-2">SAR</p>
                  </div>
                  <Wallet size={32} className="text-blue-200" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-green-100 text-sm mb-1">معدل الادخار</p>
                    <p className="text-3xl font-bold">{dashboardData.savingsRate}%</p>
                    <p className="text-xs text-green-200 mt-2">شهري</p>
                  </div>
                  <TrendingUp size={32} className="text-green-200" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-purple-100 text-sm mb-1">الإنفاق الشهري</p>
                    <p className="text-3xl font-bold">{(dashboardData.monthlySpending / 1000).toFixed(1)}K</p>
                    <p className="text-xs text-purple-200 mt-2">SAR</p>
                  </div>
                  <DollarSign size={32} className="text-purple-200" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-orange-100 text-sm mb-1">درجة الأمان</p>
                    <p className="text-3xl font-bold">{100 - dashboardData.fraudScore}</p>
                    <p className="text-xs text-orange-200 mt-2">/100</p>
                  </div>
                  <Shield size={32} className="text-orange-200" />
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Spending by Category */}
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <h3 className="text-lg font-semibold mb-4">توزيع الإنفاق</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={spendingData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {spendingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toLocaleString()} SAR`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly Trend */}
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <h3 className="text-lg font-semibold mb-4">اتجاه الإنفاق</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[
                    { month: 'يناير', amount: 25000, budget: 30000 },
                    { month: 'فبراير', amount: 28000, budget: 30000 },
                    { month: 'مارس', amount: 22000, budget: 30000 },
                    { month: 'أبريل', amount: 26000, budget: 30000 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke="#3B82F6" name="الإنفاق الفعلي" strokeWidth={2} />
                    <Line type="monotone" dataKey="budget" stroke="#10B981" name="الميزانية" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
              <h3 className="text-lg font-semibold mb-4">الإجراءات السريعة</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: '💸', label: 'تحويل أموال', action: () => setActiveTab('payments') },
                  { icon: '📊', label: 'عرض التحليلات', action: () => setActiveTab('analytics') },
                  { icon: '🔒', label: 'فحص الأمان', action: () => setActiveTab('fraud') },
                  { icon: '🗂️', label: 'التقارير', action: () => setActiveTab('reports') },
                ].map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg text-center transition"
                  >
                    <p className="text-3xl mb-2">{action.icon}</p>
                    <p className="text-sm font-semibold">{action.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Other Tabs */}
        {activeTab === 'payments' && <PaymentManagement />}
        {activeTab === 'analytics' && <AccountAnalytics />}
        {activeTab === 'fraud' && <FraudAlerts />}
        {activeTab === 'reports' && <FinancialReports />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-slate-400 text-sm">
          <p>© 2026 نظام SAMA المتقدم | جميع الحقوق محفوظة</p>
          <p className="mt-2">Last Updated: {dashboardData?.lastUpdated}</p>
        </div>
      </footer>
    </div>
  );
};

export default SAMADashboard;
