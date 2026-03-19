import api from './api.client';

const projectManagementService = {
  // Projects
  getProjects: async () => {
    return api.get('/pm/projects');
  },

  createProject: async data => {
    return api.post('/pm/projects', data);
  },

  getProjectById: async id => {
    return api.get(`/pm/projects/${id}`);
  },

  updateProject: async (id, data) => {
    return api.put(`/pm/projects/${id}`, data);
  },

  // Tasks
  getTasks: async projectId => {
    return api.get(`/pm/projects/${projectId}/tasks`);
  },

  createTask: async data => {
    return api.post('/pm/tasks', data);
  },

  updateTask: async (id, data) => {
    return api.patch(`/pm/tasks/${id}`, data);
  },

  deleteTask: async id => {
    return api.delete(`/pm/tasks/${id}`);
  },
};

export default projectManagementService;
