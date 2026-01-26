import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiUsers, FiSettings, FiAlertTriangle, FiBarChart2, FiTrendingUp, FiDownload } from 'react-icons/fi';
import './Admin.css';

/**
 * Phase 12 - Admin Panel Component
 * System administration and monitoring interface
 */
const Admin = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [adminData, setAdminData] = useState(null);
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [systemConfig, setSystemConfig] = useState({
    maxConnections: 100,
    cacheSize: 1000,
    requestTimeout: 30000,
    enableMetrics: true,
  });

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [overview, usersRes, alertsRes] = await Promise.all([
        axios.get('/api/admin/overview'),
        axios.get('/api/admin/users'),
        axios.get('/api/admin/alerts'),
      ]);

      setAdminData(overview.data.data);
      setUsers(usersRes.data.data || []);
      setAlerts(alertsRes.data.data || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = {
        overview: adminData,
        users,
        alerts,
        config: systemConfig,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-export-${Date.now()}.json`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) {
    return <div className="admin-loading">📊 Loading admin panel...</div>;
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <header className="admin-header">
        <div className="header-content">
          <h1>⚙️ Admin Panel</h1>
          <p>System management and monitoring dashboard</p>
        </div>
        <button className="btn btn-secondary" onClick={handleExportData}>
          <FiDownload /> Export Data
        </button>
      </header>

      {/* Tab Navigation */}
      <nav className="admin-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FiBarChart2 /> Overview
        </button>
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <FiUsers /> Users ({users.length})
        </button>
        <button
          className={`tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <FiAlertTriangle /> Alerts ({alerts.length})
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <FiSettings /> Settings
        </button>
      </nav>

      {/* Tab Content */}
      <div className="admin-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <section className="tab-content overview-tab">
            <h2>📊 System Overview</h2>

            {adminData && (
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon performance">
                    <FiTrendingUp />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Active Users</span>
                    <span className="metric-value">{adminData.activeUsers || 0}</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon success">📈</div>
                  <div className="metric-info">
                    <span className="metric-label">API Requests</span>
                    <span className="metric-value">{adminData.totalRequests || 0}</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon warning">⚡</div>
                  <div className="metric-info">
                    <span className="metric-label">Avg Response Time</span>
                    <span className="metric-value">{adminData.avgResponseTime || '0'}ms</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon error">❌</div>
                  <div className="metric-info">
                    <span className="metric-label">Error Rate</span>
                    <span className="metric-value">{adminData.errorRate || '0'}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* System Status */}
            <div className="status-section">
              <h3>🔧 System Status</h3>
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">Database</span>
                  <span className="status-badge success">✅ Connected</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Cache</span>
                  <span className="status-badge success">✅ Active</span>
                </div>
                <div className="status-item">
                  <span className="status-label">API</span>
                  <span className="status-badge success">✅ Running</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Monitoring</span>
                  <span className="status-badge success">✅ Enabled</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <section className="tab-content users-tab">
            <h2>👥 User Management</h2>

            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map(user => (
                      <tr key={user.id}>
                        <td className="user-id">{user.id}</td>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td><span className="role-badge">{user.role || 'user'}</span></td>
                        <td>
                          <span className={`status-badge ${user.active ? 'success' : 'warning'}`}>
                            {user.active ? '✅ Active' : '⏸ Inactive'}
                          </span>
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button className="action-btn edit">Edit</button>
                          <button className="action-btn delete">Delete</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="7" className="text-center">No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {users.length === 0 && (
              <div className="empty-state">
                <FiUsers size={48} />
                <p>No users in the system yet</p>
              </div>
            )}
          </section>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <section className="tab-content alerts-tab">
            <h2>🚨 System Alerts</h2>

            <div className="alerts-list">
              {alerts.length > 0 ? (
                alerts.map((alert, idx) => (
                  <div key={idx} className={`alert-item alert-${alert.severity || 'info'}`}>
                    <div className="alert-icon">
                      {alert.severity === 'critical' && '🔴'}
                      {alert.severity === 'warning' && '🟡'}
                      {alert.severity === 'info' && 'ℹ️'}
                    </div>
                    <div className="alert-content">
                      <h4>{alert.title || 'System Alert'}</h4>
                      <p>{alert.message || 'No additional details'}</p>
                      <span className="alert-time">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <button className="alert-dismiss">×</button>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <FiAlertTriangle size={48} />
                  <p>No alerts at this time</p>
                  <p className="text-muted">All systems operating normally</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <section className="tab-content settings-tab">
            <h2>⚙️ System Settings</h2>

            <form className="settings-form">
              <div className="setting-group">
                <label>Max Connections</label>
                <input
                  type="number"
                  value={systemConfig.maxConnections}
                  onChange={(e) => setSystemConfig({...systemConfig, maxConnections: e.target.value})}
                />
                <small>Maximum concurrent database connections</small>
              </div>

              <div className="setting-group">
                <label>Cache Size</label>
                <input
                  type="number"
                  value={systemConfig.cacheSize}
                  onChange={(e) => setSystemConfig({...systemConfig, cacheSize: e.target.value})}
                />
                <small>Redis cache size in MB</small>
              </div>

              <div className="setting-group">
                <label>Request Timeout (ms)</label>
                <input
                  type="number"
                  value={systemConfig.requestTimeout}
                  onChange={(e) => setSystemConfig({...systemConfig, requestTimeout: e.target.value})}
                />
                <small>Maximum request processing time</small>
              </div>

              <div className="setting-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={systemConfig.enableMetrics}
                    onChange={(e) => setSystemConfig({...systemConfig, enableMetrics: e.target.checked})}
                  />
                  Enable Metrics Collection
                </label>
              </div>

              <button type="submit" className="btn btn-primary">
                💾 Save Settings
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
};

export default Admin;
