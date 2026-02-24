import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Calendar, Users, DollarSign, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * HR Dashboard - لوحة التحكم الرئيسية
 * عرض KPIs والإحصائيات والتقارير الفورية
 */

const HRDashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 245,
    activeEmployees: 235,
    onLeave: 10,
    avgSalary: 7500,
  });

  const [payrollData, setPayrollData] = useState([
    { month: 'يناير', salary: 1823500, bonus: 125000 },
    { month: 'فبراير', salary: 1856000, bonus: 145000 },
    { month: 'مارس', salary: 1834500, bonus: 112000 },
    { month: 'أبريل', salary: 1919000, bonus: 198000 },
  ]);

  const [departmentStats, setDepartmentStats] = useState([
    { name: 'IT', value: 45, fill: '#3b82f6' },
    { name: 'HR', value: 12, fill: '#10b981' },
    { name: 'Finance', value: 28, fill: '#f59e0b' },
    { name: 'Sales', value: 89, fill: '#ef4444' },
    { name: 'Operations', value: 71, fill: '#8b5cf6' },
  ]);

  const [attendanceData, setAttendanceData] = useState([
    { day: 'الأحد', present: 240, absent: 5 },
    { day: 'الاثنين', present: 238, absent: 7 },
    { day: 'الثلاثاء', present: 242, absent: 3 },
    { day: 'الأربعاء', present: 235, absent: 10 },
    { day: 'الخميس', present: 240, absent: 5 },
  ]);

  const [alerts, setAlerts] = useState([
    { id: 1, type: 'warning', message: '5 طلبات إجازة معلقة تحتاج موافقة' },
    { id: 2, type: 'danger', message: 'موظف واحد قريب من انتهاء عقده' },
    { id: 3, type: 'info', message: 'تقرير الرواتب الشهري جاهز للمراجعة' },
  ]);

  const [recentLeaveRequests, setRecentLeaveRequests] = useState([
    {
      id: 1,
      employeeName: 'أحمد محمد',
      type: 'سنوية',
      startDate: '2026-02-20',
      days: 5,
      status: 'معلق',
    },
    {
      id: 2,
      employeeName: 'فاطمة علي',
      type: 'مرضية',
      startDate: '2026-02-15',
      days: 3,
      status: 'موافق عليه',
    },
    {
      id: 3,
      employeeName: 'محمود حسن',
      type: 'شخصية',
      startDate: '2026-02-18',
      days: 1,
      status: 'مرفوض',
    },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* رأس الصفحة */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">لوحة تحكم الموارد البشرية</h1>
        <p className="text-slate-600">مرحباً بك، اليوم {new Date().toLocaleDateString('ar-EG')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          icon={Users}
          title="إجمالي الموظفين"
          value={stats.totalEmployees}
          change="+2%"
          bgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KPICard
          icon={CheckCircle}
          title="الموظفون النشطون"
          value={stats.activeEmployees}
          change="+5"
          bgColor="bg-green-50"
          iconColor="text-green-600"
        />
        <KPICard
          icon={Calendar}
          title="في الإجازة"
          value={stats.onLeave}
          change="-2"
          bgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <KPICard
          icon={DollarSign}
          title="متوسط الراتب"
          value={`${stats.avgSalary.toLocaleString('ar-EG')} ر.س`}
          change="+3%"
          bgColor="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* تنبيهات مهمة */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertCircle className="text-red-500" size={24} />
            التنبيهات المهمة
          </h2>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.type === 'danger'
                    ? 'bg-red-50 border-red-500 text-red-900'
                    : alert.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-500 text-yellow-900'
                    : 'bg-blue-50 border-blue-500 text-blue-900'
                }`}
              >
                {alert.message}
              </div>
            ))}
          </div>
        </div>

        {/* ملخص الحضور اليومي */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">الحضور أمس</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">الحاضرون</span>
              <span className="text-2xl font-bold text-green-600">240/245</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: '98%' }}
              ></div>
            </div>
            <p className="text-sm text-slate-500">معدل الحضور: 98%</p>
          </div>
        </div>
      </div>

      {/* الرسوم البيانية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* رسم الرواتب والمكافآت */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">الرواتب والمكافآت (آخر 4 أشهر)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={payrollData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="salary" fill="#3b82f6" name="الراتب الأساسي" />
              <Bar dataKey="bonus" fill="#10b981" name="المكافآت" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* توزيع الموظفين حسب القسم */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">توزيع الموظفين حسب القسم</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={departmentStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name} (${value})`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {departmentStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* رسم الحضور */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">سجل الحضور الأسبوعي</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={attendanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="present"
              stroke="#10b981"
              strokeWidth={2}
              name="الحاضرون"
            />
            <Line
              type="monotone"
              dataKey="absent"
              stroke="#ef4444"
              strokeWidth={2}
              name="الغائبون"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* أحدث طلبات الإجازات */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">أحدث طلبات الإجازات</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-right py-3 px-4 text-slate-700 font-semibold">اسم الموظف</th>
                <th className="text-center py-3 px-4 text-slate-700 font-semibold">نوع الإجازة</th>
                <th className="text-center py-3 px-4 text-slate-700 font-semibold">عدد الأيام</th>
                <th className="text-center py-3 px-4 text-slate-700 font-semibold">التاريخ</th>
                <th className="text-center py-3 px-4 text-slate-700 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {recentLeaveRequests.map((request) => (
                <tr key={request.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-900">{request.employeeName}</td>
                  <td className="text-center py-3 px-4 text-slate-600">{request.type}</td>
                  <td className="text-center py-3 px-4 text-slate-600">{request.days} أيام</td>
                  <td className="text-center py-3 px-4 text-slate-600">
                    {new Date(request.startDate).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="text-center py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        request.status === 'معلق'
                          ? 'bg-yellow-100 text-yellow-800'
                          : request.status === 'موافق عليه'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {request.status}
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
};

/**
 * مكون بطاقة KPI
 */
const KPICard = ({ icon: Icon, title, value, change, bgColor, iconColor }) => (
  <div className={`${bgColor} rounded-lg shadow-md p-6 border border-slate-200`}>
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-slate-600 font-semibold">{title}</h3>
      <Icon className={`${iconColor}`} size={24} />
    </div>
    <div className="flex items-end justify-between">
      <span className="text-3xl font-bold text-slate-900">{value}</span>
      <span className="text-green-600 text-sm font-semibold">{change}</span>
    </div>
  </div>
);

export default HRDashboard;
