/**
 * Learning & Development (LMS) Dashboard
 * لوحة التدريب الإلكتروني للموظفين
 *
 * Phase 22 — 6 tabs:
 *   1. نظرة عامة (Overview)
 *   2. البرامج التعليمية (Programs)
 *   3. التسجيل (Enrollments)
 *   4. الشهادات (Certifications)
 *   5. التحليلات (Analytics)
 *   6. التكامل (Integrations)
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  LinearProgress,
  Alert,
  MenuItem,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  School as SchoolIcon,
  MenuBook as CourseIcon,
  Assignment as EnrollIcon,
  EmojiEvents as CertIcon,
  Analytics as AnalyticsIcon,
  IntegrationInstructions as IntegrationIcon,
  Add as AddIcon,
  Archive as ArchiveIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  CheckCircle as CheckIcon,
  HourglassEmpty as PendingIcon,
  TrendingUp as TrendIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import learningDevelopmentService from '../../services/learningDevelopmentService';

/* ────────────────────── helpers ────────────────────── */
function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

function StatusChip({ status }) {
  const map = {
    draft: { color: 'default', label: 'مسودة' },
    active: { color: 'success', label: 'نشط' },
    archived: { color: 'warning', label: 'مؤرشف' },
    enrolled: { color: 'info', label: 'مسجل' },
    'in-progress': { color: 'primary', label: 'قيد التقدم' },
    completed: { color: 'success', label: 'مكتمل' },
    connected: { color: 'success', label: 'متصل' },
    valid: { color: 'success', label: 'صالح' },
    pending: { color: 'warning', label: 'قيد الانتظار' },
    passed: { color: 'success', label: 'ناجح' },
    failed: { color: 'error', label: 'راسب' },
  };
  const cfg = map[status] || { color: 'default', label: status };
  return <Chip size="small" color={cfg.color} label={cfg.label} />;
}

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'مبتدئ' },
  { value: 'intermediate', label: 'متوسط' },
  { value: 'advanced', label: 'متقدم' },
];

const CATEGORY_OPTIONS = [
  { value: 'leadership', label: 'القيادة' },
  { value: 'technical', label: 'تقني' },
  { value: 'management', label: 'إدارة' },
  { value: 'compliance', label: 'الامتثال' },
  { value: 'safety', label: 'السلامة' },
  { value: 'soft-skills', label: 'مهارات شخصية' },
  { value: 'medical', label: 'طبي' },
  { value: 'rehabilitation', label: 'تأهيل' },
  { value: 'other', label: 'أخرى' },
];

/* ════════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                            */
/* ════════════════════════════════════════════════════════════════════════════ */
export default function LearningDevelopment() {
  const [tab, setTab] = useState(0);
  const [programs, setPrograms] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [programDialog, setProgramDialog] = useState(false);
  const [enrollDialog, setEnrollDialog] = useState(false);
  const [certDialog, setCertDialog] = useState(false);
  const [integrationDialog, setIntegrationDialog] = useState(false);

  // Form states
  const [programForm, setProgramForm] = useState({
    name: '', description: '', category: 'technical', level: 'intermediate',
    duration: 0, cost: 0, maxParticipants: 100,
  });
  const [enrollForm, setEnrollForm] = useState({
    employeeId: '', programId: '', enrollmentType: 'self', priority: 'normal',
  });
  const [certForm, setCertForm] = useState({
    name: '', description: '', level: 'intermediate', passingScore: 70, validityPeriod: 365,
  });
  const [integrationForm, setIntegrationForm] = useState({
    platformName: '', apiKey: '', endpoint: '', syncFrequency: 'daily',
  });

  /* ── API helpers ── */
  const showError = (msg) => { setError(msg); setTimeout(() => setError(''), 5000); };
  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await learningDevelopmentService.listPrograms();
      setPrograms(data?.data?.programs || []);
    } catch { showError('فشل تحميل البرامج'); }
    setLoading(false);
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await learningDevelopmentService.getCompletionRates();
      setAnalytics(data?.data || null);
    } catch { showError('فشل تحميل التحليلات'); }
    setLoading(false);
  }, []);

  /* ── Create program ── */
  const handleCreateProgram = async () => {
    try {
      await learningDevelopmentService.createProgram(programForm);
      showSuccess('تم إنشاء البرنامج بنجاح');
      setProgramDialog(false);
      setProgramForm({ name: '', description: '', category: 'technical', level: 'intermediate', duration: 0, cost: 0, maxParticipants: 100 });
      fetchPrograms();
    } catch { showError('فشل إنشاء البرنامج'); }
  };

  /* ── Archive program ── */
  const handleArchive = async (id) => {
    try {
      await learningDevelopmentService.archiveProgram(id);
      showSuccess('تم أرشفة البرنامج');
      fetchPrograms();
    } catch { showError('فشل الأرشفة'); }
  };

  /* ── Enroll employee ── */
  const handleEnroll = async () => {
    try {
      const { data } = await learningDevelopmentService.enrollEmployee(enrollForm);
      setEnrollments((prev) => [...prev, data?.data]);
      showSuccess('تم التسجيل بنجاح');
      setEnrollDialog(false);
      setEnrollForm({ employeeId: '', programId: '', enrollmentType: 'self', priority: 'normal' });
    } catch { showError('فشل التسجيل'); }
  };

  /* ── Create certification ── */
  const handleCreateCert = async () => {
    try {
      const { data } = await learningDevelopmentService.defineCertificationPath(certForm);
      setCertifications((prev) => [...prev, data?.data]);
      showSuccess('تم إنشاء مسار الشهادة');
      setCertDialog(false);
      setCertForm({ name: '', description: '', level: 'intermediate', passingScore: 70, validityPeriod: 365 });
    } catch { showError('فشل إنشاء الشهادة'); }
  };

  /* ── Connect integration ── */
  const handleConnectIntegration = async () => {
    try {
      const { data } = await learningDevelopmentService.connectPlatform(integrationForm);
      setIntegrations((prev) => [...prev, data?.data]);
      showSuccess('تم ربط المنصة بنجاح');
      setIntegrationDialog(false);
      setIntegrationForm({ platformName: '', apiKey: '', endpoint: '', syncFrequency: 'daily' });
    } catch { showError('فشل ربط المنصة'); }
  };

  /* ════════════════════════════════════════════════════════════════════════ */
  /*  RENDER                                                                */
  /* ════════════════════════════════════════════════════════════════════════ */
  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <SchoolIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">
            التدريب الإلكتروني للموظفين (LMS)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            المرحلة 22 — دورات أونلاين، اختبارات، شهادات للكادر
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'البرامج التعليمية', count: programs.length, icon: <CourseIcon />, color: '#1976d2' },
          { label: 'المسجلون', count: enrollments.length, icon: <PersonIcon />, color: '#2e7d32' },
          { label: 'الشهادات', count: certifications.length, icon: <CertIcon />, color: '#ed6c02' },
          { label: 'التكاملات', count: integrations.length, icon: <IntegrationIcon />, color: '#9c27b0' },
        ].map((kpi) => (
          <Grid item xs={12} sm={6} md={3} key={kpi.label}>
            <Card sx={{ borderTop: `4px solid ${kpi.color}` }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h3" fontWeight="bold">{kpi.count}</Typography>
                  <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
                </Box>
                <Box sx={{ color: kpi.color, opacity: 0.6, fontSize: 48 }}>{kpi.icon}</Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab icon={<SchoolIcon />} label="نظرة عامة" />
          <Tab icon={<CourseIcon />} label="البرامج" />
          <Tab icon={<EnrollIcon />} label="التسجيل" />
          <Tab icon={<CertIcon />} label="الشهادات" />
          <Tab icon={<AnalyticsIcon />} label="التحليلات" />
          <Tab icon={<IntegrationIcon />} label="التكامل" />
        </Tabs>
      </Paper>

      {/* ── Tab 0: Overview ── */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>🎓 ملخص النظام</Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography>نظام التدريب الإلكتروني يوفر بيئة تعليمية متكاملة لموظفي مركز الأوائل.</Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">✅ إنشاء البرامج التدريبية وإدارتها</Typography>
                  <Typography variant="subtitle2">✅ تسجيل الموظفين وتتبع التقدم</Typography>
                  <Typography variant="subtitle2">✅ اختبارات وتقييمات ذكية</Typography>
                  <Typography variant="subtitle2">✅ إصدار الشهادات وإدارة التراخيص</Typography>
                  <Typography variant="subtitle2">✅ تحليلات ROI والأداء</Typography>
                  <Typography variant="subtitle2">✅ التكامل مع المنصات الخارجية</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>📊 إحصائيات سريعة</Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>إجمالي البرامج</Typography>
                    <Chip label={programs.length} color="primary" size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>المسجلون النشطون</Typography>
                    <Chip label={enrollments.filter(e => e?.status === 'enrolled' || e?.status === 'in-progress').length} color="info" size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>المكتملون</Typography>
                    <Chip label={enrollments.filter(e => e?.status === 'completed').length} color="success" size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>الشهادات الصادرة</Typography>
                    <Chip label={certifications.length} color="warning" size="small" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── Tab 1: Programs ── */}
      <TabPanel value={tab} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">البرامج التعليمية</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchPrograms}>تحديث</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setProgramDialog(true)}>برنامج جديد</Button>
          </Box>
        </Box>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>اسم البرنامج</TableCell>
                <TableCell>الفئة</TableCell>
                <TableCell>المستوى</TableCell>
                <TableCell>المدة (ساعة)</TableCell>
                <TableCell>التكلفة</TableCell>
                <TableCell>المسجلون</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {programs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      لا توجد برامج — أنشئ برنامجاً جديداً للبدء
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                programs.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{CATEGORY_OPTIONS.find(c => c.value === p.category)?.label || p.category}</TableCell>
                    <TableCell>{LEVEL_OPTIONS.find(l => l.value === p.level)?.label || p.level}</TableCell>
                    <TableCell>{p.duration}</TableCell>
                    <TableCell>{p.cost?.toLocaleString()} ر.س</TableCell>
                    <TableCell>{p.enrollmentCount || 0}</TableCell>
                    <TableCell><StatusChip status={p.status} /></TableCell>
                    <TableCell>
                      <Tooltip title="أرشفة">
                        <IconButton size="small" onClick={() => handleArchive(p.id)}>
                          <ArchiveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── Tab 2: Enrollments ── */}
      <TabPanel value={tab} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">تسجيل الموظفين</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEnrollDialog(true)}>تسجيل جديد</Button>
        </Box>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>رقم الموظف</TableCell>
                <TableCell>البرنامج</TableCell>
                <TableCell>نوع التسجيل</TableCell>
                <TableCell>التقدم</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الأولوية</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {enrollments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>لا توجد تسجيلات بعد</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                enrollments.filter(Boolean).map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell>{e.employeeId}</TableCell>
                    <TableCell>{programs.find(p => p.id === e.programId)?.name || e.programId}</TableCell>
                    <TableCell>{e.enrollmentType === 'self' ? 'ذاتي' : e.enrollmentType === 'manager' ? 'المدير' : 'إلزامي'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={e.progress || 0} sx={{ flexGrow: 1, height: 8, borderRadius: 4 }} />
                        <Typography variant="caption">{e.progress || 0}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><StatusChip status={e.status} /></TableCell>
                    <TableCell>
                      <Chip size="small" label={e.priority === 'high' ? 'عالية' : e.priority === 'low' ? 'منخفضة' : 'عادية'}
                        color={e.priority === 'high' ? 'error' : 'default'} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── Tab 3: Certifications ── */}
      <TabPanel value={tab} index={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">الشهادات والتراخيص</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCertDialog(true)}>شهادة جديدة</Button>
        </Box>
        <Grid container spacing={2}>
          {certifications.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <CertIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">لا توجد شهادات — أنشئ مسار شهادة للبدء</Typography>
              </Paper>
            </Grid>
          ) : (
            certifications.filter(Boolean).map((cert) => (
              <Grid item xs={12} sm={6} md={4} key={cert.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <StarIcon sx={{ color: '#ed6c02' }} />
                      <Typography variant="h6">{cert.name}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{cert.description}</Typography>
                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="caption">المستوى: {LEVEL_OPTIONS.find(l => l.value === cert.level)?.label || cert.level}</Typography>
                    <br />
                    <Typography variant="caption">درجة النجاح: {cert.passingScore}%</Typography>
                    <br />
                    <Typography variant="caption">مدة الصلاحية: {cert.validityPeriod} يوم</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </TabPanel>

      {/* ── Tab 4: Analytics ── */}
      <TabPanel value={tab} index={4}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">تحليلات التعلم والتطوير</Typography>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchAnalytics}>تحديث البيانات</Button>
        </Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CheckIcon color="success" />
                  <Typography variant="h6">معدل الإكمال</Typography>
                </Box>
                <Typography variant="h2" fontWeight="bold" color="success.main">
                  {analytics?.overallCompletionRate?.toFixed(1) || 0}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {analytics?.totalCompleted || 0} من {analytics?.totalEnrollments || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrendIcon color="primary" />
                  <Typography variant="h6">إجمالي التسجيلات</Typography>
                </Box>
                <Typography variant="h2" fontWeight="bold" color="primary.main">
                  {analytics?.totalEnrollments || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">عبر جميع البرامج</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PendingIcon color="warning" />
                  <Typography variant="h6">قيد التقدم</Typography>
                </Box>
                <Typography variant="h2" fontWeight="bold" color="warning.main">
                  {(analytics?.totalEnrollments || 0) - (analytics?.totalCompleted || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">بحاجة للمتابعة</Typography>
              </CardContent>
            </Card>
          </Grid>
          {analytics?.byProgram && Object.keys(analytics.byProgram).length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>أداء البرامج</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>البرنامج</TableCell>
                          <TableCell>الإجمالي</TableCell>
                          <TableCell>المكتمل</TableCell>
                          <TableCell>نسبة الإكمال</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(analytics.byProgram).map(([name, stats]) => (
                          <TableRow key={name}>
                            <TableCell>{name}</TableCell>
                            <TableCell>{stats.total}</TableCell>
                            <TableCell>{stats.completed}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress variant="determinate" value={stats.rate}
                                  sx={{ flexGrow: 1, height: 6, borderRadius: 3 }} />
                                <Typography variant="caption">{stats.rate.toFixed(0)}%</Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* ── Tab 5: Integrations ── */}
      <TabPanel value={tab} index={5}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">التكامل مع المنصات الخارجية</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIntegrationDialog(true)}>ربط منصة</Button>
        </Box>
        <Grid container spacing={2}>
          {integrations.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <IntegrationIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">لا توجد منصات مرتبطة — اربط منصة تعليمية للبدء</Typography>
              </Paper>
            </Grid>
          ) : (
            integrations.filter(Boolean).map((intg) => (
              <Grid item xs={12} sm={6} md={4} key={intg.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{intg.platformName}</Typography>
                    <StatusChip status={intg.status} />
                    <Typography variant="body2" sx={{ mt: 1 }}>التزامن: {intg.syncFrequency === 'daily' ? 'يومي' : intg.syncFrequency}</Typography>
                    <Typography variant="caption" color="text.secondary">عدد التزامنات: {intg.syncCount}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </TabPanel>

      {/* ═══════════════════ DIALOGS ═══════════════════ */}

      {/* Create Program Dialog */}
      <Dialog open={programDialog} onClose={() => setProgramDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء برنامج تعليمي جديد</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="اسم البرنامج" fullWidth required value={programForm.name}
              onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })} />
            <TextField label="الوصف" fullWidth multiline rows={2} value={programForm.description}
              onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })} />
            <TextField select label="الفئة" fullWidth value={programForm.category}
              onChange={(e) => setProgramForm({ ...programForm, category: e.target.value })}>
              {CATEGORY_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            <TextField select label="المستوى" fullWidth value={programForm.level}
              onChange={(e) => setProgramForm({ ...programForm, level: e.target.value })}>
              {LEVEL_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField label="المدة (ساعة)" type="number" fullWidth value={programForm.duration}
                  onChange={(e) => setProgramForm({ ...programForm, duration: Number(e.target.value) })} />
              </Grid>
              <Grid item xs={4}>
                <TextField label="التكلفة (ر.س)" type="number" fullWidth value={programForm.cost}
                  onChange={(e) => setProgramForm({ ...programForm, cost: Number(e.target.value) })} />
              </Grid>
              <Grid item xs={4}>
                <TextField label="الحد الأقصى" type="number" fullWidth value={programForm.maxParticipants}
                  onChange={(e) => setProgramForm({ ...programForm, maxParticipants: Number(e.target.value) })} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProgramDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateProgram} disabled={!programForm.name}>إنشاء</Button>
        </DialogActions>
      </Dialog>

      {/* Enroll Dialog */}
      <Dialog open={enrollDialog} onClose={() => setEnrollDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تسجيل موظف في برنامج</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="رقم الموظف" fullWidth required value={enrollForm.employeeId}
              onChange={(e) => setEnrollForm({ ...enrollForm, employeeId: e.target.value })} />
            {programs.length > 0 ? (
              <TextField select label="البرنامج" fullWidth required value={enrollForm.programId}
                onChange={(e) => setEnrollForm({ ...enrollForm, programId: e.target.value })}>
                {programs.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </TextField>
            ) : (
              <TextField label="رقم البرنامج" fullWidth required value={enrollForm.programId}
                onChange={(e) => setEnrollForm({ ...enrollForm, programId: e.target.value })} />
            )}
            <TextField select label="نوع التسجيل" fullWidth value={enrollForm.enrollmentType}
              onChange={(e) => setEnrollForm({ ...enrollForm, enrollmentType: e.target.value })}>
              <MenuItem value="self">ذاتي</MenuItem>
              <MenuItem value="manager">بواسطة المدير</MenuItem>
              <MenuItem value="mandatory">إلزامي</MenuItem>
            </TextField>
            <TextField select label="الأولوية" fullWidth value={enrollForm.priority}
              onChange={(e) => setEnrollForm({ ...enrollForm, priority: e.target.value })}>
              <MenuItem value="low">منخفضة</MenuItem>
              <MenuItem value="normal">عادية</MenuItem>
              <MenuItem value="high">عالية</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnrollDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleEnroll}
            disabled={!enrollForm.employeeId || !enrollForm.programId}>تسجيل</Button>
        </DialogActions>
      </Dialog>

      {/* Certification Dialog */}
      <Dialog open={certDialog} onClose={() => setCertDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء مسار شهادة</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="اسم الشهادة" fullWidth required value={certForm.name}
              onChange={(e) => setCertForm({ ...certForm, name: e.target.value })} />
            <TextField label="الوصف" fullWidth multiline rows={2} value={certForm.description}
              onChange={(e) => setCertForm({ ...certForm, description: e.target.value })} />
            <TextField select label="المستوى" fullWidth value={certForm.level}
              onChange={(e) => setCertForm({ ...certForm, level: e.target.value })}>
              {LEVEL_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField label="درجة النجاح (%)" type="number" fullWidth value={certForm.passingScore}
                  onChange={(e) => setCertForm({ ...certForm, passingScore: Number(e.target.value) })} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="مدة الصلاحية (يوم)" type="number" fullWidth value={certForm.validityPeriod}
                  onChange={(e) => setCertForm({ ...certForm, validityPeriod: Number(e.target.value) })} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCertDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateCert} disabled={!certForm.name}>إنشاء</Button>
        </DialogActions>
      </Dialog>

      {/* Integration Dialog */}
      <Dialog open={integrationDialog} onClose={() => setIntegrationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ربط منصة تعليمية خارجية</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="اسم المنصة" fullWidth required value={integrationForm.platformName}
              onChange={(e) => setIntegrationForm({ ...integrationForm, platformName: e.target.value })} />
            <TextField label="مفتاح API" fullWidth required value={integrationForm.apiKey}
              onChange={(e) => setIntegrationForm({ ...integrationForm, apiKey: e.target.value })} />
            <TextField label="رابط API" fullWidth value={integrationForm.endpoint}
              onChange={(e) => setIntegrationForm({ ...integrationForm, endpoint: e.target.value })} />
            <TextField select label="تكرار التزامن" fullWidth value={integrationForm.syncFrequency}
              onChange={(e) => setIntegrationForm({ ...integrationForm, syncFrequency: e.target.value })}>
              <MenuItem value="hourly">كل ساعة</MenuItem>
              <MenuItem value="daily">يومي</MenuItem>
              <MenuItem value="weekly">أسبوعي</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIntegrationDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleConnectIntegration}
            disabled={!integrationForm.platformName || !integrationForm.apiKey}>ربط</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
