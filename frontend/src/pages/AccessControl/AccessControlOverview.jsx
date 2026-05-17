/**
 * AccessControlOverview — نظرة عامة للوحة تحكم الصلاحيات
 * Displays KPI cards, role distribution chart, and recent activity
 */
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  LinearProgress,
  Avatar,
  Skeleton,
  alpha,
  useTheme,
} from '@mui/material';
import {
  People as PeopleIcon,
  AdminPanelSettings as RolesIcon,
  VerifiedUser as VerifiedIcon,
  Warning as WarningIcon,
  Lock as LockIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { useMemo } from 'react';
import { SYSTEM_ROLES, RISK_CONFIG, getSecurityScoreConfig } from './accessControl.constants';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, subtitle, icon: Icon, color, loading }) => {
  const theme = useTheme();
  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${alpha(color, 0.3)}`,
        borderRadius: 3,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: theme.shadows[4] },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: alpha(color, 0.08),
        }}
      />
      <CardContent sx={{ pb: '16px !important' }}>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}
        >
          <Box>
            {loading ? (
              <Skeleton width={60} height={40} />
            ) : (
              <Typography variant="h4" fontWeight={700} color={color}>
                {value ?? '—'}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {title}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: alpha(color, 0.12), color }}>
            <Icon fontSize="small" />
          </Avatar>
        </Box>
        {subtitle && (
          <Typography variant="caption" color="text.disabled">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Security Score Gauge ─────────────────────────────────────────────────────
const SecurityScoreCard = ({ score, loading }) => {
  const config = getSecurityScoreConfig(score ?? 0);
  return (
    <Card
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}
    >
      <CardContent sx={{ textAlign: 'center', py: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          مؤشر الأمان
        </Typography>
        {loading ? (
          <Skeleton variant="circular" width={100} height={100} sx={{ mx: 'auto', my: 1 }} />
        ) : (
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              border: `6px solid ${config.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              my: 1,
              boxShadow: `0 0 20px ${alpha(config.color, 0.3)}`,
            }}
          >
            <Typography variant="h5" fontWeight={800} color={config.color}>
              {score}
            </Typography>
          </Box>
        )}
        <Chip
          label={config.label}
          size="small"
          sx={{ bgcolor: alpha(config.color, 0.12), color: config.color, fontWeight: 700 }}
        />
        <LinearProgress
          variant={loading ? 'indeterminate' : 'determinate'}
          value={score ?? 0}
          sx={{
            mt: 2,
            height: 6,
            borderRadius: 3,
            '& .MuiLinearProgress-bar': { bgcolor: config.color },
            bgcolor: alpha(config.color, 0.15),
          }}
        />
      </CardContent>
    </Card>
  );
};

// ─── Role Distribution ────────────────────────────────────────────────────────
const RoleDistributionCard = ({ stats, loading }) => {
  const roleBreakdown = useMemo(() => {
    if (!stats?.roleBreakdown) return [];
    return Object.entries(stats.roleBreakdown)
      .map(([role, count]) => ({
        role,
        count,
        config: SYSTEM_ROLES.find(r => r.value === role) || { label: role, color: '#78909c' },
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [stats]);

  const total = useMemo(() => roleBreakdown.reduce((s, r) => s + r.count, 0), [roleBreakdown]);

  return (
    <Card
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}
    >
      <CardHeader
        title="توزيع المستخدمين حسب الدور"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
      />
      <CardContent sx={{ pt: 0 }}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={32} sx={{ mb: 1 }} />)
          : roleBreakdown.map(({ role, count, config }) => {
              const pct = total ? Math.round((count / total) * 100) : 0;
              return (
                <Box key={role} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {config.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {count} ({pct}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      '& .MuiLinearProgress-bar': { bgcolor: config.color },
                      bgcolor: alpha(config.color, 0.15),
                    }}
                  />
                </Box>
              );
            })}
      </CardContent>
    </Card>
  );
};

// ─── Risk Summary ─────────────────────────────────────────────────────────────
const RiskSummaryCard = ({ insights, loading }) => {
  const grouped = useMemo(() => {
    if (!insights) return {};
    return insights.reduce((acc, i) => {
      acc[i.severity] = (acc[i.severity] || 0) + 1;
      return acc;
    }, {});
  }, [insights]);

  return (
    <Card
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}
    >
      <CardHeader
        title="ملخص المخاطر"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
      />
      <CardContent sx={{ pt: 0 }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={40} sx={{ mb: 1 }} />)
          : Object.entries(RISK_CONFIG).map(([key, cfg]) => (
              <Box
                key={key}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1,
                  mb: 1,
                  borderRadius: 2,
                  bgcolor: grouped[key] ? cfg.bg : 'action.hover',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircleIcon sx={{ fontSize: 10, color: cfg.color }} />
                  <Typography variant="body2">{cfg.label}</Typography>
                </Box>
                <Chip
                  label={grouped[key] || 0}
                  size="small"
                  sx={{
                    bgcolor: grouped[key] ? cfg.color : 'transparent',
                    color: grouped[key] ? '#fff' : 'text.disabled',
                    fontWeight: 700,
                    minWidth: 32,
                  }}
                />
              </Box>
            ))}
      </CardContent>
    </Card>
  );
};

// ─── Main Overview ────────────────────────────────────────────────────────────
const AccessControlOverview = ({ stats, insights, securityScore, loading }) => {
  const activeUsers = stats?.active || 0;
  const totalUsers = stats?.total || 0;
  const lockedUsers = stats?.locked || 0;
  const totalRoles = SYSTEM_ROLES.length;
  const criticalIssues = insights?.filter(i => i.severity === 'critical').length || 0;

  return (
    <Box>
      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="إجمالي المستخدمين"
            value={totalUsers}
            subtitle={`${activeUsers} نشط`}
            icon={PeopleIcon}
            color="#1976d2"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="الحسابات المقفولة"
            value={lockedUsers}
            subtitle="تتطلب مراجعة"
            icon={LockIcon}
            color={lockedUsers > 0 ? '#e53935' : '#43a047'}
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="الأدوار المتاحة"
            value={totalRoles}
            subtitle="دور في النظام"
            icon={RolesIcon}
            color="#7b1fa2"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="مشكلات حرجة"
            value={criticalIssues}
            subtitle="تستلزم إجراءاً فورياً"
            icon={criticalIssues > 0 ? WarningIcon : VerifiedIcon}
            color={criticalIssues > 0 ? '#b71c1c' : '#43a047'}
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Second Row */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={3}>
          <SecurityScoreCard score={securityScore} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={5}>
          <RoleDistributionCard stats={stats} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <RiskSummaryCard insights={insights} loading={loading} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default AccessControlOverview;
