// Phase 4: Project Management Dashboard
import { useState, useEffect, useCallback } from 'react';

import projectManagementService from 'services/projectManagement.service';
import logger from 'utils/logger';
import { getUserData } from 'utils/tokenStorage';
import { useSnackbar } from 'contexts/SnackbarContext';
import { gradients, statusColors, neutralColors } from '../../theme/palette';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddIcon from '@mui/icons-material/Add';
import TaskIcon from '@mui/icons-material/Task';

const ProjectManagementDashboard = () => {
  const showSnackbar = useSnackbar();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [tasks, setTasks] = useState({ todo: [], in_progress: [], review: [], done: [] });

  // New Project Form State
  const [newProject, setNewProject] = useState({ name: '', description: '', priority: 'medium' });
  // New Task Form State
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
  });

  const loadTasks = useCallback(async projectId => {
    try {
      const data = await projectManagementService.getTasks(projectId);
      const allTasks = data.data;

      // Group by status
      const grouped = {
        todo: allTasks.filter(t => t.status === 'todo'),
        in_progress: allTasks.filter(t => t.status === 'in_progress'),
        review: allTasks.filter(t => t.status === 'review'),
        done: allTasks.filter(t => t.status === 'done'),
      };
      setTasks(grouped);
    } catch (error) {
      logger.error('Error loading tasks', error);
    }
  }, []);

  const selectProject = useCallback(
    async project => {
      setSelectedProject(project);
      loadTasks(project._id);
    },
    [loadTasks]
  );

  const loadProjects = useCallback(async () => {
    try {
      const data = await projectManagementService.getProjects();
      setProjects(data.data);
      if (data.data.length > 0 && !selectedProject) {
        selectProject(data.data[0]);
      }
    } catch (error) {
      logger.error(error);
    }
  }, [selectedProject, selectProject]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreateProject = async () => {
    try {
      const user = getUserData();
      const projectData = {
        ...newProject,
        manager: user._id || user.id || '65a000000000000000000000',
      };
      await projectManagementService.createProject(projectData);
      setOpenDialog(false);
      loadProjects();
    } catch (error) {
      showSnackbar('فشل إنشاء المشروع', 'error');
    }
  };

  const handleCreateTask = async () => {
    try {
      if (!selectedProject) return;
      const taskData = { ...newTask, projectId: selectedProject._id };
      await projectManagementService.createTask(taskData);
      setOpenTaskDialog(false);
      loadTasks(selectedProject._id);
      setNewTask({ title: '', description: '', priority: 'medium', status: 'todo' });
    } catch (error) {
      showSnackbar('فشل إنشاء المهمة', 'error');
    }
  };

  const moveTask = async (taskId, newStatus) => {
    try {
      await projectManagementService.updateTask(taskId, { status: newStatus });
      loadTasks(selectedProject._id);
    } catch (error) {
      logger.error('Failed to move task', error);
    }
  };

  const KanbanColumn = ({ title, status, items, color }) => (
    <Paper
      sx={{
        p: 2,
        backgroundColor: neutralColors.lightGrey,
        height: '100%',
        minHeight: '400px',
        borderTop: `4px solid ${color}`,
      }}
    >
      <Typography
        variant="h6"
        gutterBottom
        sx={{ display: 'flex', justifyContent: 'space-between' }}
      >
        {title}
        <Chip label={items.length} size="small" />
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map(task => (
          <Card key={task._id} sx={{ mb: 1 }}>
            <CardContent sx={{ p: '16px !important' }}>
              <Typography variant="subtitle1">{task.title}</Typography>
              <Typography variant="body2" color="textSecondary" noWrap>
                {task.description}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={task.priority}
                  size="small"
                  color={getPrioColor(task.priority)}
                  variant="outlined"
                />

                {/* Actions Menu or Buttons */}
                <Box sx={{ flexGrow: 1 }} />
                {status !== 'done' && (
                  <Button size="small" onClick={() => moveTask(task._id, getNextStatus(status))}>
                    التالي &gt;
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 4 }}>
            فارغ
          </Typography>
        )}
      </Box>
    </Paper>
  );

  const getNextStatus = current => {
    const flow = ['todo', 'in_progress', 'review', 'done'];
    const idx = flow.indexOf(current);
    return idx < flow.length - 1 ? flow[idx + 1] : current;
  };

  const getPrioColor = p => {
    switch (p) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'success';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DashboardIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              إدارة المشاريع
            </Typography>
            <Typography variant="body2">متابعة وإدارة المشاريع والمهام</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">📊 إدارة المشاريع</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
          مشروع جديد
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Sidebar Projects List */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              المشاريع
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {projects.map(project => (
                <Card
                  key={project._id}
                  sx={{
                    cursor: 'pointer',
                    border:
                      selectedProject?._id === project._id
                        ? `2px solid ${statusColors.primaryBlue}`
                        : 'none',
                    bgcolor: selectedProject?._id === project._id ? '#e3f2fd' : 'white',
                  }}
                  onClick={() => selectProject(project)}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle1">{project.name}</Typography>
                    <Chip label={project.status} size="small" color="primary" variant="outlined" />
                  </CardContent>
                </Card>
              ))}
              {projects.length === 0 && <Typography>لا توجد مشاريع</Typography>}
            </Box>
          </Paper>
        </Grid>

        {/* Kanban Board */}
        <Grid item xs={12} md={9}>
          {selectedProject ? (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h5" gutterBottom>
                  {selectedProject.name} - Board
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<TaskIcon />}
                  onClick={() => setOpenTaskDialog(true)}
                >
                  إضافة مهمة
                </Button>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <KanbanColumn
                    title="مطلوب"
                    status="todo"
                    items={tasks.todo}
                    color={statusColors.error}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KanbanColumn
                    title="قيد التنفيذ"
                    status="in_progress"
                    items={tasks.in_progress}
                    color={statusColors.warning}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KanbanColumn
                    title="مراجعة"
                    status="review"
                    items={tasks.review}
                    color={statusColors.info}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KanbanColumn
                    title="مكتمل"
                    status="done"
                    items={tasks.done}
                    color={statusColors.success}
                  />
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="textSecondary">اختر مشروعاً لعرض التفاصيل</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* New Project Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>إنشاء مشروع جديد</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="اسم المشروع"
            fullWidth
            value={newProject.name}
            onChange={e => setNewProject({ ...newProject, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="الوصف"
            fullWidth
            multiline
            rows={3}
            value={newProject.description}
            onChange={e => setNewProject({ ...newProject, description: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>الأولوية</InputLabel>
            <Select
              value={newProject.priority}
              label="الأولوية"
              onChange={e => setNewProject({ ...newProject, priority: e.target.value })}
            >
              <MenuItem value="low">منخفضة</MenuItem>
              <MenuItem value="medium">متوسطة</MenuItem>
              <MenuItem value="high">عالية</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button onClick={handleCreateProject} variant="contained">
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Task Dialog */}
      <Dialog open={openTaskDialog} onClose={() => setOpenTaskDialog(false)}>
        <DialogTitle>إنشاء مهمة جديدة</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="عنوان المهمة"
            fullWidth
            value={newTask.title}
            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
          />
          <TextField
            margin="dense"
            label="الوصف"
            fullWidth
            multiline
            rows={3}
            value={newTask.description}
            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>الأولوية</InputLabel>
            <Select
              value={newTask.priority}
              label="الأولوية"
              onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
            >
              <MenuItem value="low">منخفضة</MenuItem>
              <MenuItem value="medium">متوسطة</MenuItem>
              <MenuItem value="high">عالية</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTaskDialog(false)}>إلغاء</Button>
          <Button onClick={handleCreateTask} variant="contained">
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectManagementDashboard;
