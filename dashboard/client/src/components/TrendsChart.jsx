import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getTrends } from '../utils/api';
import './TrendsChart.css';

function TrendsChart({ service }) {
  const [trends, setTrends] = useState([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrends();
  }, [service, days]);

  const loadTrends = async () => {
    try {
      setLoading(true);
      const data = await getTrends(service, days);
      setTrends(data);
    } catch (error) {
      console.error('Failed to load trends:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">⏳ جاري التحميل...</div>;
  }

  if (!trends || trends.length === 0) {
    return <div className="no-data">لا توجد بيانات كافية لعرض الاتجاهات</div>;
  }

  const chartData = trends.map(item => ({
    date: new Date(item.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
    'نسبة النجاح': item.successRate,
    'التغطية': item.avgCoverage,
    'عدد الاختبارات': item.totalTests
  }));

  return (
    <div className="trends-chart">
      <div className="chart-controls">
        <label htmlFor="days-select">عرض آخر:</label>
        <select
          id="days-select"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>7 أيام</option>
          <option value={14}>14 يوم</option>
          <option value={30}>30 يوم</option>
          <option value={90}>90 يوم</option>
        </select>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ddd',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="نسبة النجاح"
            stroke="#4caf50"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="التغطية"
            stroke="#2196f3"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {service && (
        <div className="trend-summary">
          <h4>ملخص اتجاهات: {service}</h4>
          <div className="summary-cards">
            <div className="summary-card">
              <span className="summary-label">متوسط النجاح:</span>
              <span className="summary-value">
                {(trends.reduce((sum, t) => sum + t.successRate, 0) / trends.length).toFixed(1)}%
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">متوسط التغطية:</span>
              <span className="summary-value">
                {(trends.reduce((sum, t) => sum + (t.avgCoverage || 0), 0) / trends.length).toFixed(1)}%
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">إجمالي الاختبارات:</span>
              <span className="summary-value">
                {Math.max(...trends.map(t => t.totalTests))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrendsChart;
