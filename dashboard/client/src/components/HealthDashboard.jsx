/**
 * HealthDashboard Component
 * Real-time system health monitoring with v2.0 API integration
 */

import React, { useState, useEffect } from 'react';
import '../styles/HealthDashboard.css';

function HealthDashboard() {
  const [health, setHealth] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch health status
  const fetchHealth = async () => {
    try {
      const response = await fetch('http://localhost:3001/health');
      if (!response.ok) throw new Error('Health check failed');

      const data = await response.json();
      setHealth(data);
      setError(null);

      // Fetch history
      const historyResponse = await fetch('http://localhost:3001/health/history');
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setHistory(historyData.history || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getHealthColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy': return '#4CAF50';
      case 'degraded': return '#FFC107';
      case 'unhealthy': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getHealthEmoji = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy': return '🟢';
      case 'degraded': return '🟡';
      case 'unhealthy': return '🔴';
      default: return '⚪';
    }
  };

  if (loading) {
    return <div className="health-dashboard loading">جاري التحميل...</div>;
  }

  return (
    <div className="health-dashboard">
      <div className="health-header">
        <h2>💚 حالة النظام</h2>
        <button
          className={`refresh-btn ${autoRefresh ? 'active' : ''}`}
          onClick={() => setAutoRefresh(!autoRefresh)}
          title={autoRefresh ? 'إيقاف التحديث التلقائي' : 'تشغيل التحديث التلقائي'}
        >
          {autoRefresh ? '⏱️ متزامن' : '⏸️ متوقف'}
        </button>
      </div>

      {error && (
        <div className="health-error">
          ⚠️ {error}
        </div>
      )}

      {health && (
        <>
          {/* Status Card */}
          <div className="health-status-card">
            <div className="status-emoji" style={{ fontSize: '48px' }}>
              {getHealthEmoji(health.status)}
            </div>
            <div className="status-info">
              <h3>الحالة الحالية</h3>
              <p className="status-text" style={{ color: getHealthColor(health.status) }}>
                {health.status === 'healthy' && 'صحي تماماً'}
                {health.status === 'degraded' && 'أداء منخفض'}
                {health.status === 'unhealthy' && 'غير صحي'}
              </p>
              <p className="timestamp">
                وقت التحديث: {new Date(health.timestamp).toLocaleTimeString('ar-SA')}
              </p>
            </div>
          </div>

          {/* System Metrics */}
          <div className="health-metrics">
            <div className="metric-card">
              <h4>⏱️ وقت التشغيل</h4>
              <p className="metric-value">{health.uptime.readable}</p>
            </div>

            <div className="metric-card">
              <h4>💾 الذاكرة المستخدمة</h4>
              <div className="metric-progress">
                <div
                  className="progress-bar"
                  style={{
                    width: `${Math.min((health.process.memory.heapUsed / health.process.memory.heapTotal) * 100, 100)}%`,
                    backgroundColor: Math.min((health.process.memory.heapUsed / health.process.memory.heapTotal) * 100, 100) > 80 ? '#f44336' : '#4CAF50'
                  }}
                ></div>
                <p>{(health.process.memory.heapUsed / 1024 / 1024).toFixed(2)} MB / {(health.process.memory.heapTotal / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>

            <div className="metric-card">
              <h4>🖥️ الذاكرة الحرة</h4>
              <div className="metric-progress">
                <div
                  className="progress-bar"
                  style={{
                    width: `${(health.system.freeMemory / health.system.totalMemory) * 100}%`,
                    backgroundColor: '#2196F3'
                  }}
                ></div>
                <p>{(health.system.freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB / {(health.system.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB</p>
              </div>
            </div>

            <div className="metric-card">
              <h4>📊 معدل الأخطاء</h4>
              <p className="metric-value" style={{ color: health.metrics.errorRate > 5 ? '#f44336' : '#4CAF50' }}>
                {health.metrics.errorRate.toFixed(2)}%
              </p>
            </div>

            <div className="metric-card">
              <h4>⚡ الطلبات في الدقيقة</h4>
              <p className="metric-value">{health.metrics.requestsPerMinute?.toFixed(1) || '0'}</p>
            </div>

            <div className="metric-card">
              <h4>🔴 الطلبات البطيئة</h4>
              <p className="metric-value">{health.metrics.slowRequests || 0}</p>
            </div>
          </div>

          {/* Health Checks */}
          <div className="health-checks">
            <h3>📋 فحوصات الصحة</h3>
            <div className="checks-grid">
              {health.checks?.map((check, idx) => (
                <div key={idx} className={`check-item check-${check.status}`}>
                  <span className="check-icon">
                    {check.status === 'pass' ? '✅' : '⚠️'}
                  </span>
                  <div className="check-details">
                    <p className="check-name">{check.name}</p>
                    <p className="check-value">{check.value} {check.threshold && `(${check.threshold})`}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* History Chart */}
          {history.length > 0 && (
            <div className="health-history">
              <h3>📈 سجل الحالة</h3>
              <div className="history-mini-chart">
                {history.map((record, idx) => (
                  <div
                    key={idx}
                    className="history-bar"
                    style={{
                      backgroundColor: record.status === 'healthy' ? '#4CAF50' : record.status === 'degraded' ? '#FFC107' : '#F44336',
                      height: `${record.memory / Math.max(...history.map(h => h.memory)) * 80}px`
                    }}
                    title={`${new Date(record.timestamp).toLocaleTimeString('ar-SA')} - ${record.status}`}
                  ></div>
                ))}
              </div>
              <p className="history-note">آخر {history.length} سجلات</p>
            </div>
          )}

          {/* System Info */}
          <div className="system-info">
            <h3>🖥️ معلومات النظام</h3>
            <div className="info-grid">
              <div>
                <strong>المعالجات:</strong> {health.system.cpus}
              </div>
              <div>
                <strong>البنية:</strong> {health.system.arch}
              </div>
              <div>
                <strong>المنصة:</strong> {health.system.platform === 'win32' ? 'Windows' : 'Linux'}
              </div>
              <div>
                <strong>معرف العملية:</strong> {health.process.pid}
              </div>
              <div>
                <strong>إصدار Node.js:</strong> {health.process.nodeVersion}
              </div>
              <div>
                <strong>تحميل النظام:</strong> {health.system.loadAverage?.[0]?.toFixed(2) || '0'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default HealthDashboard;
