import api from '../utils/api';

const projectManagementService = {
  // Projects
  getProjects: async () => {
    const response = await api.get('/pm/projects');
    return response.data;
  },

  createProject: async data => {
    const response = await api.post('/pm/projects', data);
    return response.data;
  },

  getProjectById: async id => {
    const response = await api.get(`/pm/projects/${id}`);
    return response.data;
  },

  updateProject: async (id, data) => {
    const response = await api.put(`/pm/projects/${id}`, data);
    return response.data;
  },

  // Tasks
  getTasks: async projectId => {
    const response = await api.get(`/pm/projects/${projectId}/tasks`);
    return response.data;
  },

  createTask: async data => {
    const response = await api.post('/pm/tasks', data);
    return response.data;
  },

  updateTask: async (id, data) => {
    const response = await api.patch(`/pm/tasks/${id}`, data);
    return response.data;
  },

  deleteTask: async id => {
    const response = await api.delete(`/pm/tasks/${id}`);
    return response.data;
  },
};

export default projectManagementService;
