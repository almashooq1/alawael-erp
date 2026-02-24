// Phase 12 - Environment Configuration
// Centralized configuration for the application

const config = {
  // API Configuration
  api: {
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },

  // Feature Flags
  features: {
    enableRealTimeUpdates: true,
    enableNotifications: true,
    enableAnalytics: false,
    enableOfflineMode: false,
  },

  // Dashboard Configuration
  dashboard: {
    refreshInterval: parseInt(process.env.REACT_APP_REFRESH_INTERVAL) || 5000,
    maxMetricsHistory: 50,
    defaultTimeRange: '1h',
  },

  // Search Configuration
  search: {
    maxResults: 100,
    suggestionLimit: 10,
    fuzzyThreshold: 2,
    debounceDelay: 300,
  },

  // Validation Configuration
  validation: {
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phoneRegex: /^\+?[1-9]\d{1,14}$/,
    urlRegex: /^https?:\/\/.+/,
  },

  // Admin Configuration
  admin: {
    usersPerPage: 50,
    maxAlerts: 100,
    alertRefreshInterval: 10000,
  },

  // UI Configuration
  ui: {
    sidebarWidth: 280,
    headerHeight: 64,
    footerHeight: 60,
    animationDuration: 300,
  },

  // Storage Keys
  storage: {
    token: 'erp_token',
    user: 'erp_user',
    preferences: 'erp_preferences',
    theme: 'erp_theme',
  },

  // App Metadata
  app: {
    name: 'ERP System',
    version: '1.0.0',
    phase: 12,
    buildDate: new Date().toISOString(),
  },
};

export default config;
