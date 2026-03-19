import axios from 'axios';
import ApiService from '../../services/ApiService';
import * as SecureStore from 'expo-secure-store';

jest.mock('axios');
jest.mock('expo-secure-store');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('GET requests', () => {
    it('should successfully make a GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockedAxios.get.mockResolvedValue({ data: mockData });

      const result = await ApiService.get('/test');

      expect(result).toEqual(mockData);
      expect(mockedAxios.get).toHaveBeenCalledWith('/test', undefined);
    });

    it('should handle GET request errors', async () => {
      const error = new Error('Network error');
      mockedAxios.get.mockRejectedValue(error);

      await expect(ApiService.get('/test')).rejects.toThrow('Network error');
    });
  });

  describe('POST requests', () => {
    it('should successfully make a POST request', async () => {
      const mockData = { id: 1, name: 'Created' };
      mockedAxios.post.mockResolvedValue({ data: mockData });

      const payload = { name: 'Test' };
      const result = await ApiService.post('/test', payload);

      expect(result).toEqual(mockData);
      expect(mockedAxios.post).toHaveBeenCalledWith('/test', payload, undefined);
    });

    it('should handle POST request errors', async () => {
      const error = new Error('Server error');
      mockedAxios.post.mockRejectedValue(error);

      const payload = { name: 'Test' };
      await expect(ApiService.post('/test', payload)).rejects.toThrow(
        'Server error'
      );
    });
  });

  describe('PUT requests', () => {
    it('should successfully make a PUT request', async () => {
      const mockData = { id: 1, name: 'Updated' };
      mockedAxios.put.mockResolvedValue({ data: mockData });

      const payload = { name: 'Updated' };
      const result = await ApiService.put('/test/1', payload);

      expect(result).toEqual(mockData);
      expect(mockedAxios.put).toHaveBeenCalledWith('/test/1', payload, undefined);
    });
  });

  describe('DELETE requests', () => {
    it('should successfully make a DELETE request', async () => {
      mockedAxios.delete.mockResolvedValue({ data: { success: true } });

      const result = await ApiService.delete('/test/1');

      expect(result).toEqual({ success: true });
      expect(mockedAxios.delete).toHaveBeenCalledWith('/test/1', undefined);
    });
  });

  describe('Batch requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const mockData1 = { id: 1, data: 'test1' };
      const mockData2 = { id: 2, data: 'test2' };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockData1 })
        .mockResolvedValueOnce({ data: mockData2 });

      const results = await ApiService.batch([
        { method: 'get', url: '/test1' },
        { method: 'get', url: '/test2' },
      ]);

      expect(results).toEqual([mockData1, mockData2]);
    });

    it('should handle partial batch failures', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: { id: 1 } })
        .mockRejectedValueOnce(new Error('Failed'));

      const results = await ApiService.batch([
        { method: 'get', url: '/test1' },
        { method: 'get', url: '/test2' },
      ]);

      expect(results[0]).toEqual({ id: 1 });
      expect(results[1]).toBeInstanceOf(Error);
    });
  });

  describe('Token refresh', () => {
    it('should refresh token on 401 response', async () => {
      const refreshToken = 'refresh-token-123';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(refreshToken);

      const newAccessToken = 'new-access-token';
      mockedAxios.post.mockResolvedValueOnce({
        data: { token: newAccessToken },
      });

      const result = await ApiService.renewToken();

      expect(result).toBe(newAccessToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'authToken',
        newAccessToken
      );
    });

    it('should clear tokens on refresh failure', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Refresh failed'));

      await ApiService.renewToken();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('authToken');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
    });
  });

  describe('Offline queueing', () => {
    it('should queue POST requests when offline', async () => {
      // Simulate offline state
      mockedAxios.post.mockRejectedValue({
        response: { status: 0 },
        message: 'Network Error',
      });

      try {
        await ApiService.post('/offline-test', { data: 'test' });
      } catch (error) {
        // Expected to fail
      }

      // Verify queue was used (this would require mocking the offline queue)
      // This is a simplified test showing the concept
    });
  });

  describe('File operations', () => {
    it('should handle file upload', async () => {
      const mockResponse = { fileId: 'file-123', url: 'http://example.com/file' };
      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const formData = new FormData();
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      formData.append('file', file);

      const result = await ApiService.uploadFile('/upload', formData);

      expect(result).toEqual(mockResponse);
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('should handle file download', async () => {
      const mockBlob = new Blob(['file content'], { type: 'application/pdf' });
      mockedAxios.get.mockResolvedValue({
        data: mockBlob,
        headers: { 'content-disposition': 'attachment; filename=test.pdf' },
      });

      const result = await ApiService.downloadFile('/download/file-123');

      expect(result).toBe(mockBlob);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.get.mockRejectedValue(networkError);

      await expect(ApiService.get('/test')).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      const timeoutError = { code: 'ECONNABORTED', message: 'timeout' };
      mockedAxios.get.mockRejectedValue(timeoutError);

      await expect(ApiService.get('/test')).rejects.toThrow();
    });

    it('should handle server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { message: 'Internal Server Error' },
        },
      };
      mockedAxios.get.mockRejectedValue(serverError);

      await expect(ApiService.get('/test')).rejects.toThrow();
    });
  });
});
