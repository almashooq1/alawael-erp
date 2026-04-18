/**
 * AdminBranches — /admin/branches page.
 *
 * Manage the network of Alawael branches + HQ. Lists branches with filter,
 * supports create/edit/deactivate via a dialog.
 */

import { useCallback, useEffect, useState } from 'react';
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
  Switch,
  FormControlLabel,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StoreMallDirectoryIcon from '@mui/icons-material/StoreMallDirectory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import api from '../../services/api.client';

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'active', label: 'نشط', color: 'success' },
  { value: 'inactive', label: 'متوقف', color: 'default' },
  { value: 'maintenance', label: 'قيد الصيانة', color: 'warning' },
  { value: 'opening_soon', label: 'قريباً', color: 'info' },
];
const TYPE_OPTIONS = [
  { value: '', label: 'كل الأنواع' },
  { value: 'hq', label: 'المقر الرئيسي' },
  { value: 'main', label: 'فرع رئيسي' },
  { value: 'branch', label: 'فرع' },
  { value: 'satellite', label: 'فرع فرعي' },
];
const REGION_OPTIONS = [
  { value: '', label: 'كل المناطق' },
  { value: 'riyadh', label: 'الرياض' },
  { value: 'makkah', label: 'مكة' },
  { value: 'eastern', label: 'الشرقية' },
  { value: 'madinah', label: 'المدينة' },
  { value: 'qassim', label: 'القصيم' },
  { value: 'hail', label: 'حائل' },
  { value: 'aseer', label: 'عسير' },
  { value: 'tabuk', label: 'تبوك' },
];

const STATUS_COLORS = STATUS_OPTIONS.reduce(
  (a, o) => ({ ...a, [o.value]: o.color || 'default' }),
  {}
);

const EMPTY_FORM = {
  code: '',
  name_ar: '',
  name_en: '',
  short_name: '',
  type: 'branch',
  status: 'active',
  is_hq: false,
  phone: '',
  mobile: '',
  email: '',
  whatsapp: '',
  location: { city_ar: '', address_ar: '', region: 'riyadh' },
  capacity: { total_rooms: 0, therapy_rooms: 0, max_daily_sessions: 0, max_patients: 0 },
  settings: { allow_online_booking: true, has_transport: true },
  balady_license_number: '',
  wasel_short_code: '',
};

export default function AdminBranches() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ q: '', status: '', type: '', region: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/branches', {
          params: {
            q: filters.q || undefined,
            status: filters.status || undefined,
            type: filters.type || undefined,
            region: filters.region || undefined,
            limit: 200,
          },
        }),
        api.get('/branches/stats').catch(() => ({ data: null })),
      ]);
      setItems(listRes.data?.items || []);
      if (statsRes.data) setStats(statsRes.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'تعذّر تحميل الفروع');
    } finally {
      setLoading(false);
    }
  }, [filters.q, filters.status, filters.type, filters.region]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };
  const openEdit = branch => {
    setEditId(branch._id);
    setForm({
      ...EMPTY_FORM,
      ...branch,
      location: { ...EMPTY_FORM.location, ...(branch.location || {}) },
      capacity: { ...EMPTY_FORM.capacity, ...(branch.capacity || {}) },
      settings: { ...EMPTY_FORM.settings, ...(branch.settings || {}) },
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editId) {
        await api.patch(`/branches/${editId}`, form);
      } else {
        await api.post('/branches', form);
      }
      setDialogOpen(false);
      await fetchAll();
    } catch (err) {
      setError(err?.response?.data?.message || 'تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const [verifyingBranch, setVerifyingBranch] = useState({});
  const verifyBranch = async (branch, kind) => {
    const key = `${branch._id}:${kind}`;
    setVerifyingBranch(v => ({ ...v, [key]: true }));
    try {
      const path = kind === 'balady' ? 'verify-balady' : 'verify-wasel';
      await api.post(`/admin/branch-compliance/${branch._id}/${path}`, {});
      await fetchAll();
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل التحقق');
    } finally {
      setVerifyingBranch(v => ({ ...v, [key]: false }));
    }
  };

  const handleDeactivate = async id => {
    if (!window.confirm('تعطيل هذا الفرع؟ (soft delete — يمكن إعادة تفعيله لاحقاً)')) return;
    try {
      await api.delete(`/branches/${id}`);
      await fetchAll();
    } catch (err) {
      setError(err?.response?.data?.message || 'تعذّر التعطيل');
    }
  };

  const summaryCards = [
    { label: 'إجمالي الفروع', value: stats?.total ?? '—', color: '#0ea5e9' },
    { label: 'نشط', value: stats?.byStatus?.active ?? '—', color: '#10b981' },
    { label: 'المقر الرئيسي', value: stats?.byType?.hq ?? 0, color: '#f59e0b' },
    { label: 'قيد الصيانة', value: stats?.byStatus?.maintenance ?? 0, color: '#ef4444' },
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
            إدارة الفروع
          </Typography>
          <Typography variant="body2" color="text.secondary">
            شبكة مراكز الأوائل — HQ + فروع منطقة الرياض وباقي المناطق
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchAll} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            فرع جديد
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
                label="بحث (اسم / رمز)"
                value={filters.q}
                onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && fetchAll()}
              />
            </Grid>
            {[
              { key: 'status', label: 'الحالة', options: STATUS_OPTIONS },
              { key: 'type', label: 'النوع', options: TYPE_OPTIONS },
              { key: 'region', label: 'المنطقة', options: REGION_OPTIONS },
            ].map(f => (
              <Grid item xs={4} md={2} key={f.key}>
                <FormControl fullWidth size="small">
                  <InputLabel>{f.label}</InputLabel>
                  <Select
                    label={f.label}
                    value={filters[f.key]}
                    onChange={e => setFilters(x => ({ ...x, [f.key]: e.target.value }))}
                  >
                    {f.options.map(o => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            ))}
            <Grid item xs={12} md={2}>
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
                <TableCell>الرمز</TableCell>
                <TableCell>الاسم</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>المنطقة</TableCell>
                <TableCell>السعة</TableCell>
                <TableCell>الموظفون</TableCell>
                <TableCell>الامتثال</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              )}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      لا توجد فروع مطابقة.{' '}
                      <Button size="small" onClick={openCreate}>
                        إضافة أول فرع
                      </Button>
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {items.map(row => (
                <TableRow key={row._id} hover>
                  <TableCell>
                    <code style={{ direction: 'ltr' }}>{row.code}</code>
                    {row.is_hq && <Chip size="small" label="HQ" color="warning" sx={{ ml: 1 }} />}
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600}>{row.name_ar}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.name_en}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={TYPE_OPTIONS.find(t => t.value === row.type)?.label || row.type}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={STATUS_OPTIONS.find(s => s.value === row.status)?.label || row.status}
                      color={STATUS_COLORS[row.status] || 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {row.location?.region && (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <LocationOnIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {REGION_OPTIONS.find(r => r.value === row.location.region)?.label ||
                            row.location.region}
                        </Typography>
                      </Stack>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {row.capacity?.total_rooms || 0} غرفة · {row.capacity?.max_patients || 0}{' '}
                      مستفيد
                    </Typography>
                  </TableCell>
                  <TableCell>{row.staff_count || 0}</TableCell>
                  <TableCell>
                    <Stack direction="column" spacing={0.3}>
                      {row.balady_verification?.verified ? (
                        <Chip
                          size="small"
                          icon={
                            row.balady_verification.status === 'active' ? (
                              <VerifiedIcon fontSize="small" />
                            ) : (
                              <WarningAmberIcon fontSize="small" />
                            )
                          }
                          label={`بلدي: ${
                            {
                              active: 'نشط',
                              expired: 'منتهٍ',
                              suspended: 'موقوف',
                              not_found: 'غير موجود',
                              unknown: '—',
                            }[row.balady_verification.status] || row.balady_verification.status
                          }`}
                          color={
                            row.balady_verification.status === 'active'
                              ? 'success'
                              : row.balady_verification.status === 'expired' ||
                                  row.balady_verification.status === 'suspended'
                                ? 'error'
                                : 'default'
                          }
                          sx={{ fontSize: 10 }}
                        />
                      ) : row.balady_license_number ? (
                        <Chip
                          size="small"
                          label="بلدي: لم يُفحَص"
                          variant="outlined"
                          sx={{ fontSize: 10 }}
                        />
                      ) : null}
                      {row.wasel_verification?.verified ? (
                        <Chip
                          size="small"
                          icon={<VerifiedIcon fontSize="small" />}
                          label={`واصل: ${
                            {
                              match: 'مُتطابق',
                              not_found: 'غير موجود',
                              invalid_format: 'تنسيق',
                              unknown: '—',
                            }[row.wasel_verification.status] || row.wasel_verification.status
                          }`}
                          color={row.wasel_verification.status === 'match' ? 'success' : 'default'}
                          sx={{ fontSize: 10 }}
                        />
                      ) : row.wasel_short_code ? (
                        <Chip
                          size="small"
                          label="واصل: لم يُفحَص"
                          variant="outlined"
                          sx={{ fontSize: 10 }}
                        />
                      ) : null}
                      {!row.balady_license_number && !row.wasel_short_code && (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    {row.balady_license_number && (
                      <Tooltip title="تحقق من الترخيص البلدي">
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => verifyBranch(row, 'balady')}
                            disabled={verifyingBranch[`${row._id}:balady`]}
                          >
                            {verifyingBranch[`${row._id}:balady`] ? (
                              <CircularProgress size={14} />
                            ) : (
                              <StoreMallDirectoryIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {row.wasel_short_code && (
                      <Tooltip title="تحقق من العنوان الوطني">
                        <span>
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => verifyBranch(row, 'wasel')}
                            disabled={verifyingBranch[`${row._id}:wasel`]}
                          >
                            {verifyingBranch[`${row._id}:wasel`] ? (
                              <CircularProgress size={14} />
                            ) : (
                              <LocalShippingIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    <Tooltip title="تعديل">
                      <IconButton size="small" onClick={() => openEdit(row)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {row.status !== 'inactive' && (
                      <Tooltip title="تعطيل">
                        <IconButton
                          size="small"
                          onClick={() => handleDeactivate(row._id)}
                          color="error"
                        >
                          <ToggleOffIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="md"
        dir="rtl"
      >
        <DialogTitle>{editId ? 'تعديل فرع' : 'إنشاء فرع جديد'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="الرمز (مثال: RY-MAIN)"
                required
                disabled={!!editId}
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="الاسم بالعربية"
                required
                value={form.name_ar}
                onChange={e => setForm({ ...form, name_ar: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Name (EN)"
                required
                dir="ltr"
                value={form.name_en}
                onChange={e => setForm({ ...form, name_en: e.target.value })}
              />
            </Grid>

            <Grid item xs={6} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>النوع</InputLabel>
                <Select
                  label="النوع"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  {TYPE_OPTIONS.filter(o => o.value).map(o => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
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
            <Grid item xs={6} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>المنطقة</InputLabel>
                <Select
                  label="المنطقة"
                  value={form.location?.region || 'riyadh'}
                  onChange={e =>
                    setForm({ ...form, location: { ...form.location, region: e.target.value } })
                  }
                >
                  {REGION_OPTIONS.filter(o => o.value).map(o => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={!!form.is_hq}
                    onChange={e => setForm({ ...form, is_hq: e.target.checked })}
                  />
                }
                label="المقر الرئيسي"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="المدينة"
                value={form.location?.city_ar || ''}
                onChange={e =>
                  setForm({ ...form, location: { ...form.location, city_ar: e.target.value } })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="العنوان"
                value={form.location?.address_ar || ''}
                onChange={e =>
                  setForm({ ...form, location: { ...form.location, address_ar: e.target.value } })
                }
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="رقم الترخيص البلدي (Balady)"
                value={form.balady_license_number || ''}
                onChange={e => setForm({ ...form, balady_license_number: e.target.value })}
                helperText="للتحقق التلقائي من الرخصة البلدية"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="الرمز القصير (Wasel)"
                value={form.wasel_short_code || ''}
                onChange={e => setForm({ ...form, wasel_short_code: e.target.value.toUpperCase() })}
                inputProps={{ dir: 'ltr', style: { textTransform: 'uppercase' } }}
                placeholder="RFYA1234"
                helperText="4 أحرف + 4 أرقام من العنوان الوطني"
              />
            </Grid>

            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="هاتف ثابت"
                dir="ltr"
                value={form.phone || ''}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="جوال"
                dir="ltr"
                value={form.mobile || ''}
                onChange={e => setForm({ ...form, mobile: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="واتساب"
                dir="ltr"
                value={form.whatsapp || ''}
                onChange={e => setForm({ ...form, whatsapp: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="البريد الإلكتروني"
                dir="ltr"
                type="email"
                value={form.email || ''}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </Grid>

            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="إجمالي الغرف"
                type="number"
                value={form.capacity?.total_rooms || 0}
                onChange={e =>
                  setForm({
                    ...form,
                    capacity: { ...form.capacity, total_rooms: Number(e.target.value) },
                  })
                }
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="غرف العلاج"
                type="number"
                value={form.capacity?.therapy_rooms || 0}
                onChange={e =>
                  setForm({
                    ...form,
                    capacity: { ...form.capacity, therapy_rooms: Number(e.target.value) },
                  })
                }
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="السعة القصوى (مستفيدين)"
                type="number"
                value={form.capacity?.max_patients || 0}
                onChange={e =>
                  setForm({
                    ...form,
                    capacity: { ...form.capacity, max_patients: Number(e.target.value) },
                  })
                }
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="جلسات يومية قصوى"
                type="number"
                value={form.capacity?.max_daily_sessions || 0}
                onChange={e =>
                  setForm({
                    ...form,
                    capacity: { ...form.capacity, max_daily_sessions: Number(e.target.value) },
                  })
                }
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={!!form.settings?.allow_online_booking}
                    onChange={e =>
                      setForm({
                        ...form,
                        settings: { ...form.settings, allow_online_booking: e.target.checked },
                      })
                    }
                  />
                }
                label="يقبل الحجز الإلكتروني"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={!!form.settings?.has_transport}
                    onChange={e =>
                      setForm({
                        ...form,
                        settings: { ...form.settings, has_transport: e.target.checked },
                      })
                    }
                  />
                }
                label="خدمة النقل متاحة"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'جارٍ الحفظ...' : editId ? 'حفظ التعديلات' : 'إنشاء الفرع'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
