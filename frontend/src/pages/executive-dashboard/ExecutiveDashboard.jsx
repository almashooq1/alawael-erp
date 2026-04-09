/**
 * ExecutiveDashboard — لوحة المعلومات التنفيذية الموحدة
 *
 * عرض شامل لجميع مؤشرات الأداء الرئيسية، التنبيهات،
 * والملخصات عبر جميع المجالات
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Paper,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  People as PeopleIcon,
  EventNote as EpisodeIcon,
  Assessment as SessionIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  TrendingFlat as TrendFlatIcon,
  Refresh as RefreshIcon,
  Speed as SpeedIcon,
  NotificationsActive as AlertIcon,
  Dashboard as DashboardIcon,
  Psychology as AIIcon,
} from '@mui/icons-material';
import { dashboardsAPI, aiRecommendationsAPI, qualityAPI } from '../../services/ddd';

/* ── Severity colors ── */
const SEVERITY_COLORS = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'success',
  info: 'default',
};

/* ── KPI Status colors ── */
const KPI_STATUS_COLORS = {
  exceeds_target: '#4caf50',
  on_target: '#8bc34a',
  warning: '#ff9800',
  critical: '#f44336',
  no_data: '#9e9e9e',
};

/* ── KPI Card ── */
function KPICard({ kpi, snapshot }) {
  const trend = snapshot?.trend;
  const TrendIcon = trend === 'improving' ? TrendUpIcon : trend === 'declining' ? TrendDownIcon : TrendFlatIcon;
  const trendColor = trend === 'improving' ? 'success.main' : trend === 'declining' ? 'error.main' : 'text.secondary';

  return (
    <Card sx={{ height: '100%', borderLeft: `4px solid ${KPI_STATUS_COLORS[snapshot?.status] || '#9e9e9e'}` }}>
      <CardContent sx={{ pb: 1 }}>
        <Typography variant="caption" color="text.secondary" noWrap>
          {kpi.nameAr || kpi.name}
        </Typography>
        <Box display="flex" alignItems="baseline" gap={1} mt={0.5}>
          <Typography variant="h4" fontWeight="bold">
            {snapshot?.value != null ? snapshot.value : '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {kpi.unit}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
          {snapshot?.trend && <TrendIcon sx={{ fontSize: 18, color: trendColor }} />}
          {snapshot?.changePercentage != null && (
            <Typography variant="caption" sx={{ color: trendColor }}>
              {snapshot.changePercentage > 0 ? '+' : ''}{snapshot.changePercentage.toFixed(1)}%
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            الهدف: {kpi.target?.value}{kpi.unit}
          </Typography>
        </Box>
        {snapshot?.value != null && kpi.target?.value && (
          <LinearProgress
            variant="determinate"
            value={Math.min(100, (snapshot.value / kpi.target.value) * 100)}
            color={snapshot.status === 'critical' ? 'error' : snapshot.status === 'warning' ? 'warning' : 'success'}
            sx={{ mt: 1, height: 4, borderRadius: 2 }}
          />
        )}
      </CardContent>
    </Card>
  );
}

/* ── Summary Card ── */
function SummaryCard({ title, value, icon: Icon, color = 'primary.main', subtitle }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ bgcolor: `${color}15`, borderRadius: 2, p: 1.5, display: 'flex' }}>
            <Icon sx={{ color, fontSize: 28 }} />
          </Box>
          <Box flex={1}>
            <Typography variant="h4" fontWeight="bold">{value ?? '—'}</Typography>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

/* ── Alert Item ── */
function AlertItem({ alert }) {
  return (
    <ListItem dense divider sx={{ px: 1 }}>
      <ListItemIcon sx={{ minWidth: 36 }}>
        {alert.severity === 'critical' ? <ErrorIcon color="error" fontSize="small" /> : <WarningIcon color="warning" fontSize="small" />}
      </ListItemIcon>
      <ListItemText
        primary={alert.titleAr || alert.title}
        secondary={`${alert.category} · ${new Date(alert.createdAt).toLocaleDateString('ar-SA')}`}
        primaryTypographyProps={{ variant: 'body2', noWrap: true }}
        secondaryTypographyProps={{ variant: 'caption' }}
      />
      <Chip size="small" label={alert.severity} color={SEVERITY_COLORS[alert.severity] || 'default'} />
    </ListItem>
  );
}

/* ═══════════════════════════════════════════════════════════
 *  MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════ */
export default function ExecutiveDashboard() {
  const [summary, setSummary] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertStats, setAlertStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, kpiRes, alertRes, alertAnalRes] = await Promise.allSettled([
        dashboardsAPI.getExecutiveSummary(),
        dashboardsAPI.getLatestKPIs(),
        dashboardsAPI.listAlerts({ status: 'new,acknowledged', limit: 10 }),
        dashboardsAPI.getAlertAnalytics(),
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value?.data?.data || sumRes.value?.data);
      if (kpiRes.status === 'fulfilled') setKpis(kpiRes.value?.data?.data || []);
      if (alertRes.status === 'fulfilled') setAlerts(alertRes.value?.data?.data || []);
      if (alertAnalRes.status === 'fulfilled') setAlertStats(alertAnalRes.value?.data?.data || null);

      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 300000); // Refresh every 5 min
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (loading && !summary) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <DashboardIcon color="primary" fontSize="large" />
          <Box>
            <Typography variant="h5" fontWeight="bold">لوحة المعلومات التنفيذية</Typography>
            <Typography variant="caption" color="text.secondary">
              آخر تحديث: {lastRefresh ? lastRefresh.toLocaleTimeString('ar-SA') : '—'}
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<AIIcon />} onClick={() => dashboardsAPI.runAllRules().then(fetchAll)}>
            تشغيل محرك القرار
          </Button>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchAll} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard title="المستفيدون النشطون" value={summary?.activeBeneficiaries} icon={PeopleIcon} color="#1976d2" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard title="الحلقات العلاجية النشطة" value={summary?.activeEpisodes} icon={EpisodeIcon} color="#9c27b0" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard title="جلسات هذا الشهر" value={summary?.sessionsThisMonth} icon={SessionIcon} color="#2e7d32" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="التنبيهات المفتوحة"
            value={summary?.alerts?.total}
            icon={AlertIcon}
            color={summary?.alerts?.bySeverity?.critical > 0 ? '#f44336' : '#ff9800'}
            subtitle={summary?.alerts?.bySeverity?.critical ? `${summary.alerts.bySeverity.critical} حرجة` : null}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* KPIs Grid */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" fontWeight="bold">
                <SpeedIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                مؤشرات الأداء الرئيسية
              </Typography>
              <Chip label={`${kpis.length} KPIs`} size="small" />
            </Box>
            <Grid container spacing={2}>
              {kpis.map((item, i) => (
                <Grid item xs={12} sm={6} md={4} key={item.kpi?._id || i}>
                  <KPICard kpi={item.kpi || {}} snapshot={item.latestSnapshot} />
                </Grid>
              ))}
              {kpis.length === 0 && (
                <Grid item xs={12}>
                  <Typography color="text.secondary" textAlign="center" py={4}>
                    لا توجد مؤشرات أداء مسجلة بعد. أنشئ KPIs من إعدادات لوحة المعلومات.
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Alerts Panel */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="h6" fontWeight="bold">
                <Badge badgeContent={alerts.length} color="error">
                  <AlertIcon />
                </Badge>
                <Box component="span" ml={1}>التنبيهات</Box>
              </Typography>
            </Box>
            <Divider sx={{ mb: 1 }} />

            {/* Alert Stats */}
            {alertStats && (
              <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                {alertStats.bySeverity?.critical > 0 && (
                  <Chip size="small" color="error" label={`${alertStats.bySeverity.critical} حرجة`} />
                )}
                {alertStats.bySeverity?.high > 0 && (
                  <Chip size="small" color="warning" label={`${alertStats.bySeverity.high} عالية`} />
                )}
                {alertStats.bySeverity?.medium > 0 && (
                  <Chip size="small" color="info" label={`${alertStats.bySeverity.medium} متوسطة`} />
                )}
                {alertStats.averageResponseMinutes != null && (
                  <Chip size="small" variant="outlined" label={`متوسط الاستجابة: ${Math.round(alertStats.averageResponseMinutes)} د`} />
                )}
              </Box>
            )}

            <List disablePadding>
              {alerts.map((alert) => (
                <AlertItem key={alert._id} alert={alert} />
              ))}
              {alerts.length === 0 && (
                <Box textAlign="center" py={4}>
                  <CheckIcon color="success" sx={{ fontSize: 40 }} />
                  <Typography color="text.secondary" mt={1}>لا توجد تنبيهات مفتوحة</Typography>
                </Box>
              )}
            </List>
          </Paper>
        </Grid>

        {/* KPI Status Summary */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>ملخص حالة المؤشرات</Typography>
            <Grid container spacing={2}>
              {[
                { label: 'فوق الهدف', status: 'exceeds_target', color: '#4caf50' },
                { label: 'على الهدف', status: 'on_target', color: '#8bc34a' },
                { label: 'تحذير', status: 'warning', color: '#ff9800' },
                { label: 'حرج', status: 'critical', color: '#f44336' },
              ].map((s) => {
                const count = kpis.filter((k) => k.latestSnapshot?.status === s.status).length;
                return (
                  <Grid item xs={6} sm={3} key={s.status}>
                    <Card sx={{ textAlign: 'center', py: 2, borderBottom: `3px solid ${s.color}` }}>
                      <Typography variant="h3" fontWeight="bold" sx={{ color: s.color }}>{count}</Typography>
                      <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
