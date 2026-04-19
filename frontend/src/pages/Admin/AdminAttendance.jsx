/**
 * AdminAttendance — /admin/attendance page.
 *
 * Session attendance dashboard: overview counters + no-show risk
 * watchlists (attention + critical) + filterable records table with
 * quick-mark + bulk-mark + CSV export.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PeopleIcon from '@mui/icons-material/People';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import api from '../../services/api.client';

const STATUS_LABELS = {
  present: 'حضور',
  late: 'متأخر',
  absent: 'غياب',
  no_show: 'بدون إشعار',
  cancelled: 'ملغي',
};
const STATUS_COLORS = {
  present: 'success',
  late: 'warning',
  absent: 'error',
  no_show: 'error',
  cancelled: 'default',
};

function formatDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('ar-SA');
  } catch {
    return '—';
  }
}

export default function AdminAttendance() {
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ status: '', from: '', to: '' });
  const [errMsg, setErrMsg] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const { data } = await api.get('/admin/attendance/overview');
      setOverview(data);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحميل نظرة عامة');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadRecords = useCallback(
    async (page = 1) => {
      setRecordsLoading(true);
      try {
        const params = { page, limit: 50 };
        if (filters.status) params.status = filters.status;
        if (filters.from) params.from = filters.from;
        if (filters.to) params.to = filters.to;
        const { data } = await api.get('/admin/attendance', { params });
        setRecords(data?.items || []);
        setPagination(data?.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
      } catch (err) {
        setErrMsg(err?.response?.data?.message || 'فشل تحميل السجلات');
      } finally {
        setRecordsLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);
  useEffect(() => {
    loadRecords(1);
  }, [loadRecords]);

  const openEdit = row =>
    setEditTarget({
      _id: row._id,
      status: row.status,
      reason: row.reason || '',
      notes: row.notes || '',
      billable: !!row.billable,
    });

  const saveEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      const { _id, ...body } = editTarget;
      await api.patch(`/admin/attendance/${_id}`, body);
      setEditTarget(null);
      loadRecords(pagination.page);
      loadOverview();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل حفظ التعديلات');
    } finally {
      setEditSaving(false);
    }
  };

  const deleteRecord = async id => {
    if (!window.confirm('حذف السجل نهائياً؟')) return;
    try {
      await api.delete(`/admin/attendance/${id}`);
      loadRecords(pagination.page);
      loadOverview();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل الحذف');
    }
  };

  const statCards = useMemo(() => {
    const s = overview?.summary;
    if (!s) return [];
    return [
      {
        label: 'إجمالي الجلسات',
        value: s.total || 0,
        icon: <PeopleIcon />,
        color: 'primary.main',
      },
      {
        label: 'نسبة الحضور',
        value: s.attendanceRate != null ? `${s.attendanceRate}%` : '—',
        icon: <CheckCircleIcon />,
        color: 'success.main',
      },
      {
        label: 'متابعة',
        value: overview?.attention?.length || 0,
        icon: <WarningIcon />,
        color: 'warning.main',
      },
      {
        label: 'حرجة',
        value: overview?.critical?.length || 0,
        icon: <ErrorOutlineIcon />,
        color: 'error.main',
      },
    ];
  }, [overview]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            حضور الجلسات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            نظرة 30 يوماً — نسب الحضور + قائمة المستفيدين المعرَّضين لتكرار الغياب.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton
            onClick={() => {
              loadOverview();
              loadRecords(pagination.page);
            }}
          >
            <RefreshIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            component="a"
            href={(() => {
              const p = new URLSearchParams();
              if (filters.status) p.set('status', filters.status);
              if (filters.from) p.set('from', filters.from);
              if (filters.to) p.set('to', filters.to);
              const qs = p.toString();
              return `/api/admin/attendance/export.csv${qs ? `?${qs}` : ''}`;
            })()}
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
      {overviewLoading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2} mb={3}>
        {statCards.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {s.label}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>
                      {s.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: s.color, fontSize: 36 }}>{s.icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {overview?.critical?.length > 0 && (
        <Paper sx={{ mb: 3, p: 2, borderLeft: '4px solid', borderColor: 'error.main' }}>
          <Typography variant="subtitle1" fontWeight="bold" mb={1} color="error">
            قائمة حرجة — {overview.critical.length} مستفيد ≥ 5 غيابات دون إشعار
          </Typography>
          <List dense disablePadding>
            {overview.critical.map(e => (
              <ListItem key={e.beneficiaryId} disableGutters>
                <ListItemText
                  primary={`${e.name} ${e.beneficiaryNumber ? `(${e.beneficiaryNumber})` : ''}`}
                  secondary={`${e.noShows} غياب دون إشعار · آخرها: ${formatDate(e.lastNoShow)}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {overview?.attention?.length > 0 && (
        <Paper sx={{ mb: 3, p: 2, borderLeft: '4px solid', borderColor: 'warning.main' }}>
          <Typography variant="subtitle1" fontWeight="bold" mb={1}>
            قائمة متابعة — {overview.attention.length} مستفيد (3-4 غيابات)
          </Typography>
          <List dense disablePadding>
            {overview.attention.map(e => (
              <ListItem key={e.beneficiaryId} disableGutters>
                <ListItemText
                  primary={`${e.name} ${e.beneficiaryNumber ? `(${e.beneficiaryNumber})` : ''}`}
                  secondary={`${e.noShows} غياب دون إشعار · آخرها: ${formatDate(e.lastNoShow)}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Paper sx={{ mb: 2, p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            select
            size="small"
            label="الحالة"
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="date"
            size="small"
            label="من"
            value={filters.from}
            onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="date"
            size="small"
            label="إلى"
            value={filters.to}
            onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </Paper>

      {recordsLoading && <LinearProgress sx={{ mb: 2 }} />}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>التاريخ</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>السبب</TableCell>
              <TableCell>قابل للفوترة</TableCell>
              <TableCell>ملاحظات</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.length === 0 && !recordsLoading && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" py={3}>
                    لا توجد سجلات مطابقة
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {records.map(r => (
              <TableRow key={r._id} hover>
                <TableCell>{formatDate(r.scheduledDate)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={STATUS_COLORS[r.status] || 'default'}
                    label={STATUS_LABELS[r.status] || r.status}
                  />
                </TableCell>
                <TableCell>{r.reason || '—'}</TableCell>
                <TableCell>{r.billable ? 'نعم' : '—'}</TableCell>
                <TableCell>{r.notes || '—'}</TableCell>
                <TableCell align="center">
                  <Tooltip title="تعديل">
                    <IconButton size="small" onClick={() => openEdit(r)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف">
                    <IconButton size="small" color="error" onClick={() => deleteRecord(r._id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination.pages > 1 && (
        <Stack direction="row" spacing={1} justifyContent="center" mt={2}>
          <Button
            size="small"
            disabled={pagination.page <= 1}
            onClick={() => loadRecords(pagination.page - 1)}
          >
            السابق
          </Button>
          <Typography variant="body2" sx={{ alignSelf: 'center' }}>
            {pagination.page} / {pagination.pages}
          </Typography>
          <Button
            size="small"
            disabled={pagination.page >= pagination.pages}
            onClick={() => loadRecords(pagination.page + 1)}
          >
            التالي
          </Button>
        </Stack>
      )}

      <Dialog
        open={!!editTarget}
        onClose={() => (editSaving ? null : setEditTarget(null))}
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>تعديل سجل حضور</DialogTitle>
        <DialogContent dividers>
          {editTarget && (
            <Stack spacing={2} mt={1}>
              <TextField
                select
                label="الحالة"
                value={editTarget.status}
                onChange={e => setEditTarget(t => ({ ...t, status: e.target.value }))}
                required
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="السبب"
                value={editTarget.reason}
                onChange={e => setEditTarget(t => ({ ...t, reason: e.target.value }))}
                multiline
                minRows={2}
              />
              <TextField
                label="ملاحظات"
                value={editTarget.notes}
                onChange={e => setEditTarget(t => ({ ...t, notes: e.target.value }))}
                multiline
                minRows={2}
              />
              <TextField
                select
                label="قابل للفوترة"
                value={editTarget.billable ? 'true' : 'false'}
                onChange={e => setEditTarget(t => ({ ...t, billable: e.target.value === 'true' }))}
              >
                <MenuItem value="false">لا</MenuItem>
                <MenuItem value="true">نعم</MenuItem>
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)} disabled={editSaving}>
            إلغاء
          </Button>
          <Button variant="contained" onClick={saveEdit} disabled={editSaving}>
            {editSaving ? <CircularProgress size={20} /> : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
