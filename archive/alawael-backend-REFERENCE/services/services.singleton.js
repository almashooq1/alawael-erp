/**
 * Service Singleton Module - alawael-backend
 * يضمن استخدام نفس instances من الخدمات في جميع أنحاء التطبيق
 * 
 * ** PROFESSIONAL UPGRADE - SINGLETON PATTERN **
 * Solves: Service instance duplication, OAuth consistency, security config spread
 * 
 * Author: Enterprise System
 * Version: 2.0.0
 * Date: February 2026
 */

let authenticationServiceInstance = null;
let oauth2ProviderInstance = null;
let securityServiceInstance = null;

/**
 * Get or create AuthenticationService instance
 * Guarantees: Single instance across entire application
 * التضمين: Instance واحد للتطبيق كاملاً
 */
function getAuthenticationService() {
  if (!authenticationServiceInstance) {
    try {
      const AuthenticationService = require('./AuthenticationService');
      authenticationServiceInstance = AuthenticationService;
      console.log('[SINGLETON] AuthenticationService initialized');
    } catch (error) {
      console.warn('[SINGLETON] AuthenticationService static methods - no instantiation needed');
    }
  }
  return authenticationServiceInstance;
}

/**
 * Get or create OAuth2Provider instance
 * Guarantees: Uses same AuthenticationService instance
 * Dependency Injection: Receives AuthenticationService as parameter
 */
function getOAuth2Provider(authService = null) {
  if (!oauth2ProviderInstance) {
    try {
      const { OAuth2Provider } = require('../security/oauth2Provider');
      // OAuth2Provider can optionally receive auth service for coordination
      const auth = authService || getAuthenticationService();
      oauth2ProviderInstance = new OAuth2Provider({
        authService: auth,
        clientId: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        redirectUri: process.env.OAUTH_REDIRECT_URI,
      });
      console.log('[SINGLETON] OAuth2Provider initialized with shared AuthenticationService');
    } catch (error) {
      console.warn('[SINGLETON] OAuth2Provider initialization:', error.message);
      // Fallback: use mock provider
      oauth2ProviderInstance = {
        validateAccessToken: (token) => ({ valid: false }),
        refreshToken: (token) => ({ success: false })
      };
    }
  }
  return oauth2ProviderInstance;
}

/**
 * Get or create Security Service instance
 * Guarantees: Single instance for all security operations
 */
function getSecurityService() {
  if (!securityServiceInstance) {
    try {
      const { SecurityService } = require('../config/security.config');
      securityServiceInstance = new SecurityService();
      console.log('[SINGLETON] SecurityService initialized');
    } catch (error) {
      console.warn('[SINGLETON] SecurityService not available:', error.message);
      // Fallback configuration
      securityServiceInstance = {
        generateToken: () => 'mock-token',
        verifyToken: () => ({ valid: false })
      };
    }
  }
  return securityServiceInstance;
}

/**
 * Get unified JWT secret
 * Single source of truth for OAuth/Auth secrets
 */
function getUnifiedJWTSecret() {
  return process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
}

/**
 * Set specific instances (useful for testing)
 * Allows injection of mock services
 * For testing: يسمح بـ injection من services وهمية
 */
function setServiceInstances(auth, oauth2, security) {
  authenticationServiceInstance = auth;
  oauth2ProviderInstance = oauth2;
  securityServiceInstance = security;
  console.log('[SINGLETON] Service instances set via injection');
}

/**
 * Reset all instances (useful for cleanup in tests)
 * For test cleanup: مسح instances بعد الاختبار
 */
function resetServiceInstances() {
  authenticationServiceInstance = null;
  oauth2ProviderInstance = null;
  securityServiceInstance = null;
  console.log('[SINGLETON] Service instances reset');
}

/**
 * Get all active singletons (for debugging/monitoring)
 */
function getActiveSingletons() {
  return {
    authenticationService: !!authenticationServiceInstance,
    oauth2Provider: !!oauth2ProviderInstance,
    securityService: !!securityServiceInstance,
  };
}

module.exports = {
  getAuthenticationService,
  getOAuth2Provider,
  getSecurityService,
  getUnifiedJWTSecret,
  setServiceInstances,
  resetServiceInstances,
  getActiveSingletons
};
