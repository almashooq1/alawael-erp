// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for jsPDF and node env
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock URL.createObjectURL for exportService tests
if (typeof global.URL === 'undefined') {
  global.URL = {};
}
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
}

// Mock navigator.clipboard for copyToClipboard tests
if (typeof global.navigator === 'undefined') {
  global.navigator = {};
}
if (!global.navigator.clipboard) {
  global.navigator.clipboard = {
    writeText: jest.fn().mockResolvedValue(undefined),
  };
}

// Mock IntersectionObserver
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  };
}

// Mock ResizeObserver
if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  };
}

// Mock window.matchMedia for Ant Design responsive observer
const matchMediaMock = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

if (!window.matchMedia) {
  window.matchMedia = jest.fn(matchMediaMock);
}

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
