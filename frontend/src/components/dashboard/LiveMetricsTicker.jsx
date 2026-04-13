/**
 * 📡 LiveMetricsTicker — شريط مؤشرات مباشرة متحرك
 * Premium live metrics scrolling ticker with real-time pulse indicators
 */

import React, { useEffect, useRef } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

const METRICS_DEMO = [
  { label: 'المستفيدون النشطون', value: '1,284', change: 3.2,  unit: '' },
  { label: 'جلسات اليوم',        value: '342',   change: -1.1, unit: '' },
  { label: 'الإيراد الشهري',     value: '284,500', change: 8.7, unit: 'ر.س' },
  { label: 'نسبة الإشغال',       value: '78',    change: 0,    unit: '%'  },
  { label: 'الموظفون الحاضرون',  value: '96',    change: 2.4,  unit: '%'  },
  { label: 'طلبات معلقة',        value: '47',    change: -5.0, unit: '' },
  { label: 'رضا الأسر',          value: '4.7',   change: 0.3,  unit: '/5' },
  { label: 'الفروع النشطة',      value: '12',    change: 0,    unit: '' },
];

const TickerItem = ({ metric, isDark }) => {
  const isUp   = metric.change > 0;
  const isDown = metric.change < 0;
  const color  = isUp ? '#4caf50' : isDown ? '#f44336' : '#9e9e9e';
  const TrendIcon = isUp ? TrendingUpIcon : isDown ? TrendingDownIcon : TrendingFlatIcon;

  return (
    <Box sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 1.2,
      px: 2.5,
      flexShrink: 0,
    }}>
      {/* Pulse dot */}
      <Box sx={{
        width: 6, height: 6, borderRadius: '50%',
        background: color,
        boxShadow: `0 0 6px ${color}`,
        animation: 'tickPulse 2s ease-in-out infinite',
        '@keyframes tickPulse': {
          '0%,100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.5, transform: 'scale(0.7)' },
        },
      }} />

      <Typography sx={{
        fontSize: '0.72rem',
        color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}>
        {metric.label}
      </Typography>

      <Typography sx={{
        fontSize: '0.78rem',
        fontWeight: 800,
        color: isDark ? '#fff' : '#1a1a2e',
        whiteSpace: 'nowrap',
      }}>
        {metric.value}{metric.unit ? ` ${metric.unit}` : ''}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
        <TrendIcon sx={{ fontSize: 13, color }} />
        {metric.change !== 0 && (
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color }}>
            {Math.abs(metric.change)}%
          </Typography>
        )}
      </Box>

      {/* Separator */}
      <Box sx={{
        width: '1px', height: 16, mx: 0.5,
        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        flexShrink: 0,
      }} />
    </Box>
  );
};

const LiveMetricsTicker = ({ metrics }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const items = metrics?.length ? metrics : METRICS_DEMO;
  const doubled = [...items, ...items]; // duplicate for seamless loop

  return (
    <Box sx={{
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '14px',
      mb: 2.5,
      background: isDark
        ? 'linear-gradient(135deg,rgba(15,20,40,0.95),rgba(20,15,50,0.95))'
        : 'linear-gradient(135deg,rgba(255,255,255,0.95),rgba(248,248,255,0.95))',
      backdropFilter: 'blur(20px)',
      border: '1px solid',
      borderColor: isDark ? 'rgba(102,126,234,0.2)' : 'rgba(102,126,234,0.1)',
      boxShadow: isDark
        ? '0 4px 20px rgba(0,0,0,0.3)'
        : '0 4px 20px rgba(102,126,234,0.08)',
      height: 44,
    }}>
      {/* Left fade */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0, zIndex: 2,
        width: 80, height: '100%',
        background: isDark
          ? 'linear-gradient(90deg,rgba(15,20,40,1) 0%,transparent 100%)'
          : 'linear-gradient(90deg,rgba(255,255,255,1) 0%,transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* LIVE badge */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0, zIndex: 3,
        height: '100%', display: 'flex', alignItems: 'center',
        pl: 1.5,
      }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.6,
          px: 1.2, py: 0.4, borderRadius: '8px',
          background: 'linear-gradient(135deg,#667eea,#764ba2)',
          boxShadow: '0 3px 10px rgba(102,126,234,0.4)',
        }}>
          <Box sx={{
            width: 5, height: 5, borderRadius: '50%', background: '#fff',
            animation: 'liveDot 1.5s ease-in-out infinite',
            '@keyframes liveDot': {
              '0%,100%': { opacity: 1 },
              '50%': { opacity: 0.3 },
            },
          }} />
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: 'white', letterSpacing: 1 }}>
            LIVE
          </Typography>
        </Box>
      </Box>

      {/* Right fade */}
      <Box sx={{
        position: 'absolute', top: 0, right: 0, zIndex: 2,
        width: 40, height: '100%',
        background: isDark
          ? 'linear-gradient(270deg,rgba(15,20,40,1) 0%,transparent 100%)'
          : 'linear-gradient(270deg,rgba(255,255,255,1) 0%,transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Scrolling content */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        pl: '90px',
        overflow: 'hidden',
        '& > div': {
          display: 'flex',
          animation: 'tickerScroll 40s linear infinite',
          '&:hover': { animationPlayState: 'paused' },
          '@keyframes tickerScroll': {
            '0%': { transform: 'translateX(0)' },
            '100%': { transform: 'translateX(-50%)' },
          },
        },
      }}>
        <Box>
          {doubled.map((metric, i) => (
            <TickerItem key={i} metric={metric} isDark={isDark} />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(LiveMetricsTicker);
