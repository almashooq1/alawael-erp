import React, { useState } from 'react';
import './PayrollDashboard.css';
import axios from 'axios';

// الحوار المؤكد (Confirmation Modal)
const ConfirmDialog = ({ title, message, onConfirm, onCancel }) => (
  <div className="dialog-overlay">
    <div className="dialog-content">
      <h3>{title}</h3>
      <p>{message}</p>
      <div className="dialog-actions">
        <button className="btn btn-success" onClick={onConfirm}>
          تأكيد
        </button>
        <button className="btn btn-cancel" onClick={onCancel}>
          إلغاء
        </button>
      </div>
    </div>
  </div>
);

// صف الراتب (Payroll Row Component)
const PayrollRow = ({ payroll, onApprove }) => {
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/payroll/${payroll._id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onApprove();
    } catch (error) {
      console.error('خطأ في الموافقة:', error);
    } finally {
      setApproving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    const colors = {
      'draft': '#6c757d',
      'pending-approval': '#ffc107',
      'approved': '#28a745',
      'processed': '#17a2b8',
      'transferred': '#0056b3',
      'paid': '#20c997',
    };
    return colors[status] || '#000';
  };

  return (
    <>
      <tr onClick={() => setExpanded(!expanded)}>
        <td style={{ width: '20%' }}>{payroll.employeeName}</td>
        <td style={{ width: '15%' }}>{payroll.departmentId}</td>
        <td style={{ width: '15%' }} style={{ color: getStatusColor(payroll.status) }}>
          {payroll.status}
        </td>
        <td style={{ width: '15%', textAlign: 'right' }}>
          {formatCurrency(payroll.calculations?.totalGross || 0)}
        </td>
        <td style={{ width: '15%', textAlign: 'right' }}>
          {formatCurrency(payroll.calculations?.totalNet || 0)}
        </td>
        <td style={{ width: '20%' }}>
          {payroll.status === 'pending-approval' && (
            <button
              className="btn-small btn-approve"
              onClick={(e) => {
                e.stopPropagation();
                handleApprove();
              }}
              disabled={approving}
            >
              {approving ? 'جاري...' : 'موافقة'}
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="details-row">
          <td colSpan="6">
            <div className="payroll-details">
              <div className="detail-column">
                <h4>المزايا</h4>
                <div>{formatCurrency(payroll.calculations?.totalAllowances || 0)}</div>
              </div>
              <div className="detail-column">
                <h4>الحوافز</h4>
                <div>{formatCurrency(payroll.calculations?.totalIncentives || 0)}</div>
              </div>
              <div className="detail-column">
                <h4>الخصومات</h4>
                <div>{formatCurrency(payroll.calculations?.totalDeductions || 0)}</div>
              </div>
              <div className="detail-column">
                <h4>الضريبة</h4>
                <div>{formatCurrency(payroll.taxes?.incomeTax?.amount || 0)}</div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// مكون لوحة التحكم الرئيسي
export default function PayrollDashboard() {
  const [monthData, setMonthData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [stats, setStats] = useState({
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0,
    employeeCount: 0,
  });
  const [departmentStats, setDepartmentStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // تحميل بيانات الشهر
  const loadMonthlyPayroll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [month, year] = selectedMonth.split('-');
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `/api/payroll/monthly/${month}/${year}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMonthData(response.data.payrolls || []);
      loadStatistics();
    } catch (err) {
      setError('خطأ في تحميل البيانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // تحميل الإحصائيات
  const loadStatistics = async () => {
    try {
      const [month, year] = selectedMonth.split('-');
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `/api/payroll/stats/${month}/${year}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const { monthlySummary, departmentBreakdown } = response.data;
      setStats(monthlySummary);
      setDepartmentStats(departmentBreakdown || []);
    } catch (err) {
      console.error('خطأ في الإحصائيات:', err);
    }
  };

  // معالجة الرواتب الشهرية
  const handleProcessPayroll = async () => {
    try {
      const [month, year] = selectedMonth.split('-');
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `/api/payroll/process-monthly`,
        { month, year },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(`تم معالجة ${response.data.processed?.length || 0} راتب بنجاح`);
      loadMonthlyPayroll();
    } catch (err) {
      alert('خطأ في المعالجة: ' + err.message);
    } finally {
      setShowConfirm(false);
    }
  };

  // معالجة الموافقة الجماعية
  const handleApproveAll = async () => {
    try {
      const token = localStorage.getItem('token');
      let approved = 0;
      
      for (const payroll of monthData) {
        if (payroll.status === 'pending-approval') {
          try {
            await axios.put(
              `/api/payroll/${payroll._id}/approve`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
            approved++;
          } catch (err) {
            console.error('خطأ في موافقة راتب:', err);
          }
        }
      }
      
      alert(`تمت الموافقة على ${approved} راتب`);
      loadMonthlyPayroll();
    } finally {
      setShowConfirm(false);
    }
  };

  // صيغة العملة
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount || 0);
  };

  React.useEffect(() => {
    loadMonthlyPayroll();
  }, [selectedMonth]);

  if (loading) {
    return <div className="loading-spinner">جاري التحميل...</div>;
  }

  return (
    <div className="payroll-dashboard">
      {showConfirm && (
        <ConfirmDialog
          title={confirmAction?.title}
          message={confirmAction?.message}
          onConfirm={confirmAction?.onConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* رأس لوحة التحكم */}
      <div className="dashboard-header">
        <h2>لوحة تحكم الرواتب</h2>
        <button
          className="btn btn-primary"
          onClick={() => window.print()}
        >
          طباعة
        </button>
      </div>

      {/* التحكم والفلاتر */}
      <div className="dashboard-controls">
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
        />
        
        <button
          className="btn btn-success"
          onClick={() => {
            setConfirmAction({
              title: 'معالجة الرواتب الشهرية',
              message: 'هل تريد معالجة رواتب جميع الموظفين لهذا الشهر؟',
              onConfirm: handleProcessPayroll
            });
            setShowConfirm(true);
          }}
        >
          معالجة الرواتب
        </button>
        
        <button
          className="btn btn-success"
          onClick={() => {
            setConfirmAction({
              title: 'الموافقة الجماعية',
              message: 'هل تريد الموافقة على جميع الرواتب المعلقة؟',
              onConfirm: handleApproveAll
            });
            setShowConfirm(true);
          }}
        >
          موافقة جماعية
        </button>
      </div>

      {/* شبكة الإحصائيات */}
      <div className="statistics-grid">
        <div className="stat-card">
          <h3>إجمالي الرواتب</h3>
          <strong style={{ color: '#28a745' }}>
            {formatCurrency(stats.totalGross)}
          </strong>
        </div>
        <div className="stat-card">
          <h3>الخصومات</h3>
          <strong style={{ color: '#dc3545' }}>
            {formatCurrency(stats.totalDeductions)}
          </strong>
        </div>
        <div className="stat-card">
          <h3>الرواتب الصافية</h3>
          <strong style={{ color: '#007bff' }}>
            {formatCurrency(stats.totalNet)}
          </strong>
        </div>
        <div className="stat-card">
          <h3>عدد الموظفين</h3>
          <strong>{stats.employeeCount}</strong>
        </div>
      </div>

      {/* جدول الرواتب */}
      <div className="payroll-table-container">
        <table className="payroll-table">
          <thead>
            <tr>
              <th>اسم الموظف</th>
              <th>القسم</th>
              <th>الحالة</th>
              <th style={{ textAlign: 'right' }}>الراتب الإجمالي</th>
              <th style={{ textAlign: 'right' }}>الراتب الصافي</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {monthData.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                  لا توجد بيانات للعرض
                </td>
              </tr>
            ) : (
              monthData.map((payroll) => (
                <PayrollRow
                  key={payroll._id}
                  payroll={payroll}
                  onApprove={loadMonthlyPayroll}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* إحصائيات حسب القسم */}
      {departmentStats.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h3 style={{ marginBottom: '20px' }}>الإحصائيات حسب القسم</h3>
          <div className="payroll-table-container">
            <table className="payroll-table">
              <thead>
                <tr>
                  <th>اسم القسم</th>
                  <th style={{ textAlign: 'right' }}>عدد الموظفين</th>
                  <th style={{ textAlign: 'right' }}>إجمالي</th>
                  <th style={{ textAlign: 'right' }}>المتوسط</th>
                </tr>
              </thead>
              <tbody>
                {departmentStats.map((dept, idx) => (
                  <tr key={idx}>
                    <td>{dept.departmentName}</td>
                    <td style={{ textAlign: 'right' }}>{dept.count}</td>
                    <td style={{ textAlign: 'right', color: '#28a745' }}>
                      {formatCurrency(dept.totalGross)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {formatCurrency(dept.avgSalary)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
