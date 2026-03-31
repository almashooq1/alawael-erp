/**
 * Audit Logs Dashboard — سجلات التدقيق المحسّنة
 *
 * Enhanced Audit Log Viewer:
 * - عرض جميع عمليات النظام مع تتبع ZATCA/NPHIES/Muqeem/GOSI
 * - فلاتر متقدمة: المستخدم، الوحدة، العملية، الفرع، التاريخ
 * - إحصائيات ومخططات الاستخدام
 * - تصدير السجلات
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, TextField,
  Alert, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, MenuItem,
  Pagination, IconButton, Tooltip, Collapse,
} from '@mui/material';
import {
  ManageSearch as AuditIcon,
  Refresh as RefreshIcon,
  Download as ExportIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Receipt as ZatcaIcon,
  HealthAndSafety as NphiesIcon,
  CreditCard as MuqeemIcon,
  AccountBalance as GosiIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API = axios.create({ baseURL: '/api/audit-logs', withCredentials: true });

const MODULE_OPTIONS = [
  { value: '', label: 'جميع الوحدات' },
  { value: 'beneficiary', label: 'المستفيدون' },
  { value: 'clinical', label: 'السريري' },
  { value: 'finance', label: 'المالية' },
  { value: 'hr', label: 'الموارد البشرية' },
  { value: 'transport', label: 'النقل' },
  { value: 'zatca', label: 'ZATCA' },
  { value: 'nphies', label: 'NPHIES' },
  { value: 'muqeem', label: 'مقيم' },
  { value: 'gosi', label: 'GOSI' },
  { value: 'auth', label: 'المصادقة' },
  { value: 'settings', label: 'الإعدادات' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'جميع العمليات' },
  { value: 'CREATE', label: 'إنشاء' },
  { value: 'UPDATE', label: 'تعديل' },
  { value: 'DELETE', label: 'حذف' },
  { value: 'LOGIN', label: 'تسجيل دخول' },
  { value: 'LOGOUT', label: 'تسجيل خروج' },
  { value: 'VIEW', label: 'عرض' },
  { value: 'EXPORT', label: 'تصدير' },
  { value: 'ZATCA_SUBMIT', label: 'إرسال ZATCA' },
  { value: 'NPHIES_CLAIM', label: 'مطالبة NPHIES' },
  { value: 'MUQEEM_QUERY', label: 'استعلام مقيم' },
];

const ActionChip = ({ action }) => {
  const map = {
    CREATE: 'success', UPDATE: 'info', DELETE: 'error',
    LOGIN: 'primary', LOGOUT: 'default',
    ZATCA_SUBMIT: 'warning', NPHIES_CLAIM: 'secondary',
    MUQEEM_QUERY: 'info', GOSI_SYNC: 'primary',
  };
  return <Chip label={action || '—'} color={map[action] || 'default'} size="small" />;
};

const IntegrationBadges = ({ log }) => (
  <Box display="flex" gap={0.5}>
    {log.zatcaRelated && <Tooltip title="ZATCA"><ZatcaIcon fontSize="small" color="warning" /></Tooltip>}
    {log.nphiesRelated && <Tooltip title="NPHIES"><NphiesIcon fontSize="small" color="secondary" /></Tooltip>}
    {log.muqeemRelated && <Tooltip title="مقيم"><MuqeemIcon fontSize="small" color="info" /></Tooltip>}
    {log.gosiRelated && <Tooltip title="GOSI"><GosiIcon fontSize="small" color="primary" /></Tooltip>}
  </Box>
);

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  const [filters, setFilters] = useState({
    module: '',
    action: '',
    userId: '',
    startDate: '',
    endDate: '',
    success: '',
    search: '',
  });

  const loadLogs = useCallback(async (pg = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: pg, limit: 20 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await API.get('/', { params });
      const data = res?.data?.data || res?.data || {};
      setLogs(Array.isArray(data.logs) ? data.logs : Array.isArray(data) ? data : []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل تحميل سجلات التدقيق');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadStats = useCallback(async () => {
    try {
      const res = await API.get('/stats');
      setStats(res?.data?.data || res?.data || null);
    } catch {
      // ignore stats error
    }
  }, []);

  useEffect(() => {
    loadLogs(1);
    loadStats();
  }, []); // eslint-disable-line

  const handleSearch = () => {
    setPage(1);
    loadLogs(1);
    loadStats();
  };

  const handlePageChange = (_, pg) => {
    setPage(pg);
    loadLogs(pg);
  };

  const handleExport = async () => {
    try {
      const params = { format: 'csv', ...filters };
      const res = await API.get('/', { params: { ...params, limit: 10000 }, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('فشل تصدير السجلات');
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <Card>
      <CardContent sx={{ py: 2 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box sx={{ color }}>{icon}</Box>
          <Box>
            <Typography variant="h5" fontWeight="bold">{value ?? '—'}</Typography>
            <Typography variant="caption" color="text.secondary">{title}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box p={3} dir="rtl">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            <AuditIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            سجلات التدقيق
          </Typography>
          <Typography color="text.secondary">
            مراقبة وتتبع جميع العمليات والأحداث في النظام
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'إخفاء الفلاتر' : 'إظهار الفلاتر'}
          </Button>
          <Button variant="outlined" startIcon={<ExportIcon />} onClick={handleExport}>
            تصدير CSV
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { loadLogs(page); loadStats(); }}>
            تحديث
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} sm={3}>
            <StatCard title="إجمالي العمليات" value={stats.total?.toLocaleString()} icon={<AuditIcon />} color="primary.main" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard title="ناجحة" value={stats.successful?.toLocaleString()} icon={<SuccessIcon />} color="success.main" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard title="فاشلة" value={stats.failed?.toLocaleString()} icon={<ErrorIcon />} color="error.main" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard title="عمليات التكامل" value={stats.integrationEvents?.toLocaleString()} icon={<SecurityIcon />} color="warning.main" />
          </Grid>
        </Grid>
      )}

      {/* Integration Stats Row */}
      {stats && (
        <Grid container spacing={2} mb={3}>
          {[
            { label: 'ZATCA', value: stats.zatcaEvents, icon: <ZatcaIcon />, color: 'warning.main' },
            { label: 'NPHIES', value: stats.nphiesEvents, icon: <NphiesIcon />, color: 'secondary.main' },
            { label: 'مقيم', value: stats.muqeemEvents, icon: <MuqeemIcon />, color: 'info.main' },
            { label: 'GOSI', value: stats.gosiEvents, icon: <GosiIcon />, color: 'primary.main' },
          ].map(({ label, value, icon, color }) => value !== undefined && (
            <Grid item xs={6} sm={3} key={label}>
              <StatCard title={label} value={value?.toLocaleString()} icon={icon} color={color} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Filters */}
      <Collapse in={showFilters}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" mb={2} fontWeight="medium">فلاتر البحث</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth size="small" label="الوحدة" select
                  value={filters.module} onChange={(e) => setFilters({ ...filters, module: e.target.value })}>
                  {MODULE_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth size="small" label="نوع العملية" select
                  value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
                  {ACTION_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth size="small" label="الحالة" select
                  value={filters.success} onChange={(e) => setFilters({ ...filters, success: e.target.value })}>
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="true">ناجحة</MenuItem>
                  <MenuItem value="false">فاشلة</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth size="small" label="المستخدم (ID أو email)"
                  value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth size="small" label="من تاريخ" type="date"
                  value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth size="small" label="إلى تاريخ" type="date"
                  value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField fullWidth size="small" label="بحث نصي (endpoint / resource)"
                  value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Button variant="contained" fullWidth onClick={handleSearch} sx={{ height: '40px' }}>
                  بحث
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Button variant="outlined" fullWidth onClick={() => {
                  setFilters({ module: '', action: '', userId: '', startDate: '', endDate: '', success: '', search: '' });
                }} sx={{ height: '40px' }}>
                  مسح
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Collapse>

      {/* Results */}
      <Card>
        <CardContent sx={{ pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1">
              النتائج: <strong>{totalCount.toLocaleString()}</strong> سجل
            </Typography>
          </Box>

          {loading ? (
            <Box textAlign="center" py={5}><CircularProgress /></Box>
          ) : logs.length === 0 ? (
            <Box textAlign="center" py={5} color="text.secondary">
              <InfoIcon sx={{ fontSize: 64, opacity: 0.3, mb: 1 }} />
              <Typography>لا توجد سجلات مطابقة للفلاتر المحددة</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ width: 30 }} />
                    <TableCell>التاريخ والوقت</TableCell>
                    <TableCell>المستخدم</TableCell>
                    <TableCell>العملية</TableCell>
                    <TableCell>الوحدة</TableCell>
                    <TableCell>الطلب</TableCell>
                    <TableCell align="center">الكود</TableCell>
                    <TableCell align="center">الحالة</TableCell>
                    <TableCell align="center">التكامل</TableCell>
                    <TableCell align="center">المدة (ms)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log, idx) => (
                    <React.Fragment key={log._id || idx}>
                      <TableRow
                        hover
                        sx={{ cursor: 'pointer', bgcolor: log.success === false ? 'error.light' : 'inherit' }}
                        onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                      >
                        <TableCell>
                          <IconButton size="small">
                            {expandedRow === idx ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                          </IconButton>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                          {log.timestamp
                            ? new Date(log.timestamp).toLocaleString('ar-SA', { hour12: false })
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">{log.userEmail || log.userId || '—'}</Typography>
                          {log.userRole && <Typography variant="caption" color="text.secondary">{log.userRole}</Typography>}
                        </TableCell>
                        <TableCell><ActionChip action={log.action} /></TableCell>
                        <TableCell>
                          <Chip label={log.module || '—'} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell sx={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Tooltip title={`${log.method || ''} ${log.endpoint || ''}`}>
                            <span dir="ltr">{log.method} {log.endpoint}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={log.statusCode || '—'}
                            size="small"
                            color={log.statusCode < 400 ? 'success' : log.statusCode < 500 ? 'warning' : 'error'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          {log.success !== undefined ? (
                            log.success
                              ? <SuccessIcon color="success" fontSize="small" />
                              : <ErrorIcon color="error" fontSize="small" />
                          ) : '—'}
                        </TableCell>
                        <TableCell align="center">
                          <IntegrationBadges log={log} />
                        </TableCell>
                        <TableCell align="center" sx={{ fontSize: 12 }}>
                          {log.duration ? `${log.duration}ms` : '—'}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Details */}
                      <TableRow>
                        <TableCell colSpan={10} sx={{ p: 0, border: 0 }}>
                          <Collapse in={expandedRow === idx} timeout="auto" unmountOnExit>
                            <Box p={2} bgcolor="grey.50" borderRadius={1} m={1}>
                              <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                  <Typography variant="caption" color="text.secondary">عنوان IP</Typography>
                                  <Typography variant="body2" dir="ltr">{log.userIp || '—'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                  <Typography variant="caption" color="text.secondary">الفرع</Typography>
                                  <Typography variant="body2">{log.branchId || '—'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                  <Typography variant="caption" color="text.secondary">نوع المورد</Typography>
                                  <Typography variant="body2">{log.resourceType || '—'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                  <Typography variant="caption" color="text.secondary">معرف المورد</Typography>
                                  <Typography variant="body2" dir="ltr">{log.resourceId || '—'}</Typography>
                                </Grid>
                                {log.requestBody && Object.keys(log.requestBody).length > 0 && (
                                  <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary">بيانات الطلب</Typography>
                                    <Box
                                      component="pre"
                                      sx={{ fontSize: 11, bgcolor: 'grey.200', p: 1, borderRadius: 1, overflowX: 'auto', dir: 'ltr', mt: 0.5, maxHeight: 150 }}
                                    >
                                      {JSON.stringify(log.requestBody, null, 2)}
                                    </Box>
                                  </Grid>
                                )}
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
