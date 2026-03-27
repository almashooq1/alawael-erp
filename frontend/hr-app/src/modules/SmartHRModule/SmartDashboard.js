/**
 * لوحة التحكم الذكية — AI HR Dashboard
 */
import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Divider,
  Paper,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  PersonOff,
  EventBusy,
  AccessTime,
  Warning,
  CheckCircle,
  School,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { fetchSmartDashboard, fetchPromotionRecommendations, fetchWorkforceCost } from './api';

const riskColors = {
  حرج: 'error',
  عالي: 'error',
  تحذير: 'warning',
  متوسط: 'warning',
  منخفض: 'success',
  معلومة: 'info',
};

const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => (
  <Card sx={{ height: '100%', borderRight: `4px solid`, borderColor: `${color}.main` }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="caption" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ color: `${color}.main`, fontSize: 40, opacity: 0.7 }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

const SmartDashboard = () => {
  const { t: _t } = useTranslation();
  const [dashboard, setDashboard] = useState(null);
  const [promotions, setPromotions] = useState(null);
  const [costs, setCosts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [dashRes, promoRes, costRes] = await Promise.all([
          fetchSmartDashboard().catch(() => null),
          fetchPromotionRecommendations().catch(() => null),
          fetchWorkforceCost().catch(() => null),
        ]);
        if (dashRes?.data) setDashboard(dashRes.data);
        if (promoRes?.data) setPromotions(promoRes.data);
        if (costRes?.data) setCosts(costRes.data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading)
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  if (error) return <Alert severity="error">{error}</Alert>;

  const kpis = dashboard?.kpis || {};

  return (
    <Box p={3} dir="rtl">
      <Typography variant="h5" fontWeight="bold" mb={3}>
        🧠 لوحة التحكم الذكية — شؤون الموظفين
      </Typography>

      {/* ═══ KPIs Row ═══ */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجمالي الموظفين"
            value={kpis.totalEmployees || 0}
            icon={<People />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="موظفون نشطون"
            value={kpis.activeEmployees || 0}
            icon={<CheckCircle />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="معدل الدوران السنوي"
            value={`${kpis.turnoverRate || 0}%`}
            icon={kpis.turnoverRate > 15 ? <TrendingUp /> : <TrendingDown />}
            color={kpis.turnoverRate > 15 ? 'error' : 'success'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="الحضور اليوم"
            value={`${kpis.attendanceRate || 0}%`}
            icon={<AccessTime />}
            color="info"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="تعيينات هذا الشهر"
            value={kpis.newHiresThisMonth || 0}
            icon={<People />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إنهاء خدمة هذا العام"
            value={kpis.terminatedThisYear || 0}
            icon={<PersonOff />}
            color="error"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجازات بانتظار الموافقة"
            value={kpis.pendingLeaves || 0}
            icon={<EventBusy />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="تهيئة جارية"
            value={kpis.onboardingInProgress || 0}
            icon={<School />}
            color="secondary"
          />
        </Grid>
      </Grid>

      {/* ═══ Alerts ═══ */}
      {dashboard?.alerts?.length > 0 && (
        <Box mb={3}>
          <Typography variant="h6" mb={1}>
            ⚡ تنبيهات ذكية
          </Typography>
          {dashboard.alerts.map((alert, i) => (
            <Alert
              key={i}
              severity={riskColors[alert.level] || 'info'}
              sx={{ mb: 1 }}
              icon={<Warning />}
            >
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      <Grid container spacing={3}>
        {/* ═══ Promotion Recommendations ═══ */}
        {promotions?.recommendations?.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>
                🏆 توصيات الترقية
              </Typography>
              {promotions.recommendations.slice(0, 8).map((rec, i) => (
                <Box
                  key={i}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  py={1}
                  borderBottom="1px solid #eee"
                >
                  <Box>
                    <Typography fontWeight="bold">{rec.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {rec.department} — {rec.position}
                    </Typography>
                    <Box mt={0.5}>
                      {rec.reasons.map((r, j) => (
                        <Chip key={j} label={r} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                      ))}
                    </Box>
                  </Box>
                  <Box textAlign="center">
                    <Chip
                      label={rec.recommendation}
                      color={rec.score >= 70 ? 'success' : rec.score >= 50 ? 'warning' : 'default'}
                      size="small"
                    />
                    <Typography variant="caption" display="block">
                      {rec.score}/100
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Paper>
          </Grid>
        )}

        {/* ═══ Workforce Cost ═══ */}
        {costs && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>
                💰 تحليل تكلفة القوى العاملة
              </Typography>
              <Grid container spacing={1} mb={2}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    إجمالي الرواتب
                  </Typography>
                  <Typography fontWeight="bold">
                    {(costs.totalGross || 0).toLocaleString()} ر.س
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    صافي
                  </Typography>
                  <Typography fontWeight="bold">
                    {(costs.totalNet || 0).toLocaleString()} ر.س
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    متوسط الراتب
                  </Typography>
                  <Typography fontWeight="bold">
                    {(costs.avgSalary || 0).toLocaleString()} ر.س
                  </Typography>
                </Grid>
              </Grid>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" mb={1}>
                توزيع حسب الأقسام
              </Typography>
              {(costs.departmentBreakdown || []).slice(0, 6).map((dept, i) => (
                <Box key={i} mb={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">{dept.department}</Typography>
                    <Typography variant="body2">{dept.percentOfTotal}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(dept.percentOfTotal, 100)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              ))}
              {costs.insights?.length > 0 && (
                <Box mt={2}>
                  {costs.insights.map((ins, i) => (
                    <Alert key={i} severity="info" sx={{ mb: 0.5 }}>
                      {ins}
                    </Alert>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default SmartDashboard;
