/**
 * useAdvancedDashboard — Custom hook encapsulating all dashboard state & effects
 * Extracted from AdvancedDashboard monolith
 */
import { useState, useEffect, useCallback, useMemo, useRef, useReducer } from 'react';
import { getDashboardStats, exportDashboardCSV } from 'services/dashboardService';
import {
  useRealtimeDashboard,
  useRealTimeNotifications,
  useSocket,
  useSocketEmit,
} from 'contexts/SocketContext';
import {
  SECTIONS,
  SECTION_KEYWORDS,
  REFRESH_INTERVAL,
  readCache,
  writeCache,
} from '../dashboardConstants';
import { initialState, dashboardReducer } from './dashboardReducer';

export const useAdvancedDashboard = () => {
  // Hydrate from localStorage cache for instant display
  const cached = useMemo(() => readCache(), []);
  const [state, dispatch] = useReducer(dashboardReducer, cached, initialState);
  const {
    data,
    loading,
    error,
    lastUpdated,
    refreshing,
    showScrollTop,
    activeSection,
    refreshProgress,
    socketToast,
    dataSource,
    collapsedSections,
    sessionStart,
    searchQuery,
  } = state;
  const dashboardRef = useRef(null);
  const prevConnected = useRef(null);

  // ── Real-time Socket Integration ─────────────────────────
  const { connected: socketConnected } = useSocket();
  const { summaryCards, topKPIs, lastUpdate: rtLastUpdate } = useRealtimeDashboard();
  const { notifications: rtNotifications } = useRealTimeNotifications();
  const emit = useSocketEmit();

  // Merge real-time data with polled data
  useEffect(() => {
    if (rtLastUpdate && data) {
      const merged = { ...data };
      if (summaryCards.length > 0) merged._rtSummary = summaryCards;
      if (topKPIs.length > 0) merged._rtTopKPIs = topKPIs;
      dispatch({ type: 'SET_DATA', data: merged });
      dispatch({ type: 'SET_DATA_SOURCE', source: 'socket', lastUpdated: rtLastUpdate });
    }
  }, [rtLastUpdate, summaryCards, topKPIs]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Socket connection change toast ────────────────────────
  useEffect(() => {
    if (prevConnected.current === null) {
      prevConnected.current = socketConnected;
      return;
    }
    if (socketConnected !== prevConnected.current) {
      dispatch({ type: 'SET_SOCKET_TOAST', value: socketConnected ? 'connected' : 'disconnected' });
      prevConnected.current = socketConnected;
    }
  }, [socketConnected]);

  // ── Dynamic document.title with notification badge ────
  useEffect(() => {
    const base = 'لوحة التحكم — نظام الأوائل';
    const unread =
      (data?.alerts || []).filter(a => !a.read).length +
      rtNotifications.filter(n => !n.read).length;
    document.title = unread > 0 ? `(${unread}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [data?.alerts, rtNotifications]);

  // ── Auto-refresh success micro-feedback ────────────────
  const [refreshFlash, setRefreshFlash] = useState(false);
  const initialLoadDone = useRef(false);

  // Merge real-time notifications into alerts
  const mergedAlerts = useMemo(() => {
    const existing = data?.alerts || [];
    if (rtNotifications.length === 0) return existing;
    const rtAlerts = rtNotifications.map(n => ({
      id: n.id || `rt-${Date.now()}-${Math.random()}`,
      message: n.message || n.title,
      title: n.title,
      severity: n.severity || 'low',
      read: n.read || false,
      time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString('ar-SA') : 'الآن',
    }));
    const existingIds = new Set(existing.map(a => a.id));
    const newAlerts = rtAlerts.filter(a => !existingIds.has(a.id));
    return [...newAlerts, ...existing];
  }, [data?.alerts, rtNotifications]);

  // ── Fetch data from API (with retry & exponential backoff) ──
  const fetchData = useCallback(
    async (isRefresh = false) => {
      const MAX_RETRIES = 3;
      const BASE_DELAY = 1000;
      let lastError;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          if (attempt === 0 && isRefresh) dispatch({ type: 'FETCH_START', isRefresh: true });
          const result = await getDashboardStats();
          writeCache(result);
          dispatch({ type: 'FETCH_SUCCESS', data: result });
          if (socketConnected) emit('dashboard:request-update');
          if (initialLoadDone.current) {
            setRefreshFlash(true);
            setTimeout(() => setRefreshFlash(false), 2200);
          } else {
            initialLoadDone.current = true;
          }
          return;
        } catch (err) {
          lastError = err;
          if (attempt < MAX_RETRIES - 1) {
            await new Promise(r => setTimeout(r, BASE_DELAY * 2 ** attempt));
          }
        }
      }
      dispatch({ type: 'FETCH_ERROR', error: lastError?.message || 'فشل تحميل البيانات' });
    },
    [socketConnected, emit]
  );

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Auto-refresh progress bar (visual countdown) ─────────
  useEffect(() => {
    dispatch({ type: 'SET_REFRESH_PROGRESS', value: 0 });
    const step = 1000;
    const increment = (step / REFRESH_INTERVAL) * 100;
    let progress = 0;
    const timer = setInterval(() => {
      progress += increment;
      if (progress >= 100) progress = 0;
      dispatch({ type: 'SET_REFRESH_PROGRESS', value: progress });
    }, step);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // ── Scroll-to-top + track active section (combined, rAF-throttled) ─
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const shouldShow = window.scrollY > 400;
        const ids = SECTIONS.map(s => `section-${s.id}`);
        let current = 'finance';
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 180) current = id.replace('section-', '');
          }
        }
        dispatch({ type: 'SCROLL_UPDATE', showScrollTop: shouldShow, activeSection: current });
        ticking = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // ── Keyboard shortcuts ───────────────────────────────────
  const [showShortcuts, setShowShortcuts] = useState(false);
  useEffect(() => {
    const handleKeyboard = e => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        fetchData(true);
      }
      if (e.key === 'Home' && !e.ctrlKey && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        scrollToTop();
      }
      if (
        e.key === '?' &&
        !e.ctrlKey &&
        !e.altKey &&
        !['INPUT', 'TEXTAREA'].includes(e.target.tagName)
      ) {
        setShowShortcuts(prev => !prev);
      }
      if (
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        !['INPUT', 'TEXTAREA'].includes(e.target.tagName)
      ) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= SECTIONS.length) {
          const sec = SECTIONS[num - 1];
          const el = document.getElementById(`section-${sec.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [fetchData]);

  // ── Online / Offline connectivity detection ──────────────
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Relative time display (updates every 10s) ─────────────
  const [relativeTime, setRelativeTime] = useState('');
  useEffect(() => {
    if (!lastUpdated) return;
    const update = () => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (diff < 10) setRelativeTime('الآن');
      else if (diff < 60) setRelativeTime(`منذ ${diff} ثانية`);
      else if (diff < 3600) setRelativeTime(`منذ ${Math.floor(diff / 60)} دقيقة`);
      else setRelativeTime(`منذ ${Math.floor(diff / 3600)} ساعة`);
    };
    update();
    const timer = setInterval(update, 10000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // ── Session duration counter (updates every 60s) ─────────
  const [sessionDuration, setSessionDuration] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - sessionStart) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      if (h > 0) setSessionDuration(`${h} س ${m} د`);
      else if (m > 0) setSessionDuration(`${m} دقيقة`);
      else setSessionDuration('أقل من دقيقة');
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [sessionStart]);

  // ── Destructure data ─────────────────────────────────────────
  const kpis = data?.kpis || {};
  const charts = data?.charts || {};
  const finance = data?.finance || {};
  const clinical = data?.clinical || {};
  const hr = data?.hr || {};
  const supplyChain = data?.supplyChain || {};
  const fleet = data?.fleet || {};
  const operations = data?.operations || {};

  // ── Build KPI cards ──────────────────────────────────────────
  const kpiCards = useMemo(
    () => [
      {
        title: kpis.users?.label || 'المستخدمون',
        value: kpis.users?.total || 0,
        subtitle: `${kpis.users?.active || 0} نشط`,
        icon: kpis.users?.icon || 'People',
        trend: kpis.users?.trend,
      },
      {
        title: kpis.beneficiaries?.label || 'المستفيدون',
        value: kpis.beneficiaries?.total || 0,
        subtitle: `${kpis.beneficiaries?.active || 0} نشط`,
        icon: kpis.beneficiaries?.icon || 'Accessibility',
        trend: kpis.beneficiaries?.trend,
      },
      {
        title: kpis.employees?.label || 'الموظفون',
        value: kpis.employees?.total || 0,
        icon: kpis.employees?.icon || 'Badge',
        trend: kpis.employees?.trend,
      },
      {
        title: kpis.sessions?.label || 'الجلسات',
        value: kpis.sessions?.total || 0,
        subtitle: `${kpis.sessions?.today || 0} اليوم`,
        icon: kpis.sessions?.icon || 'EventNote',
        trend: kpis.sessions?.trend,
      },
      {
        title: kpis.payments?.label || 'المدفوعات',
        value: kpis.payments?.total || 0,
        subtitle: `${kpis.payments?.monthCount || 0} هذا الشهر`,
        icon: kpis.payments?.icon || 'AccountBalance',
        trend: finance.revenueTrend,
      },
      {
        title: kpis.attendance?.label || 'الحضور اليوم',
        value: kpis.attendance?.today || 0,
        icon: kpis.attendance?.icon || 'HowToReg',
        trend: kpis.attendance?.trend,
      },
      {
        title: kpis.documents?.label || 'المستندات',
        value: kpis.documents?.total || 0,
        icon: kpis.documents?.icon || 'Description',
        trend: kpis.documents?.trend,
      },
      {
        title: kpis.invoices?.label || 'الفواتير المعلقة',
        value: kpis.invoices?.pending || 0,
        icon: kpis.invoices?.icon || 'Receipt',
        trend: kpis.invoices?.trend,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );

  // ── Section search / filter ──────────────────────────────────
  const visibleSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const visible = {};
    Object.entries(SECTION_KEYWORDS).forEach(([id, keywords]) => {
      const sectionMeta = SECTIONS.find(s => s.id === id);
      const label = sectionMeta?.label || '';
      if (label.toLowerCase().includes(q) || keywords.some(kw => kw.includes(q))) {
        visible[id] = true;
      }
    });
    return visible;
  }, [searchQuery]);

  const isSectionVisible = useCallback(
    id => {
      if (!visibleSections) return true;
      return !!visibleSections[id];
    },
    [visibleSections]
  );

  return {
    // State
    data,
    loading,
    error,
    lastUpdated,
    refreshing,
    showScrollTop,
    activeSection,
    refreshProgress,
    socketToast,
    dataSource,
    collapsedSections,
    searchQuery,
    // Derived
    kpis,
    charts,
    finance,
    clinical,
    hr,
    supplyChain,
    fleet,
    operations,
    kpiCards,
    mergedAlerts,
    visibleSections,
    socketConnected,
    refreshFlash,
    isOnline,
    relativeTime,
    sessionDuration,
    showShortcuts,
    setShowShortcuts,
    // Actions
    dispatch,
    fetchData,
    scrollToTop,
    isSectionVisible,
    // Refs
    dashboardRef,
    // Export helper
    exportData: () => exportDashboardCSV(data),
  };
};
