/**
 * Dashboard.js - Main Dashboard Component
 * Central landing page for beneficiary management system
 */

import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = ({ userId, userName, userRole }) => {
  const [dashboardData, setDashboardData] = useState({
    totalBeneficiaries: 0,
    activeSupportPlans: 0,
    pendingScholarships: 0,
    totalAttendanceAlerts: 0,
    recentActivities: [],
    systemHealth: {
      beneficiaryService: 'healthy',
      attendanceService: 'healthy',
      scholarshipService: 'healthy',
      supportService: 'healthy'
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [userId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Simulate API call
      const response = await fetch(`/api/dashboard/summary?userId=${userId}`);

      if (!response.ok) throw new Error('Failed to fetch dashboard data');

      const data = await response.json();
      setDashboardData(data.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Beneficiary Management Dashboard</h1>
        <div className="header-info">
          <span className="user-name">Welcome, {userName}</span>
          <span className="user-role">Role: {userRole}</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-btn">Retry</button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card beneficiaries">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total Beneficiaries</h3>
            <p className="stat-number">{dashboardData.totalBeneficiaries}</p>
            <span className="stat-label">Active participants</span>
          </div>
        </div>

        <div className="stat-card support-plans">
          <div className="stat-icon">🤝</div>
          <div className="stat-content">
            <h3>Active Support Plans</h3>
            <p className="stat-number">{dashboardData.activeSupportPlans}</p>
            <span className="stat-label">Ongoing support</span>
          </div>
        </div>

        <div className="stat-card scholarships">
          <div className="stat-icon">🎓</div>
          <div className="stat-content">
            <h3>Pending Scholarships</h3>
            <p className="stat-number">{dashboardData.pendingScholarships}</p>
            <span className="stat-label">Awaiting approval</span>
          </div>
        </div>

        <div className="stat-card alerts">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <h3>Attendance Alerts</h3>
            <p className="stat-number">{dashboardData.totalAttendanceAlerts}</p>
            <span className="stat-label">Pending review</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-content">
        {/* Recent Activities */}
        <div className="content-section activities-section">
          <div className="section-header">
            <h2>Recent Activities</h2>
            <a href="/activities" className="view-all-link">View All →</a>
          </div>
          <div className="activities-list">
            {dashboardData.recentActivities && dashboardData.recentActivities.length > 0 ? (
              dashboardData.recentActivities.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                  <div className="activity-details">
                    <p className="activity-title">{activity.title}</p>
                    <p className="activity-description">{activity.description}</p>
                    <span className="activity-time">{formatTime(activity.timestamp)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No recent activities</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="content-section actions-section">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <button className="action-btn btn-primary">
              <span className="btn-icon">➕</span>
              <span>Add Beneficiary</span>
            </button>
            <button className="action-btn btn-secondary">
              <span className="btn-icon">📊</span>
              <span>View Reports</span>
            </button>
            <button className="action-btn btn-secondary">
              <span className="btn-icon">📅</span>
              <span>Schedule Meeting</span>
            </button>
            <button className="action-btn btn-secondary">
              <span className="btn-icon">📋</span>
              <span>Review Applications</span>
            </button>
            <button className="action-btn btn-secondary">
              <span className="btn-icon">📝</span>
              <span>Create Support Plan</span>
            </button>
            <button className="action-btn btn-secondary">
              <span className="btn-icon">🎯</span>
              <span>View Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="system-health">
        <h3>System Health</h3>
        <div className="health-indicators">
          {Object.entries(dashboardData.systemHealth).map(([service, status]) => (
            <div key={service} className="health-item">
              <span className={`health-dot status-${status}`}></span>
              <span className="service-name">{formatServiceName(service)}</span>
              <span className="service-status">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper Functions
function getActivityIcon(type) {
  const icons = {
    'attendance': '📍',
    'scholarship': '🎓',
    'support': '🤝',
    'achievement': '🏆',
    'alert': '⚠️'
  };
  return icons[type] || '📌';
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function formatServiceName(service) {
  return service
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

export default Dashboard;
