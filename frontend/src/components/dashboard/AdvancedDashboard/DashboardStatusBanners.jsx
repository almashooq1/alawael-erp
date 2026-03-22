/**
 * DashboardStatusBanners — Offline, refresh flash, progress bar, print header
 */
import React from 'react';
import { Box, Typography, Alert, Chip, LinearProgress, useTheme } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { motion } from 'framer-motion';
import { brandColors, statusColors, chartColors, neutralColors } from 'theme/palette';

const DashboardStatusBanners = ({ isOnline, refreshFlash, refreshProgress, refreshing: _refreshing }) => {
  const theme = useTheme();

  return (
    <>
      {/* ═══════════ OFFLINE CONNECTIVITY BANNER ═══════════ */}
      {!isOnline && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Alert
            severity="warning"
            icon={<WifiOffIcon />}
            sx={{
              mb: 2,
              borderRadius: 3,
              fontWeight: 600,
              fontSize: '0.82rem',
              background: theme.palette.mode === 'dark' ? 'rgba(255,152,0,0.12)' : 'rgba(255,152,0,0.08)',
              border: '1px solid rgba(255,152,0,0.25)',
            }}
          >
            لا يوجد اتصال بالإنترنت — يتم عرض البيانات المحفوظة محلياً
          </Alert>
        </motion.div>
      )}

      {/* ═══════════ AUTO-REFRESH SUCCESS FLASH ═══════════ */}
      {refreshFlash && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}
        >
          <Chip
            size="small"
            label="✓ تم التحديث"
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              height: 26,
              background: 'rgba(67,233,123,0.12)',
              color: brandColors.accentGreen,
              border: '1px solid rgba(67,233,123,0.25)',
              animation: 'fadeOutFlash 2.2s ease-out forwards',
              '@keyframes fadeOutFlash': {
                '0%': { opacity: 1 },
                '70%': { opacity: 1 },
                '100%': { opacity: 0 },
              },
            }}
          />
        </motion.div>
      )}

      {/* Auto-refresh progress indicator */}
      <LinearProgress
        variant="determinate"
        value={refreshProgress}
        sx={{
          height: 2,
          mb: 2,
          borderRadius: 1,
          opacity: 0.5,
          backgroundColor: 'transparent',
          '& .MuiLinearProgress-bar': {
            background: refreshProgress < 50
              ? `linear-gradient(90deg, ${brandColors.accentGreen}, ${brandColors.accentTeal})`
              : refreshProgress < 75
              ? `linear-gradient(90deg, ${brandColors.accentAmber}, ${brandColors.accentPink})`
              : `linear-gradient(90deg, ${statusColors.error}, ${chartColors.category[7]})`,
            borderRadius: 1,
            transition: 'background 1s ease',
          },
        }}
      />

      {/* ══════════════════ PRINT HEADER (print only) ══════════ */}
      <Box
        sx={{
          display: 'none',
          '@media print': {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3,
            pb: 2,
            borderBottom: `2px solid ${neutralColors.textDark}`,
          },
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: neutralColors.textDark }}>
            نظام الأوائل — لوحة التحكم التنفيذية
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: neutralColors.textMuted, fontStyle: 'italic' }}>v3.0</Typography>
      </Box>
    </>
  );
};

export default DashboardStatusBanners;
