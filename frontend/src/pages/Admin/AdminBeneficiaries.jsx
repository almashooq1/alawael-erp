/**
 * AdminBeneficiaries — /admin/beneficiaries page.
 *
 * Manage the beneficiary roster: list, filter, create, edit, view 360.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Stack,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Paper,
  Alert,
  Avatar,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArchiveIcon from '@mui/icons-material/Archive';
import api from '../../services/api.client';

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'active', label: 'نشط', color: 'success' },
  { value: 'enrolled', label: 'مُسجَّل', color: 'primary' },
  { value: 'waiting', label: 'قائمة انتظار', color: 'warning' },
  { value: 'discharged', label: 'تمت المغادرة', color: 'default' },
  { value: 'inactive', label: 'متوقف', color: 'default' },
  { value: 'transferred', label: 'محوَّل', color: 'info' },
];

const DISABILITY_OPTIONS = [
  { value: '', label: 'كل الأنواع' },
  { value: 'autism', label: 'اضطراب طيف التوحد' },
  { value: 'intellectual', label: 'إعاقة ذهنية' },
  { value: 'down_syndrome', label: 'متلازمة داون' },
  { value: 'cerebral_palsy', label: 'الشلل الدماغي' },
  { value: 'learning_disability', label: 'صعوبات تعلّم' },
  { value: 'adhd', label: 'فرط الحركة وتشتت الانتباه' },
  { value: 'developmental_delay', label: 'تأخّر نمو' },
  { value: 'multiple', label: 'إعاقات متعددة' },
];

const STATUS_COLORS = STATUS_OPTIONS.reduce(
  (a, o) => ({ ...a, [o.value]: o.color || 'default' }),
  {}
);

const EMPTY = {
  firstName: '',
  lastName: '',
  firstName_ar: '',
  lastName_ar: '',
  nationalId: '',
  dateOfBirth: '',
  gender: 'male',
  status: 'enrolled',
  contact: { primaryPhone: '', secondaryPhone: '', email: '' },
  disability: { primaryType: '', severity: 'moderate', diagnosisDate: '' },
  address: { city: 'الرياض', district: '', street: '' },
};

function getAge(dob) {
  if (!dob) return '—';
  const ms = Date.now() - new Date(dob).getTime();
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
}

export default function AdminBeneficiaries() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ q: '', status: '', gender: '', disabilityType: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/admin/beneficiaries', {
          params: {
            q: filters.q || undefined,
            status: filters.status || undefined,
            gender: filters.gender || undefined,
            disabilityType: filters.disabilityType || undefined,
            page: pagination.page,
            limit: pagination.limit,
          },
        }),
        api.get('/admin/beneficiaries/stats').catch(() => ({ data: null })),
      ]);
      setItems(listRes.data?.items || []);
      setPagination(p => ({ ...p, ...(listRes.data?.pagination || {}) }));
      if (statsRes.data) setStats(statsRes.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'تعذّر تحميل المستفيدين');
    } finally {
      setLoading(false);
    }
  }, [
    filters.q,
    filters.status,
    filters.gender,
    filters.disabilityType,
    pagination.page,
    pagination.limit,
  ]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY);
    setDialogOpen(true);
  };
  const openEdit = row => {
    setEditId(row._id);
    setForm({
      ...EMPTY,
      ...row,
      contact: { ...EMPTY.contact, ...(row.contact || {}) },
      disability: { ...EMPTY.disability, ...(row.disability || {}) },
      address: { ...EMPTY.address, ...(row.address || {}) },
      dateOfBirth: row.dateOfBirth ? String(row.dateOfBirth).slice(0, 10) : '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editId) await api.patch(`/admin/beneficiaries/${editId}`, form);
      else await api.post('/admin/beneficiaries', form);
      setDialogOpen(false);
      await fetchAll();
    } catch (err) {
      setError(err?.response?.data?.message || 'تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async id => {
    if (!window.confirm('أرشفة هذا المستفيد؟ (قابل للاسترجاع لاحقاً)')) return;
    try {
      await api.delete(`/admin/beneficiaries/${id}`);
      await fetchAll();
    } catch (err) {
      setError(err?.response?.data?.message || 'تعذّر الأرشفة');
    }
  };

  const summaryCards = [
    { label: 'إجمالي المستفيدين', value: stats?.total ?? '—', color: '#0ea5e9' },
    { label: 'آخر 30 يوم', value: stats?.last30days ?? '—', color: '#10b981' },
    { label: 'نشط', value: stats?.byStatus?.active ?? 0, color: '#059669' },
    { label: 'قائمة انتظار', value: stats?.byStatus?.waiting ?? 0, color: '#f59e0b' },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            إدارة المستفيدين
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ملف كامل لكل مستفيد — تقييمات، خطط تأهيل، جلسات، تقارير
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchAll} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            تسجيل مستفيد جديد
          </Button>
        </Stack>
      </Stack>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryCards.map(c => (
          <Grid item xs={6} md={3} key={c.label}>
            <Card sx={{ borderRadius: 3, borderTop: `4px solid ${c.color}` }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  {c.label}
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {typeof c.value === 'number' ? c.value.toLocaleString('ar-SA') : c.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 2, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="بحث (اسم/هوية/رقم مستفيد/جوال)"
                value={filters.q}
                onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && fetchAll()}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>الحالة</InputLabel>
                <Select
                  label="الحالة"
                  value={filters.status}
                  onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>الجنس</InputLabel>
                <Select
                  label="الجنس"
                  value={filters.gender}
                  onChange={e => setFilters(f => ({ ...f, gender: e.target.value }))}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="male">ذكر</MenuItem>
                  <MenuItem value="female">أنثى</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={8} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الإعاقة</InputLabel>
                <Select
                  label="نوع الإعاقة"
                  value={filters.disabilityType}
                  onChange={e => setFilters(f => ({ ...f, disabilityType: e.target.value }))}
                >
                  {DISABILITY_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4} md={2}>
              <Button fullWidth variant="contained" onClick={fetchAll} disabled={loading}>
                تطبيق
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      <Card sx={{ borderRadius: 3 }}>
        <TableContainer component={Paper} elevation={0}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                <TableCell>المستفيد</TableCell>
                <TableCell>العمر</TableCell>
                <TableCell>الجنس</TableCell>
                <TableCell>التشخيص</TableCell>
                <TableCell>الجوال</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              )}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      لا يوجد مستفيدون.{' '}
                      <Button size="small" onClick={openCreate}>
                        تسجيل أول مستفيد
                      </Button>
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {items.map(row => {
                const name = row.firstName_ar
                  ? `${row.firstName_ar} ${row.lastName_ar || ''}`
                  : `${row.firstName || ''} ${row.lastName || ''}`;
                const disability = DISABILITY_OPTIONS.find(
                  d => d.value === row.disability?.primaryType
                );
                return (
                  <TableRow key={row._id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: row.gender === 'female' ? 'pink.100' : 'primary.100',
                          }}
                        >
                          {(name || '?').charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={600}>{name || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary" dir="ltr">
                            {row.beneficiaryNumber || row.nationalId || row._id?.slice(-8)}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{getAge(row.dateOfBirth)} سنة</TableCell>
                    <TableCell>
                      {row.gender === 'female' ? 'أنثى' : row.gender === 'male' ? 'ذكر' : '—'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{disability?.label || '—'}</Typography>
                    </TableCell>
                    <TableCell dir="ltr">{row.contact?.primaryPhone || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          STATUS_OPTIONS.find(o => o.value === row.status)?.label || row.status
                        }
                        color={STATUS_COLORS[row.status] || 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="عرض ملف 360">
                        <IconButton size="small" onClick={() => setDetail(row)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => openEdit(row)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="أرشفة">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleArchive(row._id)}
                        >
                          <ArchiveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            إجمالي: {(pagination.total || 0).toLocaleString('ar-SA')}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              disabled={pagination.page <= 1 || loading}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            >
              السابق
            </Button>
            <Typography variant="body2">
              {pagination.page} / {pagination.pages || 1}
            </Typography>
            <Button
              size="small"
              disabled={pagination.page >= pagination.pages || loading}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            >
              التالي
            </Button>
          </Stack>
        </Box>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="md"
        dir="rtl"
      >
        <DialogTitle>{editId ? 'تعديل مستفيد' : 'تسجيل مستفيد جديد'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="الاسم الأول (عربي)"
                required
                value={form.firstName_ar}
                onChange={e =>
                  setForm({
                    ...form,
                    firstName_ar: e.target.value,
                    firstName: form.firstName || e.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="اسم العائلة (عربي)"
                required
                value={form.lastName_ar}
                onChange={e =>
                  setForm({
                    ...form,
                    lastName_ar: e.target.value,
                    lastName: form.lastName || e.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="First Name (EN)"
                dir="ltr"
                value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="Last Name (EN)"
                dir="ltr"
                value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="رقم الهوية"
                dir="ltr"
                value={form.nationalId}
                onChange={e => setForm({ ...form, nationalId: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="تاريخ الميلاد"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={form.dateOfBirth}
                onChange={e => setForm({ ...form, dateOfBirth: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>الجنس</InputLabel>
                <Select
                  label="الجنس"
                  value={form.gender}
                  onChange={e => setForm({ ...form, gender: e.target.value })}
                >
                  <MenuItem value="male">ذكر</MenuItem>
                  <MenuItem value="female">أنثى</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>الحالة</InputLabel>
                <Select
                  label="الحالة"
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                >
                  {STATUS_OPTIONS.filter(o => o.value).map(o => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="overline" color="text.secondary">
                التواصل
              </Typography>
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="الجوال الأساسي"
                dir="ltr"
                required
                value={form.contact?.primaryPhone || ''}
                onChange={e =>
                  setForm({ ...form, contact: { ...form.contact, primaryPhone: e.target.value } })
                }
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="جوال بديل"
                dir="ltr"
                value={form.contact?.secondaryPhone || ''}
                onChange={e =>
                  setForm({ ...form, contact: { ...form.contact, secondaryPhone: e.target.value } })
                }
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="البريد"
                dir="ltr"
                value={form.contact?.email || ''}
                onChange={e =>
                  setForm({ ...form, contact: { ...form.contact, email: e.target.value } })
                }
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="overline" color="text.secondary">
                التشخيص
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الإعاقة الرئيسي</InputLabel>
                <Select
                  label="نوع الإعاقة الرئيسي"
                  value={form.disability?.primaryType || ''}
                  onChange={e =>
                    setForm({
                      ...form,
                      disability: { ...form.disability, primaryType: e.target.value },
                    })
                  }
                >
                  {DISABILITY_OPTIONS.filter(o => o.value).map(o => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>الشدة</InputLabel>
                <Select
                  label="الشدة"
                  value={form.disability?.severity || 'moderate'}
                  onChange={e =>
                    setForm({
                      ...form,
                      disability: { ...form.disability, severity: e.target.value },
                    })
                  }
                >
                  <MenuItem value="mild">خفيفة</MenuItem>
                  <MenuItem value="moderate">متوسطة</MenuItem>
                  <MenuItem value="severe">شديدة</MenuItem>
                  <MenuItem value="profound">عميقة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="تاريخ التشخيص"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={
                  form.disability?.diagnosisDate
                    ? String(form.disability.diagnosisDate).slice(0, 10)
                    : ''
                }
                onChange={e =>
                  setForm({
                    ...form,
                    disability: { ...form.disability, diagnosisDate: e.target.value },
                  })
                }
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="overline" color="text.secondary">
                العنوان
              </Typography>
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="المدينة"
                value={form.address?.city || ''}
                onChange={e =>
                  setForm({ ...form, address: { ...form.address, city: e.target.value } })
                }
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="الحي"
                value={form.address?.district || ''}
                onChange={e =>
                  setForm({ ...form, address: { ...form.address, district: e.target.value } })
                }
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="الشارع"
                value={form.address?.street || ''}
                onChange={e =>
                  setForm({ ...form, address: { ...form.address, street: e.target.value } })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'جارٍ الحفظ...' : editId ? 'حفظ التعديلات' : 'تسجيل المستفيد'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 360 View Dialog */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} fullWidth maxWidth="md" dir="rtl">
        <DialogTitle>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.100', fontSize: 24 }}>
              {(detail?.firstName_ar || detail?.firstName || '?').charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {detail?.firstName_ar || detail?.firstName}{' '}
                {detail?.lastName_ar || detail?.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary" dir="ltr">
                {detail?.beneficiaryNumber || detail?.nationalId}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Grid container spacing={3}>
              <Grid item xs={6} sm={3}>
                <Mini label="العمر" value={`${getAge(detail.dateOfBirth)} سنة`} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Mini label="الجنس" value={detail.gender === 'female' ? 'أنثى' : 'ذكر'} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Mini
                  label="الحالة"
                  value={STATUS_OPTIONS.find(o => o.value === detail.status)?.label || '—'}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Mini
                  label="التشخيص"
                  value={
                    DISABILITY_OPTIONS.find(d => d.value === detail.disability?.primaryType)
                      ?.label || '—'
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Mini label="الجوال" value={detail.contact?.primaryPhone || '—'} dir="ltr" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Mini label="البريد" value={detail.contact?.email || '—'} dir="ltr" />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  الأقسام المتاحة
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {[
                    'التقييمات',
                    'خطة IEP',
                    'الجلسات',
                    'الحضور',
                    'التقارير',
                    'المالية',
                    'الأهل',
                    'الوثائق',
                  ].map(t => (
                    <Chip key={t} label={t} variant="outlined" size="small" />
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary" mt={1} display="block">
                  (سيتم ربطها بالـ endpoints الخاصة في مراحل التطوير القادمة)
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button component={Link} to={`/beneficiaries/${detail?._id || ''}`} variant="outlined">
            الملف الكامل
          </Button>
          <Button onClick={() => setDetail(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

function Mini({ label, value, dir }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1" fontWeight={500} dir={dir}>
        {value}
      </Typography>
    </Box>
  );
}
