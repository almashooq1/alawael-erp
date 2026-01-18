// Phase 4: Project Management Dashboard
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Box,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Add as AddIcon, Assignment as TaskIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import projectManagementService from '../services/projectManagement.service';

const ProjectManagementDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [tasks, setTasks] = useState({ todo: [], in_progress: [], review: [], done: [] });

  // New Project Form State
  const [newProject, setNewProject] = useState({ name: '', description: '', priority: 'medium' });
  // New Task Form State
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', status: 'todo' });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projectManagementService.getProjects();
      setProjects(data.data);
      if (data.data.length > 0 && !selectedProject) {
        selectProject(data.data[0]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const selectProject = async project => {
    setSelectedProject(project);
    loadTasks(project._id);
  };

  const loadTasks = async projectId => {
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
      console.error('Error loading tasks', error);
    }
  };

  const handleCreateProject = async () => {
    try {
      // In a real app we'd get the current user ID for 'manager'
      const projectData = { ...newProject, manager: '65a000000000000000000000' }; // Mock ID
      await projectManagementService.createProject(projectData);
      setOpenDialog(false);
      loadProjects();
    } catch (error) {
      alert('Failed to create project');
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
      alert('Failed to create task');
    }
  };

  const moveTask = async (taskId, newStatus) => {
    try {
      await projectManagementService.updateTask(taskId, { status: newStatus });
      loadTasks(selectedProject._id);
    } catch (error) {
      console.error('Failed to move task', error);
    }
  };

  const KanbanColumn = ({ title, status, items, color }) => (
    <Paper
      sx={{
        p: 2,
        backgroundColor: '#f5f5f5',
        height: '100%',
        minHeight: '400px',
        borderTop: `4px solid ${color}`,
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
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
                <Chip label={task.priority} size="small" color={getPrioColor(task.priority)} variant="outlined" />

                {/* Actions Menu or Buttons */}
                <Box sx={{ flexGrow: 1 }} />
                {status !== 'done' && (
                  <Button size="small" onClick={() => moveTask(task._id, getNextStatus(status))}>
                    Next &gt;
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 4 }}>
            Empty
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">📊 Project Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
          New Project
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Sidebar Projects List */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Projects
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {projects.map(project => (
                <Card
                  key={project._id}
                  sx={{
                    cursor: 'pointer',
                    border: selectedProject?._id === project._id ? '2px solid #1976d2' : 'none',
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
              {projects.length === 0 && <Typography>No projects found</Typography>}
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
                <Button variant="outlined" startIcon={<TaskIcon />} onClick={() => setOpenTaskDialog(true)}>
                  Add Task
                </Button>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <KanbanColumn title="To Do" status="todo" items={tasks.todo} color="#f44336" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KanbanColumn title="In Progress" status="in_progress" items={tasks.in_progress} color="#ffa726" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KanbanColumn title="Review" status="review" items={tasks.review} color="#29b6f6" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <KanbanColumn title="Done" status="done" items={tasks.done} color="#66bb6a" />
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="textSecondary">Select a project to view details</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* New Project Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            value={newProject.name}
            onChange={e => setNewProject({ ...newProject, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={newProject.description}
            onChange={e => setNewProject({ ...newProject, description: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Priority</InputLabel>
            <Select value={newProject.priority} label="Priority" onChange={e => setNewProject({ ...newProject, priority: e.target.value })}>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateProject} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Task Dialog */}
      <Dialog open={openTaskDialog} onClose={() => setOpenTaskDialog(false)}>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Task Title"
            fullWidth
            value={newTask.title}
            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={newTask.description}
            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Priority</InputLabel>
            <Select value={newTask.priority} label="Priority" onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTaskDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateTask} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectManagementDashboard;
