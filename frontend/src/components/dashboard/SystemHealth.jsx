/**
 * 🖥️ SystemHealth v4 — Premium Server Status Panel
 * حالة النظام بريميوم مع glassmorphism + gradient gauges
 */

import React from 'react';
import { useTheme } from '@mui/material';
import { statusColors } from '../../theme/palette';

/* ─────────────────────────────────────── */
const formatUptime = (seconds) => {
  if (!seconds) return '0 ثانية';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} يوم ${h} ساعة`;
  if (h > 0) return `${h} ساعة ${m} دقيقة`;
  return `${m} دقيقة`;
};

/* ─────────────────────────────────────── */
/*  Animated Circular Gauge                */
/* ─────────────────────────────────────── */
const CircularGauge = ({ value, max = 100, size = 88, thickness = 7, label, colorOverride }) => {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const gaugeColor = colorOverride || (
    percent > 85 ? statusColors.error :
    percent > 60 ? statusColors.warning :
    statusColors.success
  );

  const trackColor = percent > 85
    ? 'rgba(244,67,54,0.12)'
    : percent > 60
      ? 'rgba(255,152,0,0.12)'
      : 'rgba(76,175,80,0.12)';

  return (
    <Tooltip title={`${label}: ${Math.round(percent)}%`} arrow placement="top">
      <Box sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'default',
      }}>
        <svg
          width={size}
          height={size}
          style={{ transform: 'rotate(-90deg)' }}
          role="img"
          aria-label={`${label}: ${Math.round(percent)}%`}
        >
          {/* Track */}
          <circle cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={trackColor} strokeWidth={thickness} />
          {/* Progress */}
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay: 0.4 }}
            style={{ filter: `drop-shadow(0 0 4px ${gaugeColor}80)` }}
          />
        </svg>

        {/* Center text */}
        <Box sx={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
        }}>
          <Typography sx={{
            fontWeight: 900,
            fontSize: '1rem',
            lineHeight: 1.1,
            color: gaugeColor,
          }}>
            {Math.round(percent)}
            <Box component="span" sx={{ fontSize: '0.55rem', fontWeight: 600 }}>%</Box>
          </Typography>
          {label && (
            <Typography sx={{ fontSize: '0.5rem', color: 'text.disabled', mt: 0.2, letterSpacing: 0 }}>
              {label}
            </Typography>
          )}
        </Box>
      </Box>
    </Tooltip>
  );
};

/* ─────────────────────────────────────── */
/*  Stat Row Item                          */
/* ─────────────────────────────────────── */
const StatRow = ({ icon, label, value, status = 'info', barPercent, barColor }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const STATUS_COLORS = {
    success: '#4caf50',
    error:   '#f44336',
    warning: '#ff9800',
    info:    '#2196f3',
    indigo:  '#667eea',
  };

  const c = STATUS_COLORS[status] || STATUS_COLORS.info;

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      p: '10px 12px',
      borderRadius: '12px',
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.018)',
      border: '1px solid',
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : `${c}18`,
      transition: 'all 0.2s',
      '&:hover': {
        background: `${c}08`,
        borderColor: `${c}30`,
        transform: 'translateX(-2px)',
      },
    }}>
      {/* Icon box */}
      <Box sx={{
        width: 36, height: 36,
        borderRadius: '10px',
        background: `${c}14`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        '& svg': { fontSize: 18, color: c },
      }}>
        {icon}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.disabled', display: 'block', lineHeight: 1.2 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.84rem', lineHeight: 1.3 }}>
          {value}
        </Typography>
        {barPercent !== undefined && (
          <LinearProgress
            variant="determinate"
            value={Math.min(barPercent, 100)}
            sx={{
              mt: 0.5,
              height: 3,
              borderRadius: 4,
              background: `${barColor || c}20`,
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background: barColor || c,
              },
            }}
          />
        )}
      </Box>
    </Box>
  );
};

/* ─────────────────────────────────────── */
/*  Main Component                         */
/* ─────────────────────────────────────── */
const SystemHealth = ({ system = {} }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isConnected = system.dbStatus === 'healthy' || system.database === 'متصل';
  const memPercent = system.memoryTotal
    ? Math.round((system.memoryUsage / system.memoryTotal) * 100)
    : 0;
  const collectionsPercent = system.models
    ? Math.round(((system.collections || 0) / Math.max(system.models, 1)) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
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
            ? '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)'
            : '0 8px 32px rgba(102,126,234,0.08), inset 0 1px 0 rgba(255,255,255,1)',
        }}
      >
        {/* Top accent bar */}
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: isConnected
            ? 'linear-gradient(90deg,#43cea2,#185a9d,#667eea)'
            : 'linear-gradient(90deg,#f44336,#ff5722)',
          backgroundSize: '200% auto',
          animation: 'hBar 3s linear infinite',
          '@keyframes hBar': {
            '0%': { backgroundPosition: '0% center' },
            '100%': { backgroundPosition: '200% center' },
          },
        }} />

        {/* Decorative orb */}
        <Box sx={{
          position: 'absolute', top: -50, insetInlineEnd: -50,
          width: 160, height: 160, borderRadius: '50%',
          background: isConnected
            ? 'linear-gradient(135deg,#43cea2,#667eea)'
            : 'linear-gradient(135deg,#f44336,#ff9800)',
          opacity: isDark ? 0.07 : 0.05,
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }} />

        {/* ── Header ─────────────────────── */}
        <Box sx={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', mb: 2.5,
          position: 'relative', zIndex: 1,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '12px',
              background: isConnected
                ? 'linear-gradient(135deg,#43cea2,#185a9d)'
                : 'linear-gradient(135deg,#f44336,#ff5722)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isConnected
                ? '0 6px 16px rgba(67,206,162,0.35)'
                : '0 6px 16px rgba(244,67,54,0.35)',
            }}>
              <HubIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.2 }}>
                حالة النظام
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
                مراقبة الخوادم والخدمات
              </Typography>
            </Box>
          </Box>

          <Chip
            icon={isConnected
              ? <CheckCircleIcon sx={{ fontSize: '14px !important' }} />
              : <ErrorIcon sx={{ fontSize: '14px !important' }} />
            }
            label={isConnected ? 'متصل' : 'غير متصل'}
            size="small"
            sx={{
              height: 24,
              fontWeight: 700,
              fontSize: '0.68rem',
              background: isConnected ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)',
              border: `1px solid ${isConnected ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)'}`,
              color: isConnected ? '#4caf50' : '#f44336',
              '& .MuiChip-icon': { color: isConnected ? '#4caf50' : '#f44336' },
            }}
          />
        </Box>

        {/* ── Gauges Row ──────────────────── */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          mb: 2.5,
          py: 1.5,
          borderRadius: '14px',
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
          position: 'relative', zIndex: 1,
        }}>
          <CircularGauge
            value={system.memoryUsage || 0}
            max={system.memoryTotal || 100}
            label="ذاكرة"
          />
          <Box sx={{
            width: '1px', height: 60,
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          }} />
          <CircularGauge
            value={system.collections || 0}
            max={Math.max(system.models || 30, system.collections || 1)}
            colorOverride="#667eea"
            label="مجموعات"
          />
        </Box>

        {/* ── Stat Rows ───────────────────── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, position: 'relative', zIndex: 1 }}>
          <StatRow
            icon={<StorageIcon />}
            label="قاعدة البيانات"
            value={system.database || 'غير متصل'}
            status={isConnected ? 'success' : 'error'}
          />
          <StatRow
            icon={<TimerIcon />}
            label="وقت التشغيل"
            value={formatUptime(system.uptime)}
            status="indigo"
          />
          <StatRow
            icon={<MemoryIcon />}
            label="استخدام الذاكرة"
            value={`${system.memoryUsage || 0} / ${system.memoryTotal || 0} MB`}
            status={memPercent > 85 ? 'error' : memPercent > 60 ? 'warning' : 'success'}
            barPercent={memPercent}
            barColor={memPercent > 85 ? '#f44336' : memPercent > 60 ? '#ff9800' : '#4caf50'}
          />
          <StatRow
            icon={<SpeedIcon />}
            label="المجموعات / النماذج"
            value={`${system.collections || 0} / ${system.models || 0}`}
            status="indigo"
            barPercent={collectionsPercent}
            barColor="#667eea"
          />
        </Box>

        {/* ── Footer ──────────────────────── */}
        {system.nodeVersion && (
          <Box sx={{
            mt: 2, pt: 1.5,
            borderTop: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            display: 'flex', alignItems: 'center', gap: 0.8,
          }}>
            <Box sx={{
              width: 20, height: 20, borderRadius: '6px',
              background: 'rgba(102,126,234,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <DnsIcon sx={{ fontSize: 12, color: '#667eea' }} />
            </Box>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
              Node.js {system.nodeVersion}
            </Typography>
          </Box>
        )}
      </Paper>
    </motion.div>
  );
};

export default React.memo(SystemHealth);
