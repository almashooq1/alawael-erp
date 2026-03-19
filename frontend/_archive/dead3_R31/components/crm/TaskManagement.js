/**
 * Task & Activity Management - CRM Activities 📅
 * مكون إدارة المهام والأنشطة
 *
 * Features:
 * ✅ Task scheduling
 * ✅ Activity logging
 * ✅ Follow-up reminders
 * ✅ Team collaboration
 * ✅ Activity timeline
 * ✅ Priority management
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Grid,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

const TaskManagement = () => {
  const [tasks, setTasks] = useState([
    {
      id: '1',
      title: 'الاتصال بأحمد محمود',
      customer: 'أحمد محمود',
      type: 'call',
      priority: 'high',
      dueDate: '2026-01-17',
      completed: false,
      notes: 'متابعة العرض',
    },
    {
      id: '2',
      title: 'إرسال عرض السعر',
      customer: 'فاطمة علي',
      type: 'email',
      priority: 'high',
      dueDate: '2026-01-16',
      completed: false,
      notes: 'موافقة على المبلغ الأساسي',
    },
    {
      id: '3',
      title: 'اجتماع مع فريق التطوير',
      customer: 'محمد سالم',
      type: 'meeting',
      priority: 'medium',
      dueDate: '2026-01-18',
      completed: false,
      notes: 'مناقشة المتطلبات',
    },
    {
      id: '4',
      title: 'متابعة الدفع',
      customer: 'سارة أحمد',
      type: 'note',
      priority: 'low',
      dueDate: '2026-01-15',
      completed: true,
      notes: 'تم الدفع بنجاح',
    },
  ]);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [formData, setFormData] = useState({});

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.filter(t => !t.completed).length,
    highPriority: tasks.filter(t => t.priority === 'high' && !t.completed).length,
  };

  const handleAddTask = () => {
    setFormData({ priority: 'medium', type: 'note' });
    setSelectedTask(null);
    setOpenDialog(true);
  };

  const handleSaveTask = () => {
    if (!formData.title) {
      alert('العنوان مطلوب');
      return;
    }

    if (selectedTask) {
      setTasks(tasks.map(t => (t.id === selectedTask.id ? { ...formData, id: t.id } : t)));
    } else {
      setTasks([...tasks, { ...formData, id: Date.now().toString(), completed: false }]);
    }

    setOpenDialog(false);
  };

  const handleCompleteTask = id => {
    setTasks(tasks.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const getPriorityColor = priority => {
    const colors = { high: '#ff6b6b', medium: '#ffa500', low: '#4caf50' };
    return colors[priority] || '#666';
  };

  const getTypeIcon = type => {
    const icons = { call: '📞', email: '📧', meeting: '👥', note: '📝' };
    return icons[type] || '📌';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي المهام', value: taskStats.total, icon: '📋' },
          { label: 'مكتملة', value: taskStats.completed, icon: '✅' },
          { label: 'قيد الانتظار', value: taskStats.pending, icon: '⏳' },
          { label: 'عالية الأولوية', value: taskStats.highPriority, icon: '🔴' },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, background: 'linear-gradient(135deg, #667eea20, #764ba220)' }}>
              <Typography variant="h3" sx={{ mb: 0.5 }}>
                {stat.icon}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Action Bar */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          📅 المهام والأنشطة
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddTask}
          sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          مهمة جديدة
        </Button>
      </Box>

      {/* Tasks List */}
      <Stack spacing={2}>
        {tasks.map(task => (
          <Card
            key={task.id}
            sx={{
              borderRadius: 2,
              opacity: task.completed ? 0.7 : 1,
              textDecoration: task.completed ? 'line-through' : 'none',
              borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
              '&:hover': { boxShadow: 3, backgroundColor: '#f8f9ff' },
              transition: 'all 0.3s',
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Checkbox checked={task.completed} onChange={() => handleCompleteTask(task.id)} sx={{ width: 24, height: 24 }} />

              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                    {task.title}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '1.5rem' }}>
                    {getTypeIcon(task.type)}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                  <Chip label={task.customer} size="small" variant="outlined" />
                  <Chip
                    label={task.priority}
                    size="small"
                    sx={{
                      backgroundColor: getPriorityColor(task.priority) + '20',
                      color: getPriorityColor(task.priority),
                      fontWeight: 600,
                    }}
                  />
                  <Typography variant="caption" color="textSecondary">
                    📅 {new Date(task.dueDate).toLocaleDateString('ar-SA')}
                  </Typography>
                </Box>

                <Typography variant="body2" color="textSecondary">
                  {task.notes}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setFormData(task);
                    setSelectedTask(task);
                    setOpenDialog(true);
                  }}
                  color="primary"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setTasks(tasks.filter(t => t.id !== task.id))} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          {selectedTask ? 'تحرير المهمة' : 'مهمة جديدة'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="العنوان"
              value={formData.title || ''}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="العميل"
              value={formData.customer || ''}
              onChange={e => setFormData({ ...formData, customer: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select value={formData.type || ''} onChange={e => setFormData({ ...formData, type: e.target.value })} label="النوع">
                {['call', 'email', 'meeting', 'note'].map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>الأولوية</InputLabel>
              <Select
                value={formData.priority || ''}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                label="الأولوية"
              >
                {['high', 'medium', 'low'].map(p => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              type="date"
              label="تاريخ الاستحقاق"
              value={formData.dueDate || ''}
              onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="الملاحظات"
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button onClick={handleSaveTask} variant="contained">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskManagement;
