/**
 * صفحة قائمة المستفيدين المحسّنة — النسخة الشاملة
 * Enhanced Beneficiaries List Page — Comprehensive v3
 *
 * Features:
 * - Toggle between table / card views
 * - Server-side pagination with real API data
 * - Advanced multi-filter (status, category, gender, age, city)
 * - Active filter chips with quick remove
 * - Debounced search across name, nationalId, phone, email, MRN
 * - Sortable table columns
 * - Expandable row details (guardian, contact, therapist, notes)
 * - Quick actions per row (view, edit, WhatsApp, call, change status, archive)
 * - Inline status change via chip dropdown
 * - Bulk operations (archive, export, change status)
 * - At-risk badge for beneficiaries needing attention
 * - Color-coded progress bars
 * - Print-friendly view
 * - Export to CSV
 * - Quick stats summary at top
 * - Arabic RTL support
 * - Responsive design
 *
 * @version 3.0.0
 * @date 2026-03-23
 */

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import {
  Box, Container, Grid, Card, CardContent, Typography, Button, TextField,
  InputAdornment, IconButton, Chip, Avatar, MenuItem, Select, FormControl,
  InputLabel, Stack, Alert, Snackbar, Skeleton, Fade, Tooltip, Pagination,
  ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TableSortLabel, Checkbox, LinearProgress, Collapse,
  Paper, Menu, ListItemIcon, ListItemText, Divider, Badge, Dialog,
  DialogTitle, DialogContent, DialogActions, Slider,
} from '@mui/material';
import {
  Search, Download, PersonAdd, CheckCircle, Pending, TrendingUp as TrendingUpIcon,
  GridView, ViewList, Refresh, Groups, MoreVert, KeyboardArrowDown, KeyboardArrowUp,
  Star, StarBorder, Edit, Visibility, Delete, Archive, Unarchive, Phone,
  WhatsApp, Email as EmailIcon, FilterList, Print, Warning, Close, Clear,
  Description, Send, CalendarMonth, LocalHospital, FamilyRestroom,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'contexts/SnackbarContext';
import { gradients, brandColors, surfaceColors, statusColors, neutralColors } from 'theme/palette';
import beneficiaryService from 'services/beneficiaryService';
import { styled } from '@mui/material/styles';
import { visuallyHidden } from '@mui/utils';

// ── Styled Components ────────────────────────────
const GradientHeader = styled(Box)(() => ({
  background: gradients.primary,
  borderRadius: '0 0 28px 28px',
  padding: '28px 24px 52px',
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""', position: 'absolute', top: -30, right: -30,
    width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
  },
}));

const KpiCard = styled(Card)(({ gradient }) => ({
  background: gradient,
  color: 'white',
  borderRadius: 16,
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
}));

// ── Constants ────────────────────────────────────
const STATUS_LABELS = {
  active: 'نشط', pending: 'قيد الانتظار', inactive: 'غير نشط',
  transferred: 'محوّل', graduated: 'متخرج', deceased: 'متوفي',
};
const STATUS_COLORS = {
  active: statusColors.success, pending: statusColors.warning, inactive: statusColors.error,
  transferred: statusColors.info, graduated: statusColors.purple || '#9c27b0', deceased: '#616161',
};
const CATEGORY_LABELS = {
  physical: 'حركية', mental: 'ذهنية', sensory: 'حسية',
  multiple: 'متعددة', learning: 'تعلم', speech: 'نطق', other: 'أخرى',
};
const CATEGORY_COLORS = {
  physical: statusColors.info, mental: statusColors.pink || '#e91e63',
  sensory: statusColors.warning, multiple: statusColors.purple || '#9c27b0',
  learning: '#ff9800', speech: '#00bcd4', other: neutralColors.fallback,
};
const GENDER_LABELS = { male: 'ذكر', female: 'أنثى' };
const ROWS_PER_PAGE = 15;

const columns = [
  { id: 'name', label: 'الاسم', sortable: true, minWidth: 200 },
  { id: 'nationalId', label: 'رقم الهوية', sortable: true, minWidth: 120 },
  { id: 'age', label: 'العمر', sortable: true, minWidth: 70 },
  { id: 'gender', label: 'الجنس', sortable: true, minWidth: 70 },
  { id: 'category', label: 'الفئة', sortable: true, minWidth: 100 },
  { id: 'status', label: 'الحالة', sortable: true, minWidth: 100 },
  { id: 'progress', label: 'التقدم', sortable: true, minWidth: 130 },
  { id: 'phone', label: 'الهاتف', sortable: false, minWidth: 140 },
  { id: 'guardian', label: 'ولي الأمر', sortable: false, minWidth: 140 },
  { id: 'lastVisit', label: 'آخر زيارة', sortable: true, minWidth: 110 },
  { id: 'actions', label: 'الإجراءات', sortable: false, minWidth: 120 },
];

// ── Helper: format date in Arabic ─────────────────
const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(d));
  } catch { return String(d).slice(0, 10); }
};

// ── Helper: compute age ────────────────────────────
const computeAge = (dob) => {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
};

// ── Helper: normalize beneficiary data ─────────────
const normalize = (b) => ({
  ...b,
  id: b._id || b.id,
  name: b.fullName || b.name || b.fullNameArabic || `${b.firstName_ar || b.firstName || ''} ${b.lastName_ar || b.lastName || ''}`.trim() || '—',
  nameEn: b.fullNameEnglish || b.nameEn || `${b.firstName_en || b.firstName || ''} ${b.lastName_en || b.lastName || ''}`.trim() || '',
  age: b.age || computeAge(b.dateOfBirth) || null,
  phone: b.contactInfo?.primaryPhone || b.phone || '',
  email: b.contactInfo?.email || b.email || '',
  guardian: b.familyMembers?.find(f => f.isPrimaryCaregiver || f.hasLegalGuardianship)
    || b.emergencyContacts?.[0] || null,
  guardianName: (() => {
    const g = b.familyMembers?.find(f => f.isPrimaryCaregiver || f.hasLegalGuardianship)
      || b.emergencyContacts?.[0];
    if (!g) return b.guardian || '—';
    return g.name || `${g.firstName || ''} ${g.lastName || ''}`.trim() || '—';
  })(),
  guardianPhone: (() => {
    const g = b.familyMembers?.find(f => f.isPrimaryCaregiver || f.hasLegalGuardianship)
      || b.emergencyContacts?.[0];
    return g?.phone || b.guardianPhone || '';
  })(),
  category: b.category || b.disability?.type || 'other',
  status: b.status || 'active',
  progress: b.progress || 0,
  sessions: b.sessions || b.totalSessions || 0,
  completedSessions: b.completedSessions || 0,
  joinDate: b.registrationDate || b.joinDate || b.createdAt || '',
  lastVisit: b.lastVisit || '',
  therapist: b.therapist || '',
  address: b.address?.city || b.address?.street || b.address || '',
  notes: b.generalNotes || b.notes || '',
  isAtRisk: (b.attendanceRate != null && b.attendanceRate < 75) || (b.progress != null && b.progress < 30)
    || (b.academicScore != null && b.academicScore < 50),
});

// ═════════════════════════════════════════════════════════════════
//  COMPONENT
// ═════════════════════════════════════════════════════════════════
const BeneficiariesListPage = () => {
  const showSnackbar = useSnackbar();
  const navigate = useNavigate();
  const searchTimeout = useRef(null);

  // ── Data State ──────────────────────────────────
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [atRiskIds, setAtRiskIds] = useState(new Set());

  // ── Search & Filter State ──────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
    status: 'all', category: 'all', gender: 'all', ageRange: 'all', city: '',
  });
  const [cities, setCities] = useState([]);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState('all');

  // ── View State ──────────────────────────────────
  const [viewMode, setViewMode] = useState('table');
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [selected, setSelected] = useState([]);
  const [openRow, setOpenRow] = useState(null);

  // ── Menu State ──────────────────────────────────
  const [actionMenu, setActionMenu] = useState(null);
  const [actionRow, setActionRow] = useState(null);
  const [statusMenu, setStatusMenu] = useState(null);
  const [statusRow, setStatusRow] = useState(null);
  const [bulkStatusMenu, setBulkStatusMenu] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // ── Statistics State ────────────────────────────
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, inactive: 0, newThisMonth: 0, atRisk: 0 });

  // ── Debounced Search ────────────────────────────
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery]);

  // ── Load Cities ─────────────────────────────────
  useEffect(() => {
    beneficiaryService.getCities().then(res => {
      const data = res?.data?.data || res?.data || [];
      if (Array.isArray(data)) setCities(data);
    }).catch(() => {});
  }, []);

  // ── Load At-Risk IDs ────────────────────────────
  useEffect(() => {
    beneficiaryService.getAtRisk(200).then(res => {
      const data = res?.data?.data || res?.data || [];
      if (Array.isArray(data)) {
        setAtRiskIds(new Set(data.map(b => b._id || b.id)));
        setStats(prev => ({ ...prev, atRisk: data.length }));
      }
    }).catch(() => {});
  }, []);

  // ── Load Data (server-side pagination) ──────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: ROWS_PER_PAGE,
        sort: order === 'desc' ? `-${orderBy}` : orderBy,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.category !== 'all') params.category = filters.category;
      if (filters.gender !== 'all') params.gender = filters.gender;
      if (filters.city) params.city = filters.city;
      if (filters.ageRange !== 'all') {
        const [min, max] = filters.ageRange.split('-');
        params.minAge = min;
        params.maxAge = max;
      }
      // Quick filter override
      if (quickFilter === 'at-risk') {
        // We'll filter client-side after load for at-risk
      }

      const res = await beneficiaryService.getAll(params);
      const rawData = res?.data?.data || res?.data || res?.beneficiaries || res || [];
      const pagination = res?.data?.pagination;
      const list = Array.isArray(rawData) ? rawData.map(normalize) : [];

      // Mark at-risk
      list.forEach(b => {
        if (atRiskIds.has(b.id)) b.isAtRisk = true;
      });

      setBeneficiaries(list);
      setTotalCount(pagination?.total || list.length);
    } catch {
      showSnackbar('خطأ في تحميل بيانات المستفيدين', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, orderBy, order, debouncedSearch, filters, quickFilter, atRiskIds, showSnackbar]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Load Statistics ─────────────────────────────
  useEffect(() => {
    beneficiaryService.getStatistics().then(res => {
      const d = res?.data?.data || res?.data;
      if (d) {
        setStats(prev => ({
          total: d.total || 0,
          active: d.byStatus?.active || d.active || 0,
          pending: d.byStatus?.pending || d.pending || 0,
          inactive: d.byStatus?.inactive || d.inactive || 0,
          newThisMonth: d.newThisMonth || 0,
          atRisk: prev.atRisk,
        }));
      }
    }).catch(() => {});
  }, []);

  // ── Computed ────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(totalCount / ROWS_PER_PAGE));
  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    (k === 'city' ? v !== '' : v !== 'all')
  ).length + (debouncedSearch ? 1 : 0);

  // ── Sorting ─────────────────────────────────────
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(1);
  };

  // ── Selection ───────────────────────────────────
  const handleSelectAll = (event) => {
    if (event.target.checked) setSelected(beneficiaries.map(b => b.id));
    else setSelected([]);
  };
  const handleSelectOne = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };
  const isSelected = (id) => selected.includes(id);

  // ── Quick Filter ────────────────────────────────
  const handleQuickFilter = (_, val) => {
    if (!val) return;
    setQuickFilter(val);
    setPage(1);
    if (val === 'all') setFilters(prev => ({ ...prev, status: 'all' }));
    else if (val === 'at-risk') setFilters(prev => ({ ...prev, status: 'all' }));
    else setFilters(prev => ({ ...prev, status: val }));
  };

  // ── Clear Filters ───────────────────────────────
  const clearAllFilters = () => {
    setFilters({ status: 'all', category: 'all', gender: 'all', ageRange: 'all', city: '' });
    setSearchQuery('');
    setDebouncedSearch('');
    setQuickFilter('all');
    setPage(1);
  };

  // ── Actions ─────────────────────────────────────
  const handleView = (id) => navigate(`/beneficiary-portal/${id}`);
  const handleEdit = (id) => navigate(`/beneficiary-portal/${id}`);
  const handleAdd = () => navigate('/student-registration');

  const handleStatusChange = async (id, newStatus) => {
    try {
      await beneficiaryService.updateStatus(id, newStatus);
      showSnackbar('تم تحديث حالة المستفيد', 'success');
      loadData();
    } catch { showSnackbar('فشل في تحديث الحالة', 'error'); }
    setStatusMenu(null);
  };

  const handleArchive = async (id) => {
    if (!window.confirm('هل أنت متأكد من أرشفة هذا المستفيد؟')) return;
    try {
      await beneficiaryService.remove(id, 'أرشفة من قائمة المستفيدين');
      showSnackbar('تم أرشفة المستفيد بنجاح', 'success');
      loadData();
    } catch { showSnackbar('فشل في أرشفة المستفيد', 'error'); }
  };

  const handleExport = async () => {
    try {
      const res = await beneficiaryService.exportData({ format: 'csv' });
      const blob = res?.data || res;
      if (blob instanceof Blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `beneficiaries-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        window.URL.revokeObjectURL(url);
      }
      showSnackbar('تم تصدير البيانات بنجاح', 'success');
    } catch { showSnackbar('فشل في تصدير البيانات', 'error'); }
  };

  const handlePrint = () => window.print();

  // ── Bulk Actions ────────────────────────────────
  const handleBulkArchive = async () => {
    if (!window.confirm(`هل تريد أرشفة ${selected.length} مستفيد؟`)) return;
    try {
      await beneficiaryService.bulkAction('delete', selected, { reason: 'أرشفة جماعية' });
      showSnackbar(`تم أرشفة ${selected.length} مستفيد`, 'success');
      setSelected([]);
      loadData();
    } catch { showSnackbar('فشل في الأرشفة الجماعية', 'error'); }
  };

  const handleBulkStatusChange = async (newStatus) => {
    try {
      await beneficiaryService.bulkAction('update-status', selected, { status: newStatus });
      showSnackbar(`تم تحديث حالة ${selected.length} مستفيد`, 'success');
      setSelected([]);
      loadData();
    } catch { showSnackbar('فشل في تحديث الحالة', 'error'); }
    setBulkStatusMenu(null);
  };

  const handleWhatsApp = (phone) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, '');
    const num = clean.startsWith('0') ? `966${clean.slice(1)}` : clean;
    window.open(`https://wa.me/${num}`, '_blank');
  };

  const handleCall = (phone) => {
    if (phone) window.open(`tel:${phone}`, '_self');
  };

  // ═════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: surfaceColors.brandTint }} className="beneficiaries-list-page">
      {/* ── Gradient Header ──────────────── */}
      <GradientHeader>
        <Container maxWidth="xl">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                قائمة المستفيدين
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                إدارة شاملة لبيانات المستفيدين — {stats.total} مستفيد مسجل
                {stats.atRisk > 0 && ` | ${stats.atRisk} يحتاجون متابعة`}
              </Typography>
            </Grid>
            <Grid item xs={12} md={5}>
              <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap">
                <Tooltip title="تحديث"><IconButton onClick={loadData} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)' }}><Refresh /></IconButton></Tooltip>
                <Tooltip title="طباعة"><IconButton onClick={handlePrint} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)' }}><Print /></IconButton></Tooltip>
                <Button variant="outlined" startIcon={<Download />} onClick={handleExport}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}>تصدير CSV</Button>
                <Button variant="contained" startIcon={<PersonAdd />} onClick={handleAdd}
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', fontWeight: 'bold' }}>إضافة مستفيد</Button>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </GradientHeader>

      <Container maxWidth="xl" sx={{ mt: -3, position: 'relative', zIndex: 2, pb: 6 }}>
        {/* ── KPI Strip ──────────────────── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'إجمالي', value: stats.total, icon: <Groups />, gradient: gradients.primary },
            { label: 'نشطين', value: stats.active, icon: <CheckCircle />, gradient: gradients.success },
            { label: 'قيد الانتظار', value: stats.pending, icon: <Pending />, gradient: gradients.warning },
            { label: 'غير نشطين', value: stats.inactive, icon: <Close />, gradient: gradients.error || '#e53935' },
            { label: 'جدد هذا الشهر', value: stats.newThisMonth, icon: <TrendingUpIcon />, gradient: gradients.info },
            { label: 'يحتاجون متابعة', value: stats.atRisk, icon: <Warning />, gradient: 'linear-gradient(135deg, #ff6b6b, #ee5a24)' },
          ].map((kpi, idx) => (
            <Grid item xs={6} sm={4} md={2} key={idx}>
              <KpiCard gradient={kpi.gradient} elevation={0}>
                <CardContent sx={{ py: 2, px: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="h5" fontWeight="bold">{loading ? '—' : kpi.value}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>{kpi.label}</Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>{kpi.icon}</Avatar>
                  </Box>
                </CardContent>
              </KpiCard>
            </Grid>
          ))}
        </Grid>

        {/* ── Quick Filter Tabs ──────────── */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <ToggleButtonGroup size="small" value={quickFilter} exclusive onChange={handleQuickFilter}
            sx={{ '& .MuiToggleButton-root': { borderRadius: 2, px: 2 } }}>
            <ToggleButton value="all">الكل ({stats.total})</ToggleButton>
            <ToggleButton value="active">نشط ({stats.active})</ToggleButton>
            <ToggleButton value="pending">انتظار ({stats.pending})</ToggleButton>
            <ToggleButton value="inactive">غير نشط ({stats.inactive})</ToggleButton>
            <ToggleButton value="at-risk" sx={{ color: 'error.main' }}>
              <Warning sx={{ fontSize: 18, mr: 0.5 }} /> يحتاج متابعة ({stats.atRisk})
            </ToggleButton>
          </ToggleButtonGroup>
          <Box flex={1} />
          <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(_, v) => { if (v) setViewMode(v); }}>
            <ToggleButton value="table"><ViewList fontSize="small" /></ToggleButton>
            <ToggleButton value="grid"><GridView fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* ── Search & Filter Bar ────────── */}
        <Card elevation={0} sx={{ borderRadius: 3, mb: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <CardContent sx={{ py: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
              <TextField fullWidth placeholder="بحث: اسم، هوية، هاتف، بريد، ملف طبي..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => { setSearchQuery(''); setDebouncedSearch(''); }}>
                        <Clear fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
                sx={{ maxWidth: { md: 400 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>الفئة</InputLabel>
                <Select value={filters.category} label="الفئة"
                  onChange={(e) => { setFilters(prev => ({ ...prev, category: e.target.value })); setPage(1); }}>
                  <MenuItem value="all">الكل</MenuItem>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>الجنس</InputLabel>
                <Select value={filters.gender} label="الجنس"
                  onChange={(e) => { setFilters(prev => ({ ...prev, gender: e.target.value })); setPage(1); }}>
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="male">ذكر</MenuItem>
                  <MenuItem value="female">أنثى</MenuItem>
                </Select>
              </FormControl>
              <Badge badgeContent={activeFilterCount} color="primary">
                <Button variant="outlined" startIcon={<FilterList />} size="small"
                  onClick={() => setFilterDialogOpen(true)} sx={{ borderRadius: 2 }}>
                  فلاتر متقدمة
                </Button>
              </Badge>
              {activeFilterCount > 0 && (
                <Button size="small" startIcon={<Clear />} onClick={clearAllFilters}
                  sx={{ color: 'error.main' }}>مسح الكل</Button>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {totalCount} نتيجة
              </Typography>
            </Stack>

            {/* Active Filter Chips */}
            {activeFilterCount > 0 && (
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
                {debouncedSearch && (
                  <Chip size="small" label={`بحث: ${debouncedSearch}`}
                    onDelete={() => { setSearchQuery(''); setDebouncedSearch(''); }}
                    sx={{ bgcolor: 'primary.50' }} />
                )}
                {filters.status !== 'all' && (
                  <Chip size="small" label={`الحالة: ${STATUS_LABELS[filters.status] || filters.status}`}
                    onDelete={() => setFilters(prev => ({ ...prev, status: 'all' }))} />
                )}
                {filters.category !== 'all' && (
                  <Chip size="small" label={`الفئة: ${CATEGORY_LABELS[filters.category] || filters.category}`}
                    onDelete={() => setFilters(prev => ({ ...prev, category: 'all' }))} />
                )}
                {filters.gender !== 'all' && (
                  <Chip size="small" label={`الجنس: ${GENDER_LABELS[filters.gender]}`}
                    onDelete={() => setFilters(prev => ({ ...prev, gender: 'all' }))} />
                )}
                {filters.ageRange !== 'all' && (
                  <Chip size="small" label={`العمر: ${filters.ageRange} سنة`}
                    onDelete={() => setFilters(prev => ({ ...prev, ageRange: 'all' }))} />
                )}
                {filters.city && (
                  <Chip size="small" label={`المدينة: ${filters.city}`}
                    onDelete={() => setFilters(prev => ({ ...prev, city: '' }))} />
                )}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* ── Bulk Actions Bar ───────────── */}
        {selected.length > 0 && (
          <Paper elevation={3} sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.50', borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              تم تحديد {selected.length} مستفيد
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<Send />}
                onClick={() => showSnackbar('ميزة الرسائل الجماعية قيد التطوير', 'info')}>رسالة جماعية</Button>
              <Button size="small" variant="outlined" onClick={(e) => setBulkStatusMenu(e.currentTarget)}>
                تغيير الحالة
              </Button>
              <Button size="small" variant="outlined" startIcon={<Download />}
                onClick={handleExport}>تصدير المحدد</Button>
              <Button size="small" variant="outlined" color="error" startIcon={<Archive />}
                onClick={handleBulkArchive}>أرشفة</Button>
              <Button size="small" onClick={() => setSelected([])}>إلغاء التحديد</Button>
            </Stack>
            <Menu anchorEl={bulkStatusMenu} open={Boolean(bulkStatusMenu)} onClose={() => setBulkStatusMenu(null)}>
              {Object.entries(STATUS_LABELS).filter(([k]) => !['deceased'].includes(k)).map(([k, v]) => (
                <MenuItem key={k} onClick={() => handleBulkStatusChange(k)}>{v}</MenuItem>
              ))}
            </Menu>
          </Paper>
        )}

        {/* ── Loading ────────────────────── */}
        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

        {/* ── TABLE VIEW ─────────────────── */}
        {viewMode === 'table' && (
          <Card elevation={0} sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small" id="beneficiaries-table">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selected.length > 0 && selected.length < beneficiaries.length}
                        checked={beneficiaries.length > 0 && selected.length === beneficiaries.length}
                        onChange={handleSelectAll} size="small" />
                    </TableCell>
                    <TableCell sx={{ width: 40 }} />
                    {columns.map((col) => (
                      <TableCell key={col.id} sx={{ fontWeight: 700, minWidth: col.minWidth, whiteSpace: 'nowrap' }}>
                        {col.sortable ? (
                          <TableSortLabel active={orderBy === col.id}
                            direction={orderBy === col.id ? order : 'asc'}
                            onClick={() => handleRequestSort(col.id)}>
                            {col.label}
                            {orderBy === col.id && <Box component="span" sx={visuallyHidden}>{order === 'desc' ? 'sorted descending' : 'sorted ascending'}</Box>}
                          </TableSortLabel>
                        ) : col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!loading && beneficiaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length + 2} align="center" sx={{ py: 8 }}>
                        <Groups sx={{ fontSize: 56, color: 'grey.300', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                          {debouncedSearch || activeFilterCount > 0
                            ? 'لا يوجد نتائج مطابقة — جرب تغيير الفلاتر'
                            : 'لا يوجد مستفيدين مسجّلين بعد'}
                        </Typography>
                        {!debouncedSearch && activeFilterCount === 0 && (
                          <Button variant="contained" startIcon={<PersonAdd />} onClick={handleAdd}
                            sx={{ mt: 2, background: gradients.primary }}>تسجيل أول مستفيد</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                  {loading && [...Array(8)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(columns.length + 2)].map((__, j) => (
                        <TableCell key={j}><Skeleton height={24} /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {!loading && beneficiaries.map((row) => {
                    const isItemSelected = isSelected(row.id);
                    const isOpen = openRow === row.id;

                    return (
                      <Fragment key={row.id}>
                        <TableRow hover selected={isItemSelected}
                          sx={{ '& > *': { borderBottom: isOpen ? 'unset !important' : undefined } }}>
                          <TableCell padding="checkbox">
                            <Checkbox checked={isItemSelected} onChange={() => handleSelectOne(row.id)} size="small" />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => setOpenRow(isOpen ? null : row.id)}>
                              {isOpen ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                            </IconButton>
                          </TableCell>
                          {/* Name */}
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Badge
                                overlap="circular"
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                badgeContent={row.isAtRisk ? <Warning sx={{ fontSize: 14, color: '#ff6b6b' }} /> : null}>
                                <Avatar sx={{ width: 36, height: 36, bgcolor: CATEGORY_COLORS[row.category] || neutralColors.fallback, fontSize: 14 }}>
                                  {(row.name || '?').charAt(0)}
                                </Avatar>
                              </Badge>
                              <Box>
                                <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                                  {row.name}
                                </Typography>
                                {row.nameEn && (
                                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                                    {row.nameEn}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          {/* National ID */}
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                              {row.nationalId || '—'}
                            </Typography>
                          </TableCell>
                          {/* Age */}
                          <TableCell>
                            <Typography variant="body2">{row.age ? `${row.age} سنة` : '—'}</Typography>
                          </TableCell>
                          {/* Gender */}
                          <TableCell>
                            <Typography variant="body2">{GENDER_LABELS[row.gender] || '—'}</Typography>
                          </TableCell>
                          {/* Category */}
                          <TableCell>
                            <Chip size="small" variant="outlined"
                              label={CATEGORY_LABELS[row.category] || row.category || '—'}
                              sx={{ borderColor: CATEGORY_COLORS[row.category], color: CATEGORY_COLORS[row.category], fontWeight: 600, fontSize: 11 }} />
                          </TableCell>
                          {/* Status */}
                          <TableCell>
                            <Chip size="small"
                              label={STATUS_LABELS[row.status] || row.status}
                              onClick={(e) => { setStatusMenu(e.currentTarget); setStatusRow(row.id); }}
                              sx={{ bgcolor: STATUS_COLORS[row.status] || neutralColors.fallback, color: 'white', fontWeight: 600, fontSize: 11, cursor: 'pointer' }} />
                          </TableCell>
                          {/* Progress */}
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <LinearProgress variant="determinate" value={row.progress || 0}
                                sx={{ flex: 1, height: 7, borderRadius: 4, bgcolor: 'grey.200',
                                  '& .MuiLinearProgress-bar': {
                                    borderRadius: 4,
                                    bgcolor: (row.progress || 0) >= 70 ? statusColors.success : (row.progress || 0) >= 40 ? statusColors.warning : statusColors.error,
                                  },
                                }} />
                              <Typography variant="caption" fontWeight={600} sx={{ minWidth: 32 }}>
                                {row.progress || 0}%
                              </Typography>
                            </Box>
                          </TableCell>
                          {/* Phone */}
                          <TableCell>
                            {row.phone ? (
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Typography variant="body2" sx={{ direction: 'ltr', fontSize: 12 }}>{row.phone}</Typography>
                                <Tooltip title="واتساب">
                                  <IconButton size="small" onClick={() => handleWhatsApp(row.phone)} sx={{ color: '#25D366' }}>
                                    <WhatsApp sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="اتصال">
                                  <IconButton size="small" onClick={() => handleCall(row.phone)} color="primary">
                                    <Phone sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            ) : <Typography variant="body2" color="text.secondary">—</Typography>}
                          </TableCell>
                          {/* Guardian */}
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontSize: 12 }}>{row.guardianName}</Typography>
                              {row.guardianPhone && (
                                <Stack direction="row" spacing={0.3} alignItems="center">
                                  <Typography variant="caption" color="text.secondary" sx={{ direction: 'ltr', fontSize: 11 }}>
                                    {row.guardianPhone}
                                  </Typography>
                                  <Tooltip title="واتساب ولي الأمر">
                                    <IconButton size="small" onClick={() => handleWhatsApp(row.guardianPhone)} sx={{ color: '#25D366', p: 0.3 }}>
                                      <WhatsApp sx={{ fontSize: 13 }} />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              )}
                            </Box>
                          </TableCell>
                          {/* Last Visit */}
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                              {formatDate(row.lastVisit)}
                            </Typography>
                          </TableCell>
                          {/* Actions */}
                          <TableCell>
                            <Stack direction="row" spacing={0.3}>
                              <Tooltip title="عرض الملف">
                                <IconButton size="small" onClick={() => handleView(row.id)}>
                                  <Visibility sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="تعديل">
                                <IconButton size="small" color="primary" onClick={() => handleEdit(row.id)}>
                                  <Edit sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                              <IconButton size="small" onClick={(e) => { setActionMenu(e.currentTarget); setActionRow(row); }}>
                                <MoreVert sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>

                        {/* Expandable Detail Row */}
                        <TableRow>
                          <TableCell sx={{ py: 0 }} colSpan={columns.length + 2}>
                            <Collapse in={isOpen} timeout="auto" unmountOnExit>
                              <Box sx={{ m: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                                <Grid container spacing={3}>
                                  <Grid item xs={12} md={4}>
                                    <Stack spacing={1.5}>
                                      <Typography variant="subtitle2" fontWeight="bold" color="primary">
                                        <FamilyRestroom sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                                        بيانات الاتصال
                                      </Typography>
                                      <Box>
                                        <Typography variant="caption" color="text.secondary">الهاتف</Typography>
                                        <Typography variant="body2">{row.phone || '—'}</Typography>
                                      </Box>
                                      <Box>
                                        <Typography variant="caption" color="text.secondary">البريد الإلكتروني</Typography>
                                        <Typography variant="body2">{row.email || '—'}</Typography>
                                      </Box>
                                      <Box>
                                        <Typography variant="caption" color="text.secondary">العنوان</Typography>
                                        <Typography variant="body2">{typeof row.address === 'string' ? row.address : row.address?.city || '—'}</Typography>
                                      </Box>
                                    </Stack>
                                  </Grid>
                                  <Grid item xs={12} md={4}>
                                    <Stack spacing={1.5}>
                                      <Typography variant="subtitle2" fontWeight="bold" color="primary">
                                        <LocalHospital sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                                        المعالج والجلسات
                                      </Typography>
                                      <Box>
                                        <Typography variant="caption" color="text.secondary">المعالج المسؤول</Typography>
                                        <Typography variant="body2">{row.therapist || '—'}</Typography>
                                      </Box>
                                      <Box>
                                        <Typography variant="caption" color="text.secondary">الجلسات</Typography>
                                        <Typography variant="body2">
                                          {row.completedSessions || 0} / {row.sessions || 0} جلسة
                                        </Typography>
                                      </Box>
                                      <Box>
                                        <Typography variant="caption" color="text.secondary">تاريخ التسجيل</Typography>
                                        <Typography variant="body2">{formatDate(row.joinDate)}</Typography>
                                      </Box>
                                    </Stack>
                                  </Grid>
                                  <Grid item xs={12} md={4}>
                                    <Stack spacing={1.5}>
                                      <Typography variant="subtitle2" fontWeight="bold" color="primary">
                                        <Description sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                                        ولي الأمر والملاحظات
                                      </Typography>
                                      <Box>
                                        <Typography variant="caption" color="text.secondary">ولي الأمر</Typography>
                                        <Typography variant="body2">{row.guardianName} {row.guardianPhone ? `(${row.guardianPhone})` : ''}</Typography>
                                      </Box>
                                      <Box>
                                        <Typography variant="caption" color="text.secondary">ملاحظات</Typography>
                                        <Typography variant="body2">{row.notes || 'لا توجد ملاحظات'}</Typography>
                                      </Box>
                                      {row.isAtRisk && (
                                        <Chip icon={<Warning />} label="يحتاج متابعة" size="small" color="error" variant="outlined" />
                                      )}
                                    </Stack>
                                  </Grid>
                                </Grid>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {/* ── CARD VIEW ──────────────────── */}
        {viewMode === 'grid' && (
          <>
            {!loading && beneficiaries.length === 0 && (
              <Fade in timeout={500}>
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Groups sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">لا يوجد نتائج مطابقة</Typography>
                </Box>
              </Fade>
            )}
            {loading && (
              <Grid container spacing={2.5}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Card sx={{ borderRadius: 3, p: 2 }}>
                      <Box display="flex" gap={2} mb={2}>
                        <Skeleton variant="circular" width={48} height={48} />
                        <Box flex={1}><Skeleton width="60%" height={22} /><Skeleton width="40%" height={16} /></Box>
                      </Box>
                      <Skeleton width="100%" height={8} sx={{ borderRadius: 4 }} />
                      <Box display="flex" gap={1} mt={2}><Skeleton width={60} height={26} sx={{ borderRadius: 2 }} /><Skeleton width={60} height={26} sx={{ borderRadius: 2 }} /></Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
            {!loading && (
              <Grid container spacing={2.5}>
                {beneficiaries.map((b) => (
                  <Grid item xs={12} sm={6} md={4} key={b.id}>
                    <Fade in timeout={400}>
                      <Card elevation={0} sx={{
                        borderRadius: 3, height: '100%',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                        transition: 'all 0.3s',
                        border: b.isAtRisk ? '2px solid #ff6b6b' : '1px solid transparent',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' },
                      }}>
                        <CardContent>
                          {/* Card Header */}
                          <Box display="flex" justifyContent="space-between" alignItems="start" mb={1.5}>
                            <Box display="flex" gap={1.5}>
                              <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                badgeContent={b.isAtRisk ? <Warning sx={{ fontSize: 12, color: '#ff6b6b' }} /> : null}>
                                <Avatar sx={{ width: 48, height: 48, bgcolor: CATEGORY_COLORS[b.category] || neutralColors.fallback, fontWeight: 'bold' }}>
                                  {(b.name || '?').charAt(0)}
                                </Avatar>
                              </Badge>
                              <Box>
                                <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1.3 }}>{b.name}</Typography>
                                {b.nameEn && <Typography variant="caption" color="text.secondary">{b.nameEn}</Typography>}
                                {b.nationalId && <Box><Chip label={b.nationalId} size="small" sx={{ mt: 0.3, fontSize: 10, height: 20 }} /></Box>}
                              </Box>
                            </Box>
                            <Chip size="small" label={STATUS_LABELS[b.status]}
                              sx={{ bgcolor: STATUS_COLORS[b.status], color: 'white', fontWeight: 600, fontSize: 10 }} />
                          </Box>

                          <Divider sx={{ my: 1 }} />

                          {/* Card Details */}
                          <Grid container spacing={1} sx={{ mb: 1.5 }}>
                            <Grid item xs={4}>
                              <Typography variant="caption" color="text.secondary">العمر</Typography>
                              <Typography variant="body2" fontWeight={600}>{b.age ? `${b.age} سنة` : '—'}</Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography variant="caption" color="text.secondary">الجنس</Typography>
                              <Typography variant="body2" fontWeight={600}>{GENDER_LABELS[b.gender] || '—'}</Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography variant="caption" color="text.secondary">الفئة</Typography>
                              <Typography variant="body2" fontWeight={600}>{CATEGORY_LABELS[b.category] || '—'}</Typography>
                            </Grid>
                          </Grid>

                          {/* Progress */}
                          <Box mb={1.5}>
                            <Box display="flex" justifyContent="space-between" mb={0.3}>
                              <Typography variant="caption" color="text.secondary">التقدم</Typography>
                              <Typography variant="caption" fontWeight={600}>{b.progress}%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={b.progress || 0}
                              sx={{ height: 6, borderRadius: 3, bgcolor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 3,
                                  bgcolor: b.progress >= 70 ? statusColors.success : b.progress >= 40 ? statusColors.warning : statusColors.error,
                                },
                              }} />
                          </Box>

                          {/* Contact */}
                          <Box mb={1.5}>
                            <Grid container spacing={1}>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">الهاتف</Typography>
                                <Typography variant="body2" sx={{ direction: 'ltr', fontSize: 12 }}>{b.phone || '—'}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">ولي الأمر</Typography>
                                <Typography variant="body2" sx={{ fontSize: 12 }}>{b.guardianName}</Typography>
                              </Grid>
                            </Grid>
                          </Box>

                          {/* Card Actions */}
                          <Divider sx={{ mb: 1 }} />
                          <Stack direction="row" spacing={0.5} justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="عرض الملف">
                                <IconButton size="small" onClick={() => handleView(b.id)}><Visibility sx={{ fontSize: 18 }} /></IconButton>
                              </Tooltip>
                              <Tooltip title="تعديل">
                                <IconButton size="small" color="primary" onClick={() => handleEdit(b.id)}><Edit sx={{ fontSize: 18 }} /></IconButton>
                              </Tooltip>
                              {b.phone && (
                                <>
                                  <Tooltip title="واتساب">
                                    <IconButton size="small" onClick={() => handleWhatsApp(b.phone)} sx={{ color: '#25D366' }}>
                                      <WhatsApp sx={{ fontSize: 18 }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="اتصال">
                                    <IconButton size="small" onClick={() => handleCall(b.phone)} color="primary">
                                      <Phone sx={{ fontSize: 18 }} />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(b.joinDate)}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}

        {/* ── Pagination ─────────────────── */}
        {totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={3} mb={2}>
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)}
              color="primary" shape="rounded" showFirstButton showLastButton />
          </Box>
        )}
      </Container>

      {/* ── Status Change Menu ────────── */}
      <Menu anchorEl={statusMenu} open={Boolean(statusMenu)} onClose={() => setStatusMenu(null)}>
        <Typography variant="caption" sx={{ px: 2, pb: 0.5, display: 'block', color: 'text.secondary' }}>تغيير الحالة إلى:</Typography>
        <Divider />
        {Object.entries(STATUS_LABELS).filter(([k]) => !['deceased'].includes(k)).map(([k, v]) => (
          <MenuItem key={k} onClick={() => handleStatusChange(statusRow, k)}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_COLORS[k], mr: 1 }} />
            {v}
          </MenuItem>
        ))}
      </Menu>

      {/* ── Row Action Menu ──────────── */}
      <Menu anchorEl={actionMenu} open={Boolean(actionMenu)} onClose={() => setActionMenu(null)}>
        <MenuItem onClick={() => { handleView(actionRow?.id); setActionMenu(null); }}>
          <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
          <ListItemText>عرض التفاصيل</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleEdit(actionRow?.id); setActionMenu(null); }}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
          <ListItemText>تعديل البيانات</ListItemText>
        </MenuItem>
        {actionRow?.phone && (
          <>
            <MenuItem onClick={() => { handleWhatsApp(actionRow.phone); setActionMenu(null); }}>
              <ListItemIcon><WhatsApp fontSize="small" sx={{ color: '#25D366' }} /></ListItemIcon>
              <ListItemText>واتساب</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { handleCall(actionRow.phone); setActionMenu(null); }}>
              <ListItemIcon><Phone fontSize="small" /></ListItemIcon>
              <ListItemText>اتصال</ListItemText>
            </MenuItem>
          </>
        )}
        {actionRow?.email && (
          <MenuItem onClick={() => { window.open(`mailto:${actionRow.email}`); setActionMenu(null); }}>
            <ListItemIcon><EmailIcon fontSize="small" /></ListItemIcon>
            <ListItemText>بريد إلكتروني</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => { navigate(`/beneficiary-portal/${actionRow?.id}`); setActionMenu(null); }}>
          <ListItemIcon><CalendarMonth fontSize="small" /></ListItemIcon>
          <ListItemText>الجدول والمواعيد</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { handleArchive(actionRow?.id); setActionMenu(null); }}>
          <ListItemIcon><Archive fontSize="small" color="error" /></ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>أرشفة</ListItemText>
        </MenuItem>
      </Menu>

      {/* ── Advanced Filter Dialog ────── */}
      <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>الفلاتر المتقدمة</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>الحالة</InputLabel>
              <Select value={filters.status} label="الحالة"
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
                <MenuItem value="all">الكل</MenuItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>نوع الإعاقة</InputLabel>
              <Select value={filters.category} label="نوع الإعاقة"
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}>
                <MenuItem value="all">الكل</MenuItem>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>الجنس</InputLabel>
              <Select value={filters.gender} label="الجنس"
                onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value }))}>
                <MenuItem value="all">الكل</MenuItem>
                <MenuItem value="male">ذكر</MenuItem>
                <MenuItem value="female">أنثى</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>الفئة العمرية</InputLabel>
              <Select value={filters.ageRange} label="الفئة العمرية"
                onChange={(e) => setFilters(prev => ({ ...prev, ageRange: e.target.value }))}>
                <MenuItem value="all">الكل</MenuItem>
                <MenuItem value="0-6">0-6 سنوات</MenuItem>
                <MenuItem value="7-12">7-12 سنة</MenuItem>
                <MenuItem value="13-18">13-18 سنة</MenuItem>
                <MenuItem value="19-25">19-25 سنة</MenuItem>
                <MenuItem value="26-99">26+ سنة</MenuItem>
              </Select>
            </FormControl>
            {cities.length > 0 && (
              <FormControl fullWidth>
                <InputLabel>المدينة</InputLabel>
                <Select value={filters.city} label="المدينة"
                  onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}>
                  <MenuItem value="">الكل</MenuItem>
                  {cities.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setFilters({ status: 'all', category: 'all', gender: 'all', ageRange: 'all', city: '' });
            setQuickFilter('all');
          }}>مسح الكل</Button>
          <Button variant="contained" onClick={() => { setFilterDialogOpen(false); setPage(1); }}
            sx={{ background: gradients.primary }}>تطبيق</Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ─────────────────── */}
      <Snackbar open={snackbar.open} autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BeneficiariesListPage;
