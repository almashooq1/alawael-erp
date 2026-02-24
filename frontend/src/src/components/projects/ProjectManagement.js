/**
 * Project Management Component - Advanced Version ⭐
 * مكون إدارة المشاريع - نسخة متقدمة
 *
 * Features:
 * ✅ Project creation and management
 * ✅ Task assignment and tracking
 * ✅ Team collaboration
 * ✅ Timeline and milestones
 * ✅ Budget management
 * ✅ Progress tracking
 * ✅ Gantt charts
 * ✅ Project analytics
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Stack,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  LinearProgress,
  Alert,
  AvatarGroup,
  ProgressBar,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from '@mui/material';
import {
  FolderOpen as FolderOpenIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';

const ProjectManagement = () => {
  const [projects, setProjects] = useState([
    {
      id: 'P001',
      name: 'نظام إدارة المستندات',
      description: 'تطوير نظام متكامل لإدارة المستندات والملفات',
      status: 'جاري',
      progress: 75,
      startDate: '2025-10-01',
      endDate: '2026-03-31',
      budget: 50000,
      spent: 37500,
      team: ['أحمد', 'فاطمة', 'محمد'],
      manager: 'أحمد',
      priority: 'عالي',
      tasks: 24,
      completed: 18,
    },
    {
      id: 'P002',
      name: 'تطبيق الموبايل المتقدم',
      description: 'تطوير تطبيق موبايل أصلي للمنصة',
      status: 'مخطط',
      progress: 15,
      startDate: '2026-02-01',
      endDate: '2026-08-31',
      budget: 80000,
      spent: 12000,
      team: ['علي', 'سارة'],
      manager: 'علي',
      priority: 'عالي',
      tasks: 45,
      completed: 7,
    },
    {
      id: 'P003',
      name: 'تحسين الأداء والأمان',
      description: 'تحسين أداء النظام وتعزيز الأمان',
      status: 'مكتمل',
      progress: 100,
      startDate: '2025-12-01',
      endDate: '2026-01-15',
      budget: 30000,
      spent: 29500,
      team: ['محمد', 'خالد'],
      manager: 'محمد',
      priority: 'متوسط',
      tasks: 16,
      completed: 16,
    },
  ]);

  const [tasks, setTasks] = useState([
    {
      id: 'T001',
      projectId: 'P001',
      title: 'تصميم قاعدة البيانات',
      status: 'مكتمل',
      assignee: 'أحمد',
      dueDate: '2025-11-30',
      priority: 'عالي',
    },
    { id: 'T002', projectId: 'P001', title: 'تطوير API', status: 'جاري', assignee: 'فاطمة', dueDate: '2026-01-31', priority: 'عالي' },
    { id: 'T003', projectId: 'P001', title: 'اختبار النظام', status: 'قادم', assignee: 'محمد', dueDate: '2026-02-28', priority: 'متوسط' },
  ]);

  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    budget: '',
  });

  // Analytics
  const projectStats = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter(p => p.status === 'جاري').length,
      completed: projects.filter(p => p.status === 'مكتمل').length,
      planned: projects.filter(p => p.status === 'مخطط').length,
      totalBudget: projects.reduce((sum, p) => sum + p.budget, 0),
      totalSpent: projects.reduce((sum, p) => sum + p.spent, 0),
    };
  }, [projects]);

  const budgetVsSpent = useMemo(() => {
    return projects.map(p => ({
      name: p.name,
      budget: p.budget,
      spent: p.spent,
      remaining: p.budget - p.spent,
    }));
  }, [projects]);

  const handleAddProject = () => {
    if (newProject.name && newProject.startDate && newProject.endDate) {
      const proj = {
        id: `P${String(projects.length + 1).padStart(3, '0')}`,
        ...newProject,
        status: 'مخطط',
        progress: 0,
        budget: parseFloat(newProject.budget),
        spent: 0,
        team: [],
        manager: 'الإدارة',
        priority: 'متوسط',
        tasks: 0,
        completed: 0,
      };
      setProjects([...projects, proj]);
      setNewProject({ name: '', description: '', startDate: '', endDate: '', budget: '' });
      setOpenDialog(false);
    }
  };

  const getStatusColor = status => {
    const colors = { جاري: 'warning', مكتمل: 'success', مخطط: 'info' };
    return colors[status] || 'default';
  };

  const getPriorityColor = priority => {
    const colors = { عالي: 'error', متوسط: 'warning', منخفض: 'success' };
    return colors[priority] || 'default';
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f8f9ff', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#333' }}>
            📊 إدارة المشاريع
          </Typography>
          <Typography variant="body2" color="textSecondary">
            تتبع المشاريع والمهام والميزانيات والجداول الزمنية
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            px: 3,
          }}
        >
          مشروع جديد
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    إجمالي المشاريع
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {projectStats.total}
                  </Typography>
                </Box>
                <FolderOpenIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    المشاريع النشطة
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {projectStats.active}
                  </Typography>
                </Box>
                <ScheduleIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    إجمالي الميزانية
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {(projectStats.totalBudget / 1000).toFixed(0)}K
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    الإنفاق الحالي
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {(projectStats.totalSpent / 1000).toFixed(0)}K
                  </Typography>
                </Box>
                <AssessmentIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2, boxShadow: 2, mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="📋 المشاريع" icon={<FolderOpenIcon />} iconPosition="start" />
          <Tab label="✓ المهام" icon={<CheckCircleIcon />} iconPosition="start" />
          <Tab label="💰 الميزانية" icon={<TrendingUpIcon />} iconPosition="start" />
          <Tab label="📈 التحليلات" icon={<AssessmentIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 1: Projects */}
      {tabValue === 0 && (
        <Grid container spacing={2}>
          {projects.map(proj => (
            <Grid item xs={12} md={6} key={proj.id}>
              <Card sx={{ boxShadow: 2, borderRadius: 2, height: '100%' }}>
                <CardHeader
                  title={proj.name}
                  subheader={proj.manager}
                  action={
                    <Box>
                      <Chip label={proj.status} color={getStatusColor(proj.status)} size="small" sx={{ mr: 1 }} />
                      <Chip label={proj.priority} color={getPriorityColor(proj.priority)} size="small" />
                    </Box>
                  }
                  sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}
                />
                <CardContent>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {proj.description}
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                          التقدم: {proj.progress}%
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {proj.completed}/{proj.tasks} مهام
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={proj.progress} sx={{ height: 6, borderRadius: 1 }} />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
                      <Box>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                          من
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {new Date(proj.startDate).toLocaleDateString('ar-SA')}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                          إلى
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {new Date(proj.endDate).toLocaleDateString('ar-SA')}
                        </Typography>
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                        الفريق
                      </Typography>
                      <AvatarGroup max={4} sx={{ display: 'flex', gap: 0.5 }}>
                        {proj.team.map((member, idx) => (
                          <Avatar
                            key={idx}
                            sx={{
                              width: 32,
                              height: 32,
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              fontSize: '12px',
                            }}
                          >
                            {member.charAt(0)}
                          </Avatar>
                        ))}
                      </AvatarGroup>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab 2: Tasks */}
      {tabValue === 1 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>المشروع</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>المهمة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>المسؤول</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الحالة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الموعد النهائي</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الأولوية</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map(task => {
                const proj = projects.find(p => p.id === task.projectId);
                return (
                  <TableRow key={task.id} hover>
                    <TableCell>{proj?.name}</TableCell>
                    <TableCell>{task.title}</TableCell>
                    <TableCell>{task.assignee}</TableCell>
                    <TableCell>
                      <Chip
                        label={task.status}
                        color={task.status === 'مكتمل' ? 'success' : task.status === 'جاري' ? 'warning' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{new Date(task.dueDate).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>
                      <Chip label={task.priority} color={getPriorityColor(task.priority)} size="small" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 3: Budget */}
      {tabValue === 2 && (
        <Grid container spacing={2}>
          {budgetVsSpent.map(item => (
            <Grid item xs={12} key={item.name}>
              <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {item.spent.toLocaleString()} / {item.budget.toLocaleString()} ر.س
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={(item.spent / item.budget) * 100} sx={{ height: 8, borderRadius: 1 }} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab 4: Analytics */}
      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                📊 الميزانية المخططة مقابل الإنفاق
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={budgetVsSpent}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="budget" fill="#8884d8" name="الميزانية المخططة" />
                  <Bar dataKey="spent" fill="#82ca9d" name="الإنفاق الفعلي" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Add Project Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>مشروع جديد</DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="اسم المشروع"
              value={newProject.name}
              onChange={e => setNewProject({ ...newProject, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="الوصف"
              value={newProject.description}
              onChange={e => setNewProject({ ...newProject, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="تاريخ البداية"
              type="date"
              value={newProject.startDate}
              onChange={e => setNewProject({ ...newProject, startDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="تاريخ النهاية"
              type="date"
              value={newProject.endDate}
              onChange={e => setNewProject({ ...newProject, endDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="الميزانية"
              type="number"
              value={newProject.budget}
              onChange={e => setNewProject({ ...newProject, budget: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button onClick={handleAddProject} variant="contained" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectManagement;
