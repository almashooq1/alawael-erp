/**
 * Token Storage Utility
 * أداة مركزية لإدارة رموز المصادقة في localStorage
 *
 * Centralises all localStorage token operations behind a single API.
 * The canonical key is 'token'. Legacy keys ('authToken', 'auth_token',
 * 'access_token', 'accessToken') are checked as fallbacks on read and
 * cleaned up on write to gradually unify the codebase.
 */

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------
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
 * @param {string} primary   – the canonical key to check first
 * @param {string[]} legacy  – additional keys to check as fallback
 * @returns {string|null}
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

/** Read the access token, checking canonical key first then legacy keys. */
export function getToken() {
  return readFirst(TOKEN_KEY, LEGACY_TOKEN_KEYS);
}

/**
 * Persist the access token.
 * Writes to the canonical key and (temporarily) to 'authToken' so that
 * parts of the codebase not yet migrated continue to work.
 * Also clears the other legacy keys to prevent stale reads.
 */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  // Backward-compat bridge – remove once all readers are migrated
  localStorage.setItem('authToken', token);
  // Clean up other legacy keys
  localStorage.removeItem('auth_token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('accessToken');
}

/** Remove all token keys from localStorage. */
export function removeToken() {
  removeAll(TOKEN_KEY, LEGACY_TOKEN_KEYS);
}

// ---------------------------------------------------------------------------
// Public API — Refresh Token
// ---------------------------------------------------------------------------

export function getRefreshToken() {
  return readFirst(REFRESH_KEY, LEGACY_REFRESH_KEYS);
}

export function setRefreshToken(token) {
  localStorage.setItem(REFRESH_KEY, token);
  localStorage.removeItem('refresh_token');
}

export function removeRefreshToken() {
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
