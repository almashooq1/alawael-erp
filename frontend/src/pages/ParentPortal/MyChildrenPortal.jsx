/**
 * MyChildrenPortal — /my-children page (parent-facing).
 *
 * Parent-oriented view backed by /api/parent-v2. One page shows:
 *   1. list of my children (cards)
 *   2. click a child → tabs for Overview / Sessions / Care Plan / Assessments
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Stack,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Chip,
  Button,
  IconButton,
  Avatar,
  Paper,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SchoolIcon from '@mui/icons-material/School';
import HealingIcon from '@mui/icons-material/Healing';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DownloadIcon from '@mui/icons-material/Download';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import api from '../../services/api.client';
import ParentComplaintsPanel from './ParentComplaintsPanel';

const ACTIVE_CHILD_KEY = 'parent-portal.activeChildId';

const SESSION_STATUS = {
  SCHEDULED: { label: 'مجدولة', color: 'info' },
  CONFIRMED: { label: 'مؤكَّدة', color: 'primary' },
  IN_PROGRESS: { label: 'جارية', color: 'warning' },
  COMPLETED: { label: 'مكتملة', color: 'success' },
  NO_SHOW: { label: 'لم يحضر', color: 'error' },
  CANCELLED_BY_PATIENT: { label: 'ألغى المستفيد', color: 'default' },
  CANCELLED_BY_CENTER: { label: 'ألغى المركز', color: 'default' },
  RESCHEDULED: { label: 'أُعيدت جدولتها', color: 'secondary' },
};
const INTERP_LABELS = {
  within_normal: 'طبيعي',
  borderline: 'حدّي',
  mild: 'خفيف',
  moderate: 'متوسط',
  severe: 'شديد',
  profound: 'شديد جداً',
  not_applicable: 'غير منطبق',
};
const GOAL_STATUS = {
  PENDING: { label: 'منتظر', color: 'default' },
  IN_PROGRESS: { label: 'قيد التنفيذ', color: 'info' },
  ACHIEVED: { label: 'محقَّق', color: 'success' },
  DISCONTINUED: { label: 'موقوف', color: 'error' },
};
const SECTION_LABELS = {
  educational: { label: 'التربوية (IEP)', icon: <SchoolIcon fontSize="small" />, color: '#1976d2' },
  therapeutic: { label: 'العلاجية', icon: <HealingIcon fontSize="small" />, color: '#9c27b0' },
  lifeSkills: {
    label: 'المهارات الحياتية',
    icon: <HomeWorkIcon fontSize="small" />,
    color: '#ed6c02',
  },
};

function fullName(x) {
  if (!x) return '';
  return x.firstName_ar || x.fullName || `${x.firstName || ''} ${x.lastName || ''}`.trim() || '';
}
function formatDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('ar-SA');
  } catch {
    return '—';
  }
}

export default function MyChildrenPortal() {
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [children, setChildren] = useState([]);
  const [me, setMe] = useState(null);
  const [activeChildId, setActiveChildIdRaw] = useState(() => {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(ACTIVE_CHILD_KEY) : null;
    } catch {
      return null;
    }
  });
  const [tab, setTab] = useState(0);

  // Persist across page reloads — parent doesn't lose context.
  const setActiveChildId = useCallback(id => {
    setActiveChildIdRaw(id);
    try {
      if (typeof window !== 'undefined') {
        if (id) window.localStorage.setItem(ACTIVE_CHILD_KEY, id);
        else window.localStorage.removeItem(ACTIVE_CHILD_KEY);
      }
    } catch {
      /* storage unavailable — silently fall back to in-memory */
    }
  }, []);

  // Per-child cached data
  const [childData, setChildData] = useState({});
  const [childLoading, setChildLoading] = useState(false);

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get('/parent-v2/me');
      setMe(data?.data || null);
    } catch {
      setMe(null);
    }
  }, []);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const { data } = await api.get('/parent-v2/children');
      const list = data?.items || [];
      setChildren(list);
      // Restore active child from localStorage if it's still in the list;
      // otherwise default to the first child.
      if (list.length > 0) {
        const stillThere = activeChildId && list.some(c => c._id === activeChildId);
        if (!stillThere) setActiveChildId(list[0]._id);
      }
    } catch (err) {
      setErrMsg(
        err?.response?.data?.message || 'فشل تحميل قائمة الأطفال — تأكد من تسجيل الدخول كولي أمر'
      );
    } finally {
      setLoading(false);
    }
  }, [activeChildId]);

  const loadChildTab = useCallback(
    async (childId, tabIndex) => {
      if (!childId) return;
      setChildLoading(true);
      try {
        const cache = childData[childId] || {};
        const next = { ...cache };
        if (tabIndex === 0 && !cache.overview) {
          const { data } = await api.get(`/parent-v2/children/${childId}/overview`);
          next.overview = data;
        }
        if (tabIndex === 1 && !cache.sessions) {
          const [up, past] = await Promise.all([
            api.get(`/parent-v2/children/${childId}/sessions?scope=upcoming&limit=20`),
            api.get(`/parent-v2/children/${childId}/sessions?scope=past&limit=30`),
          ]);
          next.sessions = { upcoming: up.data?.items || [], past: past.data?.items || [] };
        }
        if (tabIndex === 2 && !cache.plan) {
          const { data } = await api.get(`/parent-v2/children/${childId}/care-plan`);
          next.plan = data?.data || null;
        }
        if (tabIndex === 3 && !cache.assessments) {
          const [assess, att] = await Promise.all([
            api.get(`/parent-v2/children/${childId}/assessments`),
            api.get(`/parent-v2/children/${childId}/attendance`),
          ]);
          next.assessments = { items: assess.data?.items || [], byTool: assess.data?.byTool || {} };
          next.attendance = att.data;
        }
        setChildData(prev => ({ ...prev, [childId]: next }));
      } catch (err) {
        setErrMsg(err?.response?.data?.message || 'فشل تحميل البيانات');
      } finally {
        setChildLoading(false);
      }
    },
    [childData]
  );

  useEffect(() => {
    loadMe();
    loadChildren();
  }, [loadMe, loadChildren]);

  useEffect(() => {
    if (activeChildId) loadChildTab(activeChildId, tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChildId, tab]);

  const active = useMemo(
    () => children.find(c => c._id === activeChildId) || null,
    [children, activeChildId]
  );
  const activeData = childData[activeChildId] || {};

  const refreshActive = () => {
    if (!activeChildId) return;
    setChildData(prev => ({ ...prev, [activeChildId]: {} }));
    loadChildTab(activeChildId, tab);
  };

  const [downloadingReport, setDownloadingReport] = useState(false);
  const downloadReport = useCallback(async () => {
    if (!activeChildId) return;
    setDownloadingReport(true);
    try {
      const resp = await api.get(`/parent-v2/children/${activeChildId}/report/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `progress-report-${activeChildId}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تنزيل التقرير');
    } finally {
      setDownloadingReport(false);
    }
  }, [activeChildId]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        gap={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold">
            بوابة ولي الأمر
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {me
              ? `مرحباً ${fullName(me)} — تابع أطفالك: الجلسات، الخطط، التقييمات.`
              : 'متابعة أطفالك: الجلسات، الخطط العلاجية، التقييمات الإكلينيكية.'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {children.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel id="active-child-label">الطفل النشط</InputLabel>
              <Select
                labelId="active-child-label"
                value={activeChildId || ''}
                label="الطفل النشط"
                onChange={e => setActiveChildId(e.target.value)}
                renderValue={selectedId => {
                  const c = children.find(ch => ch._id === selectedId);
                  if (!c) return '—';
                  return (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                        <PersonIcon sx={{ fontSize: 14 }} />
                      </Avatar>
                      <Typography variant="body2">{fullName(c) || '—'}</Typography>
                    </Stack>
                  );
                }}
              >
                {children.map(c => (
                  <MenuItem key={c._id} value={c._id}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        <PersonIcon fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={fullName(c) || '—'}
                      secondary={c.beneficiaryNumber || ''}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {activeChildId && (
            <Button
              variant="outlined"
              size="small"
              startIcon={downloadingReport ? <CircularProgress size={14} /> : <DownloadIcon />}
              onClick={downloadReport}
              disabled={downloadingReport}
            >
              تنزيل تقرير التقدّم (PDF)
            </Button>
          )}
          <IconButton
            onClick={() => {
              loadChildren();
              if (activeChildId) refreshActive();
            }}
            title="تحديث"
          >
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Children cards */}
      <Grid container spacing={2} mb={3}>
        {children.length === 0 && !loading && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                لا يوجد أطفال مسجَّلون تحت حسابك حالياً.
              </Typography>
            </Paper>
          </Grid>
        )}
        {children.map(c => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={c._id}>
            <Card
              sx={{
                border: c._id === activeChildId ? '2px solid' : '1px solid',
                borderColor: c._id === activeChildId ? 'primary.main' : 'divider',
                transition: 'all .2s',
              }}
            >
              <CardActionArea onClick={() => setActiveChildId(c._id)}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: c._id === activeChildId ? 'primary.main' : 'grey.300',
                        width: 56,
                        height: 56,
                      }}
                    >
                      <PersonIcon />
                    </Avatar>
                    <Box flex={1}>
                      <Typography fontWeight={600}>{fullName(c) || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.beneficiaryNumber || '—'}
                      </Typography>
                      {c.dateOfBirth && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {formatDate(c.dateOfBirth)}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                  {c.status && (
                    <Chip
                      size="small"
                      label={c.status}
                      sx={{ mt: 1 }}
                      color={c.status === 'active' ? 'success' : 'default'}
                    />
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs for active child */}
      {active && (
        <Paper>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">{fullName(active)}</Typography>
          </Box>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
            <Tab icon={<PersonIcon />} iconPosition="start" label="نظرة عامة" />
            <Tab icon={<EventIcon />} iconPosition="start" label="الجلسات" />
            <Tab icon={<AssignmentIcon />} iconPosition="start" label="خطة الرعاية" />
            <Tab icon={<AssessmentIcon />} iconPosition="start" label="التقييمات" />
          </Tabs>
          {childLoading && <LinearProgress />}
          <Box sx={{ p: 3 }}>
            {tab === 0 && <OverviewTab data={activeData.overview} />}
            {tab === 1 && <SessionsTab data={activeData.sessions} />}
            {tab === 2 && <CarePlanTab data={activeData.plan} />}
            {tab === 3 && (
              <AssessmentsTab
                assessments={activeData.assessments}
                attendance={activeData.attendance}
              />
            )}
          </Box>
        </Paper>
      )}

      <ParentComplaintsPanel activeChild={active} />
    </Container>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────────────────

function OverviewTab({ data }) {
  if (!data) return <Typography color="text.secondary">جاري التحميل…</Typography>;
  const s = data.summary || {};
  const child = data.child || {};
  const tiles = [
    {
      label: 'جلسات الأسبوع القادم',
      value: s.sessionsUpcomingWeek || 0,
      icon: <CalendarMonthIcon />,
      color: 'warning.main',
    },
    {
      label: 'إجمالي الجلسات',
      value: s.sessionsTotal || 0,
      icon: <EventIcon />,
      color: 'info.main',
    },
    {
      label: 'خطط نشطة',
      value: s.activeCarePlans || 0,
      icon: <AssignmentIcon />,
      color: 'primary.main',
    },
    {
      label: 'التقييمات',
      value: s.totalAssessments || 0,
      icon: <AssessmentIcon />,
      color: 'success.main',
    },
  ];
  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        {tiles.map((t, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t.label}
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: t.color }}>
                      {t.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: t.color, fontSize: 32 }}>{t.icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" mb={1}>
              بيانات أساسية
            </Typography>
            <Stack spacing={1}>
              <KV label="الرقم التعريفي" value={child.beneficiaryNumber} />
              <KV label="الجنس" value={child.gender} />
              <KV label="تاريخ الميلاد" value={formatDate(child.dateOfBirth)} />
              <KV label="نوع الإعاقة" value={child.disability?.primaryType} />
              <KV label="تاريخ الالتحاق" value={formatDate(child.enrollmentDate)} />
              <KV label="الحالة" value={child.status} />
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          {s.lastAssessment ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" mb={1}>
                آخر تقييم إكلينيكي
              </Typography>
              <Typography fontWeight={600}>{s.lastAssessment.tool}</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDate(s.lastAssessment.assessmentDate)}
              </Typography>
              {s.lastAssessment.score != null && (
                <Stack direction="row" alignItems="center" spacing={2} mt={1}>
                  <Typography variant="h5" color="primary.main">
                    {s.lastAssessment.score}/100
                  </Typography>
                  {s.lastAssessment.interpretation && (
                    <Chip
                      size="small"
                      label={INTERP_LABELS[s.lastAssessment.interpretation]}
                      color="info"
                    />
                  )}
                </Stack>
              )}
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography color="text.secondary">لا توجد تقييمات بعد.</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

function KV({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Stack>
  );
}

function SessionsTab({ data }) {
  if (!data) return <Typography color="text.secondary">جاري التحميل…</Typography>;
  const SessionTable = ({ items }) => {
    if (!items?.length) return <Typography color="text.secondary">لا توجد جلسات.</Typography>;
    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>التاريخ</TableCell>
              <TableCell>الوقت</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>المعالج</TableCell>
              <TableCell>الغرفة</TableCell>
              <TableCell>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(s => (
              <TableRow key={s._id}>
                <TableCell>{formatDate(s.date)}</TableCell>
                <TableCell>
                  {s.startTime || '—'} → {s.endTime || '—'}
                </TableCell>
                <TableCell>{s.sessionType}</TableCell>
                <TableCell>{fullName(s.therapist) || '—'}</TableCell>
                <TableCell>{s.room?.name || '—'}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={SESSION_STATUS[s.status]?.label || s.status}
                    color={SESSION_STATUS[s.status]?.color || 'default'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle1" fontWeight={600} mb={1}>
          الجلسات القادمة ({data.upcoming?.length || 0})
        </Typography>
        <SessionTable items={data.upcoming} />
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle1" fontWeight={600} mb={1}>
          الجلسات السابقة ({data.past?.length || 0})
        </Typography>
        <SessionTable items={data.past} />
      </Box>
    </Stack>
  );
}

function CarePlanTab({ data }) {
  if (data === undefined) return <Typography color="text.secondary">جاري التحميل…</Typography>;
  if (!data)
    return <Alert severity="info">لا توجد خطة رعاية مسجَّلة حالياً. تواصل مع المركز.</Alert>;
  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <KV label="رقم الخطة" value={data.planNumber} />
          </Grid>
          <Grid item xs={6} md={3}>
            <KV label="تاريخ البدء" value={formatDate(data.startDate)} />
          </Grid>
          <Grid item xs={6} md={3}>
            <KV label="تاريخ المراجعة" value={formatDate(data.reviewDate)} />
          </Grid>
          <Grid item xs={6} md={3}>
            <KV label="الحالة" value={data.status} />
          </Grid>
        </Grid>
        <Stack direction="row" spacing={1} mt={1}>
          {Object.entries(data.sections || {}).map(([k, enabled]) =>
            enabled ? (
              <Chip
                key={k}
                size="small"
                icon={SECTION_LABELS[k]?.icon}
                label={SECTION_LABELS[k]?.label || k}
                sx={{ borderColor: SECTION_LABELS[k]?.color }}
                variant="outlined"
              />
            ) : null
          )}
        </Stack>
        <Stack direction="row" spacing={2} mt={2}>
          <Typography variant="caption">
            الأهداف: <strong>{data.totalGoals}</strong>
          </Typography>
          <Typography variant="caption" color="success.main">
            محقَّقة: <strong>{data.achievedGoals}</strong>
          </Typography>
        </Stack>
      </Paper>

      {(data.goals || []).length === 0 ? (
        <Typography color="text.secondary">لا توجد أهداف مُضافة بعد.</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الهدف</TableCell>
                <TableCell>القسم</TableCell>
                <TableCell>المستهدَف</TableCell>
                <TableCell>التقدّم</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الاستحقاق</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.goals.map((g, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {g.title}
                    </Typography>
                    {g.criteria && (
                      <Typography variant="caption" color="text.secondary">
                        {g.criteria}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{SECTION_LABELS[g.section]?.label || g.section}</TableCell>
                  <TableCell>{g.target || '—'}</TableCell>
                  <TableCell sx={{ width: 120 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <LinearProgress
                        variant="determinate"
                        value={g.progress || 0}
                        sx={{ flex: 1, height: 8, borderRadius: 1 }}
                      />
                      <Typography variant="caption">{g.progress || 0}%</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={GOAL_STATUS[g.status]?.label || g.status}
                      color={GOAL_STATUS[g.status]?.color || 'default'}
                    />
                  </TableCell>
                  <TableCell>{formatDate(g.targetDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

function AssessmentsTab({ assessments, attendance }) {
  if (!assessments) return <Typography color="text.secondary">جاري التحميل…</Typography>;
  const att = attendance?.stats;
  return (
    <Stack spacing={3}>
      {att && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" mb={2}>
            الحضور — آخر 90 يوماً
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <KV label="إجمالي الجلسات" value={att.total} />
            </Grid>
            <Grid item xs={6} md={3}>
              <KV label="مكتملة" value={att.completed} />
            </Grid>
            <Grid item xs={6} md={3}>
              <KV label="لم يحضر" value={att.noShow} />
            </Grid>
            <Grid item xs={6} md={3}>
              <KV label="ملغاة" value={att.cancelled} />
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Typography variant="body2">معدّل الحضور:</Typography>
                <Box flex={1}>
                  <LinearProgress
                    variant="determinate"
                    value={att.attendanceRate || 0}
                    sx={{ height: 10, borderRadius: 1 }}
                  />
                </Box>
                <Typography variant="body2" fontWeight={600}>
                  {att.attendanceRate != null ? `${att.attendanceRate}%` : '—'}
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Box>
        <Typography variant="subtitle1" fontWeight={600} mb={1}>
          آخر التقييمات
        </Typography>
        {assessments.items.length === 0 ? (
          <Typography color="text.secondary">لا توجد تقييمات.</Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الأداة</TableCell>
                  <TableCell>الدرجة</TableCell>
                  <TableCell>التفسير</TableCell>
                  <TableCell>التغيّر</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assessments.items.map(a => (
                  <TableRow key={a._id}>
                    <TableCell>{formatDate(a.assessmentDate)}</TableCell>
                    <TableCell>{a.tool}</TableCell>
                    <TableCell>
                      {a.score != null ? `${a.score}/100` : (a.rawScore ?? '—')}
                    </TableCell>
                    <TableCell>
                      {a.interpretation ? (
                        <Chip size="small" label={INTERP_LABELS[a.interpretation]} />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {a.scoreChange == null ? (
                        '—'
                      ) : a.scoreChange > 0 ? (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <TrendingUpIcon fontSize="small" color="success" />
                          <Typography variant="body2" color="success.main">
                            +{a.scoreChange}
                          </Typography>
                        </Stack>
                      ) : a.scoreChange < 0 ? (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <TrendingDownIcon fontSize="small" color="error" />
                          <Typography variant="body2" color="error.main">
                            {a.scoreChange}
                          </Typography>
                        </Stack>
                      ) : (
                        '='
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Stack>
  );
}
