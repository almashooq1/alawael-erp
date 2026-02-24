/**
 * Executive Dashboard Component - React
 * مكون لوحة معلومات الإدارة العليا
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const ExecutiveDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/dashboards/executive', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setDashboardData(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard');
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">جاري التحميل...</div>;
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  if (!dashboardData) {
    return <div>لا توجد بيانات</div>;
  }

  const { kpis, financialOverview, complianceStatus, hrMetrics, trends, alerts, departmentData, riskAssessment } = dashboardData;

  // Prepare chart data
  const departmentChartData = Object.entries(departmentData).map(([dept, data]) => ({
    name: dept,
    headcount: data.headcount,
    budget: data.budget / 1000 // in thousands
  }));

  const complianceTrendData = [
    { month: 'Jan', score: 97.5 },
    { month: 'Feb', score: 98.0 },
    { month: 'Mar', score: 98.5 },
    { month: 'Apr', score: 99.0 },
    { month: 'May', score: 99.2 }
  ];

  return (
    <div className="executive-dashboard">
      <header className="dashboard-header">
        <h1>لوحة معلومات الإدارة العليا</h1>
        <div className="header-actions">
          <button onClick={fetchDashboardData} className="btn btn-refresh">
            تحديث
          </button>
          <button onClick={() => exportDashboard('pdf')} className="btn btn-export">
            تصدير PDF
          </button>
        </div>
      </header>

      {/* Alerts Section */}
      {(alerts.critical.length > 0 || alerts.high.length > 0) && (
        <section className="alerts-section">
          <h2>التنبيهات والتحذيرات</h2>
          {alerts.critical.map(alert => (
            <div key={alert.id} className="alert alert-critical">
              <span className="alert-icon">⚠️</span>
              <div className="alert-content">
                <strong>{alert.message}</strong>
                <p>{alert.action}</p>
              </div>
            </div>
          ))}
          {alerts.high.map(alert => (
            <div key={alert.id} className="alert alert-high">
              <span className="alert-icon">⚡</span>
              <div className="alert-content">
                <strong>{alert.message}</strong>
                <p>{alert.action}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* KPI Cards */}
      <section className="kpi-section">
        <h2>المؤشرات الرئيسية</h2>
        <div className="kpi-grid">
          <KPICard
            title="إجمالي الموظفين"
            value={kpis.totalEmployees}
            subtitle={`${kpis.activeEmployees} نشط`}
            color="#3498db"
          />
          <KPICard
            title="معدل الدوران"
            value={`${kpis.turnoverRate}%`}
            subtitle="سنوي"
            color="#e74c3c"
          />
          <KPICard
            title="درجة الامتثال"
            value={`${kpis.efficiencyMetrics.complianceScore}%`}
            subtitle="ممتاز"
            color="#2ecc71"
          />
          <KPICard
            title="رضا الموظفين"
            value={kpis.efficiencyMetrics.employeeSatisfaction}
            subtitle="من 5"
            color="#f39c12"
          />
          <KPICard
            title="الرواتب الشهرية"
            value={`${(kpis.financialMetrics.monthlyPayroll / 1000).toFixed(0)}K`}
            subtitle="ريال سعودي"
            color="#9b59b6"
          />
          <KPICard
            title="معدل النمو السنوي"
            value={`${kpis.growthMetrics.yoyGrowth}%`}
            subtitle="مقارنة سنة الأساس"
            color="#1abc9c"
          />
        </div>
      </section>

      {/* Financial Overview */}
      <section className="financial-section">
        <h2>نظرة مالية شاملة</h2>
        <div className="financial-grid">
          <div className="financial-card">
            <h3>نفقات الشهر الحالي</h3>
            <div className="amount">{(financialOverview.currentMonth.totalExpenses / 1000).toFixed(0)}K</div>
            <div className="breakdown">
              <div className="item">
                <span>الرواتب</span>
                <span>{(financialOverview.currentMonth.breakdown.salaries / 1000).toFixed(0)}K</span>
              </div>
              <div className="item">
                <span>المزايا</span>
                <span>{(financialOverview.currentMonth.breakdown.benefits / 1000).toFixed(0)}K</span>
              </div>
              <div className="item">
                <span>التأمين</span>
                <span>{(financialOverview.currentMonth.breakdown.insurance / 1000).toFixed(0)}K</span>
              </div>
            </div>
          </div>

          <div className="financial-card">
            <h3>التوقعات السنوية</h3>
            <div className="amount">{(financialOverview.yearlyProjection.estimatedTotal / 1000000).toFixed(1)}M</div>
            <div className="trend" style={{ color: trends.salary.trend === 'increasing' ? '#e74c3c' : '#2ecc71' }}>
              {trends.salary.growthRate}% نمو
            </div>
          </div>
        </div>

        {/* Department Budget Chart */}
        <div className="chart-container">
          <h3>توزيع الميزانية حسب القسم</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="budget" fill="#3498db" name="الميزانية (آلاف)" />
              <Bar dataKey="headcount" fill="#2ecc71" name="عدد الموظفين" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Compliance Status */}
      <section className="compliance-section">
        <h2>حالة الامتثال</h2>
        <div className="compliance-overview">
          <div className="compliance-score">
            <div className="score-circle" style={{ background: `conic-gradient(#2ecc71 0deg ${complianceStatus.overallScore * 3.6}deg, #ecf0f1 ${complianceStatus.overallScore * 3.6}deg)` }}>
              <div className="score-value">{complianceStatus.overallScore}%</div>
            </div>
            <p>الدرجة الإجمالية</p>
          </div>

          <div className="compliance-categories">
            {Object.entries(complianceStatus.categories).map(([category, data]) => (
              <div key={category} className="compliance-item">
                <div className="item-header">
                  <h4>{category}</h4>
                  <span className={`status ${data.status}`}>{data.status}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress" style={{ width: `${data.score}%` }}></div>
                </div>
                <p className="score">{data.score}%</p>
                {data.issues > 0 && <p className="issues">⚠️ {data.issues} مشاكل</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Trend */}
        <div className="chart-container">
          <h3>اتجاه الامتثال</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={complianceTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[95, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#2ecc71" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* HR Metrics */}
      <section className="hr-metrics-section">
        <h2>مقاييس الموارد البشرية</h2>
        <div className="metrics-grid">
          <MetricCard
            title="معدل الاحتفاظ"
            value={`${hrMetrics.retention.retentionRate}%`}
            subtitle="موظفين محتفظ بهم"
            icon="💼"
          />
          <MetricCard
            title="متوسط أداء"
            value={hrMetrics.performance.averagePerformanceScore}
            subtitle="من 5"
            icon="⭐"
          />
          <MetricCard
            title="مراجعات التطوير"
            value={hrMetrics.engagement.trainingHoursPerEmployee}
            subtitle="ساعات تدريب"
            icon="📚"
          />
          <MetricCard
            title="المتقدمون الممتازون"
            value={hrMetrics.performance.highPerformers}
            subtitle="موظف"
            icon="🏆"
          />
        </div>
      </section>

      {/* Risk Assessment */}
      <section className="risk-section">
        <h2>تقييم المخاطر</h2>
        <div className="risk-overview">
          <div className="risk-level">
            <h3>المستوى الكلي: <span className={riskAssessment.overallRiskLevel}>{riskAssessment.overallRiskLevel}</span></h3>
            <div className="risk-score">{riskAssessment.riskScore}</div>
          </div>
          <div className="risk-breakdown">
            {riskAssessment.risks.map((risk, idx) => (
              <div key={idx} className={`risk-item risk-${risk.severity}`}>
                <h4>{risk.description}</h4>
                <p><strong>التخفيف:</strong> {risk.mitigation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="recommendations">
          <h3>التوصيات</h3>
          <ul>
            {riskAssessment.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>تم التحديث في: {new Date().toLocaleString('ar-SA')}</p>
      </footer>
    </div>
  );
};

const KPICard = ({ title, value, subtitle, color }) => (
  <div className="kpi-card" style={{ borderLeftColor: color }}>
    <div className="kpi-value" style={{ color }}>
      {value}
    </div>
    <div className="kpi-title">{title}</div>
    <div className="kpi-subtitle">{subtitle}</div>
  </div>
);

const MetricCard = ({ title, value, subtitle, icon }) => (
  <div className="metric-card">
    <div className="metric-icon">{icon}</div>
    <div className="metric-title">{title}</div>
    <div className="metric-value">{value}</div>
    <div className="metric-subtitle">{subtitle}</div>
  </div>
);

const exportDashboard = async (format) => {
  try {
    const response = await axios.post(
      '/api/dashboards/executive/export',
      { format },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    alert('تم تصدير لوحة المعلومات بنجاح');
  } catch (error) {
    alert('فشل التصدير');
  }
};

export default ExecutiveDashboard;
