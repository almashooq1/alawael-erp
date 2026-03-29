/**
 * 📊 تقارير التأهيل الشاملة — Disability Rehabilitation Reports
 * AlAwael ERP — Program effectiveness, therapist performance, goal achievement, trends
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  LinearProgress,  Button,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  CircularProgress,
  useTheme,
  alpha,
  Rating,
} from '@mui/material';
import {
  Assessment as ReportIcon,
  TrendingUp as TrendIcon,
  People as PeopleIcon,
  EmojiEvents as GoalIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Star as StarIcon,
  CheckCircle as CheckIcon,
  } from '@mui/icons-material';
import { useSnackbar } from 'contexts/SnackbarContext';
import {
  rehabReportService,
  rehabProgramService,} from 'services/disabilityRehabService';

const fmtNum = n => (n ?? 0).toLocaleString('ar-SA');
const pctColor = v => (v >= 80 ? 'success' : v >= 50 ? 'warning' : 'error');
const pctHex = v => (v >= 80 ? '#2e7d32' : v >= 50 ? '#ed6c02' : '#d32f2f');

export default function DisabilityRehabReports() {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const g = theme.palette.gradients || {};

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [programs, setPrograms] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [st, perf, pr] = await Promise.all([
        rehabReportService.getStatistics(),
        rehabReportService.getPerformance(),
        rehabProgramService.getAll(),
      ]);
      setStats(st || rehabReportService.getMockDashboard());
      setPerformance(perf || rehabReportService.getMockPerformance());
      setPrograms(pr?.programs || pr?.data || rehabProgramService.getMockPrograms());
    } catch {
      setStats(rehabReportService.getMockDashboard());
      setPerformance(rehabReportService.getMockPerformance());
      setPrograms(rehabProgramService.getMockPrograms());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const s = stats || rehabReportService.getMockDashboard();
  const p = performance || rehabReportService.getMockPerformance();

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 12 }}>
        <CircularProgress size={48} />
      </Box>
    );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 3,
          borderRadius: 3,
          background: g.primary || 'linear-gradient(135deg,#0d47a1 0%,#1565c0 100%)',
          color: '#fff',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={2}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              📊 تقارير التأهيل الشاملة
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5, opacity: 0.9 }}>
              تحليل أداء البرامج — فعالية المعالجين — تحقيق الأهداف — الاتجاهات
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              sx={{
                bgcolor: 'rgba(255,255,255,.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,.3)' },
              }}
              startIcon={<RefreshIcon />}
              onClick={load}
            >
              تحديث
            </Button>
            <Button
              variant="contained"
              sx={{
                bgcolor: 'rgba(255,255,255,.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,.3)' },
              }}
              startIcon={<DownloadIcon />}
              onClick={() => showSnackbar('جاري تحضير التقرير...', 'info')}
            >
              تصدير PDF
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* ── Overview KPIs ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'المستفيدون النشطون',
            value: fmtNum(s.activeBeneficiaries),
            icon: <PeopleIcon />,
            color: '#1976d2',
            bg: 'linear-gradient(135deg,#1976d2 0%,#42a5f5 100%)',
          },
          {
            label: 'البرامج النشطة',
            value: fmtNum(s.activePrograms),
            icon: <ReportIcon />,
            color: '#2e7d32',
            bg: 'linear-gradient(135deg,#2e7d32 0%,#66bb6a 100%)',
          },
          {
            label: 'معدل التحسن',
            value: `${s.avgImprovement}%`,
            icon: <TrendIcon />,
            color: '#ed6c02',
            bg: 'linear-gradient(135deg,#ed6c02 0%,#ffa726 100%)',
          },
          {
            label: 'تحقيق الأهداف',
            value: `${s.goalAchievementRate}%`,
            icon: <GoalIcon />,
            color: '#9c27b0',
            bg: 'linear-gradient(135deg,#9c27b0 0%,#ba68c8 100%)',
          },
          {
            label: 'إكمال الجلسات',
            value: `${s.sessionCompletionRate}%`,
            icon: <CheckIcon />,
            color: '#0288d1',
            bg: 'linear-gradient(135deg,#0288d1 0%,#4fc3f7 100%)',
          },
          {
            label: 'رضا المستفيدين',
            value: `${s.satisfactionRate}%`,
            icon: <StarIcon />,
            color: '#388e3c',
            bg: 'linear-gradient(135deg,#388e3c 0%,#81c784 100%)',
          },
        ].map((k, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Card
              elevation={0}
              sx={{ borderRadius: 3, background: k.bg, color: '#fff', height: '100%' }}
            >
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(255,255,255,.25)',
                    mx: 'auto',
                    mb: 1,
                    width: 40,
                    height: 40,
                  }}
                >
                  {k.icon}
                </Avatar>
                <Typography variant="h5" fontWeight={700}>
                  {k.value}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {k.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Tabs ── */}
      <Paper
        elevation={0}
        sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: `1px solid ${theme.palette.divider}`, px: 2 }}
        >
          <Tab label="👨‍⚕️ أداء المعالجين" />
          <Tab label="📋 فعالية البرامج" />
          <Tab label="🎯 متابعة الأهداف" />
          <Tab label="📈 الاتجاهات الشهرية" />
        </Tabs>

        {/* ═ Tab 0: Therapist Performance ═ */}
        {tab === 0 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              👨‍⚕️ أداء المعالجين — مقارنة شاملة
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha('#1976d2', 0.06) }}>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المعالج</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الجلسات</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التقييم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>نسبة التحسن</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>حجم العمل</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الأداء العام</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(p.therapistPerformance || []).map((t, i) => {
                    const overall = Math.round(
                      (t.rating / 5) * 40 + (t.improvement / 30) * 30 + (t.sessions / 50) * 30
                    );
                    return (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: i < 3 ? '#ffd600' : alpha('#1976d2', 0.12),
                              color: i < 3 ? '#000' : '#1976d2',
                              fontSize: 14,
                              fontWeight: 700,
                            }}
                          >
                            {i + 1}
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {t.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={`${t.sessions} جلسة`} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Rating value={t.rating} precision={0.1} size="small" readOnly />
                            <Typography variant="caption">({t.rating})</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(t.improvement * 3, 100)}
                              color={pctColor(t.improvement * 3)}
                              sx={{ flex: 1, height: 8, borderRadius: 4, minWidth: 80 }}
                            />
                            <Chip
                              label={`+${t.improvement}%`}
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${t.caseload} حالة`}
                            size="small"
                            color={t.caseload > 7 ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <LinearProgress
                              variant="determinate"
                              value={overall}
                              color={pctColor(overall)}
                              sx={{ flex: 1, height: 10, borderRadius: 5, minWidth: 60 }}
                            />
                            <Typography variant="body2" fontWeight={700} color={pctHex(overall)}>
                              {overall}%
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ═ Tab 1: Program Effectiveness ═ */}
        {tab === 1 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              📋 فعالية البرامج حسب التخصص
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {(p.programEffectiveness || []).map((pe, i) => {
                const colors = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f'];
                const color = colors[i % colors.length];
                return (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: 2,
                        border: `2px solid ${alpha(color, 0.2)}`,
                        height: '100%',
                      }}
                    >
                      <CardContent>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ mb: 2 }}
                        >
                          <Typography variant="subtitle1" fontWeight={700} color={color}>
                            {pe.type}
                          </Typography>
                          <Chip label={`${pe.programs} برنامج`} size="small" />
                        </Stack>
                        {[
                          { label: 'متوسط التقدم', value: pe.avgProgress },
                          { label: 'متوسط التحسن', value: pe.avgImprovement },
                          { label: 'معدل الإكمال', value: pe.completionRate },
                        ].map((m, j) => (
                          <Box key={j} sx={{ mb: 1.5 }}>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                              <Typography variant="caption">{m.label}</Typography>
                              <Typography
                                variant="caption"
                                fontWeight={700}
                                color={pctHex(m.value)}
                              >
                                {m.value}%
                              </Typography>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={m.value}
                              color={pctColor(m.value)}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {/* ═ Tab 2: Goal Tracking ═ */}
        {tab === 2 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              🎯 متابعة الأهداف التأهيلية
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {(() => {
                const allGoals = programs.flatMap(pr =>
                  (pr.goals || []).map(gl => ({
                    ...gl,
                    program: pr.name,
                    beneficiary: pr.beneficiary?.name,
                  }))
                );
                const achieved = allGoals.filter(g => g.status === 'achieved').length;
                const inProgress = allGoals.filter(g => g.status === 'in_progress').length;
                return [
                  { label: 'إجمالي الأهداف', value: allGoals.length, color: '#1976d2' },
                  { label: 'تم تحقيقها', value: achieved, color: '#2e7d32' },
                  { label: 'جاري التنفيذ', value: inProgress, color: '#ed6c02' },
                  {
                    label: 'نسبة التحقيق',
                    value: `${allGoals.length ? Math.round((achieved / allGoals.length) * 100) : 0}%`,
                    color: '#9c27b0',
                  },
                ].map((k, i) => (
                  <Grid item xs={6} sm={3} key={i}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        textAlign: 'center',
                        border: `2px solid ${alpha(k.color, 0.2)}`,
                        bgcolor: alpha(k.color, 0.04),
                      }}
                    >
                      <Typography variant="h4" fontWeight={700} color={k.color}>
                        {k.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {k.label}
                      </Typography>
                    </Paper>
                  </Grid>
                ));
              })()}
            </Grid>

            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha('#9c27b0', 0.06) }}>
                    <TableCell sx={{ fontWeight: 700 }}>الهدف</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>البرنامج</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المستفيد</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التقدم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {programs
                    .flatMap(pr =>
                      (pr.goals || []).map(gl => ({
                        ...gl,
                        program: pr.name,
                        beneficiary: pr.beneficiary?.name,
                      }))
                    )
                    .map((gl, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {gl.title}
                          </Typography>
                        </TableCell>
                        <TableCell>{gl.program}</TableCell>
                        <TableCell>{gl.beneficiary}</TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LinearProgress
                              variant="determinate"
                              value={Math.min((gl.current / gl.target) * 100, 100)}
                              color={pctColor((gl.current / gl.target) * 100)}
                              sx={{ flex: 1, height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="caption" fontWeight={700}>
                              {gl.current}/{gl.target}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={gl.status === 'achieved' ? 'تم التحقيق ✅' : 'جاري'}
                            size="small"
                            color={gl.status === 'achieved' ? 'success' : 'warning'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ═ Tab 3: Monthly Trends ═ */}
        {tab === 3 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              📈 الاتجاهات الشهرية
            </Typography>

            {/* Session Trend */}
            <Paper
              elevation={0}
              sx={{ p: 3, mb: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}
            >
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                عدد الجلسات الشهرية
              </Typography>
              <Grid container spacing={1}>
                {(s.monthlyTrend || []).map((m, i, arr) => {
                  const maxSessions = Math.max(...arr.map(x => x.sessions));
                  const barHeight = maxSessions ? (m.sessions / maxSessions) * 100 : 0;
                  return (
                    <Grid item xs={4} sm={2} key={i}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Box
                          sx={{
                            height: 120,
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            mb: 1,
                          }}
                        >
                          <Box
                            sx={{
                              width: 40,
                              height: `${barHeight}%`,
                              bgcolor: alpha('#1976d2', 0.7),
                              borderRadius: '8px 8px 0 0',
                              minHeight: 8,
                              transition: 'height .3s ease',
                              position: 'relative',
                            }}
                          >
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              sx={{
                                position: 'absolute',
                                top: -20,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {m.sessions}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {m.month}
                        </Typography>
                        <Chip
                          label={`+${m.improvement}%`}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ display: 'block', mx: 'auto', mt: 0.5 }}
                        />
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>

            {/* Improvement Trend */}
            <Paper
              elevation={0}
              sx={{ p: 3, mb: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}
            >
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                اتجاه معدل التحسن
              </Typography>
              <Grid container spacing={1}>
                {(s.monthlyTrend || []).map((m, i, arr) => {
                  const maxImpr = Math.max(...arr.map(x => x.improvement));
                  const barHeight = maxImpr ? (m.improvement / maxImpr) * 100 : 0;
                  return (
                    <Grid item xs={4} sm={2} key={i}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Box
                          sx={{
                            height: 100,
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            mb: 1,
                          }}
                        >
                          <Box
                            sx={{
                              width: 40,
                              height: `${barHeight}%`,
                              bgcolor: alpha('#2e7d32', 0.7),
                              borderRadius: '8px 8px 0 0',
                              minHeight: 8,
                              transition: 'height .3s ease',
                              position: 'relative',
                            }}
                          >
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              sx={{
                                position: 'absolute',
                                top: -20,
                                left: '50%',
                                transform: 'translateX(-50%)',
                              }}
                            >
                              {m.improvement}%
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {m.month}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>

            {/* Disability Distribution */}
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}
            >
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                توزيع الإعاقات
              </Typography>
              {(s.disabilityDistribution || []).map((d, i) => {
                const colors = [
                  '#1976d2',
                  '#2e7d32',
                  '#ed6c02',
                  '#9c27b0',
                  '#0288d1',
                  '#d32f2f',
                  '#455a64',
                ];
                const color = colors[i % colors.length];
                return (
                  <Box key={i} sx={{ mb: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {d.type}
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {d.count} ({d.percentage}%)
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={d.percentage}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        bgcolor: alpha(color, 0.12),
                        '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 5 },
                      }}
                    />
                  </Box>
                );
              })}
            </Paper>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
