/**
 * 🦽 إدارة الأجهزة المساعدة — Assistive Devices Management
 * AlAwael ERP — Equipment inventory, assignment, maintenance, tracking
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,  Divider,
  IconButton,
  Tooltip,
  Button,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  CircularProgress,
  useTheme,
  alpha,
  InputAdornment,
} from '@mui/material';
import {
  Devices as DeviceIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  AssignmentInd as AssignIcon,
  AssignmentReturn as ReturnIcon,
  Build as MaintenanceIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  AttachMoney as CostIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Category as CategoryIcon,
  } from '@mui/icons-material';
import { useSnackbar } from 'contexts/SnackbarContext';
import { assistiveDeviceService } from 'services/disabilityRehabService';

const DEVICE_CATEGORIES = ['تنقل', 'تواصل', 'سمعي', 'بصري', 'تقويم', 'تموضع'];
const DEVICE_STATUSES = [
  { value: 'all', label: 'الكل' },
  { value: 'available', label: 'متاح' },
  { value: 'assigned', label: 'مخصص' },
  { value: 'maintenance', label: 'في الصيانة' },
  { value: 'retired', label: 'مستبعد' },
];
const CONDITION_OPTIONS = ['ممتاز', 'جيد', 'مقبول', 'يحتاج صيانة', 'تالف'];

const emptyForm = {
  name: '',
  category: 'تنقل',
  brand: '',
  model: '',
  serialNumber: '',
  purchaseDate: '',
  cost: '',
  warranty: '',
  condition: 'جيد',
  notes: '',
};

const fmtNum = n => (n ?? 0).toLocaleString('ar-SA');

export default function AssistiveDevicesManagement() {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const g = theme.palette.gradients || {};

  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  // Detail
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignForm, setAssignForm] = useState({
    beneficiaryName: '',
    beneficiaryId: '',
    notes: '',
  });

  // Maintenance dialog
  const [maintOpen, setMaintOpen] = useState(false);
  const [maintTarget, setMaintTarget] = useState(null);
  const [maintForm, setMaintForm] = useState({ description: '', cost: '', nextDate: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await assistiveDeviceService.getAll();
      setDevices(res?.devices || res?.data || assistiveDeviceService.getMockDevices());
      setStats(res?.stats || assistiveDeviceService.getMockStats());
    } catch {
      setDevices(assistiveDeviceService.getMockDevices());
      setStats(assistiveDeviceService.getMockStats());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const st = stats || assistiveDeviceService.getMockStats();

  /* Filtering */
  const filtered = devices.filter(d => {
    const matchSearch =
      !search ||
      d.name?.includes(search) ||
      d.brand?.includes(search) ||
      d.deviceNumber?.includes(search) ||
      d.assignedTo?.name?.includes(search) ||
      d.serialNumber?.includes(search);
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchCat = filterCategory === 'all' || d.category === filterCategory;
    return matchSearch && matchStatus && matchCat;
  });

  /* CRUD */
  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };
  const openEdit = d => {
    setEditId(d._id);
    setForm({
      name: d.name || '',
      category: d.category || '',
      brand: d.brand || '',
      model: d.model || '',
      serialNumber: d.serialNumber || '',
      purchaseDate: d.purchaseDate?.slice(0, 10) || '',
      cost: d.cost || '',
      warranty: d.warranty?.slice(0, 10) || '',
      condition: d.condition || 'جيد',
      notes: d.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { ...form, cost: Number(form.cost) };
    const res = editId
      ? await assistiveDeviceService.update(editId, payload)
      : await assistiveDeviceService.create(payload);
    if (res) {
      showSnackbar(editId ? 'تم تحديث الجهاز' : 'تم إضافة الجهاز', 'success');
      load();
    } else {
      if (editId) {
        setDevices(prev => prev.map(d => (d._id === editId ? { ...d, ...payload } : d)));
      } else {
        const newD = {
          _id: `d-${Date.now()}`,
          deviceNumber: `AD-NEW-${devices.length + 1}`,
          ...payload,
          status: 'available',
          assignedTo: null,
        };
        setDevices(prev => [newD, ...prev]);
      }
      showSnackbar(editId ? 'تم تحديث الجهاز (محلي)' : 'تم إضافة الجهاز (محلي)', 'success');
    }
    setDialogOpen(false);
  };

  const handleDelete = async id => {
    if (!window.confirm('هل تريد حذف هذا الجهاز؟')) return;
    await assistiveDeviceService.update(id, { status: 'retired' });
    setDevices(prev => prev.filter(d => d._id !== id));
    showSnackbar('تم حذف الجهاز', 'success');
  };

  /* Assign */
  const openAssign = d => {
    setAssignTarget(d);
    setAssignForm({ beneficiaryName: '', beneficiaryId: '', notes: '' });
    setAssignOpen(true);
  };
  const handleAssign = async () => {
    await assistiveDeviceService.assign(assignTarget._id, assignForm);
    setDevices(prev =>
      prev.map(d =>
        d._id === assignTarget._id
          ? {
              ...d,
              status: 'assigned',
              assignedTo: { name: assignForm.beneficiaryName, id: assignForm.beneficiaryId },
              assignedDate: new Date().toISOString().slice(0, 10),
            }
          : d
      )
    );
    showSnackbar('تم تخصيص الجهاز للمستفيد', 'success');
    setAssignOpen(false);
  };

  /* Return */
  const handleReturn = async d => {
    if (!window.confirm(`إرجاع الجهاز "${d.name}" من ${d.assignedTo?.name}؟`)) return;
    await assistiveDeviceService.returnDevice(d._id);
    setDevices(prev =>
      prev.map(x =>
        x._id === d._id ? { ...x, status: 'available', assignedTo: null, assignedDate: null } : x
      )
    );
    showSnackbar('تم إرجاع الجهاز', 'success');
  };

  /* Maintenance */
  const openMaint = d => {
    setMaintTarget(d);
    setMaintForm({ description: '', cost: '', nextDate: '' });
    setMaintOpen(true);
  };
  const handleMaint = async () => {
    await assistiveDeviceService.maintenance(maintTarget._id, maintForm);
    setDevices(prev =>
      prev.map(d =>
        d._id === maintTarget._id
          ? {
              ...d,
              status: 'maintenance',
              lastMaintenance: new Date().toISOString().slice(0, 10),
              nextMaintenance: maintForm.nextDate,
              condition: 'يحتاج صيانة',
            }
          : d
      )
    );
    showSnackbar('تم تسجيل الصيانة', 'success');
    setMaintOpen(false);
  };

  const openDetail = d => {
    setSelectedDevice(d);
    setDetailOpen(true);
  };

  const statusChip = s => {
    const map = {
      available: { l: 'متاح', c: 'success' },
      assigned: { l: 'مخصص', c: 'info' },
      maintenance: { l: 'صيانة', c: 'warning' },
      retired: { l: 'مستبعد', c: 'error' },
    };
    const m = map[s] || { l: s, c: 'default' };
    return <Chip label={m.l} color={m.c} size="small" />;
  };

  const conditionColor = c => {
    if (c === 'ممتاز') return 'success';
    if (c === 'جيد') return 'info';
    if (c === 'مقبول') return 'warning';
    return 'error';
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 12 }}>
        <CircularProgress size={48} />
      </Box>
    );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 3,
          borderRadius: 3,
          background: g.primary || 'linear-gradient(135deg,#9c27b0 0%,#6a1b9a 100%)',
          color: '#fff',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={2}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              🦽 إدارة الأجهزة المساعدة
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5, opacity: 0.9 }}>
              المخزون — التخصيص — الصيانة — المتابعة
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{ bgcolor: 'rgba(255,255,255,.2)', '&:hover': { bgcolor: 'rgba(255,255,255,.3)' } }}
          >
            جهاز جديد
          </Button>
        </Stack>
      </Paper>

      {/* ── KPI Row ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي الأجهزة',
            value: fmtNum(st.total),
            icon: <DeviceIcon />,
            color: '#9c27b0',
          },
          { label: 'مخصصة', value: fmtNum(st.assigned), icon: <AssignIcon />, color: '#1976d2' },
          { label: 'متاحة', value: fmtNum(st.available), icon: <CheckIcon />, color: '#2e7d32' },
          {
            label: 'في الصيانة',
            value: fmtNum(st.maintenance),
            icon: <MaintenanceIcon />,
            color: '#ed6c02',
          },
          {
            label: 'تحتاج صيانة',
            value: fmtNum(st.maintenanceDue),
            icon: <WarningIcon />,
            color: '#d32f2f',
          },
          {
            label: 'القيمة الإجمالية',
            value: `${fmtNum(st.totalValue)} ر.س`,
            icon: <CostIcon />,
            color: '#455a64',
          },
        ].map((k, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                textAlign: 'center',
                border: `2px solid ${alpha(k.color, 0.2)}`,
                bgcolor: alpha(k.color, 0.04),
              }}
            >
              <Avatar
                sx={{
                  bgcolor: alpha(k.color, 0.12),
                  color: k.color,
                  mx: 'auto',
                  mb: 1,
                  width: 36,
                  height: 36,
                }}
              >
                {k.icon}
              </Avatar>
              <Typography variant="h6" fontWeight={700} color={k.color}>
                {k.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {k.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── Category Breakdown ── */}
      <Paper
        elevation={0}
        sx={{ p: 2, mb: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}
      >
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          📊 توزيع الفئات
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {Object.entries(st.categories || {}).map(([cat, count]) => (
            <Chip key={cat} label={`${cat}: ${count}`} variant="outlined" icon={<CategoryIcon />} />
          ))}
        </Stack>
      </Paper>

      {/* ── Tabs ── */}
      <Paper
        elevation={0}
        sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: `1px solid ${theme.palette.divider}`, px: 2 }}
        >
          <Tab label="📋 قائمة الأجهزة" />
          <Tab label="🔧 الصيانة المستحقة" />
        </Tabs>

        {/* Filters */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
            <TextField
              size="small"
              placeholder="بحث بالاسم، الرقم، المستفيد..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 250 }}
            />
            <TextField
              select
              size="small"
              label="الحالة"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              {DEVICE_STATUSES.map(o => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="الفئة"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="all">الكل</MenuItem>
              {DEVICE_CATEGORIES.map(c => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <Chip label={`${filtered.length} جهاز`} color="primary" variant="outlined" />
          </Stack>
        </Box>

        {/* ═ Tab 0: All Devices ═ */}
        {tab === 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#9c27b0', 0.05) }}>
                  <TableCell sx={{ fontWeight: 700 }}>الرقم</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الجهاز</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الماركة/الموديل</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المستفيد</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>حالة الجهاز</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التكلفة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الضمان</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(d => (
                  <TableRow key={d._id} hover>
                    <TableCell>
                      <Typography variant="caption" fontWeight={600}>
                        {d.deviceNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {d.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={d.category} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {d.brand} {d.model}
                      </Typography>
                    </TableCell>
                    <TableCell>{statusChip(d.status)}</TableCell>
                    <TableCell>
                      {d.assignedTo ? (
                        <>
                          <Typography variant="body2">{d.assignedTo.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            منذ {d.assignedDate}
                          </Typography>
                        </>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={d.condition} size="small" color={conditionColor(d.condition)} />
                    </TableCell>
                    <TableCell>{fmtNum(d.cost)} ر.س</TableCell>
                    <TableCell>
                      <Typography variant="caption">{d.warranty || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="التفاصيل">
                          <IconButton size="small" color="info" onClick={() => openDetail(d)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton size="small" color="primary" onClick={() => openEdit(d)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {d.status === 'available' && (
                          <Tooltip title="تخصيص">
                            <IconButton size="small" color="success" onClick={() => openAssign(d)}>
                              <AssignIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {d.status === 'assigned' && (
                          <Tooltip title="إرجاع">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleReturn(d)}
                            >
                              <ReturnIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="صيانة">
                          <IconButton size="small" onClick={() => openMaint(d)}>
                            <MaintenanceIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(d._id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">لا توجد أجهزة مطابقة</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* ═ Tab 1: Maintenance Due ═ */}
        {tab === 1 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              🔧 الأجهزة التي تحتاج صيانة
            </Typography>
            <Grid container spacing={2}>
              {devices
                .filter(
                  d =>
                    d.status === 'maintenance' ||
                    d.condition === 'يحتاج صيانة' ||
                    (d.nextMaintenance &&
                      new Date(d.nextMaintenance) <= new Date(Date.now() + 30 * 86400000))
                )
                .map(d => (
                  <Grid item xs={12} sm={6} md={4} key={d._id}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: 2,
                        border: `2px solid ${alpha('#ed6c02', 0.3)}`,
                        bgcolor: alpha('#ed6c02', 0.04),
                      }}
                    >
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="start">
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700}>
                              {d.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {d.deviceNumber} — {d.brand} {d.model}
                            </Typography>
                          </Box>
                          <Chip
                            label={d.condition}
                            size="small"
                            color={conditionColor(d.condition)}
                          />
                        </Stack>
                        <Divider sx={{ my: 1.5 }} />
                        {d.assignedTo && (
                          <Typography variant="body2">
                            المستفيد: <b>{d.assignedTo.name}</b>
                          </Typography>
                        )}
                        <Typography variant="body2">
                          آخر صيانة: <b>{d.lastMaintenance || 'لا يوجد'}</b>
                        </Typography>
                        <Typography variant="body2" color="error.main">
                          الصيانة التالية: <b>{d.nextMaintenance || 'غير محدد'}</b>
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<MaintenanceIcon />}
                          onClick={() => openMaint(d)}
                          sx={{ mt: 1 }}
                        >
                          تسجيل صيانة
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              {devices.filter(d => d.status === 'maintenance' || d.condition === 'يحتاج صيانة')
                .length === 0 && (
                <Grid item xs={12}>
                  <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                    ✅ لا توجد أجهزة تحتاج صيانة حالياً
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* ═══ Create/Edit Dialog ═══ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editId ? 'تعديل الجهاز' : 'إضافة جهاز جديد'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={8}>
              <TextField
                fullWidth
                label="اسم الجهاز"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                select
                fullWidth
                label="الفئة"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {DEVICE_CATEGORIES.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الماركة"
                value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الموديل"
                value={form.model}
                onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الرقم التسلسلي"
                value={form.serialNumber}
                onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                label="الحالة"
                value={form.condition}
                onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
              >
                {CONDITION_OPTIONS.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="تاريخ الشراء"
                type="date"
                value={form.purchaseDate}
                onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="التكلفة (ر.س)"
                type="number"
                value={form.cost}
                onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="انتهاء الضمان"
                type="date"
                value={form.warranty}
                onChange={e => setForm(f => ({ ...f, warranty: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ملاحظات"
                multiline
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
            {editId ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Assign Dialog ═══ */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تخصيص جهاز لمستفيد</DialogTitle>
        <DialogContent dividers>
          {assignTarget && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              الجهاز: <b>{assignTarget.name}</b> ({assignTarget.deviceNumber})
            </Typography>
          )}
          <TextField
            fullWidth
            label="اسم المستفيد"
            value={assignForm.beneficiaryName}
            onChange={e => setAssignForm(f => ({ ...f, beneficiaryName: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="رقم المستفيد"
            value={assignForm.beneficiaryId}
            onChange={e => setAssignForm(f => ({ ...f, beneficiaryId: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="ملاحظات"
            multiline
            rows={2}
            value={assignForm.notes}
            onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAssignOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<AssignIcon />}
            onClick={handleAssign}
          >
            تخصيص
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Maintenance Dialog ═══ */}
      <Dialog open={maintOpen} onClose={() => setMaintOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تسجيل صيانة</DialogTitle>
        <DialogContent dividers>
          {maintTarget && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              الجهاز: <b>{maintTarget.name}</b> ({maintTarget.deviceNumber})
            </Typography>
          )}
          <TextField
            fullWidth
            label="وصف الصيانة"
            multiline
            rows={2}
            value={maintForm.description}
            onChange={e => setMaintForm(f => ({ ...f, description: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="التكلفة (ر.س)"
            type="number"
            value={maintForm.cost}
            onChange={e => setMaintForm(f => ({ ...f, cost: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="تاريخ الصيانة التالية"
            type="date"
            value={maintForm.nextDate}
            onChange={e => setMaintForm(f => ({ ...f, nextDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setMaintOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<MaintenanceIcon />}
            onClick={handleMaint}
          >
            تسجيل
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Detail Dialog ═══ */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        {selectedDevice && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                تفاصيل الجهاز: {selectedDevice.name}
                <IconButton onClick={() => setDetailOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                {[
                  { label: 'رقم الجهاز', value: selectedDevice.deviceNumber },
                  { label: 'الفئة', value: selectedDevice.category },
                  { label: 'الماركة', value: selectedDevice.brand },
                  { label: 'الموديل', value: selectedDevice.model },
                  { label: 'الرقم التسلسلي', value: selectedDevice.serialNumber },
                  { label: 'التكلفة', value: `${fmtNum(selectedDevice.cost)} ر.س` },
                  { label: 'تاريخ الشراء', value: selectedDevice.purchaseDate },
                  { label: 'انتهاء الضمان', value: selectedDevice.warranty || '—' },
                  { label: 'آخر صيانة', value: selectedDevice.lastMaintenance || '—' },
                  { label: 'الصيانة التالية', value: selectedDevice.nextMaintenance || '—' },
                ].map((f, i) => (
                  <Grid item xs={6} key={i}>
                    <Typography variant="caption" color="text.secondary">
                      {f.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {f.value}
                    </Typography>
                  </Grid>
                ))}
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    الحالة
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{statusChip(selectedDevice.status)}</Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    حالة الجهاز
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={selectedDevice.condition}
                      color={conditionColor(selectedDevice.condition)}
                      size="small"
                    />
                  </Box>
                </Grid>
                {selectedDevice.assignedTo && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" fontWeight={700}>
                      المستفيد المخصص له
                    </Typography>
                    <Typography variant="body2">الاسم: {selectedDevice.assignedTo.name}</Typography>
                    <Typography variant="body2">
                      تاريخ التخصيص: {selectedDevice.assignedDate}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
