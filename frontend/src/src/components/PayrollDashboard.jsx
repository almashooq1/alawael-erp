/**
 * Payroll Dashboard Component
 * مكون لوحة تحكم الرواتب والحوافز
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PayrollDashboard.css';

const PayrollDashboard = () => {
  const [monthData, setMonthData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // جلب بيانات الشهر
  useEffect(() => {
    loadMonthlyPayroll();
  }, [selectedMonth]);

  const loadMonthlyPayroll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [month, year] = selectedMonth.split('-');
      const response = await axios.get(`${API_BASE}/payroll/monthly/${month}-${year}/${year}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      setMonthData(response.data.data);
      loadStatistics(month, year);
    } catch (err) {
      setError('فشل تحميل بيانات الرواتب');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async (month, year) => {
    try {
      const response = await axios.get(`${API_BASE}/payroll/stats/${month}-${year}/${year}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setStats(response.data.data);
    } catch (err) {
      console.error('خطأ في جلب الإحصائيات:', err);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const handleProcessPayroll = async () => {
    if (!window.confirm('هل أنت متأكد من معالجة رواتب هذا الشهر؟')) {
      return;
    }

    try {
      setLoading(true);
      const [month, year] = selectedMonth.split('-');
      await axios.post(
        `${API_BASE}/payroll/process-monthly`,
        { month: `${month}-${year}`, year: parseInt(year) },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      alert('تمت معالجة الرواتب بنجاح');
      loadMonthlyPayroll();
    } catch (err) {
      setError('فشل معالجة الرواتب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payroll-dashboard">
      <div className="dashboard-header">
        <h2>لوحة تحكم الرواتب والحوافز</h2>
        <button onClick={() => window.print()} className="btn-print">
          طباعة
        </button>
      </div>

      {/* القسم العلوي - المرشحات والإحصائيات */}
      <div className="dashboard-controls">
        <div className="control-group">
          <label htmlFor="month-select">الشهر والسنة:</label>
          <input
            id="month-select"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="action-buttons">
          <button
            onClick={handleProcessPayroll}
            className="btn btn-primary"
            disabled={loading || !monthData?.length}
          >
            {loading ? 'جاري المعالجة...' : 'معالجة الرواتب'}
          </button>
          <button onClick={loadMonthlyPayroll} className="btn btn-secondary" disabled={loading}>
            تحديث البيانات
          </button>
        </div>
      </div>

      {/* الإحصائيات الإجمالية */}
      {stats && (
        <div className="statistics-grid">
          <div className="stat-card">
            <div className="stat-label">إجمالي الرواتب الإجمالية</div>
            <div className="stat-value">
              {formatCurrency(stats.monthly?.totalGross || 0)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">إجمالي الخصومات</div>
            <div className="stat-value">
              {formatCurrency(stats.monthly?.totalDeductions || 0)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">إجمالي الرواتب الصافية</div>
            <div className="stat-value highlight">
              {formatCurrency(stats.monthly?.totalNet || 0)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">عدد الموظفين</div>
            <div className="stat-value">{stats.monthly?.employeeCount || 0}</div>
          </div>
        </div>
      )}

      {/* رسالة الخطأ */}
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* جدول الرواتب */}
      {loading ? (
        <div className="loading-spinner">جاري التحميل...</div>
      ) : monthData?.length > 0 ? (
        <div className="payroll-table-container">
          <table className="payroll-table">
            <thead>
              <tr>
                <th>اسم الموظف</th>
                <th>القسم</th>
                <th>الراتب الأساسي</th>
                <th>المزايا</th>
                <th>الحوافز</th>
                <th>الإجمالي</th>
                <th>الخصومات</th>
                <th>الصافي</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {monthData.map((payroll) => (
                <PayrollRow
                  key={payroll._id}
                  payroll={payroll}
                  formatCurrency={formatCurrency}
                  onUpdate={loadMonthlyPayroll}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-data">لا توجد بيانات رواتب للشهر المحدد</div>
      )}

      {/* الإحصائيات حسب القسم */}
      {stats?.byDepartment?.length > 0 && (
        <div className="department-stats">
          <h3>توزيع الرواتب حسب القسم</h3>
          <table className="dept-table">
            <thead>
              <tr>
                <th>القسم</th>
                <th>الإجمالي الإجمالي</th>
                <th>الإجمالي الصافي</th>
                <th>عدد الموظفين</th>
                <th>المتوسط</th>
              </tr>
            </thead>
            <tbody>
              {stats.byDepartment.map((dept) => (
                <tr key={dept._id}>
                  <td>{dept._id}</td>
                  <td>{formatCurrency(dept.totalGross)}</td>
                  <td>{formatCurrency(dept.totalNet)}</td>
                  <td>{dept.employeeCount}</td>
                  <td>{formatCurrency(dept.totalGross / dept.employeeCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/**
 * مكون صف الراتب
 */
const PayrollRow = ({ payroll, formatCurrency, onUpdate }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const handleApprove = async () => {
    if (!window.confirm('هل تريد الموافقة على هذا الراتب؟')) {
      return;
    }

    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/payroll/${payroll._id}/approve`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      alert('تمت الموافقة على الراتب');
      onUpdate();
    } catch (error) {
      alert('فشل الموافقة على الراتب');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      draft: 'مسودة',
      'pending-approval': 'قيد المراجعة',
      approved: 'معتمد',
      processed: 'معالج',
      transferred: 'محول',
      paid: 'مدفوع',
      cancelled: 'ملغى',
    };

    return statusMap[status] || status;
  };

  return (
    <>
      <tr className={`payroll-row ${payroll.payment?.status}`}>
        <td>{payroll.employeeName}</td>
        <td>{payroll.departmentName}</td>
        <td>{formatCurrency(payroll.baseSalary)}</td>
        <td>{formatCurrency(payroll.calculations?.totalAllowances)}</td>
        <td>{formatCurrency(payroll.calculations?.totalIncentives)}</td>
        <td>{formatCurrency(payroll.calculations?.totalGross)}</td>
        <td>{formatCurrency(payroll.calculations?.totalDeductions)}</td>
        <td className="net-salary">
          <strong>{formatCurrency(payroll.calculations?.totalNet)}</strong>
        </td>
        <td>
          <span className={`status-badge ${payroll.payment?.status}`}>
            {getStatusBadge(payroll.payment?.status)}
          </span>
        </td>
        <td>
          <div className="action-buttons">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="btn-small"
              title="عرض التفاصيل"
            >
              {showDetails ? '▼' : '▶'}
            </button>
            {payroll.payment?.status === 'draft' && (
              <button onClick={handleApprove} className="btn-small btn-approve" disabled={actionLoading}>
                موافقة
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* السطر التفصيلي */}
      {showDetails && (
        <tr className="payroll-details">
          <td colSpan="10">
            <div className="details-content">
              <div className="details-column">
                <h4>المزايا</h4>
                {payroll.allowances?.map((allowance, idx) => (
                  <div key={idx} className="detail-item">
                    <span>{allowance.name}:</span>
                    <span>{formatCurrency(allowance.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="details-column">
                <h4>الحوافز</h4>
                {Object.entries(payroll.incentives || {}).map(([key, value]) => {
                  if (typeof value === 'number' && value > 0) {
                    return (
                      <div key={key} className="detail-item">
                        <span>{key}:</span>
                        <span>{formatCurrency(value)}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              <div className="details-column">
                <h4>الخصومات</h4>
                {payroll.deductions?.map((deduction, idx) => (
                  <div key={idx} className="detail-item">
                    <span>{deduction.name}:</span>
                    <span>{formatCurrency(deduction.amount)}</span>
                  </div>
                ))}
                {payroll.taxes && (
                  <>
                    <div className="detail-item">
                      <span>ضريبة الدخل:</span>
                      <span>{formatCurrency(payroll.taxes.incomeTax)}</span>
                    </div>
                    <div className="detail-item">
                      <span>الضمان الاجتماعي:</span>
                      <span>{formatCurrency(payroll.taxes.socialSecurity)}</span>
                    </div>
                    <div className="detail-item">
                      <span>التأمين الصحي:</span>
                      <span>{formatCurrency(payroll.taxes.healthInsurance)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default PayrollDashboard;
