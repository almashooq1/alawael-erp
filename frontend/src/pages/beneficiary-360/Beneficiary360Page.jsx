/**
 * Beneficiary 360° Profile Page — صفحة الملف الشامل للمستفيد
 *
 * عرض موحد وكامل لملف المستفيد يتضمن:
 * - البيانات الأساسية
 * - حلقات الرعاية النشطة
 * - خط زمني
 * - التقييمات
 * - خطط الرعاية
 * - الجلسات
 * - الأهداف والمقاييس
 * - التوصيات الذكية
 * - التواصل العائلي
 * - المخاطر
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Avatar,
  Chip,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Button,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Timeline as MuiTimeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineDot,
  TimelineContent,
  TimelineOppositeContent,
  Paper,
  Stack,
  Badge,
  Tooltip,
  Skeleton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  Person as PersonIcon,
  Event as EventIcon,
  Assessment as AssessmentIcon,
  LocalHospital as HospitalIcon,
  Psychology as PsychologyIcon,
  FamilyRestroom as FamilyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  TrackChanges as GoalIcon,
  TrendingUp as TrendIcon,
  ArrowBack as BackIcon,
  ExpandMore as ExpandIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  AutoAwesome as AIIcon,
  StickyNote2 as NoteIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';

import {
  coreAPI,
  episodesAPI,
  timelineAPI,
  assessmentsAPI,
  carePlansAPI,
  sessionsAPI,
  goalsAPI,
  aiRecommendationsAPI,
  familyAPI,
} from '../../services/ddd';

/* ── Tab Panel ── */
function TabPanel({ children, value, index, ...props }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...props}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

/* ── Phase Color Map ── */
const PHASE_COLORS = {
  referral: '#9e9e9e',
  screening: '#ff9800',
  intake: '#2196f3',
  initial_assessment: '#673ab7',
  planning: '#00bcd4',
  active_treatment: '#4caf50',
  review: '#ff5722',
  transition: '#795548',
  discharge_planning: '#607d8b',
  discharged: '#9e9e9e',
  follow_up: '#8bc34a',
  closed: '#424242',
};

const STATUS_COLORS = {
  active: 'success',
  completed: 'default',
  cancelled: 'error',
  on_hold: 'warning',
  scheduled: 'info',
  draft: 'default',
};

/* ── Main Component ── */
export default function Beneficiary360Page() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data state
  const [beneficiary, setBeneficiary] = useState(null);
  const [profile360, setProfile360] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [carePlans, setCarePlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);

  /* ── Load all data ── */
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      // Load beneficiary and 360 profile in parallel
      const [bRes, p360Res] = await Promise.all([
        coreAPI.getById(id).catch(() => null),
        coreAPI.get360Profile(id).catch(() => null),
      ]);

      if (bRes?.data) setBeneficiary(bRes.data);
      if (p360Res?.data) setProfile360(p360Res.data);

      // Load related domain data in parallel
      const [epRes, tlRes, asRes, cpRes, ssRes, glRes, recRes, fmRes] = await Promise.all([
        episodesAPI.list({ beneficiaryId: id, limit: 50 }).catch(() => ({ data: [] })),
        timelineAPI.getByBeneficiary(id).catch(() => ({ data: [] })),
        assessmentsAPI.list({ beneficiaryId: id, limit: 50 }).catch(() => ({ data: [] })),
        carePlansAPI.list({ beneficiaryId: id, limit: 50 }).catch(() => ({ data: [] })),
        sessionsAPI.list({ beneficiaryId: id, limit: 100 }).catch(() => ({ data: [] })),
        goalsAPI.list({ beneficiaryId: id, limit: 100 }).catch(() => ({ data: [] })),
        aiRecommendationsAPI.getForBeneficiary(id).catch(() => ({ data: [] })),
        familyAPI.list({ beneficiaryId: id, limit: 50 }).catch(() => ({ data: [] })),
      ]);

      setEpisodes(epRes?.data?.data || epRes?.data || []);
      setTimeline(tlRes?.data?.data || tlRes?.data || []);
      setAssessments(asRes?.data?.data || asRes?.data || []);
      setCarePlans(cpRes?.data?.data || cpRes?.data || []);
      setSessions(ssRes?.data?.data || ssRes?.data || []);
      setGoals(glRes?.data?.data || glRes?.data || []);
      setRecommendations(recRes?.data?.data || recRes?.data || []);
      setFamilyMembers(fmRes?.data?.data || fmRes?.data || []);
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء تحميل بيانات المستفيد');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Loading state ── */
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 2 }} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={12} md={3} key={i}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={400} sx={{ mt: 2, borderRadius: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={<Button onClick={loadData}>إعادة المحاولة</Button>}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!beneficiary) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">لم يتم العثور على المستفيد</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          العودة
        </Button>
      </Box>
    );
  }

  const activeEpisode = episodes.find(
    e => e.status === 'active' || e.currentPhase === 'active_treatment'
  );
  const age = beneficiary.dateOfBirth
    ? Math.floor((Date.now() - new Date(beneficiary.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  /* ── Quick Stats ── */
  const stats = [
    { label: 'حلقات الرعاية', value: episodes.length, icon: <EventIcon />, color: '#2196f3' },
    { label: 'الجلسات', value: sessions.length, icon: <ScheduleIcon />, color: '#4caf50' },
    { label: 'التقييمات', value: assessments.length, icon: <AssessmentIcon />, color: '#ff9800' },
    { label: 'الأهداف', value: goals.length, icon: <GoalIcon />, color: '#673ab7' },
  ];

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <IconButton onClick={() => navigate(-1)}>
          <BackIcon />
        </IconButton>
        <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 24 }}>
          {(beneficiary.name?.first || beneficiary.fullName || '?')[0]}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight="bold">
            {beneficiary.name?.full ||
              beneficiary.fullName ||
              `${beneficiary.name?.first || ''} ${beneficiary.name?.last || ''}`}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <Chip
              size="small"
              label={beneficiary.status || 'نشط'}
              color={beneficiary.status === 'active' ? 'success' : 'default'}
            />
            {age && <Chip size="small" variant="outlined" label={`${age} سنة`} />}
            {beneficiary.fileNumber && (
              <Chip
                size="small"
                variant="outlined"
                label={`رقم الملف: ${beneficiary.fileNumber}`}
              />
            )}
            {beneficiary.primaryDiagnosis && (
              <Chip
                size="small"
                variant="outlined"
                color="info"
                label={beneficiary.primaryDiagnosis}
              />
            )}
            {activeEpisode && (
              <Chip
                size="small"
                sx={{
                  bgcolor: PHASE_COLORS[activeEpisode.currentPhase] || '#4caf50',
                  color: '#fff',
                }}
                label={`المرحلة: ${activeEpisode.currentPhase || 'علاج نشط'}`}
              />
            )}
          </Stack>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="تعديل">
            <IconButton>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="طباعة">
            <IconButton>
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="مشاركة">
            <IconButton>
              <ShareIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── Quick Stats ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={{ borderRight: `4px solid ${s.color}` }}>
              <CardContent
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  py: 1.5,
                  '&:last-child': { pb: 1.5 },
                }}
              >
                <Avatar sx={{ bgcolor: `${s.color}20`, color: s.color, width: 40, height: 40 }}>
                  {s.icon}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color={s.color}>
                    {s.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.label}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── AI Recommendations Alert ── */}
      {recommendations.length > 0 && (
        <Alert severity="info" icon={<AIIcon />} sx={{ mb: 3 }}>
          <Typography variant="subtitle2">{recommendations.length} توصية ذكية متاحة</Typography>
          {recommendations.slice(0, 2).map((r, i) => (
            <Typography key={i} variant="body2" sx={{ mt: 0.5 }}>
              • {r.title || r.text || r.description}
            </Typography>
          ))}
        </Alert>
      )}

      {/* ── Tabs ── */}
      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<PersonIcon />} iconPosition="start" label="النظرة العامة" />
          <Tab
            icon={<EventIcon />}
            iconPosition="start"
            label={`حلقات الرعاية (${episodes.length})`}
          />
          <Tab
            icon={<ScheduleIcon />}
            iconPosition="start"
            label={`الجلسات (${sessions.length})`}
          />
          <Tab
            icon={<AssessmentIcon />}
            iconPosition="start"
            label={`التقييمات (${assessments.length})`}
          />
          <Tab icon={<GoalIcon />} iconPosition="start" label={`الأهداف (${goals.length})`} />
          <Tab icon={<HospitalIcon />} iconPosition="start" label={`الخطط (${carePlans.length})`} />
          <Tab
            icon={<FamilyIcon />}
            iconPosition="start"
            label={`الأسرة (${familyMembers.length})`}
          />
          <Tab icon={<CalendarIcon />} iconPosition="start" label="الخط الزمني" />
        </Tabs>

        {/* ── Tab: Overview ── */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              {/* Personal Info */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardHeader
                    title="البيانات الشخصية"
                    titleTypographyProps={{ variant: 'subtitle1', fontWeight: 'bold' }}
                  />
                  <CardContent>
                    <Grid container spacing={1}>
                      {[
                        ['الاسم الكامل', beneficiary.name?.full || beneficiary.fullName || '-'],
                        [
                          'تاريخ الميلاد',
                          beneficiary.dateOfBirth
                            ? new Date(beneficiary.dateOfBirth).toLocaleDateString('ar-SA')
                            : '-',
                        ],
                        [
                          'الجنس',
                          beneficiary.gender === 'male'
                            ? 'ذكر'
                            : beneficiary.gender === 'female'
                              ? 'أنثى'
                              : '-',
                        ],
                        ['رقم الهوية', beneficiary.nationalId || beneficiary.identityNumber || '-'],
                        ['رقم الملف', beneficiary.fileNumber || '-'],
                        ['الفرع', beneficiary.branch || '-'],
                      ].map(([label, value], i) => (
                        <React.Fragment key={i}>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">
                              {label}
                            </Typography>
                          </Grid>
                          <Grid item xs={8}>
                            <Typography variant="body2">{value}</Typography>
                          </Grid>
                        </React.Fragment>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Clinical Summary */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardHeader
                    title="الملخص السريري"
                    titleTypographyProps={{ variant: 'subtitle1', fontWeight: 'bold' }}
                  />
                  <CardContent>
                    <Grid container spacing={1}>
                      {[
                        ['التشخيص الأولي', beneficiary.primaryDiagnosis || '-'],
                        ['نوع الإعاقة', beneficiary.disabilityType || '-'],
                        ['درجة الإعاقة', beneficiary.disabilitySeverity || '-'],
                        ['الحالة', beneficiary.status || 'نشط'],
                        [
                          'تاريخ التسجيل',
                          beneficiary.createdAt
                            ? new Date(beneficiary.createdAt).toLocaleDateString('ar-SA')
                            : '-',
                        ],
                        [
                          'آخر تحديث',
                          beneficiary.updatedAt
                            ? new Date(beneficiary.updatedAt).toLocaleDateString('ar-SA')
                            : '-',
                        ],
                      ].map(([label, value], i) => (
                        <React.Fragment key={i}>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">
                              {label}
                            </Typography>
                          </Grid>
                          <Grid item xs={8}>
                            <Typography variant="body2">{value}</Typography>
                          </Grid>
                        </React.Fragment>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Active Episode */}
              {activeEpisode && (
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ borderColor: 'success.main' }}>
                    <CardHeader
                      title="حلقة الرعاية النشطة"
                      titleTypographyProps={{ variant: 'subtitle1', fontWeight: 'bold' }}
                      avatar={
                        <Avatar sx={{ bgcolor: 'success.main' }}>
                          <EventIcon />
                        </Avatar>
                      }
                    />
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                          <Typography variant="caption" color="text.secondary">
                            المرحلة الحالية
                          </Typography>
                          <Chip
                            size="small"
                            sx={{
                              mt: 0.5,
                              bgcolor: PHASE_COLORS[activeEpisode.currentPhase],
                              color: '#fff',
                            }}
                            label={activeEpisode.currentPhase}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="caption" color="text.secondary">
                            تاريخ البدء
                          </Typography>
                          <Typography variant="body2">
                            {activeEpisode.startDate
                              ? new Date(activeEpisode.startDate).toLocaleDateString('ar-SA')
                              : '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="caption" color="text.secondary">
                            الأخصائي المسؤول
                          </Typography>
                          <Typography variant="body2">
                            {activeEpisode.primaryTherapist?.name ||
                              activeEpisode.leadTherapist ||
                              '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="caption" color="text.secondary">
                            التقدم
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={activeEpisode.progressPercent || 0}
                              sx={{ flex: 1, height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="body2">
                              {activeEpisode.progressPercent || 0}%
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Box>
        </TabPanel>

        {/* ── Tab: Episodes ── */}
        <TabPanel value={tab} index={1}>
          <Box sx={{ p: 2 }}>
            {episodes.length === 0 ? (
              <Alert severity="info">لا توجد حلقات رعاية مسجلة</Alert>
            ) : (
              <Grid container spacing={2}>
                {episodes.map((ep, i) => (
                  <Grid item xs={12} md={6} key={ep._id || i}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderRight: `4px solid ${PHASE_COLORS[ep.currentPhase] || '#999'}`,
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {ep.type || 'حلقة رعاية'} #{i + 1}
                          </Typography>
                          <Chip
                            size="small"
                            label={ep.currentPhase || ep.status}
                            sx={{ bgcolor: PHASE_COLORS[ep.currentPhase] || '#999', color: '#fff' }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {ep.startDate ? new Date(ep.startDate).toLocaleDateString('ar-SA') : ''}
                          {ep.endDate
                            ? ` — ${new Date(ep.endDate).toLocaleDateString('ar-SA')}`
                            : ' — مستمرة'}
                        </Typography>
                        {ep.progressPercent != null && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={ep.progressPercent}
                              sx={{ flex: 1, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="caption">{ep.progressPercent}%</Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </TabPanel>

        {/* ── Tab: Sessions ── */}
        <TabPanel value={tab} index={2}>
          <Box sx={{ p: 2 }}>
            {sessions.length === 0 ? (
              <Alert severity="info">لا توجد جلسات مسجلة</Alert>
            ) : (
              <List>
                {sessions.slice(0, 30).map((s, i) => (
                  <ListItem key={s._id || i} divider>
                    <ListItemIcon>
                      <Avatar
                        sx={{
                          bgcolor:
                            STATUS_COLORS[s.status] === 'success' ? 'success.main' : 'grey.400',
                          width: 36,
                          height: 36,
                        }}
                      >
                        <ScheduleIcon fontSize="small" />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {s.sessionType || s.type || 'جلسة علاجية'}
                          </Typography>
                          <Chip
                            size="small"
                            label={s.status || 'مكتمل'}
                            color={STATUS_COLORS[s.status] || 'default'}
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          {s.scheduledDate && new Date(s.scheduledDate).toLocaleDateString('ar-SA')}
                          {s.therapist?.name && ` • ${s.therapist.name}`}
                          {s.duration && ` • ${s.duration} دقيقة`}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </TabPanel>

        {/* ── Tab: Assessments ── */}
        <TabPanel value={tab} index={3}>
          <Box sx={{ p: 2 }}>
            {assessments.length === 0 ? (
              <Alert severity="info">لا توجد تقييمات مسجلة</Alert>
            ) : (
              <Grid container spacing={2}>
                {assessments.map((a, i) => (
                  <Grid item xs={12} md={6} key={a._id || i}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {a.type || a.assessmentType || 'تقييم سريري'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {a.instrument || a.tool || ''}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              التاريخ
                            </Typography>
                            <Typography variant="body2">
                              {a.date ? new Date(a.date).toLocaleDateString('ar-SA') : '-'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              النتيجة
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="primary">
                              {a.totalScore ?? a.score ?? '-'}
                            </Typography>
                          </Grid>
                        </Grid>
                        {a.status && (
                          <Chip
                            size="small"
                            label={a.status}
                            color={STATUS_COLORS[a.status] || 'default'}
                            sx={{ mt: 1 }}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </TabPanel>

        {/* ── Tab: Goals ── */}
        <TabPanel value={tab} index={4}>
          <Box sx={{ p: 2 }}>
            {goals.length === 0 ? (
              <Alert severity="info">لا توجد أهداف علاجية مسجلة</Alert>
            ) : (
              <List>
                {goals.map((g, i) => (
                  <ListItem key={g._id || i} divider>
                    <ListItemIcon>
                      <GoalIcon
                        color={
                          g.status === 'achieved'
                            ? 'success'
                            : g.status === 'in_progress'
                              ? 'primary'
                              : 'action'
                        }
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {g.title || g.description}
                          </Typography>
                          <Chip
                            size="small"
                            label={g.status || 'نشط'}
                            color={g.status === 'achieved' ? 'success' : 'default'}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          {g.domain && (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={g.domain}
                              sx={{ mr: 0.5 }}
                            />
                          )}
                          {g.progressPercent != null && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <LinearProgress
                                variant="determinate"
                                value={g.progressPercent}
                                sx={{ flex: 1, height: 6, borderRadius: 3 }}
                              />
                              <Typography variant="caption">{g.progressPercent}%</Typography>
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </TabPanel>

        {/* ── Tab: Care Plans ── */}
        <TabPanel value={tab} index={5}>
          <Box sx={{ p: 2 }}>
            {carePlans.length === 0 ? (
              <Alert severity="info">لا توجد خطط رعاية مسجلة</Alert>
            ) : (
              carePlans.map((cp, i) => (
                <Accordion key={cp._id || i} defaultExpanded={i === 0}>
                  <AccordionSummary expandIcon={<ExpandIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <HospitalIcon color="primary" />
                      <Typography fontWeight="bold">{cp.title || `خطة رعاية #${i + 1}`}</Typography>
                      <Chip
                        size="small"
                        label={cp.status || 'نشط'}
                        color={STATUS_COLORS[cp.status] || 'default'}
                        sx={{ ml: 'auto', mr: 2 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {cp.description || cp.notes || ''}
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          تاريخ البدء
                        </Typography>
                        <Typography variant="body2">
                          {cp.startDate ? new Date(cp.startDate).toLocaleDateString('ar-SA') : '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          تاريخ المراجعة
                        </Typography>
                        <Typography variant="body2">
                          {cp.reviewDate
                            ? new Date(cp.reviewDate).toLocaleDateString('ar-SA')
                            : '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          الأخصائي
                        </Typography>
                        <Typography variant="body2">{cp.author?.name || '-'}</Typography>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Box>
        </TabPanel>

        {/* ── Tab: Family ── */}
        <TabPanel value={tab} index={6}>
          <Box sx={{ p: 2 }}>
            {familyMembers.length === 0 ? (
              <Alert severity="info">لا يوجد أفراد أسرة مسجلون</Alert>
            ) : (
              <Grid container spacing={2}>
                {familyMembers.map((fm, i) => (
                  <Grid item xs={12} md={6} key={fm._id || i}>
                    <Card variant="outlined">
                      <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                          <FamilyIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {fm.name || fm.fullName || '-'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {fm.relationship || fm.role || '-'}
                          </Typography>
                          {fm.phone && <Typography variant="body2">{fm.phone}</Typography>}
                          {fm.isPrimaryContact && (
                            <Chip
                              size="small"
                              label="جهة اتصال رئيسية"
                              color="primary"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </TabPanel>

        {/* ── Tab: Timeline ── */}
        <TabPanel value={tab} index={7}>
          <Box sx={{ p: 2 }}>
            {timeline.length === 0 ? (
              <Alert severity="info">لا توجد أحداث في الخط الزمني</Alert>
            ) : (
              <List>
                {timeline.slice(0, 50).map((ev, i) => (
                  <ListItem key={ev._id || i} divider>
                    <ListItemIcon>
                      <NoteIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {ev.eventType || ev.type || 'حدث'}
                          </Typography>
                          {ev.domain && <Chip size="small" variant="outlined" label={ev.domain} />}
                        </Box>
                      }
                      secondary={
                        <>
                          {ev.description || ev.summary || ''}
                          {ev.timestamp && ` • ${new Date(ev.timestamp).toLocaleString('ar-SA')}`}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </TabPanel>
      </Card>
    </Box>
  );
}
