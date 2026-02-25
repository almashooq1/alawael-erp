/**
 * Analytics Middleware
 * Tracks request metrics and analytics
 */

module.exports = {
  trackRequest: (req, res, duration) => {
    // Minimal analytics tracking
    // In production, this would send data to analytics service
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Analytics] ${req.method} ${req.path} - ${duration}ms`);
    }
  },

  trackError: (error, req) => {
    // Track error analytics
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Analytics Error] ${error.message}`);
    }
  },

  trackEvent: (eventName, data) => {
    // Track custom events
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Analytics Event] ${eventName}`, data);
    }
  }
};
