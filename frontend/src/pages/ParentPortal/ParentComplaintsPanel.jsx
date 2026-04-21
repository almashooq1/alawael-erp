/**
 * ParentComplaintsPanel — form + history for parent-submitted
 * complaints / suggestions / feedback. Self-contained; mounted
 * inside MyChildrenPortal.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Stack,
  Paper,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import FeedbackIcon from '@mui/icons-material/Feedback';
import api from '../../services/api.client';

const TYPE_OPTIONS = [
  { value: 'complaint', label: 'شكوى' },
  { value: 'suggestion', label: 'اقتراح' },
  { value: 'feedback', label: 'ملاحظة' },
];

const CATEGORY_OPTIONS = [
  { value: 'service', label: 'الخدمة' },
  { value: 'administrative', label: 'إدارية' },
  { value: 'financial', label: 'مالية' },
  { value: 'safety', label: 'سلامة' },
  { value: 'other', label: 'أخرى' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'منخفضة' },
  { value: 'medium', label: 'متوسطة' },
  { value: 'high', label: 'عالية' },
  { value: 'critical', label: 'حرجة' },
];

const STATUS_COLORS = {
  new: { label: 'جديدة', color: 'info' },
  under_review: { label: 'قيد المراجعة', color: 'warning' },
  in_progress: { label: 'جاري المعالجة', color: 'warning' },
  escalated: { label: 'مُصعَّدة', color: 'error' },
  resolved: { label: 'مُحلولة', color: 'success' },
  closed: { label: 'مغلقة', color: 'default' },
  rejected: { label: 'مرفوضة', color: 'error' },
};

function formatDateTime(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('ar-SA');
  } catch {
    return '—';
  }
}

export default function ParentComplaintsPanel({ activeChild }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'complaint',
    category: 'service',
    priority: 'medium',
    subject: '',
    description: '',
    attachToChild: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const { data } = await api.get('/parent-v2/complaints');
      setItems(data?.items || []);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحميل السجل');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async () => {
    if (form.subject.trim().length < 3) {
      setErrMsg('الموضوع مطلوب (3 أحرف على الأقل)');
      return;
    }
    if (form.description.trim().length < 5) {
      setErrMsg('الوصف مطلوب (5 أحرف على الأقل)');
      return;
    }
    setSaving(true);
    setErrMsg('');
    try {
      const payload = {
        type: form.type,
        category: form.category,
        priority: form.priority,
        subject: form.subject.trim(),
        description: form.description.trim(),
      };
      if (form.attachToChild && activeChild?._id) {
        payload.childId = activeChild._id;
      }
      await api.post('/parent-v2/complaints', payload);
      setOpen(false);
      setForm({
        type: 'complaint',
        category: 'service',
        priority: 'medium',
        subject: '',
        description: '',
        attachToChild: true,
      });
      await load();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل الإرسال');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 2, mt: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <FeedbackIcon color="primary" />
          <Typography variant="h6">شكاواي وملاحظاتي</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title="تحديث">
            <IconButton size="small" onClick={load}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
          >
            تقديم جديد
          </Button>
        </Stack>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress size={28} />
        </Box>
      ) : items.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={3}>
          لا توجد شكاوى أو ملاحظات مُسجَّلة.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الرقم</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الموضوع</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>التاريخ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(c => {
              const s = STATUS_COLORS[c.status] || { label: c.status, color: 'default' };
              const typeLabel = TYPE_OPTIONS.find(t => t.value === c.type)?.label || c.type;
              return (
                <TableRow key={c._id}>
                  <TableCell>{c.complaintId || '—'}</TableCell>
                  <TableCell>{typeLabel}</TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>{c.subject}</TableCell>
                  <TableCell>
                    <Chip size="small" label={s.label} color={s.color} />
                  </TableCell>
                  <TableCell>{formatDateTime(c.createdAt)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Submit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>تقديم شكوى / اقتراح / ملاحظة</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="النوع"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              size="small"
              fullWidth
            >
              {TYPE_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="الفئة"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              size="small"
              fullWidth
            >
              {CATEGORY_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="الأولوية"
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              size="small"
              fullWidth
            >
              {PRIORITY_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="الموضوع"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              inputProps={{ maxLength: 300 }}
              size="small"
              fullWidth
              required
            />
            <TextField
              label="الوصف التفصيلي"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              inputProps={{ maxLength: 5000 }}
              size="small"
              fullWidth
              required
              multiline
              minRows={4}
            />
            {activeChild && (
              <Alert severity="info" variant="outlined">
                <Typography variant="body2">
                  {form.attachToChild
                    ? `ستُرفق هذه الملاحظة بملف الطفل: ${activeChild.firstName_ar || activeChild.firstName || '—'}`
                    : 'لن تُرفق بأي ملف طفل.'}
                </Typography>
                <Button
                  size="small"
                  onClick={() => setForm(f => ({ ...f, attachToChild: !f.attachToChild }))}
                  sx={{ mt: 0.5 }}
                >
                  {form.attachToChild ? 'فك الربط' : 'إعادة الربط'}
                </Button>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button
            onClick={onSubmit}
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} /> : null}
          >
            إرسال
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
