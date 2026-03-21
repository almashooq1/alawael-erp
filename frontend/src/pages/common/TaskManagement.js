/**
 * ✅ إدارة المهام — Task Management Page
 * AlAwael ERP
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Paper,
} from '@mui/material';




import {
  tasksService,
  taskReportsService,
  MOCK_TASKS,
  MOCK_TASK_DASHBOARD,
} from 'services/taskService';
import { useSnackbar } from 'contexts/SnackbarContext';

const COLORS = ['#9E9E9E', '#1E88E5', '#43A047', '#FB8C00', '#E53935', '#8E24AA'];
const taskStatuses = ['لم تبدأ', 'قيد التنفيذ', 'مكتمل'];
const taskPriorities = ['عاجل', 'عالي', 'متوسط', 'منخفض'];
const taskCategories = [
  'إداري',
  'تقني',
  'مالي',
  'أكاديمي',
  'فعاليات',
  'مشتريات',
  'تدريب',
  'أمن وسلامة',
  'أخرى',
];
const priorityColors = { عاجل: 'error', عالي: 'warning', متوسط: 'info', منخفض: 'default' };
const statusColors = { 'لم تبدأ': 'default', 'قيد التنفيذ': 'info', مكتمل: 'success' };
const progressColor = p =>
  p >= 80 ? '#43A047' : p >= 50 ? '#1E88E5' : p >= 20 ? '#FB8C00' : '#9E9E9E';

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ py: 2 }}>{children}</Box> : null;
}

const EMPTY_TASK = {
  title: '',
  description: '',
  priority: 'متوسط',
  category: '',
  assignedTo: '',
  assignedBy: '',
  team: '',
  dueDate: '',
  tags: '',
};

export default function TaskManagement() {
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(MOCK_TASK_DASHBOARD);
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_TASK);
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, t] = await Promise.all([
        taskReportsService.getDashboardStats(),
        tasksService.getAll(),
      ]);
      setDashboard(d || MOCK_TASK_DASHBOARD);
      setTasks(t || MOCK_TASKS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        t => t.title.toLowerCase().includes(s) || t.assignedTo?.toLowerCase().includes(s)
      );
    }
    if (filterStatus) list = list.filter(t => t.status === filterStatus);
    if (filterPriority) list = list.filter(t => t.priority === filterPriority);
    if (filterCategory) list = list.filter(t => t.category === filterCategory);
    return list;
  }, [tasks, search, filterStatus, filterPriority, filterCategory]);

  const openCreate = () => {
    setForm(EMPTY_TASK);
    setSelected(null);
    setFormOpen(true);
  };
  const openEdit = t => {
    setForm({ ...t, tags: (t.tags || []).join(', ') });
    setSelected(t);
    setFormOpen(true);
  };
  const openDetail = t => {
    setSelected(t);
    setDetailOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) {
      showSnackbar('يرجى إدخال عنوان المهمة', 'warning');
      return;
    }
    setLoading(true);
    try {
      const tags =
        typeof form.tags === 'string'
          ? form.tags
              .split(',')
              .map(t => t.trim())
              .filter(Boolean)
          : form.tags;
      if (selected?._id) {
        await tasksService.update(selected._id, { ...form, tags });
        setTasks(prev => prev.map(t => (t._id === selected._id ? { ...t, ...form, tags } : t)));
        showSnackbar('تم تحديث المهمة', 'success');
      } else {
        const nt = {
          ...form,
          tags,
          _id: `task-${Date.now()}`,
          status: 'لم تبدأ',
          progress: 0,
          startDate: null,
          completedDate: null,
          attachments: 0,
        };
        const res = await tasksService.create({ ...form, tags });
        setTasks(prev => [res || nt, ...prev]);
        showSnackbar('تم إنشاء المهمة', 'success');
      }
      setFormOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'قيد التنفيذ' && !task.startDate)
      updates.startDate = new Date().toISOString().split('T')[0];
    if (newStatus === 'مكتمل') {
      updates.completedDate = new Date().toISOString().split('T')[0];
      updates.progress = 100;
    }
    await tasksService.updateStatus(task._id, newStatus);
    setTasks(prev => prev.map(t => (t._id === task._id ? { ...t, ...updates } : t)));
    showSnackbar(`تم تحديث حالة المهمة إلى "${newStatus}"`, 'success');
  };

  const handleDelete = async () => {
    if (!selected) return;
    await tasksService.remove(selected._id);
    setTasks(prev => prev.filter(t => t._id !== selected._id));
    showSnackbar('تم حذف المهمة', 'info');
    setDeleteOpen(false);
  };

  const kpis = [
    { label: 'إجمالي المهام', value: dashboard.totalTasks, color: '#1E88E5' },
    { label: 'مكتملة', value: dashboard.completedTasks, color: '#43A047' },
    { label: 'قيد التنفيذ', value: dashboard.inProgressTasks, color: '#FB8C00' },
    { label: 'لم تبدأ', value: dashboard.notStartedTasks, color: '#9E9E9E' },
    { label: 'متأخرة', value: dashboard.overdueTasks, color: '#E53935' },
    { label: 'نسبة الإنجاز', value: `${dashboard.completionRate}%`, color: '#8E24AA' },
  ];

  /* board helpers */
  const boardColumns = useMemo(
    () => [
      { key: 'لم تبدأ', color: '#9E9E9E', items: tasks.filter(t => t.status === 'لم تبدأ') },
      {
        key: 'قيد التنفيذ',
        color: '#1E88E5',
        items: tasks.filter(t => t.status === 'قيد التنفيذ'),
      },
      { key: 'مكتمل', color: '#43A047', items: tasks.filter(t => t.status === 'مكتمل') },
    ],
    [tasks]
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #283593 0%, #1A237E 100%)',
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
              ✅ إدارة المهام
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, mt: 0.5 }}>
              تتبع المهام الشخصية والفريقية وإدارة الأولويات
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
              sx={{ bgcolor: 'white', color: '#1A237E', '&:hover': { bgcolor: '#E8EAF6' } }}
            >
              مهمة جديدة
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
          <Tab label="قائمة المهام" />
          <Tab label="لوحة كانبان" />
        </Tabs>

        {/* Overview */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
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
                    <Bar dataKey="count" name="العدد" radius={[4, 4, 0, 0]}>
                      {dashboard.priorityDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i + 1]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  حسب الفئة
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dashboard.categoryDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" fontSize={11} width={50} />
                    <RTooltip />
                    <Bar dataKey="count" name="العدد" fill="#283593" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  الاتجاه الأسبوعي
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={dashboard.weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" fontSize={11} />
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
                      name="أكملت"
                      stroke="#43A047"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  أداء الفرق
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboard.teamPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="team" fontSize={10} />
                    <YAxis />
                    <RTooltip />
                    <Legend />
                    <Bar dataKey="total" name="الإجمالي" fill="#1E88E5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="المكتملة" fill="#43A047" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Task List */}
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
                label="الحالة"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="">الكل</MenuItem>
                {taskStatuses.map(s => (
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
                {taskPriorities.map(p => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="الفئة"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                sx={{ minWidth: 110 }}
              >
                <MenuItem value="">الكل</MenuItem>
                {taskCategories.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
              <Chip label={`${filtered.length} مهمة`} variant="outlined" />
            </Paper>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>المهمة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الأولوية</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المسند إليه</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التقدم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الموعد النهائي</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(t => {
                    const isOverdue =
                      t.status !== 'مكتمل' && t.dueDate && new Date(t.dueDate) < new Date();
                    return (
                      <TableRow key={t._id} hover sx={isOverdue ? { bgcolor: '#FFEBEE' } : {}}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{ bgcolor: '#28359322', color: '#283593', width: 32, height: 32 }}
                            >
                              <TaskIcon fontSize="small" />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {t.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {t.team}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={t.priority}
                            color={priorityColors[t.priority]}
                          />
                        </TableCell>
                        <TableCell>{t.assignedTo}</TableCell>
                        <TableCell>
                          <Box
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}
                          >
                            <LinearProgress
                              variant="determinate"
                              value={t.progress}
                              sx={{
                                flexGrow: 1,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: '#E0E0E0',
                                '& .MuiLinearProgress-bar': { bgcolor: progressColor(t.progress) },
                              }}
                            />
                            <Typography variant="caption" fontWeight={600}>
                              {t.progress}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="caption"
                            color={isOverdue ? 'error' : 'text.secondary'}
                            fontWeight={isOverdue ? 700 : 400}
                          >
                            {t.dueDate} {isOverdue && '⚠️'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={t.status} color={statusColors[t.status]} />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="عرض">
                            <IconButton size="small" onClick={() => openDetail(t)}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="تعديل">
                            <IconButton size="small" onClick={() => openEdit(t)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {t.status === 'لم تبدأ' && (
                            <Tooltip title="بدء">
                              <IconButton
                                size="small"
                                color="info"
                                onClick={() => handleStatusChange(t, 'قيد التنفيذ')}
                              >
                                <StartIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {t.status === 'قيد التنفيذ' && (
                            <Tooltip title="إكمال">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleStatusChange(t, 'مكتمل')}
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
                                setSelected(t);
                                setDeleteOpen(true);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

        {/* Kanban Board */}
        <TabPanel value={tab} index={2}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {boardColumns.map(col => (
                <Grid item xs={12} md={4} key={col.key}>
                  <Paper
                    sx={{ p: 1.5, bgcolor: col.color + '11', borderRadius: 2, minHeight: 400 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1.5,
                      }}
                    >
                      <Chip
                        label={col.key}
                        sx={{ bgcolor: col.color, color: 'white', fontWeight: 700 }}
                      />
                      <Typography variant="caption" fontWeight={700}>
                        {col.items.length}
                      </Typography>
                    </Box>
                    {col.items.map(t => (
                      <Card
                        key={t._id}
                        sx={{
                          mb: 1.5,
                          borderRadius: 2,
                          borderRight: `3px solid ${col.color}`,
                          cursor: 'pointer',
                        }}
                        onClick={() => openDetail(t)}
                      >
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="body2" fontWeight={700} gutterBottom>
                            {t.title}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                            <Chip
                              size="small"
                              label={t.priority}
                              color={priorityColors[t.priority]}
                              sx={{ height: 20, fontSize: '0.65rem' }}
                            />
                            <Chip
                              size="small"
                              label={t.category}
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.65rem' }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={t.progress}
                              sx={{
                                flexGrow: 1,
                                height: 4,
                                borderRadius: 2,
                                bgcolor: '#E0E0E0',
                                '& .MuiLinearProgress-bar': { bgcolor: progressColor(t.progress) },
                              }}
                            />
                            <Typography variant="caption">{t.progress}%</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {t.assignedTo}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              📅 {t.dueDate}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      {/* Create/Edit */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {selected ? 'تعديل المهمة' : 'مهمة جديدة'}
          <IconButton onClick={() => setFormOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="عنوان المهمة"
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
                label="الأولوية"
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
              >
                {taskPriorities.map(p => (
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
                label="الفئة"
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              >
                {taskCategories.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="الموعد النهائي"
                value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
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
                label="المسند بواسطة"
                value={form.assignedBy}
                onChange={e => setForm(p => ({ ...p, assignedBy: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الفريق"
                value={form.team}
                onChange={e => setForm(p => ({ ...p, team: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الوسوم (مفصولة بفاصلة)"
                value={form.tags}
                onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
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

      {/* Detail */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          تفاصيل المهمة
          <IconButton onClick={() => setDetailOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        {selected && (
          <DialogContent dividers>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Avatar
                sx={{
                  bgcolor: '#28359322',
                  color: '#283593',
                  width: 56,
                  height: 56,
                  mx: 'auto',
                  mb: 1,
                }}
              >
                <TaskIcon />
              </Avatar>
              <Typography variant="h6" fontWeight={700}>
                {selected.title}
              </Typography>
              <Box
                sx={{
                  mt: 0.5,
                  display: 'flex',
                  gap: 0.5,
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Chip
                  size="small"
                  label={selected.priority}
                  color={priorityColors[selected.priority]}
                />
                <Chip size="small" label={selected.status} color={statusColors[selected.status]} />
                <Chip size="small" label={selected.category} variant="outlined" />
              </Box>
            </Box>
            <Typography
              variant="body2"
              sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}
            >
              {selected.description}
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                التقدم
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={selected.progress}
                  sx={{
                    flexGrow: 1,
                    height: 10,
                    borderRadius: 5,
                    bgcolor: '#E0E0E0',
                    '& .MuiLinearProgress-bar': { bgcolor: progressColor(selected.progress) },
                  }}
                />
                <Typography variant="body2" fontWeight={700}>
                  {selected.progress}%
                </Typography>
              </Box>
            </Box>
            <Grid container spacing={1.5}>
              {[
                { label: 'المسند إليه', value: selected.assignedTo },
                { label: 'الفريق', value: selected.team },
                { label: 'تاريخ البداية', value: selected.startDate || '-' },
                { label: 'الموعد النهائي', value: selected.dueDate },
                { label: 'تاريخ الإكمال', value: selected.completedDate || '-' },
                { label: 'المرفقات', value: selected.attachments },
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
            {selected.tags?.length > 0 && (
              <Box sx={{ mt: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selected.tags.map((tag, i) => (
                  <Chip key={i} size="small" label={tag} />
                ))}
              </Box>
            )}
          </DialogContent>
        )}
      </Dialog>

      {/* Delete */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs">
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من حذف المهمة "{selected?.title}"?</Typography>
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
