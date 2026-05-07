/**
 * ResearchHubPage — مركز البحث العلمي والسريري
 *
 * Tabs:
 *  0 — البحث السريري المتقدم  → clinicalResearchAPI
 *  1 — التجارب السريرية       → clinicalTrialsAPI
 *  2 — بحوث النتائج           → outcomeResearchAPI
 *  3 — إدارة المنشورات        → publicationManagerAPI
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
  Biotech as ResearchIcon,
  Science as TrialIcon,
  TrendingUp as OutcomeIcon,
  Article as PublicationIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  BarChart as ChartIcon,
} from '@mui/icons-material';
import {
  clinicalResearchAPI,
  clinicalTrialsAPI,
  outcomeResearchAPI,
  publicationManagerAPI,
} from '../../services/ddd';

const PRIMARY = '#1a237e';
const BG = '#e8eaf6';

const fmt = d => (d ? new Date(d).toLocaleDateString('ar-SA') : '—');
const chip = (s, map) => {
  const cfg = map[s] || { label: s || '—', color: 'default' };
  return <Chip size="small" label={cfg.label} color={cfg.color} />;
};

const RESEARCH_STATUS = {
  active: { label: 'نشط', color: 'success' },
  completed: { label: 'مكتمل', color: 'default' },
  paused: { label: 'موقوف', color: 'warning' },
  cancelled: { label: 'ملغى', color: 'error' },
  planning: { label: 'تخطيط', color: 'info' },
};
const TRIAL_STATUS = {
  recruiting: { label: 'استقطاب', color: 'info' },
  active: { label: 'نشط', color: 'success' },
  completed: { label: 'مكتمل', color: 'default' },
  suspended: { label: 'معلق', color: 'warning' },
  terminated: { label: 'منتهي', color: 'error' },
  not_yet_recruiting: { label: 'لم يبدأ', color: 'default' },
};
const OUTCOME_STATUS = {
  planning: { label: 'تخطيط', color: 'info' },
  data_collection: { label: 'جمع بيانات', color: 'primary' },
  analysis: { label: 'تحليل', color: 'warning' },
  published: { label: 'منشور', color: 'success' },
  completed: { label: 'مكتمل', color: 'default' },
};
const PUB_STATUS = {
  draft: { label: 'مسودة', color: 'default' },
  submitted: { label: 'مقدَّم', color: 'info' },
  review: { label: 'مراجعة', color: 'warning' },
  accepted: { label: 'مقبول', color: 'primary' },
  published: { label: 'منشور', color: 'success' },
  rejected: { label: 'مرفوض', color: 'error' },
};

/* ── KPI Card ── */
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

/* ── useSection hook ── */
function useSection(api) {
  const [dashboard, setDashboard] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, list] = await Promise.allSettled([
        api.getDashboard({}),
        api.list({ limit: 50 }),
      ]);
      if (dash.status === 'fulfilled')
        setDashboard(dash.value?.data?.data || dash.value?.data || null);
      if (list.status === 'fulfilled') {
        const d = list.value?.data?.data || list.value?.data;
        setItems(Array.isArray(d) ? d : d?.items || []);
      }
      setLoaded(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api]);
  return { dashboard, items, loading, error, load, loaded };
}

/* ── Generic Section ── */
function Section({ section, color, statusMap, kpis, columns, formFields }) {
  const { dashboard, items, loading, error, load, loaded } = useSection(section.api);
  useEffect(() => {
    if (!loaded) load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [dialog, setDialog] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  const openCreate = () => {
    setEditTarget(null);
    const empty = {};
    formFields.forEach(f => {
      empty[f.key] = f.default || '';
    });
    setForm(empty);
    setDialog(true);
  };
  const openEdit = item => {
    setEditTarget(item);
    const pre = {};
    formFields.forEach(f => {
      pre[f.key] = item[f.key] ?? f.default ?? '';
    });
    setForm(pre);
    setDialog(true);
  };
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      editTarget ? await section.api.update(editTarget._id, form) : await section.api.create(form);
      setSnack({ open: true, msg: editTarget ? 'تم التحديث' : 'تم الإنشاء', severity: 'success' });
      setDialog(false);
      load();
    } catch (e) {
      setSnack({ open: true, msg: e.message, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const resolvedKpis = [
    { label: 'الإجمالي', value: dashboard?.total ?? items.length, icon: <ChartIcon />, color },
    ...kpis.map(k => ({ ...k, value: dashboard?.[k.key] ?? '—', color: k.color || color })),
  ];

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {resolvedKpis.slice(0, 4).map((k, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <KpiCard {...k} />
          </Grid>
        ))}
      </Grid>
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 1 }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{ bgcolor: color, '&:hover': { bgcolor: color, opacity: 0.85 } }}
        >
          إضافة جديد
        </Button>
        <IconButton size="small" onClick={load}>
          <RefreshIcon />
        </IconButton>
      </Stack>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: `${color}0a` }}>
              {columns.map(c => (
                <TableCell key={c.key}>{c.label}</TableCell>
              ))}
              <TableCell align="center">تعديل</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">لا توجد بيانات</Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, i) => (
                <TableRow key={item._id || i} hover>
                  {columns.map(c => (
                    <TableCell key={c.key}>
                      {c.render ? (
                        c.render(item)
                      ) : c.isStatus ? (
                        chip(item[c.key], statusMap)
                      ) : (
                        <Typography variant="body2">{item[c.key] ?? '—'}</Typography>
                      )}
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    <Tooltip title="تعديل">
                      <IconButton size="small" onClick={() => openEdit(item)}>
                        <EditIcon fontSize="small" sx={{ color }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: `${color}12`, color }}>
          {editTarget ? 'تعديل السجل' : 'إضافة سجل جديد'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            {formFields.map(f =>
              f.options ? (
                <TextField
                  key={f.key}
                  select
                  fullWidth
                  size="small"
                  label={f.label}
                  value={form[f.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                >
                  {f.options.map(o => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  key={f.key}
                  fullWidth
                  size="small"
                  label={f.label}
                  type={f.type || 'text'}
                  multiline={f.multiline}
                  rows={f.multiline ? 2 : undefined}
                  InputLabelProps={f.type === 'date' ? { shrink: true } : undefined}
                  value={form[f.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                />
              )
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={submitting}
            onClick={handleSubmit}
            sx={{ bgcolor: color, '&:hover': { bgcolor: color, opacity: 0.85 } }}
          >
            {submitting ? 'جاري...' : editTarget ? 'حفظ' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

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

/* ══════════════════════════════════════════════════════════ */
export default function ResearchHubPage() {
  const [tab, setTab] = useState(0);

  /* ── Clinical Research (Advanced) ── */
  const researchCols = [
    {
      key: 'title',
      label: 'عنوان الدراسة',
      render: r => (
        <Typography variant="body2" fontWeight="medium">
          {r.title || r.name || '—'}
        </Typography>
      ),
    },
    {
      key: 'principalInvestigator',
      label: 'الباحث الرئيسي',
      render: r => r.principalInvestigator || r.researcher || '—',
    },
    { key: 'methodology', label: 'المنهجية' },
    { key: 'participantCount', label: 'المشاركون', render: r => r.participantCount ?? '—' },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'startDate', label: 'تاريخ البدء', render: r => fmt(r.startDate) },
  ];
  const researchForm = [
    { key: 'title', label: 'عنوان الدراسة *' },
    { key: 'principalInvestigator', label: 'الباحث الرئيسي *' },
    {
      key: 'methodology',
      label: 'المنهجية',
      options: [
        { value: 'rct', label: 'تجربة عشوائية محكومة (RCT)' },
        { value: 'cohort', label: 'دراسة أتراب (Cohort)' },
        { value: 'case_control', label: 'حالة وشاهد (Case-Control)' },
        { value: 'cross_sectional', label: 'مقطعية (Cross-Sectional)' },
        { value: 'qualitative', label: 'نوعية (Qualitative)' },
        { value: 'systematic_review', label: 'مراجعة منهجية' },
        { value: 'pilot', label: 'تجريبية (Pilot)' },
      ],
      default: 'rct',
    },
    { key: 'department', label: 'القسم / التخصص' },
    { key: 'fundingSource', label: 'مصدر التمويل' },
    { key: 'ethicsApproval', label: 'رقم موافقة أخلاقيات البحث' },
    { key: 'startDate', label: 'تاريخ البدء', type: 'date' },
    { key: 'endDate', label: 'تاريخ الانتهاء المتوقع', type: 'date' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'planning', label: 'تخطيط' },
        { value: 'active', label: 'نشط' },
        { value: 'paused', label: 'موقوف' },
        { value: 'completed', label: 'مكتمل' },
        { value: 'cancelled', label: 'ملغى' },
      ],
      default: 'planning',
    },
    { key: 'description', label: 'الوصف', multiline: true },
  ];

  /* ── Clinical Trials ── */
  const trialCols = [
    {
      key: 'title',
      label: 'اسم التجربة',
      render: r => (
        <Typography variant="body2" fontWeight="medium">
          {r.title || r.name || '—'}
        </Typography>
      ),
    },
    {
      key: 'phase',
      label: 'المرحلة',
      render: r => <Chip size="small" label={r.phase || '—'} variant="outlined" />,
    },
    { key: 'sponsor', label: 'الراعي' },
    { key: 'enrolledCount', label: 'المسجلون', render: r => r.enrolledCount ?? '—' },
    { key: 'targetEnrollment', label: 'الهدف', render: r => r.targetEnrollment ?? '—' },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'startDate', label: 'البدء', render: r => fmt(r.startDate) },
  ];
  const trialForm = [
    { key: 'title', label: 'عنوان التجربة *' },
    {
      key: 'phase',
      label: 'المرحلة',
      options: [
        { value: 'Phase I', label: 'المرحلة الأولى (I)' },
        { value: 'Phase II', label: 'المرحلة الثانية (II)' },
        { value: 'Phase III', label: 'المرحلة الثالثة (III)' },
        { value: 'Phase IV', label: 'المرحلة الرابعة (IV)' },
        { value: 'Pilot', label: 'تجريبية' },
        { value: 'N/A', label: 'غير مطبق' },
      ],
      default: 'Phase II',
    },
    { key: 'sponsor', label: 'الراعي / الجهة الممولة' },
    { key: 'targetEnrollment', label: 'الهدف من المشاركين', type: 'number' },
    { key: 'registrationNumber', label: 'رقم تسجيل التجربة (ISRCTN/ClinicalTrials.gov)' },
    { key: 'primaryEndpoint', label: 'المخرج الأولي الرئيسي' },
    { key: 'startDate', label: 'تاريخ البدء', type: 'date' },
    { key: 'expectedEndDate', label: 'تاريخ الانتهاء المتوقع', type: 'date' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'not_yet_recruiting', label: 'لم يبدأ الاستقطاب' },
        { value: 'recruiting', label: 'استقطاب جارٍ' },
        { value: 'active', label: 'نشط' },
        { value: 'completed', label: 'مكتمل' },
        { value: 'suspended', label: 'معلق' },
        { value: 'terminated', label: 'منتهي' },
      ],
      default: 'not_yet_recruiting',
    },
    { key: 'description', label: 'الوصف', multiline: true },
  ];

  /* ── Outcome Research ── */
  const outcomeCols = [
    {
      key: 'title',
      label: 'عنوان الدراسة',
      render: r => (
        <Typography variant="body2" fontWeight="medium">
          {r.title || r.name || '—'}
        </Typography>
      ),
    },
    { key: 'outcomeMeasure', label: 'مقياس النتائج' },
    { key: 'sampleSize', label: 'حجم العينة', render: r => r.sampleSize ?? '—' },
    {
      key: 'result',
      label: 'النتيجة',
      render: r =>
        r.result ? (
          <Typography
            variant="body2"
            sx={{
              maxWidth: 150,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {r.result}
          </Typography>
        ) : (
          '—'
        ),
    },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'completionDate', label: 'تاريخ الاكتمال', render: r => fmt(r.completionDate) },
  ];
  const outcomeForm = [
    { key: 'title', label: 'عنوان الدراسة *' },
    { key: 'outcomeMeasure', label: 'مقياس النتائج الأساسي' },
    { key: 'sampleSize', label: 'حجم العينة', type: 'number' },
    { key: 'researchQuestion', label: 'سؤال البحث' },
    {
      key: 'populationType',
      label: 'نوع المجتمع',
      options: [
        { value: 'children', label: 'أطفال' },
        { value: 'adults', label: 'بالغون' },
        { value: 'elderly', label: 'كبار السن' },
        { value: 'all_ages', label: 'جميع الأعمار' },
        { value: 'specific_diagnosis', label: 'تشخيص محدد' },
      ],
      default: 'all_ages',
    },
    {
      key: 'dataCollectionMethod',
      label: 'أسلوب جمع البيانات',
      options: [
        { value: 'survey', label: 'استبيان' },
        { value: 'observation', label: 'ملاحظة مباشرة' },
        { value: 'records_review', label: 'مراجعة سجلات' },
        { value: 'interview', label: 'مقابلة' },
        { value: 'standardized_test', label: 'اختبار معياري' },
      ],
      default: 'records_review',
    },
    { key: 'startDate', label: 'تاريخ البدء', type: 'date' },
    { key: 'completionDate', label: 'تاريخ الاكتمال', type: 'date' },
    { key: 'result', label: 'النتائج الرئيسية', multiline: true },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'planning', label: 'تخطيط' },
        { value: 'data_collection', label: 'جمع بيانات' },
        { value: 'analysis', label: 'تحليل' },
        { value: 'completed', label: 'مكتمل' },
        { value: 'published', label: 'منشور' },
      ],
      default: 'planning',
    },
  ];

  /* ── Publication Manager ── */
  const pubCols = [
    {
      key: 'title',
      label: 'عنوان المنشور',
      render: r => (
        <Typography variant="body2" fontWeight="medium">
          {r.title || r.name || '—'}
        </Typography>
      ),
    },
    { key: 'journal', label: 'المجلة / المؤتمر' },
    {
      key: 'authors',
      label: 'المؤلفون',
      render: r => {
        const a = Array.isArray(r.authors) ? r.authors.join('، ') : r.authorName || '—';
        return (
          <Typography
            variant="body2"
            sx={{
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {a}
          </Typography>
        );
      },
    },
    { key: 'publicationType', label: 'النوع' },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'publicationDate', label: 'تاريخ النشر', render: r => fmt(r.publicationDate) },
  ];
  const pubForm = [
    { key: 'title', label: 'عنوان المنشور *' },
    {
      key: 'publicationType',
      label: 'نوع المنشور',
      options: [
        { value: 'journal_article', label: 'مقالة علمية' },
        { value: 'conference_paper', label: 'ورقة مؤتمر' },
        { value: 'book_chapter', label: 'فصل في كتاب' },
        { value: 'thesis', label: 'رسالة علمية' },
        { value: 'report', label: 'تقرير بحثي' },
        { value: 'poster', label: 'ملصق علمي' },
        { value: 'preprint', label: 'Preprint' },
      ],
      default: 'journal_article',
    },
    { key: 'journal', label: 'اسم المجلة / المؤتمر' },
    { key: 'impactFactor', label: 'معامل التأثير (Impact Factor)', type: 'number' },
    { key: 'doi', label: 'DOI / ISBN' },
    { key: 'authorName', label: 'أسماء المؤلفين (مفصولة بفاصلة)' },
    { key: 'abstractText', label: 'الملخص', multiline: true },
    { key: 'submissionDate', label: 'تاريخ التقديم', type: 'date' },
    { key: 'publicationDate', label: 'تاريخ النشر', type: 'date' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'draft', label: 'مسودة' },
        { value: 'submitted', label: 'مقدَّم' },
        { value: 'review', label: 'تحت المراجعة' },
        { value: 'accepted', label: 'مقبول' },
        { value: 'published', label: 'منشور' },
        { value: 'rejected', label: 'مرفوض' },
      ],
      default: 'draft',
    },
  ];

  const tabs = [
    {
      label: 'البحث السريري',
      icon: <ResearchIcon />,
      color: '#1565c0',
      api: clinicalResearchAPI,
      statusMap: RESEARCH_STATUS,
      kpis: [
        { key: 'activeCount', label: 'أبحاث نشطة', icon: <ResearchIcon />, color: '#1565c0' },
        { key: 'completedCount', label: 'مكتملة', icon: <ResearchIcon />, color: '#2e7d32' },
        {
          key: 'totalParticipants',
          label: 'إجمالي المشاركين',
          icon: <ResearchIcon />,
          color: '#6a1b9a',
        },
      ],
      columns: researchCols,
      formFields: researchForm,
    },
    {
      label: 'التجارب السريرية',
      icon: <TrialIcon />,
      color: '#6a1b9a',
      api: clinicalTrialsAPI,
      statusMap: TRIAL_STATUS,
      kpis: [
        { key: 'recruitingCount', label: 'استقطاب جارٍ', icon: <TrialIcon />, color: '#0288d1' },
        { key: 'activeCount', label: 'نشطة', icon: <TrialIcon />, color: '#6a1b9a' },
        { key: 'completedCount', label: 'مكتملة', icon: <TrialIcon />, color: '#2e7d32' },
      ],
      columns: trialCols,
      formFields: trialForm,
    },
    {
      label: 'بحوث النتائج',
      icon: <OutcomeIcon />,
      color: '#2e7d32',
      api: outcomeResearchAPI,
      statusMap: OUTCOME_STATUS,
      kpis: [
        { key: 'publishedCount', label: 'منشورة', icon: <OutcomeIcon />, color: '#2e7d32' },
        { key: 'analysisCount', label: 'تحليل جارٍ', icon: <OutcomeIcon />, color: '#f57f17' },
        { key: 'planningCount', label: 'في التخطيط', icon: <OutcomeIcon />, color: '#0288d1' },
      ],
      columns: outcomeCols,
      formFields: outcomeForm,
    },
    {
      label: 'إدارة المنشورات',
      icon: <PublicationIcon />,
      color: '#e65100',
      api: publicationManagerAPI,
      statusMap: PUB_STATUS,
      kpis: [
        { key: 'publishedCount', label: 'منشورات', icon: <PublicationIcon />, color: '#e65100' },
        { key: 'submittedCount', label: 'مقدَّمة', icon: <PublicationIcon />, color: '#0288d1' },
        { key: 'reviewCount', label: 'تحت المراجعة', icon: <PublicationIcon />, color: '#f57f17' },
      ],
      columns: pubCols,
      formFields: pubForm,
    },
  ];

  const activeTab = tabs[tab];

  return (
    <Box sx={{ p: 3, bgcolor: BG, minHeight: '100vh' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Avatar sx={{ bgcolor: PRIMARY, width: 52, height: 52 }}>
          <ResearchIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ color: PRIMARY }}>
            مركز البحث العلمي والسريري
          </Typography>
          <Typography variant="body2" color="text.secondary">
            بحث سريري • تجارب • بحوث نتائج • منشورات
          </Typography>
        </Box>
      </Stack>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: `2px solid ${activeTab.color}` }}
        >
          {tabs.map((t, i) => (
            <Tab
              key={i}
              label={t.label}
              icon={t.icon}
              iconPosition="start"
              sx={{
                minHeight: 56,
                '&.Mui-selected': { color: t.color, fontWeight: 'bold' },
              }}
            />
          ))}
        </Tabs>
        <Box sx={{ p: 2 }}>
          <Section
            key={tab}
            section={activeTab}
            color={activeTab.color}
            statusMap={activeTab.statusMap}
            kpis={activeTab.kpis}
            columns={activeTab.columns || []}
            formFields={activeTab.formFields || []}
          />
        </Box>
      </Paper>
    </Box>
  );
}
