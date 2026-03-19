/**
 * Professional React Hooks Collection — مجموعة هوكس احترافية
 *
 * Reusable hooks for common patterns across the application.
 *
 * @module hooks/index
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import logger from 'utils/logger';

// ═══════════════════════════════════════════════════════════════════════════
// useApi — Generic API call hook with loading/error/data state
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook for API calls with automatic loading, error, and data management.
 *
 * @param {Function} apiFn - API function to call (must return a promise)
 * @param {Object} options - { immediate, deps, onSuccess, onError, transform }
 * @returns {{ data, loading, error, execute, reset }}
 *
 * Usage:
 *   const { data: users, loading, execute } = useApi(getUsers, { immediate: true });
 */
export function useApi(apiFn, options = {}) {
  const {
    immediate = false,
    deps = [],
    onSuccess,
    onError,
    transform,
    defaultData = null,
  } = options;

  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const execute = useCallback(
    async (...args) => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiFn(...args);
        if (!mountedRef.current) return;

        const transformed = transform ? transform(result) : result;
        setData(transformed);
        onSuccess?.(transformed);
        return transformed;
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err);
        onError?.(err);
        throw err;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFn, ...deps]
  );

  const reset = useCallback(() => {
    setData(defaultData);
    setError(null);
    setLoading(false);
  }, [defaultData]);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate) execute();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate]);

  return { data, loading, error, execute, reset };
}

// ═══════════════════════════════════════════════════════════════════════════
// useDebounce — Debounced value for search/filter inputs
// ═══════════════════════════════════════════════════════════════════════════

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ═══════════════════════════════════════════════════════════════════════════
// useLocalStorage — Persistent state with localStorage
// ═══════════════════════════════════════════════════════════════════════════

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (err) {
      logger.error(`[useLocalStorage] Error reading ${key}:`, err);
      return initialValue;
    }
  });

  const setValue = useCallback(
    value => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (err) {
        logger.error(`[useLocalStorage] Error writing ${key}:`, err);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (err) {
      logger.error(`[useLocalStorage] Error removing ${key}:`, err);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// ═══════════════════════════════════════════════════════════════════════════
// usePagination — Pagination state management
// ═══════════════════════════════════════════════════════════════════════════

export function usePagination({ defaultPage = 1, defaultLimit = 20, total = 0 } = {}) {
  const [page, setPage] = useState(defaultPage);
  const [limit, setLimit] = useState(defaultLimit);

  const totalPages = useMemo(() => Math.ceil(total / limit), [total, limit]);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const goToPage = useCallback(
    p => {
      setPage(Math.max(1, Math.min(p, totalPages || 1)));
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    if (hasNextPage) setPage(p => p + 1);
  }, [hasNextPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) setPage(p => p - 1);
  }, [hasPrevPage]);

  const reset = useCallback(() => {
    setPage(defaultPage);
    setLimit(defaultLimit);
  }, [defaultPage, defaultLimit]);

  return {
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPrevPage,
    setPage: goToPage,
    setLimit,
    nextPage,
    prevPage,
    reset,
    offset: (page - 1) * limit,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// useForm — Form state management with validation
// ═══════════════════════════════════════════════════════════════════════════

export function useForm(initialValues = {}, validationRules = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback((field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));
    // Clear error on change
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleChange = useCallback(
    e => {
      const { name, value, type, checked } = e.target;
      setValue(name, type === 'checkbox' ? checked : value);
    },
    [setValue]
  );

  const handleBlur = useCallback(
    e => {
      const { name } = e.target;
      setTouched(prev => ({ ...prev, [name]: true }));

      // Validate single field
      const rule = validationRules[name];
      if (rule) {
        const error = rule(values[name], values);
        setErrors(prev =>
          error
            ? { ...prev, [name]: error }
            : (() => {
                const n = { ...prev };
                delete n[name];
                return n;
              })()
        );
      }
    },
    [validationRules, values]
  );

  const validate = useCallback(() => {
    const newErrors = {};
    Object.entries(validationRules).forEach(([field, rule]) => {
      const error = rule(values[field], values);
      if (error) newErrors[field] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validationRules]);

  const handleSubmit = useCallback(
    onSubmit => async e => {
      e?.preventDefault();
      setIsSubmitting(true);
      // Touch all fields
      const allTouched = {};
      Object.keys(validationRules).forEach(k => {
        allTouched[k] = true;
      });
      setTouched(allTouched);

      if (validate()) {
        try {
          await onSubmit(values);
        } catch (err) {
          logger.error('[useForm] Submit error:', err);
        }
      }
      setIsSubmitting(false);
    },
    [values, validate, validationRules]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const isValid = Object.keys(errors).length === 0;
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    setValue,
    handleChange,
    handleBlur,
    handleSubmit,
    validate,
    reset,
    setValues,
    setErrors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// useOnlineStatus — Network connectivity detection
// ═══════════════════════════════════════════════════════════════════════════

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// ═══════════════════════════════════════════════════════════════════════════
// useInterval — Safe interval hook
// ═══════════════════════════════════════════════════════════════════════════

export function useInterval(callback, delay) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// ═══════════════════════════════════════════════════════════════════════════
// usePermission — RBAC permission check hook
// ═══════════════════════════════════════════════════════════════════════════

export function usePermission(resource, action) {
  const { currentUser } = useAuth_internal();
  return useMemo(() => {
    if (!currentUser) return false;
    const role = currentUser.role || 'guest';
    if (role === 'super_admin' || role === 'admin') return true;
    const perms = currentUser.permissions || [];
    return (
      perms.includes(`${resource}:${action}`) ||
      perms.includes(`${resource}:*`) ||
      perms.includes('*')
    );
  }, [currentUser, resource, action]);
}

// Internal import to avoid circular dependency
function useAuth_internal() {
  try {
    const mod = require('contexts/AuthContext');
    return mod.useAuth();
  } catch (e) {
    return { currentUser: null };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Re-export standalone hooks
// ═══════════════════════════════════════════════════════════════════════════
export { default as useTableState } from './useTableState';
export { default as useExport } from './useExport';
export { default as useSearch } from './useSearch';
export { default as useSort } from './useSort';
export { default as useSocket } from './useSocket';
export { default as useDateRange } from './useDateRange';
export { default as useConfirmDialog } from './useConfirmDialog';
export { default as useNotifications } from './useNotifications';
