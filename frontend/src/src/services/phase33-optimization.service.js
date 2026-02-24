/**
 * Phase 33: System Optimization Service
 * Performance Tuning, Caching Strategy, Database Optimization, Resource Management
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/phases-29-33';

const fetchAPI = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Phase 33 API Error on ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Phase 33: System Optimization APIs
 */
export const phase33Optimization = {
  // Performance Tuning
  performance: {
    /**
     * Analyze system performance
     * @param {object} config - Analysis configuration
     */
    analyze: async (config = {}) => {
      return fetchAPI('/optimization/performance/analyze', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },

    /**
     * Get performance metrics
     */
    getMetrics: async () => {
      return fetchAPI('/optimization/performance/metrics');
    },

    /**
     * Auto-tune system performance
     * @param {object} tuningConfig - Tuning configuration
     */
    autoTune: async (tuningConfig = {}) => {
      return fetchAPI('/optimization/performance/tune', {
        method: 'POST',
        body: JSON.stringify(tuningConfig),
      });
    },

    /**
     * Get performance recommendations
     */
    getRecommendations: async () => {
      return fetchAPI('/optimization/performance/recommendations');
    },
  },

  // Advanced Caching Strategy
  caching: {
    /**
     * Get current cache strategy
     */
    getStrategy: async () => {
      return fetchAPI('/cache/strategy');
    },

    /**
     * Optimize caching configuration
     * @param {object} config - Cache optimization config
     */
    optimize: async config => {
      return fetchAPI('/cache/strategy', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },

    /**
     * Get cache statistics
     */
    getStatistics: async () => {
      return fetchAPI('/cache/stats');
    },

    /**
     * Clear cache
     * @param {object} filter - Cache clear filter
     */
    clear: async (filter = {}) => {
      return fetchAPI('/cache/clear', {
        method: 'POST',
        body: JSON.stringify(filter),
      });
    },

    /**
     * Get cache hit rate
     */
    getHitRate: async () => {
      return fetchAPI('/cache/hit-rate');
    },
  },

  // Database Optimization
  database: {
    /**
     * Optimize database
     * @param {object} config - Optimization configuration
     */
    optimize: async (config = {}) => {
      return fetchAPI('/db/optimize', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },

    /**
     * Get database health status
     */
    getHealth: async () => {
      return fetchAPI('/db/health');
    },

    /**
     * Analyze database indexes
     */
    analyzeIndexes: async () => {
      return fetchAPI('/db/indexes/analyze');
    },

    /**
     * Run database defragmentation
     */
    defragment: async () => {
      return fetchAPI('/db/defragment', {
        method: 'POST',
      });
    },

    /**
     * Get database size info
     */
    getSizeInfo: async () => {
      return fetchAPI('/db/size');
    },
  },

  // Resource Utilization
  resources: {
    /**
     * Monitor resources
     */
    monitor: async () => {
      return fetchAPI('/resource/monitor');
    },

    /**
     * Get resource allocation
     */
    getAllocation: async () => {
      return fetchAPI('/resource/allocation');
    },

    /**
     * Optimize resource allocation
     * @param {object} allocationConfig - Allocation configuration
     */
    optimize: async allocationConfig => {
      return fetchAPI('/resource/optimize', {
        method: 'POST',
        body: JSON.stringify(allocationConfig),
      });
    },

    /**
     * Get resource utilization alerts
     */
    getAlerts: async () => {
      return fetchAPI('/resource/alerts');
    },

    /**
     * Get per-module resource usage
     */
    getModuleUsage: async () => {
      return fetchAPI('/resource/module-usage');
    },
  },

  // Uptime & Reliability
  uptime: {
    /**
     * Monitor uptime
     */
    monitor: async () => {
      return fetchAPI('/uptime/monitor');
    },

    /**
     * Get uptime statistics
     */
    getStatistics: async () => {
      return fetchAPI('/uptime/stats');
    },

    /**
     * Get system reliability metrics
     */
    getReliability: async () => {
      return fetchAPI('/uptime/reliability');
    },

    /**
     * Get incident history
     */
    getIncidents: async () => {
      return fetchAPI('/uptime/incidents');
    },
  },

  // Scaling Recommendations
  scaling: {
    /**
     * Get scaling recommendations
     */
    getRecommendations: async () => {
      return fetchAPI('/scaling/recommendations');
    },

    /**
     * Get capacity forecast
     */
    getCapacityForecast: async () => {
      return fetchAPI('/scaling/capacity-forecast');
    },

    /**
     * Get cost optimization suggestions
     */
    getCostOptimization: async () => {
      return fetchAPI('/scaling/cost-optimization');
    },
  },

  // System Health
  health: {
    /**
     * Get Phase 33 health status
     */
    getStatus: async () => {
      return fetchAPI('/health');
    },

    /**
     * Get overall system health
     */
    getOverallHealth: async () => {
      return fetchAPI('/health/overall');
    },
  },
};

export default phase33Optimization;
