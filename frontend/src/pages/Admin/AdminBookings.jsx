/**
 * AdminBookings — staff view of public booking requests.
 *
 * Lists leads captured via the public landing (POST /api/bookings/public),
 * supports filters (status, search, date range), inline status transitions,
 * and CSV export. MUI table to fit the existing admin shell aesthetic.
 *
 * Endpoints:
 *   GET    /api/bookings/admin?status=&branch=&q=&from=&to=&page=&limit=
 *   GET    /api/bookings/admin/stats
 *   PATCH  /api/bookings/admin/:id/status   { status, internalNotes? }
 *   GET    /api/bookings/admin/export.csv?status=
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Divider,
  Alert,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import api from '../../services/api.client';

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'new', label: 'جديد', color: 'info' },
  { value: 'contacted', label: 'تم التواصل', color: 'primary' },
  { value: 'scheduled', label: 'تم الجدولة', color: 'warning' },
  { value: 'converted', label: 'تم التحويل', color: 'success' },
  { value: 'declined', label: 'مرفوض', color: 'error' },
  { value: 'spam', label: 'مزعج', color: 'default' },
];

const STATUS_COLORS = {
  new: 'info',
  contacted: 'primary',
  scheduled: 'warning',
  converted: 'success',
  declined: 'error',
  spam: 'default',
};

export default function AdminBookings() {
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ status: '', q: '', branch: '' });
  const [detail, setDetail] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/bookings/admin', {
          params: {
            status: filters.status || undefined,
            q: filters.q || undefined,
            branch: filters.branch || undefined,
            page: pagination.page,
            limit: pagination.limit,
          },
        }),
        api.get('/bookings/admin/stats').catch(() => ({ data: null })),
      ]);
      setItems(listRes.data?.items || []);
      setPagination(p => ({ ...p, ...(listRes.data?.pagination || {}) }));
      if (statsRes.data) setStats(statsRes.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'تعذّر تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.q, filters.branch, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/bookings/admin/${id}/status`, { status });
      await fetchAll();
      if (detail && detail._id === id) {
        setDetail(d => ({ ...d, status }));
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'تعذّر تحديث الحالة');
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    const url = `/api/bookings/admin/export.csv?${params}`;
    window.open(url, '_blank');
  };

  const summaryCards = useMemo(
    () => [
      { label: 'إجمالي الطلبات', value: stats?.total ?? '—', color: '#0ea5e9' },
      { label: 'آخر 30 يوم', value: stats?.last30days ?? '—', color: '#10b981' },
      { label: 'جديدة', value: stats?.byStatus?.new ?? '—', color: '#6366f1' },
      { label: 'تم تحويلها', value: stats?.byStatus?.converted ?? '—', color: '#059669' },
    ],
    [stats]
  );

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
            طلبات الحجز من الموقع
          </Typography>
          <Typography variant="body2" color="text.secondary">
            الحجوزات الواردة من صفحة الهبوط العامة — تتبع كل طلب حتى التحويل لمستفيد
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchAll} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExport}>
            تصدير CSV
          </Button>
        </Stack>
      </Stack>

      {/* ── Summary cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryCards.map(c => (
          <Grid item xs={6} md={3} key={c.label}>
            <Card sx={{ borderRadius: 3, borderTop: `4px solid ${c.color}` }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  {c.label}
                </Typography>
                <Typography variant="h4" fontWeight={700} color="text.primary">
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

      {/* ── Filters ── */}
      <Card sx={{ mb: 2, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="بحث (اسم / جوال / رقم تأكيد)"
                value={filters.q}
                onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && fetchAll()}
              />
            </Grid>
            <Grid item xs={6} md={3}>
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
            <Grid item xs={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="الفرع المفضّل"
                value={filters.branch}
                onChange={e => setFilters(f => ({ ...f, branch: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && fetchAll()}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button fullWidth variant="contained" onClick={fetchAll} disabled={loading}>
                تطبيق
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ── Table ── */}
      <Card sx={{ borderRadius: 3 }}>
        <TableContainer component={Paper} elevation={0}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                <TableCell>رقم التأكيد</TableCell>
                <TableCell>التاريخ</TableCell>
                <TableCell>ولي الأمر</TableCell>
                <TableCell>الجوال</TableCell>
                <TableCell>الطفل</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الفرع</TableCell>
                <TableCell align="center">إجراء</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              )}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">لا توجد طلبات مطابقة للفلاتر.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {items.map(row => (
                <TableRow key={row._id} hover>
                  <TableCell>
                    <code style={{ direction: 'ltr' }}>{row.confirmationNumber}</code>
                  </TableCell>
                  <TableCell>{new Date(row.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>{row.parentName}</TableCell>
                  <TableCell dir="ltr">
                    <a
                      href={`tel:${row.parentPhone}`}
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <PhoneIphoneIcon sx={{ fontSize: 14 }} />
                        <span>{row.parentPhone}</span>
                      </Stack>
                    </a>
                  </TableCell>
                  <TableCell>
                    {row.childName}
                    <Typography variant="caption" color="text.secondary" display="block">
                      {row.childAge} سنوات · {row.conditionType}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={STATUS_OPTIONS.find(o => o.value === row.status)?.label || row.status}
                      color={STATUS_COLORS[row.status] || 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.branchPreference}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.preferredTime}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => setDetail(row)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            إجمالي: {(pagination.total || 0).toLocaleString('ar-SA')} طلب
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

      {/* ── Detail dialog ── */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>تفاصيل الطلب</span>
            <Chip
              size="small"
              label={STATUS_OPTIONS.find(o => o.value === detail?.status)?.label || detail?.status}
              color={STATUS_COLORS[detail?.status] || 'default'}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
            <code style={{ direction: 'ltr' }}>{detail?.confirmationNumber}</code>
          </Typography>
        </DialogTitle>
        <DialogContent>
          {detail && (
            <Stack spacing={2}>
              <Row label="ولي الأمر" value={detail.parentName} />
              <Row
                label="جوال ولي الأمر"
                value={
                  <a href={`tel:${detail.parentPhone}`} dir="ltr">
                    {detail.parentPhone}
                  </a>
                }
              />
              <Row label="الطفل" value={`${detail.childName} · ${detail.childAge} سنوات`} />
              {detail.childGender && (
                <Row label="الجنس" value={detail.childGender === 'male' ? 'ذكر' : 'أنثى'} />
              )}
              <Row label="نوع الحالة" value={detail.conditionType} />
              <Row label="الفرع المفضّل" value={detail.branchPreference} />
              <Row label="الفترة المفضّلة" value={detail.preferredTime} />
              {detail.notes && <Row label="ملاحظات" value={detail.notes} />}
              <Divider />
              <Row label="تم الاستلام" value={new Date(detail.createdAt).toLocaleString('ar-SA')} />
              {detail.contactedAt && (
                <Row
                  label="تم التواصل"
                  value={new Date(detail.contactedAt).toLocaleString('ar-SA')}
                />
              )}
              {detail.convertedAt && (
                <Row
                  label="تم التحويل"
                  value={new Date(detail.convertedAt).toLocaleString('ar-SA')}
                />
              )}

              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>تحديث الحالة</InputLabel>
                <Select
                  label="تحديث الحالة"
                  value={detail.status}
                  onChange={e => handleStatusChange(detail._id, e.target.value)}
                >
                  {STATUS_OPTIONS.filter(o => o.value).map(o => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

function Row({ label, value }) {
  return (
    <Stack direction="row" spacing={2}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
        {label}:
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value}
      </Typography>
    </Stack>
  );
}
