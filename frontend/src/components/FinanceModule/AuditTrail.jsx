/**
 * AuditTrail.jsx
 * متتبع سجل التدقيق المتقدم مع الفلترة والبحث
 * 550+ سطر من المكون
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './AuditTrail.css';

const AuditTrail = ({ organizationId }) => {
  // ===== STATE =====
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    dateRange: { from: null, to: null },
    user: 'all',
    operation: 'all', // Create, Update, Delete, View, Export
    entityType: 'all', // Invoice, Journal, Payment, etc.
    severity: 'all' // Critical, High, Medium, Low
  });
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });

  // ===== FETCH DATA =====
  useEffect(() => {
    fetchAuditTrail();
    const interval = setInterval(fetchAuditTrail, 15000); // Real-time updates every 15 seconds
    return () => clearInterval(interval);
  }, [organizationId, filters]);

  const fetchAuditTrail = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        organizationId,
        page: pagination.page,
        pageSize: pagination.pageSize,
        sortKey: sortConfig.key,
        sortDirection: sortConfig.direction
      });

      // Add filter parameters
      if (filters.dateRange.from) queryParams.append('dateFrom', filters.dateRange.from.toISOString());
      if (filters.dateRange.to) queryParams.append('dateTo', filters.dateRange.to.toISOString());
      if (filters.user !== 'all') queryParams.append('userId', filters.user);
      if (filters.operation !== 'all') queryParams.append('operation', filters.operation);
      if (filters.entityType !== 'all') queryParams.append('entityType', filters.entityType);
      if (filters.severity !== 'all') queryParams.append('severity', filters.severity);
      if (searchTerm) queryParams.append('search', searchTerm);

      const response = await fetch(
        `/api/finance/audit-trail?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('فشل جلب سجل التدقيق');

      const data = await response.json();
      setAuditLogs(data.logs || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Audit trail fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, filters, pagination, sortConfig, searchTerm]);

  // ===== HANDLERS =====
  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
    setPagination({ ...pagination, page: 1 }); // Reset to first page
  };

  const handleDateRangeChange = (field, value) => {
    setFilters({
      ...filters,
      dateRange: { ...filters.dateRange, [field]: new Date(value) }
    });
    setPagination({ ...pagination, page: 1 });
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const handleLogClick = async (log) => {
    try {
      const response = await fetch(
        `/api/finance/audit-trail/${log.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const detailedLog = await response.json();
        setSelectedLog(selectedLog?.id === log.id ? null : detailedLog);
      }
    } catch (err) {
      console.error('Failed to fetch log details:', err);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await fetch(
        `/api/finance/audit-trail/export`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ format, filters, organizationId })
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-trail-${new Date().getTime()}.${format}`;
        link.click();
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // ===== STATISTICS =====
  const statistics = useMemo(() => {
    return {
      totalLogs: auditLogs.length,
      creates: auditLogs.filter(l => l.operation === 'Create').length,
      updates: auditLogs.filter(l => l.operation === 'Update').length,
      deletes: auditLogs.filter(l => l.operation === 'Delete').length,
      criticalLogs: auditLogs.filter(l => l.severity === 'Critical').length
    };
  }, [auditLogs]);

  // ===== RENDER COMPONENTS =====

  const StatisticsPanel = () => (
    <div className="statistics-panel">
      <div className="stat-card">
        <span className="stat-label">إجمالي السجلات</span>
        <span className="stat-value">{statistics.totalLogs}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">الإنشاءات</span>
        <span className="stat-value">{statistics.creates}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">التعديلات</span>
        <span className="stat-value">{statistics.updates}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">الحذفات</span>
        <span className="stat-value">{statistics.deletes}</span>
      </div>
      <div className="stat-card critical">
        <span className="stat-label">حرجة</span>
        <span className="stat-value">{statistics.criticalLogs}</span>
      </div>
    </div>
  );

  const SearchAndFilters = () => (
    <div className="search-and-filters">
      <div className="search-box">
        <input
          type="text"
          placeholder="ابحث في السجلات..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <span className="search-icon">🔍</span>
      </div>

      <div className="filters-row">
        <div className="filter-group">
          <label>من:</label>
          <input
            type="date"
            onChange={(e) => handleDateRangeChange('from', e.target.value)}
            className="date-input"
          />
        </div>

        <div className="filter-group">
          <label>إلى:</label>
          <input
            type="date"
            onChange={(e) => handleDateRangeChange('to', e.target.value)}
            className="date-input"
          />
        </div>

        <div className="filter-group">
          <label>المستخدم:</label>
          <select
            value={filters.user}
            onChange={(e) => handleFilterChange('user', e.target.value)}
            className="select-input"
          >
            <option value="all">الكل</option>
            <option value="admin">المسؤول</option>
            <option value="accountant">المحاسب</option>
            <option value="manager">المدير</option>
          </select>
        </div>

        <div className="filter-group">
          <label>العملية:</label>
          <select
            value={filters.operation}
            onChange={(e) => handleFilterChange('operation', e.target.value)}
            className="select-input"
          >
            <option value="all">الكل</option>
            <option value="Create">إنشاء</option>
            <option value="Update">تعديل</option>
            <option value="Delete">حذف</option>
            <option value="View">عرض</option>
            <option value="Export">تصدير</option>
          </select>
        </div>

        <div className="filter-group">
          <label>النوع:</label>
          <select
            value={filters.entityType}
            onChange={(e) => handleFilterChange('entityType', e.target.value)}
            className="select-input"
          >
            <option value="all">الكل</option>
            <option value="Invoice">فاتورة</option>
            <option value="JournalEntry">قيد يومي</option>
            <option value="Payment">دفع</option>
            <option value="User">مستخدم</option>
          </select>
        </div>

        <div className="filter-group">
          <label>الأهمية:</label>
          <select
            value={filters.severity}
            onChange={(e) => handleFilterChange('severity', e.target.value)}
            className="select-input"
          >
            <option value="all">الكل</option>
            <option value="Critical">حرجة</option>
            <option value="High">عالية</option>
            <option value="Medium">متوسطة</option>
            <option value="Low">منخفضة</option>
          </select>
        </div>
      </div>

      <div className="export-actions">
        <button
          className="btn btn-export"
          onClick={() => handleExport('pdf')}
        >
          📄 PDF
        </button>
        <button
          className="btn btn-export"
          onClick={() => handleExport('xlsx')}
        >
          📊 Excel
        </button>
        <button
          className="btn btn-secondary"
          onClick={fetchAuditTrail}
          disabled={loading}
        >
          {loading ? '⏳...' : '🔄 تحديث'}
        </button>
      </div>
    </div>
  );

  const AuditTable = () => (
    <div className="audit-table-container">
      <table className="audit-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('timestamp')} className="sortable">
              التاريخ والوقت {sortConfig.key === 'timestamp' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
            </th>
            <th onClick={() => handleSort('user')} className="sortable">
              المستخدم {sortConfig.key === 'user' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
            </th>
            <th onClick={() => handleSort('operation')} className="sortable">
              العملية {sortConfig.key === 'operation' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
            </th>
            <th>النوع</th>
            <th>المعرف</th>
            <th>الوصف</th>
            <th>الأهمية</th>
            <th>الإجراء</th>
          </tr>
        </thead>
        <tbody>
          {auditLogs.length === 0 ? (
            <tr className="no-data-row">
              <td colSpan="8">لا توجد سجلات تطابق معايير البحث</td>
            </tr>
          ) : (
            auditLogs.map((log) => (
              <tr key={log.id} className={`log-row severity-${log.severity.toLowerCase()}`}>
                <td className="timestamp">
                  {new Date(log.timestamp).toLocaleString('ar-SA')}
                </td>
                <td className="user">{log.user.name}</td>
                <td className={`operation operation-${log.operation.toLowerCase()}`}>
                  {log.operation}
                </td>
                <td className="entity-type">{log.entityType}</td>
                <td className="entity-id">{log.entityId}</td>
                <td className="description">{log.description}</td>
                <td>
                  <span className={`severity-badge severity-${log.severity.toLowerCase()}`}>
                    {log.severity}
                  </span>
                </td>
                <td>
                  <button
                    className="btn-view"
                    onClick={() => handleLogClick(log)}
                  >
                    {selectedLog?.id === log.id ? '✕' : '👁️'}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const DetailPanel = () => {
    if (!selectedLog) return null;

    return (
      <div className="detail-panel">
        <div className="detail-header">
          <h3>تفاصيل السجل</h3>
          <button
            className="btn-close"
            onClick={() => setSelectedLog(null)}
          >
            ×
          </button>
        </div>

        <div className="detail-content">
          <div className="detail-section">
            <h4>معلومات عامة</h4>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="label">التاريخ والوقت</span>
                <span className="value">{new Date(selectedLog.timestamp).toLocaleString('ar-SA')}</span>
              </div>
              <div className="detail-item">
                <span className="label">المستخدم</span>
                <span className="value">{selectedLog.user.name}</span>
              </div>
              <div className="detail-item">
                <span className="label">العملية</span>
                <span className={`value operation-${selectedLog.operation.toLowerCase()}`}>
                  {selectedLog.operation}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">الأهمية</span>
                <span className={`value severity-${selectedLog.severity.toLowerCase()}`}>
                  {selectedLog.severity}
                </span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h4>بيانات الكيان</h4>
            <div className="detail-grid">
              <div className="detail-item full-width">
                <span className="label">النوع</span>
                <span className="value">{selectedLog.entityType}</span>
              </div>
              <div className="detail-item full-width">
                <span className="label">المعرف</span>
                <span className="value monospace">{selectedLog.entityId}</span>
              </div>
            </div>
          </div>

          {selectedLog.changes && (
            <div className="detail-section">
              <h4>المقارنة (قبل ❌ وبعد ✅)</h4>
              <div className="comparison-table">
                <div className="comparison-header">
                  <div className="comp-before">القيمة السابقة</div>
                  <div className="comp-field">الحقل</div>
                  <div className="comp-after">القيمة الجديدة</div>
                </div>
                {Object.entries(selectedLog.changes).map(([field, change]) => (
                  <div key={field} className="comparison-row">
                    <div className="comp-before">
                      {typeof change.before === 'object' 
                        ? JSON.stringify(change.before, null, 2)
                        : change.before
                      }
                    </div>
                    <div className="comp-field">{field}</div>
                    <div className="comp-after">
                      {typeof change.after === 'object'
                        ? JSON.stringify(change.after, null, 2)
                        : change.after
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedLog.metadata && (
            <div className="detail-section">
              <h4>بيانات إضافية</h4>
              <pre className="metadata-box">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  const Timeline = () => (
    <div className="timeline-section">
      <h3>خط زمني للأنشطة</h3>
      <div className="timeline">
        {auditLogs.slice(0, 10).map((log, idx) => (
          <div key={log.id} className={`timeline-item severity-${log.severity.toLowerCase()}`}>
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <div className="timeline-time">
                {new Date(log.timestamp).toLocaleTimeString('ar-SA')}
              </div>
              <div className="timeline-operation">{log.operation}</div>
              <div className="timeline-description">{log.description}</div>
              <div className="timeline-user">بواسطة: {log.user.name}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ===== MAIN RENDER =====
  if (error) {
    return (
      <div className="audit-trail error">
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={fetchAuditTrail} className="btn btn-primary">
            إعادة محاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="audit-trail">
      <div className="audit-header">
        <h1>🔍 سجل التدقيق</h1>
      </div>

      <StatisticsPanel />
      <SearchAndFilters />

      <div className="audit-content">
        <div className="audit-main">
          <AuditTable />
          {auditLogs.length > 0 && (
            <div className="pagination-controls">
              <button
                disabled={pagination.page === 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                className="btn-pagination"
              >
                ← السابق
              </button>
              <span className="page-info">
                صفحة {pagination.page}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                className="btn-pagination"
              >
                التالي →
              </button>
            </div>
          )}
        </div>

        <div className="audit-sidebar">
          <Timeline />
          <DetailPanel />
        </div>
      </div>
    </div>
  );
};

export default AuditTrail;
