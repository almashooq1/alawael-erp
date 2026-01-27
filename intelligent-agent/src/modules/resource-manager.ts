// Advanced Resource Management & Workload Optimization Module
// Assigns, tracks, and optimizes resources across projects
import { ProjectTask } from './smart-project-manager';

export interface Resource {
  id: string;
  name: string;
  type: string; // e.g. 'person', 'equipment', 'room'
  skills?: string[];
  availability: { from: string; to: string }[]; // time slots
  assignedTasks: string[];
  workload: number; // 0-1 (fraction of max capacity)
  createdAt: string;
  updatedAt: string;
}

export class ResourceManager {
  private resources: Resource[] = [];

  createResource(data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt' | 'assignedTasks' | 'workload'>): Resource {
    const r: Resource = {
      ...data,
      id: Math.random().toString(36).slice(2),
      assignedTasks: [],
      workload: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.resources.push(r);
    return r;
  }

  assignTask(resourceId: string, task: ProjectTask): boolean {
    const r = this.resources.find(x => x.id === resourceId);
    if (!r) return false;
    if (!r.assignedTasks.includes(task.id)) r.assignedTasks.push(task.id);
    r.workload = r.assignedTasks.length / 10; // Example: max 10 tasks
    r.updatedAt = new Date().toISOString();
    return true;
  }

  unassignTask(resourceId: string, taskId: string): boolean {
    const r = this.resources.find(x => x.id === resourceId);
    if (!r) return false;
    r.assignedTasks = r.assignedTasks.filter(id => id !== taskId);
    r.workload = r.assignedTasks.length / 10;
    r.updatedAt = new Date().toISOString();
    return true;
  }

  listResources(): Resource[] {
    return this.resources;
  }

  getResource(id: string): Resource | undefined {
    return this.resources.find(r => r.id === id);
  }

  optimizeWorkload(): void {
    // Example: balance tasks among resources
    const allTasks = this.resources.flatMap(r => r.assignedTasks);
    const avg = allTasks.length / (this.resources.length || 1);
    for (const r of this.resources) {
      if (r.assignedTasks.length > avg + 1) {
        // ... logic to suggest rebalancing ...
      }
    }
  }
}
