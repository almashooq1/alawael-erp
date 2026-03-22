/**
 * 🏢 إدارة مخازن الفروع — Branch Warehouse Management
 * AlAwael ERP — Multi-Branch Inventory Overview
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Tooltip,
  Avatar,
  Divider,
  Stack,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Warehouse as WarehouseIcon,
  Store as StoreIcon,
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  Assessment as ReportIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'contexts/SnackbarContext';
import { gradients, brandColors, statusColors, surfaceColors } from 'theme/palette';
import { branchService, warehouseService } from 'services/branchWarehouseService';

const BranchWarehouseManagement = () => {
  const { showSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [whTypeFilter, setWhTypeFilter] = useState('all');
  const [branches, setBranches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stats, setStats] = useState({});
  const [branchStats, setBranchStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [whDialogOpen, setWhDialogOpen] = useState(false);
  const [brDialogOpen, setBrDialogOpen] = useState(false);
  const [editingWH, setEditingWH] = useState(null);
  const [editingBR, setEditingBR] = useState(null);

  const [whForm, setWhForm] = useState({
    code: '',
    name: '',
    type: 'branch',
    branch: '',
    manager: '',
    phone: '',
    capacity: 0,
  });
  const [brForm, setBrForm] = useState({
    code: '',
    name: '',
    city: '',
    region: '',
    address: '',
    manager: '',
    phone: '',
    email: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [brData, whData, whStats, brStats] = await Promise.all([
        branchService.getAll(),
        warehouseService.getAll(),
        warehouseService.getMockStats(),
        branchService.getMockStats(),
      ]);
      setBranches(brData || branchService.getMockBranches());
      setWarehouses(whData || warehouseService.getMockWarehouses());
      setStats(whStats || {});
      setBranchStats(brStats || {});
    } catch {
      setBranches(branchService.getMockBranches());
      setWarehouses(warehouseService.getMockWarehouses());
      setStats(warehouseService.getMockStats());
      setBranchStats(branchService.getMockStats());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredWarehouses = warehouses.filter(w => {
    const matchSearch =
      w.name?.toLowerCase().includes(search.toLowerCase()) ||
      w.code?.toLowerCase().includes(search.toLowerCase());
    const matchBranch = branchFilter === 'all' || w.branch === branchFilter;
    const matchType = whTypeFilter === 'all' || w.type === whTypeFilter;
    return matchSearch && matchBranch && matchType;
  });

  const filteredBranches = branches.filter(
    b =>
      b.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.code?.toLowerCase().includes(search.toLowerCase()) ||
      b.location?.city?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveWarehouse = async () => {
    try {
      if (editingWH) {
        await warehouseService.update(editingWH._id, whForm);
      } else {
        await warehouseService.create(whForm);
      }
      showSnackbar(editingWH ? 'تم تحديث المستودع بنجاح' : 'تم إضافة المستودع بنجاح', 'success');
      setWhDialogOpen(false);
      setEditingWH(null);
      setWhForm({
        code: '',
        name: '',
        type: 'branch',
        branch: '',
        manager: '',
        phone: '',
        capacity: 0,
      });
      loadData();
    } catch {
      showSnackbar('حدث خطأ أثناء الحفظ', 'error');
    }
  };

  const handleSaveBranch = async () => {
    try {
      const payload = {
        ...brForm,
        location: { city: brForm.city, region: brForm.region, address: brForm.address },
        contact: { manager: brForm.manager, phone: brForm.phone, email: brForm.email },
      };
      if (editingBR) {
        await branchService.update(editingBR._id, payload);
      } else {
        await branchService.create(payload);
      }
      showSnackbar(editingBR ? 'تم تحديث الفرع بنجاح' : 'تم إضافة الفرع بنجاح', 'success');
      setBrDialogOpen(false);
      setEditingBR(null);
      setBrForm({
        code: '',
        name: '',
        city: '',
        region: '',
        address: '',
        manager: '',
        phone: '',
        email: '',
      });
      loadData();
    } catch {
      showSnackbar('حدث خطأ أثناء الحفظ', 'error');
    }
  };

  const editWarehouse = wh => {
    setEditingWH(wh);
    setWhForm({
      code: wh.code,
      name: wh.name,
      type: wh.type,
      branch: wh.branch,
      manager: wh.manager,
      phone: wh.phone,
      capacity: wh.capacity,
    });
    setWhDialogOpen(true);
  };
  const editBranch = br => {
    setEditingBR(br);
    setBrForm({
      code: br.code,
      name: br.name,
      city: br.location?.city,
      region: br.location?.region,
      address: br.location?.address,
      manager: br.contact?.manager,
      phone: br.contact?.phone,
      email: br.contact?.email,
    });
    setBrDialogOpen(true);
  };

  const typeColors = { main: 'primary', branch: 'success', transit: 'warning' };
  const typeLabels = { main: 'رئيسي', branch: 'فرع', transit: 'عبور' };
  const statusChip = s =>
    s === 'active' ? (
      <Chip size="small" label="نشط" color="success" />
    ) : s === 'maintenance' ? (
      <Chip size="small" label="صيانة" color="warning" />
    ) : (
      <Chip size="small" label="غير نشط" color="default" />
    );

  // ── KPI CARDS ──
  const kpiCards = [
    {
      label: 'إجمالي الفروع',
      value: branchStats.totalBranches || 6,
      icon: <StoreIcon />,
      gradient: gradients.primary,
    },
    {
      label: 'المستودعات',
      value: stats.total || 8,
      icon: <WarehouseIcon />,
      gradient: gradients.success || 'linear-gradient(135deg, #43A047 0%, #66BB6A 100%)',
    },
    {
      label: 'إجمالي المنتجات',
      value: (branchStats.totalProducts || 10950).toLocaleString(),
      icon: <InventoryIcon />,
      gradient: gradients.info || 'linear-gradient(135deg, #1E88E5 0%, #42A5F5 100%)',
    },
    {
      label: 'قيمة المخزون',
      value: `${((branchStats.totalStockValue || 5150000) / 1000000).toFixed(1)}M ر.س`,
      icon: <TrendUpIcon />,
      gradient: gradients.warning || 'linear-gradient(135deg, #FF8F00 0%, #FFB300 100%)',
    },
    {
      label: 'تحويلات قيد التنفيذ',
      value: branchStats.pendingTransfers || 8,
      icon: <ShippingIcon />,
      gradient: gradients.secondary || 'linear-gradient(135deg, #7B1FA2 0%, #AB47BC 100%)',
    },
    {
      label: 'أصناف تحت الحد',
      value: stats.totalLowStock || 45,
      icon: <WarningIcon />,
      gradient: gradients.error || 'linear-gradient(135deg, #E53935 0%, #EF5350 100%)',
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* ── HEADER ── */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                <WarehouseIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  إدارة مخازن الفروع
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  إدارة شاملة للمستودعات والمخزون عبر جميع الفروع
                </Typography>
              </Box>
            </Box>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={loadData}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                تحديث
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ── KPI CARDS ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpiCards.map((kpi, i) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
            <Card sx={{ background: kpi.gradient, color: '#fff', borderRadius: 2 }}>
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.85 }}>
                      {kpi.label}
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {kpi.value}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>{kpi.icon}</Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── TABS + FILTERS ── */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => {
              setTabValue(v);
              setSearch('');
            }}
          >
            <Tab label="المستودعات" icon={<WarehouseIcon />} iconPosition="start" />
            <Tab label="الفروع" icon={<StoreIcon />} iconPosition="start" />
          </Tabs>
        </Box>
        <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="بحث..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 220 }}
          />
          {tabValue === 0 && (
            <>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>الفرع</InputLabel>
                <Select
                  value={branchFilter}
                  onChange={e => setBranchFilter(e.target.value)}
                  label="الفرع"
                >
                  <MenuItem value="all">جميع الفروع</MenuItem>
                  {branches.map(b => (
                    <MenuItem key={b._id} value={b._id}>
                      {b.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>نوع المستودع</InputLabel>
                <Select
                  value={whTypeFilter}
                  onChange={e => setWhTypeFilter(e.target.value)}
                  label="نوع المستودع"
                >
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="main">رئيسي</MenuItem>
                  <MenuItem value="branch">فرع</MenuItem>
                  <MenuItem value="transit">عبور</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
          <Box sx={{ flexGrow: 1 }} />
          {tabValue === 0 ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingWH(null);
                setWhForm({
                  code: '',
                  name: '',
                  type: 'branch',
                  branch: '',
                  manager: '',
                  phone: '',
                  capacity: 0,
                });
                setWhDialogOpen(true);
              }}
            >
              إضافة مستودع
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingBR(null);
                setBrForm({
                  code: '',
                  name: '',
                  city: '',
                  region: '',
                  address: '',
                  manager: '',
                  phone: '',
                  email: '',
                });
                setBrDialogOpen(true);
              }}
            >
              إضافة فرع
            </Button>
          )}
        </Box>
      </Card>

      {/* ═══ TAB 0: WAREHOUSES ═══ */}
      {tabValue === 0 && (
        <Grid container spacing={2}>
          {filteredWarehouses.map(wh => (
            <Grid item xs={12} md={6} lg={4} key={wh._id}>
              <Card
                sx={{
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: wh.isActive ? 'divider' : 'error.light',
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                {!wh.isActive && (
                  <Chip
                    label="غير نشط"
                    color="error"
                    size="small"
                    sx={{ position: 'absolute', top: -10, right: 16 }}
                  />
                )}
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {wh.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {wh.code}
                      </Typography>
                    </Box>
                    <Box display="flex" gap={0.5}>
                      <Chip label={typeLabels[wh.type]} color={typeColors[wh.type]} size="small" />
                      <IconButton size="small" onClick={() => editWarehouse(wh)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <StoreIcon fontSize="small" color="action" />
                      <Typography variant="body2">{wh.branchName}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LocationIcon fontSize="small" color="action" />
                      <Typography variant="body2">{wh.city}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <PersonIcon fontSize="small" color="action" />
                      <Typography variant="body2">{wh.manager}</Typography>
                    </Box>
                  </Stack>

                  {/* Capacity Bar */}
                  <Box mb={1}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        السعة المستخدمة
                      </Typography>
                      <Typography variant="caption" fontWeight="bold">
                        {wh.currentOccupancy?.toLocaleString()} / {wh.capacity?.toLocaleString()}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (wh.currentOccupancy / wh.capacity) * 100)}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: surfaceColors?.background || '#f5f5f5',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          bgcolor:
                            wh.currentOccupancy / wh.capacity > 0.85
                              ? statusColors?.error || '#f44336'
                              : wh.currentOccupancy / wh.capacity > 0.65
                                ? statusColors?.warning || '#ff9800'
                                : statusColors?.success || '#4caf50',
                        },
                      }}
                    />
                  </Box>

                  {/* Stats Row */}
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Box
                        textAlign="center"
                        sx={{
                          bgcolor: surfaceColors?.background || '#f5f5f5',
                          borderRadius: 1,
                          py: 0.5,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          منتجات
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {wh.productsCount?.toLocaleString()}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box
                        textAlign="center"
                        sx={{
                          bgcolor: surfaceColors?.background || '#f5f5f5',
                          borderRadius: 1,
                          py: 0.5,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          القيمة
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {(wh.stockValue / 1000).toFixed(0)}K
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box
                        textAlign="center"
                        sx={{
                          bgcolor:
                            wh.lowStockItems > 5
                              ? '#fff3e0'
                              : surfaceColors?.background || '#f5f5f5',
                          borderRadius: 1,
                          py: 0.5,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          نقص
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={wh.lowStockItems > 5 ? 'warning.main' : 'text.primary'}
                        >
                          {wh.lowStockItems}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {filteredWarehouses.length === 0 && !loading && (
            <Grid item xs={12}>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                لا توجد مستودعات تطابق معايير البحث
              </Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* ═══ TAB 1: BRANCHES ═══ */}
      {tabValue === 1 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors?.background || '#fafafa' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>الكود</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>اسم الفرع</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>المدينة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>المنطقة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>المدير</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الموظفين</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>المستودعات</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>قيمة المخزون</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBranches.map(br => (
                <TableRow key={br._id} hover>
                  <TableCell>
                    <Chip label={br.code} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell fontWeight="bold">{br.name}</TableCell>
                  <TableCell>{br.location?.city}</TableCell>
                  <TableCell>{br.location?.region}</TableCell>
                  <TableCell>{br.contact?.manager}</TableCell>
                  <TableCell>{br.stats?.employees}</TableCell>
                  <TableCell>{br.stats?.warehouses}</TableCell>
                  <TableCell>{(br.stats?.stockValue || 0).toLocaleString()} ر.س</TableCell>
                  <TableCell>{statusChip(br.status)}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => editBranch(br)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredBranches.length === 0 && !loading && (
            <Box p={4} textAlign="center">
              <Typography color="text.secondary">لا توجد فروع تطابق البحث</Typography>
            </Box>
          )}
        </TableContainer>
      )}

      {/* ═══ WAREHOUSE DIALOG ═══ */}
      <Dialog open={whDialogOpen} onClose={() => setWhDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingWH ? 'تعديل المستودع' : 'إضافة مستودع جديد'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="كود المستودع"
                value={whForm.code}
                onChange={e => setWhForm({ ...whForm, code: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="اسم المستودع"
                value={whForm.name}
                onChange={e => setWhForm({ ...whForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>نوع المستودع</InputLabel>
                <Select
                  value={whForm.type}
                  onChange={e => setWhForm({ ...whForm, type: e.target.value })}
                  label="نوع المستودع"
                >
                  <MenuItem value="main">رئيسي</MenuItem>
                  <MenuItem value="branch">فرع</MenuItem>
                  <MenuItem value="transit">عبور</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الفرع</InputLabel>
                <Select
                  value={whForm.branch}
                  onChange={e => setWhForm({ ...whForm, branch: e.target.value })}
                  label="الفرع"
                >
                  {branches.map(b => (
                    <MenuItem key={b._id} value={b._id}>
                      {b.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المدير"
                value={whForm.manager}
                onChange={e => setWhForm({ ...whForm, manager: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الهاتف"
                value={whForm.phone}
                onChange={e => setWhForm({ ...whForm, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="السعة"
                value={whForm.capacity}
                onChange={e => setWhForm({ ...whForm, capacity: Number(e.target.value) })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWhDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSaveWarehouse}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ BRANCH DIALOG ═══ */}
      <Dialog open={brDialogOpen} onClose={() => setBrDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingBR ? 'تعديل الفرع' : 'إضافة فرع جديد'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="كود الفرع"
                value={brForm.code}
                onChange={e => setBrForm({ ...brForm, code: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="اسم الفرع"
                value={brForm.name}
                onChange={e => setBrForm({ ...brForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المدينة"
                value={brForm.city}
                onChange={e => setBrForm({ ...brForm, city: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المنطقة"
                value={brForm.region}
                onChange={e => setBrForm({ ...brForm, region: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="العنوان"
                value={brForm.address}
                onChange={e => setBrForm({ ...brForm, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="المدير"
                value={brForm.manager}
                onChange={e => setBrForm({ ...brForm, manager: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="الهاتف"
                value={brForm.phone}
                onChange={e => setBrForm({ ...brForm, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="البريد"
                value={brForm.email}
                onChange={e => setBrForm({ ...brForm, email: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBrDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSaveBranch}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BranchWarehouseManagement;
