/**
 * 🎯 PerformanceRings — حلقات الأداء الدائرية بريميوم
 * Multi-layer animated SVG rings showing KPI performance vs targets
 */

import React from 'react';
import { Box, Paper, Typography, Chip, useTheme, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';

/* ─────────────────────────────────────── */
const RINGS_DEMO = [
  {
    label:    'نسبة الإشغال',
    value:    78,
    target:   85,
    gradient: ['#667eea', '#764ba2'],
    unit:     '%',
    icon:     '🏢',
  },
  {
    label:    'رضا الأسر',
    value:    94,
    target:   90,
    gradient: ['#43cea2', '#185a9d'],
    unit:     '%',
    icon:     '❤️',
  },
  {
    label:    'تحقيق الإيراد',
    value:    62,
    target:   100,
    gradient: ['#f7971e', '#ffd200'],
    unit:     '%',
    icon:     '💰',
  },
  {
    label:    'حضور الموظفين',
    value:    96,
    target:   95,
    gradient: ['#4facfe', '#00f2fe'],
    unit:     '%',
    icon:     '👥',
  },
];

/* ─────────────────────────────────────── */
/*  Single Ring                            */
/* ─────────────────────────────────────── */
const Ring = ({ data, size = 110, delay = 0, isDark }) => {
  const STROKE = 8;
  const TARGET_STROKE = 3;
  const R_OUTER = (size - STROKE) / 2;
  const R_INNER = R_OUTER - STROKE - 4;
  const C_OUTER = 2 * Math.PI * R_OUTER;
  const C_INNER = 2 * Math.PI * R_INNER;

  const pct     = Math.min(data.value  / 100, 1);
  const tgtPct  = Math.min(data.target / 100, 1);

  const outerOffset = C_OUTER * (1 - pct);
  const innerOffset = C_INNER * (1 - tgtPct);

  const isAhead  = data.value >= data.target;
  const statusColor = isAhead ? '#4caf50' : data.value >= data.target * 0.8 ? '#ff9800' : '#f44336';

  const gradId = `ring-grad-${data.label.replace(/\s/g, '')}`;

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
    }}>
      <Tooltip
        title={`${data.label}: ${data.value}${data.unit} / هدف: ${data.target}${data.unit}`}
        arrow
        placement="top"
      >
        <Box sx={{ position: 'relative', cursor: 'default' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.7, rotate: -30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
              <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={data.gradient[0]} />
                  <stop offset="100%" stopColor={data.gradient[1]} />
                </linearGradient>
              </defs>

              {/* ── Outer track ─────────────── */}
              <circle
                cx={size / 2} cy={size / 2} r={R_OUTER}
                fill="none"
                stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                strokeWidth={STROKE}
              />

              {/* ── Outer progress ──────────── */}
              <motion.circle
                cx={size / 2} cy={size / 2} r={R_OUTER}
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={C_OUTER}
                initial={{ strokeDashoffset: C_OUTER }}
                animate={{ strokeDashoffset: outerOffset }}
                transition={{ delay: delay + 0.2, duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
                style={{ filter: `drop-shadow(0 0 6px ${data.gradient[0]}80)` }}
              />

              {/* ── Inner track ─────────────── */}
              <circle
                cx={size / 2} cy={size / 2} r={R_INNER}
                fill="none"
                stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}
                strokeWidth={TARGET_STROKE}
                strokeDasharray="4 6"
              />

              {/* ── Inner target ring ───────── */}
              <motion.circle
                cx={size / 2} cy={size / 2} r={R_INNER}
                fill="none"
                stroke={statusColor}
                strokeWidth={TARGET_STROKE}
                strokeLinecap="round"
                strokeDasharray={C_INNER}
                initial={{ strokeDashoffset: C_INNER }}
                animate={{ strokeDashoffset: innerOffset }}
                transition={{ delay: delay + 0.5, duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                opacity={0.6}
              />
            </svg>
          </motion.div>

          {/* ── Center content ──────────── */}
          <Box sx={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 0.2,
          }}>
            <Typography sx={{ fontSize: '1.15rem', lineHeight: 1 }}>
              {data.icon}
            </Typography>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.8, duration: 0.4 }}
            >
              <Typography sx={{
                fontWeight: 900,
                fontSize: '1rem',
                lineHeight: 1,
                background: `linear-gradient(135deg,${data.gradient[0]},${data.gradient[1]})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {data.value}
                <Box component="span" sx={{ fontSize: '0.5rem', fontWeight: 700 }}>
                  {data.unit}
                </Box>
              </Typography>
            </motion.div>

            {/* Status dot */}
            <Box sx={{
              width: 6, height: 6, borderRadius: '50%',
              background: statusColor,
              boxShadow: `0 0 6px ${statusColor}80`,
            }} />
          </Box>
        </Box>
      </Tooltip>

      {/* Label */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'text.primary',
          lineHeight: 1.3,
          maxWidth: size,
          textAlign: 'center',
        }}>
          {data.label}
        </Typography>
        <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>
          هدف {data.target}{data.unit}
        </Typography>
      </Box>
    </Box>
  );
};

/* ─────────────────────────────────────── */
/*  Main Component                         */
/* ─────────────────────────────────────── */
const PerformanceRings = ({ rings, title = 'مؤشرات الأداء', delay = 0 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const items = rings?.length ? rings : RINGS_DEMO;

  // Overall score = average % of target achieved
  const overallScore = Math.round(
    items.reduce((acc, r) => acc + Math.min((r.value / r.target) * 100, 100), 0) / items.length
  );

  const scoreColor =
    overallScore >= 90 ? '#4caf50' :
    overallScore >= 70 ? '#ff9800' : '#f44336';

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: '20px',
          p: 3,
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          background: isDark
            ? 'linear-gradient(145deg,rgba(15,20,40,0.97),rgba(20,15,45,0.97))'
            : 'linear-gradient(145deg,rgba(255,255,255,0.97),rgba(248,248,255,0.97))',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(102,126,234,0.15)' : 'rgba(102,126,234,0.1)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.35)'
            : '0 8px 32px rgba(102,126,234,0.08)',
        }}
      >
        {/* Accent bar */}
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'linear-gradient(90deg,#667eea,#43cea2,#f7971e,#4facfe)',
          backgroundSize: '200% auto',
          animation: 'prBar 4s linear infinite',
          '@keyframes prBar': {
            '0%': { backgroundPosition: '0% center' },
            '100%': { backgroundPosition: '200% center' },
          },
        }} />

        {/* BG orb */}
        <Box sx={{
          position: 'absolute', top: -60, insetInlineEnd: -60,
          width: 200, height: 200, borderRadius: '50%',
          background: 'linear-gradient(135deg,#667eea,#764ba2)',
          opacity: isDark ? 0.06 : 0.04,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }} />

        {/* ── Header ─────────────────────── */}
        <Box sx={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', mb: 3,
          position: 'relative', zIndex: 1,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '12px',
              background: 'linear-gradient(135deg,#667eea,#764ba2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(102,126,234,0.4)',
            }}>
              <SpeedRoundedIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.2 }}>
                {title}
              </Typography>
              <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>
                مقارنة بالأهداف المحددة
              </Typography>
            </Box>
          </Box>

          {/* Overall score badge */}
          <Box sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            px: 1.5, py: 0.8, borderRadius: '14px',
            background: `${scoreColor}12`,
            border: `1px solid ${scoreColor}30`,
          }}>
            <Typography sx={{ fontSize: '1.3rem', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
              {overallScore}
            </Typography>
            <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: scoreColor, lineHeight: 1.2 }}>
              تحقق
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.3 }}>
              <EmojiEventsRoundedIcon sx={{ fontSize: 10, color: scoreColor }} />
              <Typography sx={{ fontSize: '0.55rem', color: scoreColor, fontWeight: 600 }}>
                %
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* ── Rings grid ─────────────────── */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          gap: 2,
          position: 'relative', zIndex: 1,
        }}>
          {items.map((ring, i) => (
            <Ring
              key={ring.label}
              data={ring}
              size={104}
              delay={delay + i * 0.12}
              isDark={isDark}
            />
          ))}
        </Box>

        {/* ── Legend ─────────────────────── */}
        <Box sx={{
          mt: 2.5, pt: 1.5,
          borderTop: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          display: 'flex', gap: 2, flexWrap: 'wrap',
          position: 'relative', zIndex: 1,
        }}>
          {[
            { color: '#667eea', label: 'الأداء الفعلي' },
            { color: '#4caf50', label: 'هدف محقق', dashed: false },
            { color: '#ff9800', label: 'هدف جزئي' },
            { color: '#f44336', label: 'تحت الهدف' },
          ].map(item => (
            <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{
                width: 18, height: 3,
                borderRadius: 2,
                background: item.color,
                opacity: 0.8,
              }} />
              <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled' }}>
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </motion.div>
  );
};

export default React.memo(PerformanceRings);
