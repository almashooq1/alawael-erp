/**
 * 🔄 تحويلات المخزون بين الفروع — Stock Transfers Between Branches
 * AlAwael ERP — Inter-Branch Transfer Management
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
  Avatar,
  Stepper,
  Step,
  StepLabel,
  Divider,  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  LocalShipping as ShippingIcon,
  SwapHoriz as TransferIcon,
  Inventory as InventoryIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Schedule as PendingIcon,
  Drafts as DraftIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  CallReceived as ReceiveIcon,
  ArrowForward as ArrowIcon,
  } from '@mui/icons-material';
import { useSnackbar } from 'contexts/SnackbarContext';
import { gradients, surfaceColors } from 'theme/palette';
import {
  stockTransferService,
  warehouseService,} from 'services/branchWarehouseService';

const statusConfig = {
  draft: { label: 'مسودة', color: 'default', icon: <DraftIcon fontSize="small" /> },
  pending: { label: 'قيد الانتظار', color: 'warning', icon: <PendingIcon fontSize="small" /> },
  shipped: { label: 'تم الشحن', color: 'info', icon: <ShippingIcon fontSize="small" /> },
  received: { label: 'تم الاستلام', color: 'success', icon: <CheckIcon fontSize="small" /> },
  cancelled: { label: 'ملغي', color: 'error', icon: <CancelIcon fontSize="small" /> },
};
const statusSteps = ['مسودة', 'قيد الانتظار', 'تم الشحن', 'تم الاستلام'];
const stepIndexMap = { draft: 0, pending: 1, shipped: 2, received: 3 };

const StockTransfers = () => {
  const { showSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  const [form, setForm] = useState({
    fromWarehouse: '',
    toWarehouse: '',
    notes: '',
    items: [{ product: '', quantity: 1, notes: '' }],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [trData, whData, trStats] = await Promise.all([
        stockTransferService.getAll(),
        warehouseService.getAll(),
        stockTransferService.getMockStats(),
      ]);
      setTransfers(trData || stockTransferService.getMockTransfers());
      setWarehouses(whData || warehouseService.getMockWarehouses());
      setStats(trStats || {});
    } catch {
      setTransfers(stockTransferService.getMockTransfers());
      setWarehouses(warehouseService.getMockWarehouses());
      setStats(stockTransferService.getMockStats());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filterByTab = list => {
    if (tabValue === 1) return list.filter(t => t.status === 'draft' || t.status === 'pending');
    if (tabValue === 2) return list.filter(t => t.status === 'shipped');
    if (tabValue === 3) return list.filter(t => t.status === 'received');
    return list;
  };

  const filteredTransfers = filterByTab(transfers).filter(t => {
    const matchSearch =
      t.transferNumber?.toLowerCase().includes(search.toLowerCase()) ||
      t.fromWarehouse?.toLowerCase().includes(search.toLowerCase()) ||
      t.toWarehouse?.toLowerCase().includes(search.toLowerCase()) ||
      t.notes?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = async () => {
    try {
      await stockTransferService.create(form);
      showSnackbar('تم إنشاء التحويل بنجاح', 'success');
      setCreateDialogOpen(false);
      setForm({
        fromWarehouse: '',
        toWarehouse: '',
        notes: '',
        items: [{ product: '', quantity: 1, notes: '' }],
      });
      loadData();
    } catch {
      showSnackbar('حدث خطأ أثناء الإنشاء', 'error');
    }
  };

  const handleShip = async id => {
    try {
      await stockTransferService.ship(id);
      showSnackbar('تم شحن التحويل', 'success');
      loadData();
    } catch {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleReceive = async id => {
    try {
      await stockTransferService.receive(id);
      showSnackbar('تم استلام التحويل', 'success');
      loadData();
    } catch {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleCancel = async id => {
    try {
      await stockTransferService.cancel(id);
      showSnackbar('تم إلغاء التحويل', 'warning');
      loadData();
    } catch {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const addItem = () =>
    setForm({ ...form, items: [...form.items, { product: '', quantity: 1, notes: '' }] });
  const removeItem = idx => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: val };
    setForm({ ...form, items });
  };

  const kpiCards = [
    {
      label: 'إجمالي التحويلات',
      value: stats.total || 42,
      icon: <TransferIcon />,
      gradient: gradients.primary,
    },
    {
      label: 'مسودات',
      value: stats.draft || 5,
      icon: <DraftIcon />,
      gradient: gradients.info || 'linear-gradient(135deg, #1E88E5 0%, #42A5F5 100%)',
    },
    {
      label: 'قيد الانتظار',
      value: stats.pending || 8,
      icon: <PendingIcon />,
      gradient: gradients.warning || 'linear-gradient(135deg, #FF8F00 0%, #FFB300 100%)',
    },
    {
      label: 'تم الشحن',
      value: stats.shipped || 3,
      icon: <ShippingIcon />,
      gradient: gradients.secondary || 'linear-gradient(135deg, #7B1FA2 0%, #AB47BC 100%)',
    },
    {
      label: 'تم الاستلام',
      value: stats.received || 24,
      icon: <CheckIcon />,
      gradient: gradients.success || 'linear-gradient(135deg, #43A047 0%, #66BB6A 100%)',
    },
    {
      label: 'إجمالي القيمة',
      value: `${((stats.totalValue || 1250000) / 1000000).toFixed(1)}M ر.س`,
      icon: <InventoryIcon />,
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
                <TransferIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  تحويلات المخزون
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  إدارة التحويلات بين المستودعات والفروع
                </Typography>
              </Box>
            </Box>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                تحويل جديد
              </Button>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={loadData}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
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
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label={`الكل (${transfers.length})`} />
            <Tab
              label={`قيد التنفيذ (${transfers.filter(t => t.status === 'draft' || t.status === 'pending').length})`}
            />
            <Tab label={`في الطريق (${transfers.filter(t => t.status === 'shipped').length})`} />
            <Tab label={`مكتملة (${transfers.filter(t => t.status === 'received').length})`} />
          </Tabs>
        </Box>
        <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="بحث بالرقم أو المستودع..."
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
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              label="الحالة"
            >
              <MenuItem value="all">جميع الحالات</MenuItem>
              {Object.entries(statusConfig).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Card>

      {/* ── TRANSFERS TABLE ── */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: surfaceColors?.background || '#fafafa' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>رقم التحويل</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>من المستودع</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}></TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>إلى المستودع</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الأصناف</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>القيمة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTransfers.map(tr => (
              <TableRow key={tr._id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold" color="primary">
                    {tr.transferNumber}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">{tr.fromWarehouse}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tr.fromBranch}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <ArrowIcon color="action" />
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">{tr.toWarehouse}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tr.toBranch}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{tr.date}</TableCell>
                <TableCell>
                  <Chip label={`${tr.items} صنف`} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{tr.totalValue?.toLocaleString()} ر.س</TableCell>
                <TableCell>
                  <Chip
                    icon={statusConfig[tr.status]?.icon}
                    label={statusConfig[tr.status]?.label}
                    color={statusConfig[tr.status]?.color}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={0.5}>
                    <Tooltip title="عرض التفاصيل">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedTransfer(tr);
                          setDetailDialogOpen(true);
                        }}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {(tr.status === 'draft' || tr.status === 'pending') && (
                      <Tooltip title="شحن">
                        <IconButton size="small" color="primary" onClick={() => handleShip(tr._id)}>
                          <SendIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {tr.status === 'shipped' && (
                      <Tooltip title="استلام">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleReceive(tr._id)}
                        >
                          <ReceiveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {tr.status !== 'received' && tr.status !== 'cancelled' && (
                      <Tooltip title="إلغاء">
                        <IconButton size="small" color="error" onClick={() => handleCancel(tr._id)}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredTransfers.length === 0 && !loading && (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">لا توجد تحويلات تطابق البحث</Typography>
          </Box>
        )}
      </TableContainer>

      {/* ═══ CREATE TRANSFER DIALOG ═══ */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>إنشاء تحويل مخزون جديد</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={5}>
              <FormControl fullWidth>
                <InputLabel>من المستودع</InputLabel>
                <Select
                  value={form.fromWarehouse}
                  onChange={e => setForm({ ...form, fromWarehouse: e.target.value })}
                  label="من المستودع"
                >
                  {warehouses
                    .filter(w => w.isActive !== false)
                    .map(w => (
                      <MenuItem key={w._id} value={w._id}>
                        {w.name} — {w.branchName}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={2} display="flex" alignItems="center" justifyContent="center">
              <ArrowIcon color="primary" sx={{ fontSize: 32 }} />
            </Grid>
            <Grid item xs={5}>
              <FormControl fullWidth>
                <InputLabel>إلى المستودع</InputLabel>
                <Select
                  value={form.toWarehouse}
                  onChange={e => setForm({ ...form, toWarehouse: e.target.value })}
                  label="إلى المستودع"
                >
                  {warehouses
                    .filter(w => w.isActive !== false && w._id !== form.fromWarehouse)
                    .map(w => (
                      <MenuItem key={w._id} value={w._id}>
                        {w.name} — {w.branchName}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Chip label="الأصناف" />
              </Divider>
            </Grid>

            {form.items.map((item, idx) => (
              <React.Fragment key={idx}>
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    label={`المنتج ${idx + 1}`}
                    value={item.product}
                    onChange={e => updateItem(idx, 'product', e.target.value)}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="الكمية"
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label="ملاحظات"
                    value={item.notes}
                    onChange={e => updateItem(idx, 'notes', e.target.value)}
                  />
                </Grid>
                <Grid item xs={1} display="flex" alignItems="center">
                  {form.items.length > 1 && (
                    <IconButton color="error" size="small" onClick={() => removeItem(idx)}>
                      <CancelIcon fontSize="small" />
                    </IconButton>
                  )}
                </Grid>
              </React.Fragment>
            ))}

            <Grid item xs={12}>
              <Button size="small" startIcon={<AddIcon />} onClick={addItem}>
                إضافة صنف
              </Button>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات عامة"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.fromWarehouse || !form.toWarehouse}
          >
            إنشاء التحويل
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ TRANSFER DETAIL DIALOG ═══ */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>تفاصيل التحويل — {selectedTransfer?.transferNumber}</DialogTitle>
        <DialogContent>
          {selectedTransfer && (
            <Box>
              {/* Stepper */}
              {selectedTransfer.status !== 'cancelled' && (
                <Stepper
                  activeStep={stepIndexMap[selectedTransfer.status] || 0}
                  alternativeLabel
                  sx={{ mb: 3, mt: 1 }}
                >
                  {statusSteps.map(label => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              )}

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    من المستودع
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedTransfer.fromWarehouse}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedTransfer.fromBranch}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    إلى المستودع
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedTransfer.toWarehouse}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedTransfer.toBranch}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    تاريخ الإنشاء
                  </Typography>
                  <Typography variant="body1">{selectedTransfer.date}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    طلب بواسطة
                  </Typography>
                  <Typography variant="body1">{selectedTransfer.requestedBy}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    عدد الأصناف
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedTransfer.items}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    إجمالي الكمية
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedTransfer.totalQuantity}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    القيمة الإجمالية
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedTransfer.totalValue?.toLocaleString()} ر.س
                  </Typography>
                </Grid>
                {selectedTransfer.shippedAt && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      تاريخ الشحن
                    </Typography>
                    <Typography variant="body1">{selectedTransfer.shippedAt}</Typography>
                  </Grid>
                )}
                {selectedTransfer.receivedAt && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      تاريخ الاستلام
                    </Typography>
                    <Typography variant="body1">{selectedTransfer.receivedAt}</Typography>
                  </Grid>
                )}
                {selectedTransfer.notes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      ملاحظات
                    </Typography>
                    <Typography variant="body1">{selectedTransfer.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>إغلاق</Button>
          {selectedTransfer &&
            (selectedTransfer.status === 'draft' || selectedTransfer.status === 'pending') && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<SendIcon />}
                onClick={() => {
                  handleShip(selectedTransfer._id);
                  setDetailDialogOpen(false);
                }}
              >
                شحن
              </Button>
            )}
          {selectedTransfer?.status === 'shipped' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<ReceiveIcon />}
              onClick={() => {
                handleReceive(selectedTransfer._id);
                setDetailDialogOpen(false);
              }}
            >
              استلام
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockTransfers;
