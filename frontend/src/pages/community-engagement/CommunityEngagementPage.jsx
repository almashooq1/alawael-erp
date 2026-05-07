/**
 * CommunityEngagementPage — الانخراط المجتمعي والتطوعي
 *
 * Tabs:
 *  0 — إدارة المتطوعين  → volunteerManagementAPI
 *  1 — التوعية المجتمعية → communityOutreachAPI
 *  2 — علاقات الداعمين  → donorRelationsAPI
 *  3 — برامج المناصرة   → advocacyProgramAPI
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
  VolunteerActivism as VolunteerIcon,
  Groups as OutreachIcon,
  Favorite as DonorIcon,
  Campaign as AdvocacyIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  BarChart as ChartIcon,
} from '@mui/icons-material';
import {
  volunteerManagementAPI,
  communityOutreachAPI,
  donorRelationsAPI,
  advocacyProgramAPI,
} from '../../services/ddd';

const PRIMARY = '#bf360c';
const BG = '#fbe9e7';

const fmt = d => (d ? new Date(d).toLocaleDateString('ar-SA') : '—');
const chip = (s, map) => {
  const cfg = map[s] || { label: s || '—', color: 'default' };
  return <Chip size="small" label={cfg.label} color={cfg.color} />;
};

const VOLUNTEER_STATUS = {
  active: { label: 'نشط', color: 'success' },
  inactive: { label: 'غير نشط', color: 'default' },
  pending: { label: 'قيد المراجعة', color: 'warning' },
  suspended: { label: 'معلق', color: 'error' },
};
const OUTREACH_STATUS = {
  planning: { label: 'تخطيط', color: 'info' },
  active: { label: 'نشط', color: 'success' },
  completed: { label: 'مكتمل', color: 'default' },
  cancelled: { label: 'ملغى', color: 'error' },
  postponed: { label: 'مؤجل', color: 'warning' },
};
const DONOR_STATUS = {
  active: { label: 'داعم نشط', color: 'success' },
  prospect: { label: 'مرشح', color: 'info' },
  lapsed: { label: 'انقطع', color: 'warning' },
  inactive: { label: 'غير نشط', color: 'default' },
};
const ADVOCACY_STATUS = {
  active: { label: 'نشط', color: 'success' },
  completed: { label: 'مكتمل', color: 'default' },
  paused: { label: 'موقوف', color: 'warning' },
  planning: { label: 'تخطيط', color: 'info' },
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
export default function CommunityEngagementPage() {
  const [tab, setTab] = useState(0);

  /* ── Volunteer Management ── */
  const volunteerCols = [
    {
      key: 'name',
      label: 'اسم المتطوع',
      render: r => (
        <Typography variant="body2" fontWeight="medium">
          {r.name || r.volunteerName || '—'}
        </Typography>
      ),
    },
    { key: 'specialty', label: 'التخصص / المهارة', render: r => r.specialty || r.skill || '—' },
    {
      key: 'totalHours',
      label: 'ساعات التطوع',
      render: r => (r.totalHours != null ? `${r.totalHours} س` : '—'),
    },
    { key: 'phone', label: 'الهاتف' },
    { key: 'status', label: 'الحالة', isStatus: true },
    {
      key: 'registrationDate',
      label: 'تاريخ التسجيل',
      render: r => fmt(r.registrationDate || r.createdAt),
    },
  ];
  const volunteerForm = [
    { key: 'name', label: 'اسم المتطوع *' },
    {
      key: 'specialty',
      label: 'التخصص / المهارة',
      options: [
        { value: 'occupational_therapy', label: 'علاج وظيفي' },
        { value: 'physiotherapy', label: 'علاج طبيعي' },
        { value: 'speech_therapy', label: 'علاج نطق' },
        { value: 'psychology', label: 'علم نفس' },
        { value: 'education', label: 'تعليم وتدريب' },
        { value: 'social_work', label: 'خدمة اجتماعية' },
        { value: 'it', label: 'تقنية معلومات' },
        { value: 'transportation', label: 'نقل ومواصلات' },
        { value: 'admin', label: 'إداري' },
        { value: 'other', label: 'أخرى' },
      ],
      default: 'other',
    },
    { key: 'phone', label: 'رقم الهاتف' },
    { key: 'email', label: 'البريد الإلكتروني' },
    { key: 'nationalId', label: 'رقم الهوية' },
    { key: 'availableDays', label: 'أيام التوفر', multiline: true },
    { key: 'registrationDate', label: 'تاريخ التسجيل', type: 'date' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'active', label: 'نشط' },
        { value: 'inactive', label: 'غير نشط' },
        { value: 'pending', label: 'قيد المراجعة' },
        { value: 'suspended', label: 'معلق' },
      ],
      default: 'pending',
    },
    { key: 'notes', label: 'ملاحظات', multiline: true },
  ];

  /* ── Community Outreach ── */
  const outreachCols = [
    {
      key: 'name',
      label: 'اسم البرنامج',
      render: r => (
        <Typography variant="body2" fontWeight="medium">
          {r.name || r.programName || '—'}
        </Typography>
      ),
    },
    {
      key: 'type',
      label: 'النوع',
      render: r => {
        const map = {
          awareness: 'توعية',
          education: 'تعليم',
          support: 'دعم',
          event: 'فعالية',
          training: 'تدريب',
        };
        return <Chip size="small" label={map[r.type] || r.type || '—'} variant="outlined" />;
      },
    },
    { key: 'targetAudience', label: 'الجمهور المستهدف' },
    { key: 'participantCount', label: 'المشاركون', render: r => r.participantCount ?? '—' },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'startDate', label: 'تاريخ البدء', render: r => fmt(r.startDate) },
  ];
  const outreachForm = [
    { key: 'name', label: 'اسم البرنامج *' },
    {
      key: 'type',
      label: 'نوع النشاط',
      options: [
        { value: 'awareness', label: 'حملة توعية' },
        { value: 'education', label: 'تعليم وتثقيف' },
        { value: 'support', label: 'دعم مجتمعي' },
        { value: 'event', label: 'فعالية عامة' },
        { value: 'training', label: 'تدريب وورشة' },
        { value: 'media', label: 'إعلام وتواصل' },
      ],
      default: 'awareness',
    },
    {
      key: 'targetAudience',
      label: 'الجمهور المستهدف',
      options: [
        { value: 'families', label: 'أسر ذوي الإعاقة' },
        { value: 'youth', label: 'شباب' },
        { value: 'children', label: 'أطفال' },
        { value: 'professionals', label: 'متخصصون' },
        { value: 'public', label: 'المجتمع العام' },
        { value: 'schools', label: 'مدارس' },
        { value: 'corporates', label: 'شركات' },
      ],
      default: 'families',
    },
    { key: 'venue', label: 'مكان التنفيذ' },
    { key: 'budget', label: 'الميزانية (ر.س)', type: 'number' },
    { key: 'startDate', label: 'تاريخ البدء', type: 'date' },
    { key: 'endDate', label: 'تاريخ الانتهاء', type: 'date' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'planning', label: 'تخطيط' },
        { value: 'active', label: 'نشط' },
        { value: 'completed', label: 'مكتمل' },
        { value: 'cancelled', label: 'ملغى' },
        { value: 'postponed', label: 'مؤجل' },
      ],
      default: 'planning',
    },
    { key: 'description', label: 'الوصف', multiline: true },
  ];

  /* ── Donor Relations ── */
  const donorCols = [
    {
      key: 'name',
      label: 'اسم الداعم',
      render: r => (
        <Typography variant="body2" fontWeight="medium">
          {r.name || r.donorName || '—'}
        </Typography>
      ),
    },
    {
      key: 'donorType',
      label: 'نوع الداعم',
      render: r => {
        const map = {
          individual: 'فرد',
          corporate: 'شركة',
          foundation: 'مؤسسة',
          government: 'حكومي',
          anonymous: 'مجهول',
        };
        return (
          <Chip size="small" label={map[r.donorType] || r.donorType || '—'} variant="outlined" />
        );
      },
    },
    {
      key: 'totalDonations',
      label: 'إجمالي الدعم',
      render: r =>
        r.totalDonations ? (
          <Typography variant="body2" fontWeight="bold">
            {r.totalDonations.toLocaleString()} ر.س
          </Typography>
        ) : (
          '—'
        ),
    },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'lastDonationDate', label: 'آخر تبرع', render: r => fmt(r.lastDonationDate) },
  ];
  const donorForm = [
    { key: 'name', label: 'اسم الداعم *' },
    {
      key: 'donorType',
      label: 'نوع الداعم',
      options: [
        { value: 'individual', label: 'فرد' },
        { value: 'corporate', label: 'شركة' },
        { value: 'foundation', label: 'مؤسسة خيرية' },
        { value: 'government', label: 'جهة حكومية' },
        { value: 'anonymous', label: 'مجهول' },
      ],
      default: 'individual',
    },
    { key: 'phone', label: 'رقم الهاتف' },
    { key: 'email', label: 'البريد الإلكتروني' },
    {
      key: 'preferredCommunication',
      label: 'طريقة التواصل المفضلة',
      options: [
        { value: 'phone', label: 'هاتف' },
        { value: 'email', label: 'بريد إلكتروني' },
        { value: 'whatsapp', label: 'واتساب' },
        { value: 'in_person', label: 'حضوري' },
      ],
      default: 'phone',
    },
    { key: 'donationPurpose', label: 'الغرض من الدعم / التخصص' },
    { key: 'lastDonationDate', label: 'تاريخ آخر تبرع', type: 'date' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'active', label: 'داعم نشط' },
        { value: 'prospect', label: 'مرشح' },
        { value: 'lapsed', label: 'انقطع' },
        { value: 'inactive', label: 'غير نشط' },
      ],
      default: 'prospect',
    },
    { key: 'notes', label: 'ملاحظات', multiline: true },
  ];

  /* ── Advocacy Program ── */
  const advocacyCols = [
    {
      key: 'name',
      label: 'اسم البرنامج',
      render: r => (
        <Typography variant="body2" fontWeight="medium">
          {r.name || r.programName || '—'}
        </Typography>
      ),
    },
    { key: 'cause', label: 'القضية / المحور', render: r => r.cause || r.issue || '—' },
    { key: 'targetPolicy', label: 'السياسة المستهدفة' },
    { key: 'supporterCount', label: 'المؤيدون', render: r => r.supporterCount ?? '—' },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'startDate', label: 'تاريخ البدء', render: r => fmt(r.startDate) },
  ];
  const advocacyForm = [
    { key: 'name', label: 'اسم البرنامج *' },
    {
      key: 'cause',
      label: 'القضية / المحور',
      options: [
        { value: 'inclusion', label: 'الدمج والشمول' },
        { value: 'accessibility', label: 'إمكانية الوصول' },
        { value: 'education', label: 'التعليم الشامل' },
        { value: 'employment', label: 'فرص العمل' },
        { value: 'rights', label: 'حقوق ذوي الإعاقة' },
        { value: 'healthcare', label: 'الرعاية الصحية' },
        { value: 'social_support', label: 'الدعم الاجتماعي' },
        { value: 'legislation', label: 'التشريع والأنظمة' },
      ],
      default: 'inclusion',
    },
    { key: 'targetPolicy', label: 'السياسة أو القرار المستهدف' },
    { key: 'targetAudience', label: 'الجهة المستهدفة (حكومة / منظمة / عام)' },
    {
      key: 'methodology',
      label: 'أسلوب المناصرة',
      options: [
        { value: 'media_campaign', label: 'حملة إعلامية' },
        { value: 'lobbying', label: 'ضغط سياسي' },
        { value: 'community_mobilization', label: 'تعبئة مجتمعية' },
        { value: 'legal_action', label: 'إجراء قانوني' },
        { value: 'partnerships', label: 'شراكات مؤسسية' },
        { value: 'research', label: 'بحث وأدلة' },
      ],
      default: 'community_mobilization',
    },
    { key: 'startDate', label: 'تاريخ البدء', type: 'date' },
    { key: 'targetDate', label: 'تاريخ التحقق المستهدف', type: 'date' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'planning', label: 'تخطيط' },
        { value: 'active', label: 'نشط' },
        { value: 'paused', label: 'موقوف' },
        { value: 'completed', label: 'مكتمل' },
      ],
      default: 'planning',
    },
    { key: 'description', label: 'الوصف والأهداف', multiline: true },
  ];

  const tabs = [
    {
      label: 'المتطوعون',
      icon: <VolunteerIcon />,
      color: '#c62828',
      api: volunteerManagementAPI,
      statusMap: VOLUNTEER_STATUS,
      kpis: [
        { key: 'activeCount', label: 'متطوعون نشطون', icon: <VolunteerIcon />, color: '#c62828' },
        { key: 'totalHours', label: 'إجمالي الساعات', icon: <VolunteerIcon />, color: '#e65100' },
        { key: 'pendingCount', label: 'قيد المراجعة', icon: <VolunteerIcon />, color: '#f57f17' },
      ],
      columns: volunteerCols,
      formFields: volunteerForm,
    },
    {
      label: 'التوعية المجتمعية',
      icon: <OutreachIcon />,
      color: '#0277bd',
      api: communityOutreachAPI,
      statusMap: OUTREACH_STATUS,
      kpis: [
        { key: 'activeCount', label: 'برامج نشطة', icon: <OutreachIcon />, color: '#0277bd' },
        { key: 'completedCount', label: 'مكتملة', icon: <OutreachIcon />, color: '#2e7d32' },
        {
          key: 'totalParticipants',
          label: 'إجمالي المشاركين',
          icon: <OutreachIcon />,
          color: '#6a1b9a',
        },
      ],
      columns: outreachCols,
      formFields: outreachForm,
    },
    {
      label: 'علاقات الداعمين',
      icon: <DonorIcon />,
      color: '#558b2f',
      api: donorRelationsAPI,
      statusMap: DONOR_STATUS,
      kpis: [
        { key: 'activeCount', label: 'داعمون نشطون', icon: <DonorIcon />, color: '#558b2f' },
        { key: 'prospectCount', label: 'مرشحون', icon: <DonorIcon />, color: '#0277bd' },
        {
          key: 'totalDonations',
          label: 'إجمالي الدعم (ر.س)',
          icon: <DonorIcon />,
          color: '#e65100',
        },
      ],
      columns: donorCols,
      formFields: donorForm,
    },
    {
      label: 'برامج المناصرة',
      icon: <AdvocacyIcon />,
      color: '#6a1b9a',
      api: advocacyProgramAPI,
      statusMap: ADVOCACY_STATUS,
      kpis: [
        { key: 'activeCount', label: 'برامج نشطة', icon: <AdvocacyIcon />, color: '#6a1b9a' },
        { key: 'completedCount', label: 'مكتملة', icon: <AdvocacyIcon />, color: '#2e7d32' },
        {
          key: 'totalSupporters',
          label: 'إجمالي المؤيدين',
          icon: <AdvocacyIcon />,
          color: '#c62828',
        },
      ],
      columns: advocacyCols,
      formFields: advocacyForm,
    },
  ];

  const activeTab = tabs[tab];

  return (
    <Box sx={{ p: 3, bgcolor: BG, minHeight: '100vh' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Avatar sx={{ bgcolor: PRIMARY, width: 52, height: 52 }}>
          <OutreachIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ color: PRIMARY }}>
            الانخراط المجتمعي والتطوعي
          </Typography>
          <Typography variant="body2" color="text.secondary">
            متطوعون • توعية مجتمعية • داعمون • مناصرة
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
            columns={activeTab.columns}
            formFields={activeTab.formFields}
          />
        </Box>
      </Paper>
    </Box>
  );
}
