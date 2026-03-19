import React, { useState, useEffect } from 'react';

/**
 * =====================================================
 * MAINTENANCE ALERTS - النبيهات والإشعارات الذكية
 * =====================================================
 * 
 * المميزات:
 * ✅ تنبيهات الصيانة المستحقة
 * ✅ تنبيهات المشاكل الحرجة
 * ✅ تنبيهات المخزون الحرج
 * ✅ أولويات واضحة
 * ✅ إجراءات سريعة
 */
const MaintenanceAlerts = ({ _selectedVehicle, vehicles }) => {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/maintenance/alerts');
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('خطأ في جلب التنبيهات:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = filter === 'all'
    ? alerts
    : alerts.filter(alert => alert.severity === filter);

  const AlertItem = ({ alert, _index }) => (
    <div className={`alert-item alert-severity-${alert.severity}`}>
      <div className="alert-icon">
        {getSeverityIcon(alert.severity)}
      </div>
      <div className="alert-content">
        <div className="alert-header">
          <h4>{alert.title}</h4>
          <span className={`severity-badge severity-${alert.severity}`}>
            {getSeverityLabel(alert.severity)}
          </span>
        </div>
        <p className="alert-description">{alert.description}</p>
        <div className="alert-details">
          {alert.vehicleId && (
            <span className="detail-item">
              🚗 {getVehicleDisplay(alert.vehicleId, vehicles)}
            </span>
          )}
          {alert.dueDate && (
            <span className="detail-item">
              📅 {new Date(alert.dueDate).toLocaleDateString('ar-SA')}
            </span>
          )}
          {alert.estimatedCost && (
            <span className="detail-item">
              💰 {alert.estimatedCost} ريال
            </span>
          )}
        </div>
      </div>
      <div className="alert-actions">
        {alert.severity !== 'low' && (
          <button className="btn btn-small btn-danger" onClick={() => handleAlertAction(alert)}>
            اتخاذ إجراء
          </button>
        )}
        <button className="btn btn-small btn-secondary" onClick={() => dismissAlert(alert._id)}>
          تجاهل
        </button>
      </div>
    </div>
  );

  const handleAlertAction = (_alert) => {
    // يمكن إضافة منطق للإجراء هنا
  };

  const dismissAlert = (alertId) => {
    setAlerts(alerts.filter(alert => alert._id !== alertId));
  };

  return (
    <div className="maintenance-alerts">
      {/* رأسية التنبيهات */}
      <div className="alerts-header">
        <h2>🔔 التنبيهات والإشعارات</h2>
        <div className="alerts-stats">
          <div className="stat">
            <span className="stat-label">إجمالي:</span>
            <span className="stat-value">{alerts.length}</span>
          </div>
          <div className="stat critical">
            <span className="stat-label">حرج:</span>
            <span className="stat-value">
              {alerts.filter(a => a.severity === 'critical').length}
            </span>
          </div>
          <div className="stat warning">
            <span className="stat-label">تحذير:</span>
            <span className="stat-value">
              {alerts.filter(a => a.severity === 'high').length}
            </span>
          </div>
        </div>
      </div>

      {/* مرشحات */}
      <div className="alerts-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          الكل
        </button>
        <button
          className={`filter-btn ${filter === 'critical' ? 'active' : ''}`}
          onClick={() => setFilter('critical')}
        >
          🔴 حرج
        </button>
        <button
          className={`filter-btn ${filter === 'high' ? 'active' : ''}`}
          onClick={() => setFilter('high')}
        >
          🟠 عالي
        </button>
        <button
          className={`filter-btn ${filter === 'medium' ? 'active' : ''}`}
          onClick={() => setFilter('medium')}
        >
          🟡 متوسط
        </button>
        <button
          className={`filter-btn ${filter === 'low' ? 'active' : ''}`}
          onClick={() => setFilter('low')}
        >
          🟢 منخفض
        </button>
        <button className="btn btn-secondary" onClick={fetchAlerts}>
          🔄 تحديث
        </button>
      </div>

      {/* قائمة التنبيهات */}
      {loading ? (
        <div className="loading">جاري تحميل التنبيهات...</div>
      ) : filteredAlerts.length > 0 ? (
        <div className="alerts-list">
          {filteredAlerts.map((alert, index) => (
            <AlertItem key={alert._id || index} alert={alert} index={index} />
          ))}
        </div>
      ) : (
        <div className="alert alert-success">
          ✅ لا توجد تنبيهات في هذه الفئة
        </div>
      )}

      {/* قسم النصائح */}
      {alerts.length > 0 && (
        <div className="alerts-tips">
          <h3>💡 النصائح</h3>
          <ul>
            <li>
              ✓ ركز على التنبيهات الحرجة والعالية أولاً
            </li>
            <li>
              ✓ قم بعمل الصيانة الوقائية قبل تحويل المشاكل لحرجة
            </li>
            <li>
              ✓ استخدم التنبؤات الذكية لتجنب الأعطال المفاجئة
            </li>
            <li>
              ✓ راقب المخزون الحرج وأعد الطلبات مسبقاً
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

// دوال مساعدة
function getSeverityIcon(severity) {
  const icons = {
    'critical': '🔴',
    'high': '🟠',
    'medium': '🟡',
    'low': '🟢',
  };
  return icons[severity] || '⚪';
}

function getSeverityLabel(severity) {
  const labels = {
    'critical': 'حرج',
    'high': 'عالي',
    'medium': 'متوسط',
    'low': 'منخفض',
  };
  return labels[severity] || 'مجهول';
}

function getVehicleDisplay(vehicleId, vehicles) {
  const vehicle = vehicles.find(v => v._id === vehicleId);
  return vehicle?.name || vehicle?.licensePlate || vehicleId;
}

export default MaintenanceAlerts;
