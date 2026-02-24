// Phase 12 - Custom React Hooks
// Reusable hooks for common functionality

import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardAPI, searchAPI, validationAPI, adminAPI } from '../services/api';

/**
 * Hook for fetching dashboard data with auto-refresh
 */
export const useDashboard = (refreshInterval = 5000) => {
  const [health, setHealth] = useState(null);
  const [summary, setSummary] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const [healthRes, summaryRes, servicesRes] = await Promise.all([
        dashboardAPI.getHealth(),
        dashboardAPI.getSummary(),
        dashboardAPI.getServices(),
      ]);

      setHealth(healthRes.data.data);
      setSummary(summaryRes.data.data);
      setServices(servicesRes.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchDashboard, refreshInterval]);

  return { health, summary, services, loading, error, refresh: fetchDashboard };
};

/**
 * Hook for search functionality with debouncing
 */
export const useSearch = (debounceDelay = 300) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  const search = useCallback(async (searchQuery, type = 'full-text') => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchFn = type === 'fuzzy' ? searchAPI.fuzzy : searchAPI.fullText;
      const response = await searchFn(searchQuery);
      setResults(response.data.data.results || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const getSuggestions = useCallback(async searchQuery => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await searchAPI.suggestions(searchQuery);
      setSuggestions(response.data.data || []);
    } catch (err) {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (query) {
      timeoutRef.current = setTimeout(() => {
        getSuggestions(query);
      }, debounceDelay);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, debounceDelay, getSuggestions]);

  return { query, setQuery, results, suggestions, loading, error, search };
};

/**
 * Hook for data validation
 */
export const useValidation = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const validate = useCallback(async (type, value) => {
    setLoading(true);
    setError(null);
    try {
      let response;
      switch (type) {
        case 'email':
          response = await validationAPI.email(value);
          break;
        case 'phone':
          response = await validationAPI.phone(value);
          break;
        case 'url':
          response = await validationAPI.url(value);
          break;
        case 'schema':
          response = await validationAPI.schema(value);
          break;
        default:
          throw new Error('Invalid validation type');
      }
      setResult(response.data.data);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, validate };
};

/**
 * Hook for admin data management
 */
export const useAdmin = () => {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAdminData = useCallback(async () => {
    try {
      const [overviewRes, usersRes, alertsRes] = await Promise.all([
        adminAPI.getOverview(),
        adminAPI.getUsers(),
        adminAPI.getAlerts(),
      ]);

      setOverview(overviewRes.data.data);
      setUsers(usersRes.data.data || []);
      setAlerts(alertsRes.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  return { overview, users, alerts, loading, error, refresh: fetchAdminData };
};

/**
 * Hook for local storage management
 */
export const useLocalStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setStoredValue = useCallback(
    newValue => {
      try {
        setValue(newValue);
        window.localStorage.setItem(key, JSON.stringify(newValue));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    },
    [key]
  );

  return [value, setStoredValue];
};

/**
 * Hook for window dimensions (responsive design)
 */
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

/**
 * Hook for detecting mobile devices
 */
export const useIsMobile = () => {
  const { width } = useWindowSize();
  return width < 768;
};
