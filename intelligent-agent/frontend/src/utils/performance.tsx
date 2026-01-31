import React, { Suspense, lazy, ComponentType } from 'react';

// ============================================================================
// PERFORMANCE OPTIMIZATION UTILITIES
// Code splitting, lazy loading, and performance enhancements
// ============================================================================

// ----------------------------------------------------------------------------
// LazyLoad - Lazy load component with fallback
// ----------------------------------------------------------------------------
interface LazyLoadProps {
  factory: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  [key: string]: any;
}

export const LazyLoad: React.FC<LazyLoadProps> = ({
  factory,
  fallback = <div>Loading...</div>,
  ...props
}) => {
  const LazyComponent = lazy(factory);

  return (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// ----------------------------------------------------------------------------
// createLazyComponent - Factory for lazy components
// ----------------------------------------------------------------------------
export const createLazyComponent = <P extends object>(
  factory: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = lazy(factory);

  return (props: P) => (
    <Suspense fallback={fallback || <div>Loading...</div>}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// ----------------------------------------------------------------------------
// LazyImage - Lazy load images with intersection observer
// ----------------------------------------------------------------------------
interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  onLoad?: () => void;
  threshold?: number;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23eee" width="400" height="300"/%3E%3C/svg%3E',
  width,
  height,
  className = '',
  onLoad,
  threshold = 0.1,
}) => {
  const [imageSrc, setImageSrc] = React.useState(placeholder);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const imageRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (!imageRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      { threshold }
    );

    observer.observe(imageRef.current);

    return () => observer.disconnect();
  }, [src, threshold]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  return (
    <img
      ref={imageRef}
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onLoad={handleLoad}
      style={{
        opacity: isLoaded ? 1 : 0.5,
        transition: 'opacity 0.3s ease-in-out',
      }}
      loading="lazy"
    />
  );
};

// ----------------------------------------------------------------------------
// Preload - Preload resources
// ----------------------------------------------------------------------------
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

export const preloadImages = async (sources: string[]): Promise<void> => {
  await Promise.all(sources.map((src) => preloadImage(src)));
};

export const preloadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export const preloadStylesheet = (href: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = reject;
    document.head.appendChild(link);
  });
};

// ----------------------------------------------------------------------------
// Memoization utilities
// ----------------------------------------------------------------------------
export const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);

    // Limit cache size
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return result;
  }) as T;
};

// ----------------------------------------------------------------------------
// Debounce - Delay function execution
// ----------------------------------------------------------------------------
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// ----------------------------------------------------------------------------
// Throttle - Limit function execution rate
// ----------------------------------------------------------------------------
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// ----------------------------------------------------------------------------
// useDebounce - React hook for debounced values
// ----------------------------------------------------------------------------
export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ----------------------------------------------------------------------------
// useThrottle - React hook for throttled values
// ----------------------------------------------------------------------------
export const useThrottle = <T,>(value: T, limit: number): T => {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastRan = React.useRef(Date.now());

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
};

// ----------------------------------------------------------------------------
// useIdleCallback - Execute function when browser is idle
// ----------------------------------------------------------------------------
export const useIdleCallback = (callback: () => void, deps: React.DependencyList = []) => {
  React.useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(callback);
      return () => cancelIdleCallback(id);
    } else {
      const timeout = setTimeout(callback, 1);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

// ----------------------------------------------------------------------------
// Performance monitoring utilities
// ----------------------------------------------------------------------------
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  const duration = end - start;

  console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);

  return duration;
};

export const measureAsyncPerformance = async (
  name: string,
  fn: () => Promise<void>
): Promise<number> => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  const duration = end - start;

  console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);

  return duration;
};

// ----------------------------------------------------------------------------
// Bundle size analysis
// ----------------------------------------------------------------------------
export const logComponentSize = (componentName: string, component: any) => {
  const size = JSON.stringify(component).length;
  console.log(`[Bundle Size] ${componentName}: ~${(size / 1024).toFixed(2)}KB`);
};

// ----------------------------------------------------------------------------
// Memory leak prevention
// ----------------------------------------------------------------------------
export const useCleanup = (cleanup: () => void) => {
  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);
};

// ----------------------------------------------------------------------------
// Optimize re-renders with shallow comparison
// ----------------------------------------------------------------------------
export const shallowEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;

  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }

  return true;
};

// ----------------------------------------------------------------------------
// Virtual scrolling for large lists
// ----------------------------------------------------------------------------
interface VirtualScrollProps {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  overscan?: number;
}

export const VirtualScroll: React.FC<VirtualScrollProps> = ({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
}) => {
  const [scrollTop, setScrollTop] = React.useState(0);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
