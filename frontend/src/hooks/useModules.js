import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modulesAPI } from '../services/api';

const MODULE_KEYS = {
  list: ['modules'],
  detail: (moduleKey) => ['modules', moduleKey],
};

/**
 * useModules
 * جلب قائمة كل الـ modules
 */
export function useModules() {
  return useQuery({
    queryKey: MODULE_KEYS.list,
    queryFn: modulesAPI.getModules,
    staleTime: 10 * 60 * 1000, // 10 minutes — modules rarely change
  });
}

/**
 * useModule
 * جلب بيانات module محدد
 * @param {string} moduleKey — مفتاح الـ module
 */
export function useModule(moduleKey) {
  return useQuery({
    queryKey: MODULE_KEYS.detail(moduleKey),
    queryFn: () => modulesAPI.getModuleData(moduleKey),
    enabled: !!moduleKey, // Don't run if moduleKey is empty
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * useModulePrefetch
 * Prefetch module data for faster navigation
 */
export function useModulePrefetch() {
  const queryClient = useQueryClient();

  const prefetch = (moduleKey) => {
    queryClient.prefetchQuery({
      queryKey: MODULE_KEYS.detail(moduleKey),
      queryFn: () => modulesAPI.getModuleData(moduleKey),
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetch };
}

// Default export
export default {
  useModules,
  useModule,
  useModulePrefetch,
};
