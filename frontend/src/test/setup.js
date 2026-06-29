import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Provide a jest global alias for tests that still use jest.fn()/jest.mock()
if (typeof globalThis.jest === 'undefined') {
  globalThis.jest = vi;
}
