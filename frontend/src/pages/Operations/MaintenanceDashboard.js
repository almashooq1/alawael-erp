/**
 * 🔧 إدارة الصيانة والمرافق — Maintenance & Facilities Management
 * AlAwael ERP
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Paper,
  useTheme,
} from '@mui/material';




import {
  workOrdersService,
  preventiveService,
  maintenanceReportsService,
  MOCK_WORK_ORDERS,
  MOCK_PREVENTIVE_SCHEDULE,
  MOCK_MAINTENANCE_DASHBOARD,
} from 'services/maintenanceService';
import { useSnackbar } from 'contexts/SnackbarContext';

const COLORS = ['#E53935', '#FB8C00', '#43A047', '#1E88E5', '#8E24AA', '#6D4C41'];
const categories = [
  'كهرباء',
  'سباكة',
  'تكييف',
  'نجارة',
  'دهان',
  'نظافة',
  'أمن وسلامة',
  'تقنية معلومات',
  'أخرى',
];
const priorities = ['عاجل', 'عالي', 'متوسط', 'منخفض'];
const statuses = ['جديد', 'قيد التنفيذ', 'مكتمل', 'مؤجل', 'ملغي'];
const priorityColors = { عاجل: 'error', عالي: 'warning', متوسط: 'info', منخفض: 'default' };
const statusColors = {
  جديد: 'info',
  'قيد التنفيذ': 'warning',
  مكتمل: 'success',
  مؤجل: 'default',
  ملغي: 'error',
};
const formatCurrency = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v);

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ py: 2 }}>{children}</Box> : null;
}

const EMPTY_ORDER = {
  title: '',
  category: '',
  priority: 'متوسط',
  location: '',
  requestedBy: '',
  assignedTo: '',
  estimatedCost: 0,
  notes: '',
  status: 'جديد',
};

export default function MaintenanceDashboard() {
  const _theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(MOCK_MAINTENANCE_DASHBOARD);
  const [orders, setOrders] = useState([]);
  const [preventive, setPreventive] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_ORDER);
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, o, p] = await Promise.all([
        maintenanceReportsService.getDashboardStats(),
        workOrdersService.getAll(),
        preventiveService.getAll(),
      ]);
      setDashboard(d || MOCK_MAINTENANCE_DASHBOARD);
      setOrders(o || MOCK_WORK_ORDERS);
      setPreventive(p || MOCK_PREVENTIVE_SCHEDULE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = [...orders];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        o => o.title.toLowerCase().includes(s) || o.location?.toLowerCase().includes(s)
      );
    }
    if (filterCat) list = list.filter(o => o.category === filterCat);
    if (filterPriority) list = list.filter(o => o.priority === filterPriority);
    if (filterStatus) list = list.filter(o => o.status === filterStatus);
    return list;
  }, [orders, search, filterCat, filterPriority, filterStatus]);

  const openCreate = () => {
    setForm(EMPTY_ORDER);
    setSelected(null);
    setFormOpen(true);
  };
  const openEdit = o => {
    setForm({ ...o });
    setSelected(o);
    setFormOpen(true);
  };
  const openDetail = o => {
    setSelected(o);
    setDetailOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.category) {
      showSnackbar('يرجى إدخال العنوان والفئة', 'warning');
      return;
    }
    setLoading(true);
    try {
      if (selected?._id) {
        await workOrdersService.update(selected._id, form);
        setOrders(prev => prev.map(o => (o._id === selected._id ? { ...o, ...form } : o)));
        showSnackbar('تم تحديث أمر العمل', 'success');
      } else {
        const newOrder = { ...form, _id: `wo-${Date.now()}`, createdAt: new Date().toISOString() };
        const res = await workOrdersService.create(form);
        setOrders(prev => [res || newOrder, ...prev]);
        showSnackbar('تم إنشاء أمر العمل', 'success');
      }
      setFormOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async order => {
    await workOrdersService.complete(order._id, order.estimatedCost);
    setOrders(prev =>
      prev.map(o =>
        o._id === order._id
          ? {
              ...o,
              status: 'مكتمل',
              completedAt: new Date().toISOString(),
              actualCost: order.estimatedCost,
            }
          : o
      )
    );
    showSnackbar('تم إكمال أمر العمل', 'success');
  };

  const handleDelete = async () => {
    if (!selected) return;
    await workOrdersService.remove(selected._id);
    setOrders(prev => prev.filter(o => o._id !== selected._id));
    showSnackbar('تم حذف أمر العمل', 'info');
    setDeleteOpen(false);
  };

  const budgetPercent = dashboard.totalBudget
    ? Math.round((dashboard.spentBudget / dashboard.totalBudget) * 100)
    : 0;

  const kpis = [
    { label: 'إجمالي الطلبات', value: dashboard.totalOrders, color: '#1E88E5' },
    { label: 'طلبات مفتوحة', value: dashboard.openOrders, color: '#FB8C00' },
    { label: 'مكتملة هذا الشهر', value: dashboard.completedThisMonth, color: '#43A047' },
    { label: 'متأخرة', value: dashboard.overdueOrders, color: '#E53935' },
    { label: 'متوسط الإنجاز', value: `${dashboard.avgResolutionDays} يوم`, color: '#8E24AA' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #E65100 0%, #BF360C 100%)',
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
              🔧 إدارة الصيانة والمرافق
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, mt: 0.5 }}>
              تتبع أوامر العمل والصيانة الوقائية وإدارة المرافق
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
              sx={{ bgcolor: 'white', color: '#BF360C', '&:hover': { bgcolor: '#FBE9E7' } }}
            >
              أمر عمل جديد
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

      {/* Budget bar */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              ميزانية الصيانة
            </Typography>
            <Typography variant="body2">
              {formatCurrency(dashboard.spentBudget)} / {formatCurrency(dashboard.totalBudget)} (
              {budgetPercent}%)
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={budgetPercent}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: '#E0E0E0',
              '& .MuiLinearProgress-bar': {
                bgcolor:
                  budgetPercent > 80 ? '#E53935' : budgetPercent > 60 ? '#FB8C00' : '#43A047',
              },
            }}
          />
        </CardContent>
      </Card>

      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontWeight: 600 } }}
        >
          <Tab label="نظرة عامة" />
          <Tab label="أوامر العمل" />
          <Tab label="الصيانة الوقائية" />
        </Tabs>

        {/* Overview */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  الطلبات حسب الفئة
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboard.categoryDistribution}
                      dataKey="count"
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
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  الاتجاهات الشهرية
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboard.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis />
                    <RTooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="created"
                      name="أنشئت"
                      stroke="#1E88E5"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      name="أُكملت"
                      stroke="#43A047"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  تكاليف الصيانة الشهرية
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboard.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis />
                    <RTooltip formatter={v => formatCurrency(v)} />
                    <Bar dataKey="cost" name="التكلفة" fill="#FB8C00" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Work Orders */}
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
                sx={{ minWidth: 130 }}
              >
                <MenuItem value="">الكل</MenuItem>
                {categories.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="الأولوية"
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="">الكل</MenuItem>
                {priorities.map(p => (
                  <MenuItem key={p} value={p}>
                    {p}
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
                {statuses.map(s => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
              <Chip label={`${filtered.length} أمر عمل`} variant="outlined" />
            </Paper>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>أمر العمل</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الأولوية</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الموقع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المسند إليه</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التكلفة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(o => (
                    <TableRow key={o._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            sx={{ bgcolor: '#E6510022', color: '#E65100', width: 32, height: 32 }}
                          >
                            <BuildIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {o.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(o.createdAt).toLocaleDateString('ar-SA')}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={o.category} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={o.priority} color={priorityColors[o.priority]} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{o.location}</Typography>
                      </TableCell>
                      <TableCell>{o.assignedTo || '-'}</TableCell>
                      <TableCell>{formatCurrency(o.estimatedCost)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={o.status} color={statusColors[o.status]} />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="عرض">
                          <IconButton size="small" onClick={() => openDetail(o)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton size="small" onClick={() => openEdit(o)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {o.status !== 'مكتمل' && (
                          <Tooltip title="إكمال">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleComplete(o)}
                            >
                              <CompleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelected(o);
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

        {/* Preventive Maintenance */}
        <TabPanel value={tab} index={2}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              جدول الصيانة الوقائية
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>المهمة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المعدات</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التكرار</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الموعد القادم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المسند إليه</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preventive.map(p => (
                    <TableRow key={p._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {p.task}
                        </Typography>
                      </TableCell>
                      <TableCell>{p.equipment}</TableCell>
                      <TableCell>
                        <Chip size="small" label={p.frequency} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ScheduleIcon
                            fontSize="small"
                            color={p.status === 'متأخر' ? 'error' : 'action'}
                          />
                          {new Date(p.nextDue).toLocaleDateString('ar-SA')}
                        </Box>
                      </TableCell>
                      <TableCell>{p.assignedTo}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={p.status}
                          color={
                            p.status === 'مكتمل'
                              ? 'success'
                              : p.status === 'متأخر'
                                ? 'error'
                                : 'info'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {selected ? 'تعديل أمر العمل' : 'أمر عمل جديد'}
          <IconButton onClick={() => setFormOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="العنوان"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="الفئة"
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                required
              >
                {categories.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="الأولوية"
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
              >
                {priorities.map(p => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="الحالة"
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              >
                {statuses.map(s => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الموقع"
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="مقدم الطلب"
                value={form.requestedBy}
                onChange={e => setForm(p => ({ ...p, requestedBy: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="المسند إليه"
                value={form.assignedTo}
                onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="التكلفة المقدرة"
                type="number"
                value={form.estimatedCost}
                onChange={e => setForm(p => ({ ...p, estimatedCost: +e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ملاحظات"
                multiline
                rows={3}
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            {selected ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          تفاصيل أمر العمل
          <IconButton onClick={() => setDetailOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        {selected && (
          <DialogContent dividers>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Avatar
                sx={{
                  bgcolor: '#E6510022',
                  color: '#E65100',
                  width: 56,
                  height: 56,
                  mx: 'auto',
                  mb: 1,
                }}
              >
                <BuildIcon />
              </Avatar>
              <Typography variant="h6" fontWeight={700}>
                {selected.title}
              </Typography>
              <Box sx={{ mt: 0.5, display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Chip
                  size="small"
                  label={selected.priority}
                  color={priorityColors[selected.priority]}
                />
                <Chip size="small" label={selected.status} color={statusColors[selected.status]} />
              </Box>
            </Box>
            <Grid container spacing={2}>
              {[
                { label: 'الفئة', value: selected.category },
                { label: 'الموقع', value: selected.location },
                { label: 'مقدم الطلب', value: selected.requestedBy },
                { label: 'المسند إليه', value: selected.assignedTo || 'غير معين' },
                {
                  label: 'التكلفة',
                  value: formatCurrency(selected.actualCost || selected.estimatedCost),
                },
                {
                  label: 'التاريخ',
                  value: new Date(selected.createdAt).toLocaleDateString('ar-SA'),
                },
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

      {/* Delete */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs">
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من حذف "{selected?.title}"?</Typography>
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
