// supply-chain-management/frontend/src/components/IncidentTracking.jsx
// تتبع الحوادث وحالتها
// Incident Tracking & Status Updates

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './IncidentTracking.css';

const IncidentTracking = () => {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [filter, setFilter] = useState('');

  // جلب الحوادث
  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/incidents?limit=50', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setIncidents(response.data.data);
      console.log('✅ Incidents loaded for tracking');
    } catch (error) {
      console.error('❌ Error fetching incidents:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  // جنب الفلاتر
  const filteredIncidents = incidents.filter(inc => {
    if (!filter) return true;
    return inc.status === filter;
  });

  // الحصول على معلومات الحالة
  const getStatusInfo = (incident) => {
    const statusMap = {
      REPORTED: { label: 'تم الإبلاغ', icon: '📢', color: '#17a2b8' },
      ACKNOWLEDGED: { label: 'تم التأكيد', icon: '✓', color: '#0066cc' },
      INVESTIGATING: { label: 'قيد التحقيق', icon: '🔍', color: '#6610f2' },
      IDENTIFIED: { label: 'تم التحديد', icon: '🎯', color: '#e83e8c' },
      IN_RESOLUTION: { label: 'قيد الحل', icon: '🔧', color: '#fd7e14' },
      RESOLVED: { label: 'تم الحل', icon: '✅', color: '#28a745' },
      CLOSED: { label: 'مغلقة', icon: '🔐', color: '#6c757d' },
      REOPENED: { label: 'أعيد فتحها', icon: '⚠️', color: '#dc3545' }
    };
    return statusMap[incident.status] || { label: incident.status, icon: '❓', color: '#999' };
  };

  // القيمة المئوية للتقدم
  const getProgressPercentage = (status) => {
    const progress = {
      REPORTED: 12,
      ACKNOWLEDGED: 25,
      INVESTIGATING: 40,
      IDENTIFIED: 55,
      IN_RESOLUTION: 70,
      RESOLVED: 85,
      CLOSED: 100
    };
    return progress[status] || 0;
  };

  // وقت مضى
  const getElapsedTime = (startDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const diff = now - start;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} يوم`;
    if (hours > 0) return `${hours} ساعة`;
    return 'منذ قليل';
  };

  return (
    <div className="incident-tracking">
      <div className="tracking-header">
        <h1>📊 تتبع الحوادث | Incident Tracking</h1>
        <div className="header-stats">
          <div className="stat">
            <span className="label">إجمالي الحوادث:</span>
            <span className="value">{incidents.length}</span>
          </div>
          <div className="stat">
            <span className="label">قيد المعالجة:</span>
            <span className="value" style={{ color: '#fd7e14' }}>
              {incidents.filter(i => ['REPORTED', 'ACKNOWLEDGED', 'INVESTIGATING'].includes(i.status)).length}
            </span>
          </div>
          <div className="stat">
            <span className="label">تم حلها:</span>
            <span className="value" style={{ color: '#28a745' }}>
              {incidents.filter(i => ['RESOLVED', 'CLOSED'].includes(i.status)).length}
            </span>
          </div>
        </div>
      </div>

      {/* فلتر الحالة */}
      <div className="tracking-filters">
        <button
          className={`filter-btn ${!filter ? 'active' : ''}`}
          onClick={() => setFilter('')}
        >
          جميع الحالات ({incidents.length})
        </button>
        <button
          className={`filter-btn ${filter === 'INVESTIGATING' ? 'active' : ''}`}
          onClick={() => setFilter('INVESTIGATING')}
        >
          قيد التحقيق
        </button>
        <button
          className={`filter-btn ${filter === 'IN_RESOLUTION' ? 'active' : ''}`}
          onClick={() => setFilter('IN_RESOLUTION')}
        >
          قيد الحل
        </button>
        <button
          className={`filter-btn ${filter === 'RESOLVED' ? 'active' : ''}`}
          onClick={() => setFilter('RESOLVED')}
        >
          تم حلها
        </button>
        <button
          className={`filter-btn ${filter === 'CLOSED' ? 'active' : ''}`}
          onClick={() => setFilter('CLOSED')}
        >
          مغلقة
        </button>
      </div>

      {/* قائمة الحوادث */}
      <div className="tracking-container">
        {loading ? (
          <div className="loading">جاري التحميل...</div>
        ) : filteredIncidents.length > 0 ? (
          <div className="incidents-list">
            {filteredIncidents.map(incident => {
              const statusInfo = getStatusInfo(incident);
              const progress = getProgressPercentage(incident.status);
              const elapsedTime = getElapsedTime(incident.discoveryInfo?.discoveredAt);

              return (
                <div
                  key={incident._id}
                  className="incident-card"
                  onClick={() => {
                    setSelectedIncident(incident);
                    setShowTimeline(!showTimeline || selectedIncident?._id !== incident._id);
                  }}
                >
                  <div className="card-header">
                    <div className="incident-info">
                      <h3className="incident-id">{incident.incidentNumber}</h3>
                      <p className="incident-title">{incident.title}</p>
                      <p className="incident-category">
                        {incident.category} • منذ {elapsedTime}
                      </p>
                    </div>
                    <div className="incident-status" style={{ borderLeftColor: statusInfo.color }}>
                      <div className="status-icon">{statusInfo.icon}</div>
                      <div className="status-label">{statusInfo.label}</div>
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: statusInfo.color
                        }}
                      />
                    </div>
                    <p className="progress-text">التقدم: {progress}%</p>
                  </div>

                  <div className="card-footer">
                    <span
                      className="badge"
                      style={{ backgroundColor: getSeverityColor(incident.severity) }}
                    >
                      {incident.severity}
                    </span>
                    <span className="priority">أولوية: {incident.priority}</span>
                    <button className="btn-details">التفاصيل →</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-data">🎉 لا توجد حوادث بهذه الحالة</div>
        )}
      </div>

      {/* الجدول الزمني */}
      {showTimeline && selectedIncident && (
        <div className="timeline-section">
          <div className="timeline-header">
            <h2>📅 الجدول الزمني: {selectedIncident.incidentNumber}</h2>
            <button className="btn-close" onClick={() => setShowTimeline(false)}>✕</button>
          </div>

          <div className="timeline">
            {selectedIncident.timeline && selectedIncident.timeline.length > 0 ? (
              selectedIncident.timeline.map((event, index) => (
                <div key={index} className="timeline-item">
                  <div className="timeline-date">
                    {new Date(event.timestamp).toLocaleString('ar-SA')}
                  </div>
                  <div className="timeline-content">
                    <h4 className="timeline-event">{event.eventType}</h4>
                    <p className="timeline-description">{event.description}</p>
                    {event.details && (
                      <div className="timeline-details">
                        <pre>{JSON.stringify(event.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="no-timeline">لا توجد أحداث في الجدول الزمني</p>
            )}
          </div>
        </div>
      )}

      {/* تفاصيل الحادثة */}
      {selectedIncident && (
        <div className="details-section">
          <div className="details-header">
            <h2>📋 تفاصيل الحادثة</h2>
            <button className="btn-close" onClick={() => setSelectedIncident(null)}>✕</button>
          </div>

          <div className="details-grid">
            <div className="detail-item">
              <label>العنوان:</label>
              <value>{selectedIncident.title}</value>
            </div>
            <div className="detail-item">
              <label>الوصف:</label>
              <value>{selectedIncident.description}</value>
            </div>
            <div className="detail-item">
              <label>النوع:</label>
              <value>{selectedIncident.category}</value>
            </div>
            <div className="detail-item">
              <label>الخطورة:</label>
              <value
                style={{
                  color: getSeverityColor(selectedIncident.severity),
                  fontWeight: 'bold'
                }}
              >
                {selectedIncident.severity}
              </value>
            </div>
            <div className="detail-item">
              <label>الحالة:</label>
              <value style={{ color: getStatusInfo(selectedIncident).color }}>
                {getStatusInfo(selectedIncident).label}
              </value>
            </div>
            <div className="detail-item">
              <label>الأولوية:</label>
              <value>{selectedIncident.priority}</value>
            </div>
            <div className="detail-item">
              <label>تاريخ الاكتشاف:</label>
              <value>
                {new Date(selectedIncident.discoveryInfo?.discoveredAt).toLocaleString('ar-SA')}
              </value>
            </div>
            {selectedIncident.resolution?.resolvedAt && (
              <div className="detail-item">
                <label>تاريخ الحل:</label>
                <value>
                  {new Date(selectedIncident.resolution.resolvedAt).toLocaleString('ar-SA')}
                </value>
              </div>
            )}
          </div>

          {selectedIncident.resolution && (
            <div className="resolution-section">
              <h3>🔧 معلومات الحل</h3>
              <div className="resolution-details">
                <div className="detail-item">
                  <label>السبب الجذري:</label>
                  <value>{selectedIncident.resolution.rootCause || 'لم يتم تحديده'}</value>
                </div>
                <div className="detail-item">
                  <label>الحل:</label>
                  <value>{selectedIncident.resolution.solution || 'قيد العمل'}</value>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// دالة مساعدة للألوان
function getSeverityColor(severity) {
  const colors = {
    CRITICAL: '#dc3545',
    HIGH: '#fd7e14',
    MEDIUM: '#ffc107',
    LOW: '#28a745'
  };
  return colors[severity] || '#6c757d';
}

export default IncidentTracking;
