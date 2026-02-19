import React, { useEffect, useState } from 'react';
import apiClient from '../utils/api';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#a832a6',
  '#e63946',
  '#457b9d',
  '#2a9d8f',
];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, reportsRes] = await Promise.all([
          apiClient.get('/api/dashboard/stats'),
          apiClient.get('/api/dashboard/advanced-reports').catch(() => ({ data: null })),
        ]);
        setStats(statsRes.data);
        setReports(reportsRes.data);
      } catch (err) {
        setError('فشل تحميل بيانات لوحة التحكم');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <div>جاري التحميل...</div>;
  if (error) return <div>{error}</div>;
  if (!stats || !reports) return <div>لا توجد بيانات متاحة</div>;

  return (
    <div className="dashboard">
      <h2>لوحة التحكم</h2>
      <div className="dashboard-stats">
        <div>عدد الموردين: {stats.suppliers}</div>
        <div>عدد المنتجات: {stats.products}</div>
        <div>عدد المخزون: {stats.inventory}</div>
        <div>عدد الطلبات: {stats.orders}</div>
        <div>عدد الشحنات: {stats.shipments}</div>
        {stats.users && <div>عدد المستخدمين: {stats.users}</div>}
        {stats.auditLogs && <div>عدد عمليات التدقيق: {stats.auditLogs}</div>}
      </div>

      <h3 style={{ marginTop: 32 }}>إحصائيات متقدمة</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
        {/* PieChart: الطلبات حسب الحالة */}
        <div>
          <h4>الطلبات حسب الحالة</h4>
          <PieChart width={300} height={220}>
            <Pie
              data={reports.ordersByStatus}
              dataKey="count"
              nameKey="_id"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {reports.ordersByStatus.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
        {/* PieChart: الشحنات حسب الحالة */}
        <div>
          <h4>الشحنات حسب الحالة</h4>
          <PieChart width={300} height={220}>
            <Pie
              data={reports.shipmentsByStatus}
              dataKey="count"
              nameKey="_id"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {reports.shipmentsByStatus.map((entry, idx) => (
                <Cell key={`cell2-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
        {/* BarChart: المنتجات لكل مورد */}
        <div>
          <h4>عدد المنتجات لكل مورد</h4>
          <BarChart width={400} height={220} data={reports.productsPerSupplier}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="supplier" angle={-30} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#0088FE" />
          </BarChart>
        </div>
        {/* LineChart: الطلبات الشهرية */}
        <div>
          <h4>الطلبات الشهرية (آخر 12 شهر)</h4>
          <LineChart width={400} height={220} data={reports.ordersByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="_id" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#e63946" />
          </LineChart>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
