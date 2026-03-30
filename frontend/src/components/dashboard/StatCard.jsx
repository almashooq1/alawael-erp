/**
 * 📊 StatCard v3 — Enhanced Professional KPI Card
 * بطاقة إحصائية محسّنة مع عداد متحرك وتنقل سريع
 */

import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, useTheme, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PeopleIcon from '@mui/icons-material/People';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import BadgeIcon from '@mui/icons-material/Badge';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import DescriptionIcon from '@mui/icons-material/Description';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { formatNumber } from 'services/dashboardService';
import { gradients as paletteGradients, statusColors } from 'theme/palette';

const ICON_MAP = {
  People: PeopleIcon,
  Accessibility: AccessibilityNewIcon,
  Badge: BadgeIcon,
  EventNote: EventNoteIcon,
  AccountBalance: AccountBalanceWalletIcon,
  Description: DescriptionIcon,
  HowToReg: HowToRegIcon,
  Receipt: ReceiptLongIcon,
};

const GRADIENTS = [
  paletteGradients.primary,
  paletteGradients.success,
  paletteGradients.info,
  paletteGradients.warning,
  paletteGradients.ocean,
  paletteGradients.orange,
  paletteGradients.accent,
  paletteGradients.fire,
];

// Navigation paths for each KPI card type
const NAV_PATHS = {
  People: '/admin-portal/users',
  Accessibility: '/beneficiaries',
  Badge: '/hr',
  EventNote: '/sessions',
  AccountBalance: '/finance',
  Description: '/documents',
  HowToReg: '/hr/attendance',
  Receipt: '/finance/invoices',
};

/* ── Animated Counter Hook ─────────────────────────────── */
const useAnimatedCounter = (endValue, duration = 1200) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const hasAnimated = useRef(false);
  const prevValue = useRef(endValue);

  // Reset animation when endValue changes
  useEffect(() => {
    if (prevValue.current !== endValue) {
      hasAnimated.current = false;
      prevValue.current = endValue;
    }
  }, [endValue]);

  useEffect(() => {
    if (hasAnimated.current || !endValue) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = Date.now();
          const step = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutExpo
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            setCount(Math.floor(eased * endValue));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [endValue, duration]);

  return { count, ref };
};

const StatCard = ({ title, value, subtitle, icon, index = 0, trend, onClick }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const IconComponent = ICON_MAP[icon] || PeopleIcon;
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const navPath = NAV_PATHS[icon];
  const { count, ref } = useAnimatedCounter(value);
  const isZero = value === 0 || value === '0';

  const handleClick = () => {
    if (onClick) return onClick();
    if (navPath) navigate(navPath);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -6, scale: 1.02 }}
      style={{ cursor: 'pointer' }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${title}: ${formatNumber(value)}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
    >
      <Tooltip title={navPath ? `فتح ${title}` : ''} arrow placement="top">
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 4,
            p: 2.5,
            minHeight: 140,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.05)'
              : '#fff',
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.06)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            // Muted styling when value is zero
            ...(isZero && { opacity: 0.6, filter: 'grayscale(0.3)' }),
            '&:hover': {
              boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
              borderColor: 'transparent',
              // Restore full appearance on hover even if zero
              ...(isZero && { opacity: 0.85, filter: 'grayscale(0)' }),
              '& .stat-nav-icon': {
                opacity: 1,
                transform: 'translateX(0)',
              },
            },
          }}
        >
          {/* Gradient accent bar */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              left: 0,
              height: 4,
              background: gradient,
            }}
          />

          {/* Navigation hint icon */}
          {navPath && (
            <Box
              className="stat-nav-icon"
              sx={{
                position: 'absolute',
                top: 14,
                left: 14,
                opacity: 0,
                transform: 'translateX(-5px)',
                transition: 'all 0.3s ease',
                color: 'text.disabled',
              }}
            >
              <OpenInNewIcon sx={{ fontSize: 16 }} />
            </Box>
          )}

          {/* Icon badge */}
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              width: 48,
              height: 48,
              borderRadius: 3,
              background: gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            }}
          >
            <IconComponent sx={{ color: '#fff', fontSize: 26 }} />
          </Box>

          {/* Value & title */}
          <Box sx={{ textAlign: 'right', mt: 1 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                background: gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.2,
              }}
            >
              {formatNumber(count)}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                mt: 0.5,
                fontSize: '0.875rem',
              }}
            >
              {title}
            </Typography>
          </Box>

          {/* Subtitle & trend */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
            {subtitle && (
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>
                {subtitle}
              </Typography>
            )}
            {trend !== undefined && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.3,
                  px: 0.8,
                  py: 0.2,
                  borderRadius: 1,
                  background: trend >= 0 ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)',
                  color: trend >= 0 ? statusColors.success : statusColors.error,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {trend >= 0 ? <TrendingUpIcon sx={{ fontSize: 16 }} /> : <TrendingDownIcon sx={{ fontSize: 16 }} />}
                {Math.abs(trend)}%
              </Box>
            )}
          </Box>

          {/* Decorative circle */}
          <Box
            sx={{
              position: 'absolute',
              bottom: -20,
              left: -20,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: gradient,
              opacity: 0.06,
            }}
          />
        </Paper>
      </Tooltip>
    </motion.div>
  );
};

export default React.memo(StatCard);
