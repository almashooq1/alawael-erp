/**
 * 🏢 إدارة الموردين — Vendor Management Page
 * AlAwael ERP
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Paper,
} from '@mui/material';

import {
  vendorsService,
  evaluationsService,
  vendorReportsService,
  MOCK_VENDORS,
  MOCK_EVALUATIONS,
  MOCK_VENDOR_DASHBOARD,
} from 'services/vendorService';
import { useSnackbar } from 'contexts/SnackbarContext';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Rating,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { ViewIcon } from 'utils/iconAliases';

const COLORS = ['#1E88E5', '#43A047', '#FB8C00', '#E53935', '#8E24AA', '#00897B'];
const vendorCategories = [
  'مستلزمات مكتبية',
  'أجهزة تقنية',
  'خدمات نظافة',
  'صيانة وتشغيل',
  'تغذية وإعاشة',
  'أثاث ومفروشات',
  'طباعة ونشر',
  'نقل ومواصلات',
  'معدات طبية',
  'وسائل تعليمية',
  'مستلزمات رياضية',
];
const vendorStatuses = ['نشط', 'معلق', 'غير نشط'];
const statusColors = { نشط: 'success', معلق: 'warning', 'غير نشط': 'default' };
const formatCurrency = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v);

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ py: 2 }}>{children}</Box> : null;
}

const EMPTY_VENDOR = {
  name: '',
  category: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  status: 'نشط',
  taxNumber: '',
  contractStart: '',
  contractEnd: '',
  paymentTerms: '30 يوم',
  notes: '',
};

export default function VendorManagement() {
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(MOCK_VENDOR_DASHBOARD);
  const [vendors, setVendors] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_VENDOR);
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false);
  const [evalForm, setEvalForm] = useState({
    qualityScore: 4,
    deliveryScore: 4,
    priceScore: 4,
    communicationScore: 4,
    complianceScore: 4,
    comments: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, v, e] = await Promise.all([
        vendorReportsService.getDashboardStats(),
        vendorsService.getAll(),
        evaluationsService.getAll(),
      ]);
      setDashboard(d || MOCK_VENDOR_DASHBOARD);
      setVendors(v || MOCK_VENDORS);
      setEvaluations(e || MOCK_EVALUATIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = [...vendors];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        v => v.name.toLowerCase().includes(s) || v.contactPerson?.toLowerCase().includes(s)
      );
    }
    if (filterCat) list = list.filter(v => v.category === filterCat);
    if (filterStatus) list = list.filter(v => v.status === filterStatus);
    return list;
  }, [vendors, search, filterCat, filterStatus]);

  const openCreate = () => {
    setForm(EMPTY_VENDOR);
    setSelected(null);
    setFormOpen(true);
  };
  const openEdit = v => {
    setForm({ ...v });
    setSelected(v);
    setFormOpen(true);
  };
  const openDetail = v => {
    setSelected(v);
    setDetailOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.category) {
      showSnackbar('يرجى إدخال اسم المورد والفئة', 'warning');
      return;
    }
    setLoading(true);
    try {
      if (selected?._id) {
        await vendorsService.update(selected._id, form);
        setVendors(prev => prev.map(v => (v._id === selected._id ? { ...v, ...form } : v)));
        showSnackbar('تم تحديث بيانات المورد', 'success');
      } else {
        const nv = { ...form, _id: `v-${Date.now()}`, rating: 0, totalOrders: 0, totalAmount: 0 };
        const res = await vendorsService.create(form);
        setVendors(prev => [res || nv, ...prev]);
        showSnackbar('تم إضافة المورد', 'success');
      }
      setFormOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    await vendorsService.remove(selected._id);
    setVendors(prev => prev.filter(v => v._id !== selected._id));
    showSnackbar('تم حذف المورد', 'info');
    setDeleteOpen(false);
  };

  const handleEvalSubmit = async () => {
    if (!selected) return;
    const avg = (
      (evalForm.qualityScore +
        evalForm.deliveryScore +
        evalForm.priceScore +
        evalForm.communicationScore +
        evalForm.complianceScore) /
      5
    ).toFixed(2);
    const newEval = {
      _id: `ev-${Date.now()}`,
      vendorId: selected._id,
      vendorName: selected.name,
      period: 'الربع الحالي',
      ...evalForm,
      overallScore: +avg,
      evaluatedBy: 'النظام',
      date: new Date().toISOString().split('T')[0],
    };
    await evaluationsService.create(newEval);
    setEvaluations(prev => [newEval, ...prev]);
    setVendors(prev => prev.map(v => (v._id === selected._id ? { ...v, rating: +avg } : v)));
    showSnackbar('تم حفظ التقييم', 'success');
    setEvalOpen(false);
  };

  const kpis = [
    { label: 'إجمالي الموردين', value: dashboard.totalVendors, color: '#1E88E5' },
    { label: 'موردون نشطون', value: dashboard.activeVendors, color: '#43A047' },
    { label: 'معدل التقييم', value: `${dashboard.avgRating}/5`, color: '#FB8C00' },
    { label: 'إجمالي الإنفاق', value: formatCurrency(dashboard.totalSpend), color: '#8E24AA' },
    { label: 'عقود قاربت الانتهاء', value: dashboard.contractsExpiringSoon, color: '#E53935' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
          color: 'white',
          borderRadius: 3,
        }}
      >
        <CardContent
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              🏢 إدارة الموردين
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, mt: 0.5 }}>
              دليل الموردين والتقييمات والعقود
            </Typography>
          </Box>
          <Box>
            <Tooltip title="تحديث">
              <IconButton onClick={load} sx={{ color: 'white', mr: 1 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
              sx={{ bgcolor: 'white', color: '#0D47A1', '&:hover': { bgcolor: '#E3F2FD' } }}
            >
              إضافة مورد
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((k, i) => (
          <Grid item xs={6} md key={i}>
            <Card sx={{ borderRadius: 2, borderTop: `3px solid ${k.color}` }}>
              <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                <Typography variant="h5" fontWeight={700} color={k.color}>
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

      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontWeight: 600 } }}
        >
          <Tab label="نظرة عامة" />
          <Tab label="دليل الموردين" />
          <Tab label="التقييمات" />
        </Tabs>

        {/* Overview */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  الإنفاق الشهري
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboard.monthlySpend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis />
                    <RTooltip formatter={v => formatCurrency(v)} />
                    <Bar dataKey="amount" name="الإنفاق" fill="#1E88E5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  التوزيع حسب الفئة
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboard.categoryDistribution}
                      dataKey="spend"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {dashboard.categoryDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip formatter={v => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  أفضل الموردين
                </Typography>
                <Grid container spacing={2}>
                  {dashboard.topVendors.map((tv, i) => (
                    <Grid item xs={12} sm={6} md={4} key={i}>
                      <Card
                        sx={{
                          borderRadius: 2,
                          p: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: COLORS[i % COLORS.length] + '22',
                            color: COLORS[i % COLORS.length],
                            width: 48,
                            height: 48,
                          }}
                        >
                          {i + 1}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {tv.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Rating value={tv.rating} readOnly size="small" precision={0.1} />
                            <Typography variant="caption">({tv.rating})</Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {formatCurrency(tv.spend)}
                          </Typography>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Vendor Directory */}
        <TabPanel value={tab} index={1}>
          <Box sx={{ p: 2 }}>
            <Paper
              sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}
            >
              <TextField
                size="small"
                placeholder="بحث..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                sx={{ minWidth: 200 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                select
                size="small"
                label="الفئة"
                value={filterCat}
                onChange={e => setFilterCat(e.target.value)}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="">الكل</MenuItem>
                {vendorCategories.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="الحالة"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="">الكل</MenuItem>
                {vendorStatuses.map(s => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
              <Chip label={`${filtered.length} مورد`} variant="outlined" />
            </Paper>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>المورد</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التقييم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الطلبات</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>إجمالي الإنفاق</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(v => (
                    <TableRow key={v._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            sx={{ bgcolor: '#1565C022', color: '#1565C0', width: 32, height: 32 }}
                          >
                            <VendorIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {v.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {v.contactPerson}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={v.category} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Rating value={v.rating} readOnly size="small" precision={0.1} />
                      </TableCell>
                      <TableCell>{v.totalOrders}</TableCell>
                      <TableCell>{formatCurrency(v.totalAmount)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={v.status} color={statusColors[v.status]} />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="عرض">
                          <IconButton size="small" onClick={() => openDetail(v)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton size="small" onClick={() => openEdit(v)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تقييم">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => {
                              setSelected(v);
                              setEvalOpen(true);
                            }}
                          >
                            <EvalIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelected(v);
                              setDeleteOpen(true);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={filtered.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => {
                  setRowsPerPage(+e.target.value);
                  setPage(0);
                }}
                labelRowsPerPage="صفوف:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
              />
            </TableContainer>
          </Box>
        </TabPanel>

        {/* Evaluations */}
        <TabPanel value={tab} index={2}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              سجل التقييمات
            </Typography>
            <Grid container spacing={2}>
              {evaluations.map(ev => (
                <Grid item xs={12} md={6} key={ev._id}>
                  <Card sx={{ borderRadius: 2, p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box>
                        <Typography variant="body1" fontWeight={700}>
                          {ev.vendorName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ev.period} — {ev.date}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${ev.overallScore}/5`}
                        color={
                          ev.overallScore >= 4
                            ? 'success'
                            : ev.overallScore >= 3
                              ? 'warning'
                              : 'error'
                        }
                      />
                    </Box>
                    <Grid container spacing={1}>
                      {[
                        { label: 'الجودة', value: ev.qualityScore },
                        { label: 'التسليم', value: ev.deliveryScore },
                        { label: 'الأسعار', value: ev.priceScore },
                        { label: 'التواصل', value: ev.communicationScore },
                        { label: 'الامتثال', value: ev.complianceScore },
                      ].map((s, i) => (
                        <Grid item xs={4} key={i}>
                          <Box
                            sx={{
                              textAlign: 'center',
                              p: 0.5,
                              bgcolor: 'action.hover',
                              borderRadius: 1,
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              {s.label}
                            </Typography>
                            <Typography variant="body2" fontWeight={700}>
                              {s.value}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                    {ev.comments && (
                      <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                        💬 {ev.comments}
                      </Typography>
                    )}
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      {/* Create/Edit Vendor Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {selected ? 'تعديل المورد' : 'إضافة مورد جديد'}
          <IconButton onClick={() => setFormOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="اسم المورد"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="الفئة"
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                required
              >
                {vendorCategories.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الشخص المسؤول"
                value={form.contactPerson}
                onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="رقم الهاتف"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="البريد الإلكتروني"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الرقم الضريبي"
                value={form.taxNumber}
                onChange={e => setForm(p => ({ ...p, taxNumber: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="العنوان"
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="الحالة"
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              >
                {vendorStatuses.map(s => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="بداية العقد"
                value={form.contractStart}
                onChange={e => setForm(p => ({ ...p, contractStart: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="نهاية العقد"
                value={form.contractEnd}
                onChange={e => setForm(p => ({ ...p, contractEnd: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات"
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            {selected ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          تفاصيل المورد
          <IconButton onClick={() => setDetailOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        {selected && (
          <DialogContent dividers>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Avatar
                sx={{
                  bgcolor: '#1565C022',
                  color: '#1565C0',
                  width: 64,
                  height: 64,
                  mx: 'auto',
                  mb: 1,
                }}
              >
                <VendorIcon fontSize="large" />
              </Avatar>
              <Typography variant="h6" fontWeight={700}>
                {selected.name}
              </Typography>
              <Rating value={selected.rating} readOnly precision={0.1} sx={{ mt: 0.5 }} />
              <Chip
                label={selected.status}
                color={statusColors[selected.status]}
                sx={{ ml: 1 }}
                size="small"
              />
            </Box>
            <Grid container spacing={2}>
              {[
                { label: 'الفئة', value: selected.category },
                { label: 'المسؤول', value: selected.contactPerson },
                { label: 'الهاتف', value: selected.phone },
                { label: 'البريد', value: selected.email },
                { label: 'العنوان', value: selected.address },
                { label: 'الرقم الضريبي', value: selected.taxNumber },
                { label: 'بداية العقد', value: selected.contractStart },
                { label: 'نهاية العقد', value: selected.contractEnd },
                { label: 'الطلبات', value: selected.totalOrders },
                { label: 'إجمالي الإنفاق', value: formatCurrency(selected.totalAmount) },
              ].map((f, i) => (
                <Grid item xs={6} key={i}>
                  <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {f.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {f.value || '-'}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </DialogContent>
        )}
      </Dialog>

      {/* Evaluation Dialog */}
      <Dialog open={evalOpen} onClose={() => setEvalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          تقييم المورد: {selected?.name}
          <IconButton onClick={() => setEvalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {[
              { key: 'qualityScore', label: 'جودة المنتجات/الخدمات' },
              { key: 'deliveryScore', label: 'الالتزام بالتسليم' },
              { key: 'priceScore', label: 'تنافسية الأسعار' },
              { key: 'communicationScore', label: 'التواصل والاستجابة' },
              { key: 'complianceScore', label: 'الامتثال والمعايير' },
            ].map(item => (
              <Grid item xs={12} key={item.key}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography variant="body2">{item.label}</Typography>
                  <Rating
                    value={evalForm[item.key]}
                    onChange={(_, v) => setEvalForm(p => ({ ...p, [item.key]: v || 1 }))}
                  />
                </Box>
              </Grid>
            ))}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات التقييم"
                value={evalForm.comments}
                onChange={e => setEvalForm(p => ({ ...p, comments: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEvalOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleEvalSubmit}>
            حفظ التقييم
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs">
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من حذف المورد "{selected?.name}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
