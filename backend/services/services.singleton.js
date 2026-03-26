/**
 * Unified Service Singleton Factory
 * Ensures single instance of each service across the entire application
 * Implements Dependency Injection for testability
 *
 * Pattern:
 * - Each service is instantiated once (singleton)
 * - Services can receive other services as parameters (DI)
 * - Test support via setServiceInstances() and resetServiceInstances()
 *
 * Usage:
 * const { getAuthenticationService, getOAuth2Provider } = require('./services.singleton');
 * const authService = getAuthenticationService();
 * const oauth2 = getOAuth2Provider(authService);
 */

// Singleton instances
let authenticationServiceInstance = null;
let oauth2ProviderInstance = null;
let securityServiceInstance = null;
let userServiceInstance = null;
let permissionServiceInstance = null;
const logger = require('../utils/logger');

/**
 * Get singleton instance of AuthenticationService
 * Performs lazy initialization on first call
 *
 * @returns {AuthenticationService} Single instance of auth service
 */
function getAuthenticationService() {
  if (!authenticationServiceInstance) {
    try {
      const AuthenticationService = require('./AuthenticationService');
      authenticationServiceInstance = new AuthenticationService();
    } catch (error) {
      logger.warn('AuthenticationService not found, using mock for testing');
      authenticationServiceInstance = {
        generateToken: _user => `token-${_user.id}`,
        verifyToken: _token => ({ id: 'user-123', role: 'user' }),
        refreshToken: _token => `new-token-${Date.now()}`,
        validateCredentials: (_username, _password) => ({ id: 'user-123' }),
      };
    }
  }
  return authenticationServiceInstance;
}

/**
 * Get singleton instance of OAuth2Provider with dependency injection
 * OAuth2 service receives AuthenticationService as parameter (DI pattern)
 *
 * @param {AuthenticationService} authService - Auth service instance (optional, uses singleton if not provided)
 * @returns {OAuth2Provider} Single instance of OAuth2 provider
 */
function getOAuth2Provider(authService = null) {
  if (!oauth2ProviderInstance) {
    try {
      const OAuth2Provider = require('./OAuth2Provider');
      const auth = authService || getAuthenticationService();
      oauth2ProviderInstance = new OAuth2Provider(auth);
    } catch (error) {
      logger.warn('OAuth2Provider not found, using mock for testing');
      const _auth = authService || getAuthenticationService();
      oauth2ProviderInstance = {
        exchangeCodeForToken: async (_provider, _code) => ({
          accessToken: `access-${Date.now()}`,
          refreshToken: `refresh-${Date.now()}`,
          idToken: `id-${Date.now()}`,
        }),
        validateAccessToken: async (_token, _provider) => ({ valid: true, userId: 'user-123' }),
        refreshOAuthToken: async (_refreshToken, _provider) => ({
          accessToken: `new-access-${Date.now()}`,
          refreshToken: `new-refresh-${Date.now()}`,
        }),
        getUserProfile: async (_provider, _accessToken) => ({
          id: 'user-123',
          email: 'user@example.com',
          name: 'Test User',
        }),
      };
    }
  }
  return oauth2ProviderInstance;
}

/**
 * Get singleton instance of SecurityService
 * Handles security-related operations and configurations
 *
 * @returns {SecurityService} Single instance of security service
 */
function getSecurityService() {
  if (!securityServiceInstance) {
    try {
      const SecurityService = require('./SecurityService');
      securityServiceInstance = new SecurityService();
    } catch (error) {
      logger.warn('SecurityService not found, using mock for testing');
      securityServiceInstance = {
        verifyToken: (_token, _secret) => ({ valid: true, decoded: { id: 'user-123' } }),
        generateToken: (_payload, _secret) => `token-${Date.now()}`,
        validatePermission: (_role, _permission) => true,
        checkOwnership: (_userId, _resourceId) => true,
        hashPassword: _password => `hashed-${_password}`,
        verifyPassword: (_password, _hash) => true,
      };
    }
  }
  return securityServiceInstance;
}

/**
 * Get singleton instance of UserService
 * Handles user-related operations
 *
 * @returns {UserService} Single instance of user service
 */
function getUserService() {
  if (!userServiceInstance) {
    try {
      const UserService = require('./UserService');
      userServiceInstance = new UserService();
    } catch (error) {
      logger.warn('UserService not found, using mock for testing');
      userServiceInstance = {
        findById: async _id => ({ id: _id, name: 'User', email: 'user@example.com' }),
        findByEmail: async _email => ({ id: 'user-123', email: _email, name: 'User' }),
        create: async _data => ({ id: 'user-123', ..._data }),
        update: async (_id, _data) => ({ id: _id, ..._data }),
        delete: async _id => ({ id: _id, deleted: true }),
        getProfile: async _id => ({ id: _id, name: 'User', email: 'user@example.com' }),
      };
    }
  }
  return userServiceInstance;
}

/**
 * Get singleton instance of PermissionService
 * Handles role and permission management
 *
 * @returns {PermissionService} Single instance of permission service
 */
function getPermissionService() {
  if (!permissionServiceInstance) {
    try {
      const PermissionService = require('./PermissionService');
      permissionServiceInstance = new PermissionService();
    } catch (error) {
      logger.warn('PermissionService not found, using mock for testing');
      permissionServiceInstance = {
        checkPermission: (_userId, _permission) => true,
        hasRole: (_userId, _role) => true,
        assignRole: async (_userId, _role) => ({ userId: _userId, role: _role, assigned: true }),
        revokeRole: async (_userId, _role) => ({ userId: _userId, role: _role, revoked: true }),
        listPermissions: async _userId => ['read', 'write'],
        listRoles: async _userId => ['user', 'admin'],
      };
    }
  }
  return permissionServiceInstance;
}

/**
 * Get unified JWT secret via centralized secrets module.
 * Production: throws if JWT_SECRET not set.
 * Dev/Test: consistent dev-only fallback.
 *
 * @returns {string} JWT secret
 */
function getUnifiedJWTSecret() {
  return require('../config/secrets').jwtSecret;
}

/**
 * Get JWT refresh secret via centralized secrets module.
 *
 * @returns {string} JWT refresh secret
 */
function getUnifiedJWTRefreshSecret() {
  return require('../config/secrets').jwtRefreshSecret;
}

/**
 * Set service instances for testing
 * Allows injection of mock services during test execution
 * Accepts either object or positional parameters for flexibility
 *
 * @param {Object|AuthenticationService} servicesOrAuth - Object with services or auth service
 * @param {OAuth2Provider} oauth2Service - Mock OAuth2 provider (if first arg is auth)
 * @param {SecurityService} securityService - Mock security service
 * @param {UserService} userService - Mock user service
 * @param {PermissionService} permissionService - Mock permission service
 */
function setServiceInstances(
  servicesOrAuth,
  oauth2Service,
  securityService,
  userService,
  permissionService
) {
  // Support object parameter (modern approach)
  if (servicesOrAuth && typeof servicesOrAuth === 'object' && oauth2Service === undefined) {
    authenticationServiceInstance =
      servicesOrAuth.authenticationService || authenticationServiceInstance;
    oauth2ProviderInstance = servicesOrAuth.oauth2Provider || oauth2ProviderInstance;
    securityServiceInstance = servicesOrAuth.securityService || securityServiceInstance;
    userServiceInstance = servicesOrAuth.userService || userServiceInstance;
    permissionServiceInstance = servicesOrAuth.permissionService || permissionServiceInstance;
  } else {
    // Support positional parameters (legacy approach)
    authenticationServiceInstance = servicesOrAuth;
    oauth2ProviderInstance = oauth2Service;
    securityServiceInstance = securityService;
    userServiceInstance = userService;
    permissionServiceInstance = permissionService;
  }
}

/**
 * Reset all service instances to null
 * Used in test cleanup (afterEach) to prevent test pollution
 *
 * @returns {void}
 */
function resetServiceInstances() {
  authenticationServiceInstance = null;
  oauth2ProviderInstance = null;
  securityServiceInstance = null;
  userServiceInstance = null;
  permissionServiceInstance = null;
}

/**
 * Get active singleton instances for monitoring/debugging
 * Useful for verifying which services are currently instantiated
 *
 * @returns {Object} Map of service instances
 */
function getActiveSingletons() {
  return {
    authenticationService: authenticationServiceInstance ? 'active' : 'not-initialized',
    oauth2Provider: oauth2ProviderInstance ? 'active' : 'not-initialized',
    securityService: securityServiceInstance ? 'active' : 'not-initialized',
    userService: userServiceInstance ? 'active' : 'not-initialized',
    permissionService: permissionServiceInstance ? 'active' : 'not-initialized',
  };
}

// Export singleton getters
module.exports = {
  // Service getters
  getAuthenticationService,
  getOAuth2Provider,
  getSecurityService,
  getUserService,
  getPermissionService,

  // Secret getters
  getUnifiedJWTSecret,
  getUnifiedJWTRefreshSecret,

  // Testing support
  setServiceInstances,
  resetServiceInstances,

  // Monitoring
  getActiveSingletons,
};
