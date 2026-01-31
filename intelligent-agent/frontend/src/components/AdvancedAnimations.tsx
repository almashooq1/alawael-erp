import React from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

interface LoadingSkeletonProps {
  height?: number;
  width?: string;
  count?: number;
  style?: React.CSSProperties;
}

/**
 * Loading skeleton component with pulse animation
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  height = 20,
  width = '100%',
  count = 1,
  style = {},
}) => {
  const { theme } = useTheme();

  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          style={{
            height,
            width,
            borderRadius: '8px',
            marginBottom: i < count - 1 ? '12px' : 0,
            backgroundColor: theme.colors.surface.secondary,
            ...style,
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  animation?: 'shake' | 'bounce' | 'pulse';
  style?: React.CSSProperties;
}

/**
 * Error state component with animations
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onRetry,
  animation = 'shake',
  style = {},
}) => {
  const { theme } = useTheme();

  const animationVariants = {
    shake: {
      x: [0, -5, 5, -5, 0],
      transition: { duration: 0.4 },
    },
    bounce: {
      y: [0, -8, 0],
      transition: { duration: 0.4 },
    },
    pulse: {
      scale: [1, 1.05, 1],
      transition: { duration: 0.4 },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      whileHover={animationVariants[animation]}
      style={{
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: theme.colors.error.light,
        border: `1px solid ${theme.colors.error.main}`,
        ...style,
      }}
    >
      <div style={{ color: theme.colors.error.main, marginBottom: '12px', fontWeight: 'bold' }}>
        ⚠️ {message}
      </div>
      {onRetry && (
        <motion.button
          onClick={onRetry}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '8px 16px',
            backgroundColor: theme.colors.error.main,
            color: theme.colors.error.contrast,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          🔄 Retry
        </motion.button>
      )}
    </motion.div>
  );
};

interface PageTransitionProps {
  children: React.ReactNode;
  type?: 'fade' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight';
  duration?: number;
}

/**
 * Page transition wrapper for route changes
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  type = 'fade',
  duration = 0.3,
}) => {
  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slideUp: {
      initial: { y: 20, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: -20, opacity: 0 },
    },
    slideDown: {
      initial: { y: -20, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: 20, opacity: 0 },
    },
    slideLeft: {
      initial: { x: 20, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: -20, opacity: 0 },
    },
    slideRight: {
      initial: { x: -20, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: 20, opacity: 0 },
    },
  };

  const variant = variants[type];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={variant.initial}
        animate={variant.animate}
        exit={variant.exit}
        transition={{ duration }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

interface ProgressIndicatorProps {
  progress: number; // 0-100
  height?: number;
  animated?: boolean;
}

/**
 * Animated progress bar
 */
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  height = 4,
  animated = true,
}) => {
  const { theme } = useTheme();

  return (
    <motion.div
      style={{
        height,
        backgroundColor: theme.colors.surface.secondary,
        borderRadius: '4px',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <motion.div
        initial={false}
        animate={{ width: `${progress}%` }}
        transition={{ duration: animated ? 0.5 : 0, ease: 'easeInOut' }}
        style={{
          height: '100%',
          background: `linear-gradient(to right, ${theme.colors.primary[600]}, ${theme.colors.primary[400]})`,
        }}
      />
    </motion.div>
  );
};

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

/**
 * Toast notification with animation
 */
export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}) => {
  const { theme } = useTheme();

  const colors = {
    success: { bg: theme.colors.success.light, border: theme.colors.success.main },
    error: { bg: theme.colors.error.light, border: theme.colors.error.main },
    warning: { bg: theme.colors.warning.light, border: theme.colors.warning.main },
    info: { bg: theme.colors.info.light, border: theme.colors.info.main },
  };

  const color = colors[type];

  React.useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeIcons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        padding: '12px 16px',
        borderRadius: '8px',
        backgroundColor: color.bg,
        border: `1px solid ${color.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '300px',
        fontSize: '14px',
      }}
    >
      <span>{typeIcons[type]}</span>
      <span>{message}</span>
      <motion.button
        onClick={onClose}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          marginLeft: 'auto',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
        }}
      >
        ✕
      </motion.button>
    </motion.div>
  );
};

interface StaggerContainerProps {
  children: React.ReactNode;
  delay?: number;
}

/**
 * Container that staggered animates its children
 */
export const StaggerContainer: React.FC<StaggerContainerProps> = ({ children, delay = 0.1 }) => {
  return (
    <LayoutGroup>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: delay,
            },
          },
        }}
      >
        {React.Children.map(children, (child) => (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 10 },
              show: { opacity: 1, y: 0 },
            }}
          >
            {child}
          </motion.div>
        ))}
      </motion.div>
    </LayoutGroup>
  );
};

export default {
  LoadingSkeleton,
  ErrorState,
  PageTransition,
  ProgressIndicator,
  Toast,
  StaggerContainer,
};
