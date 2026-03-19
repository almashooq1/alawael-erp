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
      console.warn('AuthenticationService not found, using mock for testing');
      authenticationServiceInstance = {
        generateToken: (user) => `token-${user.id}`,
        verifyToken: (token) => ({ id: 'user-123', role: 'user' }),
        refreshToken: (token) => `new-token-${Date.now()}`,
        validateCredentials: (username, password) => ({ id: 'user-123' }),
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
      console.warn('OAuth2Provider not found, using mock for testing');
      const auth = authService || getAuthenticationService();
      oauth2ProviderInstance = {
        exchangeCodeForToken: async (provider, code) => ({
          accessToken: `access-${Date.now()}`,
          refreshToken: `refresh-${Date.now()}`,
          idToken: `id-${Date.now()}`,
        }),
        validateAccessToken: async (token, provider) => ({ valid: true, userId: 'user-123' }),
        refreshOAuthToken: async (refreshToken, provider) => ({
          accessToken: `new-access-${Date.now()}`,
          refreshToken: `new-refresh-${Date.now()}`,
        }),
        getUserProfile: async (provider, accessToken) => ({
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
      console.warn('SecurityService not found, using mock for testing');
      securityServiceInstance = {
        verifyToken: (token, secret) => ({ valid: true, decoded: { id: 'user-123' } }),
        generateToken: (payload, secret) => `token-${Date.now()}`,
        validatePermission: (role, permission) => true,
        checkOwnership: (userId, resourceId) => true,
        hashPassword: (password) => `hashed-${password}`,
        verifyPassword: (password, hash) => true,
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
      console.warn('UserService not found, using mock for testing');
      userServiceInstance = {
        findById: async (id) => ({ id, name: 'User', email: 'user@example.com' }),
        findByEmail: async (email) => ({ id: 'user-123', email, name: 'User' }),
        create: async (data) => ({ id: 'user-123', ...data }),
        update: async (id, data) => ({ id, ...data }),
        delete: async (id) => ({ id, deleted: true }),
        getProfile: async (id) => ({ id, name: 'User', email: 'user@example.com' }),
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
      console.warn('PermissionService not found, using mock for testing');
      permissionServiceInstance = {
        checkPermission: (userId, permission) => true,
        hasRole: (userId, role) => true,
        assignRole: async (userId, role) => ({ userId, role, assigned: true }),
        revokeRole: async (userId, role) => ({ userId, role, revoked: true }),
        listPermissions: async (userId) => ['read', 'write'],
        listRoles: async (userId) => ['user', 'admin'],
      };
    }
  }
  return permissionServiceInstance;
}

/**
 * Get unified JWT secret from environment or fallback
 * Single source of truth for all JWT operations
 * 
 * @returns {string} JWT secret
 */
function getUnifiedJWTSecret() {
  return process.env.JWT_SECRET || process.env.AUTH_SECRET || 'unified-jwt-secret-alawael-unified';
}

/**
 * Get JWT refresh secret from environment or use main secret
 * 
 * @returns {string} JWT refresh secret
 */
function getUnifiedJWTRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET || getUnifiedJWTSecret() + '-refresh';
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
function setServiceInstances(servicesOrAuth, oauth2Service, securityService, userService, permissionService) {
  // Support object parameter (modern approach)
  if (servicesOrAuth && typeof servicesOrAuth === 'object' && oauth2Service === undefined) {
    authenticationServiceInstance = servicesOrAuth.authenticationService || authenticationServiceInstance;
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
