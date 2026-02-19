/**
 * لوحة التحليلات المتقدمة
 * Payroll Analytics Dashboard Component
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PayrollAnalyticsDashboard.css';

const PayrollAnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    department: 'all',
    status: 'all'
  });

  useEffect(() => {
    loadAnalytics();
  }, [filters]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams(filters);
      const response = await axios.get(
        `/api/payroll/analytics?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalytics(response.data);
      setError(null);
    } catch (err) {
      setError('خطأ في تحميل التحليلات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams(filters);
    window.open(
      `/api/payroll/analytics/export/pdf?${params.toString()}`,
      '_blank',
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
  };

  const handleExportExcel = () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams(filters);
    window.open(
      `/api/payroll/analytics/export/excel?${params.toString()}`,
      '_blank'
    );
  };

  if (loading) {
    return <div className="analytics-loading">جاري تحميل التحليلات...</div>;
  }

  if (error) {
    return <div className="analytics-error">{error}</div>;
  }

  if (!analytics) {
    return <div className="analytics-no-data">لا توجد بيانات للعرض</div>;
  }

  const {
    summary = {},
    payrollStats = {},
    departmentStats = [],
    incentiveStats = {},
    deductionStats = {},
    trends = [],
    topPerformers = [],
    salaryDistribution = []
  } = analytics;

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h2>لوحة تحليلات الرواتب والحوافز</h2>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label>من التاريخ:</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
            />
          </div>

          <div className="filter-group">
            <label>إلى التاريخ:</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
            />
          </div>

          <div className="filter-group">
            <label>القسم:</label>
            <select
              value={filters.department}
              onChange={(e) =>
                setFilters({ ...filters, department: e.target.value })
              }
            >
              <option value="all">الكل</option>
              <option value="IT">تقنية المعلومات</option>
              <option value="HR">الموارد البشرية</option>
              <option value="Finance">المالية</option>
              <option value="Operations">العمليات</option>
            </select>
          </div>

          <div className="filter-group">
            <label>الحالة:</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="all">الكل</option>
              <option value="processed">معالج</option>
              <option value="pending">قيد الانتظار</option>
              <option value="approved">موافق عليه</option>
              <option value="paid">تم الدفع</option>
            </select>
          </div>

          <div className="export-buttons">
            <button className="btn-export-pdf" onClick={handleExportPDF}>
              📄 تصدير PDF
            </button>
            <button className="btn-export-excel" onClick={handleExportExcel}>
              📊 تصدير Excel
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-section">
        <div className="metric-card">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <h4>عدد الموظفين</h4>
            <p className="metric-value">{summary.totalEmployees || 0}</p>
            <span className="metric-subtitle">موظف نشط</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <h4>إجمالي الرواتب</h4>
            <p className="metric-value">
              {(summary.totalPayroll || 0).toLocaleString('ar-SA')} ر.س
            </p>
            <span className="metric-subtitle">الشهر الحالي</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⭐</div>
          <div className="metric-content">
            <h4>الحوافز</h4>
            <p className="metric-value">
              {(incentiveStats.total || 0).toLocaleString('ar-SA')} ر.س
            </p>
            <span className="metric-subtitle">
              {incentiveStats.count || 0} حافز
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📉</div>
          <div className="metric-content">
            <h4>الخصومات</h4>
            <p className="metric-value">
              {(deductionStats.total || 0).toLocaleString('ar-SA')} ر.س
            </p>
            <span className="metric-subtitle">
              {deductionStats.types?.length || 0} نوع
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <h4>متوسط الراتب</h4>
            <p className="metric-value">
              {(summary.averageSalary || 0).toLocaleString('ar-SA')} ر.س
            </p>
            <span className="metric-subtitle">للموظف الواحد</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <h4>معدل الموافقة</h4>
            <p className="metric-value">{payrollStats.approvalRate || 0}%</p>
            <span className="metric-subtitle">الرواتب الموافق عليها</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Department Distribution */}
        <div className="chart-container">
          <h3>توزيع الرواتب حسب القسم</h3>
          <div className="department-chart">
            {departmentStats.map((dept, idx) => (
              <div key={idx} className="chart-item">
                <div className="chart-bar-container">
                  <div className="chart-bar" style={{
                    width: `${(dept.total / (summary.totalPayroll || 1)) * 100}%`,
                    backgroundColor: `hsl(${idx * 60}, 70%, 60%)`
                  }}></div>
                </div>
                <div className="chart-label">
                  <span>{dept.name}</span>
                  <strong>{dept.total.toLocaleString('ar-SA')} ر.س</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deductions Breakdown */}
        <div className="chart-container">
          <h3>توزيع الخصومات</h3>
          <div className="deductions-chart">
            {deductionStats.types?.map((type, idx) => (
              <div key={idx} className="deduction-item">
                <div className="deduction-label">
                  <span>{type.name}</span>
                  <strong>{type.percentage}%</strong>
                </div>
                <div className="deduction-bar">
                  <div
                    className="deduction-fill"
                    style={{
                      width: `${type.percentage}%`,
                      backgroundColor: type.color || `hsl(${idx * 45}, 70%, 60%)`
                    }}
                  ></div>
                </div>
                <span className="deduction-amount">
                  {type.total.toLocaleString('ar-SA')} ر.س
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Salary Distribution */}
      <div className="salary-distribution">
        <h3>توزيع الرواتب</h3>
        <div className="distribution-table">
          <div className="dist-header">
            <div className="dist-col">نطاق الراتب</div>
            <div className="dist-col">عدد الموظفين</div>
            <div className="dist-col">النسبة</div>
            <div className="dist-col">التوزيع</div>
          </div>
          {salaryDistribution.map((range, idx) => (
            <div key={idx} className="dist-row">
              <div className="dist-col">{range.range}</div>
              <div className="dist-col">{range.count}</div>
              <div className="dist-col">{range.percentage}%</div>
              <div className="dist-col">
                <div className="dist-bar-bg">
                  <div
                    className="dist-bar-fill"
                    style={{ width: `${range.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performers */}
      {topPerformers && topPerformers.length > 0 && (
        <div className="top-performers">
          <h3>أفضل الموظفين أداءً (الحوافز)</h3>
          <div className="performers-grid">
            {topPerformers.slice(0, 5).map((performer, idx) => (
              <div key={idx} className="performer-card">
                <div className="performer-rank">#{idx + 1}</div>
                <div className="performer-info">
                  <h4>{performer.employeeName}</h4>
                  <p className="performer-dept">{performer.department}</p>
                  <p className="performer-amount">
                    {performer.totalIncentives.toLocaleString('ar-SA')} ر.س
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends */}
      {trends && trends.length > 0 && (
        <div className="trends-section">
          <h3>الاتجاهات الشهرية</h3>
          <div className="trends-table">
            <div className="trends-header">
              <div className="trends-col">الشهر</div>
              <div className="trends-col">إجمالي الرواتب</div>
              <div className="trends-col">الحوافز</div>
              <div className="trends-col">الخصومات</div>
              <div className="trends-col">عدد الموظفين</div>
            </div>
            {trends.map((trend, idx) => (
              <div key={idx} className="trends-row">
                <div className="trends-col">{trend.month}</div>
                <div className="trends-col">
                  {trend.totalPayroll?.toLocaleString('ar-SA')} ر.س
                </div>
                <div className="trends-col">
                  {trend.totalIncentives?.toLocaleString('ar-SA')} ر.س
                </div>
                <div className="trends-col">
                  {trend.totalDeductions?.toLocaleString('ar-SA')} ر.س
                </div>
                <div className="trends-col">{trend.employeeCount}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="summary-stats">
        <h3>ملخص إحصائي</h3>
        <div className="stats-grid">
          <div className="stat-box">
            <h5>أعلى راتب</h5>
            <p>{(summary.maxSalary || 0).toLocaleString('ar-SA')} ر.س</p>
          </div>
          <div className="stat-box">
            <h5>أقل راتب</h5>
            <p>{(summary.minSalary || 0).toLocaleString('ar-SA')} ر.س</p>
          </div>
          <div className="stat-box">
            <h5>إجمالي الحوافز</h5>
            <p>{(incentiveStats.total || 0).toLocaleString('ar-SA')} ر.س</p>
          </div>
          <div className="stat-box">
            <h5>إجمالي الخصومات</h5>
            <p>{(deductionStats.total || 0).toLocaleString('ar-SA')} ر.س</p>
          </div>
          <div className="stat-box">
            <h5>متوسط الحافز</h5>
            <p>
              {incentiveStats.average
                ? (incentiveStats.average).toLocaleString('ar-SA')
                : 0}{' '}
              ر.س
            </p>
          </div>
          <div className="stat-box">
            <h5>متوسط الخصم</h5>
            <p>
              {deductionStats.average
                ? (deductionStats.average).toLocaleString('ar-SA')
                : 0}{' '}
              ر.س
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollAnalyticsDashboard;
