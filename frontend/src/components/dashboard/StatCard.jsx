/**
 * 📊 StatCard v4 — Premium KPI Card
 * بطاقة إحصائية بريميوم مع عداد متحرك وتصميم محسّن
 */

import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import PeopleIcon from '@mui/icons-material/People';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import BadgeIcon from '@mui/icons-material/Badge';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import DescriptionIcon from '@mui/icons-material/Description';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { formatNumber } from 'services/dashboardService';
import { gradients as paletteGradients } from 'theme/palette';

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

// Color sets per card (gradient + icon bg + glow)
const CARD_COLORS = [
  { gradient: paletteGradients.primary,  glow: 'rgba(99,102,241,0.25)',  light: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)'  },
  { gradient: paletteGradients.success,  glow: 'rgba(16,185,129,0.25)',  light: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)'  },
  { gradient: paletteGradients.info,     glow: 'rgba(14,165,233,0.25)',  light: 'rgba(14,165,233,0.08)',  border: 'rgba(14,165,233,0.2)'  },
  { gradient: paletteGradients.warning,  glow: 'rgba(245,158,11,0.25)',  light: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)'  },
  { gradient: paletteGradients.ocean,    glow: 'rgba(14,165,233,0.25)',  light: 'rgba(14,165,233,0.08)',  border: 'rgba(14,165,233,0.2)'  },
  { gradient: paletteGradients.orange,   glow: 'rgba(249,115,22,0.25)',  light: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)'  },
  { gradient: paletteGradients.accent,   glow: 'rgba(245,158,11,0.25)',  light: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)'  },
  { gradient: paletteGradients.fire,     glow: 'rgba(239,68,68,0.25)',   light: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'   },
];

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

/* ── Animated Counter ──────────────────────────────────── */
const useAnimatedCounter = (endValue, duration = 1300) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const hasAnimated = useRef(false);
  const prevValue = useRef(endValue);

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

// ─────────────────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, subtitle, icon, index = 0, trend, onClick }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isDark = theme.palette.mode === 'dark';
  const IconComponent = ICON_MAP[icon] || PeopleIcon;
  const colors = CARD_COLORS[index % CARD_COLORS.length];
  const navPath = NAV_PATHS[icon];
  const { count, ref } = useAnimatedCounter(value);
  const isZero = value === 0 || value === '0';

  const handleClick = () => {
    if (onClick) return onClick();
    if (navPath) navigate(navPath);
  };

  const isPositive = trend >= 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.07, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{ cursor: 'pointer' }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${title}: ${formatNumber(value)}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
    >
      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '18px',
          p: 0,
          minHeight: 152,
          display: 'flex',
          flexDirection: 'column',
          background: isDark
            ? 'rgba(15,23,42,0.8)'
            : '#FFFFFF',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : colors.border}`,
          boxShadow: isDark
            ? '0 2px 8px rgba(0,0,0,0.4)'
            : `0 2px 12px ${colors.glow.replace('0.25', '0.08')}, 0 1px 3px rgba(0,0,0,0.04)`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: isZero ? 0.65 : 1,
          '&:hover': {
            border: `1px solid ${colors.border}`,
            boxShadow: isDark
              ? `0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px ${colors.border}`
              : `0 16px 40px ${colors.glow}, 0 4px 8px rgba(0,0,0,0.04)`,
            opacity: 1,
            '& .stat-arrow': { opacity: 1, transform: 'translateX(-3px)' },
            '& .stat-icon-wrap': { transform: 'scale(1.08)' },
          },
        }}
      >
        {/* Top gradient bar */}
        <Box sx={{ height: 3, background: colors.gradient, flexShrink: 0 }} />

        {/* Main content */}
        <Box sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Top row: icon + trend */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
            {/* Icon */}
            <Box
              className="stat-icon-wrap"
              sx={{
                width: 48,
                height: 48,
                borderRadius: '14px',
                background: colors.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 6px 20px ${colors.glow}`,
                transition: 'transform 0.25s ease',
                border: '1px solid rgba(255,255,255,0.1)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: '45%',
                  background: 'rgba(255,255,255,0.14)',
                  borderRadius: '14px 14px 0 0',
                },
              }}
            >
              <IconComponent sx={{ color: '#FFFFFF', fontSize: 24, position: 'relative', zIndex: 1 }} />
            </Box>

            {/* Trend badge */}
            {trend !== undefined && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.4,
                  px: 1,
                  py: 0.4,
                  borderRadius: '8px',
                  background: isPositive
                    ? 'rgba(16,185,129,0.1)'
                    : 'rgba(244,63,94,0.1)',
                  border: `1px solid ${isPositive ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
                  color: isPositive ? '#10B981' : '#F43F5E',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}
              >
                {isPositive
                  ? <TrendingUpIcon sx={{ fontSize: 14 }} />
                  : <TrendingDownIcon sx={{ fontSize: 14 }} />
                }
                {Math.abs(trend)}%
              </Box>
            )}
          </Box>

          {/* Value */}
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: 'clamp(1.6rem, 4vw, 2.1rem)',
                lineHeight: 1.1,
                background: colors.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
                mb: 0.5,
              }}
            >
              {formatNumber(count)}
            </Typography>
            <Typography
              sx={{
                color: isDark ? 'rgba(255,255,255,0.65)' : '#64748B',
                fontWeight: 600,
                fontSize: '0.875rem',
                lineHeight: 1.3,
              }}
            >
              {title}
            </Typography>
          </Box>

          {/* Subtitle + arrow */}
          {(subtitle || navPath) && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.25 }}>
              {subtitle && (
                <Typography
                  variant="caption"
                  sx={{
                    color: isDark ? 'rgba(255,255,255,0.3)' : '#94A3B8',
                    fontSize: '0.72rem',
                    fontWeight: 500,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
              {navPath && (
                <ArrowForwardIosIcon
                  className="stat-arrow"
                  sx={{
                    fontSize: 11,
                    color: isDark ? 'rgba(255,255,255,0.2)' : '#CBD5E1',
                    opacity: 0,
                    transition: 'all 0.25s ease',
                    ml: 'auto',
                  }}
                />
              )}
            </Box>
          )}
        </Box>

        {/* Background orb decoration */}
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: colors.gradient,
            opacity: isDark ? 0.06 : 0.05,
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 70,
            height: 70,
            borderRadius: '50%',
            background: colors.gradient,
            opacity: isDark ? 0.04 : 0.03,
            pointerEvents: 'none',
          }}
        />
      </Paper>
    </motion.div>
  );
};

export default React.memo(StatCard);
