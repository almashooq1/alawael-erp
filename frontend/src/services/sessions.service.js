/**
 * Sessions Service — API layer for the Sessions module dashboard.
 * Replaces raw fetch() calls that were previously inlined in SessionsDashboard.
 */

import apiClient from './api.client';
import logger from 'utils/logger';

const sessionsService = {
  /** Fetch all sessions from the smart scheduler */
  getAll: async () => {
    try {
      const res = await apiClient.get('/smart-scheduler');
      return res?.data || res || [];
    } catch (err) {
      logger.warn('sessionsService.getAll', err);
      return [];
    }
  },

  /** Fetch session statistics summary */
  getStats: async () => {
    try {
      const res = await apiClient.get('/smart-scheduler/stats');
      return res?.data || res || null;
    } catch (err) {
      logger.warn('sessionsService.getStats', err);
      return null;
    }
  },
};

export default sessionsService;
