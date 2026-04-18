/**
 * AdminAdapterAudit — /admin/adapter-audit page.
 *
 * PDPL-compliance viewer over /api/admin/adapter-audit. Access is
 * gated to admin/superadmin/compliance_officer/dpo on the server.
 *
 * The audit rows never contain raw PII — `targetHash` is a one-way
 * SHA-256. Operators confirm "was this ID accessed?" by hashing a
 * candidate ID client-side and filtering; they cannot enumerate IDs
 * from the log itself.
 *
 * Tabs:
 *   • نظرة عامة — 30-day rollup (per-provider counts, success rate,
 *     avg latency, top actors)
 *   • السجل — paginated filterable list
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
  Button,
  IconButton,
  Paper,
  Alert,
  LinearProgress,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BlockIcon from '@mui/icons-material/Block';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ClearIcon from '@mui/icons-material/Clear';
import SecurityIcon from '@mui/icons-material/Security';
import HubIcon from '@mui/icons-material/Hub';
import api from '../../services/api.client';

const PROVIDERS = [
  'gosi',
  'scfhs',
  'absher',
  'qiwa',
  'nafath',
  'fatoora',
  'muqeem',
  'nphies',
  'wasel',
  'balady',
];

function StatusChip({ row }) {
  if (row.status === 'rate_limited') {
    return (
      <Chip
        size="small"
        icon={<BlockIcon />}
        label="تم رفضه بسبب الحد"
        color="warning"
        variant="outlined"
      />
    );
  }
  if (row.success) {
    return (
      <Chip
        size="small"
        icon={<CheckCircleOutlineIcon />}
        label={row.status || 'نجح'}
        color="success"
        variant="outlined"
      />
    );
  }
  return (
    <Chip
      size="small"
      icon={<ErrorOutlineIcon />}
      label={row.status || 'فشل'}
      color="error"
      variant="outlined"
    />
  );
}

function OverviewTab({ stats, loading }) {
  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!stats) return null;
  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                إجمالي الاستدعاءات
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {stats.total?.toLocaleString('ar-SA') || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                آخر 30 يومًا
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {stats.last30days?.toLocaleString('ar-SA') || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                نسبة النجاح
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {stats.overallSuccessRate != null ? `${stats.overallSuccessRate}%` : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                المزودون النشطون
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {stats.byProvider?.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            توزيع الاستدعاءات حسب المزوّد — آخر 30 يومًا
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>المزوّد</TableCell>
                  <TableCell align="center">عدد الاستدعاءات</TableCell>
                  <TableCell align="center">ناجحة</TableCell>
                  <TableCell align="center">نسبة النجاح</TableCell>
                  <TableCell align="center">متوسط الزمن (ms)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(stats.byProvider || []).map(p => (
                  <TableRow key={p.provider} hover>
                    <TableCell>
                      <Typography fontWeight={600} textTransform="uppercase">
                        {p.provider}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{p.count?.toLocaleString('ar-SA')}</TableCell>
                    <TableCell align="center">{p.successCount?.toLocaleString('ar-SA')}</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={p.successRate != null ? `${p.successRate}%` : '—'}
                        color={
                          p.successRate == null
                            ? 'default'
                            : p.successRate >= 95
                              ? 'success'
                              : p.successRate >= 80
                                ? 'warning'
                                : 'error'
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">{p.avgLatencyMs ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {(!stats.byProvider || stats.byProvider.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        لا توجد استدعاءات خلال 30 يومًا.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            أكثر الفاعلين استدعاءً — آخر 30 يومًا
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>المُستخدم</TableCell>
                  <TableCell align="center">عدد الاستدعاءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(stats.topActors || []).map(a => (
                  <TableRow key={a.actorEmail} hover>
                    <TableCell>{a.actorEmail}</TableCell>
                    <TableCell align="center">{a.count?.toLocaleString('ar-SA')}</TableCell>
                  </TableRow>
                ))}
                {(!stats.topActors || stats.topActors.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={2} align="center">
                      <Typography variant="body2" color="text.secondary">
                        لا بيانات.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Stack>
  );
}

function LogTab({ rows, total, page, limit, filters, loading, onPage, onLimit, onFilters }) {
  const [local, setLocal] = useState(filters);
  const [cascadeCid, setCascadeCid] = useState(null);
  const [cascadeRows, setCascadeRows] = useState([]);
  const [cascadeLoading, setCascadeLoading] = useState(false);
  useEffect(() => setLocal(filters), [filters]);

  const openCascade = useCallback(async cid => {
    setCascadeCid(cid);
    setCascadeLoading(true);
    try {
      const resp = await api.get(`/admin/adapter-audit/by-correlation/${encodeURIComponent(cid)}`);
      setCascadeRows(resp.data.items || []);
    } catch {
      setCascadeRows([]);
    } finally {
      setCascadeLoading(false);
    }
  }, []);

  const closeCascade = () => {
    setCascadeCid(null);
    setCascadeRows([]);
  };

  const applyFilters = () => onFilters(local);
  const clearFilters = () => {
    const empty = { provider: '', actorEmail: '', success: '', from: '', to: '' };
    setLocal(empty);
    onFilters(empty);
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ md: 'center' }}
          flexWrap="wrap"
          useFlexGap
        >
          <TextField
            select
            size="small"
            label="المزوّد"
            value={local.provider}
            onChange={e => setLocal({ ...local, provider: e.target.value })}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {PROVIDERS.map(p => (
              <MenuItem key={p} value={p}>
                {p.toUpperCase()}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="بريد المستخدم"
            value={local.actorEmail}
            onChange={e => setLocal({ ...local, actorEmail: e.target.value })}
            sx={{ minWidth: 200 }}
          />
          <TextField
            select
            size="small"
            label="النتيجة"
            value={local.success}
            onChange={e => setLocal({ ...local, success: e.target.value })}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="">الكل</MenuItem>
            <MenuItem value="true">ناجحة</MenuItem>
            <MenuItem value="false">فاشلة</MenuItem>
          </TextField>
          <TextField
            type="date"
            size="small"
            label="من تاريخ"
            InputLabelProps={{ shrink: true }}
            value={local.from}
            onChange={e => setLocal({ ...local, from: e.target.value })}
          />
          <TextField
            type="date"
            size="small"
            label="إلى تاريخ"
            InputLabelProps={{ shrink: true }}
            value={local.to}
            onChange={e => setLocal({ ...local, to: e.target.value })}
          />
          <Button variant="contained" startIcon={<FilterAltIcon />} onClick={applyFilters}>
            تصفية
          </Button>
          <Button startIcon={<ClearIcon />} onClick={clearFilters}>
            مسح
          </Button>
        </Stack>
      </Paper>

      <Card>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الوقت</TableCell>
                <TableCell>المزوّد</TableCell>
                <TableCell>العملية</TableCell>
                <TableCell>المستخدم</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الوضع</TableCell>
                <TableCell align="center">الزمن (ms)</TableCell>
                <TableCell>
                  <Tooltip title="التجزئة SHA-256 للمعرّف المُستعلَم — PDPL-آمن">
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                      <FingerprintIcon fontSize="small" sx={{ mr: 0.5 }} />
                      التجزئة
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="الطلب المرتبط — يعرض جميع استدعاءات نفس الطلب">
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                      <HubIcon fontSize="small" />
                    </Box>
                  </Tooltip>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r._id} hover>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(r.createdAt).toLocaleString('ar-SA')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={r.provider?.toUpperCase()}
                      variant="outlined"
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{r.operation}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{r.actorEmail || '—'}</Typography>
                    {r.actorRole && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {r.actorRole}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusChip row={r} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={r.mode || '—'}
                      color={r.mode === 'live' ? 'error' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">{r.latencyMs ?? '—'}</TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                    >
                      {r.targetHash ? `${r.targetHash.slice(0, 10)}…` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {r.correlationId ? (
                      <Tooltip title={`عرض كل استدعاءات الطلب (${r.correlationId.slice(0, 10)}…)`}>
                        <IconButton size="small" onClick={() => openCascade(r.correlationId)}>
                          <HubIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      لا توجد سجلات مطابقة.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page - 1}
          onPageChange={(_, newPage) => onPage(newPage + 1)}
          rowsPerPage={limit}
          onRowsPerPageChange={e => onLimit(parseInt(e.target.value, 10))}
          rowsPerPageOptions={[25, 50, 100, 200]}
          labelRowsPerPage="لكل صفحة:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
        />
      </Card>

      <Dialog open={Boolean(cascadeCid)} onClose={closeCascade} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <HubIcon color="primary" />
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                استدعاءات الطلب الواحد
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }} color="text.secondary">
                {cascadeCid}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {cascadeLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : cascadeRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              لا توجد سجلات مرتبطة.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الوقت</TableCell>
                  <TableCell>المزوّد</TableCell>
                  <TableCell>العملية</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="center">الزمن (ms)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cascadeRows.map(r => (
                  <TableRow key={r._id}>
                    <TableCell>
                      <Typography variant="caption">
                        {new Date(r.createdAt).toLocaleTimeString('ar-SA')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={r.provider?.toUpperCase()} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{r.operation}</Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip row={r} />
                    </TableCell>
                    <TableCell align="center">{r.latencyMs ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCascade}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default function AdminAdapterAudit() {
  const [tab, setTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [filters, setFilters] = useState({
    provider: '',
    actorEmail: '',
    success: '',
    from: '',
    to: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    try {
      const resp = await api.get('/admin/adapter-audit/stats');
      setStats(resp.data);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'فشل تحميل الإحصائيات');
    }
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const resp = await api.get('/admin/adapter-audit', { params });
      setRows(resp.data.items || []);
      setTotal(resp.data.pagination?.total || 0);
      setError('');
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'فشل تحميل السجل');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (tab === 1) loadRows();
  }, [tab, loadRows]);

  const onFilters = useCallback(newF => {
    setFilters(newF);
    setPage(1);
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <SecurityIcon color="primary" />
            <Typography variant="h5" fontWeight={700}>
              سجل تدقيق التكاملات الحكومية (PDPL)
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            كل استعلام لأي مزوّد حكومي مُسجَّل هنا مع تجزئة SHA-256 للمعرّف — لا تُحفظ المعرّفات
            الخام مطلقًا. مدة الحفظ: 730 يومًا.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            component="a"
            href={(() => {
              const params = new URLSearchParams();
              Object.entries(filters).forEach(([k, v]) => {
                if (v) params.set(k, v);
              });
              const qs = params.toString();
              return `/api/admin/adapter-audit/export.csv${qs ? `?${qs}` : ''}`;
            })()}
            target="_blank"
            rel="noopener"
          >
            تصدير CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => (tab === 0 ? loadStats() : loadRows())}
          >
            تحديث
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="نظرة عامة" />
          <Tab label="السجل" />
        </Tabs>
      </Paper>

      {tab === 0 && <OverviewTab stats={stats} loading={loading && !stats} />}
      {tab === 1 && (
        <LogTab
          rows={rows}
          total={total}
          page={page}
          limit={limit}
          filters={filters}
          loading={loading}
          onPage={setPage}
          onLimit={l => {
            setLimit(l);
            setPage(1);
          }}
          onFilters={onFilters}
        />
      )}
    </Container>
  );
}
