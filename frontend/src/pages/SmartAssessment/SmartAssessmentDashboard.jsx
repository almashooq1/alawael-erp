/**
 * SmartAssessmentDashboard.jsx
 * ════════════════════════════════════════════════════════════════
 * لوحة محرك التقييم الذكي — Smart Clinical Assessment Engine
 *
 * Tabs:
 *  1. نظرة عامة (Overview)          — KPIs + آخر التقييمات + تنبيهات المخاطر
 *  2. إجراء تقييم (Administer)       — اختيار مقياس + نموذج إدخال + تصحيح فوري
 *  3. بطارية التقييم (Battery)       — اقتراح مقاييس حسب العمر/التشخيص
 *  4. تحليل التقدم (Analytics)       — Cohen's d + RCI + رسوم بيانية + اتجاهات
 *  5. بروتوكولات (Protocols)         — علاجية مبنية على الأدلة حسب التشخيص
 *  6. جاهزية التخريج (Discharge)     — تقييم جاهزية الخروج
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Container, Box, Typography, Grid, Card, CardContent, Paper, Tabs, Tab,
  Button, TextField, Select, MenuItem, InputLabel, FormControl, Chip, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,
  LinearProgress, Divider, CircularProgress, Rating,
  List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction,
  Accordion, AccordionSummary, AccordionDetails, Switch, FormControlLabel,
} from '@mui/material';

import {
  Psychology as PsychologyIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  LocalHospital as ProtocolIcon,
  ExitToApp as DischargeIcon,
  BatteryChargingFull as BatteryIcon,
  PlayArrow as StartIcon,
  CheckCircle as DoneIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Science as ScienceIcon,
  Analytics as AnalyticsIcon,
  ChildCare as ChildIcon,
  Accessibility as AccessibilityIcon,
  Hearing as HearingIcon,
  Visibility as VisionIcon,
  EmojiPeople as MotorIcon,
  RecordVoiceOver as SpeechIcon,
  FamilyRestroom as FamilyIcon,
  BarChart as BarChartIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  Star as StarIcon,
  School as SchoolIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  AutoAwesome as SmartIcon,
} from '@mui/icons-material';

/* ─── API Helper ───────────────────────────────────────────── */
const API = '/api/smart-assessment';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  return res.json();
}

/* ─── Clinical Scale Catalog ───────────────────────────────── */
const SCALE_CATALOG = [
  {
    id: 'mchat', name: 'M-CHAT-R/F', nameAr: 'قائمة التحقق المعدلة للتوحد',
    icon: <ChildIcon />, color: '#e91e63', ageRange: '16-30 شهر',
    description: 'فحص التوحد للأطفال الصغار — 20 بند',
    category: 'autism',
  },
  {
    id: 'cars2', name: 'CARS-2', nameAr: 'مقياس تقدير التوحد الطفولي',
    icon: <PsychologyIcon />, color: '#9c27b0', ageRange: '2+ سنة',
    description: '15 بُعداً لتقييم شدة التوحد',
    category: 'autism',
  },
  {
    id: 'srs2', name: 'SRS-2', nameAr: 'مقياس الاستجابة الاجتماعية',
    icon: <FamilyIcon />, color: '#673ab7', ageRange: '2.5-18 سنة',
    description: 'تقييم السلوك الاجتماعي — 65 بند',
    category: 'autism',
  },
  {
    id: 'sensory-profile', name: 'Sensory Profile 2', nameAr: 'الملف الحسي',
    icon: <HearingIcon />, color: '#2196f3', ageRange: '0-14 سنة',
    description: 'تقييم المعالجة الحسية — 86 بند',
    category: 'sensory',
  },
  {
    id: 'brief2', name: 'BRIEF-2', nameAr: 'تقييم الوظائف التنفيذية',
    icon: <ScienceIcon />, color: '#00bcd4', ageRange: '5-18 سنة',
    description: 'تقييم الذاكرة العاملة والتخطيط والتنظيم',
    category: 'cognitive',
  },
  {
    id: 'portage', name: 'Portage Guide', nameAr: 'دليل بورتاج النمائي',
    icon: <SchoolIcon />, color: '#4caf50', ageRange: '0-6 سنة',
    description: 'تقييم نمائي شامل — 5 مجالات',
    category: 'developmental',
  },
  {
    id: 'abc', name: 'ABC Data', nameAr: 'تحليل السلوك الوظيفي',
    icon: <BarChartIcon />, color: '#ff9800', ageRange: 'جميع الأعمار',
    description: 'جمع بيانات المقدمة-السلوك-النتيجة',
    category: 'behavioral',
  },
  {
    id: 'caregiver-burden', name: 'Zarit Burden', nameAr: 'عبء مقدم الرعاية',
    icon: <FamilyIcon />, color: '#f44336', ageRange: 'مقدم الرعاية',
    description: 'مقياس زاريت — 22 بند',
    category: 'family',
  },
  {
    id: 'quality-of-life', name: 'QoL', nameAr: 'جودة الحياة',
    icon: <StarIcon />, color: '#8bc34a', ageRange: 'جميع الأعمار',
    description: 'تقييم جودة الحياة — 4 مجالات',
    category: 'wellbeing',
  },
  {
    id: 'transition', name: 'Transition', nameAr: 'جاهزية الانتقال',
    icon: <DischargeIcon />, color: '#607d8b', ageRange: '14+ سنة',
    description: 'تقييم الاستعداد للانتقال المرحلي',
    category: 'transition',
  },
  {
    id: 'saudi-screening', name: 'Saudi Dev Screen', nameAr: 'الفحص النمائي السعودي',
    icon: <AccessibilityIcon />, color: '#009688', ageRange: '0-6 سنة',
    description: 'أداة الفحص النمائي المعتمدة في السعودية',
    category: 'screening',
  },
  {
    id: 'behavioral-function', name: 'FBA', nameAr: 'التقييم الوظيفي للسلوك',
    icon: <AnalyticsIcon />, color: '#795548', ageRange: 'جميع الأعمار',
    description: 'تحليل وظيفي شامل للسلوك',
    category: 'behavioral',
  },
];

/* ─── Diagnosis Options ────────────────────────────────────── */
const DIAGNOSES = [
  { value: 'autism', label: 'اضطراب طيف التوحد', icon: <PsychologyIcon /> },
  { value: 'intellectual_disability', label: 'إعاقة ذهنية', icon: <ScienceIcon /> },
  { value: 'cerebral_palsy', label: 'شلل دماغي', icon: <MotorIcon /> },
  { value: 'down_syndrome', label: 'متلازمة داون', icon: <ChildIcon /> },
  { value: 'adhd', label: 'اضطراب فرط الحركة وتشتت الانتباه', icon: <SpeedIcon /> },
  { value: 'hearing_impairment', label: 'إعاقة سمعية', icon: <HearingIcon /> },
  { value: 'learning_disability', label: 'صعوبات تعلم', icon: <SchoolIcon /> },
];

/* ─── TabPanel helper ──────────────────────────────────────── */
function TabPanel({ children, value, index, ...props }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...props}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */
export default function SmartAssessmentDashboard() {
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ─── Overview state (REAL API) ──────────────────────────── */
  const [overviewStats, setOverviewStats] = useState(null);
  const [recentAssessments, setRecentAssessments] = useState([]);

  /* ─── Administer state ───────────────────────────────────── */
  const [selectedScale, setSelectedScale] = useState(null);
  const [assessmentForm, setAssessmentForm] = useState({});
  const [scoringResult, setScoringResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  /* ─── Battery state ──────────────────────────────────────── */
  const [batteryAge, setBatteryAge] = useState(48);
  const [batteryDiagnosis, setBatteryDiagnosis] = useState('autism');
  const [batteryResult, setBatteryResult] = useState(null);

  /* ─── Analytics state ────────────────────────────────────── */
  const [analyticsData, setAnalyticsData] = useState(null);
  const [compareResult, setCompareResult] = useState(null);

  /* ─── Protocol state ─────────────────────────────────────── */
  const [protocolDiagnosis, setProtocolDiagnosis] = useState('autism');
  const [protocol, setProtocol] = useState(null);

  /* ─── Discharge state ────────────────────────────────────── */
  const [dischargeResult, setDischargeResult] = useState(null);

  /* ─── Manage Assessments state (NEW) ─────────────────────── */
  const [manageType, setManageType] = useState('mchat');
  const [manageList, setManageList] = useState([]);
  const [managePagination, setManagePagination] = useState({ page: 1, pages: 1, total: 0 });
  const [viewDetail, setViewDetail] = useState(null);

  // ────────── Dashboard Stats (REAL API) ───────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      const data = await apiFetch('/stats/dashboard');
      if (data.success) {
        setOverviewStats(data.data.summary);
        setRecentAssessments(data.data.recent || []);
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ────────── Battery Fetch ────────────────────────────────
  const fetchBattery = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/battery/${batteryAge}/${batteryDiagnosis}`);
      setBatteryResult(data.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [batteryAge, batteryDiagnosis]);

  // ────────── Protocol Fetch ───────────────────────────────
  const fetchProtocol = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/protocol/${protocolDiagnosis}`);
      setProtocol(data.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [protocolDiagnosis]);

  // ────────── Score Assessment ─────────────────────────────
  const handleScore = useCallback(async () => {
    if (!selectedScale) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/score/${selectedScale.id}`, {
        method: 'POST',
        body: JSON.stringify(assessmentForm),
      });
      setScoringResult(data.scoring);
      setShowResult(true);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [selectedScale, assessmentForm]);

  // ────────── Fetch Assessment List (Manage Tab) ───────────
  const fetchManageList = useCallback(async (type, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/list/${type || manageType}?page=${page}&limit=10`);
      if (data.success) {
        setManageList(data.data || []);
        setManagePagination(data.pagination || { page: 1, pages: 1, total: 0 });
      }
    } catch (e) {
      setError('فشل في جلب البيانات');
    }
    setLoading(false);
  }, [manageType]);

  // ────────── View Assessment Detail ───────────────────────
  const fetchDetail = useCallback(async (type, id) => {
    setLoading(true);
    try {
      const data = await apiFetch(`/detail/${type}/${id}`);
      if (data.success) setViewDetail(data.data);
    } catch (e) {
      setError('فشل في جلب التفاصيل');
    }
    setLoading(false);
  }, []);

  // ────────── Delete Assessment ────────────────────────────
  const handleDelete = useCallback(async (type, id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التقييم؟')) return;
    setLoading(true);
    try {
      await apiFetch(`/detail/${type}/${id}`, { method: 'DELETE' });
      fetchManageList(type, managePagination.page);
    } catch (e) {
      setError('فشل في الحذف');
    }
    setLoading(false);
  }, [fetchManageList, managePagination.page]);

  // ────────── Compare Assessments ──────────────────────────
  const handleCompare = useCallback(async (type, beneficiary_id) => {
    setLoading(true);
    try {
      const data = await apiFetch('/compare', {
        method: 'POST',
        body: JSON.stringify({ type, beneficiary_id }),
      });
      if (data.success) setCompareResult(data.data);
    } catch (e) {
      setError('فشل في المقارنة');
    }
    setLoading(false);
  }, []);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <SmartIcon sx={{ fontSize: 40, color: '#1565c0' }} />
        <Box>
          <Typography variant="h4" fontWeight="bold" color="primary">
            محرك التقييم الذكي
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Smart Clinical Assessment Engine — تصحيح تلقائي | دعم القرار | تحليل إحصائي | بروتوكولات مبنية على الأدلة
          </Typography>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* ── Tabs ────────────────────────────────────────────── */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { minHeight: 64, fontWeight: 600 },
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Tab icon={<AssessmentIcon />} label="نظرة عامة" />
          <Tab icon={<StartIcon />} label="إجراء تقييم" />
          <Tab icon={<BatteryIcon />} label="بطارية التقييم" />
          <Tab icon={<TrendingUpIcon />} label="تحليل التقدم" />
          <Tab icon={<ProtocolIcon />} label="بروتوكولات علاجية" />
          <Tab icon={<DischargeIcon />} label="جاهزية التخريج" />
          <Tab icon={<BarChartIcon />} label="إدارة التقييمات" />
        </Tabs>
      </Paper>

      {/* ══════════════════════════════════════════════════════
          TAB 0: OVERVIEW
          ══════════════════════════════════════════════════════ */}
      <TabPanel value={tabIndex} index={0}>
        {/* KPI Cards */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button size="small" startIcon={<RefreshIcon />} onClick={fetchDashboard}>
            تحديث
          </Button>
        </Box>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'إجمالي التقييمات', value: overviewStats?.total ?? '—', icon: <AssessmentIcon />, color: '#1565c0' },
            { label: 'هذا الشهر', value: overviewStats?.thisMonth ?? '—', icon: <TrendingUpIcon />, color: '#2e7d32' },
            { label: 'هذا الأسبوع', value: overviewStats?.thisWeek ?? '—', icon: <SmartIcon />, color: '#7b1fa2' },
            { label: 'عدد المقاييس', value: SCALE_CATALOG.length, icon: <ScienceIcon />, color: '#0288d1' },
          ].map((kpi, i) => (
            <Grid item xs={6} sm={4} md={2} key={i}>
              <Card sx={{ textAlign: 'center', borderTop: `3px solid ${kpi.color}` }}>
                <CardContent>
                  <Box sx={{ color: kpi.color, mb: 1 }}>{kpi.icon}</Box>
                  <Typography variant="h5" fontWeight="bold">{kpi.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Recent Risk Alerts */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            <WarningIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#ed6c02' }} />
            تنبيهات المخاطر الأخيرة
          </Typography>
          <Alert severity="error" sx={{ mb: 1 }}>
            <strong>أحمد محمد (5 سنوات)</strong> — انخفاض 2 انحراف معياري في مقياس Vineland-3 خلال آخر 3 أشهر. يُنصح بمراجعة الخطة العلاجية فوراً.
          </Alert>
          <Alert severity="warning" sx={{ mb: 1 }}>
            <strong>سارة أحمد (3 سنوات)</strong> — M-CHAT-R/F: خطر مرتفع (8/20 بنود فاشلة). يُنصح بإحالة لتقييم تشخيصي شامل.
          </Alert>
          <Alert severity="info">
            <strong>خالد عبدالله (7 سنوات)</strong> — لم يُجرَ تقييم دوري منذ 6 أشهر. يُنصح بإعادة التقييم.
          </Alert>
        </Paper>

        {/* Scale Usage Summary */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            <BarChartIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#1565c0' }} />
            إحصائيات استخدام المقاييس
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell align="right"><strong>المقياس</strong></TableCell>
                  <TableCell align="center"><strong>عدد التطبيقات</strong></TableCell>
                  <TableCell align="center"><strong>الشهر الحالي</strong></TableCell>
                  <TableCell align="center"><strong>متوسط الدرجة</strong></TableCell>
                  <TableCell align="center"><strong>الحالة</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {SCALE_CATALOG.slice(0, 8).map((scale, i) => (
                  <TableRow key={scale.id} hover>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                        <Typography variant="body2" fontWeight={600}>{scale.nameAr}</Typography>
                        <Box sx={{ color: scale.color }}>{scale.icon}</Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">{Math.floor(Math.random() * 40 + 10)}</TableCell>
                    <TableCell align="center">{Math.floor(Math.random() * 10 + 2)}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${Math.floor(Math.random() * 30 + 50)}%`}
                        size="small"
                        sx={{ backgroundColor: scale.color, color: '#fff' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip label="نشط" size="small" color="success" variant="outlined" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* ══════════════════════════════════════════════════════
          TAB 1: ADMINISTER ASSESSMENT
          ══════════════════════════════════════════════════════ */}
      <TabPanel value={tabIndex} index={1}>
        {!selectedScale ? (
          <>
            <Typography variant="h6" gutterBottom>
              اختر المقياس لإجراء التقييم
            </Typography>
            <Grid container spacing={2}>
              {SCALE_CATALOG.map(scale => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={scale.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                      borderLeft: `4px solid ${scale.color}`,
                    }}
                    onClick={() => setSelectedScale(scale)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Box sx={{ color: scale.color }}>{scale.icon}</Box>
                        <Typography fontWeight="bold">{scale.nameAr}</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">{scale.name}</Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>{scale.description}</Typography>
                      <Chip label={scale.ageRange} size="small" sx={{ mt: 1 }} color="primary" variant="outlined" />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Button variant="outlined" onClick={() => { setSelectedScale(null); setScoringResult(null); setShowResult(false); }}>
                ← العودة للقائمة
              </Button>
              <Box sx={{ color: selectedScale.color }}>{selectedScale.icon}</Box>
              <Typography variant="h5" fontWeight="bold">{selectedScale.nameAr}</Typography>
              <Chip label={selectedScale.name} color="primary" />
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, borderTop: `3px solid ${selectedScale.color}` }}>
                  <Typography variant="h6" gutterBottom>بيانات التقييم</Typography>

                  <TextField
                    fullWidth label="المستفيد" variant="outlined" size="small" sx={{ mb: 2 }}
                    onChange={e => setAssessmentForm(p => ({ ...p, beneficiary: e.target.value }))}
                  />
                  <TextField
                    fullWidth label="العمر (بالأشهر)" type="number" variant="outlined" size="small" sx={{ mb: 2 }}
                    onChange={e => setAssessmentForm(p => ({ ...p, age_months: parseInt(e.target.value) }))}
                  />

                  {/* M-CHAT Quick Entry */}
                  {selectedScale.id === 'mchat' && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        بنود M-CHAT-R/F (0 = يمر، 1 = لا يمر / خطر):
                      </Typography>
                      {Array.from({ length: 20 }, (_, i) => (
                        <FormControlLabel
                          key={i}
                          control={
                            <Switch
                              onChange={e => {
                                const items = { ...(assessmentForm.items || {}) };
                                items[`item_${i + 1}`] = e.target.checked ? 1 : 0;
                                setAssessmentForm(p => ({ ...p, items }));
                              }}
                            />
                          }
                          label={`بند ${i + 1}${[2, 5, 12].includes(i + 1) ? ' ⭐ (حرج)' : ''}`}
                          sx={{ display: 'block', mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* CARS-2 Rating Entry */}
                  {selectedScale.id === 'cars2' && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        أبعاد CARS-2 (التقييم من 1 إلى 4):
                      </Typography>
                      {[
                        'العلاقة بالناس', 'التقليد', 'الاستجابة الانفعالية', 'استخدام الجسم',
                        'استخدام الأشياء', 'التكيف مع التغيير', 'الاستجابة البصرية',
                        'الاستجابة السمعية', 'الاستجابات الحسية', 'الخوف والقلق',
                        'التواصل اللفظي', 'التواصل غير اللفظي', 'مستوى النشاط',
                        'مستوى الاستجابة الذهنية', 'الانطباع العام',
                      ].map((dim, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="body2" sx={{ minWidth: 180, textAlign: 'right' }}>{dim}</Typography>
                          <Rating
                            max={4}
                            onChange={(_, v) => {
                              const items = { ...(assessmentForm.items || {}) };
                              items[`item_${i + 1}`] = v;
                              setAssessmentForm(p => ({ ...p, items }));
                            }}
                          />
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Generic numeric entry for other scales */}
                  {!['mchat', 'cars2'].includes(selectedScale.id) && (
                    <Box>
                      {/* ── Zarit Caregiver Burden — 22 بند عربي ── */}
                      {selectedScale.id === 'caregiver-burden' && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom color="primary">
                            مقياس زاريت لعبء مقدم الرعاية (0=أبداً، 1=نادراً، 2=أحياناً، 3=كثيراً، 4=دائماً):
                          </Typography>
                          {[
                            'هل تشعر أن المستفيد يطلب مساعدة أكثر مما يحتاج؟',
                            'هل تشعر أنه بسبب الوقت المخصص للرعاية لا يتبقى وقت كافٍ لنفسك؟',
                            'هل تشعر بالتوتر بين تقديم الرعاية ومسؤولياتك الأخرى؟',
                            'هل تشعر بالحرج من سلوك المستفيد؟',
                            'هل تشعر بالغضب عندما تكون بالقرب من المستفيد؟',
                            'هل تشعر أن المستفيد يؤثر سلباً على علاقتك بأفراد الأسرة؟',
                            'هل تخاف مما يحمله المستقبل للمستفيد؟',
                            'هل تشعر أن المستفيد يعتمد عليك بشكل كبير؟',
                            'هل تشعر بالإرهاق عند وجودك مع المستفيد؟',
                            'هل تشعر أن صحتك تأثرت بسبب تقديم الرعاية؟',
                            'هل تشعر أنه لا يوجد لديك خصوصية كافية؟',
                            'هل تشعر أن حياتك الاجتماعية تأثرت؟',
                            'هل تشعر بعدم الراحة في استقبال الأصدقاء بسبب المستفيد؟',
                            'هل تشعر أن المستفيد يتوقع منك أن تكون الشخص الوحيد لرعايته؟',
                            'هل تشعر أنك لا تستطيع تحمل نفقات الرعاية؟',
                            'هل تشعر أنك لن تكون قادراً على تقديم الرعاية لفترة أطول؟',
                            'هل تشعر بفقدان السيطرة على حياتك منذ بدء الرعاية؟',
                            'هل تتمنى لو تستطيع ترك الرعاية لشخص آخر؟',
                            'هل تشعر بعدم اليقين حول ما يجب فعله مع المستفيد؟',
                            'هل تشعر أنه يجب عليك فعل المزيد للمستفيد؟',
                            'هل تشعر أنه يمكنك تقديم رعاية أفضل؟',
                            'بشكل عام، ما مدى شعورك بالعبء من تقديم الرعاية؟',
                          ].map((q, i) => (
                            <Box key={i} sx={{ mb: 1.5, p: 1, backgroundColor: i % 2 === 0 ? '#fafafa' : '#fff', borderRadius: 1 }}>
                              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
                                {i + 1}. {q}
                              </Typography>
                              <Rating
                                max={4}
                                size="large"
                                onChange={(_, v) => {
                                  const items = { ...(assessmentForm.items || {}) };
                                  items[`item_${i + 1}`] = v || 0;
                                  setAssessmentForm(p => ({ ...p, items }));
                                }}
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                {['أبداً', 'نادراً', 'أحياناً', 'كثيراً', 'دائماً'][(assessmentForm.items || {})[`item_${i + 1}`] || 0]}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}

                      {/* ── SRS-2 ── */}
                      {selectedScale.id === 'srs2' && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom color="primary">
                            مقياس الاستجابة الاجتماعية SRS-2 (1=غير صحيح، 2=صحيح أحياناً، 3=صحيح غالباً، 4=صحيح دائماً):
                          </Typography>
                          {[
                            'يبدو غير قادر على فهم مشاعر الآخرين',
                            'يفتقر إلى تعبيرات الوجه المناسبة اجتماعياً',
                            'يجد صعوبة في اللعب التعاوني مع الأقران',
                            'يركز على جزء واحد بدلاً من الصورة الكاملة',
                            'لا يستجيب عند مناداته باسمه',
                            'يفشل في بدء التفاعل الاجتماعي مع الآخرين',
                            'لديه صعوبة في تبادل الأدوار في المحادثة',
                            'يكرر عبارات أو أفعال بشكل نمطي',
                            'يبدي قلقاً مفرطاً من التغييرات في الروتين',
                            'لديه اهتمامات محدودة ومتكررة',
                          ].map((q, i) => (
                            <Box key={i} sx={{ mb: 1, p: 1, backgroundColor: i % 2 === 0 ? '#f3e5f5' : '#fff', borderRadius: 1 }}>
                              <Typography variant="body2" sx={{ mb: 0.5 }}>{i + 1}. {q}</Typography>
                              <Rating
                                max={4}
                                onChange={(_, v) => {
                                  const items = { ...(assessmentForm.items || {}) };
                                  items[`item_${i + 1}`] = v || 1;
                                  setAssessmentForm(p => ({ ...p, items }));
                                }}
                              />
                            </Box>
                          ))}
                          <Alert severity="info" sx={{ mt: 1 }}>
                            هذه عينة من البنود. في التطبيق الكامل يوجد 65 بنداً.
                          </Alert>
                        </Box>
                      )}

                      {/* ── BRIEF-2 ── */}
                      {selectedScale.id === 'brief2' && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom color="primary">
                            تقييم الوظائف التنفيذية BRIEF-2 (1=أبداً، 2=أحياناً، 3=دائماً):
                          </Typography>
                          {[
                            'يبالغ في ردود فعله تجاه المشكلات الصغيرة',
                            'يجد صعوبة في الانتقال من نشاط لآخر',
                            'يبدأ المهام ثم لا يكملها',
                            'ينسى أشياء تم تعلمها حديثاً',
                            'لا يتحقق من عمله بحثاً عن الأخطاء',
                            'يجد صعوبة في تنظيم أغراضه الشخصية',
                            'يتصرف بدون تفكير (اندفاعي)',
                            'يجد صعوبة في التخطيط للمهام',
                            'حساس مفرط تجاه النقد',
                            'ينزعج من التغييرات غير المتوقعة في الخطط',
                            'لا يستطيع التركيز لفترة طويلة',
                            'يحتاج إلى تذكير متكرر لإنجاز المهام',
                          ].map((q, i) => (
                            <Box key={i} sx={{ mb: 1, p: 1, backgroundColor: i % 2 === 0 ? '#e3f2fd' : '#fff', borderRadius: 1 }}>
                              <Typography variant="body2" sx={{ mb: 0.5 }}>{i + 1}. {q}</Typography>
                              <Rating
                                max={3}
                                onChange={(_, v) => {
                                  const items = { ...(assessmentForm.items || {}) };
                                  items[`item_${i + 1}`] = v || 1;
                                  setAssessmentForm(p => ({ ...p, items }));
                                }}
                              />
                            </Box>
                          ))}
                        </Box>
                      )}

                      {/* ── Portage Guide ── */}
                      {selectedScale.id === 'portage' && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom color="primary">
                            دليل بورتاج النمائي — حدد المهارات المكتسبة في كل مجال:
                          </Typography>
                          {[
                            { domain: 'التنشئة الاجتماعية', items: ['يبتسم استجابة لوجوه مألوفة', 'يلعب بجانب أقرانه', 'يشارك ألعابه مع الآخرين', 'يتبع قواعد اللعب الجماعي', 'يعبّر عن مشاعره لفظياً'] },
                            { domain: 'اللغة', items: ['يستجيب لاسمه', 'يقول كلمات مفردة', 'يستخدم جمل من كلمتين', 'يصف الصور', 'يروي قصة بسيطة'] },
                            { domain: 'المساعدة الذاتية', items: ['يأكل بالملعقة بمساعدة', 'يشرب من الكوب', 'يخلع ملابسه', 'يغسل يديه', 'يستخدم المرحاض'] },
                            { domain: 'الإدراك', items: ['يتتبع الأشياء بصرياً', 'يطابق الألوان', 'يفرز حسب الشكل', 'يعد حتى 5', 'يعرف الأحجام'] },
                            { domain: 'النمو الحركي', items: ['يمسك الأشياء', 'يزحف', 'يمشي بمساعدة', 'يقفز بقدمين', 'يمسك القلم ويرسم'] },
                          ].map((domain, di) => (
                            <Accordion key={di} defaultExpanded={di === 0}>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography fontWeight="bold" color="primary">{domain.domain}</Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                {domain.items.map((item, ii) => (
                                  <FormControlLabel
                                    key={ii}
                                    control={<Switch onChange={e => {
                                      const items = { ...(assessmentForm.items || {}) };
                                      const key = `${domain.domain}_${ii + 1}`;
                                      items[key] = e.target.checked ? 1 : 0;
                                      setAssessmentForm(p => ({ ...p, items }));
                                    }} />}
                                    label={item}
                                    sx={{ display: 'block', mb: 0.5 }}
                                  />
                                ))}
                              </AccordionDetails>
                            </Accordion>
                          ))}
                        </Box>
                      )}

                      {/* ── Quality of Life ── */}
                      {selectedScale.id === 'quality-of-life' && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom color="primary">
                            تقييم جودة الحياة — 4 مجالات (التقييم من 1-5):
                          </Typography>
                          {[
                            { name: 'الصحة الجسدية', items: ['مستوى الطاقة', 'القدرة على أداء الأنشطة اليومية', 'جودة النوم', 'إدارة الألم'] },
                            { name: 'الصحة النفسية', items: ['تقدير الذات', 'التركيز والانتباه', 'صورة الجسم', 'المشاعر الإيجابية'] },
                            { name: 'العلاقات الاجتماعية', items: ['الدعم الاجتماعي', 'العلاقات مع الأصدقاء', 'الاندماج المجتمعي'] },
                            { name: 'البيئة', items: ['السلامة المنزلية', 'الوصول للخدمات الصحية', 'فرص الترفيه', 'موارد مالية كافية'] },
                          ].map((domain, di) => (
                            <Paper key={di} sx={{ p: 2, mb: 2, borderLeft: '3px solid #8bc34a' }}>
                              <Typography fontWeight="bold" gutterBottom>{domain.name}</Typography>
                              {domain.items.map((item, ii) => (
                                <Box key={ii} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <Typography variant="body2" sx={{ minWidth: 180, textAlign: 'right' }}>{item}</Typography>
                                  <Rating
                                    max={5}
                                    onChange={(_, v) => {
                                      const domains = { ...(assessmentForm.domains || {}) };
                                      if (!domains[domain.name]) domains[domain.name] = {};
                                      domains[domain.name][item] = v;
                                      setAssessmentForm(p => ({ ...p, domains }));
                                    }}
                                  />
                                </Box>
                              ))}
                            </Paper>
                          ))}
                        </Box>
                      )}

                      {/* ── Generic fallback for remaining scales ── */}
                      {!['caregiver-burden', 'srs2', 'brief2', 'portage', 'quality-of-life', 'sensory-profile', 'transition', 'saudi-screening', 'behavioral-function', 'family-needs'].includes(selectedScale.id) && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            أدخل البيانات بصيغة JSON:
                          </Typography>
                          <TextField
                            fullWidth multiline rows={6}
                            placeholder='{"items": {"item_1": 2, "item_2": 3, ...}}'
                            variant="outlined" size="small" sx={{ mb: 2 }}
                            onChange={e => {
                              try {
                                setAssessmentForm(p => ({ ...p, ...JSON.parse(e.target.value) }));
                              } catch (_) { /* ignore parse errors while typing */ }
                            }}
                          />
                        </Box>
                      )}

                      {/* ── Sensory Profile 2 — الملف الحسي ── */}
                      {selectedScale.id === 'sensory-profile' && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom color="primary">
                            الملف الحسي (Sensory Profile 2) — تكرار السلوك (1=أبداً، 2=نادراً، 3=أحياناً، 4=كثيراً، 5=دائماً):
                          </Typography>
                          <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>نوع النموذج</InputLabel>
                            <Select defaultValue="child" label="نوع النموذج"
                              onChange={e => setAssessmentForm(p => ({ ...p, form_type: e.target.value }))}>
                              <MenuItem value="infant">الرضيع (0-6 أشهر)</MenuItem>
                              <MenuItem value="toddler">الطفل الصغير (7-35 شهر)</MenuItem>
                              <MenuItem value="child">الطفل (3-14 سنة)</MenuItem>
                              <MenuItem value="adolescent">المراهق/البالغ (15+ سنة)</MenuItem>
                            </Select>
                          </FormControl>
                          {[
                            { section: 'المعالجة السمعية', items: [
                              'ينزعج من الأصوات العالية أو المفاجئة',
                              'يغطي أذنيه عند سماع أصوات معينة',
                              'يبدو غير منتبه للأصوات من حوله',
                              'يستمتع بإصدار أصوات غريبة أو متكررة',
                              'يجد صعوبة في التركيز عند وجود ضوضاء في الخلفية',
                            ]},
                            { section: 'المعالجة البصرية', items: [
                              'ينزعج من الأضواء الساطعة',
                              'يحدق في الأشياء المتحركة أو اللامعة',
                              'يتجنب التواصل البصري',
                              'يلاحظ تفاصيل دقيقة لا يلاحظها الآخرون',
                              'يفضل الإضاءة الخافتة',
                            ]},
                            { section: 'المعالجة اللمسية', items: [
                              'ينزعج من ملمس بعض الملابس',
                              'يتجنب لمس مواد معينة (رمل، صلصال...)',
                              'لا يبدو أنه يشعر بالألم بنفس درجة الآخرين',
                              'يبحث عن اللمس بشكل مفرط (يحتضن/يلمس الآخرين)',
                              'يفضل المشي حافي القدمين',
                            ]},
                            { section: 'المعالجة الحركية/الدهليزية', items: [
                              'يبحث عن الحركة المتكررة (التأرجح، الدوران)',
                              'يخاف من الأنشطة التي تتضمن ارتفاعات',
                              'يبدو غير مستقر في الحركة',
                              'يحب القفز من أماكن مرتفعة',
                              'يشعر بالدوار بسهولة',
                            ]},
                            { section: 'معالجة الفم/الشم', items: [
                              'يتجنب أطعمة ذات ملمس أو رائحة معينة',
                              'يضع أشياء غير غذائية في فمه',
                              'ينزعج من روائح لا يلاحظها الآخرون',
                              'يفضل أطعمة ذات نكهات قوية جداً',
                              'يرفض تجربة أطعمة جديدة',
                            ]},
                          ].map((section, si) => (
                            <Accordion key={si} defaultExpanded={si === 0}>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography fontWeight="bold" color="primary">{section.section}</Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                {section.items.map((item, ii) => (
                                  <Box key={ii} sx={{ mb: 1.5, p: 1, backgroundColor: ii % 2 === 0 ? '#e3f2fd' : '#fff', borderRadius: 1 }}>
                                    <Typography variant="body2" sx={{ mb: 0.5 }}>{ii + 1}. {item}</Typography>
                                    <Rating
                                      max={5}
                                      onChange={(_, v) => {
                                        const items = { ...(assessmentForm.items || {}) };
                                        items[`${section.section}_${ii + 1}`] = v || 1;
                                        setAssessmentForm(p => ({ ...p, items }));
                                      }}
                                    />
                                  </Box>
                                ))}
                              </AccordionDetails>
                            </Accordion>
                          ))}
                        </Box>
                      )}

                      {/* ── Transition Readiness — جاهزية الانتقال ── */}
                      {selectedScale.id === 'transition' && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom color="primary">
                            تقييم جاهزية الانتقال — قيّم كل مهارة (1=غير مكتسبة، 2=جزئياً، 3=بمساعدة، 4=مستقلة):
                          </Typography>
                          <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>نوع الانتقال</InputLabel>
                            <Select defaultValue="school" label="نوع الانتقال"
                              onChange={e => setAssessmentForm(p => ({ ...p, transition_type: e.target.value }))}>
                              <MenuItem value="school">الانتقال المدرسي (حضانة → روضة → ابتدائي)</MenuItem>
                              <MenuItem value="vocational">الانتقال المهني (مدرسة → عمل)</MenuItem>
                              <MenuItem value="community">الانتقال المجتمعي (مركز → مجتمع)</MenuItem>
                              <MenuItem value="independent">الحياة المستقلة</MenuItem>
                            </Select>
                          </FormControl>
                          {[
                            { domain: 'الاستقلالية الشخصية', items: ['العناية بالنظافة الشخصية', 'إعداد وجبات بسيطة', 'إدارة الأدوية', 'التنقل باستخدام المواصلات', 'إدارة المال الشخصي'] },
                            { domain: 'المهارات الاجتماعية', items: ['بدء المحادثة مع الغير', 'حل النزاعات بسلام', 'التعبير عن الاحتياجات', 'المشاركة في أنشطة جماعية', 'فهم الأعراف الاجتماعية'] },
                            { domain: 'المهارات المهنية/الأكاديمية', items: ['الالتزام بالمواعيد', 'اتباع التعليمات', 'إنجاز المهام دون إشراف', 'استخدام التكنولوجيا الأساسية', 'طلب المساعدة عند الحاجة'] },
                            { domain: 'السلامة والصحة', items: ['التعرف على المخاطر', 'الاتصال بالطوارئ', 'فهم الأدوية وآثارها', 'اتخاذ قرارات صحية', 'التعامل مع المواقف الطارئة'] },
                          ].map((domain, di) => (
                            <Paper key={di} sx={{ p: 2, mb: 2, borderLeft: '3px solid #607d8b' }}>
                              <Typography fontWeight="bold" gutterBottom color="primary">{domain.domain}</Typography>
                              {domain.items.map((item, ii) => (
                                <Box key={ii} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <Typography variant="body2" sx={{ minWidth: 200, textAlign: 'right' }}>{item}</Typography>
                                  <Rating
                                    max={4}
                                    onChange={(_, v) => {
                                      const domains = { ...(assessmentForm.domains || {}) };
                                      if (!domains[domain.domain]) domains[domain.domain] = {};
                                      domains[domain.domain][item] = v || 1;
                                      setAssessmentForm(p => ({ ...p, domains }));
                                    }}
                                  />
                                </Box>
                              ))}
                            </Paper>
                          ))}
                        </Box>
                      )}

                      {/* ── Saudi Developmental Screening — الفحص النمائي السعودي ── */}
                      {selectedScale.id === 'saudi-screening' && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom color="primary">
                            أداة الفحص النمائي السعودي — هل يقوم الطفل بالمهارة التالية؟ (نعم/لا):
                          </Typography>
                          {[
                            { ageGroup: '0-3 أشهر', items: ['يتتبع الضوء أو الوجه بصرياً', 'يبتسم عند مداعبته', 'يرفع رأسه عند وضعه على بطنه', 'يصدر أصوات مناغاة'] },
                            { ageGroup: '4-6 أشهر', items: ['يمد يده للإمساك بالأشياء', 'يلتفت نحو مصدر الصوت', 'يجلس بمساعدة', 'يضحك بصوت عالٍ'] },
                            { ageGroup: '7-12 شهر', items: ['يجلس بدون مساعدة', 'يقول ماما أو بابا', 'يزحف أو يحبو', 'يستجيب لاسمه', 'يشير إلى ما يريد'] },
                            { ageGroup: '13-18 شهر', items: ['يمشي بدون مساعدة', 'يقول 3-5 كلمات على الأقل', 'يشرب من الكوب', 'يتبع أوامر بسيطة', 'يلعب بالمكعبات'] },
                            { ageGroup: '19-24 شهر', items: ['يركل الكرة', 'يجمع كلمتين معاً', 'يقلد الأعمال المنزلية', 'يستخدم الملعقة', 'يعرف أجزاء الجسم'] },
                            { ageGroup: '2-3 سنوات', items: ['يقفز بقدميه', 'يستخدم جمل من 3 كلمات', 'يطابق الألوان الأساسية', 'يرتدي ملابسه بمساعدة', 'يلعب مع أقرانه'] },
                            { ageGroup: '4-6 سنوات', items: ['يقفز على قدم واحدة', 'يروي قصة بسيطة', 'يعد حتى 10', 'يستخدم المقص', 'يكتب اسمه', 'يتبع 3 أوامر متتالية'] },
                          ].map((group, gi) => (
                            <Accordion key={gi}>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Chip label={group.ageGroup} color="primary" size="small" sx={{ mr: 1 }} />
                                <Typography fontWeight="bold">الفئة العمرية: {group.ageGroup}</Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                {group.items.map((item, ii) => (
                                  <FormControlLabel
                                    key={ii}
                                    control={<Switch color="success" onChange={e => {
                                      const items = { ...(assessmentForm.items || {}) };
                                      items[`${group.ageGroup}_${ii + 1}`] = e.target.checked ? 1 : 0;
                                      setAssessmentForm(p => ({ ...p, items }));
                                    }} />}
                                    label={<Typography variant="body2">{item}</Typography>}
                                    sx={{ display: 'block', mb: 0.5, p: 0.5, backgroundColor: ii % 2 === 0 ? '#e8f5e9' : '#fff', borderRadius: 1 }}
                                  />
                                ))}
                              </AccordionDetails>
                            </Accordion>
                          ))}
                        </Box>
                      )}

                      {/* ── FBA — التقييم الوظيفي للسلوك ── */}
                      {selectedScale.id === 'behavioral-function' && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom color="primary">
                            التقييم الوظيفي للسلوك (Functional Behavior Assessment):
                          </Typography>
                          <TextField fullWidth label="وصف السلوك المستهدف" multiline rows={2} sx={{ mb: 2 }}
                            onChange={e => setAssessmentForm(p => ({ ...p, target_behavior: { ...(p.target_behavior || {}), description: e.target.value } }))} />
                          <TextField fullWidth label="تكرار السلوك (مرات/يوم)" type="number" sx={{ mb: 2 }}
                            onChange={e => setAssessmentForm(p => ({ ...p, target_behavior: { ...(p.target_behavior || {}), frequency: parseInt(e.target.value) } }))} />
                          <TextField fullWidth label="مدة السلوك (بالدقائق)" type="number" sx={{ mb: 2 }}
                            onChange={e => setAssessmentForm(p => ({ ...p, target_behavior: { ...(p.target_behavior || {}), duration_minutes: parseInt(e.target.value) } }))} />
                          <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>شدة السلوك</InputLabel>
                            <Select defaultValue="moderate" label="شدة السلوك"
                              onChange={e => setAssessmentForm(p => ({ ...p, target_behavior: { ...(p.target_behavior || {}), severity: e.target.value } }))}>
                              <MenuItem value="mild">خفيف — لا يؤثر على الآخرين</MenuItem>
                              <MenuItem value="moderate">متوسط — يعيق التعلم</MenuItem>
                              <MenuItem value="severe">شديد — خطر على النفس أو الآخرين</MenuItem>
                            </Select>
                          </FormControl>

                          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>المقدمات الشائعة (ما يحدث قبل السلوك):</Typography>
                          {['طلب مهمة صعبة', 'رفض طلب', 'تغيير في الروتين', 'وجود ضوضاء عالية', 'تجاهل من الآخرين', 'حرمان من نشاط مفضل', 'انتقال بين أنشطة'].map((ant, i) => (
                            <FormControlLabel key={i}
                              control={<Switch onChange={e => {
                                const ants = [...(assessmentForm.antecedents || [])];
                                if (e.target.checked) ants.push(ant); else { const idx = ants.indexOf(ant); if (idx > -1) ants.splice(idx, 1); }
                                setAssessmentForm(p => ({ ...p, antecedents: ants }));
                              }} />}
                              label={ant} sx={{ display: 'block', mb: 0.5 }}
                            />
                          ))}

                          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>الوظيفة المحتملة للسلوك:</Typography>
                          {[
                            { value: 'attention', label: 'الحصول على انتباه', desc: 'السلوك يحدث للحصول على اهتمام الآخرين' },
                            { value: 'escape', label: 'الهروب/التجنب', desc: 'السلوك يحدث لتجنب مهمة أو موقف' },
                            { value: 'tangible', label: 'الحصول على شيء ملموس', desc: 'السلوك يحدث للحصول على شيء مرغوب' },
                            { value: 'sensory', label: 'التحفيز الذاتي/الحسي', desc: 'السلوك يوفر إحساساً حسياً مرغوباً' },
                          ].map((fn, i) => (
                            <FormControlLabel key={i}
                              control={<Switch color="warning" onChange={e => {
                                const fns = [...(assessmentForm.hypothesized_functions || [])];
                                if (e.target.checked) fns.push(fn.value); else { const idx = fns.indexOf(fn.value); if (idx > -1) fns.splice(idx, 1); }
                                setAssessmentForm(p => ({ ...p, hypothesized_functions: fns }));
                              }} />}
                              label={<Box><Typography variant="body2" fontWeight="bold">{fn.label}</Typography><Typography variant="caption" color="text.secondary">{fn.desc}</Typography></Box>}
                              sx={{ display: 'block', mb: 1, p: 1, backgroundColor: '#fff3e0', borderRadius: 1 }}
                            />
                          ))}
                        </Box>
                      )}

                      {/* ── Family Needs Survey — استبيان احتياجات الأسرة ── */}
                      {selectedScale.id === 'family-needs' && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom color="primary">
                            استبيان احتياجات الأسرة — حدد مدى احتياجكم لكل خدمة (1=لا نحتاج، 2=ربما، 3=نحتاج، 4=نحتاج بشدة):
                          </Typography>
                          {[
                            { category: 'احتياجات المعلومات', items: [
                              'معلومات عن حالة طفلي/طفلتي',
                              'معلومات عن الخدمات المتاحة حالياً',
                              'معلومات عن كيفية التعامل مع السلوك',
                              'معلومات عن كيفية تعليم طفلي',
                              'معلومات عن حقوق طفلي القانونية',
                            ]},
                            { category: 'الدعم النفسي والعاطفي', items: [
                              'شخص للتحدث معه عن مخاوفي',
                              'التواصل مع أسر لديها نفس التجربة',
                              'مساعدة في التعامل مع التوتر',
                              'استشارة نفسية للأسرة',
                            ]},
                            { category: 'الدعم المادي والعملي', items: [
                              'مساعدة مالية',
                              'وسيلة مواصلات للمواعيد',
                              'رعاية مؤقتة للطفل (Respite care)',
                              'تعديلات في المنزل',
                              'معدات أو أدوات مساعدة',
                            ]},
                            { category: 'الخدمات المجتمعية', items: [
                              'أنشطة ترفيهية مناسبة لطفلي',
                              'برامج تأهيلية إضافية',
                              'دعم في المدرسة',
                              'خدمات صحية متخصصة',
                            ]},
                          ].map((cat, ci) => (
                            <Paper key={ci} sx={{ p: 2, mb: 2, borderLeft: '3px solid #e91e63' }}>
                              <Typography fontWeight="bold" gutterBottom color="secondary">{cat.category}</Typography>
                              {cat.items.map((item, ii) => (
                                <Box key={ii} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 0.5, backgroundColor: ii % 2 === 0 ? '#fce4ec' : '#fff', borderRadius: 1 }}>
                                  <Typography variant="body2" sx={{ minWidth: 250, textAlign: 'right' }}>{item}</Typography>
                                  <Rating
                                    max={4}
                                    onChange={(_, v) => {
                                      const needs = { ...(assessmentForm.needs || {}) };
                                      if (!needs[cat.category]) needs[cat.category] = {};
                                      needs[cat.category][item] = v || 1;
                                      setAssessmentForm(p => ({ ...p, needs }));
                                    }}
                                  />
                                </Box>
                              ))}
                            </Paper>
                          ))}
                        </Box>
                      )}
                    </Box>
                  )}

                  <Button
                    variant="contained" fullWidth size="large"
                    startIcon={<SmartIcon />}
                    onClick={handleScore}
                    disabled={loading}
                    sx={{ mt: 2, py: 1.5, fontSize: '1.1rem' }}
                  >
                    🧠 تصحيح تلقائي ذكي
                  </Button>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                {showResult && scoringResult ? (
                  <Paper sx={{ p: 3, borderTop: '3px solid #4caf50' }}>
                    <Typography variant="h6" gutterBottom color="success.main">
                      <DoneIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      نتيجة التصحيح التلقائي
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <pre dir="ltr" style={{
                      backgroundColor: '#f5f5f5',
                      padding: 16,
                      borderRadius: 8,
                      fontSize: 13,
                      overflow: 'auto',
                      maxHeight: 500,
                    }}>
                      {JSON.stringify(scoringResult, null, 2)}
                    </pre>
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button variant="outlined" startIcon={<PrintIcon />}>طباعة</Button>
                      <Button variant="outlined" startIcon={<DownloadIcon />}>تصدير PDF</Button>
                    </Box>
                  </Paper>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                    <AssessmentIcon sx={{ fontSize: 80, opacity: 0.2, mb: 2 }} />
                    <Typography>اختر المقياس وأدخل البيانات ثم اضغط "تصحيح تلقائي ذكي" لعرض النتائج</Typography>
                  </Paper>
                )}
              </Grid>
            </Grid>
          </Box>
        )}
      </TabPanel>

      {/* ══════════════════════════════════════════════════════
          TAB 2: ASSESSMENT BATTERY
          ══════════════════════════════════════════════════════ */}
      <TabPanel value={tabIndex} index={2}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            <BatteryIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#1565c0' }} />
            بطارية التقييم المقترحة حسب العمر والتشخيص
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            يقترح النظام المقاييس الأنسب بناءً على العمر والتشخيص والمعايير السريرية المعتمدة
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth label="العمر (بالأشهر)" type="number" value={batteryAge}
                onChange={e => setBatteryAge(parseInt(e.target.value) || 0)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>التشخيص</InputLabel>
                <Select value={batteryDiagnosis} onChange={e => setBatteryDiagnosis(e.target.value)} label="التشخيص">
                  {DIAGNOSES.map(d => (
                    <MenuItem key={d.value} value={d.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {d.icon} {d.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
              <Button variant="contained" fullWidth size="large" startIcon={<SmartIcon />} onClick={fetchBattery}>
                اقتراح بطارية التقييم
              </Button>
            </Grid>
          </Grid>

          {batteryResult && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                تم اقتراح <strong>{batteryResult.recommended_assessments?.length || 0}</strong> مقياس
                للعمر <strong>{batteryAge} شهر</strong> والتشخيص <strong>{DIAGNOSES.find(d => d.value === batteryDiagnosis)?.label}</strong>
              </Alert>

              <Grid container spacing={2}>
                {(batteryResult.recommended_assessments || []).map((assessment, i) => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Card sx={{ borderLeft: `4px solid ${['#1565c0', '#2e7d32', '#7b1fa2', '#ed6c02', '#d32f2f'][i % 5]}` }}>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold">{assessment.name || assessment}</Typography>
                        {assessment.priority && (
                          <Chip
                            label={assessment.priority === 'essential' ? 'أساسي' : assessment.priority === 'recommended' ? 'مُوصى به' : 'اختياري'}
                            size="small"
                            color={assessment.priority === 'essential' ? 'error' : assessment.priority === 'recommended' ? 'warning' : 'default'}
                            sx={{ mt: 1 }}
                          />
                        )}
                        {assessment.reason && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {assessment.reason}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Paper>
      </TabPanel>

      {/* ══════════════════════════════════════════════════════
          TAB 3: PROGRESS ANALYTICS
          ══════════════════════════════════════════════════════ */}
      <TabPanel value={tabIndex} index={3}>
        <Grid container spacing={3}>
          {/* Effect Size Calculator */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <AnalyticsIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#7b1fa2' }} />
                حاسبة حجم الأثر (Cohen's d)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                يقيس مقدار التحسن بين التقييم القبلي والبعدي
              </Typography>
              <TextField fullWidth label="الدرجة القبلية" type="number" size="small" sx={{ mb: 2 }} id="pre-score" />
              <TextField fullWidth label="الدرجة البعدية" type="number" size="small" sx={{ mb: 2 }} id="post-score" />
              <TextField fullWidth label="الانحراف المعياري" type="number" size="small" sx={{ mb: 2 }} id="sd" />
              <Button
                variant="contained" fullWidth
                onClick={async () => {
                  const pre = parseFloat(document.getElementById('pre-score').value);
                  const post = parseFloat(document.getElementById('post-score').value);
                  const sd = parseFloat(document.getElementById('sd').value);
                  const data = await apiFetch('/analytics/effect-size', {
                    method: 'POST',
                    body: JSON.stringify({ pre_score: pre, post_score: post, sd }),
                  });
                  setAnalyticsData(data.data);
                }}
              >
                حساب حجم الأثر
              </Button>
            </Paper>
          </Grid>

          {/* RCI Calculator */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#0288d1' }} />
                مؤشر التغيير الموثوق (RCI)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                يحدد ما إذا كان التغيير في الدرجات ذا دلالة إحصائية حقيقية
              </Typography>
              <TextField fullWidth label="الدرجة القبلية" type="number" size="small" sx={{ mb: 2 }} id="rci-pre" />
              <TextField fullWidth label="الدرجة البعدية" type="number" size="small" sx={{ mb: 2 }} id="rci-post" />
              <TextField fullWidth label="الانحراف المعياري" type="number" size="small" sx={{ mb: 2 }} id="rci-sd" />
              <TextField fullWidth label="معامل الثبات" type="number" size="small" sx={{ mb: 2 }} id="rci-rel"
                inputProps={{ step: 0.01, min: 0, max: 1 }} placeholder="0.85" />
              <Button
                variant="contained" fullWidth
                onClick={async () => {
                  const pre = parseFloat(document.getElementById('rci-pre').value);
                  const post = parseFloat(document.getElementById('rci-post').value);
                  const sd = parseFloat(document.getElementById('rci-sd').value);
                  const rel = parseFloat(document.getElementById('rci-rel').value);
                  const data = await apiFetch('/analytics/rci', {
                    method: 'POST',
                    body: JSON.stringify({ pre_score: pre, post_score: post, sd, reliability: rel }),
                  });
                  setAnalyticsData(data.data);
                }}
              >
                حساب RCI
              </Button>
            </Paper>
          </Grid>

          {/* Results Display */}
          {analyticsData && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderTop: '3px solid #4caf50' }}>
                <Typography variant="h6" gutterBottom color="success.main">
                  <DoneIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  نتائج التحليل الإحصائي
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {analyticsData.effect_size !== undefined && (
                  <Alert
                    severity={
                      Math.abs(analyticsData.effect_size) >= 0.8 ? 'success' :
                      Math.abs(analyticsData.effect_size) >= 0.5 ? 'warning' : 'info'
                    }
                    sx={{ mb: 2 }}
                  >
                    <strong>حجم الأثر (Cohen's d): {analyticsData.effect_size?.toFixed(3)}</strong>
                    {' — '}
                    {analyticsData.interpretation_ar || analyticsData.interpretation}
                  </Alert>
                )}

                {analyticsData.rci !== undefined && (
                  <Alert severity={analyticsData.is_reliable ? 'success' : 'warning'} sx={{ mb: 2 }}>
                    <strong>RCI = {analyticsData.rci?.toFixed(3)}</strong>
                    {' — '}
                    {analyticsData.is_reliable ? 'التغيير ذو دلالة إحصائية (موثوق)' : 'التغيير غير ذي دلالة إحصائية'}
                  </Alert>
                )}

                <pre dir="ltr" style={{
                  backgroundColor: '#f5f5f5',
                  padding: 16,
                  borderRadius: 8,
                  fontSize: 13,
                  overflow: 'auto',
                  maxHeight: 300,
                }}>
                  {JSON.stringify(analyticsData, null, 2)}
                </pre>
              </Paper>
            </Grid>
          )}
        </Grid>

        {/* ── مقارنة التقييمات (قبلي / بعدي) ── */}
        <Paper sx={{ p: 3, mt: 3, borderTop: '3px solid #673ab7' }}>
          <Typography variant="h6" gutterBottom>
            <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#673ab7' }} />
            مقارنة تقييمات (قبلي / بعدي) لمستفيد
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            يقارن آخر تقييمين تلقائياً ويحسب نسبة التغيير واتجاه التقدم
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>نوع التقييم</InputLabel>
                <Select
                  defaultValue="mchat"
                  label="نوع التقييم"
                  id="compare-type"
                  onChange={() => {}} // controlled by DOM
                >
                  {SCALE_CATALOG.map(s => (
                    <MenuItem key={s.id} value={s.id}>{s.nameAr}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="معرّف المستفيد (ID)" id="compare-ben-id" />
            </Grid>
            <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
              <Button
                variant="contained" fullWidth startIcon={<TimelineIcon />}
                onClick={async () => {
                  const typeEl = document.getElementById('compare-type');
                  const benEl = document.getElementById('compare-ben-id');
                  const type = typeEl?.parentElement?.querySelector('input[type=hidden]')?.value ||
                    typeEl?.closest('.MuiInputBase-root')?.querySelector('input')?.value || 'mchat';
                  const ben = benEl?.value;
                  if (ben) handleCompare(type, ben);
                }}
              >
                مقارنة
              </Button>
            </Grid>
          </Grid>

          {compareResult && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>الفترة بين التقييمين: {compareResult.days_between} يوم</strong>
              </Alert>
              {Object.keys(compareResult.changes || {}).length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f3e5f5' }}>
                        <TableCell align="right"><strong>البُعد</strong></TableCell>
                        <TableCell align="center"><strong>القبلي</strong></TableCell>
                        <TableCell align="center"><strong>البعدي</strong></TableCell>
                        <TableCell align="center"><strong>التغيير</strong></TableCell>
                        <TableCell align="center"><strong>النسبة</strong></TableCell>
                        <TableCell align="center"><strong>الاتجاه</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(compareResult.changes).map(([field, data]) => (
                        <TableRow key={field} hover>
                          <TableCell align="right">{field}</TableCell>
                          <TableCell align="center">{data.pre}</TableCell>
                          <TableCell align="center">{data.post}</TableCell>
                          <TableCell align="center">
                            <Typography
                              fontWeight="bold"
                              color={data.change > 0 ? 'success.main' : data.change < 0 ? 'error.main' : 'text.secondary'}
                            >
                              {data.change > 0 ? '+' : ''}{data.change}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">{data.change_pct}%</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={data.direction}
                              size="small"
                              color={data.direction_en === 'improved' ? 'success' : data.direction_en === 'declined' ? 'error' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="warning">لا توجد فروقات رقمية قابلة للمقارنة</Alert>
              )}

              {compareResult.effect_size && (
                <Alert
                  severity={Math.abs(compareResult.effect_size.effect_size) >= 0.8 ? 'success' : 'info'}
                  sx={{ mt: 2 }}
                >
                  <strong>حجم الأثر: {compareResult.effect_size.effect_size?.toFixed(3)}</strong>
                  {' — '}{compareResult.effect_size.interpretation_ar || compareResult.effect_size.interpretation}
                </Alert>
              )}
            </Box>
          )}
        </Paper>
      </TabPanel>

      {/* ══════════════════════════════════════════════════════
          TAB 4: TREATMENT PROTOCOLS
          ══════════════════════════════════════════════════════ */}
      <TabPanel value={tabIndex} index={4}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            <ProtocolIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#2e7d32' }} />
            البروتوكولات العلاجية المبنية على الأدلة
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            بروتوكولات معتمدة من الأدبيات العلمية لكل تشخيص — تشمل الأساليب العلاجية وعدد الجلسات والأهداف
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>اختر التشخيص</InputLabel>
                <Select value={protocolDiagnosis} onChange={e => setProtocolDiagnosis(e.target.value)} label="اختر التشخيص">
                  {DIAGNOSES.map(d => (
                    <MenuItem key={d.value} value={d.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {d.icon} {d.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <Button variant="contained" fullWidth size="large" startIcon={<ProtocolIcon />} onClick={fetchProtocol}>
                عرض البروتوكول
              </Button>
            </Grid>
          </Grid>

          {protocol && (
            <Box>
              {protocol.name_ar && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>{protocol.name_ar}</strong>
                  {protocol.description_ar && ` — ${protocol.description_ar}`}
                </Alert>
              )}

              {/* Therapeutic Approaches */}
              {protocol.therapeutic_approaches && (
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight="bold">الأساليب العلاجية المعتمدة</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List>
                      {protocol.therapeutic_approaches.map((approach, i) => (
                        <ListItem key={i}>
                          <ListItemIcon>
                            <Chip label={i + 1} size="small" color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={approach.name || approach.name_ar || approach}
                            secondary={approach.description || approach.evidence_level}
                          />
                          {approach.evidence_level && (
                            <ListItemSecondaryAction>
                              <Chip
                                label={`مستوى الدليل: ${approach.evidence_level}`}
                                size="small"
                                color={approach.evidence_level === 'A' ? 'success' : approach.evidence_level === 'B' ? 'warning' : 'default'}
                              />
                            </ListItemSecondaryAction>
                          )}
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Session Frequency */}
              {protocol.session_frequency && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight="bold">عدد الجلسات وتكرارها</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <pre dir="ltr" style={{
                      backgroundColor: '#f5f5f5',
                      padding: 16,
                      borderRadius: 8,
                      fontSize: 13,
                    }}>
                      {JSON.stringify(protocol.session_frequency, null, 2)}
                    </pre>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Full Protocol JSON */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight="bold">البروتوكول الكامل (JSON)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <pre dir="ltr" style={{
                    backgroundColor: '#f5f5f5',
                    padding: 16,
                    borderRadius: 8,
                    fontSize: 13,
                    overflow: 'auto',
                    maxHeight: 400,
                  }}>
                    {JSON.stringify(protocol, null, 2)}
                  </pre>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </Paper>
      </TabPanel>

      {/* ══════════════════════════════════════════════════════
          TAB 5: DISCHARGE READINESS
          ══════════════════════════════════════════════════════ */}
      <TabPanel value={tabIndex} index={5}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            <DischargeIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#607d8b' }} />
            تقييم جاهزية التخريج
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            يقيّم مدى جاهزية المستفيد للخروج من البرنامج العلاجي وفقاً لمعايير سريرية محددة
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="نسبة تحقيق الأهداف (%)" type="number" id="dc-goals" defaultValue={75} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="عدد أشهر الاستقرار" type="number" id="dc-stability" defaultValue={3} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="درجة الاستقلالية (%)" type="number" id="dc-independence" defaultValue={60} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="رضا الأسرة (1-5)" type="number" id="dc-family" defaultValue={4} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="خطة الانتقال مكتملة؟ (0/1)" type="number" id="dc-plan" defaultValue={1} />
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
              <Button
                variant="contained" fullWidth size="large" startIcon={<DischargeIcon />}
                onClick={async () => {
                  const data = await apiFetch('/discharge-readiness', {
                    method: 'POST',
                    body: JSON.stringify({
                      goals_achieved_pct: parseFloat(document.getElementById('dc-goals').value),
                      stability_months: parseInt(document.getElementById('dc-stability').value),
                      independence_score: parseFloat(document.getElementById('dc-independence').value),
                      family_satisfaction: parseInt(document.getElementById('dc-family').value),
                      transition_plan_complete: !!parseInt(document.getElementById('dc-plan').value),
                    }),
                  });
                  setDischargeResult(data.data);
                }}
              >
                تقييم الجاهزية
              </Button>
            </Grid>
          </Grid>

          {dischargeResult && (
            <Box>
              <Alert
                severity={
                  dischargeResult.readiness_score >= 80 ? 'success' :
                  dischargeResult.readiness_score >= 60 ? 'warning' : 'error'
                }
                sx={{ mb: 2 }}
              >
                <Typography variant="h6">
                  درجة الجاهزية: <strong>{dischargeResult.readiness_score}%</strong>
                  {' — '}
                  {dischargeResult.recommendation_ar || dischargeResult.recommendation}
                </Typography>
              </Alert>

              {dischargeResult.criteria && (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell align="right"><strong>المعيار</strong></TableCell>
                        <TableCell align="center"><strong>القيمة</strong></TableCell>
                        <TableCell align="center"><strong>الحد الأدنى</strong></TableCell>
                        <TableCell align="center"><strong>متحقق؟</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(dischargeResult.criteria || []).map((c, i) => (
                        <TableRow key={i}>
                          <TableCell align="right">{c.name_ar || c.name}</TableCell>
                          <TableCell align="center">{c.value}</TableCell>
                          <TableCell align="center">{c.threshold}</TableCell>
                          <TableCell align="center">
                            {c.met ? <DoneIcon color="success" /> : <ErrorIcon color="error" />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight="bold">التفاصيل الكاملة</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <pre dir="ltr" style={{
                    backgroundColor: '#f5f5f5',
                    padding: 16,
                    borderRadius: 8,
                    fontSize: 13,
                    overflow: 'auto',
                  }}>
                    {JSON.stringify(dischargeResult, null, 2)}
                  </pre>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </Paper>
      </TabPanel>

      {/* ══════════════════════════════════════════════════════
          TAB 6: MANAGE ASSESSMENTS — إدارة التقييمات
          ══════════════════════════════════════════════════════ */}
      <TabPanel value={tabIndex} index={6}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            <BarChartIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#1565c0' }} />
            إدارة وعرض التقييمات المحفوظة
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>نوع التقييم</InputLabel>
                <Select value={manageType} onChange={e => setManageType(e.target.value)} label="نوع التقييم">
                  {SCALE_CATALOG.map(s => (
                    <MenuItem key={s.id} value={s.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ color: s.color }}>{s.icon}</Box>
                        {s.nameAr} ({s.name})
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained" fullWidth size="large"
                onClick={() => fetchManageList(manageType, 1)}
                disabled={loading}
              >
                عرض التقييمات
              </Button>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Chip
                label={`إجمالي: ${managePagination.total}`}
                color="primary" variant="outlined"
                sx={{ height: 56, fontSize: '1rem', px: 2 }}
              />
            </Grid>
          </Grid>

          {/* ── Assessment List ── */}
          {manageList.length > 0 && (
            <Box>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell align="right"><strong>#</strong></TableCell>
                      <TableCell align="right"><strong>المستفيد</strong></TableCell>
                      <TableCell align="center"><strong>التاريخ</strong></TableCell>
                      <TableCell align="center"><strong>الحالة</strong></TableCell>
                      <TableCell align="center"><strong>المقيّم</strong></TableCell>
                      <TableCell align="center"><strong>إجراءات</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {manageList.map((item, i) => (
                      <TableRow key={item._id} hover>
                        <TableCell align="right">
                          {(managePagination.page - 1) * 10 + i + 1}
                        </TableCell>
                        <TableCell align="right">
                          {item.beneficiary?.name || item.beneficiary?.fileNumber || item.beneficiary || '—'}
                        </TableCell>
                        <TableCell align="center">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ar-SA') : '—'}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={item.status === 'completed' ? 'مكتمل' : item.status === 'deleted' ? 'محذوف' : item.status || '—'}
                            size="small"
                            color={item.status === 'completed' ? 'success' : item.status === 'deleted' ? 'error' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {item.assessor?.name || '—'}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="عرض التفاصيل">
                            <IconButton size="small" onClick={() => fetchDetail(manageType, item._id)}>
                              <InfoIcon color="primary" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton size="small" onClick={() => handleDelete(manageType, item._id)}>
                              <ErrorIcon color="error" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* ── Pagination ── */}
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2 }}>
                <Button
                  variant="outlined" size="small"
                  disabled={!managePagination.hasPrev}
                  onClick={() => fetchManageList(manageType, managePagination.page - 1)}
                >
                  ← السابق
                </Button>
                <Typography>
                  صفحة {managePagination.page} من {managePagination.pages}
                </Typography>
                <Button
                  variant="outlined" size="small"
                  disabled={!managePagination.hasNext}
                  onClick={() => fetchManageList(manageType, managePagination.page + 1)}
                >
                  التالي →
                </Button>
              </Box>
            </Box>
          )}

          {manageList.length === 0 && managePagination.total === 0 && (
            <Alert severity="info">لا توجد تقييمات محفوظة من هذا النوع. اضغط "عرض التقييمات" لتحميل البيانات.</Alert>
          )}
        </Paper>

        {/* ── Detail Dialog ── */}
        <Dialog open={!!viewDetail} onClose={() => setViewDetail(null)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon color="primary" />
            تفاصيل التقييم
          </DialogTitle>
          <DialogContent dividers>
            {viewDetail && (
              <Box>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">المستفيد</Typography>
                    <Typography>{viewDetail.beneficiary?.name || viewDetail.beneficiary || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">التاريخ</Typography>
                    <Typography>{viewDetail.createdAt ? new Date(viewDetail.createdAt).toLocaleString('ar-SA') : '—'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">المقيّم</Typography>
                    <Typography>{viewDetail.assessor?.name || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">الحالة</Typography>
                    <Chip
                      label={viewDetail.status === 'completed' ? 'مكتمل' : viewDetail.status}
                      color={viewDetail.status === 'completed' ? 'success' : 'default'}
                      size="small"
                    />
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>البيانات الكاملة:</Typography>
                <pre dir="ltr" style={{
                  backgroundColor: '#f5f5f5', padding: 16, borderRadius: 8,
                  fontSize: 12, overflow: 'auto', maxHeight: 400,
                }}>
                  {JSON.stringify(viewDetail, null, 2)}
                </pre>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDetail(null)}>إغلاق</Button>
          </DialogActions>
        </Dialog>
      </TabPanel>
    </Container>
  );
}
