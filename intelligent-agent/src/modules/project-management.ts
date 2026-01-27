// src/modules/project-management.ts
// Advanced Project Management Module (Gantt, multi-resource)

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  startDate: string;
  endDate: string;
  status: 'planned' | 'active' | 'completed' | 'on-hold' | 'cancelled';
  resources: string[];
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  name: string;
  start: string;
  end: string;
  assignedTo: string[];
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  dependencies?: string[];
  progress?: number;
}

const projects: Project[] = [];

function generateId() {
  return 'P' + Math.random().toString(36).slice(2, 10);
}

export class ProjectManagement {
  listProjects(ownerId?: string) {
    return ownerId ? projects.filter(p => p.ownerId === ownerId) : projects;
  }
  getProject(id: string) {
    return projects.find(p => p.id === id);
  }
  createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'tasks'> & { status?: Project['status']; tasks?: Task[] }) {
    const project: Project = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: data.status || 'planned',
      tasks: data.tasks || [],
      ...data,
    };
    projects.push(project);
    return project;
  }
  updateProject(id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>) {
    const p = projects.find(p => p.id === id);
    if (!p) return null;
    Object.assign(p, data);
    p.updatedAt = new Date().toISOString();
    return p;
  }
  deleteProject(id: string) {
    const idx = projects.findIndex(p => p.id === id);
    if (idx === -1) return false;
    projects.splice(idx, 1);
    return true;
  }
  // Task management
  addTask(projectId: string, task: Omit<Task, 'id'>) {
    const p = projects.find(p => p.id === projectId);
    if (!p) return null;
    const t: Task = { id: generateId(), ...task };
    p.tasks.push(t);
    p.updatedAt = new Date().toISOString();
    return t;
  }
  updateTask(projectId: string, taskId: string, data: Partial<Omit<Task, 'id'>>) {
    const p = projects.find(p => p.id === projectId);
    if (!p) return null;
    const t = p.tasks.find(t => t.id === taskId);
    if (!t) return null;
    Object.assign(t, data);
    p.updatedAt = new Date().toISOString();
    return t;
  }
  removeTask(projectId: string, taskId: string) {
    const p = projects.find(p => p.id === projectId);
    if (!p) return false;
    const idx = p.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return false;
    p.tasks.splice(idx, 1);
    p.updatedAt = new Date().toISOString();
    return true;
  }
}
