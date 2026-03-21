/**
 * ProjectProPage — إدارة المشاريع الاحترافية
 *
 * Projects + Kanban task board + milestones + time tracking + team
 */
import { useState, useEffect, useCallback } from 'react';
import {
  alpha,
} from '@mui/material';

import { useSnackbar } from '../../contexts/SnackbarContext';
import enterpriseProService from '../../services/enterprisePro.service';
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import TaskIcon from '@mui/icons-material/Task';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';

const STATUS_COLUMNS = [
  { key: 'backlog', label: 'قائمة الانتظار', color: '#9E9E9E' },
  { key: 'todo', label: 'للتنفيذ', color: '#42A5F5' },
  { key: 'in_progress', label: 'قيد التنفيذ', color: '#FFA726' },
  { key: 'in_review', label: 'مراجعة', color: '#AB47BC' },
  { key: 'done', label: 'منجز', color: '#66BB6A' },
  { key: 'blocked', label: 'معلق', color: '#EF5350' },
];

const PRIORITY_MAP = {
  low: { label: 'منخفض', color: '#66BB6A' },
  medium: { label: 'متوسط', color: '#FFA726' },
  high: { label: 'عالي', color: '#EF5350' },
  critical: { label: 'حرج', color: '#B71C1C' },
};
const PROJECT_STATUSES = {
  planning: 'تخطيط',
  active: 'نشط',
  on_hold: 'متوقف',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

const emptyProject = {
  name: '',
  nameAr: '',
  description: '',
  status: 'planning',
  priority: 'medium',
  startDate: '',
  endDate: '',
  budget: { planned: '', currency: 'SAR' },
  tags: [],
};
const emptyTask = {
  title: '',
  titleAr: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  assignee: '',
  estimatedHours: '',
  dueDate: '',
  tags: [],
};

export default function ProjectProPage() {
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [kanbanData, setKanbanData] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [myTasks, setMyTasks] = useState([]);

  const [dlgType, setDlgType] = useState(null);
  const [editId, setEditId] = useState(null);
  const [projForm, setProjForm] = useState({ ...emptyProject });
  const [taskForm, setTaskForm] = useState({ ...emptyTask });

  // Time log state
  const [timeEntry, setTimeEntry] = useState({
    task: '',
    hours: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await enterpriseProService.getProjects();
      const list = res.data.projects || res.data || [];
      setProjects(list);
      if (list.length > 0 && !selectedProject) setSelectedProject(list[0]._id);
    } catch {
      showSnackbar('خطأ في تحميل المشاريع', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar, selectedProject]);

  const fetchKanban = useCallback(async () => {
    if (!selectedProject) return;
    try {
      setLoading(true);
      const res = await enterpriseProService.getKanbanBoard(selectedProject);
      setKanbanData(res.data);
    } catch {
      showSnackbar('خطأ', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedProject, showSnackbar]);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await enterpriseProService.getProjectDashboard();
      setDashboard(res.data);
    } catch {
      /* silent */
    }
  }, []);

  const fetchMyTasks = useCallback(async () => {
    try {
      const res = await enterpriseProService.getMyProjectTasks();
      setMyTasks(res.data || []);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);
  useEffect(() => {
    if (tab === 1) fetchKanban();
  }, [tab, fetchKanban]);
  useEffect(() => {
    if (tab === 3) fetchDashboard();
  }, [tab, fetchDashboard]);
  useEffect(() => {
    if (tab === 2) fetchMyTasks();
  }, [tab, fetchMyTasks]);

  const openProjectDlg = p => {
    if (p) {
      setEditId(p._id);
      setProjForm({
        name: p.name || '',
        nameAr: p.nameAr || '',
        description: p.description || '',
        status: p.status || 'planning',
        priority: p.priority || 'medium',
        startDate: p.startDate?.slice(0, 10) || '',
        endDate: p.endDate?.slice(0, 10) || '',
        budget: p.budget || { planned: '', currency: 'SAR' },
        tags: p.tags || [],
      });
    } else {
      setEditId(null);
      setProjForm({ ...emptyProject });
    }
    setDlgType('project');
  };

  const openTaskDlg = t => {
    if (t) {
      setEditId(t._id);
      setTaskForm({
        title: t.title || '',
        titleAr: t.titleAr || '',
        description: t.description || '',
        status: t.status || 'todo',
        priority: t.priority || 'medium',
        assignee: t.assignee?._id || t.assignee || '',
        estimatedHours: t.estimatedHours || '',
        dueDate: t.dueDate?.slice(0, 10) || '',
        tags: t.tags || [],
      });
    } else {
      setEditId(null);
      setTaskForm({ ...emptyTask });
    }
    setDlgType('task');
  };

  const closeDlg = () => {
    setDlgType(null);
    setEditId(null);
  };

  const saveProject = async () => {
    try {
      if (!projForm.name) {
        showSnackbar('الاسم مطلوب', 'warning');
        return;
      }
      if (editId) await enterpriseProService.updateProject(editId, projForm);
      else await enterpriseProService.createProject(projForm);
      showSnackbar(editId ? 'تم التحديث' : 'تم الإنشاء', 'success');
      closeDlg();
      fetchProjects();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const deleteProject = async id => {
    try {
      await enterpriseProService.deleteProject(id);
      showSnackbar('تم الحذف', 'success');
      fetchProjects();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const cloneProject = async id => {
    try {
      await enterpriseProService.cloneProject(id);
      showSnackbar('تم النسخ', 'success');
      fetchProjects();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const saveTask = async () => {
    try {
      if (!taskForm.title) {
        showSnackbar('العنوان مطلوب', 'warning');
        return;
      }
      const payload = { ...taskForm, project: selectedProject };
      if (editId) await enterpriseProService.updateProjectTask(editId, payload);
      else await enterpriseProService.createProjectTask(payload);
      showSnackbar(editId ? 'تم التحديث' : 'تمت الإضافة', 'success');
      closeDlg();
      fetchKanban();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const moveTask = async (taskId, newStatus) => {
    try {
      await enterpriseProService.updateProjectTask(taskId, { status: newStatus });
      fetchKanban();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const logTime = async () => {
    try {
      if (!timeEntry.task || !timeEntry.hours) {
        showSnackbar('المهمة والساعات مطلوبة', 'warning');
        return;
      }
      await enterpriseProService.createProjectTimelog(timeEntry);
      showSnackbar('تم تسجيل الوقت', 'success');
      setTimeEntry({
        task: '',
        hours: '',
        description: '',
        date: new Date().toISOString().slice(0, 10),
      });
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ProjectIcon sx={{ fontSize: 36, color: '#1565C0' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              إدارة المشاريع الاحترافية
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Project Management Pro — Kanban & Tracking
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => openProjectDlg()}>
            مشروع جديد
          </Button>
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchProjects}>
            تحديث
          </Button>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="المشاريع" icon={<ProjectIcon />} iconPosition="start" />
        <Tab label="لوحة كانبان" icon={<KanbanIcon />} iconPosition="start" />
        <Tab label="مهامي" icon={<TaskIcon />} iconPosition="start" />
        <Tab label="لوحة المعلومات" icon={<DashIcon />} iconPosition="start" />
      </Tabs>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ── Tab 0: Projects List ── */}
      {tab === 0 && (
        <Grid container spacing={2}>
          {projects.map(p => {
            const pInfo = PRIORITY_MAP[p.priority];
            return (
              <Grid item xs={12} md={6} lg={4} key={p._id}>
                <Card
                  sx={{
                    '&:hover': { boxShadow: 5 },
                    transition: 'box-shadow 0.3s',
                    borderTop: `3px solid ${pInfo?.color || '#1565C0'}`,
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Box>
                        <Typography variant="h6" fontWeight={600}>
                          {p.nameAr || p.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.code}
                        </Typography>
                      </Box>
                      <Chip
                        label={PROJECT_STATUSES[p.status] || p.status}
                        size="small"
                        color={
                          p.status === 'active'
                            ? 'success'
                            : p.status === 'completed'
                              ? 'primary'
                              : 'default'
                        }
                      />
                    </Box>
                    {p.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} noWrap>
                        {p.description}
                      </Typography>
                    )}
                    <Divider sx={{ my: 1.5 }} />
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          البداية
                        </Typography>
                        <Typography variant="body2">
                          {p.startDate ? new Date(p.startDate).toLocaleDateString('ar-SA') : '—'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          النهاية
                        </Typography>
                        <Typography variant="body2">
                          {p.endDate ? new Date(p.endDate).toLocaleDateString('ar-SA') : '—'}
                        </Typography>
                      </Grid>
                    </Grid>
                    {p.budget?.planned && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        الميزانية: {Number(p.budget.planned).toLocaleString()}{' '}
                        {p.budget.currency || 'SAR'}
                      </Typography>
                    )}
                    {p.milestones?.length > 0 && (
                      <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                        <MilestoneIcon sx={{ fontSize: 16, color: '#999' }} />
                        <Typography variant="caption" color="text.secondary">
                          {p.milestones.length} مرحلة
                        </Typography>
                      </Box>
                    )}
                    {p.team?.length > 0 && (
                      <AvatarGroup max={4} sx={{ mt: 1, justifyContent: 'flex-start' }}>
                        {p.team.map((m, i) => (
                          <Tooltip key={i} title={m.name || ''}>
                            <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem' }}>
                              {(m.name || '?').charAt(0)}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </AvatarGroup>
                    )}
                    <Box sx={{ mt: 2, display: 'flex', gap: 0.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setSelectedProject(p._id);
                          setTab(1);
                        }}
                      >
                        كانبان
                      </Button>
                      <IconButton size="small" onClick={() => openProjectDlg(p)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => cloneProject(p._id)}>
                        <CloneIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => deleteProject(p._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
          {projects.length === 0 && !loading && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">لا توجد مشاريع — أنشئ أول مشروع</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* ── Tab 1: Kanban Board ── */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <Select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">اختر مشروع...</MenuItem>
                {projects.map(p => (
                  <MenuItem key={p._id} value={p._id}>
                    {p.nameAr || p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              size="small"
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => openTaskDlg()}
            >
              مهمة جديدة
            </Button>
          </Box>
          {kanbanData && kanbanData.columns ? (
            <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 2 }}>
              {STATUS_COLUMNS.map(col => {
                const colData = kanbanData.columns.find(c => c.status === col.key);
                const tasks = colData?.tasks || [];
                return (
                  <Paper
                    key={col.key}
                    sx={{
                      minWidth: 240,
                      maxWidth: 280,
                      flexShrink: 0,
                      p: 1.5,
                      borderTop: `3px solid ${col.color}`,
                      bgcolor: alpha(col.color, 0.02),
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1.5,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>
                        {col.label}
                      </Typography>
                      <Chip
                        label={tasks.length}
                        size="small"
                        sx={{ bgcolor: alpha(col.color, 0.15), color: col.color, fontWeight: 700 }}
                      />
                    </Box>
                    <Box
                      sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: 100 }}
                    >
                      {tasks.map(task => {
                        const pI = PRIORITY_MAP[task.priority];
                        return (
                          <Card
                            key={task._id}
                            sx={{
                              cursor: 'pointer',
                              '&:hover': { boxShadow: 3 },
                              borderLeft: `3px solid ${pI?.color || '#999'}`,
                            }}
                            onClick={() => openTaskDlg(task)}
                          >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Typography variant="body2" fontWeight={600}>
                                {task.titleAr || task.title}
                              </Typography>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  mt: 0.5,
                                }}
                              >
                                <Chip
                                  label={pI?.label}
                                  size="small"
                                  sx={{
                                    bgcolor: alpha(pI?.color || '#999', 0.1),
                                    fontSize: '0.65rem',
                                    height: 20,
                                  }}
                                />
                                {task.assignee && (
                                  <Tooltip title={task.assignee.name || ''}>
                                    <Avatar sx={{ width: 22, height: 22, fontSize: '0.6rem' }}>
                                      {(task.assignee.name || '?').charAt(0)}
                                    </Avatar>
                                  </Tooltip>
                                )}
                              </Box>
                              {task.dueDate && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ mt: 0.5, display: 'block' }}
                                >
                                  {new Date(task.dueDate).toLocaleDateString('ar-SA')}
                                </Typography>
                              )}
                              {/* Quick status move */}
                              <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {STATUS_COLUMNS.filter(s => s.key !== col.key)
                                  .slice(0, 3)
                                  .map(sc => (
                                    <Chip
                                      key={sc.key}
                                      label={sc.label}
                                      size="small"
                                      variant="outlined"
                                      sx={{
                                        fontSize: '0.6rem',
                                        height: 18,
                                        cursor: 'pointer',
                                        borderColor: sc.color,
                                      }}
                                      onClick={e => {
                                        e.stopPropagation();
                                        moveTask(task._id, sc.key);
                                      }}
                                    />
                                  ))}
                              </Box>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">اختر مشروعاً لعرض لوحة كانبان</Typography>
            </Paper>
          )}

          {/* Time Log Quick Entry */}
          <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
              <TimeIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              تسجيل وقت سريع
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
              <TextField
                size="small"
                label="معرف المهمة"
                value={timeEntry.task}
                onChange={e => setTimeEntry(f => ({ ...f, task: e.target.value }))}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="الساعات"
                type="number"
                value={timeEntry.hours}
                onChange={e => setTimeEntry(f => ({ ...f, hours: e.target.value }))}
                sx={{ width: 100 }}
              />
              <TextField
                size="small"
                label="الوصف"
                value={timeEntry.description}
                onChange={e => setTimeEntry(f => ({ ...f, description: e.target.value }))}
                sx={{ flex: 2 }}
              />
              <TextField
                size="small"
                type="date"
                value={timeEntry.date}
                onChange={e => setTimeEntry(f => ({ ...f, date: e.target.value }))}
                sx={{ width: 150 }}
              />
              <Button variant="contained" size="small" onClick={logTime}>
                تسجيل
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* ── Tab 2: My Tasks ── */}
      {tab === 2 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            مهامي
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#1565C0', 0.05) }}>
                  <TableCell>المهمة</TableCell>
                  <TableCell>المشروع</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>الأولوية</TableCell>
                  <TableCell>تاريخ التسليم</TableCell>
                  <TableCell>الساعات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {myTasks.map(t => {
                  const colInfo = STATUS_COLUMNS.find(c => c.key === t.status);
                  const pI = PRIORITY_MAP[t.priority];
                  return (
                    <TableRow key={t._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {t.titleAr || t.title}
                        </Typography>
                      </TableCell>
                      <TableCell>{t.project?.nameAr || t.project?.name || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={colInfo?.label || t.status}
                          size="small"
                          sx={{
                            bgcolor: alpha(colInfo?.color || '#999', 0.15),
                            color: colInfo?.color,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={pI?.label}
                          size="small"
                          sx={{ bgcolor: alpha(pI?.color || '#999', 0.1) }}
                        />
                      </TableCell>
                      <TableCell>
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString('ar-SA') : '—'}
                      </TableCell>
                      <TableCell>
                        {t.actualHours || 0}/{t.estimatedHours || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {myTasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      لا توجد مهام مسندة إليك
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ── Tab 3: Dashboard ── */}
      {tab === 3 && dashboard && (
        <Grid container spacing={2}>
          {[
            { label: 'إجمالي المشاريع', value: dashboard.projectCount, color: '#1565C0' },
            { label: 'المشاريع النشطة', value: dashboard.activeProjects, color: '#2E7D32' },
            { label: 'إجمالي المهام', value: dashboard.totalTasks, color: '#6A1B9A' },
            { label: 'المهام المنجزة', value: dashboard.completedTasks, color: '#00695C' },
          ].map((s, i) => (
            <Grid item xs={3} key={i}>
              <Card
                sx={{ background: `linear-gradient(135deg, ${alpha(s.color, 0.12)}, transparent)` }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color={s.color}>
                    {s.value || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {dashboard.byStatus && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  المهام حسب الحالة
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {STATUS_COLUMNS.map(col => {
                    const count = dashboard.byStatus?.find(b => b._id === col.key)?.count || 0;
                    return (
                      <Card key={col.key} sx={{ minWidth: 120, textAlign: 'center' }}>
                        <CardContent sx={{ py: 1, px: 2 }}>
                          <Typography variant="h5" fontWeight={700} color={col.color}>
                            {count}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {col.label}
                          </Typography>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* ── Project Dialog ── */}
      <Dialog open={dlgType === 'project'} onClose={closeDlg} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'تعديل المشروع' : 'مشروع جديد'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم (EN)"
                value={projForm.name}
                onChange={e => setProjForm(f => ({ ...f, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم (عربي)"
                value={projForm.nameAr}
                onChange={e => setProjForm(f => ({ ...f, nameAr: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الوصف"
                value={projForm.description}
                onChange={e => setProjForm(f => ({ ...f, description: e.target.value }))}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <Select
                  value={projForm.status}
                  onChange={e => setProjForm(f => ({ ...f, status: e.target.value }))}
                >
                  {Object.entries(PROJECT_STATUSES).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <Select
                  value={projForm.priority}
                  onChange={e => setProjForm(f => ({ ...f, priority: e.target.value }))}
                >
                  {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="البداية"
                value={projForm.startDate}
                onChange={e => setProjForm(f => ({ ...f, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="النهاية"
                value={projForm.endDate}
                onChange={e => setProjForm(f => ({ ...f, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الميزانية المخططة"
                type="number"
                value={projForm.budget.planned}
                onChange={e =>
                  setProjForm(f => ({ ...f, budget: { ...f.budget, planned: e.target.value } }))
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDlg}>إلغاء</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={saveProject}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Task Dialog ── */}
      <Dialog open={dlgType === 'task'} onClose={closeDlg} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'تعديل المهمة' : 'مهمة جديدة'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="العنوان (EN)"
                value={taskForm.title}
                onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="العنوان (عربي)"
                value={taskForm.titleAr}
                onChange={e => setTaskForm(f => ({ ...f, titleAr: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الوصف"
                value={taskForm.description}
                onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <Select
                  value={taskForm.status}
                  onChange={e => setTaskForm(f => ({ ...f, status: e.target.value }))}
                >
                  {STATUS_COLUMNS.map(c => (
                    <MenuItem key={c.key} value={c.key}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <Select
                  value={taskForm.priority}
                  onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}
                >
                  {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الساعات المقدرة"
                type="number"
                value={taskForm.estimatedHours}
                onChange={e => setTaskForm(f => ({ ...f, estimatedHours: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ التسليم"
                value={taskForm.dueDate}
                onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDlg}>إلغاء</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={saveTask}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
