// Smart Project Management Module
// Core project, task, milestone, and dependency management
export type ProjectStatus = 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  status: ProjectStatus;
  startDate: string;
  endDate?: string;
  members: string[];
  tasks: string[];
  milestones: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  dueDate?: string;
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  dueDate: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export class SmartProjectManager {
  private projects: Project[] = [];
  private tasks: ProjectTask[] = [];
  private milestones: ProjectMilestone[] = [];

  createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'milestones' | 'status'>): Project {
    const p: Project = {
      ...data,
      id: Math.random().toString(36).slice(2),
      status: 'planned',
      tasks: [],
      milestones: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.projects.push(p);
    return p;
  }

  updateProject(id: string, updates: Partial<Project>): Project | undefined {
    const p = this.projects.find(x => x.id === id);
    if (p) {
      Object.assign(p, updates);
      p.updatedAt = new Date().toISOString();
    }
    return p;
  }

  getProject(id: string): Project | undefined {
    return this.projects.find(x => x.id === id);
  }

  listProjects(): Project[] {
    return this.projects;
  }

  // Task management
  createTask(data: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>): ProjectTask {
    const t: ProjectTask = {
      ...data,
      id: Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.push(t);
    const p = this.getProject(t.projectId);
    if (p) p.tasks.push(t.id);
    return t;
  }

  updateTask(id: string, updates: Partial<ProjectTask>): ProjectTask | undefined {
    const t = this.tasks.find(x => x.id === id);
    if (t) {
      Object.assign(t, updates);
      t.updatedAt = new Date().toISOString();
    }
    return t;
  }

  getTask(id: string): ProjectTask | undefined {
    return this.tasks.find(x => x.id === id);
  }

  listTasks(projectId?: string): ProjectTask[] {
    return projectId ? this.tasks.filter(t => t.projectId === projectId) : this.tasks;
  }

  // Milestone management
  createMilestone(data: Omit<ProjectMilestone, 'id' | 'createdAt' | 'updatedAt' | 'completed'>): ProjectMilestone {
    const m: ProjectMilestone = {
      ...data,
      id: Math.random().toString(36).slice(2),
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.milestones.push(m);
    const p = this.getProject(m.projectId);
    if (p) p.milestones.push(m.id);
    return m;
  }

  updateMilestone(id: string, updates: Partial<ProjectMilestone>): ProjectMilestone | undefined {
    const m = this.milestones.find(x => x.id === id);
    if (m) {
      Object.assign(m, updates);
      m.updatedAt = new Date().toISOString();
    }
    return m;
  }

  getMilestone(id: string): ProjectMilestone | undefined {
    return this.milestones.find(x => x.id === id);
  }

  listMilestones(projectId?: string): ProjectMilestone[] {
    return projectId ? this.milestones.filter(m => m.projectId === projectId) : this.milestones;
  }
}
