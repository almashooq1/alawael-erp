/**
 * ♿ لوحة تحكم تأهيل ذوي الإعاقة — Disability Rehabilitation Dashboard
 * AlAwael ERP — Unified overview: KPIs, distribution, trends, recent programs & sessions
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
  LinearProgress,
  Divider,  Button,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import {
  AccessibleForward as RehabIcon,
  TrendingUp as TrendIcon,
  People as PeopleIcon,
  EventNote as SessionIcon,
  EmojiEvents as GoalIcon,
  Devices as DevicesIcon,
  LocalHospital as TherapistIcon,
  Refresh as RefreshIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from 'contexts/SnackbarContext';
import {
  rehabReportService,
  rehabProgramService,
  therapySessionService,
  assistiveDeviceService,
} from 'services/disabilityRehabService';

/* ───── helpers ───── */
const fmtNum = n => (n ?? 0).toLocaleString('ar-SA');
const pctColor = v => (v >= 80 ? 'success' : v >= 50 ? 'warning' : 'error');

export default function DisabilityRehabDashboard() {
  const theme = useTheme();
  const { user: _user } = useAuth();
  const { showSnackbar: _showSnackbar } = useSnackbar();
  const g = theme.palette.gradients || {};

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [deviceStats, setDeviceStats] = useState(null);
  const [tab, setTab] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [st, pr, ss, ds] = await Promise.all([
        rehabReportService.getStatistics(),
        rehabProgramService.getAll(),
        therapySessionService.getAll(),
        assistiveDeviceService.getAll(),
      ]);
      setStats(st || rehabReportService.getMockDashboard());
      setPrograms((pr?.programs || pr?.data || rehabProgramService.getMockPrograms()).slice(0, 5));
      setSessions(
        (ss?.sessions || ss?.data || therapySessionService.getMockSessions()).slice(0, 6)
      );
      setDeviceStats(ds?.stats || assistiveDeviceService.getMockStats());
    } catch {
      setStats(rehabReportService.getMockDashboard());
      setPrograms(rehabProgramService.getMockPrograms().slice(0, 5));
      setSessions(therapySessionService.getMockSessions().slice(0, 6));
      setDeviceStats(assistiveDeviceService.getMockStats());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 12 }}>
        <CircularProgress size={48} />
      </Box>
    );
  const s = stats || rehabReportService.getMockDashboard();
  const ds = deviceStats || assistiveDeviceService.getMockStats();

  /* ───── KPI Cards ───── */
  const kpis = [
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
      icon: <RehabIcon />,
      color: '#2e7d32',
      bg: 'linear-gradient(135deg,#2e7d32 0%,#66bb6a 100%)',
    },
    {
      label: 'جلسات اليوم',
      value: fmtNum(s.todaySessions),
      icon: <SessionIcon />,
      color: '#ed6c02',
      bg: 'linear-gradient(135deg,#ed6c02 0%,#ffa726 100%)',
    },
    {
      label: 'المعالجون',
      value: fmtNum(s.totalTherapists),
      icon: <TherapistIcon />,
      color: '#9c27b0',
      bg: 'linear-gradient(135deg,#9c27b0 0%,#ba68c8 100%)',
    },
    {
      label: 'معدل التحسن',
      value: `${s.avgImprovement || 0}%`,
      icon: <TrendIcon />,
      color: '#0288d1',
      bg: 'linear-gradient(135deg,#0288d1 0%,#4fc3f7 100%)',
    },
    {
      label: 'تحقيق الأهداف',
      value: `${s.goalAchievementRate || 0}%`,
      icon: <GoalIcon />,
      color: '#388e3c',
      bg: 'linear-gradient(135deg,#388e3c 0%,#81c784 100%)',
    },
  ];

  /* ───── Status Badge ───── */
  const statusChip = st => {
    const map = {
      active: { l: 'نشط', c: 'success' },
      completed: { l: 'مكتمل', c: 'info' },
      suspended: { l: 'معلّق', c: 'warning' },
      scheduled: { l: 'مجدول', c: 'info' },
      in_progress: { l: 'جاري', c: 'warning' },
      cancelled: { l: 'ملغي', c: 'error' },
    };
    const m = map[st] || { l: st, c: 'default' };
    return <Chip label={m.l} color={m.c} size="small" />;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 3,
          borderRadius: 3,
          background: g.primary || 'linear-gradient(135deg,#1565c0 0%,#0d47a1 100%)',
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
              ♿ نظام تأهيل ذوي الإعاقة
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5, opacity: 0.9 }}>
              لوحة التحكم الرئيسية — إدارة البرامج التأهيلية والجلسات العلاجية
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
          </Stack>
        </Stack>
      </Paper>

      {/* ── KPI Row ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((k, i) => (
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
                    width: 44,
                    height: 44,
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

      {/* ── Performance Bars ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إكمال الجلسات', value: s.sessionCompletionRate || 0 },
          { label: 'متوسط التقدم', value: s.avgProgress || 0 },
          { label: 'رضا المستفيدين', value: s.satisfactionRate || 0 },
        ].map((b, i) => (
          <Grid item xs={12} md={4} key={i}>
            <Paper
              elevation={0}
              sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {b.label}
                </Typography>
                <Typography variant="body2" fontWeight={700} color={pctColor(b.value) + '.main'}>
                  {b.value}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={b.value}
                color={pctColor(b.value)}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── Disability Distribution + Devices summary ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              height: '100%',
            }}
          >
            <Typography variant="h6" fontWeight={700} gutterBottom>
              📊 توزيع الإعاقات
            </Typography>
            <Grid container spacing={1} sx={{ mt: 1 }}>
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
                return (
                  <Grid item xs={6} sm={4} key={i}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(colors[i % colors.length], 0.08),
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="h5" fontWeight={700} color={colors[i % colors.length]}>
                        {d.count}
                      </Typography>
                      <Typography variant="caption">{d.type}</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={d.percentage}
                        sx={{
                          mt: 0.5,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: alpha(colors[i % colors.length], 0.15),
                          '& .MuiLinearProgress-bar': { bgcolor: colors[i % colors.length] },
                        }}
                      />
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              height: '100%',
            }}
          >
            <Typography variant="h6" fontWeight={700} gutterBottom>
              🦽 الأجهزة المساعدة
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {[
                {
                  label: 'إجمالي الأجهزة',
                  value: fmtNum(ds.total),
                  icon: <DevicesIcon />,
                  color: '#1976d2',
                },
                {
                  label: 'مخصصة',
                  value: fmtNum(ds.assigned),
                  icon: <CheckIcon />,
                  color: '#2e7d32',
                },
                {
                  label: 'متاحة',
                  value: fmtNum(ds.available),
                  icon: <SpeedIcon />,
                  color: '#ed6c02',
                },
                {
                  label: 'في الصيانة',
                  value: fmtNum(ds.maintenance),
                  icon: <WarningIcon />,
                  color: '#d32f2f',
                },
              ].map((r, i) => (
                <Stack key={i} direction="row" alignItems="center" spacing={2}>
                  <Avatar
                    sx={{ bgcolor: alpha(r.color, 0.12), color: r.color, width: 36, height: 36 }}
                  >
                    {r.icon}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {r.label}
                    </Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    {r.value}
                  </Typography>
                </Stack>
              ))}
              <Divider />
              <Typography variant="body2" color="text.secondary">
                القيمة الإجمالية: <b>{fmtNum(ds.totalValue)} ر.س</b>
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Monthly Trend ── */}
      <Paper
        elevation={0}
        sx={{ p: 3, mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}
      >
        <Typography variant="h6" fontWeight={700} gutterBottom>
          📈 الاتجاه الشهري — الجلسات والتحسن
        </Typography>
        <Grid container spacing={1} sx={{ mt: 1 }}>
          {(s.monthlyTrend || []).map((m, i) => (
            <Grid item xs={4} sm={2} key={i}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha('#1976d2', 0.05),
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {m.month}
                </Typography>
                <Typography variant="h6" fontWeight={700} color="primary">
                  {m.sessions}
                </Typography>
                <Chip
                  label={`+${m.improvement}%`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* ── Tabs: Recent Programs / Today's Sessions ── */}
      <Paper
        elevation={0}
        sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
        >
          <Tab label="📋 أحدث البرامج التأهيلية" />
          <Tab label="🕒 جلسات اليوم" />
        </Tabs>

        {tab === 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#1976d2', 0.05) }}>
                  <TableCell sx={{ fontWeight: 700 }}>البرنامج</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المستفيد</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المعالج</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>نوع الإعاقة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التقدم</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {programs.map(p => (
                  <TableRow key={p._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {p.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.programNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>{p.beneficiary?.name}</TableCell>
                    <TableCell>{p.therapist}</TableCell>
                    <TableCell>
                      <Chip label={p.disabilityType} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ minWidth: 120 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <LinearProgress
                          variant="determinate"
                          value={p.progress}
                          color={pctColor(p.progress)}
                          sx={{ flex: 1, height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption" fontWeight={600}>
                          {p.progress}%
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{statusChip(p.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === 1 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#ed6c02', 0.05) }}>
                  <TableCell sx={{ fontWeight: 700 }}>الوقت</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المستفيد</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المعالج</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الغرفة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المدة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.map(ss => (
                  <TableRow key={ss._id} hover>
                    <TableCell>
                      <Chip
                        icon={<ScheduleIcon />}
                        label={ss.time}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{ss.beneficiary}</TableCell>
                    <TableCell>{ss.therapist}</TableCell>
                    <TableCell>{ss.category}</TableCell>
                    <TableCell>{ss.room}</TableCell>
                    <TableCell>{ss.duration} د</TableCell>
                    <TableCell>{statusChip(ss.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
