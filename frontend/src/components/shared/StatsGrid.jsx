/**
 * StatsGrid — شبكة الإحصائيات (Phase 2)
 *
 * Displays a grid of stat cards with icons, values, trends.
 *
 * Phase 2 additions:
 * - Dark mode support
 * - Loading skeleton state
 * - Animated entrance
 * - Compact variant
 * - Better responsive breakpoints
 * - Accessibility improvements
 *
 * @param {Array}  stats      — [{label, value, sub?, icon?, gradient?, color?, trend?, path?, onClick?}]
 * @param {number} [columns]  — Grid columns per stat (default auto-calculated)
 * @param {boolean} [loading] — Show skeleton placeholders
 * @param {string} [variant]  — 'default' | 'compact' | 'outlined'
 * @param {boolean} [animated] — Enable entrance animation
 * @param {object} [sx]       — Extra sx styles
 */

import { memo } from 'react';
import {
  Box, Card, CardContent, Typography, Avatar, Grid, Skeleton,
  alpha, useTheme,
} from '@mui/material';
import {
  TrendingUp as UpIcon,
  TrendingDown as DownIcon,
  TrendingFlat as FlatIcon,
} from '@mui/icons-material';

// ─── Loading skeleton card ────────────────────────────────────────────────────
function StatSkeleton({ compact }) {
  return (
    <Card sx={{ height: '100%', borderRadius: 2 }}>
      <CardContent sx={{ p: compact ? '10px !important' : '14px !important', textAlign: 'center' }}>
        <Skeleton variant="circular" width={compact ? 32 : 40} height={compact ? 32 : 40} sx={{ mx: 'auto', mb: 1 }} />
        <Skeleton variant="text" width="50%" sx={{ mx: 'auto' }} height={compact ? 28 : 36} />
        <Skeleton variant="text" width="70%" sx={{ mx: 'auto' }} height={16} />
      </CardContent>
    </Card>
  );
}

// ─── Trend indicator ──────────────────────────────────────────────────────────
function TrendIndicator({ trend, gradient }) {
  if (trend === undefined || trend === null) return null;

  const getColors = () => {
    if (gradient) {
      return {
        icon: trend > 0 ? 'rgba(255,255,255,0.9)' : trend < 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
        text: 'rgba(255,255,255,0.9)',
      };
    }
    return {
      icon: trend > 0 ? '#10B981' : trend < 0 ? '#F43F5E' : '#94A3B8',
      text: trend > 0 ? '#10B981' : trend < 0 ? '#F43F5E' : '#94A3B8',
    };
  };

  const colors = getColors();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.5, gap: 0.3 }}>
      {trend > 0 && <UpIcon sx={{ fontSize: 14, color: colors.icon }} />}
      {trend < 0 && <DownIcon sx={{ fontSize: 14, color: colors.icon }} />}
      {trend === 0 && <FlatIcon sx={{ fontSize: 14, color: colors.icon }} />}
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.65rem',
          fontWeight: 600,
          color: colors.text,
        }}
      >
        {trend > 0 ? '+' : ''}{trend}%
      </Typography>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const StatsGrid = memo(function StatsGrid({
  stats = [],
  columns,
  loading = false,
  variant = 'default',   // default | compact | outlined
  animated = true,
  sx = {},
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isCompact = variant === 'compact';
  const isOutlined = variant === 'outlined';

  const getGridSize = () => {
    const len = stats.length;
    if (columns) return columns;
    if (len <= 4) return 3;
    if (len <= 6) return 2;
    if (len <= 8) return 1.5;
    return 1.5;
  };

  const gridSize = getGridSize();

  // Loading state
  if (loading) {
    return (
      <Grid container spacing={isCompact ? 1.5 : 2} sx={sx}>
        {Array.from({ length: stats.length || 4 }).map((_, i) => (
          <Grid item xs={6} sm={4} md={gridSize} key={i}>
            <StatSkeleton compact={isCompact} />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={isCompact ? 1.5 : 2} sx={sx}>
      {stats.map((stat, i) => {
        const defaultColor = theme.palette.primary.main;
        const statColor = stat.color || defaultColor;

        return (
          <Grid item xs={6} sm={4} md={gridSize} key={stat.label || i}>
            <Card
              role={stat.onClick || stat.path ? 'button' : undefined}
              tabIndex={stat.onClick || stat.path ? 0 : undefined}
              aria-label={`${stat.label}: ${stat.value}`}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && stat.onClick) {
                  e.preventDefault();
                  stat.onClick();
                }
              }}
              sx={{
                height: '100%',
                background: stat.gradient || undefined,
                backgroundColor: !stat.gradient
                  ? (isOutlined
                    ? 'transparent'
                    : (isDark
                      ? alpha(statColor, 0.08)
                      : alpha(statColor, 0.04)))
                  : undefined,
                color: stat.gradient ? 'white' : 'inherit',
                borderRadius: 2,
                boxShadow: stat.gradient ? 3 : (isOutlined ? 0 : 1),
                cursor: stat.onClick || stat.path ? 'pointer' : 'default',
                transition: 'all .25s ease',
                border: isOutlined
                  ? `1.5px solid ${alpha(statColor, isDark ? 0.25 : 0.2)}`
                  : (!stat.gradient ? `1px solid ${alpha(statColor, isDark ? 0.15 : 0.12)}` : 'none'),
                '&:hover': (stat.onClick || stat.path) ? {
                  transform: 'translateY(-3px)',
                  boxShadow: isDark
                    ? `0 8px 24px rgba(0,0,0,0.4)`
                    : `0 8px 24px ${alpha(statColor, 0.18)}`,
                  borderColor: alpha(statColor, 0.35),
                } : {},
                '&:focus-visible': {
                  outline: `2px solid ${statColor}`,
                  outlineOffset: 2,
                },
                // Phase 2: staggered entrance animation
                ...(animated && {
                  animation: `statCardIn 0.4s ease-out ${i * 0.06}s both`,
                  '@keyframes statCardIn': {
                    from: { opacity: 0, transform: 'translateY(12px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                  },
                }),
              }}
              onClick={stat.onClick}
            >
              <CardContent sx={{ p: isCompact ? '10px !important' : '14px !important', textAlign: 'center' }}>
                {stat.icon && (
                  <Avatar
                    sx={{
                      width: isCompact ? 32 : 40,
                      height: isCompact ? 32 : 40,
                      mx: 'auto',
                      mb: isCompact ? 0.5 : 1,
                      background: stat.gradient
                        ? 'rgba(255,255,255,0.2)'
                        : (isDark ? alpha(statColor, 0.15) : alpha(statColor, 0.1)),
                      color: stat.gradient ? 'white' : statColor,
                      '& svg': { fontSize: isCompact ? 16 : 20 },
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                )}
                <Typography
                  variant={isCompact ? 'h6' : 'h5'}
                  sx={{
                    fontWeight: 'bold',
                    lineHeight: 1.1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    opacity: stat.gradient ? 0.85 : 0.7,
                    display: 'block',
                    mt: 0.3,
                    fontSize: isCompact ? '0.65rem' : '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {stat.label}
                </Typography>
                {stat.sub && (
                  <Typography
                    variant="caption"
                    sx={{
                      opacity: stat.gradient ? 0.6 : 0.5,
                      fontSize: '0.65rem',
                      display: 'block',
                    }}
                  >
                    {stat.sub}
                  </Typography>
                )}
                <TrendIndicator trend={stat.trend} gradient={stat.gradient} />
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
});

export default StatsGrid;
