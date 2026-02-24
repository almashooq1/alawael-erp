// jest.setup.js
import 'whatwg-fetch';

// Mock fetch for all tests to avoid network errors and CORS issues
beforeAll(() => {
  global.fetch = jest.fn((url, options) => {
    // You can customize mock responses based on URL or method
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
    });
  });
});

afterAll(() => {
  global.fetch.mockRestore && global.fetch.mockRestore();
});
