import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import apiClient from 'services/api.client';
import { SOCKET_URL } from 'config/apiConfig';
import logger from 'utils/logger';
import { getNotificationPrefs, setNotificationPrefs } from 'utils/storageService';
import { useAuth } from './AuthContext';
import { getToken } from 'utils/tokenStorage';

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
  // Use real auth context for user and token
  const { currentUser: user } = useAuth();
  const token = getToken();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [_socket, setSocket] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [preferences, setPreferences] = useState(() => {
    const stored = getNotificationPrefs();
    return stored || DEFAULT_PREFERENCES;
  });
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('info');

  const reconnectionAttemptsRef = useRef(0);
  const maxReconnectionAttempts = 15;

  // Helper: Show error to UI
  const handleError = useCallback((message, errorObj = null) => {
    const timestamp = new Date().toISOString();
    setError({ message, timestamp });
    logger.error(`[${timestamp}] ${message}`, errorObj);
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
      newSocket = io(SOCKET_URL, {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  // Fetch notifications with pagination
  const fetchNotifications = useCallback(
    async (pageNum = 1) => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await apiClient.get('/notifications', {
          params: { page: pageNum, limit: preferences.paginationLimit },
        });
        if (data.success) {
          if (pageNum === 1) {
            setNotifications(data.notifications);
          } else {
            setNotifications(prev => [...prev, ...data.notifications]);
          }
          setHasMore(data.notifications.length === preferences.paginationLimit);
          setUnreadCount(data.unreadCount || 0);
        } else {
          handleError('فشل في جلب الإشعارات');
        }
      } catch (error) {
        handleError('خطأ في جلب الإشعارات', error);
      } finally {
        setLoading(false);
      }
    },
    [token, preferences.paginationLimit, handleError]
  );

  useEffect(() => {
    if (token) fetchNotifications(1);
  }, [token, preferences.paginationLimit, fetchNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(
    async notificationId => {
      if (!token) return;
      try {
        const data = await apiClient.put(`/notifications/${notificationId}/read`, {});
        if (data.success) {
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
    [token, handleError]
  );

  // Mark notification as unread
  const markAsUnread = useCallback(
    async notificationId => {
      if (!token) return;
      try {
        const data = await apiClient.put(`/notifications/${notificationId}/unread`, {});
        if (data.success) {
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
    [token, handleError]
  );

  // Update notification preferences
  const updatePreferences = useCallback(newPrefs => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPrefs };
      setNotificationPrefs(updated);
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
            {'An internal error occurred'}
          </Alert>
        </Snackbar>
      )}
    </NotificationContext.Provider>
  );
};
