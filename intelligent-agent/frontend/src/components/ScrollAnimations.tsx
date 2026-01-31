import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';

// ============================================================================
// SCROLL-TRIGGERED ANIMATIONS
// IntersectionObserver-based animations that trigger when elements scroll into view
// ============================================================================

// ----------------------------------------------------------------------------
// FadeInOnScroll - Fade in element when it enters viewport
// ----------------------------------------------------------------------------
interface FadeInOnScrollProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  threshold?: number;
  once?: boolean;
}

export const FadeInOnScroll: React.FC<FadeInOnScrollProps> = ({
  children,
  delay = 0,
  duration = 0.6,
  direction = 'up',
  threshold = 0.1,
  once = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: threshold });

  const directionOffset = {
    up: { y: 40 },
    down: { y: -40 },
    left: { x: 40 },
    right: { x: -40 },
    none: {},
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...directionOffset[direction] }}
      animate={
        isInView
          ? { opacity: 1, x: 0, y: 0 }
          : { opacity: 0, ...directionOffset[direction] }
      }
      transition={{ duration, delay }}
    >
      {children}
    </motion.div>
  );
};

// ----------------------------------------------------------------------------
// ParallaxScroll - Parallax effect based on scroll position
// ----------------------------------------------------------------------------
interface ParallaxScrollProps {
  children: React.ReactNode;
  speed?: number; // Multiplier for parallax effect (0.5 = half speed, 2 = double speed)
  direction?: 'vertical' | 'horizontal';
}

export const ParallaxScroll: React.FC<ParallaxScrollProps> = ({
  children,
  speed = 0.5,
  direction = 'vertical',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', `${speed * 100}%`]);
  const x = useTransform(scrollYProgress, [0, 1], ['0%', `${speed * 100}%`]);

  return (
    <motion.div
      ref={ref}
      style={direction === 'vertical' ? { y } : { x }}
    >
      {children}
    </motion.div>
  );
};

// ----------------------------------------------------------------------------
// ScrollProgressBar - Visual progress indicator based on scroll position
// ----------------------------------------------------------------------------
interface ScrollProgressBarProps {
  height?: number;
  color?: string;
  backgroundColor?: string;
  position?: 'top' | 'bottom';
}

export const ScrollProgressBar: React.FC<ScrollProgressBarProps> = ({
  height = 4,
  color = '#3b82f6',
  backgroundColor = '#e5e7eb',
  position = 'top',
}) => {
  const { scrollYProgress } = useScroll();

  return (
    <div
      style={{
        position: 'fixed',
        [position]: 0,
        left: 0,
        right: 0,
        height: `${height}px`,
        backgroundColor,
        zIndex: 9999,
      }}
    >
      <motion.div
        style={{
          height: '100%',
          backgroundColor: color,
          scaleX: scrollYProgress,
          transformOrigin: 'left',
        }}
      />
    </div>
  );
};

// ----------------------------------------------------------------------------
// RevealOnScroll - Reveal content with various effects
// ----------------------------------------------------------------------------
interface RevealOnScrollProps {
  children: React.ReactNode;
  effect?: 'fade' | 'slide' | 'zoom' | 'flip' | 'blur';
  duration?: number;
  delay?: number;
  threshold?: number;
  once?: boolean;
}

export const RevealOnScroll: React.FC<RevealOnScrollProps> = ({
  children,
  effect = 'fade',
  duration = 0.8,
  delay = 0,
  threshold = 0.2,
  once = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: threshold });

  const variants = {
    fade: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
    slide: {
      hidden: { opacity: 0, x: -50 },
      visible: { opacity: 1, x: 0 },
    },
    zoom: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: { opacity: 1, scale: 1 },
    },
    flip: {
      hidden: { opacity: 0, rotateY: 90 },
      visible: { opacity: 1, rotateY: 0 },
    },
    blur: {
      hidden: { opacity: 0, filter: 'blur(10px)' },
      visible: { opacity: 1, filter: 'blur(0px)' },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants[effect]}
      transition={{ duration, delay }}
    >
      {children}
    </motion.div>
  );
};

// ----------------------------------------------------------------------------
// CountUpOnScroll - Animated number counter when scrolled into view
// ----------------------------------------------------------------------------
interface CountUpOnScrollProps {
  end: number;
  start?: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  threshold?: number;
  once?: boolean;
}

export const CountUpOnScroll: React.FC<CountUpOnScrollProps> = ({
  end,
  start = 0,
  duration = 2,
  suffix = '',
  prefix = '',
  threshold = 0.5,
  once = true,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once, amount: threshold });
  const [count, setCount] = useState(start);

  useEffect(() => {
    if (!isInView) return;

    const steps = 60;
    const increment = (end - start) / steps;
    const stepDuration = (duration * 1000) / steps;
    let current = start;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;

      if (step >= steps) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.round(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [isInView, start, end, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {count}
      {suffix}
    </span>
  );
};

// ----------------------------------------------------------------------------
// StickyScrollSection - Section that sticks while scrolling
// ----------------------------------------------------------------------------
interface StickyScrollSectionProps {
  children: React.ReactNode;
  topOffset?: number;
  bottomOffset?: number;
}

export const StickyScrollSection: React.FC<StickyScrollSectionProps> = ({
  children,
  topOffset = 0,
  bottomOffset = 0,
}) => {
  return (
    <div
      style={{
        position: 'sticky',
        top: `${topOffset}px`,
        bottom: `${bottomOffset}px`,
      }}
    >
      {children}
    </div>
  );
};

// ----------------------------------------------------------------------------
// ScrollSnapSection - Snap-to-section scrolling
// ----------------------------------------------------------------------------
interface ScrollSnapSectionProps {
  children: React.ReactNode;
  snapAlign?: 'start' | 'center' | 'end';
}

export const ScrollSnapSection: React.FC<ScrollSnapSectionProps> = ({
  children,
  snapAlign = 'start',
}) => {
  return (
    <div
      style={{
        scrollSnapAlign: snapAlign,
        scrollSnapStop: 'always',
      }}
    >
      {children}
    </div>
  );
};

// ----------------------------------------------------------------------------
// useScrollTrigger - Custom hook for scroll-based triggers
// ----------------------------------------------------------------------------
interface ScrollTriggerOptions {
  threshold?: number;
  once?: boolean;
  rootMargin?: string;
}

export const useScrollTrigger = (
  ref: React.RefObject<HTMLElement>,
  options: ScrollTriggerOptions = {}
) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);

        if (visible && !hasTriggered) {
          setHasTriggered(true);
        }
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '0px',
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, options.threshold, options.rootMargin, hasTriggered]);

  return options.once ? hasTriggered : isVisible;
};

// ----------------------------------------------------------------------------
// ScrollRevealContainer - Container for multiple scroll-reveal items
// ----------------------------------------------------------------------------
interface ScrollRevealContainerProps {
  children: React.ReactNode;
  staggerDelay?: number;
  effect?: 'fade' | 'slide' | 'zoom';
}

export const ScrollRevealContainer: React.FC<ScrollRevealContainerProps> = ({
  children,
  staggerDelay = 0.1,
  effect = 'fade',
}) => {
  const childrenArray = React.Children.toArray(children);

  return (
    <>
      {childrenArray.map((child, index) => (
        <RevealOnScroll
          key={index}
          effect={effect}
          delay={index * staggerDelay}
        >
          {child}
        </RevealOnScroll>
      ))}
    </>
  );
};
