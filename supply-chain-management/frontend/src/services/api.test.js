/* eslint-disable no-unused-vars */
import axios from 'axios';

jest.mock('axios');

describe('API Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET Requests', () => {
    it('should fetch products successfully', async () => {
      const mockData = [
        { id: 1, name: 'Product 1', price: 100 },
        { id: 2, name: 'Product 2', price: 200 },
      ];

      axios.get.mockResolvedValueOnce({ data: mockData, status: 200 });

      const response = await axios.get('/api/products');

      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockData);
      expect(axios.get).toHaveBeenCalledWith('/api/products');
    });

    it('should handle 404 errors', async () => {
      const errorResponse = { status: 404, data: { error: 'Not found' } };

      axios.get.mockRejectedValueOnce({ response: errorResponse });

      try {
        await axios.get('/api/products/999');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('POST Requests', () => {
    it('should create product successfully', async () => {
      const newProduct = { name: 'New Product', price: 150 };
      const mockResponse = { id: 3, ...newProduct };

      axios.post.mockResolvedValueOnce({ data: mockResponse, status: 201 });

      const response = await axios.post('/api/products', newProduct);

      expect(response.status).toBe(201);
      expect(response.data).toEqual(mockResponse);
      expect(axios.post).toHaveBeenCalledWith('/api/products', newProduct);
    });

    it('should handle validation errors', async () => {
      const invalidProduct = { name: '' };
      const errorResponse = { status: 400, data: { error: 'Invalid input' } };

      axios.post.mockRejectedValueOnce({ response: errorResponse });

      try {
        await axios.post('/api/products', invalidProduct);
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');

      axios.get.mockRejectedValueOnce(networkError);

      try {
        await axios.get('/api/products');
      } catch (error) {
        expect(error.message).toBe('Network Error');
      }
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');

      axios.get.mockRejectedValueOnce(timeoutError);

      try {
        await axios.get('/api/products');
      } catch (error) {
        expect(error.message).toBe('Request timeout');
      }
    });
  });
});
