/**
 * 📊 متابعة تقدم التأهيل — Rehab Progress Tracking
 * AlAwael ERP — Enrollment progress, session trends, goal outcomes, comparative analytics
 */
import { useState, useMemo } from 'react';
import {
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography
} from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import TimelineIcon from '@mui/icons-material/Timeline';
import GroupIcon from '@mui/icons-material/Group';
import SpeedIcon from '@mui/icons-material/Speed';
import StarIcon from '@mui/icons-material/Star';
import { CalendarIcon, ChartIcon } from 'utils/iconAliases';

/* ── Demo enrollments ── */
const DEMO_ENROLLMENTS = [
  {
    id: 'ENR-001',
    beneficiary: 'أحمد محمد',
    programName: 'برنامج التدخل المبكر',
    status: 'active',
    startDate: '2026-01-15',
    sessionsLogged: 24,
    totalSessions: 48,
    goals: [
      { description: 'تحسين التواصل البصري', progress: 75, status: 'on_track' },
      { description: 'زيادة مدة الانتباه', progress: 60, status: 'on_track' },
    ],
    scaleResults: [
      { scaleName: 'مقياس كارز-2', date: '2026-01-15', score: 38, maxScore: 60, pct: 63 },
      { scaleName: 'مقياس كارز-2', date: '2026-02-15', score: 34, maxScore: 60, pct: 57 },
      { scaleName: 'مقياس كارز-2', date: '2026-03-15', score: 30, maxScore: 60, pct: 50 },
    ],
    attendanceRate: 92,
    engagementAvg: 4.2,
  },
  {
    id: 'ENR-002',
    beneficiary: 'سارة علي',
    programName: 'برنامج التكامل الحسي',
    status: 'active',
    startDate: '2026-02-01',
    sessionsLogged: 16,
    totalSessions: 36,
    goals: [
      { description: 'تقليل الحساسية اللمسية', progress: 50, status: 'on_track' },
      { description: 'تحسين التوازن الحركي', progress: 40, status: 'at_risk' },
    ],
    scaleResults: [
      { scaleName: 'مقياس الملف الحسي', date: '2026-02-01', score: 72, maxScore: 100, pct: 72 },
      { scaleName: 'مقياس الملف الحسي', date: '2026-03-01', score: 65, maxScore: 100, pct: 65 },
    ],
    attendanceRate: 88,
    engagementAvg: 3.8,
  },
  {
    id: 'ENR-003',
    beneficiary: 'عبدالله خالد',
    programName: 'برنامج العلاج الطبيعي',
    status: 'completed',
    startDate: '2025-09-01',
    sessionsLogged: 48,
    totalSessions: 48,
    goals: [
      { description: 'المشي المستقل لمسافة 50م', progress: 100, status: 'achieved' },
      { description: 'صعود السلالم بمساعدة', progress: 90, status: 'achieved' },
    ],
    scaleResults: [
      { scaleName: 'مقياس GMFM', date: '2025-09-01', score: 45, maxScore: 100, pct: 45 },
      { scaleName: 'مقياس GMFM', date: '2025-12-01', score: 72, maxScore: 100, pct: 72 },
      { scaleName: 'مقياس GMFM', date: '2026-02-15', score: 88, maxScore: 100, pct: 88 },
    ],
    attendanceRate: 100,
    engagementAvg: 4.8,
  },
  {
    id: 'ENR-004',
    beneficiary: 'نورة فهد',
    programName: 'برنامج النطق واللغة',
    status: 'active',
    startDate: '2026-01-20',
    sessionsLogged: 20,
    totalSessions: 40,
    goals: [
      { description: 'إنتاج 50 كلمة وظيفية', progress: 55, status: 'on_track' },
      { description: 'تركيب جمل من 3 كلمات', progress: 30, status: 'at_risk' },
    ],
    scaleResults: [
      { scaleName: 'اختبار اللغة العربية', date: '2026-01-20', score: 22, maxScore: 80, pct: 28 },
      { scaleName: 'اختبار اللغة العربية', date: '2026-03-20', score: 35, maxScore: 80, pct: 44 },
    ],
    attendanceRate: 85,
    engagementAvg: 3.5,
  },
];

const statusChip = status => {
  const map = {
    active: { label: 'نشط', color: 'success' },
    completed: { label: 'مكتمل', color: 'info' },
    on_hold: { label: 'متوقف', color: 'warning' },
    graduated: { label: 'تخرّج', color: 'primary' },
  };
  const s = map[status] || { label: status, color: 'default' };
  return <Chip label={s.label} size="small" color={s.color} variant="outlined" />;
};

const goalStatusIcon = status => {
  if (status === 'achieved') return <DoneIcon fontSize="small" sx={{ color: '#4CAF50' }} />;
  if (status === 'at_risk') return <TrendDownIcon fontSize="small" sx={{ color: '#FF9800' }} />;
  return <TrendUpIcon fontSize="small" sx={{ color: '#2196F3' }} />;
};

export default function RehabProgressTracking() {
  const theme = useTheme();
  const g = theme.palette.gradients || {};

  const [tab, setTab] = useState(0); // 0=overview, 1=individual, 2=outcomes
  const [selectedEnroll, setSelectedEnroll] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  /* ── Filtered enrollments ── */
  const filtered = useMemo(() => {
    return DEMO_ENROLLMENTS.filter(e => filterStatus === 'all' || e.status === filterStatus);
  }, [filterStatus]);

  /* ── Aggregate stats ── */
  const agg = useMemo(() => {
    const total = DEMO_ENROLLMENTS.length;
    const active = DEMO_ENROLLMENTS.filter(e => e.status === 'active').length;
    const completed = DEMO_ENROLLMENTS.filter(e => e.status === 'completed').length;
    const allGoals = DEMO_ENROLLMENTS.flatMap(e => e.goals);
    const achieved = allGoals.filter(g => g.status === 'achieved').length;
    const avgProgress = allGoals.length
      ? Math.round(allGoals.reduce((s, g) => s + g.progress, 0) / allGoals.length)
      : 0;
    const avgAttendance = total
      ? Math.round(DEMO_ENROLLMENTS.reduce((s, e) => s + e.attendanceRate, 0) / total)
      : 0;
    const avgEngagement = total
      ? (DEMO_ENROLLMENTS.reduce((s, e) => s + e.engagementAvg, 0) / total).toFixed(1)
      : 0;
    return {
      total,
      active,
      completed,
      achieved,
      totalGoals: allGoals.length,
      avgProgress,
      avgAttendance,
      avgEngagement,
    };
  }, []);

  /* ── Compute trend for scale results ── */
  const computeTrend = results => {
    if (!results || results.length < 2) return { direction: 'flat', delta: 0 };
    const latest = results[results.length - 1].pct;
    const prev = results[results.length - 2].pct;
    const delta = latest - prev;
    return { direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat', delta };
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: g.info || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: alpha('#fff', 0.2) }}>
            <TimelineIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              متابعة تقدم التأهيل
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              تتبع التسجيلات — تحليل الجلسات — مؤشرات النتائج — المقارنات الزمنية
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* ── KPI Row ── */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'إجمالي التسجيلات', value: agg.total, color: '#3F51B5', icon: <GroupIcon /> },
          { label: 'تسجيلات نشطة', value: agg.active, color: '#4CAF50', icon: <ChartIcon /> },
          {
            label: 'متوسط التقدم',
            value: `${agg.avgProgress}%`,
            color: '#FF9800',
            icon: <SpeedIcon />,
          },
          {
            label: 'الأهداف المحققة',
            value: `${agg.achieved}/${agg.totalGoals}`,
            color: '#E91E63',
            icon: <TrophyIcon />,
          },
          {
            label: 'معدل الحضور',
            value: `${agg.avgAttendance}%`,
            color: '#009688',
            icon: <CalendarIcon />,
          },
          {
            label: 'متوسط التفاعل',
            value: `${agg.avgEngagement}/5`,
            color: '#7C4DFF',
            icon: <StarIcon />,
          },
        ].map((kpi, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Card sx={{ borderRadius: 2, borderTop: `3px solid ${kpi.color}` }}>
              <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                <Avatar
                  sx={{
                    mx: 'auto',
                    mb: 0.5,
                    width: 36,
                    height: 36,
                    bgcolor: alpha(kpi.color, 0.1),
                    color: kpi.color,
                  }}
                >
                  {kpi.icon}
                </Avatar>
                <Typography variant="h6" fontWeight={700} color={kpi.color}>
                  {kpi.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {kpi.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Tabs ── */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            setSelectedEnroll(null);
          }}
          variant="fullWidth"
        >
          <Tab icon={<ChartIcon />} label="النظرة العامة" />
          <Tab icon={<AssessIcon />} label="التقدم الفردي" />
          <Tab icon={<TrophyIcon />} label="مؤشرات النتائج" />
        </Tabs>
      </Paper>

      {/* ═══════ TAB 0: Overview ═══════ */}
      {tab === 0 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={700}>
              جميع التسجيلات
            </Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>الحالة</InputLabel>
              <Select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                label="الحالة"
              >
                <MenuItem value="all">الكل</MenuItem>
                <MenuItem value="active">نشط</MenuItem>
                <MenuItem value="completed">مكتمل</MenuItem>
                <MenuItem value="on_hold">متوقف</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Grid container spacing={2}>
            {filtered.map(enr => {
              const sessionPct = enr.totalSessions
                ? Math.round((enr.sessionsLogged / enr.totalSessions) * 100)
                : 0;
              const totalGoalProg = enr.goals.length
                ? Math.round(enr.goals.reduce((s, g) => s + g.progress, 0) / enr.goals.length)
                : 0;
              return (
                <Grid item xs={12} sm={6} key={enr.id}>
                  <Card
                    sx={{
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: '0.2s',
                      '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
                      borderRight: `4px solid ${enr.status === 'completed' ? '#4CAF50' : '#2196F3'}`,
                    }}
                    onClick={() => {
                      setSelectedEnroll(enr);
                      setTab(1);
                    }}
                  >
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" mb={1}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {enr.beneficiary}
                        </Typography>
                        {statusChip(enr.status)}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        {enr.programName} — بدأ: {enr.startDate}
                      </Typography>

                      {/* Sessions progress */}
                      <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>
                          الجلسات
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={sessionPct}
                          sx={{
                            flex: 1,
                            height: 8,
                            borderRadius: 4,
                            bgcolor: alpha('#2196F3', 0.1),
                            '& .MuiLinearProgress-bar': { bgcolor: '#2196F3', borderRadius: 4 },
                          }}
                        />
                        <Typography variant="caption" fontWeight={600}>
                          {enr.sessionsLogged}/{enr.totalSessions}
                        </Typography>
                      </Stack>

                      {/* Goals progress */}
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>
                          الأهداف
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={totalGoalProg}
                          sx={{
                            flex: 1,
                            height: 8,
                            borderRadius: 4,
                            bgcolor: alpha('#4CAF50', 0.1),
                            '& .MuiLinearProgress-bar': {
                              bgcolor: totalGoalProg >= 70 ? '#4CAF50' : '#FF9800',
                              borderRadius: 4,
                            },
                          }}
                        />
                        <Typography variant="caption" fontWeight={600}>
                          {totalGoalProg}%
                        </Typography>
                      </Stack>

                      {/* Attendance & Engagement */}
                      <Stack direction="row" spacing={2} mt={1}>
                        <Chip
                          icon={<CalendarIcon />}
                          label={`حضور ${enr.attendanceRate}%`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          icon={<StarIcon />}
                          label={`تفاعل ${enr.engagementAvg}/5`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* ═══════ TAB 1: Individual Progress ═══════ */}
      {tab === 1 && (
        <Box>
          {!selectedEnroll ? (
            <Box>
              <Typography variant="h6" fontWeight={700} mb={2}>
                اختر مستفيداً لعرض التفاصيل
              </Typography>
              <Grid container spacing={2}>
                {DEMO_ENROLLMENTS.map(enr => (
                  <Grid item xs={12} sm={6} md={4} key={enr.id}>
                    <Card
                      sx={{ borderRadius: 2, cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
                      onClick={() => setSelectedEnroll(enr)}
                    >
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Avatar
                          sx={{
                            mx: 'auto',
                            mb: 1,
                            width: 48,
                            height: 48,
                            bgcolor: alpha('#3F51B5', 0.1),
                            color: '#3F51B5',
                          }}
                        >
                          {enr.beneficiary.charAt(0)}
                        </Avatar>
                        <Typography fontWeight={700}>{enr.beneficiary}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {enr.programName}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <Box>
              <Button onClick={() => setSelectedEnroll(null)} sx={{ mb: 2 }}>
                &rarr; العودة لقائمة المستفيدين
              </Button>

              {/* Beneficiary header */}
              <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: alpha('#3F51B5', 0.03) }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ width: 56, height: 56, bgcolor: '#3F51B5', fontSize: 24 }}>
                    {selectedEnroll.beneficiary.charAt(0)}
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight={700}>
                      {selectedEnroll.beneficiary}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedEnroll.programName}
                    </Typography>
                  </Box>
                  {statusChip(selectedEnroll.status)}
                </Stack>
              </Paper>

              {/* Quick stats */}
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      الجلسات
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="primary">
                      {selectedEnroll.sessionsLogged}/{selectedEnroll.totalSessions}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      الحضور
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="success.main">
                      {selectedEnroll.attendanceRate}%
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      التفاعل
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="warning.main">
                      {selectedEnroll.engagementAvg}/5
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      بدء البرنامج
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {selectedEnroll.startDate}
                    </Typography>
                  </Card>
                </Grid>
              </Grid>

              {/* Goals section */}
              <Typography variant="h6" fontWeight={700} mb={1}>
                الأهداف الفردية
              </Typography>
              <Grid container spacing={2} mb={3}>
                {selectedEnroll.goals.map((goal, i) => (
                  <Grid item xs={12} sm={6} key={i}>
                    <Card
                      sx={{
                        borderRadius: 2,
                        borderRight: `4px solid ${goal.progress >= 70 ? '#4CAF50' : goal.progress >= 40 ? '#FF9800' : '#F44336'}`,
                      }}
                    >
                      <CardContent>
                        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                          {goalStatusIcon(goal.status)}
                          <Typography variant="subtitle2" fontWeight={700}>
                            {goal.description}
                          </Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <LinearProgress
                            variant="determinate"
                            value={goal.progress}
                            sx={{
                              flex: 1,
                              height: 10,
                              borderRadius: 5,
                              '& .MuiLinearProgress-bar': {
                                bgcolor:
                                  goal.progress >= 70
                                    ? '#4CAF50'
                                    : goal.progress >= 40
                                      ? '#FF9800'
                                      : '#F44336',
                                borderRadius: 5,
                              },
                            }}
                          />
                          <Typography variant="body2" fontWeight={700}>
                            {goal.progress}%
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Scale results over time */}
              <Typography variant="h6" fontWeight={700} mb={1}>
                نتائج المقاييس عبر الزمن
              </Typography>
              {selectedEnroll.scaleResults.length > 0 ? (
                <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha('#7C4DFF', 0.05) }}>
                        <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>المقياس</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          الدرجة
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          النسبة
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          الاتجاه
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedEnroll.scaleResults.map((r, i) => {
                        const prev = i > 0 ? selectedEnroll.scaleResults[i - 1].pct : null;
                        const delta = prev !== null ? r.pct - prev : null;
                        return (
                          <TableRow key={i} hover>
                            <TableCell>{r.date}</TableCell>
                            <TableCell>{r.scaleName}</TableCell>
                            <TableCell align="center">
                              {r.score}/{r.maxScore}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${r.pct}%`}
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  bgcolor: alpha(
                                    r.pct >= 70 ? '#4CAF50' : r.pct >= 40 ? '#FF9800' : '#F44336',
                                    0.1
                                  ),
                                }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              {delta !== null ? (
                                <Chip
                                  icon={
                                    delta > 0 ? (
                                      <ArrowUpIcon />
                                    ) : delta < 0 ? (
                                      <ArrowDownIcon />
                                    ) : (
                                      <FlatIcon />
                                    )
                                  }
                                  label={`${delta > 0 ? '+' : ''}${delta}%`}
                                  size="small"
                                  sx={{
                                    fontWeight: 700,
                                    color:
                                      delta > 0 ? '#4CAF50' : delta < 0 ? '#F44336' : '#757575',
                                    bgcolor: alpha(
                                      delta > 0 ? '#4CAF50' : delta < 0 ? '#F44336' : '#757575',
                                      0.08
                                    ),
                                  }}
                                />
                              ) : (
                                '—'
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info" sx={{ mb: 3 }}>
                  لا توجد نتائج مقاييس مسجلة بعد
                </Alert>
              )}

              {/* Progress summary */}
              {(() => {
                const trend = computeTrend(selectedEnroll.scaleResults);
                return (
                  <Paper
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: alpha(
                        trend.direction === 'up'
                          ? '#4CAF50'
                          : trend.direction === 'down'
                            ? '#F44336'
                            : '#757575',
                        0.05
                      ),
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      {trend.direction === 'up' && (
                        <TrendUpIcon sx={{ fontSize: 40, color: '#4CAF50' }} />
                      )}
                      {trend.direction === 'down' && (
                        <TrendDownIcon sx={{ fontSize: 40, color: '#F44336' }} />
                      )}
                      {trend.direction === 'flat' && (
                        <FlatIcon sx={{ fontSize: 40, color: '#757575' }} />
                      )}
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {trend.direction === 'up'
                            ? 'تحسّن ملحوظ في الأداء'
                            : trend.direction === 'down'
                              ? 'تراجع يحتاج متابعة'
                              : 'أداء مستقر'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {trend.delta !== 0
                            ? `آخر تغيير: ${trend.delta > 0 ? '+' : ''}${trend.delta}% في النسبة المئوية`
                            : 'لم يتغير الأداء في آخر قياسين'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                );
              })()}
            </Box>
          )}
        </Box>
      )}

      {/* ═══════ TAB 2: Outcomes ═══════ */}
      {tab === 2 && (
        <Box>
          <Typography variant="h6" fontWeight={700} mb={2}>
            مؤشرات النتائج الشاملة
          </Typography>

          {/* Overall metrics */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>
                  معدل تحقيق الأهداف حسب المستفيد
                </Typography>
                {DEMO_ENROLLMENTS.map(enr => {
                  const avgGoal = enr.goals.length
                    ? Math.round(enr.goals.reduce((s, g) => s + g.progress, 0) / enr.goals.length)
                    : 0;
                  return (
                    <Box key={enr.id} mb={1.5}>
                      <Stack direction="row" justifyContent="space-between" mb={0.3}>
                        <Typography variant="body2" fontWeight={600}>
                          {enr.beneficiary}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color={avgGoal >= 70 ? 'success.main' : 'warning.main'}
                        >
                          {avgGoal}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={avgGoal}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          '& .MuiLinearProgress-bar': {
                            bgcolor:
                              avgGoal >= 70 ? '#4CAF50' : avgGoal >= 40 ? '#FF9800' : '#F44336',
                            borderRadius: 4,
                          },
                        }}
                      />
                    </Box>
                  );
                })}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>
                  معدل الحضور والتفاعل
                </Typography>
                {DEMO_ENROLLMENTS.map(enr => (
                  <Box key={enr.id} mb={1.5}>
                    <Typography variant="body2" fontWeight={600} mb={0.3}>
                      {enr.beneficiary}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        icon={<CalendarIcon />}
                        label={`${enr.attendanceRate}%`}
                        size="small"
                        sx={{
                          bgcolor: alpha(enr.attendanceRate >= 90 ? '#4CAF50' : '#FF9800', 0.1),
                        }}
                      />
                      <Chip
                        icon={<StarIcon />}
                        label={`${enr.engagementAvg}/5`}
                        size="small"
                        sx={{ bgcolor: alpha(enr.engagementAvg >= 4 ? '#7C4DFF' : '#FF9800', 0.1) }}
                      />
                      <Chip label={enr.programName} size="small" variant="outlined" />
                    </Stack>
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>

          {/* Scale improvement summary */}
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              ملخص التحسن في المقاييس
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha('#009688', 0.05) }}>
                    <TableCell sx={{ fontWeight: 700 }}>المستفيد</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المقياس</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      القياس الأول
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      القياس الأخير
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      التغيير
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      الحكم
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {DEMO_ENROLLMENTS.map(enr => {
                    if (enr.scaleResults.length < 2) return null;
                    const first = enr.scaleResults[0];
                    const last = enr.scaleResults[enr.scaleResults.length - 1];
                    const change = last.pct - first.pct;
                    return (
                      <TableRow key={enr.id} hover>
                        <TableCell>{enr.beneficiary}</TableCell>
                        <TableCell>{first.scaleName}</TableCell>
                        <TableCell align="center">{first.pct}%</TableCell>
                        <TableCell align="center">{last.pct}%</TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={
                              change > 0 ? (
                                <ArrowUpIcon />
                              ) : change < 0 ? (
                                <ArrowDownIcon />
                              ) : (
                                <FlatIcon />
                              )
                            }
                            label={`${change > 0 ? '+' : ''}${change}%`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              color: change > 0 ? '#4CAF50' : change < 0 ? '#F44336' : '#757575',
                              bgcolor: alpha(
                                change > 0 ? '#4CAF50' : change < 0 ? '#F44336' : '#757575',
                                0.08
                              ),
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={
                              change > 5
                                ? 'تحسّن ممتاز'
                                : change > 0
                                  ? 'تحسّن طفيف'
                                  : change === 0
                                    ? 'ثابت'
                                    : 'تراجع'
                            }
                            size="small"
                            color={
                              change > 5
                                ? 'success'
                                : change > 0
                                  ? 'info'
                                  : change === 0
                                    ? 'default'
                                    : 'error'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
