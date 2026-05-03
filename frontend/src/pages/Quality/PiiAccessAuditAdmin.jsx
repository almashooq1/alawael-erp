/**
 * PiiAccessAuditAdmin.jsx — DPO query interface for the PII access
 * audit log. Answers the PDPL Article 13 question "who viewed user X's
 * record?" — backed by `middleware/piiAccess.middleware.js`.
 *
 * Backend: /api/admin/pii-access-audit
 *
 * Two query modes:
 *   1. Browse mode — filter the global access log by target type +
 *      time window. The DPO uses this to spot patterns ("who's been
 *      reading a lot of beneficiary records lately?").
 *   2. Targeted mode — "who viewed THIS specific record" — given
 *      a target type + id, return distinct viewers with counts and
 *      first/last seen timestamps. This is the audit-response mode
 *      the DPO runs when responding to an Article 4 access request.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  Tooltip,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  CircularProgress,
  Button,
  Tabs,
  Tab,
  Grid,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  History as HistoryIcon,
  PersonSearch as TargetIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api.client';
import { useSnackbar } from 'contexts/SnackbarContext';

const TARGET_TYPES = ['Beneficiary', 'Invoice', 'NphiesClaim', 'Employee', 'MedicalRecord'];

function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toISOString().slice(0, 16).replace('T', ' ');
  } catch {
    return String(v);
  }
}

export default function PiiAccessAuditAdmin() {
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);

  // Browse mode
  const [filterTargetType, setFilterTargetType] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [browseRows, setBrowseRows] = useState([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browseLoading, setBrowseLoading] = useState(false);

  // Targeted mode
  const [tgtType, setTgtType] = useState('Beneficiary');
  const [tgtId, setTgtId] = useState('');
  const [tgtDays, setTgtDays] = useState(90);
  const [report, setReport] = useState(null);
  const [tgtLoading, setTgtLoading] = useState(false);

  const browseLoad = useCallback(async () => {
    setBrowseLoading(true);
    try {
      const params = {};
      if (filterTargetType) params.targetType = filterTargetType;
      if (filterUserId) params.userId = filterUserId;
      if (filterFromDate) params.fromDate = filterFromDate;
      if (filterToDate) params.toDate = filterToDate;
      const { data } = await apiClient.get('/admin/pii-access-audit', { params });
      setBrowseRows(data?.data || []);
      setBrowseTotal(data?.total || 0);
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'تعذّر تحميل السجل', 'error');
    } finally {
      setBrowseLoading(false);
    }
  }, [filterTargetType, filterUserId, filterFromDate, filterToDate, showSnackbar]);

  useEffect(() => {
    if (tab === 0) browseLoad();
  }, [tab, browseLoad]);

  const runTargetedQuery = async () => {
    if (!tgtType || !tgtId.trim()) return;
    setTgtLoading(true);
    setReport(null);
    try {
      const { data } = await apiClient.get('/admin/pii-access-audit/by-target', {
        params: { targetType: tgtType, targetId: tgtId.trim(), days: tgtDays },
      });
      setReport(data);
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'تعذّر تشغيل الاستعلام', 'error');
    } finally {
      setTgtLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <HistoryIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          سجل الوصول إلى البيانات الشخصية (PDPL مادة 13)
        </Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        كل قراءة لسجل بيانات شخصية حساس (مستفيد، فاتورة، مطالبة تأمينية) تُسجَّل تلقائياً. الـ DPO
        يستخدم هذه الصفحة للإجابة على "من اطّلع على ملف فلان؟" — متطلب أساسي لمساءلة PDPL مادة 13.
      </Typography>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab icon={<HistoryIcon />} iconPosition="start" label="استعراض السجل" />
          <Tab icon={<TargetIcon />} iconPosition="start" label="من اطّلع على سجل محدّد؟" />
        </Tabs>
      </Paper>

      {/* ── Tab 0: Browse mode ──────────────────────────────────────── */}
      {tab === 0 && (
        <>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField
                select
                size="small"
                label="نوع البيانات"
                value={filterTargetType}
                onChange={e => setFilterTargetType(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">الكل</MenuItem>
                {TARGET_TYPES.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label="معرّف المستخدم"
                value={filterUserId}
                onChange={e => setFilterUserId(e.target.value)}
                sx={{ minWidth: 220 }}
                placeholder="(اختياري)"
              />
              <TextField
                size="small"
                type="date"
                label="من تاريخ"
                value={filterFromDate}
                onChange={e => setFilterFromDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                size="small"
                type="date"
                label="إلى تاريخ"
                value={filterToDate}
                onChange={e => setFilterToDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <Button variant="contained" startIcon={<SearchIcon />} onClick={browseLoad}>
                بحث
              </Button>
              <Box sx={{ flex: 1 }} />
              <Chip label={`${browseTotal} سجل وصول`} size="small" />
            </Stack>
          </Paper>

          <TableContainer component={Paper}>
            <Table size="small" aria-label="جدول وصول PII">
              <TableHead>
                <TableRow>
                  <TableCell>الوقت</TableCell>
                  <TableCell>المستخدم</TableCell>
                  <TableCell>نوع البيانات</TableCell>
                  <TableCell>المعرّف المستهدف</TableCell>
                  <TableCell>الإجراء</TableCell>
                  <TableCell>IP</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {browseLoading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress size={24} aria-label="جاري التحميل" />
                    </TableCell>
                  </TableRow>
                )}
                {!browseLoading && browseRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        لا توجد سجلات وصول تطابق الفلتر
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {browseRows.map(row => (
                  <TableRow key={row._id} hover>
                    <TableCell>{fmtDate(row.createdAt)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>
                      <Typography variant="body2" noWrap>
                        {row.userId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.metadata?.targetType || '—'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>
                      <Tooltip title={row.metadata?.targetId || ''}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {row.metadata?.targetId || '—'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{row.metadata?.method || '—'}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{row.ipAddress || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* ── Tab 1: Targeted mode ────────────────────────────────────── */}
      {tab === 1 && (
        <>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField
                select
                size="small"
                label="نوع البيانات"
                value={tgtType}
                onChange={e => setTgtType(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                {TARGET_TYPES.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label="معرّف السجل"
                value={tgtId}
                onChange={e => setTgtId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runTargetedQuery()}
                placeholder="64b8a2f9c12e3a5d8e0f1234"
                sx={{ minWidth: 280 }}
                required
              />
              <TextField
                select
                size="small"
                label="النافذة"
                value={tgtDays}
                onChange={e => setTgtDays(Number(e.target.value))}
                sx={{ width: 130 }}
              >
                {[7, 30, 60, 90, 180, 365].map(d => (
                  <MenuItem key={d} value={d}>
                    {d} يوم
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                startIcon={tgtLoading ? <CircularProgress size={16} /> : <SearchIcon />}
                onClick={runTargetedQuery}
                disabled={tgtLoading || !tgtId.trim()}
              >
                استعلام
              </Button>
            </Stack>
          </Paper>

          {report && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700}>
                      {report.totalAccesses}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      مرّات الوصول
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700}>
                      {report.uniqueViewers}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      عدد المُطّلعين الفريدين
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      السجل المستهدف
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                    >
                      {report.target?.type}: {report.target?.id}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 1 }}
                    >
                      نافذة الـ {report.windowDays} يوم
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {report.viewers && report.viewers.length > 0 && (
                <Paper>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ p: 2 }}>
                    المُطّلعون الفريدون
                  </Typography>
                  <TableContainer>
                    <Table size="small" aria-label="جدول المُطّلعين">
                      <TableHead>
                        <TableRow>
                          <TableCell>المستخدم</TableCell>
                          <TableCell>عدد الزيارات</TableCell>
                          <TableCell>أول زيارة</TableCell>
                          <TableCell>آخر زيارة</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {report.viewers.map(v => (
                          <TableRow key={v.userId}>
                            <TableCell sx={{ fontFamily: 'monospace' }}>{v.userId}</TableCell>
                            <TableCell>
                              <Chip size="small" label={v.count} />
                            </TableCell>
                            <TableCell>{fmtDate(v.firstSeen)}</TableCell>
                            <TableCell>{fmtDate(v.lastSeen)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}

              {report.totalAccesses === 0 && (
                <Alert severity="info">
                  لم يطّلع أحد على هذا السجل خلال آخر {report.windowDays} يوم.
                </Alert>
              )}
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}
