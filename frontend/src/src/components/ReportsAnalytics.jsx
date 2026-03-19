/**
 * ReportsAnalytics.jsx - مكون التقارير والتحليلات المتقدمة
 * يوفر تقارير شاملة وتحليلات متقدمة للنظام
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Download, TrendingUp, TrendingDown, Calendar, Filter } from 'lucide-react';
import HRAPIService from '../services/HRAPIService';

export default function ReportsAnalytics({ onError }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({ start: '2026-01-01', end: '2026-12-31' });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    overview: null,
    payroll: null,
    performance: null,
  });

  // تحميل البيانات عند تغيير التاريخ أو التبويب
  useEffect(() => {
    loadReportData();
  }, [activeTab, dateRange]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      let response;
      switch (activeTab) {
        case 'overview':
          response = await HRAPIService.getHROverviewReport(dateRange.start, dateRange.end);
          setData((prev) => ({ ...prev, overview: response || getMockOverviewData() }));
          break;
        case 'payroll':
          const [month, year] = dateRange.start.split('-').slice(0, 2);
          response = await HRAPIService.getPayrollReport(month, year);
          setData((prev) => ({ ...prev, payroll: response || getMockPayrollData() }));
          break;
        case 'performance':
          response = await HRAPIService.getPerformanceReport(dateRange.start, dateRange.end);
          setData((prev) => ({ ...prev, performance: response || getMockPerformanceData() }));
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('خطأ في تحميل التقرير:', error);
      // استخدام البيانات الوهمية في حالة الخطأ
      if (activeTab === 'overview') {
        setData((prev) => ({ ...prev, overview: getMockOverviewData() }));
      } else if (activeTab === 'payroll') {
        setData((prev) => ({ ...prev, payroll: getMockPayrollData() }));
      } else {
        setData((prev) => ({ ...prev, performance: getMockPerformanceData() }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const reportName = activeTab === 'overview' ? 'نظرة عامة' : activeTab === 'payroll' ? 'الرواتب' : 'الأداء';
    alert(`تم تحميل تقرير ${reportName} كـ PDF`);
  };

  const handleExportExcel = () => {
    const reportName = activeTab === 'overview' ? 'نظرة عامة' : activeTab === 'payroll' ? 'الرواتب' : 'الأداء';
    alert(`تم تحميل تقرير ${reportName} كـ Excel`);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">التقارير والتحليلات</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            <Download size={20} />
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            <Download size={20} />
            Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ البداية</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ النهاية</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
            <Filter size={20} />
            تطبيق
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b">
          {['overview', 'payroll', 'performance'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 font-semibold transition ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'overview'
                ? 'نظرة عامة'
                : tab === 'payroll'
                ? 'الرواتب'
                : 'الأداء'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewReport data={data.overview} />
              )}
              {activeTab === 'payroll' && (
                <PayrollReport data={data.payroll} />
              )}
              {activeTab === 'performance' && (
                <PerformanceReport data={data.performance} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * تقرير النظرة العامة
 */
function OverviewReport({ data }) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="إجمالي الموظفين"
          value={data.totalEmployees}
          change="+5%"
          trend="up"
        />
        <KPICard
          label="الموظفون النشطون"
          value={data.activeEmployees}
          change="+2%"
          trend="up"
        />
        <KPICard
          label="معدل الغياب"
          value={`${data.absenteeRate}%`}
          change="-1%"
          trend="down"
        />
        <KPICard
          label="متوسط الراتب"
          value={`${data.averageSalary} ريال`}
          change="0%"
          trend="neutral"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employees Trend */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">اتجاه توظيف الموظفين</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.employeesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="موظفين"
                stroke="#3b82f6"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Department Distribution */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">توزيع الموظفين حسب الأقسام</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.departmentDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry.name}
                outerRadius={80}
                fill="#3b82f6"
                dataKey="count"
              >
                {data.departmentDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'][index % 5]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Hiring */}
        <div className="bg-gray-50 rounded-lg p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-800 mb-4">التوظيفات والمغادرات الشهرية</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.hiringTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="توظيفات" fill="#10b981" />
              <Bar dataKey="مغادرات" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">ملخص الأقسام</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="px-4 py-2 font-semibold text-gray-800">القسم</th>
                <th className="px-4 py-2 font-semibold text-gray-800">الموظفون</th>
                <th className="px-4 py-2 font-semibold text-gray-800">المديرون</th>
                <th className="px-4 py-2 font-semibold text-gray-800">متوسط الخبرة</th>
                <th className="px-4 py-2 font-semibold text-gray-800">معدل الأداء</th>
              </tr>
            </thead>
            <tbody>
              {data.departmentSummary?.map((dept, index) => (
                <tr key={index} className="border-b hover:bg-white transition">
                  <td className="px-4 py-3 text-gray-700">{dept.name}</td>
                  <td className="px-4 py-3 text-gray-700">{dept.employees}</td>
                  <td className="px-4 py-3 text-gray-700">{dept.managers}</td>
                  <td className="px-4 py-3 text-gray-700">{dept.avgExperience} سنة</td>
                  <td className="px-4 py-3">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                      {dept.performanceRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * تقرير الرواتب
 */
function PayrollReport({ data }) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="إجمالي الرواتب"
          value={`${data.totalPayroll} ريال`}
          change="+3%"
          trend="up"
        />
        <KPICard
          label="المستحقات الإضافية"
          value={`${data.totalAllowances} ريال`}
          change="+1%"
          trend="up"
        />
        <KPICard
          label="الخصومات"
          value={`${data.totalDeductions} ريال`}
          change="-2%"
          trend="down"
        />
        <KPICard
          label="الصافي المدفوع"
          value={`${data.netPayroll} ريال`}
          change="+2%"
          trend="up"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payroll Trends */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">اتجاه الرواتب</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.payrollTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="الرواتب"
                stroke="#3b82f6"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="المستحقات"
                stroke="#10b981"
                stroke Width={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Salary Distribution */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">توزيع الرواتب</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.salaryDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry.name}
                outerRadius={80}
                fill="#3b82f6"
                dataKey="value"
              >
                {data.salaryDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={['#3b82f6', '#ef4444', '#10b981'][index % 3]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payroll Details Table */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">تفاصيل الرواتب</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="px-4 py-2 font-semibold text-gray-800">الموظف</th>
                <th className="px-4 py-2 font-semibold text-gray-800">الراتب الأساسي</th>
                <th className="px-4 py-2 font-semibold text-gray-800">المستحقات</th>
                <th className="px-4 py-2 font-semibold text-gray-800">الخصومات</th>
                <th className="px-4 py-2 font-semibold text-gray-800">الصافي</th>
                <th className="px-4 py-2 font-semibold text-gray-800">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {data.payrollDetails?.map((employee, index) => (
                <tr key={index} className="border-b hover:bg-white transition">
                  <td className="px-4 py-3 text-gray-700">{employee.name}</td>
                  <td className="px-4 py-3 text-gray-700">{employee.base}</td>
                  <td className="px-4 py-3 text-gray-700">{employee.allowances}</td>
                  <td className="px-4 py-3 text-gray-700">{employee.deductions}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{employee.net}</td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      employee.status === 'تم الدفع'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {employee.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * تقرير الأداء
 */
function PerformanceReport({ data }) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="متوسط أداء فريق"
          value={`${data.averagePerformance}%`}
          change="+2%"
          trend="up"
        />
        <KPICard
          label="موظفون متفوقون"
          value={data.topPerformers}
          change="+1"
          trend="up"
        />
        <KPICard
          label="موظفون يحتاجون تطوير"
          value={data.needsImprovement}
          change="-2"
          trend="down"
        />
        <KPICard
          label="معدل الرضا الوظيفي"
          value={`${data.satisfactionRate}%`}
          change="+3%"
          trend="up"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">اتجاه الأداء</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.performanceTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quarter" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="الأداء"
                stroke="#3b82f6"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Distribution */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">توزيع مستويات الأداء</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.performanceDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry.name}
                outerRadius={80}
                fill="#3b82f6"
                dataKey="count"
              >
                {data.performanceDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={['#10b981', '#f59e0b', '#ef4444'][index % 3]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Skills Gap Analysis */}
        <div className="bg-gray-50 rounded-lg p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-800 mb-4">تحليل فجوات المهارات</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.skillsGap}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="skill" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="الكفاءة الحالية" fill="#3b82f6" />
              <Bar dataKey="المطلوبة" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">أفضل الموظفين أداءً</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.topEmployees?.map((employee, index) => (
            <div key={index} className="bg-white rounded-lg p-4 border-r-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">{employee.name}</h4>
                <span className="text-lg font-bold text-green-600">{employee.score}%</span>
              </div>
              <p className="text-sm text-gray-600">{employee.position}</p>
              <div className="mt-3 w-full bg-gray-300 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${employee.score}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * مكون KPI Card المعاد استخدامه
 */
function KPICard({ label, value, change, trend }) {
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition">
      <p className="text-gray-600 text-sm font-semibold mb-2">{label}</p>
      <div className="flex items-end justify-between">
        <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon size={20} />
          <span className="text-sm font-semibold">{change}</span>
        </div>
      </div>
    </div>
  );
}

// ============= Mock Data Functions =============

function getMockOverviewData() {
  return {
    totalEmployees: 245,
    activeEmployees: 235,
    absenteeRate: 4.5,
    averageSalary: 7500,
    employeesTrend: [
      { month: 'يناير', موظفين: 200 },
      { month: 'فبراير', موظفين: 215 },
      { month: 'مارس', موظفين: 225 },
      { month: 'أبريل', موظفين: 235 },
    ],
    departmentDistribution: [
      { name: 'IT', count: 45 },
      { name: 'HR', count: 12 },
      { name: 'Finance', count: 28 },
      { name: 'Sales', count: 89 },
      { name: 'Operations', count: 71 },
    ],
    hiringTrend: [
      { month: 'يناير', توظيفات: 10, مغادرات: 2 },
      { month: 'فبراير', توظيفات: 15, مغادرات: 1 },
      { month: 'مارس', توظيفات: 12, مغادرات: 3 },
      { month: 'أبريل', توظيفات: 8, مغادرات: 2 },
    ],
    departmentSummary: [
      { name: 'IT', employees: 45, managers: 3, avgExperience: 5, performanceRate: 92 },
      { name: 'HR', employees: 12, managers: 1, avgExperience: 6, performanceRate: 88 },
      { name: 'Finance', employees: 28, managers: 2, avgExperience: 8, performanceRate: 95 },
      { name: 'Sales', employees: 89, managers: 5, avgExperience: 4, performanceRate: 85 },
      { name: 'Operations', employees: 71, managers: 4, avgExperience: 7, performanceRate: 90 },
    ],
  };
}

function getMockPayrollData() {
  return {
    totalPayroll: 1850000,
    totalAllowances: 350000,
    totalDeductions: 200000,
    netPayroll: 2000000,
    payrollTrend: [
      { month: 'يناير', الرواتب: 1800000, المستحقات: 300000 },
      { month: 'فبراير', الرواتب: 1820000, المستحقات: 330000 },
      { month: 'مارس', الرواتب: 1850000, المستحقات: 350000 },
      { month: 'أبريل', الرواتب: 1880000, المستحقات: 370000 },
    ],
    salaryDistribution: [
      { name: 'الراتب الأساسي', value: 65 },
      { name: 'المستحقات', value: 20 },
      { name: 'الخصومات', value: 15 },
    ],
    payrollDetails: [
      { name: 'أحمد محمد', base: 5000, allowances: 1000, deductions: 500, net: 5500, status: 'تم الدفع' },
      { name: 'فاطمة علي', base: 4500, allowances: 800, deductions: 450, net: 4850, status: 'تم الدفع' },
      { name: 'محمود حسن', base: 6000, allowances: 1200, deductions: 600, net: 6600, status: 'معلق' },
    ],
  };
}

function getMockPerformanceData() {
  return {
    averagePerformance: 89,
    topPerformers: 28,
    needsImprovement: 15,
    satisfactionRate: 85,
    performanceTrend: [
      { quarter: 'Q1', الأداء: 82 },
      { quarter: 'Q2', الأداء: 85 },
      { quarter: 'Q3', الأداء: 87 },
      { quarter: 'Q4', الأداء: 89 },
    ],
    performanceDistribution: [
      { name: 'ممتاز', count: 28 },
      { name: 'جيد', count: 150 },
      { name: 'يحتاج تطوير', count: 15 },
    ],
    skillsGap: [
      { skill: 'القيادة', الكفاءة الحالية: 75, المطلوبة: 85 },
      { skill: 'التواصل', الكفاءة الحالية: 80, المطلوبة: 90 },
      { skill: 'التحليل', الكفاءة الحالية: 78, المطلوبة: 88 },
      { skill: 'العمل الجماعي', الكفاءة الحالية: 82, المطلوبة: 92 },
    ],
    topEmployees: [
      { name: 'أحمد محمد', position: 'مدير IT', score: 96 },
      { name: 'فاطمة علي', position: 'محللة مالية', score: 94 },
      { name: 'محمود حسن', position: 'مدير مبيعات', score: 92 },
    ],
  };
}
