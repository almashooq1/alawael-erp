import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/api.client';

const GENERIC_KEYS = {
  list: (resource) => [resource, 'list'],
  detail: (resource, id) => [resource, 'detail', id],
};

/**
 * useGenericList
 * Hook عام لجلب list من أي resource
 * @param {string} resource — اسم الـ resource (e.g., 'users', 'beneficiaries')
 * @param {string} endpoint — endpoint الـ API (e.g., '/users')
 * @param {object} options — إضافية
 */
export function useGenericList(resource, endpoint, options = {}) {
  return useQuery({
    queryKey: GENERIC_KEYS.list(resource),
    queryFn: () => apiClient.get(endpoint),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * useGenericDetail
 * Hook عام لجلب detail من أي resource
 * @param {string} resource — اسم الـ resource
 * @param {string} endpoint — endpoint الـ API (e.g., '/users/{id}')
 * @param {string} id — ID الـ item
 * @param {object} options — إضافية
 */
export function useGenericDetail(resource, endpoint, id, options = {}) {
  return useQuery({
    queryKey: GENERIC_KEYS.detail(resource, id),
    queryFn: () => apiClient.get(endpoint.replace('{id}', id)),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * useGenericMutation
 * Hook عام للـ mutations (create, update, delete)
 * @param {string} resource — اسم الـ resource
 * @param {Function} mutationFn — دالة الـ mutation
 */
export function useGenericMutation(resource, mutationFn) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      // Invalidate list after any mutation
      queryClient.invalidateQueries({ queryKey: GENERIC_KEYS.list(resource) });
    },
  });
}

// Default export
export default {
  useGenericList,
  useGenericDetail,
  useGenericMutation,
};
