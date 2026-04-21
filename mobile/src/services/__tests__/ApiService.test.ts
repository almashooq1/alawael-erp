/**
 * ApiService.test.ts — exercises the axios-instance-based service.
 *
 * The service's constructor calls `axios.create()` and wires up
 * `.interceptors.request.use` / `.interceptors.response.use`. The
 * axios mock must stand up a fake instance that satisfies all of
 * that shape or the module throws at require-time.
 */

jest.mock('expo-secure-store');

// jest.mock factories cannot capture non-mock-prefixed closure vars
// (Jest hoists them above all other module-scope code), so the
// stub instance is built inside the factory and re-exposed via the
// mocked module's `default.__mockInstance` handle.
jest.mock('axios', () => {
  const instance: any = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  const axiosFn: any = jest.fn(() => instance);
  axiosFn.create = jest.fn(() => instance);
  axiosFn.__mockInstance = instance;
  return { __esModule: true, default: axiosFn };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require('axios').default;
const mockAxiosInstance = axios.__mockInstance;

import ApiService from '../ApiService';

describe('ApiService', () => {
  beforeEach(() => {
    Object.values(mockAxiosInstance).forEach((v: any) => {
      if (typeof v?.mockReset === 'function') v.mockReset();
    });
  });

  describe('GET requests', () => {
    it('returns response.data on success', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { id: 1, name: 'Test' } });
      const result = await ApiService.get('/test');
      expect(result).toEqual({ id: 1, name: 'Test' });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', { params: undefined });
    });

    it('propagates network errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));
      await expect(ApiService.get('/test')).rejects.toThrow('Network error');
    });
  });

  describe('POST requests', () => {
    it('returns response.data on success', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 1, name: 'Created' } });
      const result = await ApiService.post('/resources', { name: 'Test' });
      expect(result).toEqual({ id: 1, name: 'Created' });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/resources', { name: 'Test' });
    });
  });

  describe('PUT requests', () => {
    it('returns response.data on success', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: { ok: true } });
      const result = await ApiService.put('/resources/1', { name: 'Updated' });
      expect(result).toEqual({ ok: true });
    });
  });

  describe('DELETE requests', () => {
    it('returns response.data on success', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: { deleted: true } });
      const result = await ApiService.delete('/resources/1');
      expect(result).toEqual({ deleted: true });
    });
  });
});
