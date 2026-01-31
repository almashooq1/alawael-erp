import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, Check, Trash2, Archive, AlertCircle, CheckCircle, Info } from 'lucide-react';

/**
 * Notification Center Component
 * Advanced multi-channel notification management
 */

interface Notification {
  id: string;
  userId: string;
  type: 'email' | 'sms' | 'push' | 'in-app';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'sent' | 'failed' | 'read';
  createdAt: Date;
  sentAt?: Date;
  readAt?: Date;
}

interface NotificationCenterProps {
  userId: string;
  onNotificationRead?: (notificationId: string) => void;
  pollingInterval?: number;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  onNotificationRead,
  pollingInterval = 5000,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Fetch Notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/notifications/${userId}`);
      const data = await response.json();

      if (data.success) {
        const notifs = data.notifications.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          sentAt: n.sentAt ? new Date(n.sentAt) : undefined,
          readAt: n.readAt ? new Date(n.readAt) : undefined,
        }));
        setNotifications(notifs);

        // Count unread
        const unread = notifs.filter((n: Notification) => n.status !== 'read').length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Auto-refresh notifications
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, pollingInterval);
    return () => clearInterval(interval);
  }, [fetchNotifications, pollingInterval]);

  // Mark as Read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      const data = await response.json();

      if (data.success) {
        setNotifications(notifs =>
          notifs.map(n =>
            n.id === notificationId ? { ...n, status: 'read' as const } : n
          )
        );
        onNotificationRead?.(notificationId);
        setUnreadCount(count => Math.max(0, count - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Delete Notification
  const handleDelete = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setNotifications(notifs => notifs.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Clear All
  const handleClearAll = async () => {
    try {
      const response = await fetch(`/api/notifications/${userId}/clear`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Filter Notifications
  const filteredNotifications = notifications.filter(n => {
    let statusMatch = true;
    let priorityMatch = true;

    if (filter === 'unread') {
      statusMatch = n.status !== 'read';
    } else if (filter === 'read') {
      statusMatch = n.status === 'read';
    }

    if (selectedPriority !== 'all') {
      priorityMatch = n.priority === selectedPriority;
    }

    return statusMatch && priorityMatch;
  });

  // Get Priority Color
  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      critical: 'text-red-600 bg-red-50',
      high: 'text-orange-600 bg-orange-50',
      medium: 'text-yellow-600 bg-yellow-50',
      low: 'text-green-600 bg-green-50',
    };
    return colors[priority] || colors.low;
  };

  // Get Status Icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'read':
        return <Check className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  // Format Time
  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
        title="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-2xl z-50 max-h-96 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
              <p className="text-sm text-gray-500">{unreadCount} unread</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Bar */}
          <div className="px-4 py-3 border-b border-gray-200 flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filter === 'read'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Read
            </button>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={e => setSelectedPriority(e.target.value)}
              className="px-2 py-1 rounded text-sm bg-gray-100 text-gray-700 border border-gray-300"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No notifications</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      notification.status !== 'read' ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Notification Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(notification.status)}
                          <h4 className="font-semibold text-gray-900 text-sm">
                            {notification.title}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                              notification.priority
                            )}`}
                          >
                            {notification.priority}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>

                    {/* Message */}
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                      {notification.message}
                    </p>

                    {/* Type Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        {notification.type}
                      </span>
                      <span className="text-xs text-gray-500">{notification.status}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {notification.status !== 'read' && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="flex-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors flex items-center justify-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Mark Read
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 flex gap-2">
              <button
                onClick={fetchNotifications}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 transition-colors"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
