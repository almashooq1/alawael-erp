/**
 * AdminWaitlist — /admin/waitlist page.
 * Front-desk queue: prioritized waiters + status transitions + overview.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AddIcon from '@mui/icons-material/Add';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import api from '../../services/api.client';

const SERVICE_TYPES = ['علاج طبيعي', 'علاج وظيفي', 'نطق وتخاطب', 'علاج سلوكي', 'علاج نفسي', 'أخرى'];

const PRIORITY_COLORS = {
  1: 'error',
  2: 'warning',
  3: 'info',
  4: 'default',
  5: 'default',
};
const PRIORITY_LABELS = {
  1: 'عاجل',
  2: 'مرتفع',
  3: 'عادي',
  4: 'منخفض',
  5: 'روتيني',
};

const STATUS_COLORS = {
  waiting: 'warning',
  offered: 'info',
  enrolled: 'success',
  withdrawn: 'default',
  lapsed: 'error',
};
const STATUS_LABELS = {
  waiting: 'في الانتظار',
  offered: 'عُرض عليه',
  enrolled: 'مسجّل',
  withdrawn: 'انسحب',
  lapsed: 'انتهى العرض',
};

function daysSince(iso) {
  if (!iso) return null;
  const d = (Date.now() - new Date(iso).getTime()) / 86400000;
  return Math.floor(d);
}

export default function AdminWaitlist() {
  const [items, setItems] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    serviceType: '',
    priority: 3,
    prospectName: '',
    prospectPhone: '',
    referredBy: '',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: list }, { data: ov }] = await Promise.all([
        api.get('/admin/waitlist/prioritized'),
        api.get('/admin/waitlist/overview'),
      ]);
      setItems(list?.items || []);
      setOverview(ov || null);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const action = async (id, verb) => {
    try {
      await api.post(`/admin/waitlist/${id}/${verb}`);
      setOkMsg(
        verb === 'offer' ? 'تم إرسال العرض' : verb === 'enroll' ? 'تم التسجيل' : 'تم التحديث'
      );
      await load();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'تعذّر تنفيذ الإجراء');
    }
  };

  const submitAdd = async () => {
    if (!form.serviceType) {
      setErrMsg('نوع الخدمة مطلوب');
      return;
    }
    if (!form.prospectName) {
      setErrMsg('اسم المستفيد المحتمل مطلوب');
      return;
    }
    try {
      await api.post('/admin/waitlist', form);
      setAddOpen(false);
      setForm({
        serviceType: '',
        priority: 3,
        prospectName: '',
        prospectPhone: '',
        referredBy: '',
        notes: '',
      });
      setOkMsg('تمت إضافة المستفيد إلى قائمة الانتظار');
      await load();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل الحفظ');
    }
  };

  const summary = overview?.summary || {};
  const stale = overview?.stale || [];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            قائمة الانتظار
          </Typography>
          <Typography variant="body2" color="text.secondary">
            المستفيدون في الانتظار مرتبون حسب الأولوية وعُمر الطلب — لتسريع التحويل إلى تسجيل فعلي.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={load}>
            <RefreshIcon />
          </IconButton>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
            إضافة
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            component="a"
            href="/api/admin/waitlist/export.csv"
            target="_blank"
            rel="noopener"
          >
            تصدير CSV
          </Button>
        </Stack>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}
      {okMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setOkMsg('')}>
          {okMsg}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                في الانتظار
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {summary.waiting || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                عروض نشطة
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {summary.offered || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                متوسط وقت الانتظار
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {summary.avgWaitDays != null ? `${summary.avgWaitDays} يوم` : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                المدة المتوقعة حتى التسجيل
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="text.secondary">
                {overview?.estimateDays != null ? `${overview.estimateDays} يوم` : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {stale.length > 0 && (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          {stale.length} مستفيد ينتظر منذ أكثر من العتبة المعتمدة — يحتاج إلى مراجعة فورية
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>المستفيد</TableCell>
              <TableCell>نوع الخدمة</TableCell>
              <TableCell align="center">الأولوية</TableCell>
              <TableCell align="center">الحالة</TableCell>
              <TableCell align="right">أيام الانتظار</TableCell>
              <TableCell>المرجع</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" py={3}>
                    لا يوجد مستفيدون في قائمة الانتظار
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((r, i) => {
              const waitDays = daysSince(r.requestedAt);
              const isStale = stale.some(s => String(s._id) === String(r._id));
              return (
                <TableRow key={r._id} hover>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {r.prospectName || '(مستفيد حالي)'}
                    </Typography>
                    {r.prospectPhone && (
                      <Typography variant="caption" color="text.secondary">
                        {r.prospectPhone}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{r.serviceType}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={PRIORITY_LABELS[r.priority] || r.priority}
                      color={PRIORITY_COLORS[r.priority] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={STATUS_LABELS[r.status] || r.status}
                      color={STATUS_COLORS[r.status] || 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: isStale ? 'error.main' : 'inherit',
                      fontWeight: isStale ? 600 : 400,
                    }}
                  >
                    {waitDays != null ? `${waitDays} يوم` : '—'}
                  </TableCell>
                  <TableCell>{r.referredBy || '—'}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      {r.status === 'waiting' && (
                        <Tooltip title="عرض مقعد">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => action(r._id, 'offer')}
                          >
                            <LocalOfferIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {(r.status === 'waiting' || r.status === 'offered') && (
                        <Tooltip title="تسجيل">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => action(r._id, 'enroll')}
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {(r.status === 'waiting' || r.status === 'offered') && (
                        <Tooltip title="انسحب">
                          <IconButton
                            size="small"
                            color="default"
                            onClick={() => action(r._id, 'withdraw')}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>إضافة إلى قائمة الانتظار</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="نوع الخدمة"
              value={form.serviceType}
              onChange={e => setForm({ ...form, serviceType: e.target.value })}
              fullWidth
              required
            >
              {SERVICE_TYPES.map(s => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="الأولوية"
              value={form.priority}
              onChange={e => setForm({ ...form, priority: Number(e.target.value) })}
              fullWidth
            >
              {[1, 2, 3, 4, 5].map(p => (
                <MenuItem key={p} value={p}>
                  {p} — {PRIORITY_LABELS[p]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="اسم المستفيد المحتمل"
              value={form.prospectName}
              onChange={e => setForm({ ...form, prospectName: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="رقم الهاتف"
              value={form.prospectPhone}
              onChange={e => setForm({ ...form, prospectPhone: e.target.value })}
              fullWidth
            />
            <TextField
              label="مصدر الإحالة"
              value={form.referredBy}
              onChange={e => setForm({ ...form, referredBy: e.target.value })}
              fullWidth
            />
            <TextField
              label="ملاحظات"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={submitAdd}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
