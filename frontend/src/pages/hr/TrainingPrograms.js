/**
 * 📚 إدارة البرامج التدريبية — Training Programs Management
 * AlAwael ERP — Training & Development Module
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  Button,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  InputAdornment,
  Rating,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  School as SchoolIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckIcon,
  Star as StarIcon,
  Group as GroupIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { programsService, MOCK_PROGRAMS } from 'services/trainingService';
import { useSnackbar } from 'contexts/SnackbarContext';

const categories = [
  'التطوير المهني',
  'المهارات التقنية',
  'القيادة والإدارة',
  'السلامة والصحة',
  'خدمة العملاء',
  'الجودة والامتثال',
];
const deliveryMethods = ['حضوري', 'عن بعد', 'مدمج', 'تعلم ذاتي'];
const trainingStatuses = ['مخطط', 'قيد التنفيذ', 'مكتمل', 'ملغي', 'معلق'];
const departments = [
  'الموارد البشرية',
  'تقنية المعلومات',
  'المالية',
  'التعليم',
  'العلاج والتأهيل',
  'الإدارة',
  'العمليات',
];

const statusColors = {
  مخطط: 'info',
  'قيد التنفيذ': 'warning',
  مكتمل: 'success',
  ملغي: 'error',
  معلق: 'default',
};

const formatCurrency = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v);

const EMPTY = {
  title: '',
  category: '',
  department: '',
  trainer: '',
  deliveryMethod: '',
  status: 'مخطط',
  durationHours: 0,
  maxParticipants: 20,
  cost: 0,
  startDate: '',
  endDate: '',
  description: '',
  objectives: [''],
};

export default function TrainingPrograms() {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await programsService.getAll();
      setPrograms(res || MOCK_PROGRAMS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = [...programs];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        p => p.title.toLowerCase().includes(s) || p.trainer?.toLowerCase().includes(s)
      );
    }
    if (filterCategory) list = list.filter(p => p.category === filterCategory);
    if (filterStatus) list = list.filter(p => p.status === filterStatus);
    return list;
  }, [programs, search, filterCategory, filterStatus]);

  const openCreate = () => {
    setForm(EMPTY);
    setSelected(null);
    setFormOpen(true);
  };
  const openEdit = p => {
    setForm({ ...p, objectives: p.objectives || [''] });
    setSelected(p);
    setFormOpen(true);
  };
  const openDetail = p => {
    setSelected(p);
    setDetailOpen(true);
  };
  const openDelete = p => {
    setSelected(p);
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.category) {
      showSnackbar('يرجى إدخال اسم البرنامج والفئة', 'warning');
      return;
    }
    setLoading(true);
    try {
      if (selected?._id) {
        await programsService.update(selected._id, form);
        setPrograms(prev => prev.map(p => (p._id === selected._id ? { ...p, ...form } : p)));
        showSnackbar('تم تحديث البرنامج بنجاح', 'success');
      } else {
        const newId = `prog-${Date.now()}`;
        const newProgram = {
          ...form,
          _id: newId,
          enrolledCount: 0,
          completedCount: 0,
          rating: 0,
          createdAt: new Date().toISOString(),
        };
        const res = await programsService.create(form);
        setPrograms(prev => [res || newProgram, ...prev]);
        showSnackbar('تم إضافة البرنامج بنجاح', 'success');
      }
      setFormOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await programsService.remove(selected._id);
      setPrograms(prev => prev.filter(p => p._id !== selected._id));
      showSnackbar('تم حذف البرنامج', 'info');
      setDeleteOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const addObjective = () => setForm(p => ({ ...p, objectives: [...(p.objectives || []), ''] }));
  const updateObjective = (i, val) =>
    setForm(p => ({ ...p, objectives: p.objectives.map((o, idx) => (idx === i ? val : o)) }));
  const removeObjective = i =>
    setForm(p => ({ ...p, objectives: p.objectives.filter((_, idx) => idx !== i) }));

  const stats = useMemo(
    () => ({
      total: programs.length,
      active: programs.filter(p => p.status === 'قيد التنفيذ').length,
      completed: programs.filter(p => p.status === 'مكتمل').length,
      totalCost: programs.reduce((a, p) => a + (p.cost || 0), 0),
    }),
    [programs]
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #0277BD 0%, #01579B 100%)',
          color: 'white',
          borderRadius: 3,
        }}
      >
        <CardContent
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              📚 إدارة البرامج التدريبية
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, mt: 0.5 }}>
              إنشاء وإدارة برامج التدريب والتطوير المهني
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
              sx={{ bgcolor: 'white', color: '#01579B', '&:hover': { bgcolor: '#E1F5FE' } }}
            >
              برنامج جديد
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي البرامج', value: stats.total, color: '#0277BD' },
          { label: 'قيد التنفيذ', value: stats.active, color: '#FFA726' },
          { label: 'مكتملة', value: stats.completed, color: '#66BB6A' },
          { label: 'التكلفة الإجمالية', value: formatCurrency(stats.totalCost), color: '#EF5350' },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={{ borderRadius: 2, borderTop: `3px solid ${s.color}` }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5" fontWeight={700} color={s.color}>
                  {s.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <TextField
          size="small"
          placeholder="بحث..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
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
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          sx={{ minWidth: 150 }}
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
          label="الحالة"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="">الكل</MenuItem>
          {trainingStatuses.map(s => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        <Chip label={`${filtered.length} برنامج`} variant="outlined" />
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>البرنامج</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>المدرب</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>المدة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>المشاركين</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>التقييم</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(p => (
              <TableRow key={p._id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ bgcolor: '#0277BD22', color: '#0277BD', width: 32, height: 32 }}>
                      <SchoolIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {p.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.department}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={p.category} variant="outlined" />
                </TableCell>
                <TableCell>{p.trainer}</TableCell>
                <TableCell>{p.duration || `${p.durationHours} ساعة`}</TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {p.enrolledCount}/{p.maxParticipants}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(p.enrolledCount / p.maxParticipants) * 100}
                    sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                  />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={p.status} color={statusColors[p.status] || 'default'} />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Rating value={p.rating} precision={0.5} size="small" readOnly />
                    <Typography variant="caption">({p.rating})</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Tooltip title="عرض">
                    <IconButton size="small" onClick={() => openDetail(p)}>
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تعديل">
                    <IconButton size="small" onClick={() => openEdit(p)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف">
                    <IconButton size="small" color="error" onClick={() => openDelete(p)}>
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
          labelRowsPerPage="صفوف لكل صفحة:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
        />
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          {selected ? 'تعديل البرنامج التدريبي' : 'إضافة برنامج تدريبي جديد'}
          <IconButton onClick={() => setFormOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اسم البرنامج"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
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
                {categories.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="القسم"
                value={form.department}
                onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
              >
                {departments.map(d => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="المدرب"
                value={form.trainer}
                onChange={e => setForm(p => ({ ...p, trainer: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="طريقة التقديم"
                value={form.deliveryMethod}
                onChange={e => setForm(p => ({ ...p, deliveryMethod: e.target.value }))}
              >
                {deliveryMethods.map(m => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="المدة (ساعات)"
                type="number"
                value={form.durationHours}
                onChange={e => setForm(p => ({ ...p, durationHours: +e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="الحد الأقصى للمشاركين"
                type="number"
                value={form.maxParticipants}
                onChange={e => setForm(p => ({ ...p, maxParticipants: +e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="التكلفة (ر.س)"
                type="number"
                value={form.cost}
                onChange={e => setForm(p => ({ ...p, cost: +e.target.value }))}
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
                {trainingStatuses.map(s => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="تاريخ البداية"
                type="date"
                value={form.startDate?.split('T')[0] || ''}
                onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="تاريخ النهاية"
                type="date"
                value={form.endDate?.split('T')[0] || ''}
                onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الوصف"
                multiline
                rows={3}
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                أهداف البرنامج
              </Typography>
              {(form.objectives || []).map((obj, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    value={obj}
                    onChange={e => updateObjective(i, e.target.value)}
                    placeholder={`هدف ${i + 1}`}
                  />
                  <IconButton size="small" color="error" onClick={() => removeObjective(i)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button size="small" startIcon={<AddIcon />} onClick={addObjective}>
                إضافة هدف
              </Button>
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
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          تفاصيل البرنامج التدريبي
          <IconButton onClick={() => setDetailOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        {selected && (
          <DialogContent dividers>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Avatar
                sx={{
                  bgcolor: '#0277BD22',
                  color: '#0277BD',
                  width: 64,
                  height: 64,
                  mx: 'auto',
                  mb: 1,
                }}
              >
                <SchoolIcon fontSize="large" />
              </Avatar>
              <Typography variant="h6" fontWeight={700}>
                {selected.title}
              </Typography>
              <Chip
                label={selected.status}
                color={statusColors[selected.status] || 'default'}
                sx={{ mt: 0.5 }}
              />
            </Box>
            <Grid container spacing={2}>
              {[
                { icon: <SchoolIcon />, label: 'الفئة', value: selected.category },
                { icon: <GroupIcon />, label: 'القسم', value: selected.department },
                {
                  icon: <TimeIcon />,
                  label: 'المدة',
                  value: selected.duration || `${selected.durationHours} ساعة`,
                },
                {
                  icon: <GroupIcon />,
                  label: 'المشاركين',
                  value: `${selected.enrolledCount}/${selected.maxParticipants}`,
                },
              ].map((f, i) => (
                <Grid item xs={6} key={i}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                    }}
                  >
                    {f.icon}
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {f.label}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {f.value || '-'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <StarIcon sx={{ color: '#FFA726' }} />
              <Rating value={selected.rating} precision={0.5} readOnly />
              <Typography variant="body2">({selected.rating})</Typography>
            </Box>
            {selected.description && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  الوصف
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selected.description}
                </Typography>
              </Box>
            )}
            {selected.objectives?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  الأهداف
                </Typography>
                <List dense>
                  {selected.objectives.map((obj, i) => (
                    <ListItem key={i}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={obj} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs">
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من حذف البرنامج "{selected?.title}"?</Typography>
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
