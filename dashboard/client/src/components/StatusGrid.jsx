import React from 'react';
import './StatusGrid.css';

function StatusGrid({ services, loading, onServiceClick, selectedService }) {
  if (loading) {
    return <div className="loading">⏳ جاري التحميل...</div>;
  }

  if (!services || services.length === 0) {
    return <div className="no-data">لا توجد خدمات متاحة</div>;
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passing': return '✅';
      case 'failing': return '❌';
      case 'running': return '⏳';
      case 'unknown': return '⚪';
      default: return '❓';
    }
  };

  const getStatusClass = (status) => {
    return `service-card status-${status}`;
  };

  const calculateSuccessRate = (service) => {
    if (!service.latestRun || !service.latestRun.tests_total) return 0;
    return ((service.latestRun.tests_passed / service.latestRun.tests_total) * 100).toFixed(1);
  };

  return (
    <div className="status-grid">
      {services.map((service) => (
        <div
          key={service.name}
          className={`${getStatusClass(service.status)} ${selectedService?.name === service.name ? 'selected' : ''}`}
          onClick={() => onServiceClick(service)}
        >
          <div className="service-header">
            <span className="service-icon">{getStatusIcon(service.status)}</span>
            <h3 className="service-name">{service.name}</h3>
          </div>

          {service.hasTests ? (
            <div className="service-stats">
              {service.latestRun ? (
                <>
                  <div className="stat-row">
                    <span className="stat-label">الاختبارات:</span>
                    <span className="stat-value">
                      {service.latestRun.tests_passed}/{service.latestRun.tests_total}
                    </span>
                  </div>

                  <div className="stat-row">
                    <span className="stat-label">نسبة النجاح:</span>
                    <span className="stat-value">{calculateSuccessRate(service)}%</span>
                  </div>

                  {service.latestRun.coverage !== null && (
                    <div className="stat-row">
                      <span className="stat-label">التغطية:</span>
                      <span className="stat-value">{service.latestRun.coverage}%</span>
                    </div>
                  )}

                  <div className="stat-row">
                    <span className="stat-label">المدة:</span>
                    <span className="stat-value">{(service.latestRun.duration_ms / 1000).toFixed(1)}s</span>
                  </div>

                  <div className="last-run">
                    آخر تشغيل: {new Date(service.latestRun.timestamp).toLocaleString('ar-SA')}
                  </div>
                </>
              ) : (
                <div className="no-runs">لم يتم التشغيل بعد</div>
              )}
            </div>
          ) : (
            <div className="no-tests">
              ⚠️ لا يوجد اختبارات محددة
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default StatusGrid;
