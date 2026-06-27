import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardAPI } from '../services/api';

const DASHBOARD_KEYS = {
  health: ['dashboard', 'health'],
  summary: ['dashboard', 'summary'],
  summarySystems: ['dashboard', 'summary-systems'],
  services: ['dashboard', 'services'],
  topKPIs: (limit) => ['dashboard', 'top-kpis', limit],
};

/**
 * useDashboardHealth
 * جلب حالة الـ Dashboard مع caching 5 دقائق
 */
export function useDashboardHealth() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.health,
    queryFn: dashboardAPI.getHealth,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * useDashboardSummary
 * جلب summary الـ Dashboard
 */
export function useDashboardSummary() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.summary,
    queryFn: dashboardAPI.getSummary,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * useDashboardSummarySystems
 * جلب summary الأنظمة
 */
export function useDashboardSummarySystems() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.summarySystems,
    queryFn: dashboardAPI.getSummarySystems,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * useDashboardServices
 * جلب قائمة الخدمات
 */
export function useDashboardServices() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.services,
    queryFn: dashboardAPI.getServices,
    staleTime: 10 * 60 * 1000, // 10 minutes — services rarely change
  });
}

/**
 * useTopKPIs
 * جلب Top KPIs مع limit
 * @param {number} limit — عدد الـ KPIs (default: 4)
 */
export function useTopKPIs(limit = 4) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.topKPIs(limit),
    queryFn: () => dashboardAPI.getTopKPIs(limit),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * useDashboardPrefetch
 * Prefetch dashboard data for faster navigation
 */
export function useDashboardPrefetch() {
  const queryClient = useQueryClient();

  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: DASHBOARD_KEYS.summary,
      queryFn: dashboardAPI.getSummary,
      staleTime: 5 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: DASHBOARD_KEYS.services,
      queryFn: dashboardAPI.getServices,
      staleTime: 10 * 60 * 1000,
    });
  };

  return { prefetch };
}

// Default export for convenience
export default {
  useDashboardHealth,
  useDashboardSummary,
  useDashboardSummarySystems,
  useDashboardServices,
  useTopKPIs,
  useDashboardPrefetch,
};
