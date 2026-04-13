/**
 * Workflow Management Page — صفحة إدارة سير العمل
 *
 * عرض وإدارة مهام سير العمل (12-phase state machine)
 * مع Kanban board و task list
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Chip, Grid, Avatar,
  Button, IconButton, TextField, InputAdornment, Select,
  FormControl, InputLabel, MenuItem, Stack, LinearProgress,
  Alert, Tooltip, Tab, Tabs, Badge, Paper, Divider,
  List, ListItem, ListItemText, ListItemAvatar, ListItemSecondaryAction,
} from '@mui/material';
import {
  Search as SearchIcon, Refresh as RefreshIcon,
  AccountTree as WorkflowIcon, PlayArrow as PlayIcon,
  CheckCircle as DoneIcon, Warning as WarningIcon,
  Schedule as PendingIcon, Person as PersonIcon,
  ArrowForward as ArrowIcon, Flag as FlagIcon,
  Assessment as AssessmentIcon, Notifications as NotifIcon,
} from '@mui/icons-material';

import { workflowAPI } from '../../services/ddd';

/* ── Priority config ── */
const PRIORITY = {
  critical: { label: 'حرج', color: '#d32f2f', weight: 4 },
  high: { label: 'عالي', color: '#f44336', weight: 3 },
  medium: { label: 'متوسط', color: '#ff9800', weight: 2 },
  low: { label: 'منخفض', color: '#4caf50', weight: 1 },
};

/* ── Task status columns for Kanban ── */
const COLUMNS = [
  { key: 'pending', label: 'قيد الانتظار', color: '#9e9e9e', icon: <PendingIcon /> },
  { key: 'in_progress', label: 'قيد التنفيذ', color: '#2196f3', icon: <PlayIcon /> },
  { key: 'review', label: 'قيد المراجعة', color: '#ff9800', icon: <AssessmentIcon /> },
  { key: 'completed', label: 'مكتمل', color: '#4caf50', icon: <DoneIcon /> },
  { key: 'blocked', label: 'معلق', color: '#f44336', icon: <WarningIcon /> },
];

export default function WorkflowPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState(0); // 0: kanban, 1: list
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: 200,
        ...(search && { search }),
        ...(priorityFilter && { priority: priorityFilter }),
      };
      const res = await workflowAPI.list(params);
      const data = res?.data;
      if (data?.data) setTasks(data.data);
      else if (Array.isArray(data)) setTasks(data);
      else setTasks([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, priorityFilter]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  /* ── Grouped by status ── */
  const columns = COLUMNS.map(col => ({
    ...col,
    tasks: tasks.filter(t => t.status === col.key)
      .sort((a, b) => (PRIORITY[b.priority]?.weight || 0) - (PRIORITY[a.priority]?.weight || 0)),
  }));

  /* ── Stats ── */
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed');
  const totalCompleted = tasks.filter(t => t.status === 'completed').length;
  const completionRate = tasks.length > 0 ? Math.round((totalCompleted / tasks.length) * 100) : 0;

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            <WorkflowIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> سير العمل
          </Typography>
          <Typography variant="body2" color="text.secondary">{tasks.length} مهمة</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {overdue.length > 0 && (
            <Chip
              icon={<WarningIcon />}
              label={`${overdue.length} متأخرة`}
              color="error"
              variant="outlined"
            />
          )}
          <IconButton onClick={loadTasks}><RefreshIcon /></IconButton>
        </Stack>
      </Box>

      {/* ── Summary Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h4" fontWeight="bold" color="primary">{tasks.length}</Typography>
              <Typography variant="caption" color="text.secondary">إجمالي المهام</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h4" fontWeight="bold" color="success.main">{completionRate}%</Typography>
              <Typography variant="caption" color="text.secondary">نسبة الإنجاز</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {tasks.filter(t => t.status === 'in_progress').length}
              </Typography>
              <Typography variant="caption" color="text.secondary">قيد التنفيذ</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h4" fontWeight="bold" color="error.main">{overdue.length}</Typography>
              <Typography variant="caption" color="text.secondary">متأخرة</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Filters ── */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ px: 2 }}>
            <Tab icon={<WorkflowIcon />} iconPosition="start" label="لوحة كانبان" />
            <Tab icon={<FlagIcon />} iconPosition="start" label="قائمة المهام" />
          </Tabs>
        </Box>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth size="small" placeholder="بحث في المهام..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>الأولوية</InputLabel>
                <Select value={priorityFilter} label="الأولوية" onChange={(e) => setPriorityFilter(e.target.value)}>
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(PRIORITY).map(([val, { label }]) => (
                    <MenuItem key={val} value={val}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ── Kanban View ── */}
      {view === 0 && (
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
          {columns.map(col => (
            <Paper
              key={col.key}
              variant="outlined"
              sx={{ minWidth: 280, maxWidth: 320, flex: '0 0 auto', bgcolor: 'grey.50' }}
            >
              {/* Column header */}
              <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderBottom: `3px solid ${col.color}` }}>
                <Avatar sx={{ bgcolor: col.color, width: 28, height: 28 }}>{col.icon}</Avatar>
                <Typography variant="subtitle2" fontWeight="bold">{col.label}</Typography>
                <Badge badgeContent={col.tasks.length} color="primary" sx={{ ml: 'auto' }}><Box /></Badge>
              </Box>

              {/* Tasks */}
              <Box sx={{ p: 1, maxHeight: 500, overflowY: 'auto' }}>
                {col.tasks.length === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 3 }}>
                    لا توجد مهام
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {col.tasks.map((task, i) => {
                      const pri = PRIORITY[task.priority] || PRIORITY.medium;
                      const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
                      return (
                        <Card
                          key={task._id || i}
                          variant="outlined"
                          sx={{
                            cursor: 'pointer',
                            borderRight: `3px solid ${pri.color}`,
                            '&:hover': { boxShadow: 2 },
                            bgcolor: isOverdue ? '#fff3e0' : 'background.paper',
                          }}
                          onClick={() => navigate(`/beneficiaries/${task.beneficiaryId}`)}
                        >
                          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                            <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                              {task.title || task.taskType || 'مهمة'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {task.description || task.notes || ''}
                            </Typography>
                            <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                              <Chip size="small" label={pri.label} sx={{ bgcolor: pri.color, color: '#fff', height: 20, fontSize: 10 }} />
                              {task.assignedTo?.name && (
                                <Chip size="small" variant="outlined" icon={<PersonIcon sx={{ fontSize: 12 }} />} label={task.assignedTo.name} sx={{ height: 20, fontSize: 10 }} />
                              )}
                              {isOverdue && (
                                <Chip size="small" icon={<WarningIcon sx={{ fontSize: 12 }} />} label="متأخر" color="error" sx={{ height: 20, fontSize: 10 }} />
                              )}
                              {task.dueDate && (
                                <Typography variant="caption" color={isOverdue ? 'error' : 'text.secondary'}>
                                  {new Date(task.dueDate).toLocaleDateString('ar-SA')}
                                </Typography>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* ── List View ── */}
      {view === 1 && (
        <Paper variant="outlined">
          <List>
            {tasks.length === 0 && !loading ? (
              <ListItem><ListItemText primary="لا توجد مهام" /></ListItem>
            ) : (
              tasks.map((task, i) => {
                const pri = PRIORITY[task.priority] || PRIORITY.medium;
                const st = COLUMNS.find(c => c.key === task.status) || COLUMNS[0];
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
                return (
                  <React.Fragment key={task._id || i}>
                    <ListItem
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isOverdue ? '#fff3e0' : undefined,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => navigate(`/beneficiaries/${task.beneficiaryId}`)}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: st.color, width: 36, height: 36 }}>{st.icon}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight="bold">{task.title || task.taskType || 'مهمة'}</Typography>
                            <Chip size="small" label={pri.label} sx={{ bgcolor: pri.color, color: '#fff', height: 18, fontSize: 10 }} />
                            <Chip size="small" label={st.label} variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                            {isOverdue && <Chip size="small" label="متأخر" color="error" sx={{ height: 18, fontSize: 10 }} />}
                          </Box>
                        }
                        secondary={
                          <>
                            {task.description || ''}
                            {task.assignedTo?.name && ` • ${task.assignedTo.name}`}
                            {task.dueDate && ` • ${new Date(task.dueDate).toLocaleDateString('ar-SA')}`}
                          </>
                        }
                      />
                    </ListItem>
                    {i < tasks.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })
            )}
          </List>
        </Paper>
      )}
    </Box>
  );
}
