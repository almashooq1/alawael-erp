/**
 * CredentialExpiryAdmin — إدارة صلاحية اعتمادات الكوادر الصحية
 * BC-07 | CBAHI | SCFHS | إدارة الموارد البشرية
 *
 * Endpoints:
 *   GET /api/admin/hr/compliance/credential-expiry?days=90
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  TextField,
  InputAdornment,
} from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';

import apiClient from '../../api/apiClient';

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_EMPLOYEES = [
  {
    _id: 'e1',
    fullName: 'محمد عبدالله الحربي',
    jobTitle: 'أخصائي تخاطب',
    employeeCode: 'EMP-0041',
    scfhs_expiry: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // expired 7 days ago
    iqama_expiry: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    national_id_expiry: null,
    passport_expiry: null,
  },
  {
    _id: 'e2',
    fullName: 'سارة محمد الزهراني',
    jobTitle: 'أخصائية نفسية',
    employeeCode: 'EMP-0088',
    scfhs_expiry: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), // expires in 20 days
    iqama_expiry: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // expired 3 days ago
    national_id_expiry: null,
    passport_expiry: null,
  },
  {
    _id: 'e3',
    fullName: 'فيصل علي القحطاني',
    jobTitle: 'معالج طبيعي',
    employeeCode: 'EMP-0102',
    scfhs_expiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    iqama_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    national_id_expiry: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    passport_expiry: null,
  },
  {
    _id: 'e4',
    fullName: 'نورة أحمد الشمري',
    jobTitle: 'معالجة وظيفية',
    employeeCode: 'EMP-0055',
    scfhs_expiry: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // expired 30 days ago
    iqama_expiry: null,
    national_id_expiry: null,
    passport_expiry: null,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const FIELDS = [
  { key: 'scfhs_expiry', label: 'SCFHS', critical: true },
  { key: 'iqama_expiry', label: 'الإقامة', critical: true },
  { key: 'national_id_expiry', label: 'الهوية الوطنية', critical: false },
  { key: 'passport_expiry', label: 'جواز السفر', critical: false },
];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - Date.now()) / (1000 * 60 * 60 * 24));
}

function ExpiryChip({ dateStr, label }) {
  if (!dateStr)
    return <Chip label="—" size="small" sx={{ bgcolor: 'grey.100', color: 'grey.500' }} />;
  const days = daysUntil(dateStr);
  if (days < 0)
    return (
      <Tooltip title={`منتهي منذ ${Math.abs(days)} يوم`}>
        <Chip
          icon={<ErrorOutlineIcon />}
          label={`${label}: منتهي`}
          size="small"
          color="error"
          sx={{ fontWeight: 'bold' }}
        />
      </Tooltip>
    );
  if (days <= 30)
    return (
      <Tooltip title={`ينتهي خلال ${days} يوم`}>
        <Chip
          icon={<WarningAmberIcon />}
          label={`${label}: ${days}ي`}
          size="small"
          color="warning"
        />
      </Tooltip>
    );
  return (
    <Tooltip title={`صالح لـ ${days} يوم`}>
      <Chip label={`${label}: ${days}ي`} size="small" color="success" variant="outlined" />
    </Tooltip>
  );
}

function getWorstStatus(emp) {
  for (const f of FIELDS) {
    if (!emp[f.key]) continue;
    const d = daysUntil(emp[f.key]);
    if (d < 0) return 'expired';
  }
  for (const f of FIELDS) {
    if (!emp[f.key]) continue;
    const d = daysUntil(emp[f.key]);
    if (d <= 30) return 'expiring_soon';
  }
  return 'ok';
}

function SummaryCard({ label, count, icon, color }) {
  return (
    <Card elevation={2} sx={{ borderRadius: 2, borderTop: `3px solid ${color}` }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ bgcolor: color, borderRadius: 2, p: 1, display: 'flex' }}>{icon}</Box>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            {count}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CredentialExpiryAdmin() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  const [days, setDays] = useState(90);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(15);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/admin/hr/compliance/credential-expiry?days=${days}`);
      setEmployees(res.data?.data || res.data || []);
      setDemoMode(false);
    } catch {
      setEmployees(DEMO_EMPLOYEES);
      setDemoMode(true);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = employees.filter(emp => {
    const st = getWorstStatus(emp);
    if (filterStatus === 'expired' && st !== 'expired') return false;
    if (filterStatus === 'expiring_soon' && st !== 'expiring_soon') return false;
    if (filterStatus === 'ok' && st !== 'ok') return false;
    if (search && !emp.fullName?.includes(search) && !emp.employeeCode?.includes(search))
      return false;
    return true;
  });

  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const expiredCount = employees.filter(e => getWorstStatus(e) === 'expired').length;
  const expiringSoonCount = employees.filter(e => getWorstStatus(e) === 'expiring_soon').length;
  const okCount = employees.filter(e => getWorstStatus(e) === 'ok').length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedUserIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              صلاحية اعتمادات الكوادر الصحية
            </Typography>
            <Typography variant="body2" color="text.secondary">
              مراقبة SCFHS + إقامة + هوية وطنية — BC-07
            </Typography>
          </Box>
        </Box>
        <Tooltip title="تحديث">
          <IconButton onClick={loadData}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {demoMode && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          عرض بيانات تجريبية — الخادم غير متاح حالياً
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <SummaryCard
            label="اعتمادات منتهية الصلاحية"
            count={expiredCount}
            icon={<ErrorOutlineIcon sx={{ color: '#fff' }} />}
            color="#c62828"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <SummaryCard
            label="تنتهي خلال 30 يوم"
            count={expiringSoonCount}
            icon={<WarningAmberIcon sx={{ color: '#fff' }} />}
            color="#e65100"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <SummaryCard
            label="اعتمادات سارية"
            count={okCount}
            icon={<VerifiedUserIcon sx={{ color: '#fff' }} />}
            color="#2e7d32"
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="البحث بالاسم أو الرقم الوظيفي"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 240 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={filterStatus}
            label="الحالة"
            onChange={e => setFilterStatus(e.target.value)}
          >
            <MenuItem value="all">الكل ({employees.length})</MenuItem>
            <MenuItem value="expired">منتهية ({expiredCount})</MenuItem>
            <MenuItem value="expiring_soon">قريبة الانتهاء ({expiringSoonCount})</MenuItem>
            <MenuItem value="ok">سارية ({okCount})</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>نطاق الأيام</InputLabel>
          <Select value={days} label="نطاق الأيام" onChange={e => setDays(e.target.value)}>
            <MenuItem value={30}>30 يوم</MenuItem>
            <MenuItem value={60}>60 يوم</MenuItem>
            <MenuItem value={90}>90 يوم</MenuItem>
            <MenuItem value={180}>180 يوم</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'grey.50' }}>
            <TableRow>
              <TableCell>الرقم الوظيفي</TableCell>
              <TableCell>الاسم</TableCell>
              <TableCell>المسمى الوظيفي</TableCell>
              <TableCell>SCFHS</TableCell>
              <TableCell>الإقامة</TableCell>
              <TableCell>الهوية الوطنية</TableCell>
              <TableCell>جواز السفر</TableCell>
              <TableCell>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  <PersonIcon
                    sx={{
                      fontSize: 40,
                      mb: 1,
                      display: 'block',
                      mx: 'auto',
                      color: 'text.disabled',
                    }}
                  />
                  لا توجد نتائج
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map(emp => {
                const st = getWorstStatus(emp);
                return (
                  <TableRow
                    key={emp._id}
                    hover
                    sx={{
                      bgcolor:
                        st === 'expired'
                          ? '#ffebee'
                          : st === 'expiring_soon'
                            ? '#fff8e1'
                            : 'inherit',
                    }}
                  >
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {emp.employeeCode || '—'}
                    </TableCell>
                    <TableCell>{emp.fullName}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {emp.jobTitle || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <ExpiryChip dateStr={emp.scfhs_expiry} label="SCFHS" />
                    </TableCell>
                    <TableCell>
                      <ExpiryChip dateStr={emp.iqama_expiry} label="إقامة" />
                    </TableCell>
                    <TableCell>
                      <ExpiryChip dateStr={emp.national_id_expiry} label="هوية" />
                    </TableCell>
                    <TableCell>
                      <ExpiryChip dateStr={emp.passport_expiry} label="جواز" />
                    </TableCell>
                    <TableCell>
                      {st === 'expired' && (
                        <Chip
                          label="منتهي"
                          color="error"
                          size="small"
                          icon={<ErrorOutlineIcon />}
                        />
                      )}
                      {st === 'expiring_soon' && (
                        <Chip
                          label="قريب الانتهاء"
                          color="warning"
                          size="small"
                          icon={<WarningAmberIcon />}
                        />
                      )}
                      {st === 'ok' && (
                        <Chip label="ساري" color="success" size="small" variant="outlined" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[15]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
        />
      </TableContainer>
    </Box>
  );
}
