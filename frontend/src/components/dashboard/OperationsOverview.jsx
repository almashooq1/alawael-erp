/**
 * ⚙️ OperationsOverview v2 — Supply Chain, Fleet & Maintenance Dashboard
 * نظرة على سلسلة التوريد والأسطول والصيانة مع ملخص بصري ومؤشرات تقدم
 */

import React from 'react';
import { useTheme } from '@mui/material';
import { formatNumber } from 'services/dashboardService';
import { statusColors, brandColors, gradients } from '../../theme/palette';

const SectionHeader = React.memo(({ icon, title, subtitle, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: 2,
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
        '& svg': { fontSize: 18 },
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.2 }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
        {subtitle}
      </Typography>
    </Box>
  </Box>
));

const StatItem = ({ label, value, alert, color, progress }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 0.75,
        px: 1,
        borderRadius: 1.5,
        transition: 'all 0.2s',
        '&:hover': {
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          transform: 'translateX(-2px)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flex: 1 }}>
        {alert && (
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: statusColors.warning,
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.4 },
              },
              flexShrink: 0,
            }}
          />
        )}
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
          {label}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {/* Mini progress bar */}
        {progress !== undefined && (
          <Tooltip title={`${Math.round(progress)}%`} arrow>
            <Box sx={{ width: 40, mr: 0.5 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(progress, 100)}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 2,
                    background: color || brandColors.primaryStart,
                  },
                }}
              />
            </Box>
          </Tooltip>
        )}
        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.9rem', color: color || 'text.primary' }}>
          {formatNumber(value)}
        </Typography>
        {alert && (
          <WarningAmberIcon sx={{ fontSize: 14, color: statusColors.warning }} />
        )}
    </Box>
  </Box>
);
};

/* ── Summary Chip Strip ──────────────────────────────────────── */
const SummaryStrip = React.memo(({ supplyChain, fleet, operations }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const totalOrders = (supplyChain.orders?.total || 0);
  const pendingOrders = (supplyChain.orders?.pending || 0);
  const openMaintenance = (operations.maintenance?.open || 0);
  const openIncidents = (operations.incidents?.open || 0);
  const totalVehicles = (fleet.vehicles?.total || 0);
  const alertCount = pendingOrders + openMaintenance + openIncidents;

  return (
    <Box sx={{
      display: 'flex',
      gap: 1,
      flexWrap: 'wrap',
      mb: 2.5,
      py: 1.2,
      px: 1.5,
      borderRadius: 2.5,
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(102,126,234,0.03)',
      border: '1px solid',
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    }}>
      <Chip
        icon={<InventoryIcon sx={{ fontSize: '14px !important' }} />}
        label={`${formatNumber(totalOrders)} أمر شراء`}
        size="small"
        variant="outlined"
        sx={{ fontWeight: 600, fontSize: '0.7rem' }}
      />
      <Chip
        icon={<DirectionsCarIcon sx={{ fontSize: '14px !important' }} />}
        label={`${formatNumber(totalVehicles)} مركبة`}
        size="small"
        variant="outlined"
        sx={{ fontWeight: 600, fontSize: '0.7rem' }}
      />
      {alertCount > 0 && (
        <Chip
          icon={<WarningAmberIcon sx={{ fontSize: '14px !important', color: 'white !important' }} />}
          label={`${alertCount} تنبيه نشط`}
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: '0.7rem',
            background: `linear-gradient(135deg, ${statusColors.warning}, ${statusColors.error})`,
            color: 'white',
          }}
        />
      )}
      {alertCount === 0 && (
        <Chip
          icon={<TrendingUpIcon sx={{ fontSize: '14px !important', color: 'white !important' }} />}
          label="جميع العمليات مستقرة"
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: '0.7rem',
            background: gradients.success,
            color: 'white',
          }}
        />
      )}
    </Box>
  );
});

const OperationsOverview = ({ supplyChain = {}, fleet = {}, operations = {}, delay = 0 }) => {
  const theme = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: 'easeOut' }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          p: 3,
          background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'white',
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.3s',
          '&:hover': { boxShadow: '0 8px 32px rgba(0,0,0,0.08)' },
        }}
      >
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            العمليات والتوريد
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            سلسلة التوريد · الأسطول · الصيانة · الحوادث
          </Typography>
        </Box>

        {/* Summary Strip */}
        <SummaryStrip supplyChain={supplyChain} fleet={fleet} operations={operations} />

        <Grid container spacing={3}>
          {/* Supply Chain */}
          <Grid item xs={12} sm={4}>
            <SectionHeader
              icon={<LocalShippingIcon />}
              title="سلسلة التوريد"
              subtitle="الموردون والمخزون"
              color={brandColors.orangeGlow}
            />
            <StatItem label="الموردون" value={supplyChain.suppliers?.total || 0} color={brandColors.orangeGlow} />
            <StatItem label="أوامر الشراء" value={supplyChain.orders?.total || 0} />
            <StatItem
              label="أوامر معلقة"
              value={supplyChain.orders?.pending || 0}
              alert={supplyChain.orders?.pending > 0}
              color={statusColors.warning}
              progress={supplyChain.orders?.total > 0 ? ((supplyChain.orders?.pending || 0) / supplyChain.orders.total) * 100 : 0}
            />
            <StatItem label="المخزون" value={supplyChain.inventory?.total || 0} />
            <StatItem
              label="مخزون منخفض"
              value={supplyChain.inventory?.lowStock || 0}
              alert={supplyChain.inventory?.lowStock > 0}
              color={statusColors.error}
              progress={supplyChain.inventory?.total > 0 ? ((supplyChain.inventory?.lowStock || 0) / supplyChain.inventory.total) * 100 : 0}
            />
            <StatItem label="العقود" value={supplyChain.contracts?.total || 0} />
            <StatItem
              label="عقود نشطة"
              value={supplyChain.contracts?.active || 0}
              color={brandColors.accentGreen}
              progress={supplyChain.contracts?.total > 0 ? ((supplyChain.contracts?.active || 0) / supplyChain.contracts.total) * 100 : 0}
            />
            <StatItem label="المنتجات" value={supplyChain.products?.total || 0} />
          </Grid>

          {/* Fleet Management */}
          <Grid item xs={12} sm={4}>
            <SectionHeader
              icon={<DirectionsCarIcon />}
              title="إدارة الأسطول"
              subtitle="المركبات والرحلات"
              color={brandColors.accentRose}
            />
            <StatItem label="المركبات" value={fleet.vehicles?.total || 0} color={brandColors.accentRose} />
            <StatItem label="الرحلات" value={fleet.trips?.total || 0} />
            <StatItem label="السائقون" value={fleet.drivers?.total || 0} />

            <Box sx={{ mt: 2 }}>
              <SectionHeader
                icon={<AssignmentIcon />}
                title="الأصول"
                subtitle="إدارة الأصول"
                color={brandColors.lavender}
              />
              <StatItem label="إجمالي الأصول" value={operations.assets?.total || 0} color={brandColors.lavender} />
            </Box>
          </Grid>

          {/* Maintenance & Incidents */}
          <Grid item xs={12} sm={4}>
            <SectionHeader
              icon={<BuildIcon />}
              title="الصيانة والحوادث"
              subtitle="المهام المفتوحة"
              color={brandColors.accentAmber}
            />
            <StatItem
              label="مهام صيانة مفتوحة"
              value={operations.maintenance?.open || 0}
              alert={operations.maintenance?.open > 0}
              color={brandColors.accentAmber}
            />
            <StatItem
              label="حوادث مفتوحة"
              value={operations.incidents?.open || 0}
              alert={operations.incidents?.open > 0}
              color={brandColors.accentAmber}
            />
            <StatItem label="مواعيد اليوم" value={operations.schedules?.today || 0} color={brandColors.accentSky} />

            <Box sx={{ mt: 2 }}>
              <SectionHeader
                icon={<PersonIcon />}
                title="إدارة العملاء"
                subtitle="العملاء المحتملون"
                color={brandColors.ocean}
              />
              <StatItem label="إجمالي العملاء" value={operations.leads?.total || 0} />
              <StatItem
                label="عملاء جدد"
                value={operations.leads?.new || 0}
                color={brandColors.accentGreen}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </motion.div>
  );
};

export default React.memo(OperationsOverview);
