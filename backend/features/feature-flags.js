/**
 * Feature Flags System - نظام إدارة الميزات
 * Professional Feature Management for Alawael ERP
 */

const EventEmitter = require('events');

/**
 * Feature Flag Configuration
 */
const featureConfig = {
  // Refresh interval for feature flags (ms)
  refreshInterval: 60000, // 1 minute
  
  // Default state for undefined flags
  defaultState: false,
  
  // Enable logging
  logging: true,
};

/**
 * Feature Flag Store
 */
class FeatureFlagStore extends EventEmitter {
  constructor() {
    super();
    this.flags = new Map();
    this.userOverrides = new Map();
    this.percentageCache = new Map();
  }
  
  /**
   * Set a feature flag
   */
  setFlag(name, config) {
    const flag = {
      name,
      enabled: config.enabled ?? false,
      description: config.description || '',
      variants: config.variants || {},
      rules: config.rules || [],
      percentage: config.percentage ?? 100,
      startTime: config.startTime ? new Date(config.startTime) : null,
      endTime: config.endTime ? new Date(config.endTime) : null,
      metadata: config.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.flags.set(name, flag);
    this.emit('flag:updated', { name, flag });
    
    return flag;
  }
  
  /**
   * Get a feature flag
   */
  getFlag(name) {
    return this.flags.get(name);
  }
  
  /**
   * Delete a feature flag
   */
  deleteFlag(name) {
    const deleted = this.flags.delete(name);
    if (deleted) {
      this.emit('flag:deleted', { name });
    }
    return deleted;
  }
  
  /**
   * Get all flags
   */
  getAllFlags() {
    const result = {};
    for (const [name, flag] of this.flags) {
      result[name] = flag;
    }
    return result;
  }
  
  /**
   * Set user-specific override
   */
  setUserOverride(userId, flagName, enabled) {
    const key = `${userId}:${flagName}`;
    this.userOverrides.set(key, enabled);
    this.emit('override:updated', { userId, flagName, enabled });
  }
  
  /**
   * Get user-specific override
   */
  getUserOverride(userId, flagName) {
    const key = `${userId}:${flagName}`;
    return this.userOverrides.get(key);
  }
  
  /**
   * Clear user-specific override
   */
  clearUserOverride(userId, flagName) {
    const key = `${userId}:${flagName}`;
    const deleted = this.userOverrides.delete(key);
    if (deleted) {
      this.emit('override:cleared', { userId, flagName });
    }
    return deleted;
  }
}

// Global store instance
const store = new FeatureFlagStore();

/**
 * Feature Flags Manager
 */
class FeatureFlagsManager {
  constructor(options = {}) {
    this.config = { ...featureConfig, ...options };
    this.store = store;
    this.refreshTimer = null;
  }
  
  /**
   * Initialize feature flags from configuration
   */
  initialize(flags) {
    for (const [name, config] of Object.entries(flags)) {
      this.store.setFlag(name, config);
    }
    
    if (this.config.logging) {
      console.log(`✅ Feature flags initialized: ${this.store.flags.size} flags loaded`);
    }
    
    // Start refresh timer if needed
    this.startRefreshTimer();
  }
  
  /**
   * Check if a feature is enabled
   */
  isEnabled(flagName, context = {}) {
    const flag = this.store.getFlag(flagName);
    
    // If flag doesn't exist, return default
    if (!flag) {
      return this.config.defaultState;
    }
    
    // Check user-specific override first
    if (context.userId) {
      const override = this.store.getUserOverride(context.userId, flagName);
      if (override !== undefined) {
        return override;
      }
    }
    
    // Check time-based rules
    const now = new Date();
    if (flag.startTime && now < flag.startTime) {
      return false;
    }
    if (flag.endTime && now > flag.endTime) {
      return false;
    }
    
    // Check custom rules
    if (flag.rules && flag.rules.length > 0) {
      for (const rule of flag.rules) {
        const result = this.evaluateRule(rule, context);
        if (result !== null) {
          return result;
        }
      }
    }
    
    // Check percentage rollout
    if (flag.percentage < 100 && context.userId) {
      const userPercentage = this.getUserPercentage(context.userId, flagName);
      if (userPercentage > flag.percentage) {
        return false;
      }
    }
    
    return flag.enabled;
  }
  
  /**
   * Get feature variant for a user
   */
  getVariant(flagName, context = {}) {
    const flag = this.store.getFlag(flagName);
    
    if (!flag || !flag.variants || Object.keys(flag.variants).length === 0) {
      return null;
    }
    
    // Check if user is eligible for the flag
    if (!this.isEnabled(flagName, context)) {
      return null;
    }
    
    // Calculate variant based on user ID
    const hash = this.hashString(`${flagName}:${context.userId || 'anonymous'}`);
    const percentage = (hash % 100) + 1;
    
    let cumulative = 0;
    for (const [variantName, variantConfig] of Object.entries(flag.variants)) {
      cumulative += variantConfig.percentage || 0;
      if (percentage <= cumulative) {
        return {
          name: variantName,
          ...variantConfig,
        };
      }
    }
    
    // Return default variant
    return {
      name: 'default',
      value: null,
    };
  }
  
  /**
   * Evaluate a rule
   */
  evaluateRule(rule, context) {
    switch (rule.type) {
      case 'user':
        if (context.userId && rule.userIds.includes(context.userId)) {
          return rule.enabled;
        }
        break;
        
      case 'role':
        if (context.role && rule.roles.includes(context.role)) {
          return rule.enabled;
        }
        break;
        
      case 'organization':
        if (context.organizationId && rule.organizationIds.includes(context.organizationId)) {
          return rule.enabled;
        }
        break;
        
      case 'percentage':
        if (context.userId) {
          const userPercentage = this.getUserPercentage(context.userId, rule.flagName || 'default');
          if (userPercentage <= rule.percentage) {
            return rule.enabled;
          }
        }
        break;
        
      case 'environment':
        if (rule.environments.includes(process.env.NODE_ENV)) {
          return rule.enabled;
        }
        break;
        
      case 'custom':
        if (rule.evaluator && typeof rule.evaluator === 'function') {
          return rule.evaluator(context);
        }
        break;
    }
    
    return null;
  }
  
  /**
   * Get percentage value for a user
   */
  getUserPercentage(userId, flagName) {
    const cacheKey = `${flagName}:${userId}`;
    
    if (this.store.percentageCache.has(cacheKey)) {
      return this.store.percentageCache.get(cacheKey);
    }
    
    const hash = this.hashString(cacheKey);
    const percentage = (hash % 100) + 1;
    
    this.store.percentageCache.set(cacheKey, percentage);
    
    return percentage;
  }
  
  /**
   * Simple string hash
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Enable a feature flag
   */
  enable(flagName) {
    const flag = this.store.getFlag(flagName);
    if (flag) {
      flag.enabled = true;
      flag.updatedAt = new Date();
      this.store.emit('flag:enabled', { name: flagName });
    }
  }
  
  /**
   * Disable a feature flag
   */
  disable(flagName) {
    const flag = this.store.getFlag(flagName);
    if (flag) {
      flag.enabled = false;
      flag.updatedAt = new Date();
      this.store.emit('flag:disabled', { name: flagName });
    }
  }
  
  /**
   * Toggle a feature flag
   */
  toggle(flagName) {
    const flag = this.store.getFlag(flagName);
    if (flag) {
      flag.enabled = !flag.enabled;
      flag.updatedAt = new Date();
      this.store.emit('flag:toggled', { name: flagName, enabled: flag.enabled });
      return flag.enabled;
    }
    return false;
  }
  
  /**
   * Set percentage rollout
   */
  setPercentage(flagName, percentage) {
    const flag = this.store.getFlag(flagName);
    if (flag) {
      flag.percentage = Math.min(100, Math.max(0, percentage));
      flag.updatedAt = new Date();
      this.store.emit('flag:percentage_updated', { name: flagName, percentage });
    }
  }
  
  /**
   * Start refresh timer
   */
  startRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
    this.refreshTimer = setInterval(() => {
      this.refresh();
    }, this.config.refreshInterval);
  }
  
  /**
   * Stop refresh timer
   */
  stopRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
  
  /**
   * Refresh flags (override to implement remote fetching)
   */
  async refresh() {
    // Override this method to fetch flags from remote service
    // e.g., LaunchDarkly, Unleash, etc.
    this.store.emit('flags:refreshed');
  }
  
  /**
   * Get all flags status
   */
  getAllStatus() {
    const status = {};
    for (const [name, flag] of this.store.flags) {
      status[name] = {
        enabled: flag.enabled,
        percentage: flag.percentage,
        description: flag.description,
      };
    }
    return status;
  }
}

/**
 * Express Middleware for Feature Flags
 */
const featureFlagMiddleware = (flagName, options = {}) => {
  const manager = new FeatureFlagsManager();
  const {
    statusCode = 404,
    message = 'Feature not available',
    redirect = null,
  } = options;
  
  return (req, res, next) => {
    const context = {
      userId: req.user?._id || req.user?.id,
      role: req.user?.role,
      organizationId: req.user?.organizationId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
    
    if (!manager.isEnabled(flagName, context)) {
      if (redirect) {
        return res.redirect(redirect);
      }
      
      return res.status(statusCode).json({
        success: false,
        code: 'FEATURE_DISABLED',
        message,
        feature: flagName,
      });
    }
    
    // Attach variant to request
    req.featureVariant = manager.getVariant(flagName, context);
    
    next();
  };
};

/**
 * Feature Flag Checker for Routes
 */
const requireFeature = (flagName, contextExtractor = (req) => ({ userId: req.user?.id })) => {
  const manager = new FeatureFlagsManager();
  
  return (req, res, next) => {
    const context = contextExtractor(req);
    
    if (!manager.isEnabled(flagName, context)) {
      return res.status(403).json({
        success: false,
        code: 'FEATURE_NOT_ENABLED',
        message: `Feature '${flagName}' is not enabled`,
      });
    }
    
    next();
  };
};

/**
 * A/B Testing Helper
 */
class ABTest {
  constructor(manager) {
    this.manager = manager;
  }
  
  /**
   * Get test variant for user
   */
  getVariant(testName, context) {
    return this.manager.getVariant(testName, context);
  }
  
  /**
   * Track conversion
   */
  trackConversion(testName, variant, userId, metadata = {}) {
    // In production, send to analytics service
    console.log(`A/B Conversion: ${testName} - ${variant} - ${userId}`, metadata);
  }
  
  /**
   * Track impression
   */
  trackImpression(testName, variant, userId) {
    // In production, send to analytics service
    console.log(`A/B Impression: ${testName} - ${variant} - ${userId}`);
  }
}

// Create default manager instance
const defaultManager = new FeatureFlagsManager();

// Pre-defined feature flags for Alawael ERP
const defaultFlags = {
  // Core Features
  'new_dashboard': {
    enabled: true,
    description: 'New dashboard design',
    percentage: 100,
  },
  
  'advanced_analytics': {
    enabled: true,
    description: 'Advanced analytics and reporting',
    percentage: 100,
  },
  
  'mobile_app_v2': {
    enabled: false,
    description: 'Mobile app version 2',
    percentage: 10,
  },
  
  // HR Features
  'hr_ai_recruitment': {
    enabled: true,
    description: 'AI-powered recruitment',
    percentage: 50,
  },
  
  'hr_performance_v2': {
    enabled: true,
    description: 'New performance management system',
    percentage: 100,
  },
  
  // Finance Features
  'finance_multi_currency': {
    enabled: true,
    description: 'Multi-currency support',
    percentage: 100,
  },
  
  'finance_automated_reports': {
    enabled: true,
    description: 'Automated financial reports',
    percentage: 75,
  },
  
  // Inventory Features
  'inventory_ai_forecast': {
    enabled: true,
    description: 'AI inventory forecasting',
    percentage: 50,
  },
  
  // Integrations
  'qiwa_integration': {
    enabled: true,
    description: 'Qiwa integration',
    percentage: 100,
  },
  
  'zatca_e_invoicing': {
    enabled: true,
    description: 'ZATCA e-invoicing',
    percentage: 100,
  },
  
  // Experimental
  'dark_mode': {
    enabled: false,
    description: 'Dark mode theme',
    percentage: 0,
  },
  
  'realtime_notifications': {
    enabled: true,
    description: 'Real-time WebSocket notifications',
    percentage: 100,
  },
};

module.exports = {
  FeatureFlagsManager,
  FeatureFlagStore,
  featureFlagMiddleware,
  requireFeature,
  ABTest,
  defaultManager,
  defaultFlags,
  store,
  featureConfig,
};