/**
 * auth.service.js — Unit Tests
 * اختبارات وحدة لخدمة المصادقة
 */

// Mock apiClient before imports
import authService from 'services/auth.service';
import apiClient from 'services/api.client';
import { removeToken, getToken, getUserData, removeUserData } from 'utils/tokenStorage';
import { getPortal, removePortal } from 'utils/storageService';
jest.mock('services/api.client', () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

jest.mock('utils/tokenStorage', () => ({
  removeToken: jest.fn(),
  getToken: jest.fn(),
  getUserData: jest.fn(),
  removeUserData: jest.fn(),
}));

jest.mock('utils/storageService', () => ({
  getPortal: jest.fn(),
  removePortal: jest.fn(),
}));


beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════
// login
// ═══════════════════════════════════════════════════════════════════
describe('authService.login', () => {
  test('calls POST /auth/login with credentials', async () => {
    apiClient.post.mockResolvedValue({ token: 'abc', user: { id: 1 } });

    const result = await authService.login('admin@test.com', 'pass123', 'admin');

    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'admin@test.com',
      password: 'pass123',
      portal: 'admin',
    });
    expect(result).toEqual({ token: 'abc', user: { id: 1 } });
  });

  test('propagates API errors', async () => {
    apiClient.post.mockRejectedValue(new Error('Network Error'));

    await expect(authService.login('a@a.com', 'p')).rejects.toThrow('Network Error');
  });
});

// ═══════════════════════════════════════════════════════════════════
// logout
// ═══════════════════════════════════════════════════════════════════
describe('authService.logout', () => {
  test('clears token, user data, and portal', async () => {
    await authService.logout();

    expect(removeToken).toHaveBeenCalled();
    expect(removeUserData).toHaveBeenCalled();
    expect(removePortal).toHaveBeenCalled();
  });

  test('returns a resolved promise', async () => {
    await expect(authService.logout()).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// register
// ═══════════════════════════════════════════════════════════════════
describe('authService.register', () => {
  test('calls POST /auth/register with user data', async () => {
    const userData = { fullName: 'أحمد', email: 'a@a.com', password: 'P@ss1234' };
    apiClient.post.mockResolvedValue({ success: true });

    await authService.register(userData);

    expect(apiClient.post).toHaveBeenCalledWith('/auth/register', userData);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Password reset
// ═══════════════════════════════════════════════════════════════════
describe('authService password reset', () => {
  test('sendPasswordResetEmail calls correct endpoint', async () => {
    apiClient.post.mockResolvedValue({ success: true });

    await authService.sendPasswordResetEmail('user@test.com');

    expect(apiClient.post).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'user@test.com',
    });
  });

  test('resetPassword calls correct endpoint', async () => {
    apiClient.post.mockResolvedValue({ success: true });

    await authService.resetPassword('tok123', 'NewP@ss1');

    expect(apiClient.post).toHaveBeenCalledWith('/auth/reset-password', {
      token: 'tok123',
      newPassword: 'NewP@ss1',
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Two-Factor Authentication
// ═══════════════════════════════════════════════════════════════════
describe('authService 2FA', () => {
  test('enableTwoFactor calls correct endpoint', async () => {
    apiClient.post.mockResolvedValue({ qrCode: 'data:image/...' });
    await authService.enableTwoFactor();
    expect(apiClient.post).toHaveBeenCalledWith('/auth/2fa/enable');
  });

  test('disableTwoFactor sends password', async () => {
    apiClient.post.mockResolvedValue({ success: true });
    await authService.disableTwoFactor('myPass');
    expect(apiClient.post).toHaveBeenCalledWith('/auth/2fa/disable', { password: 'myPass' });
  });

  test('verifyTwoFactor sends code', async () => {
    apiClient.post.mockResolvedValue({ verified: true });
    await authService.verifyTwoFactor('123456');
    expect(apiClient.post).toHaveBeenCalledWith('/auth/2fa/verify', { code: '123456' });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Session helpers (synchronous)
// ═══════════════════════════════════════════════════════════════════
describe('authService session helpers', () => {
  test('getCurrentUser delegates to getUserData', () => {
    const mockUser = { id: 1, name: 'أحمد' };
    getUserData.mockReturnValue(mockUser);

    expect(authService.getCurrentUser()).toEqual(mockUser);
    expect(getUserData).toHaveBeenCalled();
  });

  test('getAuthToken delegates to getToken', () => {
    getToken.mockReturnValue('tok-abc');
    expect(authService.getAuthToken()).toBe('tok-abc');
  });

  test('isAuthenticated returns true when token exists', () => {
    getToken.mockReturnValue('some-token');
    expect(authService.isAuthenticated()).toBe(true);
  });

  test('isAuthenticated returns false when no token', () => {
    getToken.mockReturnValue(null);
    expect(authService.isAuthenticated()).toBe(false);
  });

  test('getPortal delegates to storageService', () => {
    getPortal.mockReturnValue('employee');
    expect(authService.getPortal()).toBe('employee');
  });
});

// ═══════════════════════════════════════════════════════════════════
// Security & Sessions API
// ═══════════════════════════════════════════════════════════════════
describe('authService security API', () => {
  test('getSecuritySettings calls GET /account/security', async () => {
    apiClient.get.mockResolvedValue({ twoFactor: true });
    const result = await authService.getSecuritySettings();
    expect(apiClient.get).toHaveBeenCalledWith('/account/security');
    expect(result.twoFactor).toBe(true);
  });

  test('updateSecuritySettings calls PUT /account/security', async () => {
    apiClient.put.mockResolvedValue({ success: true });
    await authService.updateSecuritySettings({ twoFactor: false });
    expect(apiClient.put).toHaveBeenCalledWith('/account/security', { twoFactor: false });
  });

  test('getSessions calls GET /account/sessions', async () => {
    apiClient.get.mockResolvedValue([{ id: 's1' }]);
    const result = await authService.getSessions();
    expect(apiClient.get).toHaveBeenCalledWith('/account/sessions');
    expect(result).toHaveLength(1);
  });

  test('logoutSession calls DELETE with session ID', async () => {
    apiClient.delete.mockResolvedValue({ success: true });
    await authService.logoutSession('s1');
    expect(apiClient.delete).toHaveBeenCalledWith('/account/sessions/s1');
  });

  test('logoutAllOtherSessions calls correct endpoint', async () => {
    apiClient.post.mockResolvedValue({ success: true });
    await authService.logoutAllOtherSessions();
    expect(apiClient.post).toHaveBeenCalledWith('/account/sessions/logout-all');
  });
});
