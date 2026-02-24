/**
 * Feature Flags & A/B Testing System
 * Dynamic feature management without code deployment
 */

class FeatureFlags {
  constructor() {
    this.flags = new Map();
    this.experiments = new Map();
    this.userVariants = new Map();
    this.initializeDefaultFlags();
  }

  /**
   * Initialize default feature flags
   */
  initializeDefaultFlags() {
    this.setFlag('enable_advanced_analytics', {
      enabled: true,
      version: '1.0',
      rolloutPercentage: 100,
      description: 'Advanced analytics dashboard'
    });

    this.setFlag('enable_real_time_sync', {
      enabled: true,
      version: '1.0',
      rolloutPercentage: 80,
      description: 'Real-time data synchronization'
    });

    this.setFlag('enable_dark_mode', {
      enabled: true,
      version: '1.0',
      rolloutPercentage: 100,
      description: 'Dark mode UI theme'
    });

    this.setFlag('enable_advanced_search', {
      enabled: false,
      version: '1.0',
      rolloutPercentage: 0,
      description: 'Advanced search with ML'
    });

    this.setFlag('enable_recommendations', {
      enabled: false,
      version: '1.0',
      rolloutPercentage: 0,
      description: 'Personalized recommendations'
    });

    this.setFlag('enable_notifications_v2', {
      enabled: true,
      version: '2.0',
      rolloutPercentage: 60,
      description: 'New notification system'
    });
  }

  /**
   * Set or update a feature flag
   */
  setFlag(flagName, config) {
    this.flags.set(flagName, {
      ...config,
      createdAt: config.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Check if flag is enabled for user
   */
  isEnabled(flagName, userId = null) {
    const flag = this.flags.get(flagName);

    if (!flag) {
      console.warn(`Unknown flag: ${flagName}`);
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    // Check rollout percentage
    if (userId && flag.rolloutPercentage < 100) {
      const hash = this.getUserHash(userId);
      return (hash % 100) < flag.rolloutPercentage;
    }

    return true;
  }

  /**
   * Get flag configuration
   */
  getFlag(flagName) {
    return this.flags.get(flagName) || null;
  }

  /**
   * Get all flags
   */
  getAllFlags() {
    return Array.from(this.flags.entries()).map(([name, config]) => ({
      name,
      ...config
    }));
  }

  /**
   * Create A/B test experiment
   */
  createExperiment(experimentName, config) {
    const experiment = {
      name: experimentName,
      variants: config.variants || ['control', 'treatment'],
      trafficAllocation: config.trafficAllocation || { control: 50, treatment: 50 },
      metrics: [],
      startedAt: new Date().toISOString(),
      active: true,
      description: config.description || '',
      minSampleSize: config.minSampleSize || 100
    };

    this.experiments.set(experimentName, experiment);
    return experiment;
  }

  /**
   * Get variant for user in experiment
   */
  getUserVariant(userId, experimentName) {
    // Check if user already has assigned variant
    const key = `${userId}:${experimentName}`;
    if (this.userVariants.has(key)) {
      return this.userVariants.get(key);
    }

    const experiment = this.experiments.get(experimentName);
    if (!experiment) {
      throw new Error(`Unknown experiment: ${experimentName}`);
    }

    // Assign variant based on traffic allocation
    const hash = this.getUserHash(userId);
    let cumulativeTraffic = 0;

    for (const variant of experiment.variants) {
      const allocation = experiment.trafficAllocation[variant];
      cumulativeTraffic += allocation;

      if ((hash % 100) < cumulativeTraffic) {
        this.userVariants.set(key, variant);
        return variant;
      }
    }

    // Fallback
    const variant = experiment.variants[0];
    this.userVariants.set(key, variant);
    return variant;
  }

  /**
   * Record experiment metric
   */
  recordMetric(experimentName, userId, metricName, value) {
    const experiment = this.experiments.get(experimentName);
    if (!experiment) {
      throw new Error(`Unknown experiment: ${experimentName}`);
    }

    const variant = this.getUserVariant(userId, experimentName);

    experiment.metrics.push({
      userId,
      variant,
      metric: metricName,
      value,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get experiment results
   */
  getExperimentResults(experimentName) {
    const experiment = this.experiments.get(experimentName);
    if (!experiment) {
      throw new Error(`Unknown experiment: ${experimentName}`);
    }

    const results = {};

    experiment.variants.forEach(variant => {
      const variantMetrics = experiment.metrics.filter(m => m.variant === variant);
      results[variant] = {
        sampleSize: new Set(variantMetrics.map(m => m.userId)).size,
        metrics: this.calculateMetrics(variantMetrics)
      };
    });

    return {
      experimentName,
      variants: results,
      readyForConclusion: Object.values(results).every(
        r => r.sampleSize >= experiment.minSampleSize
      ),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Calculate metrics from data
   */
  calculateMetrics(metrics) {
    const grouped = {};

    metrics.forEach(m => {
      if (!grouped[m.metric]) {
        grouped[m.metric] = [];
      }
      grouped[m.metric].push(m.value);
    });

    const results = {};

    Object.entries(grouped).forEach(([metric, values]) => {
      results[metric] = {
        count: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values)
      };
    });

    return results;
  }

  /**
   * Get consistent hash for user
   */
  getUserHash(userId) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Get dashboard summary
   */
  getDashboard() {
    return {
      flags: this.getAllFlags(),
      experiments: Array.from(this.experiments.entries()).map(([name, exp]) => ({
        name,
        ...exp
      })),
      summary: {
        totalFlags: this.flags.size,
        enabledFlags: Array.from(this.flags.values()).filter(f => f.enabled).length,
        activeExperiments: Array.from(this.experiments.values()).filter(e => e.active).length
      }
    };
  }
}

module.exports = new FeatureFlags();
