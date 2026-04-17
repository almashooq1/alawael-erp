/**
 * AdminApplications — HR view of public job applications.
 *
 * Lists submissions captured via /careers (POST /api/careers/apply),
 * supports filter + search, and inline status transitions.
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
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import api from '../../services/api.client';

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'new', label: 'جديد', color: 'info' },
  { value: 'screening', label: 'قيد الفحص', color: 'primary' },
  { value: 'interviewing', label: 'مقابلات', color: 'warning' },
  { value: 'offered', label: 'تم العرض', color: 'secondary' },
  { value: 'hired', label: 'تم التعيين', color: 'success' },
  { value: 'declined', label: 'مرفوض', color: 'error' },
];

const COLOR_MAP = STATUS_OPTIONS.reduce((a, o) => ({ ...a, [o.value]: o.color || 'default' }), {});

export default function AdminApplications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ status: '', q: '' });
  const [detail, setDetail] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/careers/admin', {
        params: {
          status: filters.status || undefined,
          q: filters.q || undefined,
          page: pagination.page,
          limit: pagination.limit,
        },
      });
      setItems(res.data?.items || []);
      setPagination(p => ({ ...p, ...(res.data?.pagination || {}) }));
    } catch (err) {
      setError(err?.response?.data?.message || 'تعذّر تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.q, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/careers/admin/${id}/status`, { status });
      await fetchAll();
      if (detail && detail._id === id) setDetail(d => ({ ...d, status }));
    } catch (err) {
      setError(err?.response?.data?.message || 'تعذّر تحديث الحالة');
    }
  };

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
            طلبات التوظيف
          </Typography>
          <Typography variant="body2" color="text.secondary">
            طلبات الوظائف الواردة من صفحة /careers العامة
          </Typography>
        </Box>
        <Tooltip title="تحديث">
          <IconButton onClick={fetchAll} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 2, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="بحث (اسم / بريد / جوال / رقم طلب / وظيفة)"
                value={filters.q}
                onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && fetchAll()}
              />
            </Grid>
            <Grid item xs={8} md={4}>
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
                <TableCell>رقم الطلب</TableCell>
                <TableCell>التاريخ</TableCell>
                <TableCell>الاسم</TableCell>
                <TableCell>الوظيفة</TableCell>
                <TableCell>الخبرة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="center">إجراء</TableCell>
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
                    <Typography color="text.secondary">لا توجد طلبات مطابقة.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {items.map(row => (
                <TableRow key={row._id} hover>
                  <TableCell>
                    <code style={{ direction: 'ltr' }}>{row.referenceNumber}</code>
                  </TableCell>
                  <TableCell>{new Date(row.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>
                    {row.fullName}
                    <Typography variant="caption" color="text.secondary" display="block" dir="ltr">
                      {row.email} · {row.phone}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.jobTitle}</TableCell>
                  <TableCell>{row.yearsExperience || 0} سنة</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={STATUS_OPTIONS.find(o => o.value === row.status)?.label || row.status}
                      color={COLOR_MAP[row.status] || 'default'}
                    />
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

      {/* Detail dialog */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>تفاصيل طلب التوظيف</span>
            <Chip
              size="small"
              label={STATUS_OPTIONS.find(o => o.value === detail?.status)?.label || detail?.status}
              color={COLOR_MAP[detail?.status] || 'default'}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
            <code style={{ direction: 'ltr' }}>{detail?.referenceNumber}</code>
          </Typography>
        </DialogTitle>
        <DialogContent>
          {detail && (
            <Stack spacing={1.5}>
              <Row label="الوظيفة المُتقدَّم عليها" value={detail.jobTitle} />
              <Row label="الاسم" value={detail.fullName} />
              <Row
                label="البريد"
                value={
                  <a href={`mailto:${detail.email}`} dir="ltr">
                    {detail.email}
                  </a>
                }
              />
              <Row
                label="الجوال"
                value={
                  <a href={`tel:${detail.phone}`} dir="ltr">
                    {detail.phone}
                  </a>
                }
              />
              <Row label="الخبرة" value={`${detail.yearsExperience || 0} سنة`} />
              {detail.currentRole && <Row label="الوظيفة الحالية" value={detail.currentRole} />}
              {detail.highestEducation && (
                <Row label="المؤهل العلمي" value={detail.highestEducation} />
              )}
              {detail.certifications && <Row label="الشهادات" value={detail.certifications} />}
              {detail.linkedinUrl && (
                <Row
                  label="LinkedIn"
                  value={
                    <a
                      href={detail.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      dir="ltr"
                    >
                      {detail.linkedinUrl}
                    </a>
                  }
                />
              )}
              {detail.coverLetter && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    رسالة تعريفية:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 0.5,
                      p: 2,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {detail.coverLetter}
                  </Typography>
                </Box>
              )}
              <FormControl fullWidth size="small" sx={{ mt: 2 }}>
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
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
        {label}:
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value}
      </Typography>
    </Stack>
  );
}
