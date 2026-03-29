/**
 * InsuranceManagement.js — صفحة إدارة التأمين السعودي
 * Saudi Insurance Management Page
 *
 * Features:
 * - Dashboard with insurance KPIs
 * - Full CRUD for insurance policies
 * - Claims management (submit, track, update)
 * - Insurance quotes from Saudi companies
 * - Expiring/expired policy alerts
 * - Saudi SAMA-regulated company integration
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Grid,
  Box,
  Button,
  Tab,
  Tabs,
  Card,
  CardContent,
  Chip,
  Paper,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  InputAdornment,
  Alert,
  Divider,
  Avatar,
  TablePagination,
  Stepper,
  Step,
  StepLabel,} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  WarningAmber as WarningIcon,
  CheckCircle as CheckIcon,
  Shield as ShieldIcon,
  Policy as PolicyIcon,
  Assessment as StatsIcon,
  Autorenew as RenewIcon,
  Receipt as ClaimIcon,
  RequestQuote as QuoteIcon,
  MonetizationOn as MoneyIcon,
  Business as CompanyIcon,
  TimerOff as ExpiredIcon,
  TrendingUp as TrendingUpIcon,
  NotificationsActive as AlertIcon,
  } from '@mui/icons-material';
import insuranceService from '../../services/insurance.service';

/* ─── Constants ──────────────────────────────────────────────────────── */
const TABS = [
  { label: 'لوحة التحكم', icon: <StatsIcon /> },
  { label: 'وثائق التأمين', icon: <PolicyIcon /> },
  { label: 'المطالبات', icon: <ClaimIcon /> },
  { label: 'عروض الأسعار', icon: <QuoteIcon /> },
];

const STATUS_COLORS = {
  active: 'success',
  expired: 'error',
  cancelled: 'default',
  pending_renewal: 'warning',
  suspended: 'error',
};

const STATUS_AR = {
  active: 'ساري',
  expired: 'منتهي',
  cancelled: 'ملغي',
  pending_renewal: 'بانتظار التجديد',
  suspended: 'موقوف',
};

const ALERT_COLORS = {
  expired: '#d32f2f',
  critical: '#f44336',
  high: '#ff9800',
  medium: '#ffc107',
  normal: '#4caf50',
};

const ALERT_AR = {
  expired: 'منتهي',
  critical: 'حرج',
  high: 'مرتفع',
  medium: 'متوسط',
  normal: 'طبيعي',
};

const TYPE_AR = {
  third_party: 'ضد الغير',
  comprehensive: 'شامل',
  premium: 'بريميوم',
};

const CLAIM_STATUS_AR = {
  submitted: 'مقدمة',
  under_review: 'قيد المراجعة',
  approved: 'مقبولة',
  rejected: 'مرفوضة',
  paid: 'مدفوعة',
  appealed: 'متظلم عليها',
  closed: 'مغلقة',
};

const CLAIM_STATUS_COLORS = {
  submitted: 'info',
  under_review: 'warning',
  approved: 'success',
  rejected: 'error',
  paid: 'success',
  appealed: 'warning',
  closed: 'default',
};

const CLAIM_TYPES = [
  { key: 'accident', label: 'حادث مروري' },
  { key: 'theft', label: 'سرقة' },
  { key: 'natural_disaster', label: 'كارثة طبيعية' },
  { key: 'fire', label: 'حريق' },
  { key: 'vandalism', label: 'تخريب' },
  { key: 'glass', label: 'كسر زجاج' },
  { key: 'tow', label: 'سحب / قطر' },
  { key: 'third_party_liability', label: 'مسؤولية الطرف الثالث' },
  { key: 'bodily_injury', label: 'إصابة جسدية' },
  { key: 'total_loss', label: 'خسارة كلية' },
];

const EMPTY_POLICY = {
  policyNumber: '',
  companyKey: '',
  policyType: 'third_party',
  startDate: '',
  endDate: '',
  premium: '',
  coverage: '',
  deductible: '',
  vehiclePlateNumber: '',
  vehicleMake: '',
  vehicleModel: '',
  vehicleYear: '',
  vehicleVIN: '',
  ownerName: '',
  ownerNationalId: '',
  ownerPhone: '',
};

const EMPTY_CLAIM = {
  type: 'accident',
  description: '',
  incidentDate: '',
  incidentLocation: '',
  estimatedDamage: '',
  najmReportNumber: '',
  policeReportNumber: '',
};

const EMPTY_QUOTE = {
  vehicleMake: '',
  vehicleModel: '',
  vehicleYear: new Date().getFullYear(),
  policyType: 'comprehensive',
  driverAge: 30,
  ncdYears: 0,
};

const fmt = n => (n ?? 0).toLocaleString('ar-SA');
const fmtSAR = n => `${fmt(n)} ر.س`;
const fmtDate = d => (d ? new Date(d).toLocaleDateString('ar-SA') : '—');

/* ═══════════════════════════════════════════════════════════════════════ */
export default function InsuranceManagement() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data
  const [stats, setStats] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [totalPolicies, setTotalPolicies] = useState(0);
  const [companies, setCompanies] = useState([]);
  const [expiringPolicies, setExpiringPolicies] = useState([]);
  const [quotes, setQuotes] = useState(null);

  // Filters & pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialogs
  const [policyDialog, setPolicyDialog] = useState(false);
  const [policyForm, setPolicyForm] = useState({ ...EMPTY_POLICY });
  const [editingPolicyId, setEditingPolicyId] = useState(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [claimDialog, setClaimDialog] = useState(false);
  const [claimForm, setClaimForm] = useState({ ...EMPTY_CLAIM });
  const [claimPolicyId, setClaimPolicyId] = useState(null);
  const [quoteDialog, setQuoteDialog] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ ...EMPTY_QUOTE });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletePolicyId, setDeletePolicyId] = useState(null);

  /* ─── Load companies once ─────────────────────────────────────────── */
  useEffect(() => {
    insuranceService
      .getCompanies()
      .then(r => setCompanies(r.data?.data || []))
      .catch(() => {});
  }, []);

  /* ─── Load data based on active tab ───────────────────────────────── */
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, expiringRes] = await Promise.all([
        insuranceService.getStatistics(),
        insuranceService.getExpiringPolicies(30),
      ]);
      setStats(statsRes.data?.data || null);
      setExpiringPolicies(expiringRes.data?.data || []);
    } catch {
      setError('خطأ في تحميل الإحصائيات');
    }
    setLoading(false);
  }, []);

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await insuranceService.getPolicies({
        page: page + 1,
        limit: rowsPerPage,
        search,
        status: statusFilter,
        companyKey: companyFilter,
        policyType: typeFilter,
      });
      const d = res.data?.data;
      setPolicies(d?.policies || []);
      setTotalPolicies(d?.total || 0);
    } catch {
      setError('خطأ في تحميل الوثائق');
    }
    setLoading(false);
  }, [page, rowsPerPage, search, statusFilter, companyFilter, typeFilter]);

  useEffect(() => {
    if (tab === 0) loadDashboard();
    else if (tab === 1) loadPolicies();
  }, [tab, loadDashboard, loadPolicies]);

  /* ─── Handlers ────────────────────────────────────────────────────── */
  const showSuccess = msg => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSavePolicy = async () => {
    setLoading(true);
    try {
      if (editingPolicyId) {
        await insuranceService.updatePolicy(editingPolicyId, policyForm);
        showSuccess('تم تحديث الوثيقة بنجاح');
      } else {
        await insuranceService.createPolicy(policyForm);
        showSuccess('تم إنشاء الوثيقة بنجاح');
      }
      setPolicyDialog(false);
      setPolicyForm({ ...EMPTY_POLICY });
      setEditingPolicyId(null);
      loadPolicies();
    } catch (e) {
      setError(e.response?.data?.message || 'فشل حفظ الوثيقة');
    }
    setLoading(false);
  };

  const handleDeletePolicy = async () => {
    try {
      await insuranceService.deletePolicy(deletePolicyId);
      showSuccess('تم حذف الوثيقة بنجاح');
      setDeleteDialog(false);
      setDeletePolicyId(null);
      loadPolicies();
    } catch {
      setError('فشل حذف الوثيقة');
    }
  };

  const handleSubmitClaim = async () => {
    setLoading(true);
    try {
      await insuranceService.addClaim(claimPolicyId, claimForm);
      showSuccess('تم تقديم المطالبة بنجاح');
      setClaimDialog(false);
      setClaimForm({ ...EMPTY_CLAIM });
      setClaimPolicyId(null);
    } catch (e) {
      setError(e.response?.data?.message || 'فشل تقديم المطالبة');
    }
    setLoading(false);
  };

  const handleGetQuotes = async () => {
    setLoading(true);
    try {
      const res = await insuranceService.getQuote(quoteForm);
      setQuotes(res.data?.data || null);
    } catch {
      setError('فشل الحصول على عروض الأسعار');
    }
    setLoading(false);
  };

  const handleRenewPolicy = async policyId => {
    setLoading(true);
    try {
      await insuranceService.renewPolicy(policyId, {});
      showSuccess('تم تجديد الوثيقة بنجاح');
      loadPolicies();
      if (tab === 0) loadDashboard();
    } catch (e) {
      setError(e.response?.data?.message || 'فشل تجديد الوثيقة');
    }
    setLoading(false);
  };

  const openEditPolicy = policy => {
    setPolicyForm({
      policyNumber: policy.policyNumber || '',
      companyKey: policy.companyKey || '',
      policyType: policy.policyType || 'third_party',
      startDate: policy.startDate?.substring(0, 10) || '',
      endDate: policy.endDate?.substring(0, 10) || '',
      premium: policy.premium || '',
      coverage: policy.coverage || '',
      deductible: policy.deductible || '',
      vehiclePlateNumber: policy.vehiclePlateNumber || '',
      vehicleMake: policy.vehicleMake || '',
      vehicleModel: policy.vehicleModel || '',
      vehicleYear: policy.vehicleYear || '',
      vehicleVIN: policy.vehicleVIN || '',
      ownerName: policy.ownerName || '',
      ownerNationalId: policy.ownerNationalId || '',
      ownerPhone: policy.ownerPhone || '',
    });
    setEditingPolicyId(policy._id);
    setPolicyDialog(true);
  };

  const openViewPolicy = async policy => {
    setSelectedPolicy(policy);
    // load claims too
    try {
      const res = await insuranceService.getPolicyClaims(policy._id);
      setSelectedPolicy(prev => ({ ...prev, claimsData: res.data?.data }));
    } catch {}
    setDetailDialog(true);
  };

  /* ═══════════════════════════════════════════════════════════════════ */
  /* RENDER: Dashboard Tab                                              */
  /* ═══════════════════════════════════════════════════════════════════ */
  const renderDashboard = () => {
    const o = stats?.overview || {};
    const kpis = [
      {
        label: 'إجمالي الوثائق',
        value: fmt(o.totalPolicies),
        icon: <PolicyIcon />,
        color: '#1976d2',
      },
      { label: 'سارية', value: fmt(o.activePolicies), icon: <CheckIcon />, color: '#4caf50' },
      { label: 'منتهية', value: fmt(o.expiredPolicies), icon: <ExpiredIcon />, color: '#d32f2f' },
      {
        label: 'تنتهي قريباً',
        value: fmt(o.expiringSoon),
        icon: <WarningIcon />,
        color: '#ff9800',
      },
      {
        label: 'إجمالي الأقساط',
        value: fmtSAR(o.totalPremiums),
        icon: <MoneyIcon />,
        color: '#00897b',
      },
      { label: 'المطالبات', value: fmt(o.totalClaims), icon: <ClaimIcon />, color: '#7b1fa2' },
      {
        label: 'المبالغ المدفوعة',
        value: fmtSAR(o.totalClaimPaid),
        icon: <MoneyIcon />,
        color: '#c62828',
      },
      {
        label: 'نسبة الخسائر',
        value: o.lossRatio || '0%',
        icon: <TrendingUpIcon />,
        color: '#f57c00',
      },
    ];

    return (
      <Box>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map((k, i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Card sx={{ textAlign: 'center', borderTop: `3px solid ${k.color}` }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Avatar
                    sx={{
                      bgcolor: k.color + '22',
                      color: k.color,
                      mx: 'auto',
                      mb: 1,
                      width: 40,
                      height: 40,
                    }}
                  >
                    {k.icon}
                  </Avatar>
                  <Typography variant="h5" fontWeight="bold">
                    {k.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {k.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Distribution by company & type */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                <CompanyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                توزيع حسب الشركة
              </Typography>
              <Divider sx={{ mb: 1 }} />
              {(stats?.byCompany || []).length === 0 ? (
                <Typography color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                  لا توجد بيانات
                </Typography>
              ) : (
                (stats?.byCompany || []).map((c, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 0.5,
                    }}
                  >
                    <Typography variant="body2">{c.nameAr || c.companyKey}</Typography>
                    <Box>
                      <Chip size="small" label={`${c.count} وثيقة`} sx={{ mr: 1 }} />
                      <Chip
                        size="small"
                        label={fmtSAR(c.totalPremium)}
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                ))
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                <ShieldIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                توزيع حسب النوع
              </Typography>
              <Divider sx={{ mb: 1 }} />
              {(stats?.byType || []).length === 0 ? (
                <Typography color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                  لا توجد بيانات
                </Typography>
              ) : (
                (stats?.byType || []).map((t, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 0.5,
                    }}
                  >
                    <Typography variant="body2">{t.typeAr || TYPE_AR[t.type] || t.type}</Typography>
                    <Box>
                      <Chip size="small" label={`${t.count} وثيقة`} sx={{ mr: 1 }} />
                      <Chip
                        size="small"
                        label={fmtSAR(t.totalPremium)}
                        color="secondary"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                ))
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Expiring Policies */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            <AlertIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#ff9800' }} />
            وثائق تنتهي خلال 30 يوم ({expiringPolicies.length})
          </Typography>
          <Divider sx={{ mb: 1 }} />
          {expiringPolicies.length === 0 ? (
            <Alert severity="success" sx={{ mt: 1 }}>
              جميع الوثائق سارية ولا يوجد وثائق تنتهي قريباً
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>رقم الوثيقة</TableCell>
                    <TableCell>الشركة</TableCell>
                    <TableCell>لوحة المركبة</TableCell>
                    <TableCell>المالك</TableCell>
                    <TableCell>تاريخ الانتهاء</TableCell>
                    <TableCell>الأيام المتبقية</TableCell>
                    <TableCell>إجراء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expiringPolicies.map((p, i) => (
                    <TableRow key={i} sx={{ bgcolor: ALERT_COLORS[p.alertLevel] + '11' }}>
                      <TableCell>{p.policyNumber}</TableCell>
                      <TableCell>{p.companyNameAr}</TableCell>
                      <TableCell>{p.vehiclePlateNumber || '—'}</TableCell>
                      <TableCell>{p.ownerName || '—'}</TableCell>
                      <TableCell>{fmtDate(p.endDate)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={`${p.daysRemaining} يوم`}
                          sx={{
                            bgcolor: ALERT_COLORS[p.alertLevel],
                            color: '#fff',
                            fontWeight: 'bold',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<RenewIcon />}
                          onClick={() => handleRenewPolicy(p._id)}
                        >
                          تجديد
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════ */
  /* RENDER: Policies Tab                                               */
  /* ═══════════════════════════════════════════════════════════════════ */
  const renderPolicies = () => (
    <Box>
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="بحث..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={statusFilter}
            label="الحالة"
            onChange={e => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(STATUS_AR).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>الشركة</InputLabel>
          <Select
            value={companyFilter}
            label="الشركة"
            onChange={e => {
              setCompanyFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">الكل</MenuItem>
            {companies.map(c => (
              <MenuItem key={c.key} value={c.key}>
                {c.nameAr}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>النوع</InputLabel>
          <Select
            value={typeFilter}
            label="النوع"
            onChange={e => {
              setTypeFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(TYPE_AR).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setPolicyForm({ ...EMPTY_POLICY });
            setEditingPolicyId(null);
            setPolicyDialog(true);
          }}
        >
          وثيقة جديدة
        </Button>
        <IconButton onClick={loadPolicies}>
          <RefreshIcon />
        </IconButton>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>رقم الوثيقة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الشركة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>لوحة المركبة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>المالك</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>من</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>إلى</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>القسط</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {policies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">لا توجد وثائق تأمين</Typography>
                </TableCell>
              </TableRow>
            ) : (
              policies.map(p => (
                <TableRow
                  key={p._id}
                  hover
                  sx={{
                    borderRight: `4px solid ${ALERT_COLORS[p.alertLevel] || '#4caf50'}`,
                  }}
                >
                  <TableCell sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {p.policyNumber}
                  </TableCell>
                  <TableCell>{p.companyNameAr || p.companyKey}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={TYPE_AR[p.policyType] || p.policyType}
                      color={
                        p.policyType === 'premium'
                          ? 'secondary'
                          : p.policyType === 'comprehensive'
                            ? 'primary'
                            : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>{p.vehiclePlateNumber || '—'}</TableCell>
                  <TableCell>{p.ownerName || '—'}</TableCell>
                  <TableCell>{fmtDate(p.startDate)}</TableCell>
                  <TableCell>{fmtDate(p.endDate)}</TableCell>
                  <TableCell>{fmtSAR(p.totalPremium || p.premium)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={STATUS_AR[p.status] || p.status}
                      color={STATUS_COLORS[p.status] || 'default'}
                    />
                    {p.daysRemaining > 0 && p.daysRemaining <= 30 && (
                      <Chip
                        size="small"
                        label={`${p.daysRemaining} يوم`}
                        sx={{
                          ml: 0.5,
                          bgcolor: ALERT_COLORS[p.alertLevel],
                          color: '#fff',
                          fontSize: 10,
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="عرض">
                      <IconButton size="small" onClick={() => openViewPolicy(p)}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="تعديل">
                      <IconButton size="small" onClick={() => openEditPolicy(p)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="مطالبة">
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => {
                          setClaimPolicyId(p._id);
                          setClaimForm({ ...EMPTY_CLAIM });
                          setClaimDialog(true);
                        }}
                      >
                        <ClaimIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="تجديد">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleRenewPolicy(p._id)}
                      >
                        <RenewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setDeletePolicyId(p._id);
                          setDeleteDialog(true);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalPolicies}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => {
            setRowsPerPage(parseInt(e.target.value));
            setPage(0);
          }}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
        />
      </TableContainer>
    </Box>
  );

  /* ═══════════════════════════════════════════════════════════════════ */
  /* RENDER: Claims Tab                                                 */
  /* ═══════════════════════════════════════════════════════════════════ */
  const renderClaims = () => {
    const claimSummary = stats?.claims || [];
    return (
      <Box>
        {/* Claims summary cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {claimSummary.map((c, i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Card>
                <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                  <Chip
                    label={CLAIM_STATUS_AR[c.status] || c.status}
                    color={CLAIM_STATUS_COLORS[c.status]}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="h5" fontWeight="bold">
                    {c.count}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.totalPaid > 0 && `مدفوع: ${fmtSAR(c.totalPaid)}`}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {claimSummary.length === 0 && (
            <Grid item xs={12}>
              <Alert severity="info">
                لا توجد مطالبات مسجلة حتى الآن. يمكنك تقديم مطالبة من تبويب الوثائق.
              </Alert>
            </Grid>
          )}
        </Grid>

        {/* Instructions */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            <ClaimIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            تقديم مطالبات التأمين
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stepper orientation="vertical" activeStep={-1}>
            {[
              {
                label: 'تحديد الوثيقة',
                desc: 'اختر وثيقة التأمين المرتبطة بالحادث من تبويب "وثائق التأمين"',
              },
              {
                label: 'تقديم المطالبة',
                desc: 'اضغط على أيقونة المطالبة 🔔 وأكمل البيانات (نوع المطالبة، الوصف، تقرير نجم)',
              },
              {
                label: 'مراجعة الشركة',
                desc: 'ستقوم شركة التأمين بمراجعة المطالبة وتحديد المبلغ المستحق',
              },
              {
                label: 'الدفع أو التظلم',
                desc: 'بعد الموافقة يتم الدفع مباشرة، أو يمكنك التظلم في حالة الرفض',
              },
            ].map((s, i) => (
              <Step key={i} active>
                <StepLabel>
                  <Typography fontWeight="bold">{s.label}</Typography>
                </StepLabel>
                <Typography variant="body2" color="text.secondary" sx={{ mr: 6 }}>
                  {s.desc}
                </Typography>
              </Step>
            ))}
          </Stepper>
        </Paper>
      </Box>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════ */
  /* RENDER: Quotes Tab                                                 */
  /* ═══════════════════════════════════════════════════════════════════ */
  const renderQuotes = () => (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <QuoteIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          طلب عرض سعر تأمين
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="نوع المركبة"
              value={quoteForm.vehicleMake}
              onChange={e => setQuoteForm(f => ({ ...f, vehicleMake: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="موديل المركبة"
              value={quoteForm.vehicleModel}
              onChange={e => setQuoteForm(f => ({ ...f, vehicleModel: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="سنة الصنع"
              type="number"
              value={quoteForm.vehicleYear}
              onChange={e => setQuoteForm(f => ({ ...f, vehicleYear: parseInt(e.target.value) }))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>نوع التأمين</InputLabel>
              <Select
                value={quoteForm.policyType}
                label="نوع التأمين"
                onChange={e => setQuoteForm(f => ({ ...f, policyType: e.target.value }))}
              >
                {Object.entries(TYPE_AR).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="عمر السائق"
              type="number"
              value={quoteForm.driverAge}
              onChange={e => setQuoteForm(f => ({ ...f, driverAge: parseInt(e.target.value) }))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="سنوات NCD (خصم عدم المطالبة)"
              type="number"
              value={quoteForm.ncdYears}
              onChange={e => setQuoteForm(f => ({ ...f, ncdYears: parseInt(e.target.value) }))}
              inputProps={{ min: 0, max: 10 }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              size="large"
              startIcon={<SearchIcon />}
              onClick={handleGetQuotes}
              disabled={loading}
            >
              مقارنة عروض الأسعار
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Quotes Results */}
      {quotes && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            نتائج المقارنة — {quotes.quotes?.length || 0} عروض
            <Typography variant="caption" sx={{ ml: 2 }}>
              خصم NCD: {quotes.ncdDiscount} | صالح حتى: {fmtDate(quotes.validUntil)}
            </Typography>
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {(quotes.quotes || []).map((q, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card
                  sx={{
                    border: i === 0 ? '2px solid #4caf50' : '1px solid #e0e0e0',
                    position: 'relative',
                  }}
                >
                  {i === 0 && (
                    <Chip
                      label="أفضل سعر"
                      color="success"
                      size="small"
                      sx={{ position: 'absolute', top: 8, left: 8 }}
                    />
                  )}
                  <CardContent>
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: '#1976d2', mx: 'auto', mb: 1, width: 48, height: 48 }}>
                        <CompanyIcon />
                      </Avatar>
                      <Typography variant="h6" fontWeight="bold">
                        {q.companyNameAr}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {q.companyNameEn} ({q.companyCode})
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">القسط الأساسي:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {fmtSAR(q.premium)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">ضريبة القيمة المضافة (15%):</Typography>
                      <Typography variant="body2">{fmtSAR(q.vat)}</Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 1,
                        bgcolor: '#f5f5f5',
                        p: 1,
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body1" fontWeight="bold">
                        الإجمالي:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold" color="primary">
                        {fmtSAR(q.total)}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      التغطية: {fmtSAR(q.coverage)} | التحمّل: {fmtSAR(q.deductible)}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" fontWeight="bold">
                      المميزات:
                    </Typography>
                    {(q.features || []).map((f, fi) => (
                      <Typography
                        key={fi}
                        variant="caption"
                        display="block"
                        sx={{ color: 'text.secondary' }}
                      >
                        ✓ {f}
                      </Typography>
                    ))}
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{ mt: 1.5 }}
                      onClick={() => {
                        setPolicyForm({
                          ...EMPTY_POLICY,
                          companyKey: q.companyKey,
                          policyType: quoteForm.policyType,
                          premium: q.premium,
                          coverage: q.coverage,
                          deductible: q.deductible,
                          vehicleMake: quoteForm.vehicleMake,
                          vehicleModel: quoteForm.vehicleModel,
                          vehicleYear: quoteForm.vehicleYear,
                        });
                        setEditingPolicyId(null);
                        setPolicyDialog(true);
                      }}
                    >
                      اختيار هذا العرض
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
    </Box>
  );

  /* ═══════════════════════════════════════════════════════════════════ */
  /* DIALOGS                                                            */
  /* ═══════════════════════════════════════════════════════════════════ */
  const renderPolicyDialog = () => (
    <Dialog open={policyDialog} onClose={() => setPolicyDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
        {editingPolicyId ? 'تعديل وثيقة التأمين' : 'وثيقة تأمين جديدة'}
        <IconButton onClick={() => setPolicyDialog(false)}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
          بيانات الوثيقة
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="رقم الوثيقة"
              value={policyForm.policyNumber}
              onChange={e => setPolicyForm(f => ({ ...f, policyNumber: e.target.value }))}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small" required>
              <InputLabel>شركة التأمين</InputLabel>
              <Select
                value={policyForm.companyKey}
                label="شركة التأمين"
                onChange={e => setPolicyForm(f => ({ ...f, companyKey: e.target.value }))}
              >
                {companies.map(c => (
                  <MenuItem key={c.key} value={c.key}>
                    {c.nameAr}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>نوع التأمين</InputLabel>
              <Select
                value={policyForm.policyType}
                label="نوع التأمين"
                onChange={e => setPolicyForm(f => ({ ...f, policyType: e.target.value }))}
              >
                {Object.entries(TYPE_AR).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="تاريخ البداية"
              type="date"
              value={policyForm.startDate}
              onChange={e => setPolicyForm(f => ({ ...f, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="تاريخ الانتهاء"
              type="date"
              value={policyForm.endDate}
              onChange={e => setPolicyForm(f => ({ ...f, endDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              fullWidth
              size="small"
              label="القسط (ر.س)"
              type="number"
              value={policyForm.premium}
              onChange={e => setPolicyForm(f => ({ ...f, premium: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              fullWidth
              size="small"
              label="التغطية (ر.س)"
              type="number"
              value={policyForm.coverage}
              onChange={e => setPolicyForm(f => ({ ...f, coverage: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              fullWidth
              size="small"
              label="التحمّل (ر.س)"
              type="number"
              value={policyForm.deductible}
              onChange={e => setPolicyForm(f => ({ ...f, deductible: e.target.value }))}
            />
          </Grid>
        </Grid>

        <Typography variant="subtitle2" color="primary" sx={{ mt: 2, mb: 1 }}>
          بيانات المركبة
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="رقم اللوحة"
              value={policyForm.vehiclePlateNumber}
              onChange={e => setPolicyForm(f => ({ ...f, vehiclePlateNumber: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="نوع المركبة"
              value={policyForm.vehicleMake}
              onChange={e => setPolicyForm(f => ({ ...f, vehicleMake: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="الموديل"
              value={policyForm.vehicleModel}
              onChange={e => setPolicyForm(f => ({ ...f, vehicleModel: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="سنة الصنع"
              type="number"
              value={policyForm.vehicleYear}
              onChange={e => setPolicyForm(f => ({ ...f, vehicleYear: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="رقم الهيكل (VIN)"
              value={policyForm.vehicleVIN}
              onChange={e => setPolicyForm(f => ({ ...f, vehicleVIN: e.target.value }))}
            />
          </Grid>
        </Grid>

        <Typography variant="subtitle2" color="primary" sx={{ mt: 2, mb: 1 }}>
          بيانات المالك
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="اسم المالك"
              value={policyForm.ownerName}
              onChange={e => setPolicyForm(f => ({ ...f, ownerName: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="رقم الهوية الوطنية"
              value={policyForm.ownerNationalId}
              onChange={e => setPolicyForm(f => ({ ...f, ownerNationalId: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="رقم الجوال"
              value={policyForm.ownerPhone}
              onChange={e => setPolicyForm(f => ({ ...f, ownerPhone: e.target.value }))}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setPolicyDialog(false)}>إلغاء</Button>
        <Button
          variant="contained"
          onClick={handleSavePolicy}
          disabled={loading || !policyForm.policyNumber || !policyForm.companyKey}
        >
          {editingPolicyId ? 'تحديث' : 'إنشاء'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderDetailDialog = () => {
    if (!selectedPolicy) return null;
    const p = selectedPolicy;
    const claims = p.claimsData?.claims || p.claims || [];

    return (
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box>
            <Typography variant="h6">تفاصيل الوثيقة: {p.policyNumber}</Typography>
            <Chip
              size="small"
              label={STATUS_AR[p.status] || p.status}
              color={STATUS_COLORS[p.status]}
              sx={{ mt: 0.5 }}
            />
          </Box>
          <IconButton onClick={() => setDetailDialog(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  بيانات الوثيقة
                </Typography>
                <Typography variant="body2">
                  الشركة: <strong>{p.companyNameAr || p.companyKey}</strong>
                </Typography>
                <Typography variant="body2">
                  النوع: <strong>{TYPE_AR[p.policyType]}</strong>
                </Typography>
                <Typography variant="body2">
                  من: <strong>{fmtDate(p.startDate)}</strong> — إلى:{' '}
                  <strong>{fmtDate(p.endDate)}</strong>
                </Typography>
                <Typography variant="body2">
                  الأيام المتبقية: <strong>{p.daysRemaining} يوم</strong>
                </Typography>
                <Chip
                  size="small"
                  label={ALERT_AR[p.alertLevel] || 'طبيعي'}
                  sx={{ mt: 0.5, bgcolor: ALERT_COLORS[p.alertLevel] || '#4caf50', color: '#fff' }}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  البيانات المالية
                </Typography>
                <Typography variant="body2">
                  القسط: <strong>{fmtSAR(p.premium)}</strong>
                </Typography>
                <Typography variant="body2">
                  ضريبة القيمة المضافة: <strong>{fmtSAR(p.vatAmount)}</strong>
                </Typography>
                <Typography variant="body2">
                  الإجمالي: <strong>{fmtSAR(p.totalPremium)}</strong>
                </Typography>
                <Typography variant="body2">
                  التغطية: <strong>{fmtSAR(p.coverage)}</strong>
                </Typography>
                <Typography variant="body2">
                  التحمّل: <strong>{fmtSAR(p.deductible)}</strong>
                </Typography>
                {p.ncd?.percentage > 0 && (
                  <Typography variant="body2">
                    خصم NCD:{' '}
                    <strong>
                      {p.ncd.percentage}% ({p.ncd.years} سنوات)
                    </strong>
                  </Typography>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  بيانات المركبة
                </Typography>
                <Typography variant="body2">
                  اللوحة: <strong>{p.vehiclePlateNumber || '—'}</strong>
                </Typography>
                <Typography variant="body2">
                  النوع:{' '}
                  <strong>
                    {p.vehicleMake} {p.vehicleModel} {p.vehicleYear}
                  </strong>
                </Typography>
                <Typography variant="body2">
                  رقم الهيكل: <strong>{p.vehicleVIN || '—'}</strong>
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  بيانات المالك
                </Typography>
                <Typography variant="body2">
                  الاسم: <strong>{p.ownerName || '—'}</strong>
                </Typography>
                <Typography variant="body2">
                  الهوية: <strong>{p.ownerNationalId || '—'}</strong>
                </Typography>
                <Typography variant="body2">
                  الجوال: <strong>{p.ownerPhone || '—'}</strong>
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Claims list */}
          <Typography variant="subtitle2" color="primary" sx={{ mt: 2, mb: 1 }}>
            المطالبات ({claims.length})
          </Typography>
          {claims.length === 0 ? (
            <Alert severity="info">لا توجد مطالبات على هذه الوثيقة</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>رقم المطالبة</TableCell>
                    <TableCell>النوع</TableCell>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>المبلغ المقدّر</TableCell>
                    <TableCell>المبلغ المدفوع</TableCell>
                    <TableCell>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {claims.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{c.claimNumber || '—'}</TableCell>
                      <TableCell>{c.typeAr || c.type}</TableCell>
                      <TableCell>{fmtDate(c.incidentDate || c.reportDate)}</TableCell>
                      <TableCell>{fmtSAR(c.estimatedDamage)}</TableCell>
                      <TableCell>{fmtSAR(c.paidAmount || c.approvedAmount || 0)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={c.statusAr || CLAIM_STATUS_AR[c.status] || c.status}
                          color={CLAIM_STATUS_COLORS[c.status]}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderClaimDialog = () => (
    <Dialog open={claimDialog} onClose={() => setClaimDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        تقديم مطالبة تأمين
        <IconButton
          sx={{ position: 'absolute', left: 8, top: 8 }}
          onClick={() => setClaimDialog(false)}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth size="small" required>
              <InputLabel>نوع المطالبة</InputLabel>
              <Select
                value={claimForm.type}
                label="نوع المطالبة"
                onChange={e => setClaimForm(f => ({ ...f, type: e.target.value }))}
              >
                {CLAIM_TYPES.map(t => (
                  <MenuItem key={t.key} value={t.key}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="وصف الحادث"
              multiline
              rows={3}
              value={claimForm.description}
              onChange={e => setClaimForm(f => ({ ...f, description: e.target.value }))}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="تاريخ الحادث"
              type="date"
              value={claimForm.incidentDate}
              onChange={e => setClaimForm(f => ({ ...f, incidentDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="الأضرار المقدّرة (ر.س)"
              type="number"
              value={claimForm.estimatedDamage}
              onChange={e => setClaimForm(f => ({ ...f, estimatedDamage: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="موقع الحادث"
              value={claimForm.incidentLocation}
              onChange={e => setClaimForm(f => ({ ...f, incidentLocation: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="رقم تقرير نجم"
              value={claimForm.najmReportNumber}
              onChange={e => setClaimForm(f => ({ ...f, najmReportNumber: e.target.value }))}
              helperText="رقم تقرير نجم للحوادث المرورية"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="رقم المحضر الشرطي"
              value={claimForm.policeReportNumber}
              onChange={e => setClaimForm(f => ({ ...f, policeReportNumber: e.target.value }))}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setClaimDialog(false)}>إلغاء</Button>
        <Button
          variant="contained"
          color="warning"
          onClick={handleSubmitClaim}
          disabled={loading || !claimForm.type || !claimForm.description || !claimForm.incidentDate}
        >
          تقديم المطالبة
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderDeleteDialog = () => (
    <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
      <DialogTitle>تأكيد الحذف</DialogTitle>
      <DialogContent>
        <Typography>هل أنت متأكد من حذف هذه الوثيقة؟ لا يمكن التراجع عن هذا الإجراء.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteDialog(false)}>إلغاء</Button>
        <Button variant="contained" color="error" onClick={handleDeletePolicy}>
          حذف
        </Button>
      </DialogActions>
    </Dialog>
  );

  /* ═══════════════════════════════════════════════════════════════════ */
  /* MAIN RENDER                                                        */
  /* ═══════════════════════════════════════════════════════════════════ */
  return (
    <Container maxWidth="xl" sx={{ py: 3 }} dir="rtl">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            <ShieldIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 36 }} />
            إدارة التأمين السعودي
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة شاملة لوثائق التأمين — شركات تأمين سعودية معتمدة من ساما — المطالبات — التجديد —
            عروض الأسعار
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setPolicyForm({ ...EMPTY_POLICY });
            setEditingPolicyId(null);
            setPolicyDialog(true);
          }}
        >
          وثيقة جديدة
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {TABS.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tab Content */}
      {tab === 0 && renderDashboard()}
      {tab === 1 && renderPolicies()}
      {tab === 2 && renderClaims()}
      {tab === 3 && renderQuotes()}

      {/* Dialogs */}
      {renderPolicyDialog()}
      {renderDetailDialog()}
      {renderClaimDialog()}
      {renderDeleteDialog()}
    </Container>
  );
}
