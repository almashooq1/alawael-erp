import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Chip,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Delete as DeleteIcon,
  Flag as FlagIcon,
  Schedule as ScheduleIcon,
  Assignment as TaskIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
  PlayArrow as PlayIcon,
  Done as DoneIcon,
} from '@mui/icons-material';
import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { statusColors, neutralColors } from '../../theme/palette';

const CATEGORIES = [
  { value: 'session_prep', label: 'تحضير جلسة', color: '#3b82f6' },
  { value: 'follow_up', label: 'متابعة', color: '#10b981' },
  { value: 'documentation', label: 'توثيق', color: '#f59e0b' },
  { value: 'assessment', label: 'تقييم', color: '#8b5cf6' },
  { value: 'communication', label: 'تواصل', color: '#ec4899' },
  { value: 'admin', label: 'إداري', color: '#6b7280' },
  { value: 'general', label: 'عام', color: '#06b6d4' },
];

const PRIORITIES = [
  { value: 'urgent', label: 'عاجل', color: 'error' },
  { value: 'high', label: 'مرتفع', color: 'warning' },
  { value: 'normal', label: 'عادي', color: 'info' },
  { value: 'low', label: 'منخفض', color: 'default' },
];

const TherapistDailyTasks = () => {
  const { currentUser: _currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'normal',
    dueDate: new Date().toISOString().split('T')[0],
    patientName: '',
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getDailyTasks();
      setTasks(res?.tasks || []);
      setStats(res?.stats || {});
    } catch (err) {
      logger.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await therapistService.createTask(form);
      showSnackbar('تم إنشاء المهمة بنجاح', 'success');
      setCreateOpen(false);
      setForm({
        title: '',
        description: '',
        category: 'general',
        priority: 'normal',
        dueDate: new Date().toISOString().split('T')[0],
        patientName: '',
      });
      loadTasks();
    } catch {
      showSnackbar('خطأ في إنشاء المهمة', 'error');
    }
  };

  const handleStatusToggle = async task => {
    const newStatus =
      task.status === 'completed'
        ? 'pending'
        : task.status === 'pending'
          ? 'in-progress'
          : 'completed';
    try {
      await therapistService.updateTask(task.id, { status: newStatus });
      loadTasks();
    } catch {
      showSnackbar('خطأ في تحديث المهمة', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteTask(id);
      showSnackbar('تم حذف المهمة', 'success');
      loadTasks();
    } catch {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const filtered = tasks.filter(t => {
    const matchSearch =
      !search ||
      t.title?.includes(search) ||
      t.description?.includes(search) ||
      t.patientName?.includes(search);
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TaskIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                سجل المهام اليومية
              </Typography>
              <Typography variant="body2">إدارة المهام والتذكيرات والمتابعات</Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            مهمة جديدة
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'الإجمالي',
            value: stats.total || 0,
            color: statusColors.info,
            icon: <TaskIcon />,
          },
          {
            label: 'قيد الانتظار',
            value: stats.pending || 0,
            color: statusColors.warning,
            icon: <ScheduleIcon />,
          },
          {
            label: 'قيد التنفيذ',
            value: stats.inProgress || 0,
            color: '#3b82f6',
            icon: <PlayIcon />,
          },
          {
            label: 'مكتملة',
            value: stats.completed || 0,
            color: statusColors.success,
            icon: <DoneIcon />,
          },
          {
            label: 'متأخرة',
            value: stats.overdue || 0,
            color: statusColors.error,
            icon: <WarningIcon />,
          },
          {
            label: 'مستحقة اليوم',
            value: stats.todayDue || 0,
            color: '#8b5cf6',
            icon: <FlagIcon />,
          },
        ].map((s, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: s.color }}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="بحث..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={statusFilter}
            label="الحالة"
            onChange={e => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="pending">قيد الانتظار</MenuItem>
            <MenuItem value="in-progress">قيد التنفيذ</MenuItem>
            <MenuItem value="completed">مكتملة</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Task List */}
      {loading ? (
        <Typography textAlign="center" color="textSecondary" sx={{ py: 4 }}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <TaskIcon sx={{ fontSize: 60, color: neutralColors.divider, mb: 2 }} />
          <Typography color="textSecondary">لا توجد مهام</Typography>
        </Paper>
      ) : (
        filtered.map(task => {
          const cat = CATEGORIES.find(c => c.value === task.category) || CATEGORIES[6];
          const pri = PRIORITIES.find(p => p.value === task.priority) || PRIORITIES[2];
          const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();
          return (
            <Card
              key={task.id}
              sx={{
                mb: 1.5,
                borderRadius: 2,
                borderRight: `4px solid ${cat.color}`,
                opacity: task.status === 'completed' ? 0.7 : 1,
              }}
            >
              <CardContent
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  py: 1.5,
                  '&:last-child': { pb: 1.5 },
                }}
              >
                <IconButton
                  onClick={() => handleStatusToggle(task)}
                  color={task.status === 'completed' ? 'success' : 'default'}
                >
                  {task.status === 'completed' ? (
                    <CheckIcon />
                  ) : task.status === 'in-progress' ? (
                    <PlayIcon color="primary" />
                  ) : (
                    <UncheckedIcon />
                  )}
                </IconButton>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 'bold',
                      textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                    }}
                  >
                    {task.title}
                  </Typography>
                  {task.description && (
                    <Typography variant="body2" color="textSecondary">
                      {task.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                    <Chip
                      label={cat.label}
                      size="small"
                      sx={{ bgcolor: cat.color + '20', color: cat.color, fontWeight: 'bold' }}
                    />
                    <Chip label={pri.label} size="small" color={pri.color} variant="outlined" />
                    {task.patientName && (
                      <Chip label={task.patientName} size="small" variant="outlined" />
                    )}
                    {isOverdue && (
                      <Chip label="متأخرة" size="small" color="error" icon={<WarningIcon />} />
                    )}
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ alignSelf: 'center' }}
                    >
                      {new Date(task.dueDate).toLocaleDateString('ar')}
                    </Typography>
                  </Box>
                </Box>
                <Tooltip title="حذف">
                  <IconButton size="small" color="error" onClick={() => handleDelete(task.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TaskIcon color="primary" />
            <Typography variant="h6">مهمة جديدة</Typography>
          </Box>
          <IconButton onClick={() => setCreateOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="عنوان المهمة"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="الوصف"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>التصنيف</InputLabel>
                <Select
                  value={form.category}
                  label="التصنيف"
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => (
                    <MenuItem value={c.value} key={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الأولوية</InputLabel>
                <Select
                  value={form.priority}
                  label="الأولوية"
                  onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                >
                  {PRIORITIES.map(p => (
                    <MenuItem value={p.value} key={p.value}>
                      {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="تاريخ الاستحقاق"
                value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label="اسم المريض (اختياري)"
                value={form.patientName}
                onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.title}>
            إنشاء المهمة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistDailyTasks;
