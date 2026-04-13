/**
 * Beneficiary List Page — صفحة قائمة المستفيدين
 *
 * قائمة قابلة للبحث والتصفية والترتيب لجميع المستفيدين
 * مع إمكانية الانتقال لملف 360°
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, TextField, InputAdornment,
  Chip, Avatar, Button, IconButton, Pagination, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, ToggleButtonGroup, ToggleButton, Stack, Skeleton,
  Alert, Menu, MenuItem, Select, FormControl, InputLabel,
  Tooltip, Badge, LinearProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

import { coreAPI } from '../../services/ddd';

/* ── Status map ── */
const STATUS_MAP = {
  active: { label: 'نشط', color: 'success' },
  inactive: { label: 'غير نشط', color: 'default' },
  discharged: { label: 'مُخرَج', color: 'warning' },
  transferred: { label: 'منقول', color: 'info' },
  suspended: { label: 'معلق', color: 'error' },
  waitlist: { label: 'قائمة الانتظار', color: 'secondary' },
};

/* ── Disability types ── */
const DISABILITY_TYPES = [
  { value: '', label: 'الكل' },
  { value: 'physical', label: 'حركية' },
  { value: 'intellectual', label: 'ذهنية' },
  { value: 'visual', label: 'بصرية' },
  { value: 'hearing', label: 'سمعية' },
  { value: 'speech', label: 'نطقية' },
  { value: 'autism', label: 'توحد' },
  { value: 'multiple', label: 'متعددة' },
];

export default function BeneficiaryListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [view, setView] = useState('table');

  // Filters
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [disabilityType, setDisabilityType] = useState(searchParams.get('type') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [perPage] = useState(20);

  /* ── Load data ── */
  const loadBeneficiaries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: perPage,
        ...(search && { search }),
        ...(status && { status }),
        ...(disabilityType && { disabilityType }),
      };
      const res = await coreAPI.list(params);
      const data = res?.data;

      if (Array.isArray(data)) {
        setBeneficiaries(data);
        setTotal(data.length);
      } else if (data?.data) {
        setBeneficiaries(data.data);
        setTotal(data.pagination?.total || data.total || data.data.length);
      } else {
        setBeneficiaries([]);
        setTotal(0);
      }
    } catch (err) {
      setError(err.message || 'خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, status, disabilityType]);

  useEffect(() => { loadBeneficiaries(); }, [loadBeneficiaries]);

  /* ── Update URL ── */
  useEffect(() => {
    const params = {};
    if (search) params.q = search;
    if (status) params.status = status;
    if (disabilityType) params.type = disabilityType;
    if (page > 1) params.page = page;
    setSearchParams(params, { replace: true });
  }, [search, status, disabilityType, page, setSearchParams]);

  /* ── Search debounce ── */
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setDisabilityType('');
    setPage(1);
  };

  const hasFilters = search || status || disabilityType;
  const pageCount = Math.ceil(total / perPage);

  const getAge = (dob) => {
    if (!dob) return '-';
    return Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
  };

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">المستفيدون</Typography>
          <Typography variant="body2" color="text.secondary">
            {total} مستفيد {hasFilters ? '(مُصفّى)' : 'مسجل'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/beneficiaries/new')}>
            إضافة مستفيد
          </Button>
          <Tooltip title="تصدير">
            <IconButton><DownloadIcon /></IconButton>
          </Tooltip>
          <Tooltip title="تحديث">
            <IconButton onClick={loadBeneficiaries}><RefreshIcon /></IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── Filters ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="بحث بالاسم أو رقم الملف أو الهوية..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                  endAdornment: searchInput && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchInput('')}><ClearIcon /></IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>الحالة</InputLabel>
                <Select value={status} label="الحالة" onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(STATUS_MAP).map(([val, { label }]) => (
                    <MenuItem key={val} value={val}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الإعاقة</InputLabel>
                <Select value={disabilityType} label="نوع الإعاقة" onChange={(e) => { setDisabilityType(e.target.value); setPage(1); }}>
                  {DISABILITY_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              {hasFilters && (
                <Button size="small" startIcon={<ClearIcon />} onClick={clearFilters}>مسح الفلاتر</Button>
              )}
            </Grid>
            <Grid item xs={6} md={2} sx={{ textAlign: 'left' }}>
              <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small">
                <ToggleButton value="table"><ListIcon /></ToggleButton>
                <ToggleButton value="grid"><GridIcon /></ToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ── Error ── */}
      {error && (
        <Alert severity="error" action={<Button onClick={loadBeneficiaries}>إعادة المحاولة</Button>} sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* ── Loading ── */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ── Table View ── */}
      {view === 'table' && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>المستفيد</TableCell>
                <TableCell>رقم الملف</TableCell>
                <TableCell>العمر</TableCell>
                <TableCell>نوع الإعاقة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الفرع</TableCell>
                <TableCell>آخر تحديث</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {beneficiaries.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">لا توجد نتائج</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                beneficiaries.map((b, i) => {
                  const st = STATUS_MAP[b.status] || { label: b.status || '-', color: 'default' };
                  return (
                    <TableRow
                      key={b._id || i}
                      hover
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => navigate(`/beneficiaries/${b._id}`)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                            {(b.name?.first || b.fullName || '?')[0]}
                          </Avatar>
                          <Typography variant="body2">
                            {b.name?.full || b.fullName || `${b.name?.first || ''} ${b.name?.last || ''}`}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Typography variant="body2">{b.fileNumber || '-'}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{getAge(b.dateOfBirth)}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{b.disabilityType || '-'}</Typography></TableCell>
                      <TableCell><Chip size="small" label={st.label} color={st.color} /></TableCell>
                      <TableCell><Typography variant="body2">{b.branch || '-'}</Typography></TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {b.updatedAt ? new Date(b.updatedAt).toLocaleDateString('ar-SA') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="عرض الملف الشامل">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/beneficiaries/${b._id}`); }}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Grid View ── */}
      {view === 'grid' && (
        <Grid container spacing={2}>
          {beneficiaries.length === 0 && !loading ? (
            <Grid item xs={12}><Alert severity="info">لا توجد نتائج</Alert></Grid>
          ) : (
            beneficiaries.map((b, i) => {
              const st = STATUS_MAP[b.status] || { label: b.status || '-', color: 'default' };
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={b._id || i}>
                  <Card
                    variant="outlined"
                    sx={{ cursor: 'pointer', '&:hover': { boxShadow: 2 }, transition: 'box-shadow .2s' }}
                    onClick={() => navigate(`/beneficiaries/${b._id}`)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {(b.name?.first || b.fullName || '?')[0]}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" fontWeight="bold" noWrap>
                            {b.name?.full || b.fullName || `${b.name?.first || ''} ${b.name?.last || ''}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {b.fileNumber || '-'} • {getAge(b.dateOfBirth)} سنة
                          </Typography>
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        <Chip size="small" label={st.label} color={st.color} />
                        {b.disabilityType && <Chip size="small" variant="outlined" label={b.disabilityType} />}
                        {b.branch && <Chip size="small" variant="outlined" label={b.branch} />}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })
          )}
        </Grid>
      )}

      {/* ── Pagination ── */}
      {pageCount > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}
    </Box>
  );
}
