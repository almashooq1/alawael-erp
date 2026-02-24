/**
 * Socket Context - Real-time Updates Management
 * Manages WebSocket connection and subscriptions
 * Provides real-time updates for KPIs, notifications, and alerts
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

// Create Socket Context
const SocketContext = createContext(null);

// Socket connection configuration
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
const SOCKET_OPTIONS = {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling'],
};

/**
 * Socket Provider Component
 * Wraps the application and provides real-time socket connection
 */
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(SOCKET_URL, SOCKET_OPTIONS);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', error => {
      console.error('⚠️ Socket connection error:', error);
      setError(error.message);
      setConnected(false);
    });

    newSocket.on('error', error => {
      console.error('⚠️ Socket error:', error);
      setError(error);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  const value = {
    socket,
    connected,
    error,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

/**
 * Custom Hook: useSocket
 * Access socket connection and emit/subscribe to events
 */
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

/**
 * Custom Hook: useSocketEvent
 * Subscribe to socket events with automatic cleanup
 */
export const useSocketEvent = (eventName, callback) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(eventName, callback);

    return () => {
      socket.off(eventName, callback);
    };
  }, [socket, eventName, callback]);
};

/**
 * Custom Hook: useSocketEmit
 * Emit socket events
 */
export const useSocketEmit = () => {
  const { socket } = useSocket();

  return useCallback(
    (eventName, data) => {
      if (socket && socket.connected) {
        socket.emit(eventName, data);
      } else {
        console.warn('Socket not connected. Event not sent:', eventName);
      }
    },
    [socket],
  );
};

/**
 * Custom Hook: useRealTimeKPIs
 * Subscribe to KPI updates for a specific module
 */
export const useRealTimeKPIs = moduleKey => {
  const [kpis, setKpis] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  useSocketEvent(`kpi:update:${moduleKey}`, data => {
    console.log(`📊 KPI update for ${moduleKey}:`, data);
    setKpis(data);
    setLastUpdate(new Date());
  });

  return { kpis, lastUpdate };
};

/**
 * Custom Hook: useRealTimeNotifications
 * Subscribe to new notifications in real-time
 */
export const useRealTimeNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useSocketEvent('notification:new', notification => {
    console.log('🔔 New notification:', notification);
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  });

  useSocketEvent('notification:mark-read', notificationId => {
    setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, read: true } : n)));
    setUnreadCount(prev => Math.max(0, prev - 1));
  });

  return { notifications, unreadCount };
};

/**
 * Custom Hook: useRealtimeDashboard
 * Subscribe to dashboard data updates
 */
export const useRealtimeDashboard = () => {
  const [summaryCards, setSummaryCards] = useState([]);
  const [topKPIs, setTopKPIs] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  useSocketEvent('dashboard:update', data => {
    console.log('📈 Dashboard update:', data);
    if (data.summaryCards) setSummaryCards(data.summaryCards);
    if (data.topKPIs) setTopKPIs(data.topKPIs);
    setLastUpdate(new Date());
  });

  return { summaryCards, topKPIs, lastUpdate };
};

/**
 * Custom Hook: useSystemAlerts
 * Subscribe to system alerts and warnings
 */
export const useSystemAlerts = () => {
  const [alerts, setAlerts] = useState([]);

  useSocketEvent('alert:new', alert => {
    console.log('⚠️ New alert:', alert);
    setAlerts(prev => [alert, ...prev].slice(0, 10)); // Keep last 10 alerts
  });

  useSocketEvent('alert:clear', alertId => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  });

  return alerts;
};

/**
 * Event Emitters - Functions to emit events to server
 */

export const socketEmitters = {
  /**
   * Subscribe to a module
   */
  subscribeToModule: moduleKey => {
    return emit => emit('module:subscribe', { moduleKey });
  },

  /**
   * Unsubscribe from a module
   */
  unsubscribeFromModule: moduleKey => {
    return emit => emit('module:unsubscribe', { moduleKey });
  },

  /**
   * Request dashboard updates
   */
  requestDashboardUpdate: () => {
    return emit => emit('dashboard:request-update');
  },

  /**
   * Request KPI update for a module
   */
  requestKPIUpdate: moduleKey => {
    return emit => emit('kpi:request-update', { moduleKey });
  },

  /**
   * Request notifications
   */
  requestNotifications: (limit = 10) => {
    return emit => emit('notification:request', { limit });
  },
};

/**
 * Event Types (Server -> Client)
 *
 * kpi:update:{moduleKey} - KPI values changed
 * dashboard:update - Dashboard summary data changed
 * notification:new - New notification received
 * notification:mark-read - Notification marked as read
 * alert:new - System alert received
 * alert:clear - Alert cleared
 * system:status - System status changed
 * module:data-refresh - Module data requires refresh
 */

/**
 * Emit Event Types (Client -> Server)
 *
 * module:subscribe - Subscribe to module updates
 * module:unsubscribe - Unsubscribe from module updates
 * dashboard:request-update - Request latest dashboard data
 * kpi:request-update - Request KPI update for module
 * notification:request - Request notifications list
 * notification:mark-read - Mark notification as read
 * user:activity - Report user activity (analytics)
 */

export default SocketContext;
