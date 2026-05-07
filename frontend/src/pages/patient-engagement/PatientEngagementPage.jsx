/**
 * PatientEngagementPage — بوابة تفاعل المستفيدين
 *
 * Tabs:
 *  0 — بوابة المستفيد      → patientPortalAPI
 *  1 — التثقيف الصحي       → healthEducationAPI
 *  2 — مجتمع المستفيدين    → patientCommunityAPI
 *  3 — المراقبة عن بُعد    → remoteMonitoringAPI
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Button,
  IconButton,
  Stack,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
  Tooltip,
} from '@mui/material';
import {
  AccountCircle as PortalIcon,
  MenuBook as EducIcon,
  Groups as CommunityIcon,
  MonitorHeart as MonitorIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  BarChart as ChartIcon,
} from '@mui/icons-material';
import {
  patientPortalAPI,
  healthEducationAPI,
  patientCommunityAPI,
  remoteMonitoringAPI,
} from '../../services/ddd';

/* ── palette ───────────────────────────────────────────── */
const PRIMARY = '#01579b';
const BG = '#e3f2fd';

/* ── helpers ───────────────────────────────────────────── */
const fmt = d => (d ? new Date(d).toLocaleDateString('ar-SA') : '—');

/* ── KPI Card ───────────────────────────────────────────── */
function KpiCard({ label, value, icon, color, sub }) {
  return (
    <Card variant="outlined" sx={{ borderRight: `4px solid ${color}`, height: '100%' }}>
      <CardContent
        sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}
      >
        <Avatar sx={{ bgcolor: `${color}18`, color, width: 48, height: 48 }}>{icon}</Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ color }}>
            {value ?? '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {sub && (
            <Typography variant="caption" color="text.disabled">
              {sub}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

/* ── Tab Panel helper ────────────────────────────────────── */
function useTabData(api) {
  const [dashboard, setDashboard] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, list] = await Promise.allSettled([
        api.getDashboard({}),
        api.list({ limit: 50 }),
      ]);
      if (dash.status === 'fulfilled') {
        setDashboard(dash.value?.data?.data || dash.value?.data || null);
      }
      if (list.status === 'fulfilled') {
        const d = list.value?.data?.data || list.value?.data;
        setItems(Array.isArray(d) ? d : d?.items || []);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  return { dashboard, items, loading, error, load, setItems };
}

/* ══════════════════════════════════════════════════════════ */
export default function PatientEngagementPage() {
  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const toast = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  /* ─── Tab 0: Patient Portal ─────────────── */
  const portal = useTabData(patientPortalAPI);
  const [portalDialog, setPortalDialog] = useState(false);
  const [portalEdit, setPortalEdit] = useState(null);
  const [portalForm, setPortalForm] = useState({
    beneficiaryId: '',
    accessLevel: 'basic',
    email: '',
    phone: '',
    status: 'active',
  });
  const [portalSub, setPortalSub] = useState(false);

  /* ─── Tab 1: Health Education ───────────── */
  const educ = useTabData(healthEducationAPI);
  const [educDialog, setEducDialog] = useState(false);
  const [educEdit, setEducEdit] = useState(null);
  const [educForm, setEducForm] = useState({
    title: '',
    category: '',
    contentType: 'article',
    language: 'ar',
    targetAudience: 'beneficiary',
    status: 'published',
  });
  const [educSub, setEducSub] = useState(false);

  /* ─── Tab 2: Community ──────────────────── */
  const community = useTabData(patientCommunityAPI);
  const [commDialog, setCommDialog] = useState(false);
  const [commEdit, setCommEdit] = useState(null);
  const [commForm, setCommForm] = useState({
    title: '',
    type: 'discussion',
    description: '',
    status: 'open',
  });
  const [commSub, setCommSub] = useState(false);

  /* ─── Tab 3: Remote Monitoring ──────────── */
  const monitor = useTabData(remoteMonitoringAPI);
  const [monDialog, setMonDialog] = useState(false);
  const [monEdit, setMonEdit] = useState(null);
  const [monForm, setMonForm] = useState({
    beneficiaryId: '',
    deviceType: '',
    metric: '',
    frequency: 'daily',
    status: 'active',
  });
  const [monSub, setMonSub] = useState(false);

  /* ── Load on first tab reveal ── */
  useEffect(() => {
    if (tab === 0 && !portal.items.length) portal.load();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tab === 1 && !educ.items.length) educ.load();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tab === 2 && !community.items.length) community.load();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tab === 3 && !monitor.items.length) monitor.load();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── CRUD handlers ── */
  async function submitPortal() {
    setPortalSub(true);
    try {
      portalEdit
        ? await patientPortalAPI.update(portalEdit._id, portalForm)
        : await patientPortalAPI.create(portalForm);
      toast(portalEdit ? 'تم التحديث' : 'تم الإنشاء');
      setPortalDialog(false);
      portal.load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setPortalSub(false);
    }
  }

  async function submitEduc() {
    setEducSub(true);
    try {
      educEdit
        ? await healthEducationAPI.update(educEdit._id, educForm)
        : await healthEducationAPI.create(educForm);
      toast(educEdit ? 'تم التحديث' : 'تم النشر');
      setEducDialog(false);
      educ.load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setEducSub(false);
    }
  }

  async function submitComm() {
    setCommSub(true);
    try {
      commEdit
        ? await patientCommunityAPI.update(commEdit._id, commForm)
        : await patientCommunityAPI.create(commForm);
      toast(commEdit ? 'تم التحديث' : 'تم الإنشاء');
      setCommDialog(false);
      community.load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setCommSub(false);
    }
  }

  async function submitMon() {
    setMonSub(true);
    try {
      monEdit
        ? await remoteMonitoringAPI.update(monEdit._id, monForm)
        : await remoteMonitoringAPI.create(monForm);
      toast(monEdit ? 'تم التحديث' : 'تم التفعيل');
      setMonDialog(false);
      monitor.load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setMonSub(false);
    }
  }

  const chip = (s, map) => {
    const cfg = map[s] || { label: s || '—', color: 'default' };
    return <Chip size="small" label={cfg.label} color={cfg.color} />;
  };

  const accessMap = {
    basic: { label: 'أساسي', color: 'default' },
    standard: { label: 'قياسي', color: 'info' },
    full: { label: 'كامل', color: 'primary' },
  };
  const contentMap = {
    article: { label: 'مقالة', color: 'info' },
    video: { label: 'فيديو', color: 'secondary' },
    infographic: { label: 'إنفوجرافيك', color: 'success' },
    audio: { label: 'صوتي', color: 'warning' },
  };
  const commTypeMap = {
    discussion: { label: 'نقاش', color: 'info' },
    support: { label: 'دعم', color: 'secondary' },
    announcement: { label: 'إعلان', color: 'warning' },
    qa: { label: 'سؤال وجواب', color: 'success' },
  };
  const statusMap = {
    active: { label: 'نشط', color: 'success' },
    inactive: { label: 'غير نشط', color: 'default' },
    open: { label: 'مفتوح', color: 'success' },
    closed: { label: 'مغلق', color: 'default' },
    published: { label: 'منشور', color: 'success' },
    draft: { label: 'مسودة', color: 'default' },
  };
  const monFreqMap = {
    realtime: { label: 'فوري', color: 'error' },
    hourly: { label: 'كل ساعة', color: 'warning' },
    daily: { label: 'يومي', color: 'info' },
    weekly: { label: 'أسبوعي', color: 'default' },
  };

  return (
    <Box sx={{ p: 3, direction: 'rtl', bgcolor: BG, minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar sx={{ bgcolor: PRIMARY, width: 52, height: 52 }}>
          <PortalIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" color={PRIMARY}>
            بوابة تفاعل المستفيدين
          </Typography>
          <Typography variant="body2" color="text.secondary">
            البوابة الإلكترونية · التثقيف الصحي · المجتمع · المراقبة عن بُعد
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          bgcolor: 'background.paper',
          borderRadius: 2,
          '& .MuiTab-root': { fontWeight: 600 },
          '& .Mui-selected': { color: PRIMARY },
          '& .MuiTabs-indicator': { bgcolor: PRIMARY },
        }}
      >
        <Tab icon={<PortalIcon />} iconPosition="start" label="بوابة المستفيد" />
        <Tab icon={<EducIcon />} iconPosition="start" label="التثقيف الصحي" />
        <Tab icon={<CommunityIcon />} iconPosition="start" label="مجتمع المستفيدين" />
        <Tab icon={<MonitorIcon />} iconPosition="start" label="المراقبة عن بُعد" />
      </Tabs>

      {/* ══ TAB 0: Patient Portal ══ */}
      {tab === 0 && (
        <Box>
          {portal.loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
          {portal.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {portal.error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              {
                label: 'إجمالي المسجلين',
                value: portal.dashboard?.totalRegistered ?? portal.items.length,
                icon: <PortalIcon />,
                color: PRIMARY,
              },
              {
                label: 'نشط',
                value: portal.dashboard?.activeCount ?? '—',
                icon: <ChartIcon />,
                color: '#2e7d32',
              },
              {
                label: 'جلسات هذا الشهر',
                value: portal.dashboard?.sessionsThisMonth ?? '—',
                icon: <ViewIcon />,
                color: '#6a1b9a',
              },
              {
                label: 'متوسط رضا المستفيدين',
                value:
                  portal.dashboard?.satisfactionScore != null
                    ? `${portal.dashboard.satisfactionScore}%`
                    : '—',
                icon: <ChartIcon />,
                color: '#e65100',
              },
            ].map((k, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <KpiCard {...k} />
              </Grid>
            ))}
          </Grid>
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                setPortalEdit(null);
                setPortalForm({
                  beneficiaryId: '',
                  accessLevel: 'basic',
                  email: '',
                  phone: '',
                  status: 'active',
                });
                setPortalDialog(true);
              }}
              sx={{ bgcolor: PRIMARY }}
            >
              تسجيل مستفيد
            </Button>
            <IconButton size="small" onClick={portal.load}>
              <RefreshIcon />
            </IconButton>
          </Stack>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                  <TableCell>معرف المستفيد</TableCell>
                  <TableCell>البريد الإلكتروني</TableCell>
                  <TableCell>مستوى الوصول</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>تاريخ التسجيل</TableCell>
                  <TableCell align="center">تعديل</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {portal.items.length === 0 && !portal.loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        لا يوجد مستفيدون مسجلون في البوابة
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  portal.items.map((it, i) => (
                    <TableRow key={it._id || i} hover>
                      <TableCell>
                        {it.beneficiaryId?.name?.full || it.beneficiaryId || '—'}
                      </TableCell>
                      <TableCell>{it.email || '—'}</TableCell>
                      <TableCell>{chip(it.accessLevel, accessMap)}</TableCell>
                      <TableCell>{chip(it.status, statusMap)}</TableCell>
                      <TableCell>{fmt(it.createdAt || it.registeredAt)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="تعديل">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setPortalEdit(it);
                              setPortalForm({
                                beneficiaryId: it.beneficiaryId || '',
                                accessLevel: it.accessLevel || 'basic',
                                email: it.email || '',
                                phone: it.phone || '',
                                status: it.status || 'active',
                              });
                              setPortalDialog(true);
                            }}
                          >
                            <EditIcon fontSize="small" sx={{ color: PRIMARY }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ══ TAB 1: Health Education ══ */}
      {tab === 1 && (
        <Box>
          {educ.loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
          {educ.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {educ.error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              {
                label: 'إجمالي المحتوى',
                value: educ.dashboard?.totalContent ?? educ.items.length,
                icon: <EducIcon />,
                color: '#1b5e20',
              },
              {
                label: 'المنشور',
                value: educ.dashboard?.publishedCount ?? '—',
                icon: <ChartIcon />,
                color: '#2e7d32',
              },
              {
                label: 'إجمالي المشاهدات',
                value: educ.dashboard?.totalViews ?? '—',
                icon: <ViewIcon />,
                color: '#0277bd',
              },
              {
                label: 'المحتوى الأكثر تفاعلاً',
                value: educ.dashboard?.topContent?.title || '—',
                icon: <EducIcon />,
                color: '#6a1b9a',
                sub: 'الأعلى تفاعلاً',
              },
            ].map((k, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <KpiCard {...k} />
              </Grid>
            ))}
          </Grid>
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                setEducEdit(null);
                setEducForm({
                  title: '',
                  category: '',
                  contentType: 'article',
                  language: 'ar',
                  targetAudience: 'beneficiary',
                  status: 'published',
                });
                setEducDialog(true);
              }}
              sx={{ bgcolor: '#1b5e20' }}
            >
              محتوى جديد
            </Button>
            <IconButton size="small" onClick={educ.load}>
              <RefreshIcon />
            </IconButton>
          </Stack>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f1f8e9' }}>
                  <TableCell>العنوان</TableCell>
                  <TableCell>الفئة</TableCell>
                  <TableCell>نوع المحتوى</TableCell>
                  <TableCell>اللغة</TableCell>
                  <TableCell>الجمهور</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="center">تعديل</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {educ.items.length === 0 && !educ.loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">لا يوجد محتوى تثقيفي</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  educ.items.map((it, i) => (
                    <TableRow key={it._id || i} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {it.title || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{it.category || '—'}</TableCell>
                      <TableCell>{chip(it.contentType, contentMap)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={it.language === 'ar' ? 'عربي' : it.language || '—'}
                        />
                      </TableCell>
                      <TableCell>{it.targetAudience || '—'}</TableCell>
                      <TableCell>{chip(it.status, statusMap)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="تعديل">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEducEdit(it);
                              setEducForm({
                                title: it.title || '',
                                category: it.category || '',
                                contentType: it.contentType || 'article',
                                language: it.language || 'ar',
                                targetAudience: it.targetAudience || 'beneficiary',
                                status: it.status || 'published',
                              });
                              setEducDialog(true);
                            }}
                          >
                            <EditIcon fontSize="small" sx={{ color: '#1b5e20' }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ══ TAB 2: Community ══ */}
      {tab === 2 && (
        <Box>
          {community.loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
          {community.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {community.error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              {
                label: 'إجمالي المنشورات',
                value: community.dashboard?.totalPosts ?? community.items.length,
                icon: <CommunityIcon />,
                color: '#0277bd',
              },
              {
                label: 'مفتوح',
                value: community.dashboard?.openCount ?? '—',
                icon: <ChartIcon />,
                color: '#2e7d32',
              },
              {
                label: 'الأعضاء النشطون',
                value: community.dashboard?.activeMembers ?? '—',
                icon: <CommunityIcon />,
                color: '#6a1b9a',
              },
              {
                label: 'إجمالي التفاعل',
                value: community.dashboard?.totalInteractions ?? '—',
                icon: <ViewIcon />,
                color: '#e65100',
              },
            ].map((k, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <KpiCard {...k} />
              </Grid>
            ))}
          </Grid>
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                setCommEdit(null);
                setCommForm({ title: '', type: 'discussion', description: '', status: 'open' });
                setCommDialog(true);
              }}
              sx={{ bgcolor: '#0277bd' }}
            >
              منشور جديد
            </Button>
            <IconButton size="small" onClick={community.load}>
              <RefreshIcon />
            </IconButton>
          </Stack>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                  <TableCell>العنوان</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>تاريخ النشر</TableCell>
                  <TableCell>التفاعل</TableCell>
                  <TableCell align="center">تعديل</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {community.items.length === 0 && !community.loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">لا توجد منشورات في المجتمع</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  community.items.map((it, i) => (
                    <TableRow key={it._id || i} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {it.title || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{chip(it.type, commTypeMap)}</TableCell>
                      <TableCell>{chip(it.status, statusMap)}</TableCell>
                      <TableCell>{fmt(it.createdAt)}</TableCell>
                      <TableCell>
                        {it.likes ?? 0} ❤ · {it.comments ?? 0} 💬
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="تعديل">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setCommEdit(it);
                              setCommForm({
                                title: it.title || '',
                                type: it.type || 'discussion',
                                description: it.description || '',
                                status: it.status || 'open',
                              });
                              setCommDialog(true);
                            }}
                          >
                            <EditIcon fontSize="small" sx={{ color: '#0277bd' }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ══ TAB 3: Remote Monitoring ══ */}
      {tab === 3 && (
        <Box>
          {monitor.loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
          {monitor.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {monitor.error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              {
                label: 'إجمالي الأجهزة',
                value: monitor.dashboard?.totalDevices ?? monitor.items.length,
                icon: <MonitorIcon />,
                color: '#880e4f',
              },
              {
                label: 'نشط',
                value: monitor.dashboard?.activeCount ?? '—',
                icon: <ChartIcon />,
                color: '#2e7d32',
              },
              {
                label: 'تنبيهات اليوم',
                value: monitor.dashboard?.alertsToday ?? '—',
                icon: <MonitorIcon />,
                color: '#e65100',
              },
              {
                label: 'المرضى المتابَعون',
                value: monitor.dashboard?.totalBeneficiaries ?? '—',
                icon: <ChartIcon />,
                color: PRIMARY,
              },
            ].map((k, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <KpiCard {...k} />
              </Grid>
            ))}
          </Grid>
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                setMonEdit(null);
                setMonForm({
                  beneficiaryId: '',
                  deviceType: '',
                  metric: '',
                  frequency: 'daily',
                  status: 'active',
                });
                setMonDialog(true);
              }}
              sx={{ bgcolor: '#880e4f' }}
            >
              إضافة جهاز مراقبة
            </Button>
            <IconButton size="small" onClick={monitor.load}>
              <RefreshIcon />
            </IconButton>
          </Stack>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fce4ec' }}>
                  <TableCell>المستفيد</TableCell>
                  <TableCell>نوع الجهاز</TableCell>
                  <TableCell>المقياس</TableCell>
                  <TableCell>التردد</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>آخر قراءة</TableCell>
                  <TableCell align="center">تعديل</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {monitor.items.length === 0 && !monitor.loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">لا توجد أجهزة مراقبة</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  monitor.items.map((it, i) => (
                    <TableRow key={it._id || i} hover>
                      <TableCell>
                        {it.beneficiaryId?.name?.full || it.beneficiaryId || '—'}
                      </TableCell>
                      <TableCell>{it.deviceType || '—'}</TableCell>
                      <TableCell>{it.metric || '—'}</TableCell>
                      <TableCell>
                        {chip(it.frequency || it.monitoringFrequency, monFreqMap)}
                      </TableCell>
                      <TableCell>{chip(it.status, statusMap)}</TableCell>
                      <TableCell>
                        {it.lastReading ? (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography variant="body2" fontWeight="bold">
                              {it.lastReading.value ?? '—'} {it.lastReading.unit || ''}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                              ({fmt(it.lastReading.timestamp || it.lastReadingAt)})
                            </Typography>
                          </Stack>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="تعديل">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setMonEdit(it);
                              setMonForm({
                                beneficiaryId: it.beneficiaryId || '',
                                deviceType: it.deviceType || '',
                                metric: it.metric || '',
                                frequency: it.frequency || it.monitoringFrequency || 'daily',
                                status: it.status || 'active',
                              });
                              setMonDialog(true);
                            }}
                          >
                            <EditIcon fontSize="small" sx={{ color: '#880e4f' }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ══ DIALOGS ══ */}

      {/* Portal Dialog */}
      <Dialog open={portalDialog} onClose={() => setPortalDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{portalEdit ? 'تعديل سجل البوابة' : 'تسجيل مستفيد في البوابة'}</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Stack spacing={2}>
            <TextField
              size="small"
              fullWidth
              label="معرف المستفيد *"
              value={portalForm.beneficiaryId}
              onChange={e => setPortalForm(f => ({ ...f, beneficiaryId: e.target.value }))}
            />
            <TextField
              size="small"
              fullWidth
              label="البريد الإلكتروني"
              value={portalForm.email}
              onChange={e => setPortalForm(f => ({ ...f, email: e.target.value }))}
            />
            <TextField
              size="small"
              fullWidth
              label="رقم الجوال"
              value={portalForm.phone}
              onChange={e => setPortalForm(f => ({ ...f, phone: e.target.value }))}
            />
            <TextField
              select
              size="small"
              fullWidth
              label="مستوى الوصول"
              value={portalForm.accessLevel}
              onChange={e => setPortalForm(f => ({ ...f, accessLevel: e.target.value }))}
            >
              {[
                ['basic', 'أساسي'],
                ['standard', 'قياسي'],
                ['full', 'كامل'],
              ].map(([v, l]) => (
                <MenuItem key={v} value={v}>
                  {l}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPortalDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!portalForm.beneficiaryId || portalSub}
            onClick={submitPortal}
            sx={{ bgcolor: PRIMARY }}
          >
            {portalSub ? 'جاري...' : portalEdit ? 'تحديث' : 'تسجيل'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Education Dialog */}
      <Dialog open={educDialog} onClose={() => setEducDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{educEdit ? 'تعديل المحتوى' : 'إضافة محتوى تثقيفي'}</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Stack spacing={2}>
            <TextField
              size="small"
              fullWidth
              label="العنوان *"
              value={educForm.title}
              onChange={e => setEducForm(f => ({ ...f, title: e.target.value }))}
            />
            <TextField
              size="small"
              fullWidth
              label="الفئة"
              value={educForm.category}
              onChange={e => setEducForm(f => ({ ...f, category: e.target.value }))}
            />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  select
                  size="small"
                  fullWidth
                  label="نوع المحتوى"
                  value={educForm.contentType}
                  onChange={e => setEducForm(f => ({ ...f, contentType: e.target.value }))}
                >
                  {[
                    ['article', 'مقالة'],
                    ['video', 'فيديو'],
                    ['infographic', 'إنفوجرافيك'],
                    ['audio', 'صوتي'],
                  ].map(([v, l]) => (
                    <MenuItem key={v} value={v}>
                      {l}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  size="small"
                  fullWidth
                  label="اللغة"
                  value={educForm.language}
                  onChange={e => setEducForm(f => ({ ...f, language: e.target.value }))}
                >
                  {[
                    ['ar', 'عربي'],
                    ['en', 'إنجليزي'],
                  ].map(([v, l]) => (
                    <MenuItem key={v} value={v}>
                      {l}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            <TextField
              select
              size="small"
              fullWidth
              label="الجمهور المستهدف"
              value={educForm.targetAudience}
              onChange={e => setEducForm(f => ({ ...f, targetAudience: e.target.value }))}
            >
              {[
                ['beneficiary', 'المستفيد'],
                ['family', 'الأسرة'],
                ['staff', 'الكوادر'],
                ['all', 'الجميع'],
              ].map(([v, l]) => (
                <MenuItem key={v} value={v}>
                  {l}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEducDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!educForm.title || educSub}
            onClick={submitEduc}
            sx={{ bgcolor: '#1b5e20' }}
          >
            {educSub ? 'جاري...' : educEdit ? 'تحديث' : 'نشر'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Community Dialog */}
      <Dialog open={commDialog} onClose={() => setCommDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{commEdit ? 'تعديل المنشور' : 'منشور جديد'}</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Stack spacing={2}>
            <TextField
              size="small"
              fullWidth
              label="العنوان *"
              value={commForm.title}
              onChange={e => setCommForm(f => ({ ...f, title: e.target.value }))}
            />
            <TextField
              select
              size="small"
              fullWidth
              label="النوع"
              value={commForm.type}
              onChange={e => setCommForm(f => ({ ...f, type: e.target.value }))}
            >
              {[
                ['discussion', 'نقاش'],
                ['support', 'دعم'],
                ['announcement', 'إعلان'],
                ['qa', 'سؤال وجواب'],
              ].map(([v, l]) => (
                <MenuItem key={v} value={v}>
                  {l}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              fullWidth
              multiline
              rows={3}
              label="الوصف"
              value={commForm.description}
              onChange={e => setCommForm(f => ({ ...f, description: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!commForm.title || commSub}
            onClick={submitComm}
            sx={{ bgcolor: '#0277bd' }}
          >
            {commSub ? 'جاري...' : commEdit ? 'تحديث' : 'نشر'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Monitoring Dialog */}
      <Dialog open={monDialog} onClose={() => setMonDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{monEdit ? 'تعديل الجهاز' : 'إضافة جهاز مراقبة'}</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Stack spacing={2}>
            <TextField
              size="small"
              fullWidth
              label="معرف المستفيد *"
              value={monForm.beneficiaryId}
              onChange={e => setMonForm(f => ({ ...f, beneficiaryId: e.target.value }))}
            />
            <TextField
              size="small"
              fullWidth
              label="نوع الجهاز"
              value={monForm.deviceType}
              onChange={e => setMonForm(f => ({ ...f, deviceType: e.target.value }))}
            />
            <TextField
              size="small"
              fullWidth
              label="المقياس (ضغط الدم، نبض...)"
              value={monForm.metric}
              onChange={e => setMonForm(f => ({ ...f, metric: e.target.value }))}
            />
            <TextField
              select
              size="small"
              fullWidth
              label="تردد المراقبة"
              value={monForm.frequency}
              onChange={e => setMonForm(f => ({ ...f, frequency: e.target.value }))}
            >
              {[
                ['realtime', 'فوري'],
                ['hourly', 'كل ساعة'],
                ['daily', 'يومي'],
                ['weekly', 'أسبوعي'],
              ].map(([v, l]) => (
                <MenuItem key={v} value={v}>
                  {l}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMonDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!monForm.beneficiaryId || monSub}
            onClick={submitMon}
            sx={{ bgcolor: '#880e4f' }}
          >
            {monSub ? 'جاري...' : monEdit ? 'تحديث' : 'تفعيل'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
