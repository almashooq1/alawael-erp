import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  login,
  register,
  logout,
  checkAuth,
  clearError,
} from '../../store/slices/authSlice';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store');

describe('authSlice', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().auth;
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('login thunk', () => {
    it('should handle successful login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          avatar: 'https://example.com/avatar.jpg',
        },
        token: 'test-token-123',
      };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      );

      await store.dispatch(login(loginData) as any);
      const state = store.getState().auth;

      expect(state.token).toBe('test-token-123');
      expect(state.user).toEqual(mockResponse.user);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'authToken',
        'test-token-123'
      );
    });

    it('should handle login error', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Invalid credentials' }),
        })
      );

      await store.dispatch(login(loginData) as any);
      const state = store.getState().auth;

      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).not.toBeNull();
    });
  });

  describe('register thunk', () => {
    it('should handle successful registration', async () => {
      const registerData = {
        name: 'New User',
        email: 'new@example.com',
        company: 'Test Company',
        password: 'password123',
      };

      const mockResponse = {
        user: {
          id: '2',
          email: 'new@example.com',
          name: 'New User',
          role: 'user',
          avatar: null,
        },
        token: 'new-token-456',
      };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      );

      await store.dispatch(register(registerData) as any);
      const state = store.getState().auth;

      expect(state.user).toEqual(mockResponse.user);
      expect(state.token).toBe('new-token-456');
      expect(state.isAuthenticated).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'authToken',
        'new-token-456'
      );
    });
  });

  describe('logout thunk', () => {
    it('should handle logout', async () => {
      // First set authenticated state
      store = configureStore({
        reducer: {
          auth: authReducer,
        },
        preloadedState: {
          auth: {
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              avatar: null,
            },
            token: 'test-token',
            isLoading: false,
            error: null,
            isAuthenticated: true,
          },
        },
      });

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      );

      await store.dispatch(logout() as any);
      const state = store.getState().auth;

      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('authToken');
    });
  });

  describe('checkAuth thunk', () => {
    it('should restore authentication if token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('stored-token');

      const mockResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          avatar: null,
        },
      };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      );

      await store.dispatch(checkAuth() as any);
      const state = store.getState().auth;

      expect(state.token).toBe('stored-token');
      expect(state.user).toEqual(mockResponse.user);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should not authenticate if no token found', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await store.dispatch(checkAuth() as any);
      const state = store.getState().auth;

      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('clearError action', () => {
    it('should clear error state', () => {
      store = configureStore({
        reducer: {
          auth: authReducer,
        },
        preloadedState: {
          auth: {
            user: null,
            token: null,
            isLoading: false,
            error: 'Some error',
            isAuthenticated: false,
          },
        },
      });

      store.dispatch(clearError());
      const state = store.getState().auth;

      expect(state.error).toBeNull();
    });
  });
});
