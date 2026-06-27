/**
 * Tests for Token Storage Utility
 * فحوصات أداة تخزين التوكن
 */

import {
  getToken,
  setToken,
  removeToken,
  getRefreshToken,
  setRefreshToken,
  clearAuthData,
} from '../utils/tokenStorage';

describe('Token Storage Utility', () => {
  beforeEach(() => {
    localStorage.clear();
    // Clear cookies
    document.cookie.split(';').forEach((cookie) => {
      const [name] = cookie.split('=');
      document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
  });

  test('getToken should return null initially', () => {
    expect(getToken()).toBeNull();
  });

  test('setToken and getToken should work', () => {
    setToken('test-token');
    expect(getToken()).toBe('test-token');
  });

  test('removeToken should clear token', () => {
    setToken('test-token');
    removeToken();
    expect(getToken()).toBeNull();
  });

  test('getRefreshToken should return null initially', () => {
    expect(getRefreshToken()).toBeNull();
  });

  test('setRefreshToken and getRefreshToken should work', () => {
    setRefreshToken('refresh-token');
    expect(getRefreshToken()).toBe('refresh-token');
  });

  test('clearAuthData should clear everything', () => {
    setToken('token');
    setRefreshToken('refresh');
    localStorage.setItem('user', '{"name":"test"}');

    clearAuthData();

    expect(getToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  test('should clean up legacy keys on setToken', () => {
    localStorage.setItem('auth_token', 'legacy');
    localStorage.setItem('access_token', 'legacy');
    localStorage.setItem('accessToken', 'legacy');

    setToken('new-token');

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
