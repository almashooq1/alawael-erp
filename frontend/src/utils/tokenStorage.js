/**
 * Token Storage Utility
 * أداة مركزية لإدارة رموز المصادقة في localStorage
 *
 * Centralises all localStorage token operations behind a single API.
 * The canonical key is 'token'. Legacy keys ('authToken', 'auth_token',
 * 'access_token', 'accessToken') are checked as fallbacks on read and
 * cleaned up on write to gradually unify the codebase.
 */

/**
 * Secure Cookie Storage — preferred for auth tokens in production
 * Uses document.cookie with Secure, SameSite=Strict, and __Secure- prefix
 * Falls back to localStorage if cookies are unavailable
 */

const COOKIE_PREFIX = '__Secure-';

function getCookie(name) {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_PREFIX}${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function setCookie(name, value, maxAge = 86400) {
  try {
    const isSecure = window.location.protocol === 'https:';
    const flags = [
      `${COOKIE_PREFIX}${name}=${encodeURIComponent(value)}`,
      `path=/`,
      `SameSite=Strict`,
    ];
    if (isSecure) flags.push('Secure');
    if (maxAge) flags.push(`max-age=${maxAge}`);
    document.cookie = flags.join('; ');
    return true;
  } catch {
    return false;
  }
}

function removeCookie(name) {
  try {
    const flags = [`${COOKIE_PREFIX}${name}=`, `path=/`, `max-age=0`];
    document.cookie = flags.join('; ');
  } catch {
    /* ignore */
  }
}

const TOKEN_KEY = 'token';
const LEGACY_TOKEN_KEYS = ['authToken', 'auth_token', 'access_token', 'accessToken'];

const REFRESH_KEY = 'refreshToken';
const LEGACY_REFRESH_KEYS = ['refresh_token'];

const USER_KEY = 'user';
const LEGACY_USER_KEYS = ['userData'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read the first available value from a list of localStorage keys.
 */
function readFirst(primary, legacy) {
  const value = localStorage.getItem(primary);
  if (value) return value;

  for (const key of legacy) {
    const v = localStorage.getItem(key);
    if (v) return v;
  }
  return null;
}

/**
 * Remove all keys (primary + legacy) from localStorage.
 */
function removeAll(primary, legacy) {
  localStorage.removeItem(primary);
  for (const key of legacy) {
    localStorage.removeItem(key);
  }
}

// ---------------------------------------------------------------------------
// Public API — Access Token
// ---------------------------------------------------------------------------

/** Read the access token, checking secure cookie first then localStorage. */
export function getToken() {
  // Prefer secure cookie in production
  const cookieToken = getCookie(TOKEN_KEY);
  if (cookieToken) return cookieToken;
  return readFirst(TOKEN_KEY, LEGACY_TOKEN_KEYS);
}

/** Persist the access token to secure cookie (or localStorage as fallback). */
export function setToken(token) {
  const cookieSet = setCookie(TOKEN_KEY, token, 86400); // 24 hours
  if (!cookieSet) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  // Backward-compat bridge
  localStorage.setItem('authToken', token);
  localStorage.removeItem('auth_token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('accessToken');
}

/** Remove all token keys from storage. */
export function removeToken() {
  removeCookie(TOKEN_KEY);
  removeAll(TOKEN_KEY, LEGACY_TOKEN_KEYS);
}

// ---------------------------------------------------------------------------
// Public API — Refresh Token
// ---------------------------------------------------------------------------

export function getRefreshToken() {
  const cookieToken = getCookie(REFRESH_KEY);
  if (cookieToken) return cookieToken;
  return readFirst(REFRESH_KEY, LEGACY_REFRESH_KEYS);
}

export function setRefreshToken(token) {
  setCookie(REFRESH_KEY, token, 604800); // 7 days
  // Always mirror to localStorage as a reliable fallback
  localStorage.setItem(REFRESH_KEY, token);
  localStorage.removeItem('refresh_token');
}

export function removeRefreshToken() {
  removeCookie(REFRESH_KEY);
  removeAll(REFRESH_KEY, LEGACY_REFRESH_KEYS);
}

// ---------------------------------------------------------------------------
// Public API — User Data
// ---------------------------------------------------------------------------

export function getUserData() {
  const raw = readFirst(USER_KEY, LEGACY_USER_KEYS);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUserData(data) {
  localStorage.setItem(USER_KEY, JSON.stringify(data));
  localStorage.removeItem('userData');
}

export function removeUserData() {
  removeAll(USER_KEY, LEGACY_USER_KEYS);
}

// ---------------------------------------------------------------------------
// Convenience — clear all auth data at once (for logout)
// ---------------------------------------------------------------------------

export function clearAuthData() {
  removeToken();
  removeRefreshToken();
  removeUserData();
  localStorage.removeItem('userId');
}

// ---------------------------------------------------------------------------
// Default export for convenience
// ---------------------------------------------------------------------------

const tokenStorage = {
  getToken,
  setToken,
  removeToken,
  getRefreshToken,
  setRefreshToken,
  removeRefreshToken,
  getUserData,
  setUserData,
  removeUserData,
  clearAuthData,
};

export default tokenStorage;
