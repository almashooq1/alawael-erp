import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth';
import { setActivePinia, createPinia } from 'pinia';

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('should initialize with empty state', () => {
    const store = useAuthStore();
    expect(store.user).toBeNull();
    expect(store.accessToken).toBeNull();
    expect(store.refreshToken).toBeNull();
  });

  it('should login successfully', async () => {
    const store = useAuthStore();

    // Mock API call
    vi.mock('@/services/api', () => ({
      default: {
        post: vi.fn().mockResolvedValue({
          data: {
            data: {
              user: {
                _id: '123',
                fullName: 'Test',
                email: 'test@example.com',
                role: 'user',
              },
              accessToken: 'access_token_123',
              refreshToken: 'refresh_token_123',
            },
          },
        }),
      },
    }));

    const result = await store.login('test@example.com', 'password');
    expect(result).toBe(true);
    expect(store.user).toBeDefined();
    expect(store.accessToken).toBe('access_token_123');
  });

  it('should logout successfully', async () => {
    const store = useAuthStore();
    store.user = { _id: '123', email: 'test@example.com' };
    store.accessToken = 'token_123';

    await store.logout();

    expect(store.user).toBeNull();
    expect(store.accessToken).toBeNull();
  });

  it('should check auth status', async () => {
    const store = useAuthStore();
    localStorage.setItem('accessToken', 'stored_token');

    vi.mock('@/services/api', () => ({
      default: {
        get: vi.fn().mockResolvedValue({
          data: {
            data: {
              _id: '123',
              email: 'test@example.com',
            },
          },
        }),
      },
    }));

    await store.checkAuth();
    expect(store.user).toBeDefined();
  });
});
