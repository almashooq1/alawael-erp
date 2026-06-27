/**
 * Tests for useNetworkStatus Hook
 * فحوصات hook مراقبة الاتصال
 */

import { renderHook, act } from '@testing-library/react';
import useNetworkStatus from './useNetworkStatus';

describe('useNetworkStatus', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    global.navigator = originalNavigator;
  });

  test('should return online true by default', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.online).toBe(true);
    expect(result.current.since).toBeInstanceOf(Date);
  });

  test('should update when going offline', () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      global.navigator.onLine = false;
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.online).toBe(false);
    expect(result.current.since).toBeNull();
  });

  test('should update when going online', () => {
    global.navigator.onLine = false;

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.online).toBe(false);

    act(() => {
      global.navigator.onLine = true;
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.online).toBe(true);
    expect(result.current.since).toBeInstanceOf(Date);
  });

  test('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useNetworkStatus());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });
});
