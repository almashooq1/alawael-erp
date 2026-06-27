/**
 * Parent Portal Page
 * بوابة أولياء الأمور — صفحة رئيسية
 */
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Tabs, Tab, Grid, Chip, Stack, Divider,
  Avatar, Button, Card, CardContent, LinearProgress, Alert,
  CircularProgress, TextField, List, ListItem, ListItemText,
  ListItemAvatar, Badge, Tooltip, IconButton
} from '@mui/material';
import {
  Dashboard as DashboardIcon, TrendingUp as TrendingIcon,
  HomeWork as HomeWorkIcon, Chat as ChatIcon,
  Notifications as NotificationsIcon, Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon, Warning as WarningIcon,
  Event as EventIcon, School as SchoolIcon, Person as PersonIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { parentPortalService } from '../../services/parentPortalService';

// ─── Tab Panel helper ──────────────────────────────────────────
function TabPanel({ children, value, index }) {
  return value === index ? (
    <Box sx={{ py: 3 }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {children}
      </motion.div>
    </Box>
  ) : null;
}

// ─── Mock data ─────────────────────────────────────────────────
const mockOverview = {
  beneficiary: { name: 'أحمد محمد العلي', age: 8, diagnosis: 'شلل cerebral palsy' },
  icf: { overallScore: 2.3, domainScores: { bodyFunctions: 2.5, bodyStructures: 1.8, activitiesAndParticipation: 2.7, environmentalFactors: 1.2, personalFactors: 2.0 }, assessmentDate: new Date().toISOString(), coreSetType: 'rehab' },
  carePlan: { planId: 'CP-001', status: 'active', versionNumber: 2, goalCount: 8, achievedGoals: 3 },
  upcomingSessions: [
    { id: 's1', date: new Date(Date.now() + 86400000), type: 'physical', therapist: 'د. سارة' },
    { id: 's2', date: new Date(Date.now() + 172800000), type: 'occupational', therapist: 'د. علي' },
  ],
  recentActivities: [
    { date: new Date(Date.now() - 86400000), note: 'تحسن ملحوظ في المشي المستقل' },
    { date: new Date(Date.now() - 3 * 86400000), note: 'تم إضافة هدف جديد: تطوير التواصل اللفظي' },
  ],
};

const mockTimeline = {
  timeline: [
    { month: '2024-01', icfScore: 2.7, sessions: 4, goalsUpdated: 2 },
    { month: '2024-02', icfScore: 2.5, sessions: 5, goalsUpdated: 1 },
    { month: '2024-03', icfScore: 2.4, sessions: 4, goalsUpdated: 3 },
    { month: '2024-04', icfScore: 2.3, sessions: 6, goalsUpdated: 2 },
  ],
};

const mockPrograms = {
  programs: [
    { id: 'p1', title: 'تمارين تقوية العضلات', description: 'تمرين رفع الساق 10 مرات × 3 مجموعات', progress: 65, dueDate: '2024-07-15', completed: false },
    { id: 'p2', title: 'تدريب على التواصل', description: 'قراءة 5 كلمات جديدة يومياً مع الوالدين', progress: 40, dueDate: '2024-07-20', completed: false },
    { id: 'p3', title: 'تمارين التوازن', description: 'الوقوف على قدم واحدة لمدة 10 ثوانٍ', progress: 100, dueDate: '2024-06-01', completed: true },
  ],
};

const mockNotifications = {
  notifications: [
    { type: 'upcoming_session', title: 'جلسة قادمة', message: 'لديك جلسة علاج طبيعي غداً الساعة 10:00 ص.', severity: 'low', createdAt: new Date(), read: false },
    { type: 'goal_achieved', title: 'تهانينا!', message: 'تم تحقيق هدف "تمارين التوازن" بنجاح.', severity: 'success', createdAt: new Date(), read: false },
    { type: 'icf_reassessment_due', title: 'تقييم دوري', message: 'تقييم ICF دوري مقرر خلال الأسبوع القادم.', severity: 'medium', createdAt: new Date(), read: true },
  ],
  unreadCount: 2,
};

// ─── Main Component ────────────────────────────────────────────
export default function ParentPortal() {
  const { beneficiaryId } = useParams();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [programs, setPrograms] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, text: '', severity: 'success' });

  useEffect(() => {
    const load = async () => {
      try {
        const [o, t, p, n] = await Promise.all([
          parentPortalService.getOverview(beneficiaryId).catch(() => mockOverview),
          parentPortalService.getProgress(beneficiaryId, 6).catch(() => mockTimeline),
          parentPortalService.getHomePrograms(beneficiaryId).catch(() => mockPrograms),
          parentPortalService.getNotifications(beneficiaryId).catch(() => mockNotifications),
        ]);
        setOverview(o);
        setTimeline(t);
        setPrograms(p);
        setNotifications(n);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [beneficiaryId]);

  const handleTabChange = (e, v) => setTab(v);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await parentPortalService.sendMessage(beneficiaryId, message);
      setSnackbar({ open: true, text: 'تم إرسال الرسالة بنجاح', severity: 'success' });
      setMessage('');
    } catch (err) {
      setSnackbar({ open: true, text: 'فشل إرسال الرسالة', severity: 'error' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  const b = overview?.beneficiary || mockOverview.beneficiary;
  const icf = overview?.icf || mockOverview.icf;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 28 }}>
            {b.name?.charAt(0)}
          </Avatar>
          <Box flex={1}>
            <Typography variant="h5" fontWeight={800}>
              بوابة أولياء الأمور
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {b.name} — {b.age} سنوات — {b.diagnosis}
            </Typography>
          </Box>
          <Badge badgeContent={notifications?.unreadCount || 0} color="error">
            <IconButton>
              <NotificationsIcon />
            </IconButton>
          </Badge>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Tabs value={tab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" sx={{ px: 2, pt: 1 }}>
          <Tab icon={<DashboardIcon />} label="نظرة عامة" iconPosition="start" />
          <Tab icon={<TrendingIcon />} label="التقدم" iconPosition="start" />
          <Tab icon={<HomeWorkIcon />} label="البرامج المنزلية" iconPosition="start" />
          <Tab icon={<ChatIcon />} label="التواصل" iconPosition="start" />
        </Tabs>

        <Box sx={{ px: 3, pb: 3 }}>
          {/* ── Tab 1: Overview ── */}
          <TabPanel value={tab} index={0}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      <AssessmentIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'primary.main' }} />
                      تقييم ICF الأخير
                    </Typography>
                    {icf ? (
                      <Stack spacing={2}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">الدرجة الإجمالية</Typography>
                          <Typography variant="h6" fontWeight={800} color={icf.overallScore <= 2 ? 'success.main' : icf.overallScore <= 3 ? 'warning.main' : 'error.main'}>
                            {icf.overallScore?.toFixed(1)} / 4.0
                          </Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={(icf.overallScore / 4) * 100} sx={{ height: 8, borderRadius: 4 }} />
                        <Typography variant="caption" color="text.secondary">
                          {icf.coreSetType === 'rehab' ? 'مجموعة التأهيل' : icf.coreSetType === 'autism' ? 'مجموعة التوحد' : 'مجموعة شلل الأطفال'}
                        </Typography>
                      </Stack>
                    ) : (
                      <Alert severity="info">لا يوجد تقييم ICF متاح</Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      <SchoolIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'primary.main' }} />
                      خطة الرعاية
                    </Typography>
                    {overview?.carePlan ? (
                      <Stack spacing={2}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">الأهداف</Typography>
                          <Typography variant="body2" fontWeight={700}>
                            {overview.carePlan.achievedGoals} / {overview.carePlan.goalCount} منجز
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={overview.carePlan.goalCount > 0 ? (overview.carePlan.achievedGoals / overview.carePlan.goalCount) * 100 : 0}
                          sx={{ height: 8, borderRadius: 4 }}
                          color="success"
                        />
                        <Chip label={overview.carePlan.status === 'active' ? 'نشطة' : overview.carePlan.status} size="small" color="success" />
                      </Stack>
                    ) : (
                      <Alert severity="info">لا توجد خطة رعاية نشطة</Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      <EventIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'primary.main' }} />
                      الجلسات القادمة
                    </Typography>
                    <Stack spacing={1.5}>
                      {(overview?.upcomingSessions || []).map(s => (
                        <Paper key={s.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: 14 }}>
                            {s.therapist?.charAt(0)}
                          </Avatar>
                          <Box flex={1}>
                            <Typography variant="body2" fontWeight={600}>{s.therapist}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {s.type} — {new Date(s.date).toLocaleDateString('ar-SA')}
                            </Typography>
                          </Box>
                        </Paper>
                      ))}
                      {(!overview?.upcomingSessions || overview.upcomingSessions.length === 0) && (
                        <Typography variant="body2" color="text.secondary">لا توجد جلسات قادمة</Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      <TrendingIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'primary.main' }} />
                      آخر الأنشطة
                    </Typography>
                    <Stack spacing={1.5}>
                      {(overview?.recentActivities || []).map((a, i) => (
                        <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                          <Typography variant="body2">{a.note}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(a.date).toLocaleDateString('ar-SA')}
                          </Typography>
                        </Paper>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* ── Tab 2: Progress ── */}
          <TabPanel value={tab} index={1}>
            <Typography variant="h6" fontWeight={700} gutterBottom>خط زمني للتقدم</Typography>
            <Grid container spacing={2}>
              {(timeline?.timeline || []).map((item, i) => (
                <Grid item xs={12} sm={6} md={3} key={i}>
                  <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center' }}>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={700} color="primary.main">{item.month}</Typography>
                      <Typography variant="h5" fontWeight={800} sx={{ my: 1 }}>
                        {item.icfScore?.toFixed(1) || '-'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">درجة ICF</Typography>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2">{item.sessions} جلسات</Typography>
                      <Typography variant="body2">{item.goalsUpdated} أهداف</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* ── Tab 3: Home Programs ── */}
          <TabPanel value={tab} index={2}>
            <Typography variant="h6" fontWeight={700} gutterBottom>البرامج المنزلية</Typography>
            <Stack spacing={2}>
              {(programs?.programs || []).map(p => (
                <Card key={p.id} variant="outlined" sx={{ borderRadius: 2, borderRight: p.completed ? 4 : 0, borderColor: p.completed ? 'success.main' : 'divider' }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {p.completed && <CheckCircleIcon sx={{ color: 'success.main', mr: 1, verticalAlign: 'middle', fontSize: 20 }} />}
                        {p.title}
                      </Typography>
                      <Chip label={p.completed ? 'مكتمل' : 'قيد التنفيذ'} size="small" color={p.completed ? 'success' : 'primary'} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{p.description}</Typography>
                    <Box display="flex" alignItems="center" gap={2}>
                      <LinearProgress variant="determinate" value={p.progress} sx={{ flex: 1, height: 8, borderRadius: 4 }} color={p.completed ? 'success' : 'primary'} />
                      <Typography variant="body2" fontWeight={700}>{p.progress}%</Typography>
                    </Box>
                    {p.dueDate && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        تاريخ الاستحقاق: {new Date(p.dueDate).toLocaleDateString('ar-SA')}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </TabPanel>

          {/* ── Tab 4: Communication ── */}
          <TabPanel value={tab} index={3}>
            <Typography variant="h6" fontWeight={700} gutterBottom>التواصل مع الفريق</Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Card variant="outlined" sx={{ borderRadius: 2, minHeight: 300 }}>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>إرسال رسالة</Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      placeholder="اكتب رسالتك للفريق العلاجي..."
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <ChatIcon />}
                      onClick={handleSendMessage}
                      disabled={sending || !message.trim()}
                    >
                      إرسال
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={5}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      <NotificationsIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'primary.main' }} />
                      الإشعارات
                    </Typography>
                    <List dense>
                      {(notifications?.notifications || []).map((n, i) => (
                        <ListItem key={i} sx={{ bgcolor: n.read ? 'transparent' : 'action.hover', borderRadius: 1, mb: 0.5 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: n.severity === 'success' ? 'success.light' : n.severity === 'medium' ? 'warning.light' : 'info.light' }}>
                              {n.severity === 'success' ? <CheckCircleIcon fontSize="small" /> : <WarningIcon fontSize="small" />}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={n.title}
                            secondary={n.message}
                            primaryTypographyProps={{ fontWeight: n.read ? 400 : 700, fontSize: 14 }}
                            secondaryTypographyProps={{ fontSize: 12 }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}
