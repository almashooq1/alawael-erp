import React, { useState, useEffect, useCallback, useMemo } from 'react';
import visitorsService from '../../services/visitors.service';
import { useSocketEvent } from '../../contexts/SocketContext';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tabs,
  Tab,
  Tooltip,
  MenuItem,
  InputAdornment,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  LinearProgress,
  Alert,
  Collapse,
  Stack,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Add as AddIcon,
  Badge as VisitorIcon,
  Login as CheckInIcon,
  Logout as CheckOutIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Block as BlockIcon,
  Cancel as CancelIcon,
  Analytics as AnalyticsIcon,
  PersonOff as NoShowIcon,
  Refresh as RefreshIcon,
  DataSaverOn as SeedIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  AccessTime as TimeIcon,
  Business as BusinessIcon,
  FilterList as FilterIcon,
  ExpandLess as CollapseIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors, neutralColors } from '../../theme/palette';

/* ═══════════════ Constants ═══════════════ */
const defaultStats = {
  total: 0,
  checkedIn: 0,
  checkedOut: 0,
  preRegistered: 0,
  cancelled: 0,
  noShow: 0,
  currentlyInside: 0,
};
const statusMap = {
  checked_in: { label: 'داخل المبنى', color: 'success', icon: <CheckInIcon fontSize="small" /> },
  checked_out: { label: 'غادر', color: 'default', icon: <CheckOutIcon fontSize="small" /> },
  pre_registered: { label: 'مسجل مسبقاً', color: 'info', icon: <InfoIcon fontSize="small" /> },
  cancelled: { label: 'ملغى', color: 'error', icon: <CancelIcon fontSize="small" /> },
  no_show: { label: 'لم يحضر', color: 'warning', icon: <NoShowIcon fontSize="small" /> },
};
const purposeMap = {
  meeting: 'اجتماع',
  visit: 'زيارة',
  delivery: 'توصيل',
  maintenance: 'صيانة',
  interview: 'مقابلة',
  contractor: 'مقاول',
  other: 'أخرى',
};
const purposeOptions = Object.entries(purposeMap).map(([v, l]) => ({ value: v, label: l }));

const fmtDate = d => (d ? new Date(d).toLocaleDateString('ar-SA') : '-');
const fmtTime = d =>
  d ? new Date(d).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-';
const fmtDateTime = d => (d ? `${fmtDate(d)} ${fmtTime(d)}` : '-');

/* ═══════════════ Main Component ═══════════════ */
export default function VisitorRegistry() {
  const showSnackbar = useSnackbar();

  // Core state
  const [visitors, setVisitors] = useState([]);
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(false);
  const [mainTab, setMainTab] = useState(0); // 0=visitors 1=analytics 2=blacklist 3=logs
  const [visitorTab, setVisitorTab] = useState(0); // sub-tabs for visitor list
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPurpose, setFilterPurpose] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Dialogs
  const [registerOpen, setRegisterOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [blacklistAddOpen, setBlacklistAddOpen] = useState(false);

  // Detail/Edit
  const [selected, setSelected] = useState(null);
  const [visitorLogs, setVisitorLogs] = useState([]);
  const [visitHistory, setVisitHistory] = useState([]);
  const [cancelReason, setCancelReason] = useState('');

  // Forms
  const emptyForm = {
    fullName: '',
    phone: '',
    nationalId: '',
    email: '',
    company: '',
    purpose: 'visit',
    hostName: '',
    hostDepartment: '',
    notes: '',
    vehiclePlate: '',
    expectedArrival: '',
  };
  const [form, setForm] = useState(emptyForm);

  // Analytics
  const [analytics, setAnalytics] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30d');

  // Blacklist
  const [blacklist, setBlacklist] = useState([]);
  const [blForm, setBlForm] = useState({ nationalId: '', fullName: '', phone: '', reason: '' });

  // Recent logs
  const [recentLogs, setRecentLogs] = useState([]);

  // ─── Socket.IO Real-time Events ──────────────────────────────────
  const handleVisitorCheckIn = useCallback(
    data => {
      if (data?.visitor) {
        setVisitors(prev =>
          prev.map(v => (v._id === data.visitor._id ? { ...v, ...data.visitor } : v))
        );
        showSnackbar(`تسجيل دخول: ${data.visitor.fullName || data.visitor.name}`, 'success');
        loadStats();
      }
    },
    [showSnackbar] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const handleVisitorCheckOut = useCallback(
    data => {
      if (data?.visitor) {
        setVisitors(prev =>
          prev.map(v => (v._id === data.visitor._id ? { ...v, ...data.visitor } : v))
        );
        showSnackbar(`تسجيل خروج: ${data.visitor.fullName || data.visitor.name}`, 'info');
        loadStats();
      }
    },
    [showSnackbar] // eslint-disable-line react-hooks/exhaustive-deps
  );
  useSocketEvent('visitor:check-in', handleVisitorCheckIn);
  useSocketEvent('visitor:check-out', handleVisitorCheckOut);

  // ─── Data Loading ────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const res = await visitorsService.getTodayStats();
      setStats(res.data || defaultStats);
    } catch {
      /* keep current */
    }
  }, []);

  const statusForTab = useMemo(() => {
    const map = { 0: '', 1: 'checked_in', 2: 'pre_registered', 3: 'checked_out', 4: 'cancelled' };
    return map[visitorTab] || '';
  }, [visitorTab]);

  const loadVisitors = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (statusForTab) params.status = statusForTab;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (filterPurpose) params.purpose = filterPurpose;
      const res = await visitorsService.getAll(params);
      setVisitors(res.data || []);
      setTotalCount(res.pagination?.total || res.data?.length || 0);
    } catch {
      setVisitors([]);
    }
    setLoading(false);
  }, [page, rowsPerPage, statusForTab, searchQuery, filterPurpose]);

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await visitorsService.getAnalytics({ period: analyticsPeriod });
      setAnalytics(res.data || null);
    } catch {
      /* ignore */
    }
  }, [analyticsPeriod]);

  const loadBlacklist = useCallback(async () => {
    try {
      const res = await visitorsService.getBlacklist();
      setBlacklist(res.data || []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadRecentLogs = useCallback(async () => {
    try {
      const res = await visitorsService.getRecentLogs({ limit: 50 });
      setRecentLogs(res.data || []);
    } catch {
      /* ignore */
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadStats();
    loadVisitors();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload visitors when filters change
  useEffect(() => {
    loadVisitors();
  }, [loadVisitors]);

  // Load tab-specific data
  useEffect(() => {
    if (mainTab === 1) loadAnalytics();
    if (mainTab === 2) loadBlacklist();
    if (mainTab === 3) loadRecentLogs();
  }, [mainTab, loadAnalytics, loadBlacklist, loadRecentLogs]);

  // ─── Handlers ────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!form.fullName || !form.purpose) {
      showSnackbar('الاسم وغرض الزيارة مطلوبان', 'warning');
      return;
    }
    try {
      await visitorsService.register(form);
      showSnackbar('تم تسجيل الزائر بنجاح', 'success');
      setRegisterOpen(false);
      setForm(emptyForm);
      loadVisitors();
      loadStats();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'خطأ في التسجيل', 'error');
    }
  };

  const handleCheckIn = async id => {
    try {
      await visitorsService.checkIn(id);
      showSnackbar('تم تسجيل الدخول', 'success');
      loadVisitors();
      loadStats();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'خطأ في تسجيل الدخول', 'error');
    }
  };

  const handleCheckOut = async id => {
    try {
      await visitorsService.checkOut(id);
      showSnackbar('تم تسجيل الخروج', 'success');
      loadVisitors();
      loadStats();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'خطأ في تسجيل الخروج', 'error');
    }
  };

  const handleCancel = async () => {
    if (!selected) return;
    try {
      await visitorsService.cancel(selected._id, cancelReason);
      showSnackbar('تم إلغاء الزيارة', 'info');
      setCancelOpen(false);
      setCancelReason('');
      setSelected(null);
      loadVisitors();
      loadStats();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'خطأ في الإلغاء', 'error');
    }
  };

  const handleNoShow = async id => {
    try {
      await visitorsService.noShow(id);
      showSnackbar('تم تحديد الزائر كغير حاضر', 'info');
      loadVisitors();
      loadStats();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'خطأ', 'error');
    }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    try {
      await visitorsService.update(selected._id, form);
      showSnackbar('تم تحديث بيانات الزائر', 'success');
      setEditOpen(false);
      loadVisitors();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'خطأ في التحديث', 'error');
    }
  };

  const handleViewDetails = async visitor => {
    setSelected(visitor);
    setDetailOpen(true);
    try {
      const res = await visitorsService.getById(visitor._id);
      if (res.data) {
        setSelected(res.data.visitor || res.data);
        setVisitorLogs(res.data.logs || []);
        setVisitHistory(res.data.visitHistory || []);
      }
    } catch {
      /* keep basic data */
    }
  };

  const handleOpenEdit = visitor => {
    setSelected(visitor);
    setForm({
      fullName: visitor.fullName || '',
      phone: visitor.phone || '',
      nationalId: visitor.nationalId || '',
      email: visitor.email || '',
      company: visitor.company || '',
      purpose: visitor.purpose || 'visit',
      hostName: visitor.hostName || '',
      hostDepartment: visitor.hostDepartment || '',
      notes: visitor.notes || '',
      vehiclePlate: visitor.vehiclePlate || '',
      expectedArrival: visitor.expectedArrival
        ? new Date(visitor.expectedArrival).toISOString().slice(0, 16)
        : '',
    });
    setEditOpen(true);
  };

  const handleOpenCancel = visitor => {
    setSelected(visitor);
    setCancelReason('');
    setCancelOpen(true);
  };

  // Blacklist
  const handleAddBlacklist = async () => {
    if (!blForm.nationalId && !blForm.phone) {
      showSnackbar('رقم الهوية أو الهاتف مطلوب', 'warning');
      return;
    }
    try {
      await visitorsService.addToBlacklist(blForm);
      showSnackbar('تمت الإضافة للقائمة السوداء', 'success');
      setBlacklistAddOpen(false);
      setBlForm({ nationalId: '', fullName: '', phone: '', reason: '' });
      loadBlacklist();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'خطأ', 'error');
    }
  };

  const handleRemoveBlacklist = async id => {
    try {
      await visitorsService.removeFromBlacklist(id);
      showSnackbar('تمت الإزالة من القائمة السوداء', 'success');
      loadBlacklist();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'خطأ', 'error');
    }
  };

  // Seed demo data
  const handleSeed = async () => {
    try {
      await visitorsService.seed();
      showSnackbar('تم إنشاء بيانات تجريبية', 'success');
      loadVisitors();
      loadStats();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'خطأ في إنشاء البيانات', 'error');
    }
  };

  const handleRefresh = () => {
    loadVisitors();
    loadStats();
  };

  // ─── Render Helpers ──────────────────────────────────────────────
  const StatCard = ({ label, value, color, icon }) => (
    <Grid item xs={6} sm={4} md={2}>
      <Card sx={{ borderTop: `3px solid ${color}` }}>
        <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
          {icon && <Box sx={{ color, mb: 0.5 }}>{icon}</Box>}
          <Typography variant="h4" sx={{ color, fontWeight: 'bold' }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );

  // ════════════════════════════════════════════════════════════════════
  // RENDER — Visitors Tab
  // ════════════════════════════════════════════════════════════════════
  const renderVisitorsTab = () => (
    <>
      {/* Search & Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="بحث بالاسم، الهاتف، الهوية، الشركة..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          <Button
            size="small"
            startIcon={showFilters ? <CollapseIcon /> : <FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            فلترة
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button size="small" startIcon={<RefreshIcon />} onClick={handleRefresh}>
            تحديث
          </Button>
        </Stack>
        <Collapse in={showFilters}>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>الغرض</InputLabel>
              <Select
                value={filterPurpose}
                label="الغرض"
                onChange={e => {
                  setFilterPurpose(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">الكل</MenuItem>
                {purposeOptions.map(o => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              size="small"
              onClick={() => {
                setSearchQuery('');
                setFilterPurpose('');
                setPage(0);
              }}
            >
              مسح الفلاتر
            </Button>
          </Stack>
        </Collapse>
      </Paper>

      {/* Sub-tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={visitorTab}
          onChange={(_, v) => {
            setVisitorTab(v);
            setPage(0);
          }}
        >
          <Tab label="الكل" />
          <Tab label="داخل المبنى" />
          <Tab label="مسجل مسبقاً" />
          <Tab label="غادروا" />
          <Tab label="ملغى / لم يحضر" />
        </Tabs>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 'bold', bgcolor: 'grey.50' } }}>
              <TableCell>رقم الزائر</TableCell>
              <TableCell>الاسم</TableCell>
              <TableCell>الهاتف</TableCell>
              <TableCell>الشركة</TableCell>
              <TableCell>الغرض</TableCell>
              <TableCell>المستضيف</TableCell>
              <TableCell>الدخول</TableCell>
              <TableCell>الخروج</TableCell>
              <TableCell>البطاقة</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visitors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">لا يوجد زوار</Typography>
                </TableCell>
              </TableRow>
            ) : (
              visitors.map(v => (
                <TableRow
                  key={v._id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleViewDetails(v)}
                >
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {v.visitorId || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{v.fullName || v.name || '-'}</TableCell>
                  <TableCell dir="ltr">{v.phone || '-'}</TableCell>
                  <TableCell>{v.company || '-'}</TableCell>
                  <TableCell>{purposeMap[v.purpose] || v.purpose || '-'}</TableCell>
                  <TableCell>{v.hostName || v.host || '-'}</TableCell>
                  <TableCell>{fmtTime(v.checkInTime)}</TableCell>
                  <TableCell>{fmtTime(v.checkOutTime)}</TableCell>
                  <TableCell>{v.badgeNumber || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      icon={statusMap[v.status]?.icon}
                      label={statusMap[v.status]?.label || v.status}
                      color={statusMap[v.status]?.color || 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center" onClick={e => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      {v.status === 'pre_registered' && (
                        <>
                          <Tooltip title="تسجيل دخول">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleCheckIn(v._id)}
                            >
                              <CheckInIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="لم يحضر">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleNoShow(v._id)}
                            >
                              <NoShowIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="إلغاء">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenCancel(v)}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {v.status === 'checked_in' && (
                        <Tooltip title="تسجيل خروج">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleCheckOut(v._id)}
                          >
                            <CheckOutIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => handleOpenEdit(v)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="تفاصيل">
                        <IconButton size="small" color="info" onClick={() => handleViewDetails(v)}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => {
            setRowsPerPage(+e.target.value);
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="صفوف في الصفحة"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
        />
      </TableContainer>
    </>
  );

  // ════════════════════════════════════════════════════════════════════
  // RENDER — Analytics Tab
  // ════════════════════════════════════════════════════════════════════
  const renderAnalyticsTab = () => {
    if (!analytics)
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">جاري التحميل...</Typography>
        </Box>
      );
    const {
      byPurpose = [],
      _byStatus = [],
      byDepartment = [],
      topHosts = [],
      peakHours = [],
      frequentVisitors = [],
    } = analytics;
    const maxPurpose = Math.max(...byPurpose.map(p => p.count), 1);
    const maxDept = Math.max(...byDepartment.map(d => d.count), 1);
    const maxHour = Math.max(...peakHours.map(h => h.count), 1);

    return (
      <Box>
        {/* Period selector */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
          <Typography fontWeight="bold">
            <AnalyticsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            التحليلات
          </Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select value={analyticsPeriod} onChange={e => setAnalyticsPeriod(e.target.value)}>
              <MenuItem value="7d">آخر 7 أيام</MenuItem>
              <MenuItem value="30d">آخر 30 يوم</MenuItem>
              <MenuItem value="90d">آخر 90 يوم</MenuItem>
            </Select>
          </FormControl>
          <Button size="small" startIcon={<RefreshIcon />} onClick={loadAnalytics}>
            تحديث
          </Button>
        </Stack>

        {/* Summary cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <StatCard
            label="إجمالي الزوار"
            value={analytics.totalVisitors || 0}
            color={statusColors.primaryBlue}
            icon={<PeopleIcon />}
          />
          <StatCard
            label="متوسط المدة (دقيقة)"
            value={analytics.avgDuration || 0}
            color={statusColors.warningDarker}
            icon={<TimeIcon />}
          />
        </Grid>

        <Grid container spacing={3}>
          {/* By Purpose */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography fontWeight="bold" sx={{ mb: 2 }}>
                حسب الغرض
              </Typography>
              {byPurpose.map((p, i) => (
                <Box key={i} sx={{ mb: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">{purposeMap[p._id] || p._id}</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {p.count}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={(p.count / maxPurpose) * 100}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
              ))}
              {byPurpose.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  لا توجد بيانات
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* By Department */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography fontWeight="bold" sx={{ mb: 2 }}>
                <BusinessIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                حسب القسم
              </Typography>
              {byDepartment.map((d, i) => (
                <Box key={i} sx={{ mb: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">{d._id || 'غير محدد'}</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {d.count}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={(d.count / maxDept) * 100}
                    color="secondary"
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
              ))}
              {byDepartment.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  لا توجد بيانات
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Peak Hours */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography fontWeight="bold" sx={{ mb: 2 }}>
                <TimeIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                ساعات الذروة
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="flex-end" sx={{ height: 120 }}>
                {peakHours.slice(0, 12).map((h, i) => (
                  <Tooltip key={i} title={`الساعة ${h._id}:00 — ${h.count} زائر`}>
                    <Box
                      sx={{
                        flex: 1,
                        bgcolor: 'primary.main',
                        borderRadius: '4px 4px 0 0',
                        height: `${Math.max((h.count / maxHour) * 100, 5)}%`,
                        minWidth: 16,
                        opacity: 0.7 + (h.count / maxHour) * 0.3,
                      }}
                    />
                  </Tooltip>
                ))}
              </Stack>
              {peakHours.length > 0 && (
                <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                  <Typography variant="caption">{peakHours[0]?._id}:00</Typography>
                  <Typography variant="caption">
                    {peakHours[peakHours.length - 1]?._id}:00
                  </Typography>
                </Stack>
              )}
            </Paper>
          </Grid>

          {/* Top Hosts */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography fontWeight="bold" sx={{ mb: 2 }}>
                <PeopleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                أكثر المستضيفين
              </Typography>
              <List dense>
                {topHosts.slice(0, 5).map((h, i) => (
                  <ListItem key={i}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: 'primary.main' }}>
                        {i + 1}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={h._id || 'غير محدد'} secondary={`${h.count} زيارة`} />
                  </ListItem>
                ))}
                {topHosts.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    لا توجد بيانات
                  </Typography>
                )}
              </List>
            </Paper>
          </Grid>

          {/* Frequent Visitors */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography fontWeight="bold" sx={{ mb: 2 }}>
                <TrendingUpIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                الزوار المتكررون
              </Typography>
              <Grid container spacing={2}>
                {frequentVisitors.slice(0, 6).map((fv, i) => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Card variant="outlined">
                      <CardContent sx={{ py: 1.5 }}>
                        <Typography fontWeight="bold">{fv.fullName || 'غير معروف'}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {fv.company || '-'}
                        </Typography>
                        <Chip
                          label={`${fv.visitCount} زيارة`}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mt: 0.5 }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {frequentVisitors.length === 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      لا توجد بيانات
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // ════════════════════════════════════════════════════════════════════
  // RENDER — Blacklist Tab
  // ════════════════════════════════════════════════════════════════════
  const renderBlacklistTab = () => (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography fontWeight="bold">
          <BlockIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          القائمة السوداء
        </Typography>
        <Button
          variant="contained"
          color="error"
          startIcon={<AddIcon />}
          onClick={() => setBlacklistAddOpen(true)}
        >
          إضافة للقائمة
        </Button>
      </Stack>

      {blacklist.length === 0 ? (
        <Alert severity="info">لا يوجد أشخاص في القائمة السوداء</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 'bold', bgcolor: 'error.50' } }}>
                <TableCell>الاسم</TableCell>
                <TableCell>رقم الهوية</TableCell>
                <TableCell>الهاتف</TableCell>
                <TableCell>السبب</TableCell>
                <TableCell>بواسطة</TableCell>
                <TableCell>التاريخ</TableCell>
                <TableCell>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {blacklist.map(b => (
                <TableRow key={b._id}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{b.fullName || '-'}</TableCell>
                  <TableCell>{b.nationalId || '-'}</TableCell>
                  <TableCell dir="ltr">{b.phone || '-'}</TableCell>
                  <TableCell>{b.reason || '-'}</TableCell>
                  <TableCell>{b.blockedByName || '-'}</TableCell>
                  <TableCell>{fmtDate(b.createdAt)}</TableCell>
                  <TableCell>
                    <Tooltip title="إزالة من القائمة">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleRemoveBlacklist(b._id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  // ════════════════════════════════════════════════════════════════════
  // RENDER — Logs Tab
  // ════════════════════════════════════════════════════════════════════
  const logActionMap = {
    register: { label: 'تسجيل', color: 'info' },
    check_in: { label: 'دخول', color: 'success' },
    check_out: { label: 'خروج', color: 'default' },
    cancel: { label: 'إلغاء', color: 'error' },
    no_show: { label: 'لم يحضر', color: 'warning' },
    update: { label: 'تعديل', color: 'secondary' },
    blacklist: { label: 'حظر', color: 'error' },
  };

  const renderLogsTab = () => (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography fontWeight="bold">
          <HistoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          سجل العمليات
        </Typography>
        <Button size="small" startIcon={<RefreshIcon />} onClick={loadRecentLogs}>
          تحديث
        </Button>
      </Stack>

      {recentLogs.length === 0 ? (
        <Alert severity="info">لا توجد عمليات مسجلة</Alert>
      ) : (
        <List>
          {recentLogs.map((log, i) => (
            <React.Fragment key={log._id || i}>
              <ListItem alignItems="flex-start">
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: `${logActionMap[log.action]?.color || 'default'}.main`,
                      width: 36,
                      height: 36,
                    }}
                  >
                    {logActionMap[log.action]?.label?.charAt(0) || '•'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={logActionMap[log.action]?.label || log.action}
                        size="small"
                        color={logActionMap[log.action]?.color || 'default'}
                        variant="outlined"
                      />
                      <Typography variant="body2" fontWeight="bold">
                        {log.details || '-'}
                      </Typography>
                    </Stack>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {log.performedByName || 'النظام'} • {fmtDateTime(log.createdAt)}
                    </Typography>
                  }
                />
              </ListItem>
              {i < recentLogs.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );

  // ════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════════════════════════════
  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 3, color: 'white' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <VisitorIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                سجل الزوار
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                تسجيل ومتابعة حركة الزوار • التحليلات • القائمة السوداء
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
              startIcon={<SeedIcon />}
              onClick={handleSeed}
            >
              بيانات تجريبية
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddIcon />}
              onClick={() => {
                setForm(emptyForm);
                setRegisterOpen(true);
              }}
            >
              تسجيل زائر
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <StatCard
          label="زوار اليوم"
          value={stats.total}
          color={statusColors.primaryBlue}
          icon={<PeopleIcon />}
        />
        <StatCard
          label="داخل المبنى"
          value={stats.currentlyInside || stats.checkedIn}
          color={statusColors.successDeep}
          icon={<CheckCircleIcon />}
        />
        <StatCard
          label="مسجلين مسبقاً"
          value={stats.preRegistered}
          color={statusColors.warningDarker}
          icon={<InfoIcon />}
        />
        <StatCard
          label="غادروا"
          value={stats.checkedOut}
          color={neutralColors.textDisabled}
          icon={<CheckOutIcon />}
        />
        <StatCard label="ملغى" value={stats.cancelled || 0} color="#e53935" icon={<CancelIcon />} />
        <StatCard label="لم يحضر" value={stats.noShow || 0} color="#ff9800" icon={<NoShowIcon />} />
      </Grid>

      {/* Main Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={mainTab}
          onChange={(_, v) => setMainTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<PeopleIcon />} label="الزوار" iconPosition="start" />
          <Tab icon={<AnalyticsIcon />} label="التحليلات" iconPosition="start" />
          <Tab icon={<BlockIcon />} label="القائمة السوداء" iconPosition="start" />
          <Tab icon={<HistoryIcon />} label="سجل العمليات" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {mainTab === 0 && renderVisitorsTab()}
      {mainTab === 1 && renderAnalyticsTab()}
      {mainTab === 2 && renderBlacklistTab()}
      {mainTab === 3 && renderLogsTab()}

      {/* ═══════ Register Dialog ═══════ */}
      <Dialog open={registerOpen} onClose={() => setRegisterOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تسجيل زائر جديد</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الاسم الكامل *"
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="رقم الهوية"
                value={form.nationalId}
                onChange={e => setForm(f => ({ ...f, nationalId: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="رقم الهاتف"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="البريد الإلكتروني"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الشركة"
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="غرض الزيارة *"
                value={form.purpose}
                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
              >
                {purposeOptions.map(o => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="اسم المستضيف"
                value={form.hostName}
                onChange={e => setForm(f => ({ ...f, hostName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="قسم المستضيف"
                value={form.hostDepartment}
                onChange={e => setForm(f => ({ ...f, hostDepartment: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="لوحة السيارة"
                value={form.vehiclePlate}
                onChange={e => setForm(f => ({ ...f, vehiclePlate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="موعد الوصول المتوقع"
                value={form.expectedArrival}
                InputLabelProps={{ shrink: true }}
                onChange={e => setForm(f => ({ ...f, expectedArrival: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegisterOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleRegister}>
            تسجيل
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════ Edit Dialog ═══════ */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تعديل بيانات الزائر</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الاسم الكامل"
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="رقم الهوية"
                value={form.nationalId}
                onChange={e => setForm(f => ({ ...f, nationalId: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="رقم الهاتف"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="البريد الإلكتروني"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الشركة"
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="غرض الزيارة"
                value={form.purpose}
                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
              >
                {purposeOptions.map(o => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="اسم المستضيف"
                value={form.hostName}
                onChange={e => setForm(f => ({ ...f, hostName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="قسم المستضيف"
                value={form.hostDepartment}
                onChange={e => setForm(f => ({ ...f, hostDepartment: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleUpdate}>
            حفظ التعديلات
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════ Detail Dialog  ═══════ */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight="bold">
              تفاصيل الزائر
            </Typography>
            {selected && (
              <Chip
                icon={statusMap[selected.status]?.icon}
                label={statusMap[selected.status]?.label || selected.status}
                color={statusMap[selected.status]?.color || 'default'}
              />
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selected && (
            <Grid container spacing={3}>
              {/* Basic Info */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight="bold" sx={{ mb: 2 }}>
                    المعلومات الأساسية
                  </Typography>
                  <Grid container spacing={1}>
                    {[
                      ['رقم الزائر', selected.visitorId],
                      ['الاسم', selected.fullName || selected.name],
                      ['رقم الهوية', selected.nationalId],
                      ['الهاتف', selected.phone],
                      ['البريد', selected.email],
                      ['الشركة', selected.company],
                      ['الغرض', purposeMap[selected.purpose] || selected.purpose],
                      ['المستضيف', selected.hostName || selected.host],
                      ['القسم', selected.hostDepartment || selected.department],
                      ['لوحة السيارة', selected.vehiclePlate],
                      ['رقم البطاقة', selected.badgeNumber],
                    ].map(([label, value], i) => (
                      <React.Fragment key={i}>
                        <Grid item xs={5}>
                          <Typography variant="body2" color="text.secondary">
                            {label}:
                          </Typography>
                        </Grid>
                        <Grid item xs={7}>
                          <Typography variant="body2" fontWeight="bold">
                            {value || '-'}
                          </Typography>
                        </Grid>
                      </React.Fragment>
                    ))}
                  </Grid>
                </Paper>
              </Grid>

              {/* Timeline */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight="bold" sx={{ mb: 2 }}>
                    <TimelineIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    الجدول الزمني
                  </Typography>
                  <Grid container spacing={1}>
                    {[
                      ['تاريخ التسجيل', fmtDateTime(selected.createdAt)],
                      ['الوصول المتوقع', fmtDateTime(selected.expectedArrival)],
                      ['وقت الدخول', fmtDateTime(selected.checkInTime)],
                      ['وقت الخروج', fmtDateTime(selected.checkOutTime)],
                    ].map(([label, val], i) => (
                      <React.Fragment key={i}>
                        <Grid item xs={5}>
                          <Typography variant="body2" color="text.secondary">
                            {label}:
                          </Typography>
                        </Grid>
                        <Grid item xs={7}>
                          <Typography variant="body2">{val}</Typography>
                        </Grid>
                      </React.Fragment>
                    ))}
                  </Grid>
                  {selected.notes && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        ملاحظات:
                      </Typography>
                      <Typography variant="body2">{selected.notes}</Typography>
                    </Box>
                  )}
                  {selected.belongings?.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        المقتنيات:
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {selected.belongings.map((b, i) => (
                          <Chip key={i} label={b} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* Visit History */}
              {visitHistory.length > 0 && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography fontWeight="bold" sx={{ mb: 1 }}>
                      <TrendingUpIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                      سجل الزيارات السابقة ({visitHistory.length})
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>التاريخ</TableCell>
                          <TableCell>الغرض</TableCell>
                          <TableCell>المستضيف</TableCell>
                          <TableCell>الحالة</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {visitHistory.slice(0, 10).map((vh, i) => (
                          <TableRow key={i}>
                            <TableCell>{fmtDate(vh.createdAt)}</TableCell>
                            <TableCell>{purposeMap[vh.purpose] || vh.purpose}</TableCell>
                            <TableCell>{vh.hostName || '-'}</TableCell>
                            <TableCell>
                              <Chip
                                label={statusMap[vh.status]?.label || vh.status}
                                size="small"
                                color={statusMap[vh.status]?.color || 'default'}
                                variant="outlined"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                </Grid>
              )}

              {/* Audit Logs */}
              {visitorLogs.length > 0 && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography fontWeight="bold" sx={{ mb: 1 }}>
                      <HistoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                      سجل المراجعة
                    </Typography>
                    <List dense>
                      {visitorLogs.map((log, i) => (
                        <ListItem key={i}>
                          <ListItemText
                            primary={
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  label={logActionMap[log.action]?.label || log.action}
                                  size="small"
                                  color={logActionMap[log.action]?.color || 'default'}
                                  variant="outlined"
                                />
                                <Typography variant="body2">{log.details}</Typography>
                              </Stack>
                            }
                            secondary={`${log.performedByName || 'النظام'} — ${fmtDateTime(log.createdAt)}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>إغلاق</Button>
          {selected && ['pre_registered', 'checked_in'].includes(selected.status) && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => {
                setDetailOpen(false);
                handleOpenEdit(selected);
              }}
            >
              تعديل
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ═══════ Cancel Dialog ═══════ */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>
          <WarningIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          إلغاء الزيارة
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            هل أنت متأكد من إلغاء زيارة <strong>{selected?.fullName}</strong>؟
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="سبب الإلغاء"
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>تراجع</Button>
          <Button variant="contained" color="error" onClick={handleCancel}>
            تأكيد الإلغاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════ Blacklist Add Dialog ═══════ */}
      <Dialog
        open={blacklistAddOpen}
        onClose={() => setBlacklistAddOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          <BlockIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          إضافة للقائمة السوداء
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="الاسم الكامل"
            value={blForm.fullName}
            sx={{ mt: 1, mb: 2 }}
            onChange={e => setBlForm(f => ({ ...f, fullName: e.target.value }))}
          />
          <TextField
            fullWidth
            label="رقم الهوية *"
            value={blForm.nationalId}
            sx={{ mb: 2 }}
            onChange={e => setBlForm(f => ({ ...f, nationalId: e.target.value }))}
          />
          <TextField
            fullWidth
            label="رقم الهاتف"
            value={blForm.phone}
            sx={{ mb: 2 }}
            onChange={e => setBlForm(f => ({ ...f, phone: e.target.value }))}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="السبب *"
            value={blForm.reason}
            onChange={e => setBlForm(f => ({ ...f, reason: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlacklistAddOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleAddBlacklist}>
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
