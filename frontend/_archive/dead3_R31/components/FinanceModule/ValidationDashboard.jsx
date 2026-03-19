/**
 * ValidationDashboard.jsx
 * لوحة تحقق شاملة للسياسات والامتثال المالي
 * 400+ سطر من المكون عالي الأداء
 */

import React, { useState, useEffect, useCallback } from 'react';
import './ValidationDashboard.css';
import { getToken } from '../../utils/tokenStorage';

const ValidationDashboard = ({ organizationId }) => {
  // ===== STATE MANAGEMENT =====
  const [violations, setViolations] = useState([]);
  const [filteredViolations, setFilteredViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [complianceRate, setComplianceRate] = useState(0);
  const [_statisticsData, setStatisticsData] = useState(null);

  // الفلاتر
  const [filters, setFilters] = useState({
    severity: 'all', // all, critical, high, medium, low
    type: 'all', // all, policy, compliance, audit, system
    dateRange: 'all', // all, today, week, month, custom
    status: 'all' // all, open, resolved, pending
  });

  // ===== DATA FETCHING =====
  useEffect(() => {
    fetchViolations();
    const interval = setInterval(fetchViolations, 30000); // تحديث كل 30 ثانية
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const fetchViolations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/finance/validation/violations-report?organizationId=${organizationId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          }
        }
      );

      if (!response.ok) throw new Error('فشل جلب البيانات');

      const data = await response.json();
      setViolations(data.violations || []);
      setComplianceRate(data.complianceRate || 0);
      setStatisticsData(data.statistics || {});
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Validation fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // ===== FILTERING LOGIC =====
  useEffect(() => {
    let result = [...violations];

    // تطبيق الفلاتر
    if (filters.severity !== 'all') {
      result = result.filter(v => v.severity === filters.severity);
    }

    if (filters.type !== 'all') {
      result = result.filter(v => v.type === filters.type);
    }

    if (filters.status !== 'all') {
      result = result.filter(v => v.status === filters.status);
    }

    if (filters.dateRange !== 'all') {
      const now = new Date();
      const dateFilter = getDateRangeFilter(filters.dateRange, now);
      result = result.filter(v => new Date(v.createdAt) >= dateFilter);
    }

    setFilteredViolations(result);
  }, [violations, filters]);

  const getDateRangeFilter = (range, now) => {
    const ranges = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getFullYear(), now.getMonth(), 1),
      custom: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    };
    return ranges[range] || now;
  };

  // ===== HANDLERS =====
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      severity: 'all',
      type: 'all',
      dateRange: 'all',
      status: 'all'
    });
  };

  const handleSelectViolation = (violation) => {
    setSelectedViolation(violation);
    setShowDetailModal(true);
  };

  const handleResolveViolation = async (violationId) => {
    try {
      const response = await fetch(
        `/api/finance/validation/violations/${violationId}/resolve`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          },
          body: JSON.stringify({ resolvedBy: 'current-user-id' })
        }
      );

      if (response.ok) {
        setFilteredViolations(prev =>
          prev.map(v => v.id === violationId ? { ...v, status: 'resolved' } : v)
        );
      }
    } catch (err) {
      console.error('Failed to resolve violation:', err);
    }
  };

  const handleExportReport = (format) => {
    const data = {
      format,
      violations: filteredViolations,
      timestamp: new Date().toISOString(),
      complianceRate
    };

    fetch('/api/finance/validation/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `validation-report-${new Date().toISOString().slice(0, 10)}.${format}`;
        a.click();
      });
  };

  // ===== SUB-COMPONENTS =====

  const Header = () => (
    <div className="validation-header">
      <div className="header-content">
        <h1>📋 لوحة التحقق والامتثال</h1>
        <p className="header-subtitle">رقابة شاملة على سياسات وامتثال المؤسسة</p>
      </div>

      <div className="header-actions">
        <button
          className="btn btn-primary"
          onClick={fetchViolations}
          disabled={loading}
        >
          {loading ? '⏳ جاري التحديث...' : '🔄 تحديث الآن'}
        </button>

        <div className="export-group">
          <button
            className="btn btn-secondary"
            onClick={() => handleExportReport('pdf')}
          >
            📄 تصدير PDF
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleExportReport('excel')}
          >
            📊 تصدير Excel
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => window.print()}
          >
            🖨️ طباعة
          </button>
        </div>
      </div>
    </div>
  );

  const StatisticsCards = () => (
    <div className="statistics-grid">
      <div className={`stat-card critical`}>
        <div className="stat-icon">🚨</div>
        <div className="stat-content">
          <div className="stat-value">
            {filteredViolations.filter(v => v.severity === 'critical').length}
          </div>
          <div className="stat-label">انتهاكات حرجة</div>
        </div>
      </div>

      <div className={`stat-card high`}>
        <div className="stat-icon">⚠️</div>
        <div className="stat-content">
          <div className="stat-value">
            {filteredViolations.filter(v => v.severity === 'high').length}
          </div>
          <div className="stat-label">انتهاكات عالية</div>
        </div>
      </div>

      <div className={`stat-card compliance`}>
        <div className="stat-icon">✅</div>
        <div className="stat-content">
          <div className="stat-value">{complianceRate.toFixed(1)}%</div>
          <div className="stat-label">معدل الامتثال</div>
        </div>
      </div>

      <div className={`stat-card resolution`}>
        <div className="stat-icon">🎯</div>
        <div className="stat-content">
          <div className="stat-value">
            {filteredViolations.filter(v => v.status === 'resolved').length}
          </div>
          <div className="stat-label">تم حلها</div>
        </div>
      </div>
    </div>
  );

  const FiltersPanel = () => (
    <div className="filters-panel">
      <div className="filter-group">
        <label>🎯 مستوى الخطورة:</label>
        <select
          value={filters.severity}
          onChange={e => handleFilterChange('severity', e.target.value)}
        >
          <option value="all">الكل</option>
          <option value="critical">🚨 حرجة</option>
          <option value="high">⚠️ عالية</option>
          <option value="medium">🟡 متوسطة</option>
          <option value="low">🟢 منخفضة</option>
        </select>
      </div>

      <div className="filter-group">
        <label>📂 نوع الانتهاك:</label>
        <select
          value={filters.type}
          onChange={e => handleFilterChange('type', e.target.value)}
        >
          <option value="all">الكل</option>
          <option value="policy">سياسة</option>
          <option value="compliance">امتثال</option>
          <option value="audit">تدقيق</option>
          <option value="system">نظام</option>
        </select>
      </div>

      <div className="filter-group">
        <label>📅 النطاق الزمني:</label>
        <select
          value={filters.dateRange}
          onChange={e => handleFilterChange('dateRange', e.target.value)}
        >
          <option value="all">الكل</option>
          <option value="today">اليوم</option>
          <option value="week">هذا الأسبوع</option>
          <option value="month">هذا الشهر</option>
          <option value="custom">آخر 90 يوم</option>
        </select>
      </div>

      <div className="filter-group">
        <label>🏷️ الحالة:</label>
        <select
          value={filters.status}
          onChange={e => handleFilterChange('status', e.target.value)}
        >
          <option value="all">الكل</option>
          <option value="open">مفتوحة</option>
          <option value="pending">قيد الانتظار</option>
          <option value="resolved">محلولة</option>
        </select>
      </div>

      <button className="btn btn-reset" onClick={handleResetFilters}>
        🔄 إعادة تعيين
      </button>
    </div>
  );

  const ViolationsTable = () => (
    <div className="violations-table-container">
      <h3>📊 جدول الانتهاكات</h3>
      {filteredViolations.length === 0 ? (
        <div className="no-data">
          <p>✅ لا توجد انتهاكات مطابقة للفلاتر</p>
        </div>
      ) : (
        <table className="violations-table">
          <thead>
            <tr>
              <th>#</th>
              <th>الخطورة</th>
              <th>النوع</th>
              <th>الوصف</th>
              <th>التاريخ</th>
              <th>الحالة</th>
              <th>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {filteredViolations.map((violation, index) => (
              <tr key={violation.id} className={`severity-${violation.severity}`}>
                <td>{index + 1}</td>
                <td>
                  <span className={`badge severity-${violation.severity}`}>
                    {violation.severity}
                  </span>
                </td>
                <td>{violation.type}</td>
                <td className="description">{violation.description}</td>
                <td>{new Date(violation.createdAt).toLocaleDateString('ar-SA')}</td>
                <td>
                  <span className={`status-badge ${violation.status}`}>
                    {violation.status}
                  </span>
                </td>
                <td className="actions">
                  <button
                    className="btn-small btn-info"
                    onClick={() => handleSelectViolation(violation)}
                  >
                    👁️ عرض
                  </button>
                  {violation.status !== 'resolved' && (
                    <button
                      className="btn-small btn-success"
                      onClick={() => handleResolveViolation(violation.id)}
                    >
                      ✓ حل
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const DetailModal = () => {
    if (!showDetailModal || !selectedViolation) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📌 تفاصيل الانتهاك</h2>
            <button
              className="btn-close"
              onClick={() => setShowDetailModal(false)}
            >
              ✕
            </button>
          </div>

          <div className="modal-body">
            <div className="detail-section">
              <h4>معلومات أساسية</h4>
              <p>
                <strong>الخطورة:</strong>
                <span className={`badge severity-${selectedViolation.severity}`}>
                  {selectedViolation.severity}
                </span>
              </p>
              <p>
                <strong>النوع:</strong> {selectedViolation.type}
              </p>
              <p>
                <strong>الوصف:</strong> {selectedViolation.description}
              </p>
              <p>
                <strong>التاريخ:</strong>{' '}
                {new Date(selectedViolation.createdAt).toLocaleString('ar-SA')}
              </p>
            </div>

            <div className="detail-section">
              <h4>الحالة والإجراء</h4>
              <p>
                <strong>الحالة الحالية:</strong>
                <span className={`status-badge ${selectedViolation.status}`}>
                  {selectedViolation.status}
                </span>
              </p>
              <p>
                <strong>آخر تحديث:</strong>{' '}
                {new Date(selectedViolation.updatedAt).toLocaleString('ar-SA')}
              </p>
            </div>

            {selectedViolation.recommendations && (
              <div className="detail-section">
                <h4>التوصيات</h4>
                <ul>
                  {selectedViolation.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="modal-footer">
            {selectedViolation.status !== 'resolved' && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  handleResolveViolation(selectedViolation.id);
                  setShowDetailModal(false);
                }}
              >
                ✓ وضع كمحلول
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => setShowDetailModal(false)}
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ===== RENDER =====
  if (error) {
    return (
      <div className="validation-dashboard error">
        <div className="error-alert">
          <p>❌ خطأ: {error}</p>
          <button onClick={fetchViolations} className="btn btn-primary">
            إعادة محاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="validation-dashboard">
      <Header />
      <StatisticsCards />
      <FiltersPanel />
      <ViolationsTable />
      <DetailModal />
    </div>
  );
};

export default ValidationDashboard;
