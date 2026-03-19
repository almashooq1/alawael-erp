/**
 * Phase 31: Extended Reality (XR) Service
 * Mixed Reality, Holographic Visualization, BCI, Cross-Reality Collaboration
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
    console.error(`Phase 31 API Error on ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Phase 31: Extended Reality APIs
 */
export const phase31XR = {
  // Mixed Reality Sessions
  xr: {
    /**
     * Create XR session
     * @param {object} config - Session configuration (type: ar, vr, mr)
     */
    createSession: async config => {
      return fetchAPI('/xr/session', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },

    /**
     * List XR sessions
     */
    listSessions: async () => {
      return fetchAPI('/xr/sessions');
    },

    /**
     * Get session details
     * @param {string} sessionId - Session ID
     */
    getSession: async sessionId => {
      return fetchAPI(`/xr/sessions/${sessionId}`);
    },

    /**
     * End XR session
     * @param {string} sessionId - Session ID
     */
    endSession: async sessionId => {
      return fetchAPI(`/xr/sessions/${sessionId}/end`, {
        method: 'POST',
      });
    },
  },

  // Cross-Reality Collaboration
  collaboration: {
    /**
     * Join collaborative session
     * @param {string} sessionId - Session ID
     * @param {string} userId - User ID
     */
    joinSession: async (sessionId, userId) => {
      return fetchAPI(`/xr/collab/${sessionId}/join`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
    },

    /**
     * List active collaborations
     */
    listActive: async () => {
      return fetchAPI('/xr/collaboration/active');
    },

    /**
     * Share content in session
     * @param {string} sessionId - Session ID
     * @param {object} content - Content to share
     */
    shareContent: async (sessionId, content) => {
      return fetchAPI(`/xr/collab/${sessionId}/share`, {
        method: 'POST',
        body: JSON.stringify(content),
      });
    },
  },

  // Holographic Visualization
  holograms: {
    /**
     * Create holographic visualization
     * @param {object} config - Hologram configuration
     */
    create: async config => {
      return fetchAPI('/holo/create', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },

    /**
     * List holographic visualizations
     */
    listVisualizations: async () => {
      return fetchAPI('/holo/visualizations');
    },

    /**
     * Get hologram details
     * @param {string} holoId - Hologram ID
     */
    getHologram: async holoId => {
      return fetchAPI(`/holo/${holoId}`);
    },

    /**
     * Render holographic dashboard
     * @param {string} dashboardId - Dashboard ID
     */
    renderDashboard: async dashboardId => {
      return fetchAPI(`/holo/dashboard/${dashboardId}`);
    },

    /**
     * Update hologram properties
     * @param {string} holoId - Hologram ID
     * @param {object} props - Updated properties
     */
    updateProperties: async (holoId, props) => {
      return fetchAPI(`/holo/${holoId}`, {
        method: 'PUT',
        body: JSON.stringify(props),
      });
    },
  },

  // Brain-Computer Interface
  bci: {
    /**
     * Calibrate BCI device
     * @param {object} config - Calibration configuration
     */
    calibrate: async config => {
      return fetchAPI('/bci/calibrate', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },

    /**
     * Get BCI status
     */
    getStatus: async () => {
      return fetchAPI('/bci/status');
    },

    /**
     * Get BCI signals
     */
    getSignals: async () => {
      return fetchAPI('/bci/signals');
    },

    /**
     * Interpret BCI commands
     * @param {object} signals - Brain signals data
     */
    interpretCommands: async signals => {
      return fetchAPI('/bci/interpret', {
        method: 'POST',
        body: JSON.stringify(signals),
      });
    },
  },

  // Immersive Analytics
  analytics: {
    /**
     * Create immersive dashboard
     * @param {object} config - Dashboard configuration
     */
    createDashboard: async config => {
      return fetchAPI('/immersive/dashboard', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },

    /**
     * List immersive dashboards
     */
    listDashboards: async () => {
      return fetchAPI('/immersive/dashboards');
    },

    /**
     * Get dashboard analytics
     * @param {string} dashboardId - Dashboard ID
     */
    getAnalytics: async dashboardId => {
      return fetchAPI(`/immersive/dashboards/${dashboardId}/analytics`);
    },
  },

  // System Health
  health: {
    /**
     * Get Phase 31 health status
     */
    getStatus: async () => {
      return fetchAPI('/health');
    },
  },
};

export default phase31XR;
