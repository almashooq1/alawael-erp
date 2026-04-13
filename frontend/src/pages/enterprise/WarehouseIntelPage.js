/**
 * WarehouseIntelPage — المستودعات الذكية
 *
 * Warehouse management: warehouses, bins, stock levels, alerts, transfer orders
 */
import { useState, useEffect, useCallback } from 'react';
import {
  alpha,
} from '@mui/material';


import { useSnackbar } from '../../contexts/SnackbarContext';
import enterpriseProService from '../../services/enterprisePro.service';

const TRANSFER_STATUSES = {
  draft: { label: 'مسودة', color: '#757575', step: 0 },
  approved: { label: 'معتمد', color: '#1565C0', step: 1 },
  shipped: { label: 'تم الشحن', color: '#E65100', step: 2 },
  received: { label: 'تم الاستلام', color: '#2E7D32', step: 3 },
  cancelled: { label: 'ملغي', color: '#C62828', step: -1 },
};

const ALERT_TYPES = {
  low_stock: 'مخزون منخفض',
  overstock: 'تكدس',
  expiry: 'انتهاء صلاحية',
  reorder: 'نقطة إعادة الطلب',
};
const ALERT_COLORS = {
  low_stock: '#C62828',
  overstock: '#F57F17',
  expiry: '#E65100',
  reorder: '#1565C0',
};

const emptyWarehouse = {
  name: '',
  nameAr: '',
  code: '',
  location: { address: '', city: '' },
  type: 'main',
  capacity: '',
  zones: [],
};
const emptyTransfer = {
  fromWarehouse: '',
  toWarehouse: '',
  items: [{ product: '', productName: '', quantity: 1, unit: 'piece' }],
  notes: '',
  priority: 'medium',
};

export default function WarehouseIntelPage() {
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const [warehouses, setWarehouses] = useState([]);
  const [stockLevels, setStockLevels] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [dashboard, setDashboard] = useState(null);

  const [dlgType, setDlgType] = useState(null);
  const [editId, setEditId] = useState(null);
  const [whForm, setWhForm] = useState({ ...emptyWarehouse });
  const [trForm, setTrForm] = useState({ ...emptyTransfer });

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await enterpriseProService.getWarehouses();
      setWarehouses(res.data || []);
    } catch {
      showSnackbar('خطأ', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  const fetchStock = useCallback(async () => {
    try {
      setLoading(true);
      const res = await enterpriseProService.getStockLevels();
      setStockLevels(res.data.stocks || res.data || []);
    } catch {
      showSnackbar('خطأ', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await enterpriseProService.getStockAlerts();
      setAlerts(res.data || []);
    } catch {
      /* silent */
    }
  }, []);

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await enterpriseProService.getStockTransfers();
      setTransfers(res.data.transfers || res.data || []);
    } catch {
      showSnackbar('خطأ', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await enterpriseProService.getWarehouseDashboard();
      setDashboard(res.data);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
    fetchAlerts();
  }, [fetchWarehouses, fetchAlerts]);
  useEffect(() => {
    if (tab === 1) fetchStock();
  }, [tab, fetchStock]);
  useEffect(() => {
    if (tab === 3) fetchTransfers();
  }, [tab, fetchTransfers]);
  useEffect(() => {
    if (tab === 4) fetchDashboard();
  }, [tab, fetchDashboard]);

  const openWhDlg = w => {
    if (w) {
      setEditId(w._id);
      setWhForm({
        name: w.name || '',
        nameAr: w.nameAr || '',
        code: w.code || '',
        location: w.location || { address: '', city: '' },
        type: w.type || 'main',
        capacity: w.capacity || '',
        zones: w.zones || [],
      });
    } else {
      setEditId(null);
      setWhForm({ ...emptyWarehouse });
    }
    setDlgType('warehouse');
  };

  const openTrDlg = () => {
    setEditId(null);
    setTrForm({ ...emptyTransfer });
    setDlgType('transfer');
  };

  const closeDlg = () => {
    setDlgType(null);
    setEditId(null);
  };

  const saveWarehouse = async () => {
    try {
      if (!whForm.name) {
        showSnackbar('الاسم مطلوب', 'warning');
        return;
      }
      if (editId) await enterpriseProService.updateWarehouse(editId, whForm);
      else await enterpriseProService.createWarehouse(whForm);
      showSnackbar(editId ? 'تم التحديث' : 'تمت الإضافة', 'success');
      closeDlg();
      fetchWarehouses();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const deleteWarehouse = async id => {
    try {
      await enterpriseProService.deleteWarehouse(id);
      showSnackbar('تم الحذف', 'success');
      fetchWarehouses();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const createTransfer = async () => {
    try {
      if (!trForm.fromWarehouse || !trForm.toWarehouse) {
        showSnackbar('المستودعات مطلوبة', 'warning');
        return;
      }
      await enterpriseProService.createStockTransfer(trForm);
      showSnackbar('تم إنشاء أمر النقل', 'success');
      closeDlg();
      fetchTransfers();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const resolveAlert = async id => {
    try {
      await enterpriseProService.resolveStockAlert(id);
      showSnackbar('تم المعالجة', 'success');
      fetchAlerts();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleTransferAction = async (id, action) => {
    try {
      if (action === 'approve') await enterpriseProService.approveStockTransfer(id);
      else if (action === 'ship') await enterpriseProService.shipStockTransfer(id);
      else if (action === 'receive') await enterpriseProService.receiveStockTransfer(id);
      showSnackbar('تم التحديث', 'success');
      fetchTransfers();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const addTransferItem = () => {
    setTrForm(f => ({
      ...f,
      items: [...f.items, { product: '', productName: '', quantity: 1, unit: 'piece' }],
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <WHIcon sx={{ fontSize: 36, color: '#00695C' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              المستودعات الذكية
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Warehouse Intelligence
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            sx={{ bgcolor: '#00695C' }}
            onClick={() => openWhDlg()}
          >
            مستودع جديد
          </Button>
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchWarehouses}>
            تحديث
          </Button>
        </Box>
      </Box>

      {/* Alerts Banner */}
      {alerts.filter(a => !a.resolved).length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          يوجد {alerts.filter(a => !a.resolved).length} تنبيه مخزون نشط — تحقق من تبويب التنبيهات
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="المستودعات" icon={<WHIcon />} iconPosition="start" />
        <Tab label="مستويات المخزون" icon={<StockIcon />} iconPosition="start" />
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              التنبيهات{' '}
              {alerts.filter(a => !a.resolved).length > 0 && (
                <Chip label={alerts.filter(a => !a.resolved).length} size="small" color="error" />
              )}
            </Box>
          }
          icon={<AlertIcon />}
          iconPosition="start"
        />
        <Tab label="أوامر النقل" icon={<TransferIcon />} iconPosition="start" />
        <Tab label="لوحة المعلومات" icon={<DashIcon />} iconPosition="start" />
      </Tabs>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ── Tab 0: Warehouses ── */}
      {tab === 0 && (
        <Grid container spacing={2}>
          {warehouses.map(w => (
            <Grid item xs={12} md={4} key={w._id}>
              <Card sx={{ '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.3s' }}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {w.nameAr || w.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {w.code}
                      </Typography>
                    </Box>
                    <Chip
                      label={w.type === 'main' ? 'رئيسي' : w.type === 'transit' ? 'عبور' : w.type}
                      size="small"
                      color={w.type === 'main' ? 'primary' : 'default'}
                    />
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    {w.location?.city || '—'} — {w.location?.address || ''}
                  </Typography>
                  {w.capacity && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      السعة: {w.capacity.toLocaleString()}
                    </Typography>
                  )}
                  {w.zones?.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {w.zones.map((z, i) => (
                        <Chip
                          key={i}
                          label={z.name}
                          size="small"
                          variant="outlined"
                          icon={<BinIcon sx={{ fontSize: 14 }} />}
                        />
                      ))}
                    </Box>
                  )}
                  <Box sx={{ mt: 2, display: 'flex', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => openWhDlg(w)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => deleteWarehouse(w._id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {warehouses.length === 0 && !loading && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">لا توجد مستودعات</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* ── Tab 1: Stock Levels ── */}
      {tab === 1 && (
        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#00695C', 0.05) }}>
                  <TableCell>المنتج</TableCell>
                  <TableCell>المستودع</TableCell>
                  <TableCell>المنطقة / الرف</TableCell>
                  <TableCell>الكمية</TableCell>
                  <TableCell>نقطة إعادة الطلب</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>التقييم</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stockLevels.map(s => {
                  const isLow = s.quantity <= (s.reorderPoint || 0);
                  return (
                    <TableRow
                      key={s._id}
                      hover
                      sx={isLow ? { bgcolor: alpha('#C62828', 0.05) } : {}}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {s.product?.name || s.productName || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{s.warehouse?.nameAr || s.warehouse?.name || '—'}</TableCell>
                      <TableCell>
                        {s.zone || '—'} / {s.bin || '—'}
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600} color={isLow ? 'error' : 'inherit'}>
                          {s.quantity?.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>{s.reorderPoint || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={isLow ? 'منخفض' : 'طبيعي'}
                          size="small"
                          color={isLow ? 'error' : 'success'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{s.valuationMethod || '—'}</TableCell>
                    </TableRow>
                  );
                })}
                {stockLevels.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      لا توجد بيانات مخزون
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ── Tab 2: Alerts ── */}
      {tab === 2 && (
        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#C62828', 0.05) }}>
                  <TableCell>النوع</TableCell>
                  <TableCell>المنتج</TableCell>
                  <TableCell>المستودع</TableCell>
                  <TableCell>الرسالة</TableCell>
                  <TableCell>الخطورة</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>إجراء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alerts.map(a => (
                  <TableRow key={a._id} hover sx={a.resolved ? { opacity: 0.5 } : {}}>
                    <TableCell>
                      <Chip
                        label={ALERT_TYPES[a.type] || a.type}
                        size="small"
                        sx={{ bgcolor: alpha(ALERT_COLORS[a.type] || '#666', 0.1) }}
                      />
                    </TableCell>
                    <TableCell>{a.product?.name || a.productName || '—'}</TableCell>
                    <TableCell>{a.warehouse?.nameAr || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{a.message || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={a.severity}
                        size="small"
                        color={
                          a.severity === 'critical'
                            ? 'error'
                            : a.severity === 'high'
                              ? 'warning'
                              : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>
                      {new Date(a.createdAt).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      {!a.resolved && (
                        <Button size="small" color="success" onClick={() => resolveAlert(a._id)}>
                          معالجة
                        </Button>
                      )}
                      {a.resolved && (
                        <Chip
                          label="تمت المعالجة"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {alerts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      لا توجد تنبيهات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ── Tab 3: Transfer Orders ── */}
      {tab === 3 && (
        <Box>
          <Box sx={{ mb: 2 }}>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              sx={{ bgcolor: '#00695C' }}
              onClick={openTrDlg}
            >
              أمر نقل جديد
            </Button>
          </Box>
          <Paper sx={{ p: 2 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha('#00695C', 0.05) }}>
                    <TableCell>رقم الأمر</TableCell>
                    <TableCell>من</TableCell>
                    <TableCell>إلى</TableCell>
                    <TableCell>الأصناف</TableCell>
                    <TableCell>الأولوية</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>التقدم</TableCell>
                    <TableCell>إجراء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transfers.map(t => {
                    const statusInfo = TRANSFER_STATUSES[t.status] || {};
                    return (
                      <TableRow key={t._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="primary">
                            {t.transferNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {t.fromWarehouse?.nameAr || t.fromWarehouse?.name || '—'}
                        </TableCell>
                        <TableCell>{t.toWarehouse?.nameAr || t.toWarehouse?.name || '—'}</TableCell>
                        <TableCell>{t.items?.length || 0} صنف</TableCell>
                        <TableCell>
                          <Chip
                            label={
                              t.priority === 'high'
                                ? 'عالي'
                                : t.priority === 'urgent'
                                  ? 'عاجل'
                                  : 'عادي'
                            }
                            size="small"
                            color={
                              t.priority === 'urgent'
                                ? 'error'
                                : t.priority === 'high'
                                  ? 'warning'
                                  : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusInfo.label}
                            size="small"
                            sx={{
                              bgcolor: alpha(statusInfo.color || '#666', 0.15),
                              color: statusInfo.color,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stepper
                            activeStep={statusInfo.step >= 0 ? statusInfo.step : 0}
                            sx={{ minWidth: 160 }}
                          >
                            {['مسودة', 'اعتماد', 'شحن', 'استلام'].map(l => (
                              <Step key={l}>
                                <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.6rem' } }}>
                                  {l}
                                </StepLabel>
                              </Step>
                            ))}
                          </Stepper>
                        </TableCell>
                        <TableCell>
                          {t.status === 'draft' && (
                            <IconButton
                              size="small"
                              color="primary"
                              title="اعتماد"
                              onClick={() => handleTransferAction(t._id, 'approve')}
                            >
                              <ApproveIcon fontSize="small" />
                            </IconButton>
                          )}
                          {t.status === 'approved' && (
                            <IconButton
                              size="small"
                              color="warning"
                              title="شحن"
                              onClick={() => handleTransferAction(t._id, 'ship')}
                            >
                              <ShipIcon fontSize="small" />
                            </IconButton>
                          )}
                          {t.status === 'shipped' && (
                            <IconButton
                              size="small"
                              color="success"
                              title="استلام"
                              onClick={() => handleTransferAction(t._id, 'receive')}
                            >
                              <ReceiveIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {transfers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        لا توجد أوامر نقل
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* ── Tab 4: Dashboard ── */}
      {tab === 4 && dashboard && (
        <Grid container spacing={2}>
          {[
            { label: 'المستودعات', value: dashboard.warehouseCount, color: '#00695C' },
            { label: 'إجمالي الأصناف', value: dashboard.totalProducts, color: '#1565C0' },
            { label: 'مخزون منخفض', value: dashboard.lowStockCount, color: '#C62828' },
            { label: 'أوامر نقل نشطة', value: dashboard.activeTransfers, color: '#E65100' },
          ].map((s, i) => (
            <Grid item xs={3} key={i}>
              <Card
                sx={{ background: `linear-gradient(135deg, ${alpha(s.color, 0.12)}, transparent)` }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color={s.color}>
                    {s.value || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Warehouse Dialog ── */}
      <Dialog open={dlgType === 'warehouse'} onClose={closeDlg} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'تعديل المستودع' : 'مستودع جديد'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم (EN)"
                value={whForm.name}
                onChange={e => setWhForm(f => ({ ...f, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم (عربي)"
                value={whForm.nameAr}
                onChange={e => setWhForm(f => ({ ...f, nameAr: e.target.value }))}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="الرمز"
                value={whForm.code}
                onChange={e => setWhForm(f => ({ ...f, code: e.target.value }))}
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <Select
                  value={whForm.type}
                  onChange={e => setWhForm(f => ({ ...f, type: e.target.value }))}
                >
                  <MenuItem value="main">رئيسي</MenuItem>
                  <MenuItem value="sub">فرعي</MenuItem>
                  <MenuItem value="transit">عبور</MenuItem>
                  <MenuItem value="quarantine">حجر</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="السعة"
                type="number"
                value={whForm.capacity}
                onChange={e => setWhForm(f => ({ ...f, capacity: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المدينة"
                value={whForm.location.city}
                onChange={e =>
                  setWhForm(f => ({ ...f, location: { ...f.location, city: e.target.value } }))
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="العنوان"
                value={whForm.location.address}
                onChange={e =>
                  setWhForm(f => ({ ...f, location: { ...f.location, address: e.target.value } }))
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDlg}>إلغاء</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={saveWarehouse}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Transfer Order Dialog ── */}
      <Dialog open={dlgType === 'transfer'} onClose={closeDlg} maxWidth="sm" fullWidth>
        <DialogTitle>أمر نقل جديد</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <Select
                  value={trForm.fromWarehouse}
                  onChange={e => setTrForm(f => ({ ...f, fromWarehouse: e.target.value }))}
                  displayEmpty
                >
                  <MenuItem value="">من مستودع...</MenuItem>
                  {warehouses.map(w => (
                    <MenuItem key={w._id} value={w._id}>
                      {w.nameAr || w.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <Select
                  value={trForm.toWarehouse}
                  onChange={e => setTrForm(f => ({ ...f, toWarehouse: e.target.value }))}
                  displayEmpty
                >
                  <MenuItem value="">إلى مستودع...</MenuItem>
                  {warehouses.map(w => (
                    <MenuItem key={w._id} value={w._id}>
                      {w.nameAr || w.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Divider>
                <Chip label="الأصناف" size="small" />
              </Divider>
            </Grid>
            {trForm.items.map((item, idx) => (
              <Grid item xs={12} key={idx}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    label="المنتج"
                    value={item.productName}
                    onChange={e => {
                      const items = [...trForm.items];
                      items[idx].productName = e.target.value;
                      setTrForm(f => ({ ...f, items }));
                    }}
                    sx={{ flex: 2 }}
                  />
                  <TextField
                    size="small"
                    label="الكمية"
                    type="number"
                    value={item.quantity}
                    onChange={e => {
                      const items = [...trForm.items];
                      items[idx].quantity = Number(e.target.value);
                      setTrForm(f => ({ ...f, items }));
                    }}
                    sx={{ flex: 1 }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() =>
                      setTrForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
                    }
                    disabled={trForm.items.length === 1}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Button size="small" onClick={addTransferItem}>
                + إضافة صنف
              </Button>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ملاحظات"
                value={trForm.notes}
                onChange={e => setTrForm(f => ({ ...f, notes: e.target.value }))}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDlg}>إلغاء</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={createTransfer}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
