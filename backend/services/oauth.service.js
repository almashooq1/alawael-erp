/**
 * OAuth 2.0 & OpenID Connect Service
 * خدمة OAuth 2.0 و OpenID Connect
 */

const crypto = require('crypto');
const SSOService = require('./sso.service');
const logger = require('../utils/logger');

class OAuthService {
  constructor() {
    this.ssoService = new SSOService();
    this.OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || 'oauth-secret';
  }

  /**
   * OAuth 2.0 Authorization Code Flow
   * إنشاء طلب تفويض جديد
   */
  async initiateAuthorizationCodeFlow(clientId, redirectUri, scope, state, nonce = null) {
    try {
      // Validate OAuth request
      const validation = await this.ssoService.validateOAuthRequest(
        clientId,
        redirectUri,
        scope,
        state
      );

      if (!validation.valid) {
        throw new Error('Invalid OAuth request');
      }

      // Generate state if not provided
      const authState = state || crypto.randomBytes(32).toString('hex');

      // Store OAuth state for CSRF protection
      const stateData = {
        clientId,
        redirectUri,
        scope,
        nonce,
        createdAt: Date.now(),
        expiresAt: Date.now() + 600000 // 10 minutes
      };

      // Store in Redis (implementation in SSOService)
      const authCode = await this.ssoService.generateAuthorizationCode(
        null, // userId will be set after login
        clientId,
        scope,
        redirectUri
      );

      return {
        authCode,
        state: authState,
        redirectUri: `${redirectUri}?code=${authCode}&state=${authState}`
      };
    } catch (error) {
      logger.error('Authorization code flow initiation failed:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for tokens
   * تبديل رمز التفويض بالتوكنات
   */
  async exchangeAuthorizationCode(code, clientId, clientSecret, redirectUri) {
    try {
      // Verify client credentials
      if (clientSecret !== this.OAUTH_CLIENT_SECRET) {
        throw new Error('Invalid client credentials');
      }

      // Exchange code for tokens
      const session = await this.ssoService.exchangeAuthorizationCode(
        code,
        clientId,
        clientSecret
      );

      return {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        idToken: session.idToken,
        tokenType: 'Bearer',
        expiresIn: 3600,
        scope: 'openid profile email'
      };
    } catch (error) {
      logger.error('Authorization code exchange failed:', error);
      throw error;
    }
  }

  /**
   * OAuth 2.0 Implicit Flow
   * تدفق Implicit (للتطبيقات أحادية الصفحة)
   */
  async initiateImplicitFlow(clientId, redirectUri, scope, state, responseTypes = ['token']) {
    try {
      const accessToken = crypto.randomBytes(32).toString('hex');
      
      const token = {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: 3600,
        scope
      };

      // Build redirect URL with token in fragment
      let redirectUrl = `${redirectUri}#`;
      const params = new URLSearchParams();
      
      if (responseTypes.includes('token')) {
        params.append('access_token', accessToken);
        params.append('token_type', token.tokenType);
        params.append('expires_in', token.expiresIn);
      }
      
      if (state) {
        params.append('state', state);
      }

      redirectUrl += params.toString();

      return { redirectUrl, token };
    } catch (error) {
      logger.error('Implicit flow initiation failed:', error);
      throw error;
    }
  }

  /**
   * OAuth 2.0 Client Credentials Flow
   * تدفق بيانات اعتماد العميل (للتطبيقات)
   */
  async initiateClientCredentialsFlow(clientId, clientSecret, scope) {
    try {
      // Verify client credentials
      if (clientSecret !== this.OAUTH_CLIENT_SECRET) {
        throw new Error('Invalid client credentials');
      }

      const now = Date.now();
      const accessToken = crypto.randomBytes(32).toString('hex');

      const token = {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: 3600,
        scope: scope || 'api'
      };

      logger.info(`Client credentials flow successful for client: ${clientId}`);
      return token;
    } catch (error) {
      logger.error('Client credentials flow failed:', error);
      throw error;
    }
  }

  /**
   * OAuth 2.0 Resource Owner Password Flow
   * تدفق كلمة مرور مالك المورد
   */
  async initiateResourceOwnerPasswordFlow(username, password, scope, clientId) {
    try {
      // This would typically validate against your user database
      // For security, this flow should only be used for trusted clients
      
      // Validate credentials (implementation depends on your auth system)
      const userPayload = {
        username,
        scope: scope || 'api',
        clientId
      };

      // Create session through SSO service
      const session = await this.ssoService.createSession(
        username,
        userPayload,
        { source: 'password_grant' }
      );

      return {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        tokenType: 'Bearer',
        expiresIn: session.expiresIn
      };
    } catch (error) {
      logger.error('Resource owner password flow failed:', error);
      throw error;
    }
  }

  /**
   * OpenID Connect: UserInfo Endpoint
   * إرجاع معلومات المستخدم
   */
  async getUserInfo(accessToken) {
    try {
      // Verify token and get user information
      const introspection = await this.ssoService.introspectToken(accessToken);

      if (!introspection.active) {
        throw new Error('Invalid access token');
      }

      const userId = introspection.sub;

      // This would fetch user details from database
      const userInfo = {
        sub: userId,
        name: `User ${userId}`,
        email: `user${userId}@example.com`,
        email_verified: true,
        iss: 'https://sso.yourdomain.com',
        aud: introspection.clientId,
        iat: introspection.iat,
        auth_time: introspection.iat
      };

      return userInfo;
    } catch (error) {
      logger.error('UserInfo endpoint failed:', error);
      throw error;
    }
  }

  /**
   * OpenID Connect: Token Endpoint
   * نقطة نهاية التوكن
   */
  async getTokens(grantType, params) {
    try {
      switch (grantType) {
        case 'authorization_code':
          return await this.exchangeAuthorizationCode(
            params.code,
            params.clientId,
            params.clientSecret,
            params.redirectUri
          );

        case 'refresh_token':
          return await this.refreshTokenGrant(params.refreshToken, params.clientId);

        case 'client_credentials':
          return await this.initiateClientCredentialsFlow(
            params.clientId,
            params.clientSecret,
            params.scope
          );

        case 'password':
          return await this.initiateResourceOwnerPasswordFlow(
            params.username,
            params.password,
            params.scope,
            params.clientId
          );

        default:
          throw new Error(`Unsupported grant type: ${grantType}`);
      }
    } catch (error) {
      logger.error('Token endpoint failed:', error);
      throw error;
    }
  }

  /**
   * Refresh Token Grant
   * تحديث التوكن
   */
  async refreshTokenGrant(refreshToken, clientId) {
    try {
      // This would parse the refresh token and generate new access token
      const newSession = await this.ssoService.refreshAccessToken(
        null,
        refreshToken
      );

      return {
        accessToken: newSession.accessToken,
        tokenType: 'Bearer',
        expiresIn: newSession.expiresIn
      };
    } catch (error) {
      logger.error('Refresh token grant failed:', error);
      throw error;
    }
  }

  /**
   * OpenID Connect: .well-known/openid-configuration
   * معايير OpenID Connect
   */
  getOpenIDConfiguration() {
    const baseUrl = process.env.SSO_BASE_URL || 'https://sso.yourdomain.com';

    return {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth2/authorize`,
      token_endpoint: `${baseUrl}/oauth2/token`,
      userinfo_endpoint: `${baseUrl}/oauth2/userinfo`,
      jwks_uri: `${baseUrl}/.well-known/jwks.json`,
      registration_endpoint: `${baseUrl}/oauth2/register`,
      revocation_endpoint: `${baseUrl}/oauth2/revoke`,
      end_session_endpoint: `${baseUrl}/oauth2/logout`,
      response_types_supported: [
        'code',
        'token',
        'id_token',
        'code id_token',
        'token id_token',
        'code token id_token'
      ],
      grant_types_supported: [
        'authorization_code',
        'implicit',
        'refresh_token',
        'client_credentials',
        'password'
      ],
      subject_types_supported: ['public', 'pairwise'],
      id_token_signing_alg_values_supported: ['HS256', 'RS256'],
      scopes_supported: [
        'openid',
        'profile',
        'email',
        'address',
        'phone',
        'offline_access'
      ],
      claims_supported: [
        'sub',
        'name',
        'given_name',
        'family_name',
        'email',
        'email_verified',
        'address',
        'phone_number',
        'auth_time'
      ],
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
        'client_secret_jwt',
        'private_key_jwt'
      ],
      claim_types_supported: ['normal', 'aggregated', 'distributed'],
      code_challenge_methods_supported: ['plain', 'S256'],
      request_parameter_supported: true,
      request_uri_parameter_supported: true
    };
  }

  /**
   * PKCE (Proof Key for Public Clients) Support
   * دعم PKCE لحماية العملاء العامين
   */
  async verifyPKCE(codeVerifier, codeChallenge, method = 'S256') {
    try {
      let computedChallenge;

      if (method === 'S256') {
        // SHA256 hash
        const hash = crypto.createHash('sha256').update(codeVerifier).digest();
        computedChallenge = Buffer.from(hash).toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
      } else if (method === 'plain') {
        computedChallenge = codeVerifier;
      } else {
        throw new Error(`Unsupported PKCE method: ${method}`);
      }

      return computedChallenge === codeChallenge;
    } catch (error) {
      logger.error('PKCE verification failed:', error);
      throw error;
    }
  }

  /**
   * Revoke Token
   * إلغاء التوكن
   */
  async revokeToken(token, tokenTypeHint = 'access_token') {
    try {
      // In production, would invalidate token in Redis
      logger.info(`Token revoked: type=${tokenTypeHint}`);
      return { success: true };
    } catch (error) {
      logger.error('Token revocation failed:', error);
      throw error;
    }
  }

  /**
   * Dynamic Client Registration
   * تسجيل عميل ديناميكي
   */
  async registerClient(clientMetadata) {
    try {
      const clientId = crypto.randomBytes(16).toString('hex');
      const clientSecret = crypto.randomBytes(32).toString('hex');

      const client = {
        clientId,
        clientSecret,
        clientName: clientMetadata.clientName,
        redirectUris: clientMetadata.redirectUris || [],
        responseTypes: clientMetadata.responseTypes || ['code'],
        grantTypes: clientMetadata.grantTypes || ['authorization_code', 'refresh_token'],
        scopes: clientMetadata.scopes || ['openid', 'profile', 'email'],
        contacts: clientMetadata.contacts || [],
        registrationTime: Date.now()
      };

      logger.info(`Client registered: ${clientId}`);
      return { client, clientSecret };
    } catch (error) {
      logger.error('Client registration failed:', error);
      throw error;
    }
  }

  /**
   * Introspect Token (Token Introspection)
   * فحص البيانات الوصفية للتوكن
   */
  async introspectToken(token, clientId) {
    try {
      const introspection = await this.ssoService.introspectToken(token);

      // Verify client has permission to introspect
      if (introspection.clientId && introspection.clientId !== clientId) {
        logger.warn(`Unauthorized introspection attempt by client: ${clientId}`);
        return { active: false };
      }

      return introspection;
    } catch (error) {
      logger.error('Token introspection failed:', error);
      return { active: false };
    }
  }
}

module.exports = OAuthService;
