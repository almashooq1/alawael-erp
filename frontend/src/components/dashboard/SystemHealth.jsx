/**
 * 🖥️ SystemHealth v3 — Enhanced Server Status Panel with Circular Gauges
 * حالة النظام المحسّنة مع مقاييس دائرية
 */

import React from 'react';
import { Box, Paper, Typography, Chip, useTheme, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import StorageIcon from '@mui/icons-material/Storage';
import MemoryIcon from '@mui/icons-material/Memory';
import TimerIcon from '@mui/icons-material/Timer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SpeedIcon from '@mui/icons-material/Speed';
import DnsIcon from '@mui/icons-material/Dns';
import { statusColors, brandColors } from '../../theme/palette';

const formatUptime = (seconds) => {
  if (!seconds) return '0 ثانية';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} يوم ${h} ساعة`;
  if (h > 0) return `${h} ساعة ${m} دقيقة`;
  return `${m} دقيقة`;
};

/* ── Circular Gauge Component ─────────────────────────── */
const CircularGauge = ({ value, max = 100, size = 80, thickness = 6, color, label }) => {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const gaugeColor = color || (percent > 85 ? statusColors.error : percent > 60 ? statusColors.warning : statusColors.success);

  return (
    <Tooltip title={`${Math.round(percent)}%`} arrow>
      <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} role="img" aria-label={`${label || 'مقياس'}: ${Math.round(percent)}%`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={thickness}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          />
        </svg>
        <Box
          sx={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1, color: gaugeColor }}>
            {Math.round(percent)}%
          </Typography>
          {label && (
            <Typography sx={{ fontSize: '0.55rem', color: 'text.disabled', mt: 0.2 }}>
              {label}
            </Typography>
          )}
        </Box>
      </Box>
    </Tooltip>
  );
};

const SystemHealth = ({ system = {} }) => {
  const theme = useTheme();
  const isConnected = system.dbStatus === 'healthy' || system.database === 'متصل';
  const memPercent = system.memoryTotal ? Math.round((system.memoryUsage / system.memoryTotal) * 100) : 0;

  const statusItems = [
    {
      icon: <StorageIcon />,
      label: 'قاعدة البيانات',
      value: system.database || 'غير متصل',
      status: isConnected ? 'success' : 'error',
    },
    {
      icon: <TimerIcon />,
      label: 'وقت التشغيل',
      value: formatUptime(system.uptime),
      status: 'info',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.6 }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          p: 3,
          height: '100%',
          background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff',
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              حالة النظام
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              مراقبة الخوادم والخدمات
            </Typography>
          </Box>
          <Chip
            icon={isConnected ? <CheckCircleIcon /> : <ErrorIcon />}
            label={isConnected ? 'متصل' : 'غير متصل'}
            size="small"
            color={isConnected ? 'success' : 'error'}
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        </Box>

        {/* Circular Gauges Row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2.5 }}>
          <CircularGauge
            value={system.memoryUsage || 0}
            max={system.memoryTotal || 100}
            label="ذاكرة"
          />
          <CircularGauge
            value={system.collections || 0}
            max={Math.max(system.models || 30, system.collections || 1)}
            color={brandColors.primaryStart}
            label="مجموعات"
          />
        </Box>

        {/* Status Items */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {statusItems.map((item, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1,
                borderRadius: 2,
                transition: 'background 0.2s',
                '&:hover': { background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background:
                    item.status === 'success' ? 'rgba(76,175,80,0.1)' :
                    item.status === 'error' ? 'rgba(244,67,54,0.1)' :
                    item.status === 'warning' ? 'rgba(255,152,0,0.1)' :
                    'rgba(33,150,243,0.1)',
                  color:
                    item.status === 'success' ? statusColors.success :
                    item.status === 'error' ? statusColors.error :
                    item.status === 'warning' ? statusColors.warning :
                    statusColors.info,
                  '& svg': { fontSize: 20 },
                }}
              >
                {item.icon}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                  {item.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {item.value}
                </Typography>
              </Box>
            </Box>
          ))}

          {/* Memory detail row */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1,
              borderRadius: 2,
              '&:hover': { background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: memPercent > 85 ? 'rgba(244,67,54,0.1)' : 'rgba(76,175,80,0.1)',
                color: memPercent > 85 ? statusColors.error : statusColors.success,
                '& svg': { fontSize: 20 },
              }}
            >
              <MemoryIcon />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                استخدام الذاكرة
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                {system.memoryUsage || 0} / {system.memoryTotal || 0} MB
              </Typography>
            </Box>
          </Box>

          {/* Response time */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1,
              borderRadius: 2,
              '&:hover': { background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(33,150,243,0.1)',
                color: statusColors.info,
                '& svg': { fontSize: 20 },
              }}
            >
              <SpeedIcon />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                المجموعات / النماذج
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                {system.collections || 0} / {system.models || 0}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Footer — Node version */}
        {system.nodeVersion && (
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <DnsIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Node.js {system.nodeVersion}
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>
    </motion.div>
  );
};

export default React.memo(SystemHealth);
