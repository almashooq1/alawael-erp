/**
 * useAuditLog Hook
 * Phase 13 - Week 1: Audit Logging Hook
 * Hook for logging user actions to audit trail
 */

import { useState, useCallback } from 'react';
import axios from 'axios';
import { useRBAC } from '../contexts/RBACContext';

/**
 * useAuditLog - Log user actions and fetch audit data
 *
 * @returns {object} - Audit logging functions and state
 */
export const useAuditLog = () => {
  const { user } = useRBAC();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAuthHeaders = useCallback(() => {
    return {
      Authorization: `Bearer ${localStorage.getItem('authToken')}`,
    };
  }, []);

  /**
   * Log a data access event
   */
  const logDataAccess = useCallback(
    async (action, resource, dataType, recordCount = 1, details = {}) => {
      try {
        await axios.post(
          '/api/audit/data-access',
          {
            action,
            resource,
            dataType,
            recordCount,
            details,
          },
          { headers: getAuthHeaders() }
        );
      } catch (err) {
        console.error('Failed to log data access:', err);
      }
    },
    [getAuthHeaders]
  );

  /**
   * Log a configuration change event
   */
  const logConfigChange = useCallback(
    async (configKey, oldValue, newValue, reason = '', details = {}) => {
      try {
        await axios.post(
          '/api/audit/config-change',
          {
            configKey,
            oldValue,
            newValue,
            reason,
            details,
          },
          { headers: getAuthHeaders() }
        );
      } catch (err) {
        console.error('Failed to log config change:', err);
      }
    },
    [getAuthHeaders]
  );

  /**
   * Log a security event
   */
  const logSecurityEvent = useCallback(
    async (severity, type, description, details = {}) => {
      try {
        await axios.post(
          '/api/audit/security-event',
          {
            severity,
            type,
            description,
            details,
          },
          { headers: getAuthHeaders() }
        );
      } catch (err) {
        console.error('Failed to log security event:', err);
      }
    },
    [getAuthHeaders]
  );

  /**
   * Fetch audit logs with filters
   */
  const fetchLogs = useCallback(
    async (filters = {}) => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get('/api/audit/logs', {
          params: filters,
          headers: getAuthHeaders(),
        });

        return response.data;
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders]
  );

  /**
   * Fetch audit statistics
   */
  const fetchStatistics = useCallback(
    async (days = 30) => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get('/api/audit/statistics', {
          params: { days },
          headers: getAuthHeaders(),
        });

        return response.data;
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders]
  );

  /**
   * Export audit logs
   */
  const exportLogs = useCallback(
    async (format = 'csv', filters = {}) => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get('/api/audit/export', {
          params: { format, ...filters },
          headers: getAuthHeaders(),
          responseType: 'blob',
        });

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `audit-logs-${Date.now()}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();

        return true;
      } catch (err) {
        setError(err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders]
  );

  return {
    user,
    loading,
    error,
    logDataAccess,
    logConfigChange,
    logSecurityEvent,
    fetchLogs,
    fetchStatistics,
    exportLogs,
  };
};

export default useAuditLog;
