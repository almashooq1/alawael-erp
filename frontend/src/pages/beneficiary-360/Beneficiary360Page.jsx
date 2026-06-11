/**
 * Beneficiary 360° Profile Page — صفحة الملف الشامل للمستفيد
 *
 * يستخدم endpoint موحد: GET /core/beneficiaries/:id/360
 * يعيد 10 widgets في استدعاء واحد متوازٍ من الباك إند:
 *   summary | journey | timeline | assessments | goals |
 *   carePlan | sessions | family | alerts | progress
 *
 * عرض حسب الدور: clinical / operational / family / general
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  IconButton,
  Button,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Stack,
  Tooltip,
  Skeleton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
} from '@mui/material';
import {
  Person as PersonIcon,
  Event as EventIcon,
  Assessment as AssessmentIcon,
  LocalHospital as HospitalIcon,
  FamilyRestroom as FamilyIcon,
  Schedule as ScheduleIcon,
  TrackChanges as GoalIcon,
  ArrowBack as BackIcon,
  ExpandMore as ExpandIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  AutoAwesome as AIIcon,
  StickyNote2 as NoteIcon,
  CalendarMonth as CalendarIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  TrendingFlat as TrendFlatIcon,
  Timeline as TimelineIcon,
  Phone as PhoneIcon,
  NotificationsActive as AlertIcon,
  BarChart as ChartIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { coreAPI, aiRecommendationsAPI } from '../../services/ddd';
import { formatDate as _fmtDate, formatDateTime as _fmtDT } from 'utils/dateUtils';

/* ─────────────────────────────────────────────────────────────
 *  Constants
 * ───────────────────────────────────────────────────────────── */
function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const PHASE_COLORS = {
  referral: '#9e9e9e',
  intake: '#2196f3',
  triage: '#ff9800',
  initial_assessment: '#673ab7',
  mdt_review: '#00bcd4',
  care_plan_approval: '#009688',
  active_treatment: '#4caf50',
  reassessment: '#ff5722',
  outcome_review: '#795548',
  discharge_planning: '#607d8b',
  discharge: '#9e9e9e',
  follow_up: '#8bc34a',
  closed: '#424242',
};

const PHASE_ORDER = [
  'referral',
  'intake',
  'triage',
  'initial_assessment',
  'mdt_review',
  'care_plan_approval',
  'active_treatment',
  'reassessment',
  'outcome_review',
  'discharge_planning',
  'discharge',
];

const PHASE_LABELS_AR = {
  referral: 'الإحالة',
  intake: 'القبول',
  triage: 'الفرز',
  initial_assessment: 'التقييم الأولي',
  mdt_review: 'مراجعة الفريق',
  care_plan_approval: 'اعتماد الخطة',
  active_treatment: 'العلاج النشط',
  reassessment: 'إعادة التقييم',
  outcome_review: 'مراجعة النتائج',
  discharge_planning: 'تخطيط الخروج',
  discharge: 'الخروج',
};

const SEVERITY_CONFIG = {
  critical: { color: 'error', icon: <ErrorIcon fontSize="small" /> },
  high: { color: 'error', icon: <ErrorIcon fontSize="small" /> },
  warning: { color: 'warning', icon: <WarningIcon fontSize="small" /> },
  medium: { color: 'warning', icon: <WarningIcon fontSize="small" /> },
  info: { color: 'info', icon: <InfoIcon fontSize="small" /> },
  low: { color: 'info', icon: <InfoIcon fontSize="small" /> },
};

const GOAL_CATEGORY_COLORS = {
  motor: '#4caf50',
  speech: '#2196f3',
  cognitive: '#9c27b0',
  social: '#ff9800',
  behavioral: '#f44336',
  life_skills: '#00bcd4',
  other: '#607d8b',
};

const PIE_COLORS = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#00bcd4'];

/* ─────────────────────────────────────────────────────────────
 *  Helper sub-components
 * ───────────────────────────────────────────────────────────── */

function StatCard({ label, value, icon, color, subtitle }) {
  return (
    <Card sx={{ borderRight: `4px solid ${color}`, height: '100%' }}>
      <CardContent
        sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}
      >
        <Avatar sx={{ bgcolor: `${color}20`, color, width: 44, height: 44 }}>{icon}</Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" color={color} lineHeight={1}>
            {value ?? '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.disabled" display="block">
              {subtitle}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

function AlertItem({ alert }) {
  const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
  return (
    <Alert severity={cfg.color} icon={cfg.icon} sx={{ mb: 1, py: 0.5 }}>
      <Typography variant="body2" fontWeight="bold">
        {alert.title}
      </Typography>
      {alert.description && <Typography variant="caption">{alert.description}</Typography>}
      {alert.dueDate && (
        <Typography variant="caption" color="text.secondary" display="block">
          تاريخ الاستحقاق: {_fmtDate(alert.dueDate)}
        </Typography>
      )}
    </Alert>
  );
}

function TrendIcon({ direction }) {
  if (direction === 'improving') return <TrendUpIcon color="success" fontSize="small" />;
  if (direction === 'declining') return <TrendDownIcon color="error" fontSize="small" />;
  return <TrendFlatIcon color="disabled" fontSize="small" />;
}

function JourneyStepper({ currentPhase, phases }) {
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);
  return (
    <Box sx={{ overflowX: 'auto', pb: 1 }}>
      <Stepper
        activeStep={currentIdx}
        alternativeLabel
        connector={<StepConnector />}
        sx={{ minWidth: 900 }}
      >
        {PHASE_ORDER.map((phase, idx) => {
          const phaseData = phases?.find(p => p.name === phase);
          return (
            <Step key={phase} completed={idx < currentIdx || phaseData?.status === 'completed'}>
              <StepLabel
                sx={{
                  '& .MuiStepLabel-label': {
                    fontSize: '0.65rem',
                    color: idx === currentIdx ? PHASE_COLORS[phase] : 'text.secondary',
                    fontWeight: idx === currentIdx ? 'bold' : 'normal',
                  },
                }}
              >
                {PHASE_LABELS_AR[phase]}
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>
    </Box>
  );
}

/* ─────────────────────────────────────────────────────────────
 *  Main Component
 * ───────────────────────────────────────────────────────────── */
export default function Beneficiary360Page() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  /* ── Single unified 360° call ── */
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [d360Res, recRes] = await Promise.all([
        coreAPI.get360(id),
        aiRecommendationsAPI.getByBeneficiary(id).catch(() => ({ data: { data: [] } })),
      ]);
      setDashboard(d360Res?.data?.data || d360Res?.data || null);
      const recData = recRes?.data?.data || recRes?.data || [];
      setRecommendations(Array.isArray(recData) ? recData : []);
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء تحميل بيانات المستفيد');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Widget shortcuts ── */
  const summary = dashboard?.summary || {};
  const journey = dashboard?.journey || {};
  const timeline = dashboard?.timeline || {};
  const assessWgt = dashboard?.assessments || {};
  const goalsWgt = dashboard?.goals || {};
  const carePlan = dashboard?.carePlan || {};
  const sessionsWgt = dashboard?.sessions || {};
  const family = dashboard?.family || {};
  const alertsWgt = dashboard?.alerts || {};
  const progressWgt = dashboard?.progress || {};

  /* ── Quick stats (derived from widgets) ── */
  const quickStats = useMemo(
    () => [
      {
        label: 'الجلسات المكتملة',
        value: sessionsWgt.totalCompleted ?? '—',
        icon: <ScheduleIcon />,
        color: '#4caf50',
        subtitle:
          sessionsWgt.attendanceRate != null
            ? `معدل حضور ${sessionsWgt.attendanceRate}%`
            : undefined,
      },
      {
        label: 'الأهداف النشطة',
        value: goalsWgt.active?.length ?? '—',
        icon: <GoalIcon />,
        color: '#673ab7',
        subtitle:
          goalsWgt.averageProgress != null ? `متوسط تقدم ${goalsWgt.averageProgress}%` : undefined,
      },
      {
        label: 'التقييمات',
        value: assessWgt.count ?? '—',
        icon: <AssessmentIcon />,
        color: '#ff9800',
      },
      {
        label: 'التنبيهات',
        value: alertsWgt.total ?? 0,
        icon: <AlertIcon />,
        color: alertsWgt.critical > 0 ? '#f44336' : '#607d8b',
        subtitle: alertsWgt.critical > 0 ? `${alertsWgt.critical} حرجة` : undefined,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dashboard]
  );

  /* ── Loading state ── */
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={140} sx={{ mb: 2, borderRadius: 2 }} />
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={90} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
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

  if (!dashboard) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">لم يتم العثور على بيانات المستفيد</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          العودة
        </Button>
      </Box>
    );
  }

  const criticalAlerts =
    alertsWgt.items?.filter(a => a.severity === 'critical' || a.severity === 'high') || [];

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* ═══════════════ HEADER ═══════════════ */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2, gap: 2 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mt: 0.5 }}>
          <BackIcon />
        </IconButton>
        <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 24 }}>
          {(summary.name || '?')[0]}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight="bold">
            {summary.name || '—'}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" sx={{ mt: 0.5 }}>
            <Chip
              size="small"
              label={summary.status === 'active' ? 'نشط' : summary.status || 'نشط'}
              color={summary.status === 'active' ? 'success' : 'default'}
            />
            {summary.age != null && (
              <Chip size="small" variant="outlined" label={`${summary.age} سنة`} />
            )}
            {summary.fileNumber && (
              <Chip size="small" variant="outlined" label={`ملف: ${summary.fileNumber}`} />
            )}
            {summary.primaryDiagnosis && (
              <Chip size="small" variant="outlined" color="info" label={summary.primaryDiagnosis} />
            )}
            {summary.overallRiskLevel && summary.overallRiskLevel !== 'low' && (
              <Chip
                size="small"
                color={
                  summary.overallRiskLevel === 'critical'
                    ? 'error'
                    : summary.overallRiskLevel === 'high'
                      ? 'warning'
                      : 'default'
                }
                label={`مستوى الخطر: ${summary.overallRiskLevel}`}
              />
            )}
            {journey.currentPhase && (
              <Chip
                size="small"
                sx={{ bgcolor: PHASE_COLORS[journey.currentPhase] || '#4caf50', color: '#fff' }}
                label={`${PHASE_LABELS_AR[journey.currentPhase] || journey.currentPhase}`}
              />
            )}
          </Stack>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={loadData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="تعديل">
            <IconButton onClick={() => navigate(`/beneficiaries/${id}/edit`)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="طباعة">
            <IconButton onClick={() => window.print()}>
              <PrintIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* ═══════════════ CRITICAL ALERTS BANNER ═══════════════ */}
      {criticalAlerts.length > 0 && (
        <Alert
          severity="error"
          icon={<ErrorIcon />}
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => setTab(7)}>
              عرض الكل
            </Button>
          }
        >
          <Typography variant="subtitle2" fontWeight="bold">
            {criticalAlerts.length} تنبيه{criticalAlerts.length > 1 ? 'ات' : ''} عاجل
            {criticalAlerts.length > 1 ? 'ة' : ''}
          </Typography>
          {criticalAlerts.slice(0, 2).map((a, i) => (
            <Typography key={i} variant="body2">
              • {a.title}
            </Typography>
          ))}
        </Alert>
      )}

      {/* ═══════════════ QUICK STATS ═══════════════ */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {quickStats.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      {/* ═══════════════ JOURNEY STEPPER ═══════════════ */}
      {journey.currentPhase && (
        <Card sx={{ mb: 2, p: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }} color="primary">
            مسار الرعاية — المرحلة الحالية:{' '}
            {PHASE_LABELS_AR[journey.currentPhase] || journey.currentPhase}
            {journey.progressPercent != null && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                ({journey.progressPercent}% مكتمل)
              </Typography>
            )}
          </Typography>
          <JourneyStepper currentPhase={journey.currentPhase} phases={journey.phases} />
        </Card>
      )}

      {/* ═══════════════ AI RECOMMENDATIONS ═══════════════ */}
      {recommendations.length > 0 && (
        <Alert severity="info" icon={<AIIcon />} sx={{ mb: 2 }}>
          <Typography variant="subtitle2">{recommendations.length} توصية ذكية متاحة</Typography>
          {recommendations.slice(0, 2).map((r, i) => (
            <Typography key={i} variant="body2" sx={{ mt: 0.5 }}>
              • {r.title || r.text || r.description}
            </Typography>
          ))}
        </Alert>
      )}

      {/* ═══════════════ TABS ═══════════════ */}
      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<PersonIcon />} iconPosition="start" label="النظرة العامة" />
          <Tab icon={<HospitalIcon />} iconPosition="start" label="خطة الرعاية" />
          <Tab
            icon={<AssessmentIcon />}
            iconPosition="start"
            label={`التقييمات (${assessWgt.count ?? 0})`}
          />
          <Tab
            icon={<ScheduleIcon />}
            iconPosition="start"
            label={`الجلسات (${sessionsWgt.totalCompleted ?? 0})`}
          />
          <Tab
            icon={<GoalIcon />}
            iconPosition="start"
            label={`الأهداف (${(goalsWgt.active?.length ?? 0) + (goalsWgt.achieved?.length ?? 0)})`}
          />
          <Tab
            icon={<FamilyIcon />}
            iconPosition="start"
            label={`الأسرة (${(family.guardians?.length ?? 0) + (family.contacts?.length ?? 0)})`}
          />
          <Tab icon={<ChartIcon />} iconPosition="start" label="التقدم والمقاييس" />
          <Tab
            icon={<TimelineIcon />}
            iconPosition="start"
            label={`الخط الزمني`}
          />
          <Tab
            icon={
              <Badge badgeContent={alertsWgt.total || 0} color="error" max={99}>
                <AlertIcon />
              </Badge>
            }
            iconPosition="start"
            label="التنبيهات"
          />
        </Tabs>

        {/* ─── Tab 0: Overview ─── */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              {/* Personal Info */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardHeader
                    title="البيانات الشخصية"
                    titleTypographyProps={{ variant: 'subtitle1', fontWeight: 'bold' }}
                    avatar={
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <PersonIcon />
                      </Avatar>
                    }
                  />
                  <CardContent>
                    <Grid container spacing={1}>
                      {[
                        ['الاسم الكامل', summary.name],
                        [
                          'تاريخ الميلاد',
                          summary.dateOfBirth ? _fmtDate(summary.dateOfBirth) : null,
                        ],
                        ['العمر', summary.age != null ? `${summary.age} سنة` : null],
                        [
                          'الجنس',
                          summary.gender === 'male'
                            ? 'ذكر'
                            : summary.gender === 'female'
                              ? 'أنثى'
                              : summary.gender,
                        ],
                        ['رقم الملف', summary.fileNumber],
                        ['رقم الهوية', summary.nationalId],
                        ['التشخيص الأولي', summary.primaryDiagnosis],
                        ['نوع الإعاقة', summary.disabilityType],
                        ['درجة الإعاقة', summary.disabilitySeverity],
                        ['الجنسية', summary.nationality],
                        ['الفرع', summary.branch],
                        [
                          'تاريخ التسجيل',
                          summary.registrationDate ? _fmtDate(summary.registrationDate) : null,
                        ],
                      ]
                        .filter(([, v]) => v)
                        .map(([label, value], i) => (
                          <React.Fragment key={i}>
                            <Grid item xs={5}>
                              <Typography variant="body2" color="text.secondary">
                                {label}
                              </Typography>
                            </Grid>
                            <Grid item xs={7}>
                              <Typography variant="body2">{value}</Typography>
                            </Grid>
                          </React.Fragment>
                        ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Journey Summary */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardHeader
                    title="ملخص المسار العلاجي"
                    titleTypographyProps={{ variant: 'subtitle1', fontWeight: 'bold' }}
                    avatar={
                      <Avatar sx={{ bgcolor: 'success.main' }}>
                        <EventIcon />
                      </Avatar>
                    }
                  />
                  <CardContent>
                    {journey.currentPhase ? (
                      <Grid container spacing={1}>
                        {[
                          [
                            'المرحلة الحالية',
                            PHASE_LABELS_AR[journey.currentPhase] || journey.currentPhase,
                          ],
                          ['نوع الحلقة', journey.episodeType],
                          [
                            'تاريخ البدء',
                            journey.episodeStartDate ? _fmtDate(journey.episodeStartDate) : null,
                          ],
                          ['الأخصائي الرئيسي', journey.primaryTherapist],
                          [
                            'المدة (أيام)',
                            journey.durationDays != null ? `${journey.durationDays} يوم` : null,
                          ],
                          [
                            'التقدم',
                            journey.progressPercent != null ? `${journey.progressPercent}%` : null,
                          ],
                        ]
                          .filter(([, v]) => v)
                          .map(([label, value], i) => (
                            <React.Fragment key={i}>
                              <Grid item xs={5}>
                                <Typography variant="body2" color="text.secondary">
                                  {label}
                                </Typography>
                              </Grid>
                              <Grid item xs={7}>
                                <Typography variant="body2">{value}</Typography>
                              </Grid>
                            </React.Fragment>
                          ))}
                        {journey.progressPercent != null && (
                          <Grid item xs={12}>
                            <LinearProgress
                              variant="determinate"
                              value={journey.progressPercent}
                              sx={{ height: 8, borderRadius: 4, mt: 1 }}
                            />
                          </Grid>
                        )}
                      </Grid>
                    ) : (
                      <Alert severity="info">لا توجد حلقة رعاية نشطة</Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Upcoming Sessions preview */}
              {sessionsWgt.upcoming?.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader
                      title="الجلسات القادمة"
                      titleTypographyProps={{ variant: 'subtitle1', fontWeight: 'bold' }}
                      avatar={
                        <Avatar sx={{ bgcolor: '#4caf50' }}>
                          <ScheduleIcon />
                        </Avatar>
                      }
                    />
                    <CardContent sx={{ p: 0 }}>
                      <List dense>
                        {sessionsWgt.upcoming.slice(0, 3).map((s, i) => (
                          <ListItem key={i} divider>
                            <ListItemIcon>
                              <CalendarIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText
                              primary={s.sessionType || s.type || 'جلسة علاجية'}
                              secondary={s.scheduledDate ? _fmtDT(s.scheduledDate) : ''}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Active Goals summary */}
              {goalsWgt.active?.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader
                      title={`الأهداف النشطة (${goalsWgt.active.length})`}
                      titleTypographyProps={{ variant: 'subtitle1', fontWeight: 'bold' }}
                      avatar={
                        <Avatar sx={{ bgcolor: '#673ab7' }}>
                          <GoalIcon />
                        </Avatar>
                      }
                    />
                    <CardContent sx={{ p: 0 }}>
                      <List dense>
                        {goalsWgt.active.slice(0, 4).map((g, i) => (
                          <ListItem key={i} divider>
                            <ListItemIcon>
                              <Avatar
                                sx={{
                                  width: 28,
                                  height: 28,
                                  bgcolor: GOAL_CATEGORY_COLORS[g.category] || '#607d8b',
                                  fontSize: 12,
                                }}
                              >
                                {(g.category || 'o')[0].toUpperCase()}
                              </Avatar>
                            </ListItemIcon>
                            <ListItemText
                              primary={g.title || g.description}
                              secondary={
                                g.progressPercent != null ? (
                                  <Box
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}
                                  >
                                    <LinearProgress
                                      variant="determinate"
                                      value={g.progressPercent}
                                      sx={{ flex: 1, height: 4, borderRadius: 2 }}
                                    />
                                    <Typography variant="caption">{g.progressPercent}%</Typography>
                                  </Box>
                                ) : null
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Box>
        </TabPanel>

        {/* ─── Tab 1: Care Plan ─── */}
        <TabPanel value={tab} index={1}>
          <Box sx={{ p: 2 }}>
            {!carePlan.currentPlan ? (
              <Alert severity="info">لا توجد خطة رعاية نشطة</Alert>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ borderColor: 'primary.main' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold">
                          {carePlan.currentPlan.title || 'خطة الرعاية الحالية'}
                        </Typography>
                        <Chip
                          label={carePlan.currentPlan.status || 'نشط'}
                          color={carePlan.currentPlan.status === 'active' ? 'success' : 'default'}
                        />
                      </Box>
                      <Grid container spacing={2}>
                        {[
                          [
                            'تاريخ البدء',
                            carePlan.currentPlan.startDate
                              ? _fmtDate(carePlan.currentPlan.startDate)
                              : null,
                          ],
                          [
                            'تاريخ الانتهاء',
                            carePlan.currentPlan.endDate
                              ? _fmtDate(carePlan.currentPlan.endDate)
                              : null,
                          ],
                          [
                            'تاريخ المراجعة',
                            carePlan.currentPlan.reviewDate
                              ? _fmtDate(carePlan.currentPlan.reviewDate)
                              : null,
                          ],
                          [
                            'عدد الأقسام',
                            carePlan.sectionCount != null ? carePlan.sectionCount : null,
                          ],
                          [
                            'عدد التدخلات',
                            carePlan.interventionCount != null ? carePlan.interventionCount : null,
                          ],
                          [
                            'معدل التقدم',
                            carePlan.currentPlan.progressPercent != null
                              ? `${carePlan.currentPlan.progressPercent}%`
                              : null,
                          ],
                        ]
                          .filter(([, v]) => v != null)
                          .map(([label, value], i) => (
                            <Grid item xs={6} md={4} key={i}>
                              <Typography variant="caption" color="text.secondary">
                                {label}
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {value}
                              </Typography>
                            </Grid>
                          ))}
                      </Grid>
                      {carePlan.currentPlan.progressPercent != null && (
                        <Box sx={{ mt: 2 }}>
                          <LinearProgress
                            variant="determinate"
                            value={carePlan.currentPlan.progressPercent}
                            sx={{ height: 10, borderRadius: 5 }}
                          />
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        </TabPanel>

        {/* ─── Tab 2: Assessments ─── */}
        <TabPanel value={tab} index={2}>
          <Box sx={{ p: 2 }}>
            {!assessWgt.byType || Object.keys(assessWgt.byType).length === 0 ? (
              <Alert severity="info">لا توجد تقييمات مسجلة</Alert>
            ) : (
              <Grid container spacing={2}>
                {Object.entries(assessWgt.byType).map(([type, assessments], i) => (
                  <Grid item xs={12} md={6} key={i}>
                    <Card variant="outlined">
                      <CardHeader
                        title={type}
                        subheader={`${assessments.length} تقييم`}
                        titleTypographyProps={{ variant: 'subtitle2', fontWeight: 'bold' }}
                      />
                      <CardContent sx={{ p: 0 }}>
                        <List dense>
                          {(Array.isArray(assessments) ? assessments : [assessments])
                            .slice(0, 3)
                            .map((a, j) => (
                              <ListItem key={j} divider>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <Typography variant="body2">
                                        {a.instrument || a.tool || type}
                                      </Typography>
                                      <Typography variant="body2" fontWeight="bold" color="primary">
                                        {a.totalScore ?? a.score ?? '—'}
                                      </Typography>
                                    </Box>
                                  }
                                  secondary={a.date ? _fmtDate(a.date) : ''}
                                />
                              </ListItem>
                            ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </TabPanel>

        {/* ─── Tab 3: Sessions ─── */}
        <TabPanel value={tab} index={3}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {[
                { label: 'مكتملة', value: sessionsWgt.totalCompleted, color: '#4caf50' },
                { label: 'ملغاة', value: sessionsWgt.totalCancelled, color: '#f44336' },
                { label: 'إجمالي', value: sessionsWgt.totalSessions, color: '#2196f3' },
                {
                  label: 'معدل الحضور',
                  value:
                    sessionsWgt.attendanceRate != null ? `${sessionsWgt.attendanceRate}%` : null,
                  color: '#ff9800',
                },
              ]
                .filter(s => s.value != null)
                .map((s, i) => (
                  <Grid item xs={6} md={3} key={i}>
                    <Paper sx={{ p: 2, textAlign: 'center', borderTop: `4px solid ${s.color}` }}>
                      <Typography variant="h4" fontWeight="bold" color={s.color}>
                        {s.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.label}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
            </Grid>

            {sessionsWgt.recent?.length > 0 && (
              <>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                  آخر الجلسات
                </Typography>
                <List>
                  {sessionsWgt.recent.map((s, i) => (
                    <ListItem key={s._id || i} divider>
                      <ListItemIcon>
                        <Avatar
                          sx={{
                            bgcolor:
                              s.status === 'completed'
                                ? 'success.main'
                                : s.status === 'cancelled'
                                  ? 'error.main'
                                  : 'grey.400',
                            width: 36,
                            height: 36,
                          }}
                        >
                          <ScheduleIcon fontSize="small" />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" fontWeight="bold">
                              {s.sessionType || s.type || 'جلسة'}
                            </Typography>
                            <Chip
                              size="small"
                              label={s.status || 'مكتمل'}
                              color={
                                s.status === 'completed'
                                  ? 'success'
                                  : s.status === 'cancelled'
                                    ? 'error'
                                    : 'default'
                              }
                            />
                          </Stack>
                        }
                        secondary={`${s.scheduledDate ? _fmtDate(s.scheduledDate) : ''}${s.therapist?.name ? ` • ${s.therapist.name}` : ''}${s.duration ? ` • ${s.duration} دق` : ''}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        </TabPanel>

        {/* ─── Tab 4: Goals ─── */}
        <TabPanel value={tab} index={4}>
          <Box sx={{ p: 2 }}>
            {/* Goals summary stats */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {[
                { label: 'نشطة', value: goalsWgt.active?.length, color: '#4caf50' },
                { label: 'محققة', value: goalsWgt.achieved?.length, color: '#2196f3' },
                {
                  label: 'متوسط التقدم',
                  value: goalsWgt.averageProgress != null ? `${goalsWgt.averageProgress}%` : null,
                  color: '#ff9800',
                },
              ]
                .filter(s => s.value != null)
                .map((s, i) => (
                  <Grid item xs={4} key={i}>
                    <Paper sx={{ p: 2, textAlign: 'center', borderTop: `4px solid ${s.color}` }}>
                      <Typography variant="h4" fontWeight="bold" color={s.color}>
                        {s.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.label}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
            </Grid>

            {/* Goals by category */}
            {goalsWgt.byCategory && Object.keys(goalsWgt.byCategory).length > 0 && (
              <>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                  الأهداف حسب المجال
                </Typography>
                {Object.entries(goalsWgt.byCategory).map(([category, goals]) => (
                  <Accordion key={category}>
                    <AccordionSummary expandIcon={<ExpandIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            bgcolor: GOAL_CATEGORY_COLORS[category] || '#607d8b',
                            fontSize: 12,
                          }}
                        >
                          {category[0]?.toUpperCase()}
                        </Avatar>
                        <Typography fontWeight="bold">{category}</Typography>
                        <Chip size="small" label={Array.isArray(goals) ? goals.length : 1} />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      <List dense>
                        {(Array.isArray(goals) ? goals : [goals]).map((g, i) => (
                          <ListItem key={i} divider>
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
                              primary={g.title || g.description}
                              secondary={
                                g.progressPercent != null ? (
                                  <Box
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}
                                  >
                                    <LinearProgress
                                      variant="determinate"
                                      value={g.progressPercent}
                                      sx={{ flex: 1, height: 5, borderRadius: 2 }}
                                    />
                                    <Typography variant="caption">{g.progressPercent}%</Typography>
                                  </Box>
                                ) : null
                              }
                            />
                            <ListItemSecondaryAction>
                              <Chip
                                size="small"
                                label={g.status || 'نشط'}
                                color={g.status === 'achieved' ? 'success' : 'default'}
                              />
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </>
            )}

            {!goalsWgt.active?.length && !goalsWgt.achieved?.length && (
              <Alert severity="info">لا توجد أهداف علاجية مسجلة</Alert>
            )}
          </Box>
        </TabPanel>

        {/* ─── Tab 5: Family ─── */}
        <TabPanel value={tab} index={5}>
          <Box sx={{ p: 2 }}>
            {family.guardians?.length > 0 && (
              <>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                  الأولياء والمشرفون
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {family.guardians.map((g, i) => (
                    <Grid item xs={12} md={6} key={g._id || i}>
                      <Card variant="outlined">
                        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <FamilyIcon />
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {g.name || g.fullName || '—'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {g.relationship || g.role || '—'}
                            </Typography>
                            {g.phone && (
                              <Stack
                                direction="row"
                                spacing={0.5}
                                alignItems="center"
                                sx={{ mt: 0.5 }}
                              >
                                <PhoneIcon fontSize="small" color="action" />
                                <Typography variant="body2">{g.phone}</Typography>
                              </Stack>
                            )}
                          </Box>
                          {g.isPrimary && <Chip size="small" label="رئيسي" color="primary" />}
                          {family.portalAccess?.guardians?.includes(g._id) && (
                            <Chip
                              size="small"
                              label="بوابة الأسرة"
                              color="success"
                              variant="outlined"
                            />
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}

            {family.contacts?.length > 0 && (
              <>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                  جهات الاتصال الطارئة
                </Typography>
                <Grid container spacing={2}>
                  {family.contacts.map((c, i) => (
                    <Grid item xs={12} md={6} key={c._id || i}>
                      <Card variant="outlined">
                        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <Avatar sx={{ bgcolor: 'warning.main' }}>
                            <PhoneIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {c.name || '—'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {c.relationship || '—'}
                            </Typography>
                            {c.phone && <Typography variant="body2">{c.phone}</Typography>}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}

            {!family.guardians?.length && !family.contacts?.length && (
              <Alert severity="info">لا توجد بيانات أسرة مسجلة</Alert>
            )}
          </Box>
        </TabPanel>

        {/* ─── Tab 6: Progress Charts ─── */}
        <TabPanel value={tab} index={6}>
          <Box sx={{ p: 2 }}>
            {progressWgt.dataPoints?.length > 0 ? (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardHeader
                      title="منحنى التقدم في المقاييس (12 شهراً)"
                      titleTypographyProps={{ variant: 'subtitle1', fontWeight: 'bold' }}
                      avatar={
                        <Avatar sx={{ bgcolor: '#4caf50' }}>
                          <TrendUpIcon />
                        </Avatar>
                      }
                      action={
                        progressWgt.trend && (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <TrendIcon direction={progressWgt.trend} />
                            <Typography variant="caption">
                              {progressWgt.trend === 'improving'
                                ? 'تحسن'
                                : progressWgt.trend === 'declining'
                                  ? 'تراجع'
                                  : 'ثابت'}
                            </Typography>
                          </Stack>
                        )
                      }
                    />
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={progressWgt.dataPoints}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
                          <ChartTooltip formatter={v => [`${v}%`]} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#4caf50"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            name="الدرجة"
                          />
                          {progressWgt.dataPoints[0]?.target != null && (
                            <Line
                              type="monotone"
                              dataKey="target"
                              stroke="#ff9800"
                              strokeDasharray="5 5"
                              strokeWidth={2}
                              dot={false}
                              name="الهدف"
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Goals progress pie chart */}
                {(goalsWgt.active?.length || goalsWgt.achieved?.length) && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardHeader
                        title="توزيع الأهداف"
                        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 'bold' }}
                      />
                      <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'نشطة', value: goalsWgt.active?.length || 0 },
                                { name: 'محققة', value: goalsWgt.achieved?.length || 0 },
                              ]}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {[0, 1].map(i => (
                                <Cell key={i} fill={PIE_COLORS[i]} />
                              ))}
                            </Pie>
                            <ChartTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Sessions attendance bar chart */}
                {sessionsWgt.totalSessions != null && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardHeader
                        title="إحصائيات الجلسات"
                        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 'bold' }}
                      />
                      <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart
                            data={[
                              {
                                name: 'الجلسات',
                                مكتملة: sessionsWgt.totalCompleted || 0,
                                ملغاة: sessionsWgt.totalCancelled || 0,
                              },
                            ]}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <ChartTooltip />
                            <Legend />
                            <Bar dataKey="مكتملة" fill="#4caf50" />
                            <Bar dataKey="ملغاة" fill="#f44336" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            ) : (
              <Alert severity="info">لا توجد بيانات تقدم كافية لعرض الرسوم البيانية</Alert>
            )}
          </Box>
        </TabPanel>

        {/* ─── Tab 7: Timeline ─── */}
        <TabPanel value={tab} index={7}>
          <Box sx={{ p: 2 }}>
            {!timeline.events?.length ? (
              <Alert severity="info">لا توجد أحداث في الخط الزمني</Alert>
            ) : (
              <List>
                {timeline.events.map((ev, i) => (
                  <ListItem key={ev._id || i} divider>
                    <ListItemIcon>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light' }}>
                        <NoteIcon fontSize="small" />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight="bold">
                            {ev.eventType || ev.type || 'حدث'}
                          </Typography>
                          {ev.domain && <Chip size="small" variant="outlined" label={ev.domain} />}
                        </Stack>
                      }
                      secondary={`${ev.description || ev.summary || ''}${ev.timestamp ? ` • ${_fmtDT(ev.timestamp)}` : ''}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </TabPanel>

        {/* ─── Tab 8: Alerts ─── */}
        <TabPanel value={tab} index={8}>
          <Box sx={{ p: 2 }}>
            {!alertsWgt.items?.length ? (
              <Alert severity="success">لا توجد تنبيهات نشطة — وضع المستفيد مستقر</Alert>
            ) : (
              <>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {[
                    { label: 'حرجة', value: alertsWgt.critical, color: '#f44336' },
                    { label: 'عالية', value: alertsWgt.high, color: '#ff5722' },
                    { label: 'متوسطة', value: alertsWgt.warning, color: '#ff9800' },
                    { label: 'معلومات', value: alertsWgt.info, color: '#2196f3' },
                  ]
                    .filter(s => s.value)
                    .map((s, i) => (
                      <Grid item xs={3} key={i}>
                        <Paper
                          sx={{ p: 1.5, textAlign: 'center', borderTop: `4px solid ${s.color}` }}
                        >
                          <Typography variant="h5" fontWeight="bold" color={s.color}>
                            {s.value}
                          </Typography>
                          <Typography variant="caption">{s.label}</Typography>
                        </Paper>
                      </Grid>
                    ))}
                </Grid>
                {alertsWgt.items.map((a, i) => (
                  <AlertItem key={i} alert={a} />
                ))}
              </>
            )}
          </Box>
        </TabPanel>
      </Card>
    </Box>
  );
}
