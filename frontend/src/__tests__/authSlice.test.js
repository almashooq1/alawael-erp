/**
 * اختبارات Redux authSlice
 */

import authReducer, { login, logout, setUser, setLoading, setError, clearError } from '../store/slices/authSlice';

describe('authSlice', () => {
  const initialState = {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  };

  test('يجب إرجاع الحالة الأولية', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('setUser', () => {
    test('يجب تعيين المستخدم', () => {
      const user = { id: 1, username: 'testuser' };
      const state = authReducer(initialState, setUser(user));
      expect(state.user).toEqual(user);
    });

    test('يجب تعيين حالة المصادقة إلى true', () => {
      const user = { id: 1, username: 'testuser' };
      const state = authReducer(initialState, setUser(user));
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('setLoading', () => {
    test('يجب تعيين حالة التحميل', () => {
      const state = authReducer(initialState, setLoading(true));
      expect(state.loading).toBe(true);
    });
  });

  describe('setError', () => {
    test('يجب تعيين رسالة الخطأ', () => {
      const error = 'بيانات دخول خاطئة';
      const state = authReducer(initialState, setError(error));
      expect(state.error).toBe(error);
    });
  });

  describe('clearError', () => {
    test('يجب مسح رسالة الخطأ', () => {
      let state = authReducer(initialState, setError('خطأ ما'));
      expect(state.error).toBe('خطأ ما');

      state = authReducer(state, clearError());
      expect(state.error).toBeNull();
    });
  });

  describe('logout action', () => {
    test('يجب مسح بيانات المستخدم', () => {
      const userState = {
        ...initialState,
        user: { id: 1, username: 'testuser' },
        isAuthenticated: true,
      };

      const state = authReducer(userState, logout());
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
    });
  });
});
