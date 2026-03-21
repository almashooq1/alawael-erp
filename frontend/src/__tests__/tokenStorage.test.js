/**
 * tokenStorage.js — Unit Tests
 * اختبارات وحدة لإدارة رموز المصادقة
 */
import {
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
} from 'utils/tokenStorage';

// Reset localStorage before each test
beforeEach(() => {
  localStorage.clear();
});

// ═══════════════════════════════════════════════════════════════════
// Access Token
// ═══════════════════════════════════════════════════════════════════
describe('Access Token', () => {
  test('setToken stores and getToken retrieves', () => {
    setToken('abc123');
    expect(getToken()).toBe('abc123');
  });

  test('setToken writes to canonical key "token"', () => {
    setToken('xyz');
    expect(localStorage.getItem('token')).toBe('xyz');
  });

  test('setToken also writes to legacy "authToken" for backward compat', () => {
    setToken('xyz');
    expect(localStorage.getItem('authToken')).toBe('xyz');
  });

  test('setToken cleans up old legacy keys', () => {
    localStorage.setItem('auth_token', 'old1');
    localStorage.setItem('access_token', 'old2');
    localStorage.setItem('accessToken', 'old3');
    setToken('new');
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  test('getToken falls back to legacy keys', () => {
    localStorage.setItem('authToken', 'legacy-val');
    expect(getToken()).toBe('legacy-val');
  });

  test('getToken returns null when no token exists', () => {
    expect(getToken()).toBeNull();
  });

  test('removeToken clears all token keys', () => {
    localStorage.setItem('token', 'a');
    localStorage.setItem('authToken', 'b');
    localStorage.setItem('auth_token', 'c');
    removeToken();
    expect(getToken()).toBeNull();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// Refresh Token
// ═══════════════════════════════════════════════════════════════════
describe('Refresh Token', () => {
  test('setRefreshToken and getRefreshToken work', () => {
    setRefreshToken('refresh-abc');
    expect(getRefreshToken()).toBe('refresh-abc');
  });

  test('getRefreshToken falls back to legacy key', () => {
    localStorage.setItem('refresh_token', 'legacy');
    expect(getRefreshToken()).toBe('legacy');
  });

  test('setRefreshToken cleans up legacy key', () => {
    localStorage.setItem('refresh_token', 'old');
    setRefreshToken('new');
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  test('removeRefreshToken clears all refresh keys', () => {
    localStorage.setItem('refreshToken', 'a');
    localStorage.setItem('refresh_token', 'b');
    removeRefreshToken();
    expect(getRefreshToken()).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// User Data
// ═══════════════════════════════════════════════════════════════════
describe('User Data', () => {
  test('setUserData and getUserData round-trip JSON', () => {
    const user = { id: 1, name: 'أحمد', role: 'admin' };
    setUserData(user);
    expect(getUserData()).toEqual(user);
  });

  test('getUserData falls back to legacy "userData" key', () => {
    localStorage.setItem('userData', JSON.stringify({ id: 2 }));
    expect(getUserData()).toEqual({ id: 2 });
  });

  test('getUserData returns null when no data exists', () => {
    expect(getUserData()).toBeNull();
  });

  test('getUserData returns null for corrupt JSON', () => {
    localStorage.setItem('user', '{bad-json');
    expect(getUserData()).toBeNull();
  });

  test('removeUserData clears all user keys', () => {
    localStorage.setItem('user', '{"id":1}');
    localStorage.setItem('userData', '{"id":2}');
    removeUserData();
    expect(getUserData()).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// clearAuthData
// ═══════════════════════════════════════════════════════════════════
describe('clearAuthData', () => {
  test('clears all auth-related storage', () => {
    setToken('tok');
    setRefreshToken('ref');
    setUserData({ id: 1 });
    localStorage.setItem('userId', '123');

    clearAuthData();

    expect(getToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getUserData()).toBeNull();
    expect(localStorage.getItem('userId')).toBeNull();
  });
});
