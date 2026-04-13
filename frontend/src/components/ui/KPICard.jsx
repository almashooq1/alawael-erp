/**
 * KPICard — بطاقة مؤشر الأداء الرئيسي (Phase 2)
 *
 * Premium metric card with:
 * - Large value display with animated counter
 * - Trend indicator (+/- percentage)
 * - Sparkline mini chart
 * - Gradient icon with glow effect
 * - Loading skeleton
 * - Click-through navigation
 * - Phase 2: comparison mode, target progress, pulse animation, responsive sizes
 */

import { memo, useEffect, useRef, useState } from 'react';
import {
  Box, Card, Typography, Skeleton, Tooltip,
  LinearProgress, useTheme, alpha,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  ArrowForwardIos,
  FlagOutlined,
} from '@mui/icons-material';

// ─── Animated number counter ──────────────────────────────────────────────────
function useAnimatedValue(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (typeof target !== 'number') return;
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => frameRef.current && cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}

// ─── Mini sparkline chart ─────────────────────────────────────────────────────
function Sparkline({ data = [], color, height = 36, width = 80 }) {
  if (!data?.length) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = width;
  const H = height;
  const step = W / (data.length - 1);

  const points = data.map((v, i) => [
    i * step,
    H - ((v - min) / range) * H * 0.8 - H * 0.1,
  ]);

  const polyline = points.map((p) => p.join(',')).join(' ');
  const area = `M${points[0][0]},${H} ${points.map((p) => `L${p[0]},${p[1]}`).join(' ')} L${W},${H} Z`;

  // Unique gradient ID based on color
  const gradId = `sg_${color?.replace(/[^a-zA-Z0-9]/g, '') || 'def'}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r="3"
        fill={color}
      />
    </svg>
  );
}

// ─── Trend badge ──────────────────────────────────────────────────────────────
function TrendBadge({ value, suffix = '%', label }) {
  if (value === undefined || value === null) return null;
  const isPos = value > 0;
  const isFlat = value === 0;
  const clr = isFlat ? '#94A3B8' : isPos ? '#10B981' : '#F43F5E';
  const bg  = isFlat ? 'rgba(148,163,184,0.12)' : isPos ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)';
  const border = isFlat ? 'rgba(148,163,184,0.2)' : isPos ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)';

  return (
    <Tooltip title={label || ''}>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, px: 0.75, py: 0.3, borderRadius: '100px', backgroundColor: bg, border: `1px solid ${border}`, color: clr }}>
        {isFlat ? <TrendingFlat sx={{ fontSize: 12 }} /> : isPos ? <TrendingUp sx={{ fontSize: 12 }} /> : <TrendingDown sx={{ fontSize: 12 }} />}
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, lineHeight: 1, color: 'inherit' }}>
          {isPos ? '+' : ''}{value}{suffix}
        </Typography>
      </Box>
    </Tooltip>
  );
}

// ─── Target progress bar ──────────────────────────────────────────────────────
function TargetProgress({ current, target, color, label }) {
  if (!target || target <= 0) return null;
  const pct = Math.min((current / target) * 100, 100);
  const isComplete = pct >= 100;

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FlagOutlined sx={{ fontSize: 12, color: 'text.disabled' }} />
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            {label || 'الهدف'}: {target.toLocaleString('ar-SA')}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: isComplete ? '#10B981' : color }}>
          {Math.round(pct)}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 4,
          borderRadius: 2,
          backgroundColor: alpha(color, 0.12),
          '& .MuiLinearProgress-bar': {
            borderRadius: 2,
            backgroundColor: isComplete ? '#10B981' : color,
          },
        }}
      />
    </Box>
  );
}

// ─── SIZE PRESETS ─────────────────────────────────────────────────────────────
const SIZE = {
  sm: { iconSize: 36, iconRadius: '9px', iconFont: 18, valueFont: '1.5rem', p: 2 },
  md: { iconSize: 44, iconRadius: '11px', iconFont: 22, valueFont: '1.875rem', p: 2.5 },
  lg: { iconSize: 52, iconRadius: '13px', iconFont: 26, valueFont: '2.25rem', p: 3 },
};

// ─────────────────────────────────────────────────────────────────────────────
const KPICard = memo(function KPICard({
  title,
  value,
  unit,
  subtitle,
  icon,
  gradient,
  color,
  trend,
  trendLabel,
  trendSuffix,
  sparkline,
  // Phase 2 new props
  target,
  targetLabel,
  comparison,       // { label, value }
  size = 'md',
  pulse = false,    // pulse animation for critical metrics
  loading = false,
  onClick,
  sx = {},
}) {
  const theme   = useTheme();
  const isDark  = theme.palette.mode === 'dark';
  const isClickable = Boolean(onClick);

  const s = SIZE[size] || SIZE.md;

  // Determine colors
  const primaryColor  = color || theme.palette.primary.main;
  const cardGradient  = gradient || `linear-gradient(135deg, ${primaryColor}, ${theme.palette.secondary?.main || '#7C3AED'})`;
  const borderColor   = alpha(primaryColor, isDark ? 0.2 : 0.12);

  // Animate numeric values
  const numericVal = typeof value === 'number' ? value : parseInt(String(value).replace(/[^0-9]/g, '')) || 0;
  const animated   = useAnimatedValue(loading ? 0 : numericVal);
  const displayVal = typeof value === 'number' ? animated.toLocaleString('ar-SA') : value;

  if (loading) {
    return (
      <Card sx={{ p: s.p, ...sx }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Skeleton variant="rounded" width={s.iconSize} height={s.iconSize} sx={{ borderRadius: s.iconRadius }} />
          <Skeleton variant="rounded" width={60} height={20} />
        </Box>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="40%" />
        {target && <Skeleton variant="rounded" width="100%" height={4} sx={{ mt: 1.5, borderRadius: 2 }} />}
      </Card>
    );
  }

  return (
    <Card
      onClick={onClick}
      sx={{
        p: s.p,
        cursor: isClickable ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${borderColor}`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': isClickable
          ? {
              transform: 'translateY(-2px)',
              boxShadow: isDark
                ? `0 12px 28px rgba(0,0,0,0.5), 0 0 0 1px ${borderColor}`
                : `0 12px 28px ${alpha(primaryColor, 0.15)}, 0 0 0 1px ${borderColor}`,
            }
          : {},
        // Phase 2: pulse animation for critical metrics
        ...(pulse && {
          animation: 'kpiPulse 2s ease-in-out infinite',
          '@keyframes kpiPulse': {
            '0%, 100%': { boxShadow: `0 0 0 0 ${alpha(primaryColor, 0.2)}` },
            '50%': { boxShadow: `0 0 0 8px ${alpha(primaryColor, 0)}` },
          },
        }),
        ...sx,
      }}
    >
      {/* Background gradient accent */}
      <Box
        sx={{
          position: 'absolute',
          top: -30,
          left: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: cardGradient,
          opacity: isDark ? 0.07 : 0.06,
          pointerEvents: 'none',
        }}
      />

      {/* Top row: icon + trend */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
        {/* Icon */}
        <Box
          sx={{
            width: s.iconSize,
            height: s.iconSize,
            borderRadius: s.iconRadius,
            background: cardGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${alpha(primaryColor, 0.35)}`,
            color: '#FFFFFF',
            '& svg': { fontSize: s.iconFont },
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>

        {/* Trend + arrow */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
          {trend !== undefined && (
            <TrendBadge value={trend} suffix={trendSuffix} label={trendLabel} />
          )}
          {trendLabel && trend === undefined && (
            <Typography variant="caption" color="text.secondary">{trendLabel}</Typography>
          )}
          {isClickable && (
            <ArrowForwardIos sx={{ fontSize: 13, color: 'text.disabled', transform: 'scaleX(-1)' }} />
          )}
        </Box>
      </Box>

      {/* Value */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mb: 0.5 }}>
        <Typography
          sx={{
            fontSize: s.valueFont,
            fontWeight: 700,
            lineHeight: 1,
            color: isDark ? '#FFFFFF' : primaryColor,
            letterSpacing: '-0.03em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {displayVal}
        </Typography>
        {unit && (
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.secondary' }}>
            {unit}
          </Typography>
        )}
      </Box>

      {/* Title */}
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.secondary', lineHeight: 1.4 }}>
        {title}
      </Typography>

      {/* Phase 2: Comparison */}
      {comparison && (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>
            {comparison.label}:
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>
            {typeof comparison.value === 'number' ? comparison.value.toLocaleString('ar-SA') : comparison.value}
          </Typography>
        </Box>
      )}

      {/* Phase 2: Target progress */}
      {target && (
        <TargetProgress
          current={numericVal}
          target={target}
          color={primaryColor}
          label={targetLabel}
        />
      )}

      {/* Subtitle + sparkline */}
      {(subtitle || sparkline?.length) && (
        <Box
          sx={{
            mt: 1.5,
            pt: 1.5,
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : alpha(primaryColor, 0.08)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          {sparkline?.length > 1 && (
            <Sparkline
              data={sparkline}
              color={primaryColor}
              height={32}
              width={72}
            />
          )}
        </Box>
      )}
    </Card>
  );
});

export default KPICard;
