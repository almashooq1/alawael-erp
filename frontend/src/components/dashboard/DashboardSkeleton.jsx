/**
 * Dashboard Loading Skeleton
 * هيكل التحميل للوحة التحكم
 */

import { useTheme } from '@mui/material';
import { gradients } from 'theme/palette';

export default function DashboardSkeleton() {
  const theme = useTheme();

  const skeletonSx = (h) => ({
    borderRadius: 4,
    background: theme.palette.mode === 'dark'
      ? 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)'
      : undefined,
    height: h,
  });

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        minHeight: '100vh',
        background: theme.palette.mode === 'dark'
          ? gradients.dashboardDark
          : gradients.dashboardLight,
      }}
      role="status"
      aria-label="جاري تحميل لوحة التحكم"
    >
      {/* Welcome Header skeleton */}
      <Skeleton variant="rounded" animation="wave" sx={{ ...skeletonSx(100), mb: 2 }} />

      {/* Section nav skeleton */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, overflowX: 'hidden' }}>
        {[...Array(6)].map((_, i) => (
          <Skeleton key={`nav-${i}`} variant="rounded" width={80} height={32} animation="wave" sx={{ borderRadius: 2, flexShrink: 0 }} />
        ))}
      </Box>

      {/* KPI cards skeleton */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[...Array(8)].map((_, i) => (
          <Grid item xs={6} sm={4} md={3} key={`kpi-${i}`}>
            <Skeleton variant="rounded" animation="wave" sx={{ ...skeletonSx(130), animationDelay: `${i * 80}ms` }} />
          </Grid>
        ))}
      </Grid>

      {/* Charts skeleton */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Skeleton variant="rounded" animation="wave" sx={skeletonSx(300)} />
        </Grid>
        <Grid item xs={12} md={4}>
          <Skeleton variant="rounded" animation="wave" sx={skeletonSx(300)} />
        </Grid>
      </Grid>

      {/* Bottom sections skeleton */}
      <Grid container spacing={2}>
        {[...Array(3)].map((_, i) => (
          <Grid item xs={12} md={4} key={`sec-${i}`}>
            <Skeleton variant="rounded" animation="wave" sx={{ ...skeletonSx(260), animationDelay: `${i * 120}ms` }} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
