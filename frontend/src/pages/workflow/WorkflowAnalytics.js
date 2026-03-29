/**
 * WorkflowAnalytics — تحليلات سير العمل
 *
 * Comprehensive analytics with KPIs, SLA compliance,
 * completion trends, category distribution, top performers,
 * bottleneck detection, and step performance.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  LinearProgress,
  alpha,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  Analytics as AnalyticsIcon,
  Speed as SLAIcon,
  TrendingUp as TrendIcon,
  Category as CategoryIcon,
  EmojiEvents as TopIcon,
  Warning as BottleneckIcon,
  Timer as TimerIcon,
  CheckCircle as CompleteIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';

// ─── Constants ──────────────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  request: 'الطلبات',
  approval: 'الموافقات',
  incident: 'الحوادث',
  change: 'التغييرات',
  project: 'المشاريع',
  custom: 'مخصص',
  hr: 'الموارد البشرية',
  finance: 'المالية',
  operations: 'العمليات',
  it: 'تقنية المعلومات',
  general: 'عام',
  compliance: 'الامتثال',
};

const CATEGORY_COLORS = {
  request: '#3B82F6',
  approval: '#10B981',
  incident: '#EF4444',
  change: '#F59E0B',
  project: '#8B5CF6',
  custom: '#6B7280',
  hr: '#8B5CF6',
  finance: '#10B981',
  operations: '#3B82F6',
  it: '#F59E0B',
  general: '#6B7280',
  compliance: '#EF4444',
};

export default function WorkflowAnalytics() {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [performance, setPerformance] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [overviewRes, perfRes] = await Promise.all([
        workflowService.getAnalyticsOverview(),
        workflowService.getAnalyticsPerformance(),
      ]);
      setOverview(overviewRes.data.data);
      setPerformance(perfRes.data.data);
    } catch {
      showSnackbar('خطأ في تحميل التحليلات', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LinearProgress />;

  const slaRate = overview?.slaCompliance || {};
  const compliancePct =
    slaRate.total > 0 ? Math.round((slaRate.onTime / slaRate.total) * 100) : 100;
  const completionTrend = overview?.completionTrend || [];
  const catDist = overview?.categoryDistribution || [];
  const topPerformers = performance?.topPerformers || [];
  const bottlenecks = performance?.bottlenecks || [];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/workflow')}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <AnalyticsIcon color="primary" /> تحليلات سير العمل
            </Typography>
            <Typography variant="body2" color="text.secondary">
              نظرة شاملة على أداء وكفاءة سير العمل
            </Typography>
          </Box>
        </Box>
        <Tooltip title="تحديث">
          <IconButton onClick={fetchData}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* KPI Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="نسبة التوافق مع SLA"
            value={`${compliancePct}%`}
            subtitle={`${slaRate.onTime || 0} من ${slaRate.total || 0}`}
            color={compliancePct >= 90 ? '#10B981' : compliancePct >= 70 ? '#F59E0B' : '#EF4444'}
            icon={<SLAIcon />}
            progress={compliancePct}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="المكتملة هذا الشهر"
            value={completionTrend.reduce((a, t) => a + (t.completed || 0), 0)}
            subtitle="سير عمل"
            color="#3B82F6"
            icon={<CompleteIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="متوسط وقت الإتمام"
            value={overview?.avgCompletionTime !== null ? `${overview.avgCompletionTime} ساعة` : '—'}
            subtitle="من البداية للنهاية"
            color="#8B5CF6"
            icon={<TimerIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="نقاط الاختناق"
            value={bottlenecks.length}
            subtitle="خطوات تحتاج تحسين"
            color={bottlenecks.length > 3 ? '#EF4444' : '#F59E0B'}
            icon={<BottleneckIcon />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Completion Trend */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <TrendIcon color="primary" /> اتجاه الإتمام (آخر 30 يوم)
            </Typography>
            {completionTrend.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center', py: 4 }}
              >
                لا توجد بيانات كافية
              </Typography>
            ) : (
              <Box sx={{ mt: 2 }}>
                {/* Simple bar chart using CSS */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 0.5,
                    height: 180,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    pb: 0.5,
                  }}
                >
                  {completionTrend.map((item, idx) => {
                    const max = Math.max(
                      ...completionTrend.map(t => (t.completed || 0) + (t.started || 0)),
                      1
                    );
                    const completedH = ((item.completed || 0) / max) * 160;
                    const startedH = ((item.started || 0) / max) * 160;

                    return (
                      <Tooltip
                        key={idx}
                        title={
                          <Box>
                            <Typography variant="caption">
                              {item._id || `يوم ${idx + 1}`}
                            </Typography>
                            <br />
                            <Typography variant="caption">مكتمل: {item.completed || 0}</Typography>
                            <br />
                            <Typography variant="caption">بدأ: {item.started || 0}</Typography>
                          </Box>
                        }
                      >
                        <Box
                          sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: '100%',
                              maxWidth: 24,
                              height: completedH + startedH || 2,
                              background: `linear-gradient(to top, #3B82F6 ${completedH}px, ${alpha('#3B82F6', 0.3)} ${completedH}px)`,
                              borderRadius: '4px 4px 0 0',
                              minHeight: 2,
                            }}
                          />
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mt: 1, justifyContent: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: '#3B82F6', borderRadius: 0.5 }} />
                    <Typography variant="caption">مكتمل</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        bgcolor: alpha('#3B82F6', 0.3),
                        borderRadius: 0.5,
                      }}
                    />
                    <Typography variant="caption">بدأ</Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Category Distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <CategoryIcon color="primary" /> التوزيع حسب الفئة
            </Typography>
            {catDist.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center', py: 4 }}
              >
                لا توجد بيانات
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                {catDist.map(item => {
                  const total = catDist.reduce((a, c) => a + (c.count || 0), 0) || 1;
                  const pct = Math.round(((item.count || 0) / total) * 100);
                  const color = CATEGORY_COLORS[item._id] || '#6B7280';

                  return (
                    <Box key={item._id}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {CATEGORY_LABELS[item._id] || item._id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.count} ({pct}%)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: alpha(color, 0.1),
                          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* SLA Compliance Breakdown */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <SLAIcon color="primary" /> تفاصيل التوافق مع SLA
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              {/* Circular-style gauge */}
              <Box
                sx={{
                  position: 'relative',
                  width: 160,
                  height: 160,
                  borderRadius: '50%',
                  background: `conic-gradient(#10B981 ${compliancePct * 3.6}deg, ${alpha('#EF4444', 0.15)} ${compliancePct * 3.6}deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    bgcolor: 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                  }}
                >
                  <Typography variant="h4" fontWeight={800}>
                    {compliancePct}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    توافق
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} color="success.main">
                    {slaRate.onTime || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    في الوقت
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} color="error.main">
                    {slaRate.overdue || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    متأخر
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} color="text.secondary">
                    {slaRate.total || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    الإجمالي
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Top Performers */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <TopIcon color="primary" /> أعلى الأداء
            </Typography>
            {topPerformers.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center', py: 4 }}
              >
                لا توجد بيانات كافية
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>المستخدم</TableCell>
                      <TableCell align="center">مكتمل</TableCell>
                      <TableCell align="center">متوسط الوقت</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topPerformers.slice(0, 10).map((user, idx) => (
                      <TableRow key={user._id || idx} hover>
                        <TableCell>
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              fontSize: 14,
                              fontWeight: 700,
                              bgcolor:
                                idx === 0
                                  ? '#F59E0B'
                                  : idx === 1
                                    ? '#9CA3AF'
                                    : idx === 2
                                      ? '#B45309'
                                      : alpha('#6B7280', 0.1),
                              color: idx < 3 ? '#fff' : 'text.primary',
                            }}
                          >
                            {idx + 1}
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{user.name || user._id || '—'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={user.completed || 0}
                            color="success"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {user.avgDuration
                              ? `${Math.round(user.avgDuration / 3600000)} ساعة`
                              : '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Bottleneck Detection */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <BottleneckIcon color="warning" /> كشف نقاط الاختناق
            </Typography>
            {bottlenecks.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CompleteIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                <Typography color="text.secondary">لا توجد نقاط اختناق — أداء ممتاز!</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>الخطوة</TableCell>
                      <TableCell>سير العمل</TableCell>
                      <TableCell align="center">متوسط التأخير</TableCell>
                      <TableCell align="center">عدد التأخيرات</TableCell>
                      <TableCell align="center">شدة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bottlenecks.map((bn, idx) => {
                      const avgDelayHours = bn.avgWait ? Math.round(bn.avgWait / 3600000) : 0;
                      const severity =
                        avgDelayHours > 24 ? 'high' : avgDelayHours > 8 ? 'medium' : 'low';
                      const sevConfig = {
                        high: { label: 'عالي', color: 'error' },
                        medium: { label: 'متوسط', color: 'warning' },
                        low: { label: 'منخفض', color: 'info' },
                      };

                      return (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {bn._id || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {bn.overdue > 0 ? `${bn.overdue} متأخرة` : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              icon={<TimerIcon />}
                              label={`${avgDelayHours} ساعة`}
                              variant="outlined"
                              color={sevConfig[severity].color}
                            />
                          </TableCell>
                          <TableCell align="center">{bn.waiting || 0}</TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={sevConfig[severity].label}
                              color={sevConfig[severity].color}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KPICard({ title, value, subtitle, color, icon, progress }) {
  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardContent>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {title}
          </Typography>
          <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(color, 0.1), color }}>
            {React.cloneElement(icon, { fontSize: 'small' })}
          </Avatar>
        </Box>
        <Typography variant="h4" fontWeight={800} sx={{ color }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
        {progress !== undefined && (
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              mt: 1,
              height: 6,
              borderRadius: 3,
              bgcolor: alpha(color, 0.1),
              '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
