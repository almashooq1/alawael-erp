/**
 * API Service Layer
 * Centralized API calls for the entire application
 * Handles requests to Backend and manages responses/errors
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * Generic fetch wrapper with error handling
 */
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
      const error = new Error(`API Error: ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error(`Fetch error on ${endpoint}:`, error);
    throw error;
  }
};

/**
 * KPIs and Module Data API
 */
export const modulesAPI = {
  /**
   * Get all modules summary
   */
  getModulesSummary: async () => {
    return fetchAPI('/modules/summary');
  },

  /**
   * Get specific module data (KPIs, items, actions, charts)
   */
  getModuleData: async moduleKey => {
    return fetchAPI(`/modules/${moduleKey}`);
  },

  /**
   * Get KPIs for a specific module
   */
  getModuleKPIs: async moduleKey => {
    return fetchAPI(`/modules/${moduleKey}/kpis`);
  },

  /**
   * Get items list for a module
   */
  getModuleItems: async (moduleKey, filters = {}) => {
    const params = new URLSearchParams(filters);
    return fetchAPI(`/modules/${moduleKey}/items?${params}`);
  },

  /**
   * Get actions/shortcuts for a module
   */
  getModuleActions: async moduleKey => {
    return fetchAPI(`/modules/${moduleKey}/actions`);
  },

  /**
   * Get chart data for a module
   */
  getModuleCharts: async moduleKey => {
    return fetchAPI(`/modules/${moduleKey}/charts`);
  },
};

/**
 * Dashboard API
 */
export const dashboardAPI = {
  /**
   * Get unified dashboard overview
   */
  getDashboardData: async () => {
    return fetchAPI('/dashboard');
  },

  /**
   * Get system summary cards (6 systems)
   */
  getSummarySystems: async () => {
    return fetchAPI('/dashboard/systems');
  },

  /**
   * Get top KPIs across all systems
   */
  getTopKPIs: async (limit = 4) => {
    return fetchAPI(`/dashboard/top-kpis?limit=${limit}`);
  },
};

/**
 * Notifications API
 */
export const notificationsAPI = {
  /**
   * Get all notifications
   */
  getNotifications: async (limit = 10) => {
    return fetchAPI(`/notifications?limit=${limit}`);
  },

  /**
   * Get unread notifications count
   */
  getUnreadCount: async () => {
    return fetchAPI('/notifications/unread-count');
  },

  /**
   * Mark notification as read
   */
  markAsRead: async notificationId => {
    return fetchAPI(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },

  /**
   * Delete notification
   */
  deleteNotification: async notificationId => {
    return fetchAPI(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Search API
 */
export const searchAPI = {
  /**
   * Search across all modules
   */
  search: async (query, category = null) => {
    const params = new URLSearchParams({ q: query });
    if (category) params.append('category', category);
    return fetchAPI(`/search?${params}`);
  },

  /**
   * Get search suggestions
   */
  getSuggestions: async query => {
    return fetchAPI(`/search/suggestions?q=${encodeURIComponent(query)}`);
  },
};

/**
 * Analytics API
 */
export const analyticsAPI = {
  /**
   * Get module analytics
   */
  getModuleAnalytics: async (moduleKey, dateRange = {}) => {
    const params = new URLSearchParams(dateRange);
    return fetchAPI(`/analytics/${moduleKey}?${params}`);
  },

  /**
   * Get trend data for KPI
   */
  getKPITrend: async (moduleKey, kpiKey, days = 30) => {
    return fetchAPI(`/analytics/${moduleKey}/${kpiKey}/trend?days=${days}`);
  },
};

/**
 * Health Check
 */
export const healthAPI = {
  /**
   * Check backend health
   */
  checkHealth: async () => {
    try {
      return await fetchAPI('/health');
    } catch {
      return { status: 'error' };
    }
  },
};

/**
 * Utility function: Fallback to mock data if API fails
 */
export const withMockFallback = async (apiCall, mockData) => {
  try {
    return await apiCall();
  } catch (error) {
    console.warn('API call failed, using mock data:', error);
    return mockData;
  }
};

/**
 * Retry logic for failed requests
 */
export const retryFetch = async (apiCall, maxRetries = 3, delayMs = 1000) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError;
};

/**
 * Communications API
 */
export const communicationsAPI = {
  /**
   * Get communications dashboard data
   */
  getDashboardData: async () => {
    return fetchAPI('/ai-communications/dashboard');
  },

  /**
   * Send message in a conversation
   */
  sendMessage: async (conversationId, message, attachments = []) => {
    return fetchAPI('/ai-communications/send-message', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, message, attachments }),
    });
  },

  /**
   * Get conversation messages
   */
  getConversationMessages: async conversationId => {
    return fetchAPI(`/ai-communications/conversations/${conversationId}/messages`);
  },

  /**
   * Chat with AI bot
   */
  chatWithBot: async (message, conversationId = null, chatbotId = 1) => {
    return fetchAPI('/ai-communications/chatbot/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversation_id: conversationId, chatbot_id: chatbotId }),
    });
  },

  /**
   * Get emails by folder
   */
  getEmails: async (folder = 'inbox') => {
    return fetchAPI(`/ai-communications/emails?folder=${folder}`);
  },

  /**
   * Send email
   */
  sendEmail: async emailData => {
    return fetchAPI('/ai-communications/emails/send', {
      method: 'POST',
      body: JSON.stringify(emailData),
    });
  },

  /**
   * Get communication analytics
   */
  getAnalytics: async (period = 'month') => {
    return fetchAPI(`/ai-communications/analytics?period=${period}`);
  },
};

const apiServices = {
  modulesAPI,
  dashboardAPI,
  notificationsAPI,
  searchAPI,
  analyticsAPI,
  healthAPI,
  communicationsAPI,
  withMockFallback,
  retryFetch,
};

export default apiServices;
