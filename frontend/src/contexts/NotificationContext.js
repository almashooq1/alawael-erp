import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

// Mark notification as unread
const markAsUnread = async (notificationId, token, API_BASE_URL) => {
  if (!token) return;
  try {
    const response = await axios.put(
      `${API_BASE_URL}/notifications/${notificationId}/unread`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.success;
  } catch (error) {
    console.error(`Error marking as unread: ${error.message}`);
    return false;
  }
};

// Priority 5: User Notification Preferences
const DEFAULT_PREFERENCES = {
  notificationsMuted: false,
  selectedChannels: ['all'],
  soundEnabled: true,
  emailEnabled: true,
  paginationLimit: 20,
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [preferences, setPreferences] = useState(() => {
    const stored = localStorage.getItem('notificationPreferences');
    return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;
  });

  const reconnectionAttemptsRef = useRef(0);
  const maxReconnectionAttempts = 15;
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  // Helper: Check if Notification API is available
  const isNotificationAPIAvailable = () => {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  };

  // Helper: Show error to UI
  const handleError = useCallback((message, errorObj = null) => {
    const timestamp = new Date().toISOString();
    setError({ message, timestamp });
    console.error(`[${timestamp}] ${message}`, errorObj);
    setTimeout(() => setError(null), 5000); // Auto-clear after 5s
  }, []);

  // Helper: Calculate exponential backoff delay
  const getBackoffDelay = attempt => {
    const baseDelay = 1000;
    const exponentialDelay = baseDelay * Math.pow(2, Math.min(attempt, 5));
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000); // Max 30s
  };

  // Priority 4: Initialize WebSocket connection with exponential backoff
  useEffect(() => {
    if (!token || !user) return;

    const initSocket = () => {
      const newSocket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3001', {
        auth: { token },
        reconnection: true,
        reconnectionDelay: getBackoffDelay(reconnectionAttemptsRef.current),
        reconnectionDelayMax: 30000,
        reconnectionAttempts: maxReconnectionAttempts,
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to notification service');
        reconnectionAttemptsRef.current = 0;
        setError(null);
        newSocket.emit('notification:request-count');
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Disconnected from notification service');
        reconnectionAttemptsRef.current += 1;
        if (reconnectionAttemptsRef.current >= maxReconnectionAttempts) {
          handleError('Failed to maintain WebSocket connection after multiple attempts');
        }
      });

      newSocket.on('error', error => {
        handleError('WebSocket error occurred', error);
      });

      // Listen for new notifications
      newSocket.on('notification:new', notification => {
        console.log('📢 New notification:', notification);

        // Priority 5: Check user preferences
        if (preferences.notificationsMuted) {
          return;
        }

        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Priority 1: Guard Notification API with try-catch
        if (isNotificationAPIAvailable() && preferences.soundEnabled) {
          try {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/logo192.png',
              tag: notification._id,
              requireInteraction: false,
            });
          } catch (err) {
            console.warn('Failed to show browser notification:', err);
          }
        }
      });

      // Listen for unread count updates
      newSocket.on('notification:count', ({ count }) => {
        setUnreadCount(count);
      });

      // Priority 2: Listen for marked as read events with server timestamp
      newSocket.on('notification:marked-read', ({ notificationId, readAt }) => {
        setNotifications(prev =>
          prev.map(n =>
            n._id === notificationId ? { ...n, isRead: true, readAt: readAt || new Date() } : n
          )
        );
      });

      setSocket(newSocket);

      // Request browser notification permission if not already granted
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(err =>
          console.warn('Notification permission denied:', err)
        );
      }
    };

    initSocket();
    return () => {
      // socket will be set by initSocket
    };
  }, [token, user, preferences, handleError]);

  // Priority 3: Fetch notifications with improved pagination and configurable limit
  const fetchNotifications = useCallback(
    async (pageNum = 1, unreadOnly = false) => {
      if (!token) return;

      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            page: pageNum,
            limit: preferences.paginationLimit,
            unreadOnly,
          },
        });

        if (response.data.success) {
          const {
            notifications: newNotifications,
            pagination,
            unreadCount: count,
          } = response.data.data;

          // Validate pagination response
          if (pageNum === 1 || !Array.isArray(newNotifications)) {
            setNotifications(newNotifications || []);
            setPage(1);
          } else {
            // Prevent duplicates when appending
            setNotifications(prev => {
              const existingIds = new Set(prev.map(n => n._id));
              const uniqueNew = newNotifications.filter(n => !existingIds.has(n._id));
              return [...prev, ...uniqueNew];
            });
          }

          setUnreadCount(count || 0);
          setHasMore(pagination && pagination.page < pagination.pages);
          setPage(pageNum);
        } else {
          handleError('Failed to fetch notifications');
        }
      } catch (error) {
        handleError(`Error fetching notifications: ${error.message}`, error);
      } finally {
        setLoading(false);
      }
    },
    [token, API_BASE_URL, preferences.paginationLimit, handleError]
  );

  // Priority 3: Load more notifications with improved logic
  const loadMore = useCallback(() => {
    if (!loading && hasMore && page > 0) {
      fetchNotifications(page + 1);
    }
  }, [page, loading, hasMore, fetchNotifications]);

  // Priority 2: Mark notification as read with server timestamp sync
  const markAsRead = useCallback(
    async notificationId => {
      if (!token) return;

      try {
        const response = await axios.put(
          `${API_BASE_URL}/notifications/${notificationId}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
          const { readAt } = response.data.data;
          setNotifications(prev =>
            prev.map(n =>
              n._id === notificationId
                ? { ...n, isRead: true, readAt: readAt || new Date().toISOString() }
                : n
            )
          );
          setUnreadCount(prev => Math.max(0, prev - 1));

          // Emit via WebSocket with server timestamp
          if (socket) {
            socket.emit('notification:mark-read', { notificationId, readAt });
          }
        } else {
          handleError(`Failed to mark notification as read`);
        }
      } catch (error) {
        handleError(`Error marking notification as read: ${error.message}`, error);
      }
    },
    [token, socket, API_BASE_URL, handleError]
  );

  // Priority 2: Mark all notifications as read with server timestamp sync
  const markAllAsRead = useCallback(async () => {
    if (!token) return;

    try {
      const response = await axios.put(
        `${API_BASE_URL}/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const { readAt } = response.data.data;
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true, readAt: readAt || new Date().toISOString() }))
        );
        setUnreadCount(0);
      } else {
        handleError('Failed to mark all notifications as read');
      }
    } catch (error) {
      handleError(`Error marking all as read: ${error.message}`, error);
    }
  }, [token, API_BASE_URL, handleError]);

  // Priority 1: Delete notification with error handling
  const deleteNotification = useCallback(
    async notificationId => {
      if (!token) return;

      try {
        const response = await axios.delete(`${API_BASE_URL}/notifications/${notificationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.success) {
          setNotifications(prev => {
            const notification = prev.find(n => n._id === notificationId);
            if (notification && !notification.isRead) {
              setUnreadCount(c => Math.max(0, c - 1));
            }
            return prev.filter(n => n._id !== notificationId);
          });
        } else {
          handleError('Failed to delete notification');
        }
      } catch (error) {
        handleError(`Error deleting notification: ${error.message}`, error);
      }
    },
    [token, API_BASE_URL, handleError]
  );

  // Priority 1: Delete all read notifications with error handling
  const deleteReadNotifications = useCallback(async () => {
    if (!token) return;

    try {
      const response = await axios.delete(`${API_BASE_URL}/notifications/read/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setNotifications(prev => prev.filter(n => !n.isRead));
      } else {
        handleError('Failed to delete read notifications');
      }
    } catch (error) {
      handleError(`Error deleting read notifications: ${error.message}`, error);
    }
  }, [token, API_BASE_URL, handleError]);

  // Priority 1: Get unread count with error handling
  const refreshUnreadCount = useCallback(async () => {
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/notifications/unread/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setUnreadCount(response.data.data.count || 0);
      } else {
        handleError('Failed to fetch unread count');
      }
    } catch (error) {
      handleError(`Error fetching unread count: ${error.message}`, error);
    }
  }, [token, API_BASE_URL, handleError]);

  // Priority 5: Update preferences and persist to localStorage
  const updatePreferences = useCallback(
    newPreferences => {
      const updated = { ...preferences, ...newPreferences };
      setPreferences(updated);
      localStorage.setItem('notificationPreferences', JSON.stringify(updated));
    },
    [preferences]
  );

  // Priority 5: Toggle notifications mute state
  const toggleNotificationsMute = useCallback(() => {
    updatePreferences({ notificationsMuted: !preferences.notificationsMuted });
  }, [preferences.notificationsMuted, updatePreferences]);

  // Priority 5: Update pagination limit
  const setPaginationLimit = useCallback(
    limit => {
      if (limit > 0 && limit <= 100) {
        updatePreferences({ paginationLimit: limit });
      }
    },
    [updatePreferences]
  );

  // Initial load
  useEffect(() => {
    if (token && user) {
      fetchNotifications(1);
      refreshUnreadCount();
    }
  }, [token, user, fetchNotifications, refreshUnreadCount]);

  const value = {
    // State
    notifications,
    unreadCount,
    loading,
    hasMore,
    error,
    preferences,

    // Core functions
    fetchNotifications,
    loadMore,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
    refreshUnreadCount,

    // Preference management (Priority 5)
    updatePreferences,
    toggleNotificationsMute,
    setPaginationLimit,
  };

  return (
    <NotificationContext.Provider value={value}>
      {error && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            backgroundColor: '#f44336',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 9999,
            fontFamily: 'Roboto, sans-serif',
            fontSize: '14px',
          }}
        >
          ⚠️ {error.message}
        </div>
      )}
      {children}
    </NotificationContext.Provider>
  );
};
