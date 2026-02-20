import '@testing-library/jest-dom';

// Polyfill setImmediate for tests that rely on it
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (callback, ...args) => setTimeout(callback, 0, ...args);
}

// Mock URL.createObjectURL for file preview tests
if (typeof global.URL === 'undefined') {
  global.URL = {};
}
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
}
if (!global.URL.revokeObjectURL) {
  global.URL.revokeObjectURL = jest.fn();
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
// This needs to be a proper implementation that returns consistent objects
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

window.matchMedia = jest.fn(matchMediaMock);

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Element with id'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Clean up after each test
afterEach(() => {
  // Clear DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';

  // Clear all timers
  jest.clearAllTimers();

  // Don't reset mocks because of jest config setting restoreMocks: true
  // which would break window.matchMedia
});
