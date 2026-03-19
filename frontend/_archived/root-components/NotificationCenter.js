/**
 * NotificationCenter.js - Notification Management Component
 * Handle alerts, notifications, and user communications
 */

import React, { useState, useEffect } from 'react';
import './NotificationCenter.css';

const NotificationCenter = ({ userId, onNotificationClick }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notifications?userId=${userId}`);

      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      setNotifications(data.data.notifications || []);

      // Count unread
      const unread = (data.data.notifications || []).filter(n => !n.read).length;
      setUnreadCount(unread);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      });

      if (!response.ok) throw new Error('Failed to mark as read');

      fetchNotifications();
      if (onNotificationClick) {
        const notification = notifications.find(n => n._id === notificationId);
        onNotificationClick(notification);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete notification');

      fetchNotifications();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch(`/api/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) throw new Error('Failed to mark all as read');

      fetchNotifications();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredNotifications = notifications.filter(n =>
    filterType === 'all' ? true : n.type === filterType
  );

  const unreadNotifications = filteredNotifications.filter(n => !n.read);
  const readNotifications = filteredNotifications.filter(n => n.read);

  const getNotificationIcon = (type) => {
    const icons = {
      'academic_alert': '📚',
      'attendance_alert': '📅',
      'financial_alert': '💰',
      'achievement': '🏆',
      'scholarship': '🎓',
      'appointment': '📅',
      'support_plan': '📝',
      'message': '💬',
      'system': '⚙️',
      'deadline': '⏰'
    };
    return icons[type] || '📢';
  };

  const getNotificationColor = (type) => {
    const colors = {
      'academic_alert': '#ff6b6b',
      'attendance_alert': '#ffd93d',
      'financial_alert': '#ff6b6b',
      'achievement': '#6bcf7f',
      'scholarship': '#4ecdc4',
      'appointment': '#95a5a6',
      'support_plan': '#3498db',
      'message': '#9b59b6',
      'system': '#95a5a6',
      'deadline': '#e74c3c'
    };
    return colors[type] || '#999';
  };

  return (
    <div className="notification-center">
      <div className="center-header">
        <h2>
          Notifications
          {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
        </h2>
        <div className="header-actions">
          {unreadCount > 0 && (
            <button
              className="btn-mark-all"
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Filter Section */}
      <div className="filter-section">
        <label>Filter by Type:</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Notifications</option>
          <option value="academic_alert">Academic Alerts</option>
          <option value="attendance_alert">Attendance Alerts</option>
          <option value="financial_alert">Financial Alerts</option>
          <option value="achievement">Achievements</option>
          <option value="scholarship">Scholarships</option>
          <option value="appointment">Appointments</option>
          <option value="support_plan">Support Plans</option>
          <option value="message">Messages</option>
          <option value="deadline">Deadlines</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading notifications...</div>
      ) : (
        <>
          {/* Unread Notifications */}
          {unreadNotifications.length > 0 && (
            <div className="notifications-section">
              <h3 className="section-title">Unread ({unreadNotifications.length})</h3>
              <div className="notifications-list">
                {unreadNotifications.map((notification) => (
                  <div
                    key={notification._id}
                    className="notification-item unread"
                    onClick={() => handleMarkAsRead(notification._id)}
                  >
                    <div
                      className="notification-icon"
                      style={{ backgroundColor: getNotificationColor(notification.type) }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-content">
                      <h4>{notification.title}</h4>
                      <p>{notification.message}</p>
                      <div className="notification-meta">
                        <span className="type-badge">{notification.type.replace(/_/g, ' ')}</span>
                        <span className="time">{getTimeAgo(notification.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      className="btn-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification._id);
                      }}
                      title="Delete notification"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Read Notifications */}
          {readNotifications.length > 0 && (
            <div className="notifications-section">
              <h3 className="section-title">Earlier ({readNotifications.length})</h3>
              <div className="notifications-list">
                {readNotifications.map((notification) => (
                  <div
                    key={notification._id}
                    className="notification-item read"
                  >
                    <div
                      className="notification-icon"
                      style={{ backgroundColor: getNotificationColor(notification.type) }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-content">
                      <h4>{notification.title}</h4>
                      <p>{notification.message}</p>
                      <div className="notification-meta">
                        <span className="type-badge">{notification.type.replace(/_/g, ' ')}</span>
                        <span className="time">{new Date(notification.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(notification._id)}
                      title="Delete notification"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Notifications */}
          {filteredNotifications.length === 0 && (
            <div className="no-notifications">
              <p>😌 No notifications</p>
              <p className="subtitle">You're all caught up!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Helper function to format time
function getTimeAgo(date) {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return then.toLocaleDateString();
}

export default NotificationCenter;
