import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

/**
 * =====================================================
 * MAINTENANCE CHARTS - الرسوم البيانية للصيانة
 * =====================================================
 * 
 * المميزات:
 * ✅ رسم بياني تكاليف شهري
 * ✅ توزيع المشاكل حسب النوع
 * ✅ أداء مراكز الصيانة
 * ✅ أوقات الإنجاز
 */
const MaintenanceCharts = ({ selectedVehicle }) => {
  const [costData, setCostData] = useState([]);
  const [issuesData, setIssuesData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicle]);

  const fetchChartData = async () => {
    try {
      setLoading(true);

      // بيانات التكاليف
      const costResponse = await fetch(
        selectedVehicle
          ? `/api/v1/maintenance/reports/${selectedVehicle}`
          : '/api/v1/maintenance/reports/all'
      );
      const costDataResult = await costResponse.json();

      // بيانات المشاكل
      const issuesResponse = await fetch('/api/v1/maintenance/issues');
      const issuesDataResult = await issuesResponse.json();

      // بيانات الأداء
      const performanceResponse = await fetch('/api/v1/maintenance/recommendations');
      const performanceResult = await performanceResponse.json();

      setCostData(costDataResult.costTrend || []);
      setIssuesData(issuesDataResult.issueDistribution || []);
      setPerformanceData(performanceResult.topProviders || []);
    } catch (error) {
      console.error('خطأ في جلب بيانات الرسوم البيانية:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return <div className="loading">جاري تحميل البيانات...</div>;
  }

  return (
    <div className="maintenance-charts">
      {/* رسم بياني التكاليف */}
      <div className="chart-container">
        <h3>📈 اتجاهات التكاليف الشهرية</h3>
        {costData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => value.toFixed(0)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="#8884d8"
                name="التكلفة (ريال)"
              />
              <Line
                type="monotone"
                dataKey="scheduled"
                stroke="#82ca9d"
                name="مجدولة"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p>لا توجد بيانات</p>
        )}
      </div>

      {/* توزيع المشاكل */}
      <div className="chart-container">
        <h3>🔴 توزيع المشاكل حسب النوع</h3>
        {issuesData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={issuesData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {issuesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p>لا توجد بيانات</p>
        )}
      </div>

      {/* أداء مراكز الصيانة */}
      <div className="chart-container">
        <h3>⭐ أداء مراكز الصيانة</h3>
        {performanceData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="rating" fill="#82ca9d" name="التقييم" />
              <Bar dataKey="completionRate" fill="#8884d8" name="نسبة الإنجاز" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p>لا توجد بيانات</p>
        )}
      </div>

      <button className="btn btn-primary" onClick={fetchChartData}>
        🔄 تحديث الرسوم البيانية
      </button>
    </div>
  );
};

export default MaintenanceCharts;
