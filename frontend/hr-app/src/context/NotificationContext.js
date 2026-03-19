import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useAuth } from '../context/AuthContext';

const NotificationContext = createContext();

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
  const { user, token } = useAuth ? useAuth() : { user: null, token: null };
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
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('info');

  const reconnectionAttemptsRef = useRef(0);
  const maxReconnectionAttempts = 15;
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  // Helper: Show error to UI
  const handleError = useCallback((message, errorObj = null) => {
    const timestamp = new Date().toISOString();
    setError({ message, timestamp });
    console.error(`[${timestamp}] ${message}`, errorObj);
    setTimeout(() => setError(null), 5000);
  }, []);

  // Helper: Calculate exponential backoff delay
  const getBackoffDelay = attempt => {
    const baseDelay = 1000;
    const exponentialDelay = baseDelay * Math.pow(2, Math.min(attempt, 5));
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000);
  };

  // WebSocket connection with exponential backoff
  useEffect(() => {
    if (!token || !user) return;
    let newSocket;
    const initSocket = () => {
      newSocket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3001', {
        auth: { token },
        reconnection: true,
        reconnectionDelay: getBackoffDelay(reconnectionAttemptsRef.current),
        reconnectionDelayMax: 30000,
        reconnectionAttempts: maxReconnectionAttempts,
      });
      newSocket.on('connect', () => {
        reconnectionAttemptsRef.current = 0;
      });
      newSocket.on('disconnect', () => {
        reconnectionAttemptsRef.current++;
      });
      newSocket.on('notification', notification => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        if (!preferences.notificationsMuted) {
          setMessage(notification.message || 'لديك إشعار جديد');
          setSeverity('info');
          setOpen(true);
        }
      });
      setSocket(newSocket);
    };
    initSocket();
    return () => {
      if (newSocket) newSocket.disconnect();
    };
    // eslint-disable-next-line
  }, [token, user]);

  // Fetch notifications with pagination
  const fetchNotifications = useCallback(
    async (pageNum = 1) => {
      if (!token) return;
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/notifications`, {
          params: { page: pageNum, limit: preferences.paginationLimit },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.success) {
          if (pageNum === 1) {
            setNotifications(response.data.notifications);
          } else {
            setNotifications(prev => [...prev, ...response.data.notifications]);
          }
          setHasMore(response.data.notifications.length === preferences.paginationLimit);
          setUnreadCount(response.data.unreadCount || 0);
        } else {
          handleError('فشل في جلب الإشعارات');
        }
      } catch (error) {
        handleError('خطأ في جلب الإشعارات', error);
      } finally {
        setLoading(false);
      }
    },
    [token, preferences.paginationLimit, API_BASE_URL, handleError]
  );

  useEffect(() => {
    if (token) fetchNotifications(1);
    // eslint-disable-next-line
  }, [token, preferences.paginationLimit]);

  // Mark notification as read
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
          setNotifications(prev =>
            prev.map(n =>
              n._id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
            )
          );
          setUnreadCount(prev => Math.max(prev - 1, 0));
        } else {
          handleError('فشل في تحديث حالة الإشعار');
        }
      } catch (error) {
        handleError('خطأ في تحديث حالة الإشعار', error);
      }
    },
    [token, API_BASE_URL, handleError]
  );

  // Mark notification as unread
  const markAsUnread = useCallback(
    async notificationId => {
      if (!token) return;
      try {
        const response = await axios.put(
          `${API_BASE_URL}/notifications/${notificationId}/unread`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          setNotifications(prev =>
            prev.map(n => (n._id === notificationId ? { ...n, isRead: false } : n))
          );
          setUnreadCount(prev => prev + 1);
        } else {
          handleError('فشل في تحديث حالة الإشعار');
        }
      } catch (error) {
        handleError('خطأ في تحديث حالة الإشعار', error);
      }
    },
    [token, API_BASE_URL, handleError]
  );

  // Update notification preferences
  const updatePreferences = useCallback(newPrefs => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPrefs };
      localStorage.setItem('notificationPreferences', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Snackbar notification
  const notify = useCallback((msg, sev = 'info') => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  }, []);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAsUnread,
        hasMore,
        page,
        setPage,
        preferences,
        updatePreferences,
        notify,
        error,
      }}
    >
      {children}
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleClose} severity={severity} sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
      {error && (
        <Snackbar
          open={!!error}
          autoHideDuration={5000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
            {error.message}
          </Alert>
        </Snackbar>
      )}
    </NotificationContext.Provider>
  );
};
