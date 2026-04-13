import { useState, useEffect, useCallback } from 'react';
import {
  alpha,
} from '@mui/material';




import { useNavigate } from 'react-router-dom';
import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { gradients, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';

/* ────────────────────────────── helpers ────────────────────────────── */
const statCardGradients = [
  gradients.primary,
  gradients.warning,
  gradients.info,
  gradients.success,
  gradients.accent || gradients.primary,
  gradients.ocean || gradients.info,
  gradients.orange || gradients.warning,
  gradients.fire || gradients.warning,
];

const STATUS_MAP = {
  completed: { label: 'مكتمل', color: '#43A047' },
  in_progress: { label: 'جاري', color: '#FF9800' },
  scheduled: { label: 'محدد', color: '#1E88E5' },
  cancelled: { label: 'ملغي', color: '#E53935' },
  no_show: { label: 'لم يحضر', color: '#9E9E9E' },
};

const PRIORITY_MAP = {
  critical: { label: 'حرج', color: '#D32F2F', muiColor: 'error' },
  high: { label: 'عاجل', color: '#E53935', muiColor: 'error' },
  medium: { label: 'متوسط', color: '#FF9800', muiColor: 'warning' },
  low: { label: 'عادي', color: '#43A047', muiColor: 'success' },
};

const ACTIVITY_ICONS = {
  session: <EventIcon fontSize="small" />,
  report: <ReportsIcon fontSize="small" />,
  assessment: <CasesIcon fontSize="small" />,
  message: <MessageIcon fontSize="small" />,
  case: <DocsIcon fontSize="small" />,
};

/* ────────────────────────────── component ────────────────────────────── */
const TherapistDashboard = () => {
  const showSnackbar = useSnackbar();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const [therapistData, setTherapistData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await therapistService.getTherapistDashboard(userId);
      setTherapistData(data);
    } catch (error) {
      logger.error('Error loading therapist dashboard:', error);
      showSnackbar('حدث خطأ في تحميل لوحة المعالج', 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, showSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ═══ Loading / Error states ═══ */
  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>جاري التحميل...</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Container>
    );
  }
  if (!therapistData) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="error">حدث خطأ في تحميل البيانات</Typography>
        <Button onClick={loadData} sx={{ mt: 2 }}>
          إعادة المحاولة
        </Button>
      </Container>
    );
  }

  const {
    therapist,
    stats,
    todaySessions,
    urgentCases,
    monthlyStats,
    weeklyTrend,
    improvementTrend,
    sessionTypeDistribution,
    recentActivity,
    notifications,
  } = therapistData;
  const unreadNotifs = (notifications || []).filter(n => !n.read).length;

  /* ═══ Stat cards definition ═══ */
  const statCards = [
    {
      label: 'المرضى النشطين',
      value: stats.activePatients,
      sub: `من ${stats.totalPatients} مريض`,
      icon: <PersonIcon />,
      path: '/therapist-portal/patients',
    },
    {
      label: 'الجلسات الأسبوعية',
      value: stats.weeklySessions,
      sub: `مكتملة: ${stats.completedSessions}`,
      icon: <EventIcon />,
      path: '/therapist-portal/sessions',
    },
    {
      label: 'معدل التحسن',
      value: `${stats.improvementRate}%`,
      sub: `+${stats.improvementTrend}% هذا الشهر`,
      icon: <TrendingUpIcon />,
      path: '/therapist-portal/reports',
    },
    {
      label: 'رضا المرضى',
      value: `${stats.patientSatisfaction}%`,
      sub: `${stats.totalRatings} تقييم`,
      icon: <VerifiedUserIcon />,
      path: '/therapist-portal/reports',
    },
    {
      label: 'تقارير معلقة',
      value: stats.pendingReports,
      sub: 'بحاجة لإكمال',
      icon: <ReportsIcon />,
      path: '/therapist-portal/reports',
    },
    {
      label: 'تقييمات قادمة',
      value: stats.upcomingAssessments,
      sub: 'خلال الأسبوع',
      icon: <CasesIcon />,
      path: '/therapist-portal/cases',
    },
    {
      label: 'متوسط الجلسة',
      value: `${stats.avgSessionDuration} د`,
      sub: 'دقيقة لكل جلسة',
      icon: <ClockIcon />,
      path: '/therapist-portal/schedule',
    },
    {
      label: 'ساعات الشهر',
      value: stats.monthlyHours,
      sub: 'ساعة عمل',
      icon: <SpeedIcon />,
      path: '/therapist-portal/reports',
    },
  ];

  /* ═══ Navigation cards ═══ */
  const navCards = [
    {
      label: 'المرضى',
      desc: 'إدارة ملفات و متابعة المرضى',
      icon: '👥',
      path: '/therapist-portal/patients',
      color: '#1E88E5',
    },
    {
      label: 'الجدول',
      desc: 'جدول الجلسات الأسبوعي',
      icon: '📅',
      path: '/therapist-portal/schedule',
      color: '#9C27B0',
    },
    {
      label: 'الجلسات',
      desc: 'سجل الجلسات العلاجية',
      icon: '🏥',
      path: '/therapist-portal/sessions',
      color: '#43A047',
    },
    {
      label: 'الحالات',
      desc: 'خطط العلاج و الأهداف',
      icon: '📋',
      path: '/therapist-portal/cases',
      color: '#FF9800',
    },
    {
      label: 'المستندات',
      desc: 'التقارير والملفات الطبية',
      icon: '📄',
      path: '/therapist-portal/documents',
      color: '#E53935',
    },
    {
      label: 'التقارير',
      desc: 'التحليلات والإحصائيات',
      icon: '📊',
      path: '/therapist-portal/reports',
      color: '#00BCD4',
    },
    {
      label: 'الرسائل',
      desc: 'التواصل مع أولياء الأمور',
      icon: '💬',
      path: '/therapist-portal/messages',
      color: '#795548',
    },
  ];

  /* ═══ RENDER ═══ */
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* ─────────── HEADER ─────────── */}
      <Box
        sx={{
          background: gradients.primary,
          borderRadius: 3,
          p: 3,
          mb: 3,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            left: -40,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -60,
            right: -30,
            width: 250,
            height: 250,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }}
        />
        <Grid container spacing={2} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid item>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                background: gradients.warning,
                fontSize: '1.8rem',
                fontWeight: 'bold',
                border: '3px solid rgba(255,255,255,0.3)',
              }}
            >
              {therapist.name?.charAt(0) || 'د'}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              مرحباً، دكتور {therapist.name}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>
              {therapist.specialization} • {therapist.department || therapist.clinic}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
              <Chip
                label={therapist.experience}
                size="small"
                sx={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '0.7rem' }}
              />
              <Chip
                label={therapist.licenseNo || 'مُرخص'}
                size="small"
                sx={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '0.7rem' }}
              />
              <Chip
                icon={<StarIcon sx={{ color: '#FFD700 !important', fontSize: 16 }} />}
                label={`${stats.patientSatisfaction}% رضا`}
                size="small"
                sx={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '0.7rem' }}
              />
            </Box>
          </Grid>
          <Grid item>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="التنبيهات">
                <IconButton sx={{ color: 'white' }}>
                  <Badge badgeContent={unreadNotifs} color="error">
                    <NotifIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title="تحديث">
                <IconButton sx={{ color: 'white' }} onClick={loadData}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* ─────────── STAT CARDS ─────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((c, i) => (
          <Grid item xs={6} sm={4} md={3} lg={1.5} key={c.label}>
            <Card
              sx={{
                height: '100%',
                background: statCardGradients[i % statCardGradients.length],
                color: 'white',
                borderRadius: 2,
                boxShadow: 3,
                cursor: 'pointer',
                transition: 'all .3s',
                '&:hover': { transform: 'translateY(-6px)', boxShadow: 8 },
              }}
              onClick={() => navigate(c.path)}
            >
              <CardContent sx={{ p: '12px !important', textAlign: 'center' }}>
                <Avatar
                  sx={{
                    background: 'rgba(255,255,255,0.25)',
                    width: 40,
                    height: 40,
                    mx: 'auto',
                    mb: 1,
                  }}
                >
                  {c.icon}
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 'bold', lineHeight: 1.1 }}>
                  {c.value}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.85, display: 'block', mt: 0.3 }}>
                  {c.label}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.65rem' }}>
                  {c.sub}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ─────────── TABS ─────────── */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2 }}
        >
          <Tab label="نظرة عامة" icon={<SpeedIcon />} iconPosition="start" />
          <Tab label="جلسات اليوم" icon={<CalendarIcon />} iconPosition="start" />
          <Tab label="التحليلات" icon={<ReportsIcon />} iconPosition="start" />
          <Tab label="أقسام البوابة" icon={<CasesIcon />} iconPosition="start" />
          <Tab label="رؤى ذكية" icon={<AIIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ═══════ TAB 0 — Overview ═══════ */}
      {tab === 0 && (
        <Grid container spacing={3}>
          {/* Today's sessions quick view */}
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 2, boxShadow: 3, height: '100%' }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    📅 جلسات اليوم
                  </Typography>
                  <Button
                    size="small"
                    endIcon={<ArrowIcon />}
                    onClick={() => navigate('/therapist-portal/schedule')}
                  >
                    عرض الجدول
                  </Button>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>الوقت</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>المريض</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>الغرفة</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(todaySessions || []).map(s => {
                        const st = STATUS_MAP[s.status] || { label: s.status, color: '#757575' };
                        return (
                          <TableRow
                            key={s.id}
                            hover
                            sx={{ '&:hover': { backgroundColor: alpha('#1E88E5', 0.04) } }}
                          >
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {s.status === 'completed' && (
                                  <CheckIcon sx={{ color: '#43A047', fontSize: 16 }} />
                                )}
                                {s.status === 'in_progress' && (
                                  <PlayIcon sx={{ color: '#FF9800', fontSize: 16 }} />
                                )}
                                {s.status === 'cancelled' && (
                                  <CancelIcon sx={{ color: '#E53935', fontSize: 16 }} />
                                )}
                                {s.status === 'scheduled' && (
                                  <ScheduleIcon sx={{ color: '#1E88E5', fontSize: 16 }} />
                                )}
                                <Typography variant="body2">
                                  {s.time} - {s.endTime}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar
                                  sx={{
                                    width: 30,
                                    height: 30,
                                    fontSize: '0.8rem',
                                    background: gradients.primary,
                                  }}
                                >
                                  {s.patient?.name?.charAt(0) || '?'}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {s.patient?.name}
                                  </Typography>
                                  {s.patient?.age && (
                                    <Typography variant="caption" color="text.secondary">
                                      {s.patient.age} سنوات
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip label={s.typeLabel || s.type} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{s.room}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={st.label}
                                size="small"
                                sx={{
                                  background: alpha(st.color, 0.12),
                                  color: st.color,
                                  fontWeight: 600,
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Urgent cases + Notifications */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, boxShadow: 3, mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  ⚠️ حالات عاجلة
                </Typography>
                {(urgentCases || []).map(c => {
                  const p = PRIORITY_MAP[c.priority] || PRIORITY_MAP.medium;
                  return (
                    <Box
                      key={c.id}
                      sx={{
                        p: 1.5,
                        mb: 1.5,
                        backgroundColor: alpha(p.color, 0.08),
                        borderRight: `4px solid ${p.color}`,
                        borderRadius: 1,
                        cursor: 'pointer',
                        transition: 'all .2s',
                        '&:hover': { backgroundColor: alpha(p.color, 0.15) },
                      }}
                      onClick={() => navigate('/therapist-portal/cases')}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'start',
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {c.patientName}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: neutralColors.textSecondary, display: 'block', mt: 0.3 }}
                          >
                            {c.issue}
                          </Typography>
                        </Box>
                        <Chip
                          label={p.label}
                          size="small"
                          color={p.muiColor}
                          sx={{ ml: 1, minWidth: 50 }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
            <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                  🔔 آخر النشاطات
                </Typography>
                <List dense disablePadding>
                  {(recentActivity || []).slice(0, 5).map(a => (
                    <ListItem key={a.id} disablePadding sx={{ mb: 1 }}>
                      <ListItemAvatar sx={{ minWidth: 36 }}>
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            background: alpha('#1E88E5', 0.1),
                            color: '#1E88E5',
                          }}
                        >
                          {ACTIVITY_ICONS[a.type] || <DotIcon fontSize="small" />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {a.action}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {a.detail} • {a.time}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Weekly trend chart */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  📈 الجلسات الأسبوعية
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={weeklyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <RTooltip />
                    <Legend />
                    <Bar dataKey="sessions" fill="#1E88E5" name="مجدولة" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" fill="#43A047" name="مكتملة" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Session type distribution */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  🎯 توزيع أنواع الجلسات
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={sessionTypeDistribution || []}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {(sessionTypeDistribution || []).map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ═══════ TAB 1 — Today's sessions detail ═══════ */}
      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    📋 جلسات اليوم التفصيلية
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={`مكتملة: ${(todaySessions || []).filter(s => s.status === 'completed').length}`}
                      color="success"
                      size="small"
                    />
                    <Chip
                      label={`جارية: ${(todaySessions || []).filter(s => s.status === 'in_progress').length}`}
                      color="warning"
                      size="small"
                    />
                    <Chip
                      label={`قادمة: ${(todaySessions || []).filter(s => s.status === 'scheduled').length}`}
                      color="primary"
                      size="small"
                    />
                  </Box>
                </Box>
                <Grid container spacing={2}>
                  {(todaySessions || []).map(s => {
                    const st = STATUS_MAP[s.status] || { label: s.status, color: '#757575' };
                    return (
                      <Grid item xs={12} sm={6} md={4} key={s.id}>
                        <Card
                          variant="outlined"
                          sx={{
                            borderRight: `4px solid ${st.color}`,
                            transition: 'all .2s',
                            '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                          }}
                        >
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Chip
                                label={`${s.time} - ${s.endTime}`}
                                size="small"
                                icon={<ClockIcon />}
                              />
                              <Chip
                                label={st.label}
                                size="small"
                                sx={{
                                  background: alpha(st.color, 0.12),
                                  color: st.color,
                                  fontWeight: 600,
                                }}
                              />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Avatar sx={{ width: 36, height: 36, background: gradients.primary }}>
                                {s.patient?.name?.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {s.patient?.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {s.patient?.age} سنوات
                                </Typography>
                              </Box>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="caption">
                                <b>النوع:</b> {s.typeLabel || s.type}
                              </Typography>
                              <Typography variant="caption">
                                <b>الغرفة:</b> {s.room}
                              </Typography>
                            </Box>
                            {s.notes && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mt: 0.5 }}
                              >
                                📝 {s.notes}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Monthly summary cards */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  📊 ملخص الشهر الحالي
                </Typography>
                <Grid container spacing={2}>
                  {[
                    {
                      label: 'إجمالي الجلسات',
                      value: monthlyStats?.totalSessions || 0,
                      color: '#1E88E5',
                    },
                    {
                      label: 'المكتملة',
                      value: monthlyStats?.completedSessions || 0,
                      color: '#43A047',
                    },
                    {
                      label: 'الملغاة',
                      value: monthlyStats?.cancelledSessions || 0,
                      color: '#E53935',
                    },
                    {
                      label: 'لم يحضر',
                      value: monthlyStats?.noShowSessions || 0,
                      color: '#9E9E9E',
                    },
                    {
                      label: 'معدل الحضور',
                      value: `${monthlyStats?.attendanceRate || 0}%`,
                      color: '#FF9800',
                    },
                    { label: 'مرضى جدد', value: monthlyStats?.newPatients || 0, color: '#9C27B0' },
                    {
                      label: 'تم تخريج',
                      value: monthlyStats?.dischargedPatients || 0,
                      color: '#00BCD4',
                    },
                    {
                      label: 'تقارير مقدمة',
                      value: monthlyStats?.reportsSubmitted || 0,
                      color: '#795548',
                    },
                  ].map(item => (
                    <Grid item xs={6} sm={3} key={item.label}>
                      <Box
                        sx={{
                          textAlign: 'center',
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: alpha(item.color, 0.06),
                          border: `1px solid ${alpha(item.color, 0.2)}`,
                        }}
                      >
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: item.color }}>
                          {item.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.label}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ═══════ TAB 2 — Analytics ═══════ */}
      {tab === 2 && (
        <Grid container spacing={3}>
          {/* Improvement trend */}
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  📈 اتجاه التحسن (6 أشهر)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={improvementTrend || []}>
                    <defs>
                      <linearGradient id="improvGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1E88E5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1E88E5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <RTooltip />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      stroke="#1E88E5"
                      fill="url(#improvGrad)"
                      name="معدل التحسن %"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Patient distribution */}
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  🩺 توزيع المرضى حسب الحالة
                </Typography>
                {[
                  { label: 'تحسن ملحوظ', value: 45, color: statusColors.success },
                  { label: 'تحسن متوسط', value: 35, color: statusColors.info },
                  { label: 'بحاجة متابعة', value: 15, color: statusColors.warning },
                  { label: 'حالات حرجة', value: 5, color: statusColors.error },
                ].map(item => (
                  <Box key={item.label} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">{item.label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: item.color }}>
                        {item.value}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.value}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: surfaceColors.softGray,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: item.color,
                          borderRadius: 5,
                        },
                      }}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Weekly bar */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  📊 أداء الأسبوع
                </Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={weeklyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <RTooltip />
                    <Legend />
                    <Bar dataKey="sessions" fill="#1E88E5" name="مجدولة" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="completed" fill="#43A047" name="مكتملة" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Monthly Stats summary */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  📋 ملخص شهري
                </Typography>
                {[
                  { label: 'إجمالي الجلسات', value: monthlyStats?.totalSessions, color: '#1E88E5' },
                  {
                    label: 'الجلسات المكتملة',
                    value: monthlyStats?.completedSessions,
                    color: '#43A047',
                  },
                  { label: 'الملغاة', value: monthlyStats?.cancelledSessions, color: '#E53935' },
                  {
                    label: 'معدل الحضور',
                    value: `${monthlyStats?.attendanceRate}%`,
                    color: '#FF9800',
                  },
                  { label: 'مرضى جدد', value: monthlyStats?.newPatients, color: '#9C27B0' },
                  { label: 'تم تخريج', value: monthlyStats?.dischargedPatients, color: '#00BCD4' },
                  { label: 'تقييمات', value: monthlyStats?.assessmentsCompleted, color: '#795548' },
                  {
                    label: 'تقارير مقدمة',
                    value: monthlyStats?.reportsSubmitted,
                    color: '#607D8B',
                  },
                ].map(item => (
                  <Box
                    key={item.label}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: `1px solid ${surfaceColors.lightGray}`,
                    }}
                  >
                    <Typography variant="body2">{item.label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: item.color }}>
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ═══════ TAB 3 — Portal Navigation ═══════ */}
      {tab === 3 && (
        <Grid container spacing={3}>
          {navCards.map(card => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={card.label}>
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: 3,
                  transition: 'all .3s',
                  '&:hover': { transform: 'translateY(-8px)', boxShadow: 8 },
                  overflow: 'visible',
                }}
              >
                <CardActionArea
                  onClick={() => navigate(card.path)}
                  sx={{ p: 3, textAlign: 'center' }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: alpha(card.color, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                      fontSize: '2rem',
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {card.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.desc}
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Chip
                      label="فتح"
                      size="small"
                      icon={<ArrowIcon />}
                      sx={{ background: alpha(card.color, 0.1), color: card.color }}
                    />
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ═══════ TAB 4 — AI Insights ═══════ */}
      {tab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                borderRadius: 2,
                boxShadow: 3,
                border: '2px solid',
                borderColor: alpha('#9C27B0', 0.2),
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AIIcon sx={{ color: '#9C27B0' }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    🔮 توصيات ذكية
                  </Typography>
                </Box>
                {[
                  {
                    title: 'تكثيف جلسات نورة',
                    desc: 'تحليل البيانات يُظهر أن نورة الدوسري تستجيب بشكل أفضل للجلسات المتتالية. يُوصى بإضافة جلسة إضافية أسبوعياً.',
                    priority: 'high',
                    confidence: 87,
                  },
                  {
                    title: 'إعادة تقييم ريم',
                    desc: 'لوحظ تراجع 15% في مؤشرات التوازن لريم العتيبي. يُوصى بإجراء تقييم شامل وتعديل الخطة العلاجية.',
                    priority: 'critical',
                    confidence: 92,
                  },
                  {
                    title: 'مريض جاهز للخروج',
                    desc: 'لمى الزهراني حققت 82% من أهدافها العلاجية. يمكن البدء ببرنامج صيانة تمهيداً للخروج.',
                    priority: 'low',
                    confidence: 95,
                  },
                  {
                    title: 'تنسيق مُقترح',
                    desc: 'محمد علي يستفيد من برنامج مشترك (حركي + نطق). يُوصى بالتنسيق مع د. سلمان الرشيدي.',
                    priority: 'medium',
                    confidence: 78,
                  },
                ].map((rec, i) => {
                  const p = PRIORITY_MAP[rec.priority] || PRIORITY_MAP.medium;
                  return (
                    <Box
                      key={i}
                      sx={{
                        p: 2,
                        mb: 1.5,
                        borderRadius: 2,
                        backgroundColor: alpha(p.color, 0.06),
                        borderRight: `3px solid ${p.color}`,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'start',
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {rec.title}
                        </Typography>
                        <Chip
                          label={`${rec.confidence}% ثقة`}
                          size="small"
                          sx={{
                            background: alpha('#9C27B0', 0.1),
                            color: '#9C27B0',
                            fontSize: '0.65rem',
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {rec.desc}
                      </Typography>
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              sx={{
                borderRadius: 2,
                boxShadow: 3,
                border: '2px solid',
                borderColor: alpha('#1E88E5', 0.2),
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrendingUpIcon sx={{ color: '#1E88E5' }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    📊 تحليل الأداء الذكي
                  </Typography>
                </Box>
                {[
                  {
                    metric: 'كفاءة الجلسات',
                    value: 94,
                    desc: 'نسبة الجلسات المكتملة من المحددة',
                    color: '#43A047',
                  },
                  {
                    metric: 'معدل تحقيق الأهداف',
                    value: 36,
                    desc: '18 هدف من 50 — أعلى من المتوسط',
                    color: '#1E88E5',
                  },
                  {
                    metric: 'رضا أولياء الأمور',
                    value: 95,
                    desc: 'بناءً على 156 تقييم',
                    color: '#FF9800',
                  },
                  {
                    metric: 'الالتزام بالجدول',
                    value: 89,
                    desc: 'معدل الحضور الشهري',
                    color: '#9C27B0',
                  },
                  {
                    metric: 'سرعة التوثيق',
                    value: 88,
                    desc: 'التقارير المُقدمة في الوقت',
                    color: '#00BCD4',
                  },
                ].map(m => (
                  <Box key={m.metric} sx={{ mb: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {m.metric}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {m.desc}
                        </Typography>
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: m.color }}>
                        {m.value}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={m.value}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: surfaceColors.softGray,
                        '& .MuiLinearProgress-bar': { backgroundColor: m.color, borderRadius: 4 },
                      }}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card
              sx={{
                borderRadius: 2,
                boxShadow: 3,
                background: `linear-gradient(135deg, ${alpha('#9C27B0', 0.03)} 0%, ${alpha('#1E88E5', 0.03)} 100%)`,
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  🧠 تنبؤات و رؤى مستقبلية
                </Typography>
                <Grid container spacing={2}>
                  {[
                    {
                      icon: '🎯',
                      title: 'التوقع: 3 مرضى يحققون أهدافهم خلال شهر',
                      desc: 'فاطمة أحمد، لمى الزهراني، وخالد الشمري — بناءً على معدل التقدم الحالي',
                    },
                    {
                      icon: '📅',
                      title: 'أفضل أوقات الجلسات',
                      desc: 'تحليل البيانات يُظهر أعلى استجابة في الفترة الصباحية (8:30-11:00) بنسبة تحسن أعلى 23%',
                    },
                    {
                      icon: '⚡',
                      title: 'فرصة تحسين',
                      desc: 'الجلسات الجماعية أظهرت نتائج ممتازة في التوازن. يُوصى بزيادتها من جلسة لجلستين أسبوعياً',
                    },
                    {
                      icon: '🔄',
                      title: 'تحسين المتابعة',
                      desc: 'أحمد الحربي غائب منذ 3 أسابيع. احتمال الانسحاب 65% — يُوصى بالتواصل الفوري',
                    },
                  ].map((insight, i) => (
                    <Grid item xs={12} sm={6} key={i}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: 'rgba(255,255,255,0.7)',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                          {insight.icon} {insight.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {insight.desc}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default TherapistDashboard;
