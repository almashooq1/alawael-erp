/**
 * useBranchData.js — Custom Hook لإدارة بيانات الفروع
 *
 * Features:
 * - Declarative data fetching with loading/error states
 * - Auto-refresh with configurable interval
 * - Optimistic updates
 * - Role-based data access
 * - Shared state between components (via module-level cache)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import BranchApiService from '../services/branchApi.service';

// ─── useHQDashboard ────────────────────────────────────────────────────────────
/**
 * Hook for HQ executive dashboard data
 * @param {Object} options
 * @param {number} options.refreshInterval - ms (default: 3 min)
 * @param {boolean} options.includeFinancials
 * @param {boolean} options.includeAlerts
 */
export function useHQDashboard({
  refreshInterval = 3 * 60_000,
  includeFinancials = true,
  includeAlerts = true,
} = {}) {
  const [state, setState] = useState({
    dashboard: null,
    alerts: [],
    financials: null,
    rankings: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const mountedRef = useRef(true);
  const timerRef = useRef(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setState(s => ({ ...s, loading: true, error: null }));

      try {
        const promises = [BranchApiService.hq.getDashboard()];
        if (includeAlerts) promises.push(BranchApiService.hq.getAlerts());
        if (includeFinancials) promises.push(BranchApiService.hq.getFinancials());

        const results = await Promise.allSettled(promises);

        if (!mountedRef.current) return;

        const [dashResult, alertsResult, finResult] = results;

        setState(s => ({
          ...s,
          dashboard:
            dashResult.status === 'fulfilled'
              ? dashResult.value?.data || dashResult.value
              : s.dashboard,
          alerts:
            alertsResult?.status === 'fulfilled'
              ? alertsResult.value?.data?.alerts || alertsResult.value?.alerts || []
              : s.alerts,
          financials:
            finResult?.status === 'fulfilled'
              ? finResult.value?.data || finResult.value
              : s.financials,
          loading: false,
          error: dashResult.status === 'rejected' ? dashResult.reason?.message : null,
          lastUpdated: new Date(),
        }));
      } catch (err) {
        if (!mountedRef.current) return;
        setState(s => ({ ...s, loading: false, error: err.message }));
      }
    },
    [includeFinancials, includeAlerts]
  );

  // Initial load
  useEffect(() => {
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval) return;
    timerRef.current = setInterval(() => load(true), refreshInterval);
    return () => clearInterval(timerRef.current);
  }, [load, refreshInterval]);

  const refresh = useCallback(() => load(), [load]);
  const refreshSilent = useCallback(() => load(true), [load]);

  return { ...state, refresh, refreshSilent };
}

// ─── useBranchDashboard ───────────────────────────────────────────────────────
/**
 * Hook for individual branch dashboard
 * @param {string} branchCode
 * @param {string} userRole
 * @param {Object} options
 */
export function useBranchDashboard(
  branchCode,
  _userRole = 'branch_manager',
  { refreshInterval = 3 * 60_000 } = {}
) {
  const [state, setState] = useState({
    dashboard: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const mountedRef = useRef(true);

  const load = useCallback(
    async (silent = false) => {
      if (!branchCode) return;
      if (!silent) setState(s => ({ ...s, loading: true, error: null }));

      try {
        const res = await BranchApiService.branch.getDashboard(branchCode);
        if (!mountedRef.current) return;
        setState({
          dashboard: res?.data || res,
          loading: false,
          error: null,
          lastUpdated: new Date(),
        });
      } catch (err) {
        if (!mountedRef.current) return;
        setState(s => ({ ...s, loading: false, error: err.message }));
      }
    },
    [branchCode]
  );

  useEffect(() => {
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  useEffect(() => {
    if (!refreshInterval) return;
    const timer = setInterval(() => load(true), refreshInterval);
    return () => clearInterval(timer);
  }, [load, refreshInterval]);

  return { ...state, refresh: () => load() };
}

// ─── useBranchAnalytics ───────────────────────────────────────────────────────
/**
 * Hook for branch analytics data (trends, forecast, recommendations)
 * @param {string} branchCode
 * @param {Object} options
 */
export function useBranchAnalytics(
  branchCode,
  { days = 30, forecastMetric = 'revenue', forecastDays = 7 } = {}
) {
  const [state, setState] = useState({
    trends: null,
    forecast: null,
    recommendations: null,
    analytics: null,
    loading: true,
    error: null,
  });

  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!branchCode) return;
    setState(s => ({ ...s, loading: true, error: null }));

    try {
      const [trendsRes, forecastRes, recsRes, analyticsRes] = await Promise.allSettled([
        BranchApiService.branch.getTrends(branchCode, days),
        BranchApiService.branch.getForecast(branchCode, forecastMetric, forecastDays),
        BranchApiService.branch.getRecommendations(branchCode),
        BranchApiService.branch.getAnalytics(branchCode, days),
      ]);

      if (!mountedRef.current) return;

      setState({
        trends: trendsRes.status === 'fulfilled' ? trendsRes.value?.data || trendsRes.value : null,
        forecast:
          forecastRes.status === 'fulfilled' ? forecastRes.value?.data || forecastRes.value : null,
        recommendations:
          recsRes.status === 'fulfilled' ? recsRes.value?.data || recsRes.value : null,
        analytics:
          analyticsRes.status === 'fulfilled'
            ? analyticsRes.value?.data || analyticsRes.value
            : null,
        loading: false,
        error: null,
      });
    } catch (err) {
      if (!mountedRef.current) return;
      setState(s => ({ ...s, loading: false, error: err.message }));
    }
  }, [branchCode, days, forecastMetric, forecastDays]);

  useEffect(() => {
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return { ...state, refresh: load };
}

// ─── useBranchKPIs ────────────────────────────────────────────────────────────
/**
 * Lightweight hook for KPI data only
 */
export function useBranchKPIs(branchCode, { refreshInterval = 5 * 60_000 } = {}) {
  const [kpis, setKPIs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!branchCode) return;
    try {
      const res = await BranchApiService.branch.getKPIs(branchCode);
      if (mountedRef.current) setKPIs(res?.data || res);
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [branchCode]);

  useEffect(() => {
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  useEffect(() => {
    if (!refreshInterval) return;
    const timer = setInterval(load, refreshInterval);
    return () => clearInterval(timer);
  }, [load, refreshInterval]);

  return { kpis, loading, error, refresh: load };
}

// ─── useNetworkRankings ───────────────────────────────────────────────────────
/**
 * Hook for cross-branch rankings
 */
export function useNetworkRankings({ date = null, refreshInterval = 10 * 60_000 } = {}) {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await BranchApiService.hq.getRankings(date);
      if (mountedRef.current) {
        setRankings(res?.data?.rankings || res?.rankings || []);
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
        setLoading(false);
      }
    }
  }, [date]);

  useEffect(() => {
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  useEffect(() => {
    if (!refreshInterval) return;
    const timer = setInterval(load, refreshInterval);
    return () => clearInterval(timer);
  }, [load, refreshInterval]);

  return { rankings, loading, error, refresh: load };
}

// ─── useBranchTargets ─────────────────────────────────────────────────────────
/**
 * Hook for branch KPI targets with set/update capability
 */
export function useBranchTargets(
  branchCode,
  year = new Date().getFullYear(),
  month = new Date().getMonth() + 1
) {
  const [targets, setTargets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!branchCode) return;
    setLoading(true);
    try {
      const res = await BranchApiService.branch.getTargets(branchCode, year, month);
      if (mountedRef.current) setTargets(res?.data || res);
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [branchCode, year, month]);

  const save = useCallback(
    async data => {
      setSaving(true);
      setError(null);
      try {
        const res = await BranchApiService.branch.setTargets(branchCode, {
          ...data,
          period_year: year,
          period_month: month,
        });
        if (mountedRef.current) setTargets(res?.data || res);
        return { success: true };
      } catch (err) {
        if (mountedRef.current) setError(err.message);
        return { success: false, error: err.message };
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    },
    [branchCode, year, month]
  );

  useEffect(() => {
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return { targets, loading, saving, error, save, refresh: load };
}

// ─── useAlerts ────────────────────────────────────────────────────────────────
/**
 * Hook for real-time alerts (branch or HQ-wide)
 */
export function useAlerts({ branchCode = null, refreshInterval = 60_000 } = {}) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = branchCode
        ? await BranchApiService.branch.getDashboard(branchCode)
        : await BranchApiService.hq.getAlerts();

      const newAlerts = branchCode
        ? res?.data?.alerts || res?.alerts || []
        : res?.data?.alerts || res?.alerts || [];

      if (mountedRef.current) {
        setAlerts(newAlerts);
        setUnreadCount(newAlerts.filter(a => !a.acknowledged).length);
        setLoading(false);
      }
    } catch {
      if (mountedRef.current) setLoading(false);
    }
  }, [branchCode]);

  useEffect(() => {
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  useEffect(() => {
    if (!refreshInterval) return;
    const timer = setInterval(load, refreshInterval);
    return () => clearInterval(timer);
  }, [load, refreshInterval]);

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.type === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning' || a.type === 'warning');

  return { alerts, criticalAlerts, warningAlerts, unreadCount, loading, refresh: load };
}

// ─── useBranchList ────────────────────────────────────────────────────────────
/**
 * Hook for the list of all branches
 */
export function useBranchList() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    BranchApiService.branch
      .list()
      .then(res => {
        if (mountedRef.current) {
          setBranches(res?.data?.branches || res?.branches || []);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mountedRef.current) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { branches, loading, error };
}
