import React, { useEffect, useState } from 'react';
import useMaintenanceAPI from '../../hooks/useMaintenanceAPI';
import './AdvancedAnalytics.css';

/**
 * =====================================================
 * ADVANCED ANALYTICS - المحلل المتقدم للصيانة
 * =====================================================
 *
 * مكون متقدم يعرض:
 * ✅ رسوم بيانية تفصيلية
 * ✅ مقارنات الأداء
 * ✅ تحليل الاتجاهات
 * ✅ توقعات المستقبل
 * ✅ تقارير قابلة للتصدير
 */
const AdvancedAnalytics = ({ vehicleId = null, startDate = null, endDate = null }) => {
  const { analytics, loading, error, loadAnalytics, exportReport } = useMaintenanceAPI();
  const [filterType, setFilterType] = useState('monthly');
  const [reportFormat, setReportFormat] = useState('pdf');

  // تحميل التحليلات عند التحميل الأول
  useEffect(() => {
    const filters = {};
    if (vehicleId) filters.vehicleId = vehicleId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (filterType) filters.period = filterType;

    loadAnalytics(filters);
  }, [vehicleId, startDate, endDate, filterType, loadAnalytics]);

  const handleExport = async () => {
    await exportReport('comprehensive', reportFormat);
  };

  if (loading) {
    return (
      <div className="advanced-analytics-container">
        <div className="loading-spinner">جاري التحميل...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="advanced-analytics-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="advanced-analytics-container">
      {/* HEADER */}
      <div className="analytics-header">
        <h1>📊 المحلل المتقدم للصيانة</h1>
        <div className="header-controls">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="daily">يومي</option>
            <option value="weekly">أسبوعي</option>
            <option value="monthly">شهري</option>
            <option value="yearly">سنوي</option>
          </select>

          <select
            value={reportFormat}
            onChange={e => setReportFormat(e.target.value)}
            className="filter-select"
          >
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
            <option value="csv">CSV</option>
          </select>

          <button onClick={handleExport} className="export-btn">
            📥 تصدير التقرير
          </button>
        </div>
      </div>

      {/* MAIN METRICS */}
      <div className="metrics-grid">
        {analytics?.metrics?.map((metric, idx) => (
          <div key={idx} className="metric-card">
            <h3>{metric.name}</h3>
            <div className="metric-value">{metric.value}</div>
            <div className={`metric-trend ${metric.trend > 0 ? 'positive' : 'negative'}`}>
              {metric.trend > 0 ? '📈' : '📉'} {Math.abs(metric.trend)}%
            </div>
          </div>
        ))}
      </div>

      {/* DETAILED SECTIONS */}
      <div className="analytics-sections">
        {/* COSTS ANALYSIS */}
        <section className="analytics-section">
          <h2>💰 تحليل التكاليف</h2>
          <div className="section-content">
            {analytics?.costsAnalysis && (
              <>
                <div className="chart-placeholder">
                  <p>إجمالي التكاليف: {analytics.costsAnalysis.total}</p>
                  <p>متوسط التكاليف: {analytics.costsAnalysis.average}</p>
                  <p>الأعلى: {analytics.costsAnalysis.highest}</p>
                </div>
                <div className="breakdown">
                  {analytics.costsAnalysis.breakdown?.map((item, idx) => (
                    <div key={idx} className="breakdown-item">
                      <span>{item.category}</span>
                      <span className="amount">{item.amount}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* PERFORMANCE ANALYSIS */}
        <section className="analytics-section">
          <h2>⚙️ تحليل الأداء</h2>
          <div className="section-content">
            {analytics?.performanceAnalysis && (
              <>
                <div className="stats-list">
                  <div className="stat-item">
                    <span>معدل الإنجاز:</span>
                    <span className="stat-value">
                      {analytics.performanceAnalysis.completionRate}%
                    </span>
                  </div>
                  <div className="stat-item">
                    <span>متوسط الوقت:</span>
                    <span className="stat-value">{analytics.performanceAnalysis.avgDuration}h</span>
                  </div>
                  <div className="stat-item">
                    <span>معدل العطل:</span>
                    <span className="stat-value">{analytics.performanceAnalysis.failureRate}%</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* COMPLIANCE */}
        <section className="analytics-section">
          <h2>✅ الامتثال والمعايير</h2>
          <div className="section-content">
            {analytics?.compliance && (
              <>
                <div className="compliance-checklist">
                  {analytics.compliance.items?.map((item, idx) => (
                    <div key={idx} className={`compliance-item ${item.status}`}>
                      <span>{item.status === 'compliant' ? '✓' : '✗'}</span>
                      <span>{item.requirement}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* TRENDS & FORECASTS */}
        <section className="analytics-section">
          <h2>🔮 الاتجاهات والتنبؤات</h2>
          <div className="section-content">
            {analytics?.forecast && (
              <>
                <div className="forecast-items">
                  {analytics.forecast.predictions?.map((pred, idx) => (
                    <div key={idx} className="forecast-item">
                      <span className="forecast-period">{pred.period}</span>
                      <span className="forecast-value">{pred.predictedValue}</span>
                      <span className="confidence">ثقة: {pred.confidence}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* RECOMMENDATIONS */}
        <section className="analytics-section">
          <h2>💡 التوصيات</h2>
          <div className="section-content">
            {analytics?.recommendations && (
              <>
                <div className="recommendations-list">
                  {analytics.recommendations.map((rec, idx) => (
                    <div key={idx} className={`recommendation-item priority-${rec.priority}`}>
                      <div className="rec-header">
                        <span className="priority-badge">{rec.priority}</span>
                        <span className="rec-title">{rec.title}</span>
                      </div>
                      <p className="rec-description">{rec.description}</p>
                      <span className="rec-impact">التأثير: {rec.impact}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* EXPORT OPTIONS */}
      <div className="export-section">
        <h3>خيارات التصدير</h3>
        <div className="export-buttons">
          <button onClick={() => exportReport('comprehensive', 'pdf')} className="export-btn pdf">
            📄 تصدير PDF
          </button>
          <button
            onClick={() => exportReport('comprehensive', 'excel')}
            className="export-btn excel"
          >
            📊 تصدير Excel
          </button>
          <button onClick={() => exportReport('comprehensive', 'csv')} className="export-btn csv">
            📋 تصدير CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
