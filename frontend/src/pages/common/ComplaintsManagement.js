/**
 * 📋 إدارة الشكاوى والاقتراحات — Complaints & Suggestions Page
 * AlAwael ERP
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Paper,
} from '@mui/material';




import {
  complaintsService,
  complaintsReportsService,
  MOCK_COMPLAINTS,
  MOCK_COMPLAINTS_DASHBOARD,
} from 'services/complaintsService';
import { useSnackbar } from 'contexts/SnackbarContext';

const COLORS = ['#E53935', '#FB8C00', '#1E88E5', '#43A047', '#8E24AA', '#00897B'];
const complaintCategories = [
  'صيانة',
  'تقنية',
  'مالية',
  'تغذية',
  'مرافق',
  'تعليم',
  'أنشطة',
  'إدارية',
  'نقل',
  'أخرى',
];
const complaintTypes = ['شكوى', 'اقتراح'];
const priorities = ['عاجل', 'عالي', 'متوسط', 'منخفض'];
const allStatuses = ['مفتوحة', 'قيد المراجعة', 'قيد التنفيذ', 'تم الحل', 'مقبول', 'مرفوض'];
const priorityColors = { عاجل: 'error', عالي: 'warning', متوسط: 'info', منخفض: 'default' };
const statusColors = {
  مفتوحة: 'error',
  'قيد المراجعة': 'warning',
  'قيد التنفيذ': 'info',
  'تم الحل': 'success',
  مقبول: 'secondary',
  مرفوض: 'default',
};

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ py: 2 }}>{children}</Box> : null;
}

const EMPTY_COMPLAINT = {
  title: '',
  description: '',
  type: 'شكوى',
  category: '',
  priority: 'متوسط',
  submittedBy: '',
  submitterRole: '',
  department: '',
  assignedTo: '',
};

export default function ComplaintsManagement() {
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(MOCK_COMPLAINTS_DASHBOARD);
  const [complaints, setComplaints] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_COMPLAINT);
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolution, setResolution] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([
        complaintsReportsService.getDashboardStats(),
        complaintsService.getAll(),
      ]);
      setDashboard(d || MOCK_COMPLAINTS_DASHBOARD);
      setComplaints(c || MOCK_COMPLAINTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = [...complaints];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        c => c.title.toLowerCase().includes(s) || c.submittedBy?.toLowerCase().includes(s)
      );
    }
    if (filterType) list = list.filter(c => c.type === filterType);
    if (filterStatus) list = list.filter(c => c.status === filterStatus);
    if (filterPriority) list = list.filter(c => c.priority === filterPriority);
    return list;
  }, [complaints, search, filterType, filterStatus, filterPriority]);

  const openCreate = () => {
    setForm(EMPTY_COMPLAINT);
    setSelected(null);
    setFormOpen(true);
  };
  const openEdit = c => {
    setForm({ ...c });
    setSelected(c);
    setFormOpen(true);
  };
  const openDetail = c => {
    setSelected(c);
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
        await complaintsService.update(selected._id, form);
        setComplaints(prev => prev.map(c => (c._id === selected._id ? { ...c, ...form } : c)));
        showSnackbar('تم تحديث الشكوى/الاقتراح', 'success');
      } else {
        const nc = {
          ...form,
          _id: `comp-${Date.now()}`,
          status: 'مفتوحة',
          createdAt: new Date().toISOString().split('T')[0],
          resolvedAt: null,
          resolution: '',
          rating: null,
        };
        const res = await complaintsService.create(form);
        setComplaints(prev => [res || nc, ...prev]);
        showSnackbar('تم تسجيل الشكوى/الاقتراح', 'success');
      }
      setFormOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selected || !resolution.trim()) {
      showSnackbar('يرجى إدخال تفاصيل الحل', 'warning');
      return;
    }
    await complaintsService.resolve(selected._id, resolution);
    setComplaints(prev =>
      prev.map(c =>
        c._id === selected._id
          ? {
              ...c,
              status: selected.type === 'اقتراح' ? 'مقبول' : 'تم الحل',
              resolution,
              resolvedAt: new Date().toISOString().split('T')[0],
            }
          : c
      )
    );
    showSnackbar('تم حل الشكوى/الاقتراح', 'success');
    setResolveOpen(false);
    setResolution('');
  };

  const handleDelete = async () => {
    if (!selected) return;
    await complaintsService.remove(selected._id);
    setComplaints(prev => prev.filter(c => c._id !== selected._id));
    showSnackbar('تم الحذف', 'info');
    setDeleteOpen(false);
  };

  const kpis = [
    { label: 'إجمالي الشكاوى', value: dashboard.totalComplaints, color: '#E53935' },
    { label: 'مفتوحة', value: dashboard.openComplaints, color: '#FB8C00' },
    { label: 'قيد التنفيذ', value: dashboard.inProgressComplaints, color: '#1E88E5' },
    { label: 'تم الحل', value: dashboard.resolvedComplaints, color: '#43A047' },
    { label: 'اقتراحات مقبولة', value: dashboard.acceptedSuggestions, color: '#8E24AA' },
    { label: 'رضا المتعاملين', value: `${dashboard.satisfactionAvg}/5`, color: '#00897B' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #F57F17 0%, #E65100 100%)',
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
              📋 إدارة الشكاوى والاقتراحات
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, mt: 0.5 }}>
              تتبع الشكاوى والاقتراحات وحلها بكفاءة
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
              sx={{ bgcolor: 'white', color: '#E65100', '&:hover': { bgcolor: '#FFF3E0' } }}
            >
              تسجيل جديد
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((k, i) => (
          <Grid item xs={6} md={2} key={i}>
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
          <Tab label="قائمة الشكاوى والاقتراحات" />
        </Tabs>

        {/* Overview */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  التوزيع حسب النوع
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={dashboard.typeDistribution}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, count }) => `${name} (${count})`}
                    >
                      {dashboard.typeDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Pie>
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  التوزيع حسب الحالة
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={dashboard.statusDistribution}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, count }) => `${name} (${count})`}
                    >
                      {dashboard.statusDistribution.map((d, i) => (
                        <Cell key={i} fill={d.color || COLORS[i]} />
                      ))}
                    </Pie>
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  حسب الأولوية
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dashboard.priorityDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis />
                    <RTooltip />
                    <Bar dataKey="count" name="العدد" fill="#FB8C00" radius={[4, 4, 0, 0]}>
                      {dashboard.priorityDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  الاتجاه الشهري
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={dashboard.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis />
                    <RTooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="complaints"
                      name="واردة"
                      stroke="#E53935"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="resolved"
                      name="منجزة"
                      stroke="#43A047"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  حسب الفئة
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboard.categoryDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" fontSize={11} width={60} />
                    <RTooltip />
                    <Bar dataKey="count" name="العدد" fill="#1E88E5" radius={[0, 4, 4, 0]}>
                      {dashboard.categoryDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* List */}
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
                label="النوع"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                sx={{ minWidth: 100 }}
              >
                <MenuItem value="">الكل</MenuItem>
                {complaintTypes.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
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
                {allStatuses.map(s => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="الأولوية"
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                sx={{ minWidth: 110 }}
              >
                <MenuItem value="">الكل</MenuItem>
                {priorities.map(p => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
              <Chip label={`${filtered.length} عنصر`} variant="outlined" />
            </Paper>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الأولوية</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>مقدم من</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(c => (
                    <TableRow key={c._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            sx={{
                              bgcolor: c.type === 'شكوى' ? '#E5393522' : '#8E24AA22',
                              color: c.type === 'شكوى' ? '#E53935' : '#8E24AA',
                              width: 32,
                              height: 32,
                            }}
                          >
                            {c.type === 'شكوى' ? (
                              <ComplaintIcon fontSize="small" />
                            ) : (
                              <SuggestionIcon fontSize="small" />
                            )}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600}>
                            {c.title}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={c.type}
                          color={c.type === 'شكوى' ? 'error' : 'secondary'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{c.category}</TableCell>
                      <TableCell>
                        <Chip size="small" label={c.priority} color={priorityColors[c.priority]} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{c.submittedBy}</Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {c.submitterRole}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={c.status} color={statusColors[c.status]} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{c.createdAt}</Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="عرض">
                          <IconButton size="small" onClick={() => openDetail(c)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton size="small" onClick={() => openEdit(c)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {!['تم الحل', 'مقبول', 'مرفوض'].includes(c.status) && (
                          <Tooltip title="حل">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => {
                                setSelected(c);
                                setResolution('');
                                setResolveOpen(true);
                              }}
                            >
                              <ResolveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelected(c);
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
      </Paper>

      {/* Create/Edit */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {selected ? 'تعديل' : 'تسجيل شكوى/اقتراح جديد'}
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="الوصف"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="النوع"
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              >
                {complaintTypes.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
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
                {complaintCategories.map(c => (
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="مقدم من"
                value={form.submittedBy}
                onChange={e => setForm(p => ({ ...p, submittedBy: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الصفة"
                value={form.submitterRole}
                onChange={e => setForm(p => ({ ...p, submitterRole: e.target.value }))}
                placeholder="معلم، ولي أمر، موظف..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="القسم المعني"
                value={form.department}
                onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            {selected ? 'تحديث' : 'تسجيل'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          التفاصيل
          <IconButton onClick={() => setDetailOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        {selected && (
          <DialogContent dividers>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Avatar
                sx={{
                  bgcolor: selected.type === 'شكوى' ? '#E5393522' : '#8E24AA22',
                  color: selected.type === 'شكوى' ? '#E53935' : '#8E24AA',
                  width: 56,
                  height: 56,
                  mx: 'auto',
                  mb: 1,
                }}
              >
                {selected.type === 'شكوى' ? <ComplaintIcon /> : <SuggestionIcon />}
              </Avatar>
              <Typography variant="h6" fontWeight={700}>
                {selected.title}
              </Typography>
              <Box sx={{ mt: 0.5, display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Chip
                  size="small"
                  label={selected.type}
                  color={selected.type === 'شكوى' ? 'error' : 'secondary'}
                />
                <Chip
                  size="small"
                  label={selected.priority}
                  color={priorityColors[selected.priority]}
                />
                <Chip size="small" label={selected.status} color={statusColors[selected.status]} />
              </Box>
            </Box>
            <Typography
              variant="body2"
              sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}
            >
              {selected.description}
            </Typography>
            <Grid container spacing={1.5}>
              {[
                { label: 'الفئة', value: selected.category },
                { label: 'مقدم من', value: `${selected.submittedBy} (${selected.submitterRole})` },
                { label: 'القسم', value: selected.department },
                { label: 'المسند إليه', value: selected.assignedTo || 'غير معين' },
                { label: 'تاريخ التسجيل', value: selected.createdAt },
                { label: 'تاريخ الحل', value: selected.resolvedAt || '-' },
              ].map((f, i) => (
                <Grid item xs={6} key={i}>
                  <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {f.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {f.value}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            {selected.resolution && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: '#E8F5E9', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  الحل:
                </Typography>
                <Typography variant="body2">{selected.resolution}</Typography>
              </Box>
            )}
            {selected.rating && (
              <Box sx={{ mt: 1, textAlign: 'center' }}>
                <Typography variant="caption">تقييم الرضا:</Typography>
                <Rating value={selected.rating} readOnly />
              </Box>
            )}
          </DialogContent>
        )}
      </Dialog>

      {/* Resolve */}
      <Dialog open={resolveOpen} onClose={() => setResolveOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>حل الشكوى/الاقتراح</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {selected?.title}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="تفاصيل الحل"
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            placeholder="اذكر تفاصيل الحل أو الإجراء المتخذ..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="success" onClick={handleResolve}>
            تأكيد الحل
          </Button>
        </DialogActions>
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
