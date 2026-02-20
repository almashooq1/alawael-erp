// Notifications Service
import apiClient from './apiClient';

const notificationsService = {
  // Get all notifications
  getNotifications: async (params = {}) => {
    return await apiClient.get('/notifications', { params });
  },

  // Mark notification as read
  markAsRead: async notificationId => {
    return await apiClient.patch(`/notifications/${notificationId}/read`);
  },

  // Mark all as read
  markAllAsRead: async () => {
    return await apiClient.patch('/notifications/read-all');
  },

  // Delete notification
  deleteNotification: async notificationId => {
    return await apiClient.delete(`/notifications/${notificationId}`);
  },

  // Send notification
  sendNotification: async notificationData => {
    return await apiClient.post('/notifications/send', notificationData);
  },

  // Get notification preferences
  getPreferences: async () => {
    return await apiClient.get('/notifications/preferences');
  },

  // Update notification preferences
  updatePreferences: async preferences => {
    return await apiClient.patch('/notifications/preferences', preferences);
  },

  // Get unread count
  getUnreadCount: async () => {
    return await apiClient.get('/notifications/unread-count');
  },
};

export default notificationsService;
