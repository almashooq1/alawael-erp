import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  Grid,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating,
  Tooltip,} from '@mui/material';
import {
  ShoppingCart as PurIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Store as VendorIcon,
  Description as POIcon,
  Visibility as ViewIcon,
  Check as ApproveIcon,
  } from '@mui/icons-material';
import { purchasingService } from 'services/operationsService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const poStatusConfig = {
  draft: { label: 'مسودة', color: 'default' },
  pending: { label: 'بانتظار الموافقة', color: 'warning' },
  approved: { label: 'معتمد', color: 'info' },
  ordered: { label: 'تم الطلب', color: 'primary' },
  received: { label: 'مستلم', color: 'success' },
  cancelled: { label: 'ملغي', color: 'error' },
};

const paymentTermLabels = {
  immediate: 'فوري',
  net15: 'صافي 15 يوم',
  net30: 'صافي 30 يوم',
  net45: 'صافي 45 يوم',
  net60: 'صافي 60 يوم',
};

const PurchasingManagement = () => {
  const showSnackbar = useSnackbar();
  const [tab, setTab] = useState(0);
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vendorDialog, setVendorDialog] = useState(false);
  const [viewPO, setViewPO] = useState(null);
  const [vendorForm, setVendorForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    type: 'company',
    paymentTerms: 'net30',
    creditLimit: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [v, o, s] = await Promise.all([
        purchasingService.getVendors(),
        purchasingService.getPurchaseOrders(),
        purchasingService.getStats(),
      ]);
      setVendors(Array.isArray(v?.data) ? v.data : purchasingService.getMockVendors());
      setOrders(Array.isArray(o?.data) ? o.data : purchasingService.getMockPOs());
      setStats(s || purchasingService.getMockStats());
    } catch {
      setVendors(purchasingService.getMockVendors());
      setOrders(purchasingService.getMockPOs());
      setStats(purchasingService.getMockStats());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveVendor = async () => {
    try {
      await purchasingService.createVendor(vendorForm);
      showSnackbar('تم إضافة المورد بنجاح', 'success');
      setVendorDialog(false);
      loadData();
    } catch {
      showSnackbar('فشل في إضافة المورد', 'error');
    }
  };

  const handleApprovePO = async id => {
    try {
      await purchasingService.approvePO(id);
      showSnackbar('تم اعتماد أمر الشراء', 'success');
      loadData();
    } catch {
      showSnackbar('فشل في الاعتماد', 'error');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <PurIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  إدارة المشتريات
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  الموردين وطلبات الشراء وأوامر الشراء
                </Typography>
              </Box>
            </Box>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setVendorDialog(true)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                borderRadius: 2,
              }}
            >
              إضافة مورد
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'أوامر الشراء', value: stats.totalOrders, color: brandColors.primary },
            {
              label: 'إجمالي المبالغ',
              value: `${stats.totalAmount?.toLocaleString()} ر.س`,
              color: statusColors.success,
            },
            {
              label: 'بانتظار الموافقة',
              value: stats.pendingApproval,
              color: statusColors.warning,
            },
            { label: 'تم التسليم', value: stats.delivered, color: statusColors.info },
            { label: 'الموردين', value: stats.vendors, color: brandColors.primary },
            {
              label: 'متوسط التسليم',
              value: `${stats.avgDeliveryDays} أيام`,
              color: neutralColors.textSecondary,
            },
          ].map((s, i) => (
            <Grid item xs={2} key={i}>
              <Card
                sx={{
                  borderRadius: 2.5,
                  border: `1px solid ${surfaceColors.border}`,
                  textAlign: 'center',
                }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h6" fontWeight={800} sx={{ color: s.color }}>
                    {s.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tabs */}
      <Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent sx={{ pb: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab
                icon={<POIcon />}
                iconPosition="start"
                label={`أوامر الشراء (${orders.length})`}
              />
              <Tab
                icon={<VendorIcon />}
                iconPosition="start"
                label={`الموردين (${vendors.length})`}
              />
            </Tabs>
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
              sx={{ width: 250 }}
            />
          </Box>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}

      {/* PO Table */}
      {tab === 0 && (
        <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.background }}>
                  <TableCell sx={{ fontWeight: 700 }}>رقم الأمر</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المورد</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>تاريخ التسليم</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    الأصناف
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="left">
                    المبلغ
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders
                  .filter(
                    o => !search || o.orderNumber?.includes(search) || o.vendor?.includes(search)
                  )
                  .map(po => (
                    <TableRow key={po._id} hover>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {po.orderNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {po.vendor}
                        </Typography>
                      </TableCell>
                      <TableCell>{po.date}</TableCell>
                      <TableCell>{po.deliveryDate}</TableCell>
                      <TableCell>
                        <Chip label={po.department} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">{po.items}</TableCell>
                      <TableCell align="left">
                        <Typography fontWeight={700} sx={{ color: brandColors.primary }}>
                          {po.totalAmount?.toLocaleString()} ر.س
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={poStatusConfig[po.status]?.label || po.status}
                          color={poStatusConfig[po.status]?.color || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="عرض">
                          <IconButton size="small" onClick={() => setViewPO(po)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {po.status === 'pending' && (
                          <Tooltip title="اعتماد">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleApprovePO(po._id)}
                            >
                              <ApproveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Vendors Table */}
      {tab === 1 && (
        <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.background }}>
                  <TableCell sx={{ fontWeight: 700 }}>رقم المورد</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الاسم</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المدينة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>البريد</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الهاتف</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>شروط الدفع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التقييم</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="left">
                    إجمالي الطلبات
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vendors
                  .filter(
                    v => !search || v.name?.includes(search) || v.vendorNumber?.includes(search)
                  )
                  .map(v => (
                    <TableRow key={v._id} hover>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {v.vendorNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {v.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{v.city}</TableCell>
                      <TableCell>{v.email}</TableCell>
                      <TableCell>{v.phone}</TableCell>
                      <TableCell>
                        <Chip
                          label={paymentTermLabels[v.paymentTerms] || v.paymentTerms}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Rating value={v.rating} readOnly size="small" />
                      </TableCell>
                      <TableCell align="left">
                        <Typography fontWeight={600}>
                          {v.totalAmount?.toLocaleString()} ر.س
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={v.isActive ? 'نشط' : 'غير نشط'}
                          color={v.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* PO View Dialog */}
      <Dialog
        open={!!viewPO}
        onClose={() => setViewPO(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          تفاصيل أمر الشراء
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          {viewPO && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  رقم الأمر
                </Typography>
                <Typography fontWeight={700}>{viewPO.orderNumber}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  المورد
                </Typography>
                <Typography fontWeight={700}>{viewPO.vendor}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  التاريخ
                </Typography>
                <Typography fontWeight={600}>{viewPO.date}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  تاريخ التسليم
                </Typography>
                <Typography fontWeight={600}>{viewPO.deliveryDate}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  القسم
                </Typography>
                <Typography fontWeight={600}>{viewPO.department}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  عدد الأصناف
                </Typography>
                <Typography fontWeight={600}>{viewPO.items}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الحالة
                </Typography>
                <Chip
                  label={poStatusConfig[viewPO.status]?.label}
                  color={poStatusConfig[viewPO.status]?.color}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  المبلغ
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: brandColors.primary }}>
                  {viewPO.totalAmount?.toLocaleString()} ر.س
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewPO(null)} variant="contained" sx={{ borderRadius: 2 }}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* Vendor Dialog */}
      <Dialog
        open={vendorDialog}
        onClose={() => setVendorDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          إضافة مورد جديد
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اسم المورد *"
                value={vendorForm.name}
                onChange={e => setVendorForm(f => ({ ...f, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="البريد الإلكتروني"
                value={vendorForm.email}
                onChange={e => setVendorForm(f => ({ ...f, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الهاتف"
                value={vendorForm.phone}
                onChange={e => setVendorForm(f => ({ ...f, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المدينة"
                value={vendorForm.city}
                onChange={e => setVendorForm(f => ({ ...f, city: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>شروط الدفع</InputLabel>
                <Select
                  value={vendorForm.paymentTerms}
                  label="شروط الدفع"
                  onChange={e => setVendorForm(f => ({ ...f, paymentTerms: e.target.value }))}
                >
                  {Object.entries(paymentTermLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الحد الائتماني"
                type="number"
                value={vendorForm.creditLimit}
                onChange={e => setVendorForm(f => ({ ...f, creditLimit: e.target.value }))}
                InputProps={{ endAdornment: <InputAdornment position="end">ر.س</InputAdornment> }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setVendorDialog(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveVendor}
            disabled={!vendorForm.name}
            sx={{ borderRadius: 2 }}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PurchasingManagement;
