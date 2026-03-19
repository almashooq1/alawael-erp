/**
 * Vendor & Supplier Relationship Management — إدارة علاقات الموردين
 * Vendors, RFQs, Evaluations, Purchase Orders
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  IconButton,
  Chip,
  Avatar,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  MenuItem,
  Tab,
  Tabs,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Rating,
  Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Store as VendorIcon,
  RequestQuote as RFQIcon,
  Assessment as EvalIcon,
  ShoppingCart as POIcon,
  Close as CloseIcon,
  Star as StarIcon,
  Gavel as AwardIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import * as svc from '../../services/enterpriseProPlus.service';

const VENDOR_STATUSES = {
  pending: 'معلق',
  approved: 'معتمد',
  suspended: 'موقوف',
  blacklisted: 'محظور',
};
const VENDOR_STATUS_COLORS = {
  pending: 'warning',
  approved: 'success',
  suspended: 'error',
  blacklisted: 'error',
};
const RFQ_STATUSES = {
  draft: 'مسودة',
  published: 'منشور',
  evaluation: 'تقييم',
  awarded: 'تم الترسية',
  cancelled: 'ملغي',
};
const RFQ_STATUS_COLORS = {
  draft: 'default',
  published: 'info',
  evaluation: 'warning',
  awarded: 'success',
  cancelled: 'error',
};
const PO_STATUSES = {
  draft: 'مسودة',
  sent: 'مرسل',
  confirmed: 'مؤكد',
  partial: 'جزئي',
  delivered: 'مستلم',
  cancelled: 'ملغي',
};
const PO_STATUS_COLORS = {
  draft: 'default',
  sent: 'info',
  confirmed: 'primary',
  partial: 'warning',
  delivered: 'success',
  cancelled: 'error',
};

export default function VendorManagementPage() {
  const showSnackbar = useSnackbar();
  const [tab, setTab] = useState(0);
  const [vendors, setVendors] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vendorDialog, setVendorDialog] = useState(false);
  const [rfqDialog, setRfqDialog] = useState(false);
  const [evalDialog, setEvalDialog] = useState(false);
  const [poDialog, setPoDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [v, r, e, po] = await Promise.all([
        svc.getVendors().then(r => r.data?.data || []),
        svc.getRFQs().then(r => r.data?.data || []),
        svc.getVendorEvaluations().then(r => r.data?.data || []),
        svc.getPurchaseOrders().then(r => r.data?.data || []),
      ]);
      setVendors(v);
      setRfqs(r);
      setEvaluations(e);
      setPurchaseOrders(po);
    } catch {
      showSnackbar('خطأ في تحميل البيانات', 'error');
    }
    setLoading(false);
  }, [showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveVendor = async formData => {
    try {
      if (editItem?._id) await svc.updateVendor(editItem._id, formData);
      else await svc.createVendor(formData);
      showSnackbar('تم الحفظ', 'success');
      setVendorDialog(false);
      setEditItem(null);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };
  const handleDeleteVendor = async id => {
    try {
      await svc.deleteVendor(id);
      showSnackbar('تم الحذف', 'success');
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleSaveRFQ = async formData => {
    try {
      if (editItem?._id) await svc.updateRFQ(editItem._id, formData);
      else await svc.createRFQ(formData);
      showSnackbar('تم الحفظ', 'success');
      setRfqDialog(false);
      setEditItem(null);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleAwardRFQ = async (rfqId, vendorId) => {
    try {
      await svc.awardRFQ(rfqId, { vendorId });
      showSnackbar('تم ترسية العرض', 'success');
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleSaveEval = async formData => {
    try {
      await svc.createVendorEvaluation(formData);
      showSnackbar('تم حفظ التقييم', 'success');
      setEvalDialog(false);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleSavePO = async formData => {
    try {
      if (editItem?._id) await svc.updatePurchaseOrderStatus(editItem._id, formData);
      else await svc.createPurchaseOrder(formData);
      showSnackbar('تم الحفظ', 'success');
      setPoDialog(false);
      setEditItem(null);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const statCards = [
    { label: 'إجمالي الموردين', value: vendors.length, color: '#1976d2', icon: <VendorIcon /> },
    {
      label: 'موردون معتمدون',
      value: vendors.filter(v => v.status === 'approved').length,
      color: '#2e7d32',
      icon: <StarIcon />,
    },
    {
      label: 'طلبات عروض نشطة',
      value: rfqs.filter(r => r.status === 'published').length,
      color: '#ed6c02',
      icon: <RFQIcon />,
    },
    { label: 'أوامر شراء', value: purchaseOrders.length, color: '#9c27b0', icon: <POIcon /> },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        إدارة علاقات الموردين
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        إدارة الموردين وطلبات العروض والتقييمات وأوامر الشراء
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderRight: `4px solid ${s.color}`,
              }}
            >
              <Avatar sx={{ bgcolor: alpha(s.color, 0.12), color: s.color }}>{s.icon}</Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="الموردون" icon={<VendorIcon />} iconPosition="start" />
        <Tab label="طلبات العروض" icon={<RFQIcon />} iconPosition="start" />
        <Tab label="التقييمات" icon={<EvalIcon />} iconPosition="start" />
        <Tab label="أوامر الشراء" icon={<POIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 0: Vendors */}
      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditItem(null);
                setVendorDialog(true);
              }}
            >
              مورد جديد
            </Button>
          </Box>
          <Grid container spacing={2}>
            {vendors.map(v => (
              <Grid item xs={12} md={6} lg={4} key={v._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {v.companyName}
                      </Typography>
                      <Chip
                        size="small"
                        label={VENDOR_STATUSES[v.status] || v.status}
                        color={VENDOR_STATUS_COLORS[v.status] || 'default'}
                      />
                    </Box>
                    {v.contactPerson?.name && (
                      <Typography variant="body2">جهة الاتصال: {v.contactPerson.name}</Typography>
                    )}
                    {v.contactPerson?.email && (
                      <Typography variant="body2" color="text.secondary">
                        {v.contactPerson.email}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      {v.categories?.slice(0, 3).map((c, idx) => (
                        <Chip key={idx} size="small" variant="outlined" label={c} />
                      ))}
                    </Stack>
                    {v.rating?.overall != null && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Rating value={v.rating.overall} precision={0.5} size="small" readOnly />
                        <Typography variant="caption">({v.rating.overall.toFixed(1)})</Typography>
                      </Box>
                    )}
                    <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditItem(v);
                          setVendorDialog(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteVendor(v._id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {vendors.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">لا يوجد موردون</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Tab 1: RFQs */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditItem(null);
                setRfqDialog(true);
              }}
            >
              طلب عرض جديد
            </Button>
          </Box>
          <Grid container spacing={2}>
            {rfqs.map(r => (
              <Grid item xs={12} md={6} key={r._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {r.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={RFQ_STATUSES[r.status] || r.status}
                        color={RFQ_STATUS_COLORS[r.status] || 'default'}
                      />
                    </Box>
                    {r.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {r.description.slice(0, 100)}
                        {r.description.length > 100 ? '...' : ''}
                      </Typography>
                    )}
                    <Typography variant="body2">
                      الموعد النهائي:{' '}
                      {r.deadline ? new Date(r.deadline).toLocaleDateString('ar-SA') : '-'}
                    </Typography>
                    <Typography variant="body2">عدد العروض: {r.responses?.length || 0}</Typography>
                    <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditItem(r);
                          setRfqDialog(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      {r.status === 'evaluation' && (
                        <Tooltip title="ترسية">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() =>
                              r.responses?.[0] && handleAwardRFQ(r._id, r.responses[0].vendor)
                            }
                          >
                            <AwardIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {rfqs.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">لا توجد طلبات عروض</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Tab 2: Evaluations */}
      {tab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditItem(null);
                setEvalDialog(true);
              }}
            >
              تقييم جديد
            </Button>
          </Box>
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>المورد</TableCell>
                  <TableCell>الجودة</TableCell>
                  <TableCell>التسليم</TableCell>
                  <TableCell>السعر</TableCell>
                  <TableCell>التواصل</TableCell>
                  <TableCell>التقييم العام</TableCell>
                  <TableCell>التوصية</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {evaluations.map(e => (
                  <TableRow key={e._id} hover>
                    <TableCell>{e.vendor?.companyName || '-'}</TableCell>
                    <TableCell>
                      <Rating value={e.criteria?.quality || 0} size="small" readOnly />
                    </TableCell>
                    <TableCell>
                      <Rating value={e.criteria?.delivery || 0} size="small" readOnly />
                    </TableCell>
                    <TableCell>
                      <Rating value={e.criteria?.price || 0} size="small" readOnly />
                    </TableCell>
                    <TableCell>
                      <Rating value={e.criteria?.communication || 0} size="small" readOnly />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={700}>{e.overallScore?.toFixed(1) || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          e.recommendation === 'preferred'
                            ? 'مفضل'
                            : e.recommendation === 'approved'
                              ? 'مقبول'
                              : e.recommendation === 'conditional'
                                ? 'مشروط'
                                : 'غير مقبول'
                        }
                        color={
                          e.recommendation === 'preferred'
                            ? 'success'
                            : e.recommendation === 'approved'
                              ? 'primary'
                              : 'warning'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {evaluations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      لا توجد تقييمات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Tab 3: Purchase Orders */}
      {tab === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditItem(null);
                setPoDialog(true);
              }}
            >
              أمر شراء جديد
            </Button>
          </Box>
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>رقم الأمر</TableCell>
                  <TableCell>المورد</TableCell>
                  <TableCell>المبلغ</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchaseOrders.map(po => (
                  <TableRow key={po._id} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>
                      {po.poNumber || po._id?.slice(-6)}
                    </TableCell>
                    <TableCell>{po.vendor?.companyName || '-'}</TableCell>
                    <TableCell>
                      {po.totalAmount ? `${po.totalAmount.toLocaleString()} ر.س` : '-'}
                    </TableCell>
                    <TableCell>
                      {po.createdAt ? new Date(po.createdAt).toLocaleDateString('ar-SA') : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={PO_STATUSES[po.status] || po.status}
                        color={PO_STATUS_COLORS[po.status] || 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditItem(po);
                          setPoDialog(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {purchaseOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      لا توجد أوامر شراء
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Vendor Dialog */}
      <Dialog
        open={vendorDialog}
        onClose={() => {
          setVendorDialog(false);
          setEditItem(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editItem ? 'تعديل المورد' : 'مورد جديد'}
          <IconButton
            onClick={() => {
              setVendorDialog(false);
              setEditItem(null);
            }}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <VendorForm initial={editItem} onSave={handleSaveVendor} />
        </DialogContent>
      </Dialog>

      {/* RFQ Dialog */}
      <Dialog
        open={rfqDialog}
        onClose={() => {
          setRfqDialog(false);
          setEditItem(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editItem ? 'تعديل طلب العرض' : 'طلب عرض جديد'}
          <IconButton
            onClick={() => {
              setRfqDialog(false);
              setEditItem(null);
            }}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <RFQForm initial={editItem} onSave={handleSaveRFQ} />
        </DialogContent>
      </Dialog>

      {/* Eval Dialog */}
      <Dialog
        open={evalDialog}
        onClose={() => {
          setEvalDialog(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          تقييم المورد
          <IconButton
            onClick={() => setEvalDialog(false)}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <EvalForm vendors={vendors} onSave={handleSaveEval} />
        </DialogContent>
      </Dialog>

      {/* PO Dialog */}
      <Dialog
        open={poDialog}
        onClose={() => {
          setPoDialog(false);
          setEditItem(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editItem ? 'تعديل أمر الشراء' : 'أمر شراء جديد'}
          <IconButton
            onClick={() => {
              setPoDialog(false);
              setEditItem(null);
            }}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <POForm initial={editItem} vendors={vendors} onSave={handleSavePO} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function VendorForm({ initial, onSave }) {
  const [form, setForm] = useState({
    companyName: '',
    status: 'pending',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    categories: '',
  });
  useEffect(() => {
    if (initial)
      setForm({
        companyName: initial.companyName || '',
        status: initial.status || 'pending',
        contactName: initial.contactPerson?.name || '',
        contactEmail: initial.contactPerson?.email || '',
        contactPhone: initial.contactPerson?.phone || '',
        categories: initial.categories?.join(', ') || '',
      });
  }, [initial]);
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={8}>
        <TextField
          fullWidth
          label="اسم الشركة"
          value={form.companyName}
          onChange={ch('companyName')}
          required
        />
      </Grid>
      <Grid item xs={4}>
        <TextField select fullWidth label="الحالة" value={form.status} onChange={ch('status')}>
          {Object.entries(VENDOR_STATUSES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={4}>
        <TextField
          fullWidth
          label="اسم جهة الاتصال"
          value={form.contactName}
          onChange={ch('contactName')}
        />
      </Grid>
      <Grid item xs={4}>
        <TextField
          fullWidth
          label="البريد"
          value={form.contactEmail}
          onChange={ch('contactEmail')}
          type="email"
        />
      </Grid>
      <Grid item xs={4}>
        <TextField
          fullWidth
          label="الهاتف"
          value={form.contactPhone}
          onChange={ch('contactPhone')}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="التصنيفات (مفصولة بفواصل)"
          value={form.categories}
          onChange={ch('categories')}
        />
      </Grid>
      <Grid item xs={12}>
        <Button
          variant="contained"
          fullWidth
          onClick={() =>
            onSave({
              companyName: form.companyName,
              status: form.status,
              contactPerson: {
                name: form.contactName,
                email: form.contactEmail,
                phone: form.contactPhone,
              },
              categories: form.categories
                .split(',')
                .map(c => c.trim())
                .filter(Boolean),
            })
          }
        >
          حفظ
        </Button>
      </Grid>
    </Grid>
  );
}

function RFQForm({ initial, onSave }) {
  const [form, setForm] = useState({ title: '', description: '', deadline: '', status: 'draft' });
  useEffect(() => {
    if (initial)
      setForm({
        title: initial.title || '',
        description: initial.description || '',
        deadline: initial.deadline?.slice(0, 10) || '',
        status: initial.status || 'draft',
      });
  }, [initial]);
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField fullWidth label="العنوان" value={form.title} onChange={ch('title')} required />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="الوصف"
          value={form.description}
          onChange={ch('description')}
          multiline
          rows={3}
        />
      </Grid>
      <Grid item xs={6}>
        <TextField
          fullWidth
          type="date"
          label="الموعد النهائي"
          value={form.deadline}
          onChange={ch('deadline')}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={6}>
        <TextField select fullWidth label="الحالة" value={form.status} onChange={ch('status')}>
          {Object.entries(RFQ_STATUSES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <Button variant="contained" fullWidth onClick={() => onSave(form)}>
          حفظ
        </Button>
      </Grid>
    </Grid>
  );
}

function EvalForm({ vendors, onSave }) {
  const [form, setForm] = useState({
    vendor: '',
    quality: 3,
    delivery: 3,
    price: 3,
    communication: 3,
    compliance: 3,
    recommendation: 'approved',
    notes: '',
  });
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField
          select
          fullWidth
          label="المورد"
          value={form.vendor}
          onChange={ch('vendor')}
          required
        >
          {vendors.map(v => (
            <MenuItem key={v._id} value={v._id}>
              {v.companyName}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      {['quality', 'delivery', 'price', 'communication', 'compliance'].map(c => (
        <Grid
          item
          xs={12}
          key={c}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant="body2">
            {c === 'quality'
              ? 'الجودة'
              : c === 'delivery'
                ? 'التسليم'
                : c === 'price'
                  ? 'السعر'
                  : c === 'communication'
                    ? 'التواصل'
                    : 'الالتزام'}
          </Typography>
          <Rating value={form[c]} onChange={(_, v) => setForm(p => ({ ...p, [c]: v }))} />
        </Grid>
      ))}
      <Grid item xs={12}>
        <TextField
          select
          fullWidth
          label="التوصية"
          value={form.recommendation}
          onChange={ch('recommendation')}
        >
          <MenuItem value="preferred">مفضل</MenuItem>
          <MenuItem value="approved">مقبول</MenuItem>
          <MenuItem value="conditional">مشروط</MenuItem>
          <MenuItem value="not_recommended">غير مقبول</MenuItem>
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="ملاحظات"
          value={form.notes}
          onChange={ch('notes')}
          multiline
          rows={2}
        />
      </Grid>
      <Grid item xs={12}>
        <Button
          variant="contained"
          fullWidth
          onClick={() =>
            onSave({
              vendor: form.vendor,
              criteria: {
                quality: form.quality,
                delivery: form.delivery,
                price: form.price,
                communication: form.communication,
                compliance: form.compliance,
              },
              recommendation: form.recommendation,
              notes: form.notes,
            })
          }
        >
          حفظ التقييم
        </Button>
      </Grid>
    </Grid>
  );
}

function POForm({ initial, vendors, onSave }) {
  const [form, setForm] = useState({
    vendor: '',
    description: '',
    totalAmount: '',
    status: 'draft',
  });
  useEffect(() => {
    if (initial)
      setForm({
        vendor: initial.vendor?._id || initial.vendor || '',
        description: initial.description || '',
        totalAmount: initial.totalAmount || '',
        status: initial.status || 'draft',
      });
  }, [initial]);
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={8}>
        <TextField
          select
          fullWidth
          label="المورد"
          value={form.vendor}
          onChange={ch('vendor')}
          required
        >
          {vendors.map(v => (
            <MenuItem key={v._id} value={v._id}>
              {v.companyName}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={4}>
        <TextField select fullWidth label="الحالة" value={form.status} onChange={ch('status')}>
          {Object.entries(PO_STATUSES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="الوصف"
          value={form.description}
          onChange={ch('description')}
          multiline
          rows={2}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          type="number"
          label="المبلغ الإجمالي"
          value={form.totalAmount}
          onChange={ch('totalAmount')}
        />
      </Grid>
      <Grid item xs={12}>
        <Button
          variant="contained"
          fullWidth
          onClick={() => onSave({ ...form, totalAmount: Number(form.totalAmount) })}
        >
          حفظ
        </Button>
      </Grid>
    </Grid>
  );
}
