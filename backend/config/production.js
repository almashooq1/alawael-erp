/**
 * Production Configuration
 * Returns system configuration for the dashboard /config endpoint
 */

const pkg = (() => {
  try {
    return require('../../package.json');
  } catch {
    return { version: '1.0.0', name: 'alawael-erp' };
  }
})();

const config = {
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'production',
    host: process.env.HOST || '0.0.0.0',
  },
  features: {
    notifications: true,
    fileUpload: true,
    analytics: true,
    reports: true,
    templates: true,
    scheduling: true,
    healthRecords: true,
    disabilityRehabilitation: true,
    finance: true,
    messaging: true,
    therapySessions: true,
  },
  deployment: {
    version: pkg.version || '1.0.0',
    name: pkg.name || 'alawael-erp',
    buildDate: new Date().toISOString().split('T')[0],
    environment: process.env.NODE_ENV || 'production',
  },
};

function getConfig() {
  return { ...config };
}

module.exports = { getConfig, config };
