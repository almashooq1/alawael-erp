/**
 * ✅ TaskManagerWidget — مدير المهام المتقدم
 * Professional task management with kanban-style view, priorities, and drag support
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, Chip, IconButton,
  TextField, Button, LinearProgress,
  useTheme, Divider, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { gradients, statusColors, brandColors } from 'theme/palette';

const PRIORITY_CONFIG = {
  urgent: { label: 'عاجل', color: statusColors.error, icon: '🔴' },
  high: { label: 'مرتفع', color: statusColors.warning, icon: '🟠' },
  medium: { label: 'متوسط', color: statusColors.info, icon: '🔵' },
  low: { label: 'منخفض', color: statusColors.success, icon: '🟢' },
};

const STATUS_CONFIG = {
  todo: { label: 'قيد الانتظار', color: 'rgba(0,0,0,0.4)', gradient: gradients.settings },
  inProgress: { label: 'جاري التنفيذ', color: brandColors.primaryStart, gradient: gradients.primary },
  review: { label: 'مراجعة', color: statusColors.warning, gradient: gradients.warning },
  done: { label: 'مكتمل', color: statusColors.success, gradient: gradients.success },
};

const INITIAL_TASKS = [
  { id: 1, title: 'مراجعة تقارير الأداء الشهرية', desc: 'مراجعة وتحليل تقارير أداء جميع الأقسام', priority: 'urgent', status: 'inProgress', assignee: 'أحمد', dueDate: '2026-03-20', progress: 60 },
  { id: 2, title: 'إعداد خطة التدريب Q2', desc: 'تحضير خطة التدريب للربع الثاني', priority: 'high', status: 'todo', assignee: 'فاطمة', dueDate: '2026-03-25', progress: 0 },
  { id: 3, title: 'تحديث سياسات الأمان', desc: 'مراجعة وتحديث سياسات الأمان السيبراني', priority: 'high', status: 'review', assignee: 'محمد', dueDate: '2026-03-18', progress: 85 },
  { id: 4, title: 'اجتماع مجلس الإدارة', desc: 'تحضير عرض تقديمي لاجتماع مجلس الإدارة', priority: 'urgent', status: 'todo', assignee: 'نورة', dueDate: '2026-03-19', progress: 0 },
  { id: 5, title: 'تحسين أداء قاعدة البيانات', desc: 'تحسين استعلامات وفهارس قاعدة البيانات', priority: 'medium', status: 'inProgress', assignee: 'خالد', dueDate: '2026-03-22', progress: 40 },
  { id: 6, title: 'ترقية النظام v3.5', desc: 'نشر التحديث الجديد للنظام', priority: 'medium', status: 'done', assignee: 'سارة', dueDate: '2026-03-15', progress: 100 },
  { id: 7, title: 'تقرير الميزانية السنوي', desc: 'إعداد تقرير الميزانية المقارن', priority: 'low', status: 'done', assignee: 'عبدالله', dueDate: '2026-03-14', progress: 100 },
  { id: 8, title: 'ورشة عمل فريق الدعم', desc: 'تنظيم ورشة عمل لتطوير مهارات فريق الدعم', priority: 'low', status: 'todo', assignee: 'ريم', dueDate: '2026-03-28', progress: 0 },
];

const getDaysRemaining = (dueDate) => {
  const diff = Math.ceil((new Date(dueDate) - new Date()) / (86400000));
  if (diff < 0) return { text: `متأخر ${Math.abs(diff)} يوم`, overdue: true };
  if (diff === 0) return { text: 'اليوم', overdue: false };
  if (diff === 1) return { text: 'غداً', overdue: false };
  return { text: `${diff} يوم متبقي`, overdue: false };
};

const TaskCard = ({ task, onToggle, onDelete }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const priority = PRIORITY_CONFIG[task.priority];
  const daysInfo = getDaysRemaining(task.dueDate);
  const isDone = task.status === 'done';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 1,
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          borderRight: `3px solid ${priority.color}`,
          bgcolor: isDone ? (isDark ? 'rgba(76,175,80,0.05)' : 'rgba(76,175,80,0.03)') : 'transparent',
          opacity: isDone ? 0.7 : 1,
          transition: 'all 0.2s',
          cursor: 'pointer',
          '&:hover': { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' },
        }}
      >
        {/* Header Row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <IconButton size="small" onClick={() => onToggle(task.id)} sx={{ mt: -0.3, p: 0.3 }}>
            {isDone ? (
              <CheckCircleIcon sx={{ fontSize: 18, color: statusColors.success }} />
            ) : (
              <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            )}
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                fontSize: '0.8rem',
                textDecoration: isDone ? 'line-through' : 'none',
                color: isDone ? 'text.disabled' : 'text.primary',
                lineHeight: 1.4,
              }}
            >
              {task.title}
            </Typography>
            {task.desc && (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block', mt: 0.3, lineHeight: 1.3 }}>
                {task.desc.length > 60 ? `${task.desc.substring(0, 60)}...` : task.desc}
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={() => onDelete(task.id)} sx={{ p: 0.3, opacity: 0.5, '&:hover': { opacity: 1 } }}>
            <DeleteOutlineIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>

        {/* Progress */}
        {task.progress > 0 && task.progress < 100 && (
          <Box sx={{ mt: 1, mx: 3.5 }}>
            <LinearProgress
              variant="determinate"
              value={task.progress}
              sx={{
                height: 3, borderRadius: 2,
                bgcolor: `${priority.color}15`,
                '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: priority.color },
              }}
            />
          </Box>
        )}

        {/* Footer */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, mx: 3.5 }}>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Chip
              size="small"
              label={priority.label}
              sx={{ height: 18, fontSize: '0.55rem', bgcolor: `${priority.color}15`, color: priority.color, fontWeight: 700 }}
            />
            <Chip
              size="small"
              icon={<PersonIcon sx={{ fontSize: '10px !important' }} />}
              label={task.assignee}
              sx={{ height: 18, fontSize: '0.55rem' }}
            />
          </Box>
          <Chip
            size="small"
            icon={<AccessTimeIcon sx={{ fontSize: '10px !important' }} />}
            label={daysInfo.text}
            sx={{
              height: 18, fontSize: '0.55rem',
              bgcolor: daysInfo.overdue ? `${statusColors.error}15` : 'transparent',
              color: daysInfo.overdue ? statusColors.error : 'text.secondary',
              fontWeight: daysInfo.overdue ? 700 : 500,
            }}
          />
        </Box>
      </Paper>
    </motion.div>
  );
};

const TaskManagerWidget = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', assignee: '' });

  const toggleTask = useCallback((id) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const newStatus = t.status === 'done' ? 'todo' : 'done';
      return { ...t, status: newStatus, progress: newStatus === 'done' ? 100 : 0 };
    }));
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const addTask = useCallback(() => {
    if (!newTask.title.trim()) return;
    const task = {
      id: Date.now(),
      title: newTask.title,
      desc: '',
      priority: newTask.priority,
      status: 'todo',
      assignee: newTask.assignee || 'غير محدد',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      progress: 0,
    };
    setTasks(prev => [task, ...prev]);
    setNewTask({ title: '', priority: 'medium', assignee: '' });
    setShowAddDialog(false);
  }, [newTask]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.title.includes(q) || t.desc?.includes(q) || t.assignee?.includes(q));
    }
    if (filterPriority !== 'all') {
      result = result.filter(t => t.priority === filterPriority);
    }
    return result;
  }, [tasks, searchQuery, filterPriority]);

  const stats = useMemo(() => ({
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'inProgress').length,
    overdue: tasks.filter(t => getDaysRemaining(t.dueDate).overdue && t.status !== 'done').length,
  }), [tasks]);

  // Group tasks by status
  const grouped = useMemo(() => {
    const result = {};
    Object.keys(STATUS_CONFIG).forEach(key => {
      result[key] = filteredTasks.filter(t => t.status === key);
    });
    return result;
  }, [filteredTasks]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              ✅ مدير المهام
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Chip size="small" label={`${stats.done}/${stats.total} مكتمل`} sx={{ height: 20, fontSize: '0.6rem', bgcolor: `${statusColors.success}15`, color: statusColors.success }} />
              <Chip size="small" label={`${stats.inProgress} جاري`} sx={{ height: 20, fontSize: '0.6rem', bgcolor: `${brandColors.primaryStart}15`, color: brandColors.primaryStart }} />
              {stats.overdue > 0 && (
                <Chip size="small" label={`${stats.overdue} متأخر`} sx={{ height: 20, fontSize: '0.6rem', bgcolor: `${statusColors.error}15`, color: statusColors.error }} />
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="بحث..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                sx: { borderRadius: 2, fontSize: '0.8rem', height: 32 },
              }}
              sx={{ width: 160 }}
            />
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowAddDialog(true)}
              sx={{
                borderRadius: 2, textTransform: 'none', fontSize: '0.75rem',
                background: gradients.primary, height: 32,
              }}
            >
              مهمة جديدة
            </Button>
          </Box>
        </Box>

        {/* Priority Filter */}
        <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 0.5 }}>
          <Chip
            size="small" label="الكل" variant={filterPriority === 'all' ? 'filled' : 'outlined'}
            onClick={() => setFilterPriority('all')}
            sx={{ height: 24, fontSize: '0.65rem' }}
          />
          {Object.entries(PRIORITY_CONFIG).map(([key, conf]) => (
            <Chip
              key={key} size="small" label={conf.label}
              variant={filterPriority === key ? 'filled' : 'outlined'}
              onClick={() => setFilterPriority(key)}
              sx={{
                height: 24, fontSize: '0.65rem',
                ...(filterPriority === key ? { bgcolor: conf.color, color: '#fff' } : {}),
              }}
            />
          ))}
        </Box>

        <Divider />

        {/* Kanban Columns */}
        <Box sx={{ p: 2 }}>
          <Grid container spacing={1.5}>
            {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
              <Grid item xs={12} sm={6} md={3} key={statusKey}>
                <Box sx={{
                  p: 1.5, borderRadius: 3,
                  bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                  minHeight: 200,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: config.color }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                        {config.label}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={grouped[statusKey]?.length || 0}
                      sx={{ height: 20, minWidth: 24, fontSize: '0.65rem', fontWeight: 700 }}
                    />
                  </Box>
                  <AnimatePresence>
                    {(grouped[statusKey] || []).map(task => (
                      <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                    ))}
                  </AnimatePresence>
                  {(!grouped[statusKey] || grouped[statusKey].length === 0) && (
                    <Box sx={{ textAlign: 'center', py: 3, opacity: 0.4 }}>
                      <Typography variant="caption">لا توجد مهام</Typography>
                    </Box>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Add Task Dialog */}
        <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700 }}>➕ إضافة مهمة جديدة</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth label="عنوان المهمة" size="small" sx={{ mt: 1, mb: 2 }}
              value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
            />
            <TextField
              fullWidth label="المسؤول" size="small" sx={{ mb: 2 }}
              value={newTask.assignee} onChange={e => setNewTask({ ...newTask, assignee: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {Object.entries(PRIORITY_CONFIG).map(([key, conf]) => (
                <Chip
                  key={key} label={`${conf.icon} ${conf.label}`} size="small"
                  variant={newTask.priority === key ? 'filled' : 'outlined'}
                  onClick={() => setNewTask({ ...newTask, priority: key })}
                  sx={{
                    fontSize: '0.75rem',
                    ...(newTask.priority === key ? { bgcolor: conf.color, color: '#fff' } : {}),
                  }}
                />
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddDialog(false)} size="small">إلغاء</Button>
            <Button onClick={addTask} variant="contained" size="small" sx={{ background: gradients.primary }}>إضافة</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </motion.div>
  );
};

export default TaskManagerWidget;
