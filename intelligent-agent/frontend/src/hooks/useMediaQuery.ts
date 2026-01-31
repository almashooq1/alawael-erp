import { useState, useEffect } from 'react';

// ============================================================================
// RESPONSIVE MEDIA QUERY HOOKS
// Mobile-first responsive utilities with TypeScript support
// ============================================================================

// ----------------------------------------------------------------------------
// Breakpoint definitions (mobile-first)
// ----------------------------------------------------------------------------
export const breakpoints = {
  xs: 320,   // Extra small devices (phones portrait)
  sm: 640,   // Small devices (phones landscape)
  md: 768,   // Medium devices (tablets portrait)
  lg: 1024,  // Large devices (tablets landscape, laptops)
  xl: 1280,  // Extra large devices (desktops)
  '2xl': 1536, // 2X large devices (large desktops)
  '3xl': 1920, // 3X large devices (4K displays)
  '4xl': 2560, // 4X large devices (Ultra-wide, 4K+)
} as const;

export type Breakpoint = keyof typeof breakpoints;

// ----------------------------------------------------------------------------
// useMediaQuery - Generic media query hook
// ----------------------------------------------------------------------------
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
    // Legacy browsers
    else {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, [query]);

  return matches;
};

// ----------------------------------------------------------------------------
// useBreakpoint - Check if screen is at or above breakpoint
// ----------------------------------------------------------------------------
export const useBreakpoint = (breakpoint: Breakpoint): boolean => {
  return useMediaQuery(`(min-width: ${breakpoints[breakpoint]}px)`);
};

// ----------------------------------------------------------------------------
// useResponsive - Get current breakpoint and device info
// ----------------------------------------------------------------------------
export interface ResponsiveState {
  currentBreakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeScreen: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
}

export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>({
    currentBreakpoint: 'xs',
    isMobile: true,
    isTablet: false,
    isDesktop: false,
    isLargeScreen: false,
    isPortrait: true,
    isLandscape: false,
    isTouchDevice: false,
    screenWidth: 0,
    screenHeight: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Determine current breakpoint
      let currentBreakpoint: Breakpoint = 'xs';
      if (width >= breakpoints['4xl']) currentBreakpoint = '4xl';
      else if (width >= breakpoints['3xl']) currentBreakpoint = '3xl';
      else if (width >= breakpoints['2xl']) currentBreakpoint = '2xl';
      else if (width >= breakpoints.xl) currentBreakpoint = 'xl';
      else if (width >= breakpoints.lg) currentBreakpoint = 'lg';
      else if (width >= breakpoints.md) currentBreakpoint = 'md';
      else if (width >= breakpoints.sm) currentBreakpoint = 'sm';

      // Device categories
      const isMobile = width < breakpoints.md;
      const isTablet = width >= breakpoints.md && width < breakpoints.lg;
      const isDesktop = width >= breakpoints.lg;
      const isLargeScreen = width >= breakpoints['2xl'];

      // Orientation
      const isPortrait = height > width;
      const isLandscape = width > height;

      // Touch detection
      const isTouchDevice =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0;

      setState({
        currentBreakpoint,
        isMobile,
        isTablet,
        isDesktop,
        isLargeScreen,
        isPortrait,
        isLandscape,
        isTouchDevice,
        screenWidth: width,
        screenHeight: height,
      });
    };

    updateState();

    window.addEventListener('resize', updateState);
    window.addEventListener('orientationchange', updateState);

    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('orientationchange', updateState);
    };
  }, []);

  return state;
};

// ----------------------------------------------------------------------------
// useOrientation - Detect screen orientation
// ----------------------------------------------------------------------------
export type Orientation = 'portrait' | 'landscape';

export const useOrientation = (): Orientation => {
  const [orientation, setOrientation] = useState<Orientation>('portrait');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateOrientation();

    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return orientation;
};

// ----------------------------------------------------------------------------
// useViewportSize - Get viewport dimensions
// ----------------------------------------------------------------------------
export interface ViewportSize {
  width: number;
  height: number;
}

export const useViewportSize = (): ViewportSize => {
  const [size, setSize] = useState<ViewportSize>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateSize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return size;
};

// ----------------------------------------------------------------------------
// useDeviceType - Detect device category
// ----------------------------------------------------------------------------
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export const useDeviceType = (): DeviceType => {
  const { isMobile, isTablet } = useResponsive();

  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
};

// ----------------------------------------------------------------------------
// useTouchDevice - Detect if device supports touch
// ----------------------------------------------------------------------------
export const useTouchDevice = (): boolean => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          (navigator as any).msMaxTouchPoints > 0
      );
    };

    checkTouch();
  }, []);

  return isTouch;
};

// ----------------------------------------------------------------------------
// usePreferredColorScheme - Detect system color scheme preference
// ----------------------------------------------------------------------------
export type ColorScheme = 'light' | 'dark';

export const usePreferredColorScheme = (): ColorScheme => {
  const isDark = useMediaQuery('(prefers-color-scheme: dark)');
  return isDark ? 'dark' : 'light';
};

// ----------------------------------------------------------------------------
// useReducedMotion - Detect if user prefers reduced motion
// ----------------------------------------------------------------------------
export const useReducedMotion = (): boolean => {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
};

// ----------------------------------------------------------------------------
// useHighContrast - Detect if user prefers high contrast
// ----------------------------------------------------------------------------
export const useHighContrast = (): boolean => {
  return useMediaQuery('(prefers-contrast: high)');
};

// ----------------------------------------------------------------------------
// Utility: Get responsive value based on breakpoint
// ----------------------------------------------------------------------------
export const getResponsiveValue = <T,>(
  values: Partial<Record<Breakpoint, T>>,
  currentBreakpoint: Breakpoint,
  defaultValue: T
): T => {
  // Priority order: current -> smaller -> default
  const orderedBreakpoints: Breakpoint[] = ['4xl', '3xl', '2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = orderedBreakpoints.indexOf(currentBreakpoint);

  for (let i = currentIndex; i < orderedBreakpoints.length; i++) {
    const bp = orderedBreakpoints[i];
    if (values[bp] !== undefined) {
      return values[bp] as T;
    }
  }

  return defaultValue;
};

// ----------------------------------------------------------------------------
// Utility: Generate responsive className based on breakpoint
// ----------------------------------------------------------------------------
export const responsiveClass = (
  classes: Partial<Record<Breakpoint, string>>,
  currentBreakpoint: Breakpoint
): string => {
  return getResponsiveValue(classes, currentBreakpoint, '');
};
