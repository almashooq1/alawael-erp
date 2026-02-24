import { useState, useEffect, useCallback, useRef } from 'react';

interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // عدد العناصر الإضافية للعرض خارج الشاشة
}

interface VirtualScrollResult {
  virtualItems: Array<{
    index: number;
    start: number;
    size: number;
  }>;
  totalHeight: number;
  scrollToIndex: (index: number) => void;
}

/**
 * Hook لتحسين أداء القوائم الطويلة باستخدام Virtual Scrolling
 * يعرض فقط العناصر المرئية في الشاشة
 */
export function useVirtualScroll(
  itemCount: number,
  options: VirtualScrollOptions
): VirtualScrollResult {
  const { itemHeight, containerHeight, overscan = 3 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // حساب العناصر المرئية
  const getVirtualItems = useCallback(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const virtualItems = [];
    for (let i = startIndex; i <= endIndex; i++) {
      virtualItems.push({
        index: i,
        start: i * itemHeight,
        size: itemHeight,
      });
    }

    return virtualItems;
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);

  const virtualItems = getVirtualItems();
  const totalHeight = itemCount * itemHeight;

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      const targetScrollTop = index * itemHeight;
      containerRef.current.scrollTop = targetScrollTop;
      setScrollTop(targetScrollTop);
    }
  }, [itemHeight]);

  // Update scroll position
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return {
    virtualItems,
    totalHeight,
    scrollToIndex,
  };
}

export default useVirtualScroll;
