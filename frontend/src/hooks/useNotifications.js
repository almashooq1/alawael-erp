import { useState, useCallback, useEffect, useRef } from 'react';
import { useSnackbar } from '../contexts/SnackbarContext';
import logger from 'utils/logger';

/**
 * useNotifications — Real-time notification management hook.
 *
 * @param {object} [options]
 * @param {Array}  [options.initialData]  — Initial notifications
 * @param {number} [options.pollInterval] — Polling interval in ms (0 = disabled)
 * @param {function} [options.fetchFn]    — Function to fetch notifications
 *
 * @returns {object} {
 *   notifications, unreadCount, loading,
 *   markAsRead, markAllAsRead, dismiss, refresh,
 *   addNotification
 * }
 */
const useNotifications = (options = {}) => {
  const { initialData = [], pollInterval = 0, fetchFn } = options;
  const showSnackbar = useSnackbar();
  const [notifications, setNotifications] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const refresh = useCallback(async () => {
    if (!fetchFn) return;
    try {
      setLoading(true);
      const data = await fetchFn();
      setNotifications(data || []);
    } catch (err) {
      logger.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  // Polling
  useEffect(() => {
    if (pollInterval > 0 && fetchFn) {
      refresh();
      intervalRef.current = setInterval(refresh, pollInterval);
      return () => clearInterval(intervalRef.current);
    }
  }, [pollInterval, refresh, fetchFn]);

  const markAsRead = useCallback(id => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showSnackbar('تم تحديد جميع الإشعارات كمقروءة', 'info');
  }, [showSnackbar]);

  const dismiss = useCallback(id => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback(notification => {
    setNotifications(prev => [
      { id: Date.now(), read: false, createdAt: new Date().toISOString(), ...notification },
      ...prev,
    ]);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    dismiss,
    refresh,
    addNotification,
  };
};

export default useNotifications;
