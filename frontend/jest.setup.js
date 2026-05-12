// jest.setup.js
import 'whatwg-fetch';

// React 19's stricter test paths exercise modules that rely on Node's
// TextEncoder/TextDecoder (jsdom doesn't polyfill them yet). Bind from
// `util` so anything that does `new TextEncoder()` at import time works.
import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;

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
