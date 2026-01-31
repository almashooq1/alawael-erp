import React, { useRef, useState } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';

// ============================================================================
// GESTURE-BASED ANIMATIONS
// Touch and mouse gesture interactions with physics-based animations
// ============================================================================

// ----------------------------------------------------------------------------
// SwipeCard - Swipeable card with dismiss action
// ----------------------------------------------------------------------------
interface SwipeCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 100,
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offsetX = info.offset.x;
    const offsetY = info.offset.y;

    if (Math.abs(offsetX) > Math.abs(offsetY)) {
      if (offsetX > threshold && onSwipeRight) {
        onSwipeRight();
      } else if (offsetX < -threshold && onSwipeLeft) {
        onSwipeLeft();
      }
    } else {
      if (offsetY > threshold && onSwipeDown) {
        onSwipeDown();
      } else if (offsetY < -threshold && onSwipeUp) {
        onSwipeUp();
      }
    }
  };

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      style={{ x, y, rotate, opacity }}
      whileTap={{ scale: 1.05 }}
    >
      {children}
    </motion.div>
  );
};

// ----------------------------------------------------------------------------
// DraggableItem - Draggable element with boundaries
// ----------------------------------------------------------------------------
interface DraggableItemProps {
  children: React.ReactNode;
  onDragEnd?: (position: { x: number; y: number }) => void;
  bounds?: { left?: number; right?: number; top?: number; bottom?: number };
  snapToGrid?: boolean;
  gridSize?: number;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({
  children,
  onDragEnd,
  bounds,
  snapToGrid = false,
  gridSize = 50,
}) => {
  const handleDragEnd = (_: any, info: PanInfo) => {
    let finalX = info.point.x;
    let finalY = info.point.y;

    if (snapToGrid) {
      finalX = Math.round(finalX / gridSize) * gridSize;
      finalY = Math.round(finalY / gridSize) * gridSize;
    }

    if (onDragEnd) {
      onDragEnd({ x: finalX, y: finalY });
    }
  };

  return (
    <motion.div
      drag
      dragConstraints={bounds}
      dragElastic={0.1}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
      style={{ cursor: 'grab' }}
    >
      {children}
    </motion.div>
  );
};

// ----------------------------------------------------------------------------
// PinchZoom - Pinch-to-zoom gesture for images/content
// ----------------------------------------------------------------------------
interface PinchZoomProps {
  children: React.ReactNode;
  minZoom?: number;
  maxZoom?: number;
}

export const PinchZoom: React.FC<PinchZoomProps> = ({
  children,
  minZoom = 0.5,
  maxZoom = 3,
}) => {
  const [scale, setScale] = useState(1);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newScale = Math.min(Math.max(scale + delta, minZoom), maxZoom);
    setScale(newScale);
  };

  return (
    <motion.div
      onWheel={handleWheel}
      animate={{ scale }}
      style={{
        touchAction: 'none',
        overflow: 'hidden',
      }}
    >
      {children}
    </motion.div>
  );
};

// ----------------------------------------------------------------------------
// SwipeSlider - Horizontal swipe slider/carousel
// ----------------------------------------------------------------------------
interface SwipeSliderProps {
  items: React.ReactNode[];
  onSlideChange?: (index: number) => void;
}

export const SwipeSlider: React.FC<SwipeSliderProps> = ({
  items,
  onSlideChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const x = useMotionValue(0);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 50;
    const velocity = info.velocity.x;

    if (velocity < -threshold && currentIndex < items.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      if (onSlideChange) onSlideChange(newIndex);
    } else if (velocity > threshold && currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      if (onSlideChange) onSlideChange(newIndex);
    }
  };

  return (
    <div style={{ overflow: 'hidden', width: '100%' }}>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={{ x: -currentIndex * 100 + '%' }}
        style={{ display: 'flex', x }}
      >
        {items.map((item, index) => (
          <div key={index} style={{ minWidth: '100%' }}>
            {item}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// TouchRipple - Material Design ripple effect on touch/click
// ----------------------------------------------------------------------------
interface TouchRippleProps {
  children: React.ReactNode;
  color?: string;
  duration?: number;
}

export const TouchRipple: React.FC<TouchRippleProps> = ({
  children,
  color = 'rgba(255, 255, 255, 0.6)',
  duration = 0.6,
}) => {
  const [ripples, setRipples] = useState<
    Array<{ x: number; y: number; id: number }>
  >([]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, duration * 1000);
  };

  return (
    <div
      onClick={handleClick}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {children}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration }}
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: color,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  );
};

// ----------------------------------------------------------------------------
// LongPressButton - Long press gesture detection
// ----------------------------------------------------------------------------
interface LongPressButtonProps {
  children: React.ReactNode;
  onLongPress: () => void;
  duration?: number;
  onClick?: () => void;
}

export const LongPressButton: React.FC<LongPressButtonProps> = ({
  children,
  onLongPress,
  duration = 500,
  onClick,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePressStart = () => {
    setIsPressed(true);
    timerRef.current = setTimeout(() => {
      onLongPress();
      setIsPressed(false);
    }, duration);
  };

  const handlePressEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressed(false);
  };

  return (
    <motion.div
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      animate={{ scale: isPressed ? 0.98 : 1 }}
    >
      {children}
    </motion.div>
  );
};

// ----------------------------------------------------------------------------
// PullToRefresh - Pull-to-refresh gesture (mobile)
// ----------------------------------------------------------------------------
interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = 80,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, threshold], [0, 1]);

  const handleDragEnd = async (_: any, info: PanInfo) => {
    if (info.offset.y > threshold) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <motion.div
        style={{
          position: 'absolute',
          top: -50,
          left: 0,
          right: 0,
          height: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
        }}
      >
        {isRefreshing ? '🔄 Refreshing...' : '⬇️ Pull to refresh'}
      </motion.div>
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        onDragEnd={handleDragEnd}
        style={{ y }}
      >
        {children}
      </motion.div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// useGesture - Custom hook for gesture detection
// ----------------------------------------------------------------------------
interface GestureState {
  isDragging: boolean;
  isPinching: boolean;
  isSwiping: boolean;
  swipeDirection: 'left' | 'right' | 'up' | 'down' | null;
}

export const useGesture = () => {
  const [gestureState, setGestureState] = useState<GestureState>({
    isDragging: false,
    isPinching: false,
    isSwiping: false,
    swipeDirection: null,
  });

  const handleDragStart = () => {
    setGestureState((prev) => ({ ...prev, isDragging: true }));
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    let direction: 'left' | 'right' | 'up' | 'down' | null = null;

    if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
      direction = velocity.x > 0 ? 'right' : 'left';
    } else {
      direction = velocity.y > 0 ? 'down' : 'up';
    }

    setGestureState({
      isDragging: false,
      isPinching: false,
      isSwiping: Math.abs(offset.x) > 50 || Math.abs(offset.y) > 50,
      swipeDirection: direction,
    });

    setTimeout(() => {
      setGestureState((prev) => ({
        ...prev,
        isSwiping: false,
        swipeDirection: null,
      }));
    }, 300);
  };

  return {
    gestureState,
    handlers: {
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
    },
  };
};
