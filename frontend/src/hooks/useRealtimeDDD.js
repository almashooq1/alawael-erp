/**
 * DDD Real-Time Hooks — خطافات البيانات المباشرة
 *
 * React hooks for Socket.IO integration with DDD domains.
 * Connect to the existing Socket.IO server and subscribe to
 * domain-specific real-time events.
 *
 * Hooks:
 *  useRealtimeConnection() — manage Socket.IO connection
 *  useDomainSubscription(domain) — subscribe to domain events
 *  useRealtimeKPIs() — live KPI dashboards
 *  useBeneficiary360Live(id) — live 360 data
 *  useRealtimeAlerts() — decision alerts stream
 *  useDomainHealth() — domain health monitor
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

/* ── Socket singleton ── */
let socketInstance = null;
const connectionListeners = new Set();

function getSocket() {
  if (!socketInstance) {
    const url = process.env.REACT_APP_SOCKET_URL || window.location.origin;
    socketInstance = io(url, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      autoConnect: false,
      auth: () => {
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        return { token };
      },
    });

    socketInstance.on('connect', () => {
      connectionListeners.forEach(fn => fn({ connected: true, id: socketInstance.id }));
    });
    socketInstance.on('disconnect', () => {
      connectionListeners.forEach(fn => fn({ connected: false, id: null }));
    });
    socketInstance.on('connect_error', err => {
      connectionListeners.forEach(fn => fn({ connected: false, id: null, error: err.message }));
    });
  }
  return socketInstance;
}

/* ════════════════════════════════════════════════════════════
 *  useRealtimeConnection — إدارة اتصال Socket.IO
 * ════════════════════════════════════════════════════════════ */
export function useRealtimeConnection() {
  const [state, setState] = useState({
    connected: false,
    id: null,
    error: null,
  });

  useEffect(() => {
    const socket = getSocket();

    const handler = update => setState(prev => ({ ...prev, ...update }));
    connectionListeners.add(handler);

    // Connect if not already
    if (!socket.connected) {
      socket.connect();
    } else {
      setState({ connected: true, id: socket.id, error: null });
    }

    return () => {
      connectionListeners.delete(handler);
    };
  }, []);

  const connect = useCallback(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();
  }, []);

  const disconnect = useCallback(() => {
    if (socketInstance?.connected) socketInstance.disconnect();
  }, []);

  return { ...state, connect, disconnect };
}

/* ════════════════════════════════════════════════════════════
 *  useDomainSubscription — الاشتراك بأحداث مجال DDD
 * ════════════════════════════════════════════════════════════ */
export function useDomainSubscription(domain, options = {}) {
  const { beneficiaryId, onUpdate } = options;
  const [events, setEvents] = useState([]);
  const [lastEvent, setLastEvent] = useState(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    // Subscribe to domain
    socket.emit('ddd:subscribe', { domain, beneficiaryId });

    // Listen for updates
    const handleUpdate = event => {
      if (domain && event.domain !== domain) return;

      setLastEvent(event);
      setEvents(prev => [event, ...prev].slice(0, 100));

      if (onUpdateRef.current) {
        onUpdateRef.current(event);
      }
    };

    socket.on('ddd:update', handleUpdate);

    return () => {
      socket.off('ddd:update', handleUpdate);
      socket.emit('ddd:unsubscribe', { domain, beneficiaryId });
    };
  }, [domain, beneficiaryId]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  return { events, lastEvent, clearEvents };
}

/* ════════════════════════════════════════════════════════════
 *  useRealtimeKPIs — لوحة المؤشرات المباشرة
 * ════════════════════════════════════════════════════════════ */
export function useRealtimeKPIs() {
  const [kpis, setKpis] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    // Subscribe to dashboards
    socket.emit('ddd:subscribe', { domain: 'dashboards' });

    // Request initial KPI data
    socket.emit('ddd:kpi:request');

    const handleKPIs = data => {
      if (data.kpis) {
        setKpis(data.kpis);
        setLoading(false);
      }
      setLastUpdate(data.timestamp);
    };

    const handleKPIUpdate = data => {
      if (data.kpiCode) {
        setKpis(prev => ({
          ...prev,
          [data.kpiCode]: {
            ...prev[data.kpiCode],
            value: data.value,
            trend: data.trend,
          },
        }));
        setLastUpdate(data.timestamp);
      }
    };

    socket.on('ddd:kpi:update', handleKPIs);
    socket.on('ddd:kpi:update', handleKPIUpdate);

    return () => {
      socket.off('ddd:kpi:update', handleKPIs);
      socket.off('ddd:kpi:update', handleKPIUpdate);
      socket.emit('ddd:unsubscribe', { domain: 'dashboards' });
    };
  }, []);

  const refresh = useCallback(() => {
    const socket = getSocket();
    socket.emit('ddd:kpi:request');
    setLoading(true);
  }, []);

  return { kpis, loading, lastUpdate, refresh };
}

/* ════════════════════════════════════════════════════════════
 *  useBeneficiary360Live — بيانات المستفيد المباشرة
 * ════════════════════════════════════════════════════════════ */
export function useBeneficiary360Live(beneficiaryId) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    if (!beneficiaryId) return;

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    // Subscribe to beneficiary-specific events
    socket.emit('ddd:subscribe', { beneficiaryId });
    socket.emit('ddd:beneficiary:360:request', { beneficiaryId });

    const handle360 = data => {
      if (data.beneficiaryId === beneficiaryId) {
        setSummary(data.summary);
        setLoading(false);
      }
    };

    const handleUpdate = event => {
      setUpdates(prev => [event, ...prev].slice(0, 50));
    };

    socket.on('ddd:beneficiary:360', handle360);
    socket.on('ddd:update', handleUpdate);

    return () => {
      socket.off('ddd:beneficiary:360', handle360);
      socket.off('ddd:update', handleUpdate);
      socket.emit('ddd:unsubscribe', { beneficiaryId });
    };
  }, [beneficiaryId]);

  const refresh = useCallback(() => {
    if (!beneficiaryId) return;
    const socket = getSocket();
    socket.emit('ddd:beneficiary:360:request', { beneficiaryId });
    setLoading(true);
  }, [beneficiaryId]);

  return { summary, loading, updates, refresh };
}

/* ════════════════════════════════════════════════════════════
 *  useRealtimeAlerts — تنبيهات دعم القرار
 * ════════════════════════════════════════════════════════════ */
export function useRealtimeAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.emit('ddd:subscribe', { domain: 'dashboards' });

    const handleAlert = alert => {
      setAlerts(prev => [alert, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
    };

    socket.on('ddd:alert', handleAlert);

    return () => {
      socket.off('ddd:alert', handleAlert);
    };
  }, []);

  const markAllRead = useCallback(() => setUnreadCount(0), []);
  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setUnreadCount(0);
  }, []);

  return { alerts, unreadCount, markAllRead, clearAlerts };
}

/* ════════════════════════════════════════════════════════════
 *  useDomainHealth — مراقبة صحة المجالات
 * ════════════════════════════════════════════════════════════ */
export function useDomainHealth() {
  const [health, setHealth] = useState({ domains: [], count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.emit('ddd:health:request');

    const handleHealth = data => {
      setHealth(data);
      setLoading(false);
    };

    socket.on('ddd:health', handleHealth);

    return () => {
      socket.off('ddd:health', handleHealth);
    };
  }, []);

  const refresh = useCallback(() => {
    const socket = getSocket();
    socket.emit('ddd:health:request');
    setLoading(true);
  }, []);

  return { ...health, loading, refresh };
}
