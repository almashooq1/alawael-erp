import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  variant?: 'fadeIn' | 'slideUp' | 'scaleIn';
  duration?: number;
  style?: React.CSSProperties;
}

const animationVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  slideUp: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
  },
  scaleIn: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
  },
};

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  delay = 0,
  variant = 'fadeIn',
  duration = 0.5,
  style = {},
}) => {
  const { theme } = useTheme();
  const variants = animationVariants[variant];

  return (
    <motion.div
      initial={variants.initial}
      animate={variants.animate}
      transition={{ duration, delay }}
      whileHover={{ y: -4, boxShadow: theme.shadows.md }}
      style={{
        borderRadius: '12px',
        backgroundColor: theme.colors.surface.primary,
        padding: '16px',
        border: `1px solid ${theme.colors.border.main}`,
        transition: 'all 0.3s ease',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard;
