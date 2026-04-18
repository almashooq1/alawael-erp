/**
 * AdminCpeCredits — /admin/hr/cpe page.
 *
 * SCFHS CPE credit dashboard: overview counters + soon-expiring watchlist
 * + paginated list of credit records with per-row verify and delete.
 * Single-therapist summary dialog shows the compliance verdict with
 * per-category deficits (50/30/20 + 100 total over a 5-year cycle).
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
import VerifiedIcon from '@mui/icons-material/Verified';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PeopleIcon from '@mui/icons-material/People';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import SummarizeIcon from '@mui/icons-material/Summarize';
import api from '../../services/api.client';

const CATEGORY_LABELS = {
  1: 'الفئة 1 — مؤتمرات ودورات معتمدة',
  2: 'الفئة 2 — نشاطات ذاتية',
  3: 'الفئة 3 — تعليم ومشاركات',
};

function formatDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('ar-SA');
  } catch {
    return '—';
  }
}

export default function AdminCpeCredits() {
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ category: '', verified: '' });
  const [errMsg, setErrMsg] = useState('');
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const { data } = await api.get('/admin/hr/cpe/overview');
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
        if (filters.category) params.category = filters.category;
        if (filters.verified !== '') params.verified = filters.verified;
        const { data } = await api.get('/admin/hr/cpe', { params });
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

  const showSummary = async employeeId => {
    setSummaryLoading(true);
    setSummary({ open: true, data: null, employeeId });
    try {
      const { data } = await api.get(`/admin/hr/cpe/employee/${employeeId}/summary`);
      setSummary({ open: true, data, employeeId });
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحميل الملخّص');
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  const verifyRecord = async id => {
    try {
      await api.post(`/admin/hr/cpe/${id}/verify`);
      loadRecords(pagination.page);
      loadOverview();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التوثيق');
    }
  };

  const deleteRecord = async id => {
    if (!window.confirm('حذف السجل نهائياً؟')) return;
    try {
      await api.delete(`/admin/hr/cpe/${id}`);
      loadRecords(pagination.page);
      loadOverview();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل الحذف');
    }
  };

  const statCards = useMemo(() => {
    if (!overview) return [];
    return [
      {
        label: 'المرخَّصون الإجمالي',
        value: overview.total || 0,
        icon: <PeopleIcon />,
        color: 'primary.main',
      },
      {
        label: 'ملتزمون',
        value: overview.compliant || 0,
        icon: <CheckCircleIcon />,
        color: 'success.main',
      },
      {
        label: 'يحتاجون متابعة',
        value: overview.attention || 0,
        icon: <WarningIcon />,
        color: 'warning.main',
      },
      {
        label: 'غير ملتزمين',
        value: overview.nonCompliant || 0,
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
            ساعات التعليم الطبي المستمر (CPE)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            متابعة التزام المعالجين بمتطلبات هيئة التخصصات الصحية — 100 ساعة كل 5 سنوات (50 فئة 1 +
            30 فئة 2 + 20 فئة 3).
          </Typography>
        </Box>
        <IconButton
          onClick={() => {
            loadOverview();
            loadRecords(pagination.page);
          }}
        >
          <RefreshIcon />
        </IconButton>
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

      {overview?.soonExpiring?.length > 0 && (
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" mb={1}>
            قائمة المتابعة — {overview.soonExpiring.length} معالج(ون) قريبون من الانتهاء
          </Typography>
          <List dense disablePadding>
            {overview.soonExpiring.map(s => (
              <ListItem
                key={s.employeeId}
                disableGutters
                secondaryAction={
                  <Button size="small" onClick={() => showSummary(s.employeeId)}>
                    الملخّص
                  </Button>
                }
              >
                <ListItemText
                  primary={s.name || '—'}
                  secondary={`المتبقي: ${s.daysUntilDeadline} يوم · عجز الساعات: ${s.deficit}`}
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
            label="الفئة"
            value={filters.category}
            onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">الكل</MenuItem>
            <MenuItem value="1">الفئة 1</MenuItem>
            <MenuItem value="2">الفئة 2</MenuItem>
            <MenuItem value="3">الفئة 3</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="حالة التوثيق"
            value={filters.verified}
            onChange={e => setFilters(f => ({ ...f, verified: e.target.value }))}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">الكل</MenuItem>
            <MenuItem value="true">موثَّق</MenuItem>
            <MenuItem value="false">بانتظار التوثيق</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      {recordsLoading && <LinearProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>النشاط</TableCell>
              <TableCell>الفئة</TableCell>
              <TableCell align="right">الساعات</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>الجهة</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.length === 0 && !recordsLoading && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" py={3}>
                    لا توجد سجلات مطابقة
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {records.map(r => (
              <TableRow key={r._id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {r.activityNameAr || r.activityName || '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={CATEGORY_LABELS[r.category] || r.category} />
                </TableCell>
                <TableCell align="right">{r.creditHours}</TableCell>
                <TableCell>{formatDate(r.activityDate)}</TableCell>
                <TableCell>{r.provider || '—'}</TableCell>
                <TableCell>
                  {r.verified ? (
                    <Chip
                      size="small"
                      color="success"
                      icon={<VerifiedIcon fontSize="small" />}
                      label="موثَّق"
                    />
                  ) : (
                    <Chip size="small" variant="outlined" label="بانتظار التوثيق" />
                  )}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="ملخّص الموظف">
                    <IconButton size="small" onClick={() => showSummary(r.employeeId)}>
                      <SummarizeIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {!r.verified && (
                    <Tooltip title="توثيق">
                      <IconButton size="small" color="success" onClick={() => verifyRecord(r._id)}>
                        <VerifiedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
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

      <Dialog open={!!summary} onClose={() => setSummary(null)} maxWidth="sm" fullWidth dir="rtl">
        <DialogTitle>ملخّص CPE</DialogTitle>
        <DialogContent dividers>
          {summaryLoading && <LinearProgress />}
          {summary?.data && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {summary.data.employee?.name || '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  رقم SCFHS: {summary.data.employee?.scfhs_number || '—'} · ينتهي:{' '}
                  {formatDate(summary.data.employee?.scfhs_expiry)}
                </Typography>
              </Box>

              <Alert
                severity={
                  summary.data.summary?.compliant
                    ? 'success'
                    : summary.data.needsAttention
                      ? 'warning'
                      : 'error'
                }
              >
                {summary.data.summary?.compliant
                  ? 'ملتزم بمتطلّبات الهيئة'
                  : summary.data.needsAttention
                    ? `يحتاج متابعة — ${summary.data.daysUntilDeadline} يوم متبقية`
                    : 'غير ملتزم'}
              </Alert>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الفئة</TableCell>
                    <TableCell align="right">المطلوب</TableCell>
                    <TableCell align="right">المتحقق</TableCell>
                    <TableCell align="right">العجز</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {['1', '2', '3'].map(k => {
                    const cs = summary.data.summary?.categoryStatus?.[k];
                    if (!cs) return null;
                    return (
                      <TableRow key={k}>
                        <TableCell>{CATEGORY_LABELS[k]}</TableCell>
                        <TableCell align="right">{cs.required}</TableCell>
                        <TableCell align="right">{cs.earned}</TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: cs.deficit > 0 ? 'error.main' : 'success.main' }}
                        >
                          {cs.deficit}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell>
                      <strong>الإجمالي</strong>
                    </TableCell>
                    <TableCell align="right">
                      {summary.data.summary?.totalStatus?.required}
                    </TableCell>
                    <TableCell align="right">{summary.data.summary?.totalStatus?.earned}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color:
                          summary.data.summary?.totalStatus?.deficit > 0
                            ? 'error.main'
                            : 'success.main',
                      }}
                    >
                      {summary.data.summary?.totalStatus?.deficit}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Typography variant="caption" color="text.secondary">
                النافذة: {formatDate(summary.data.summary?.cycle?.start)} →{' '}
                {formatDate(summary.data.summary?.cycle?.end)} · عدد السجلات:{' '}
                {summary.data.summary?.recordCount || 0}
              </Typography>
            </Stack>
          )}
          {summaryLoading && !summary?.data && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSummary(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
