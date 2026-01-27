// وحدة إدارة المهام الذكية (Smart Task Management)
import { v4 as uuidv4 } from 'uuid';

export interface SmartTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export class SmartTaskManager {
  private tasks: SmartTask[] = [];

  createTask(title: string, description?: string, assignedTo?: string, dueDate?: string): SmartTask {
    const now = new Date().toISOString();
    const task: SmartTask = {
      id: uuidv4(),
      title,
      description,
      status: 'pending',
      assignedTo,
      dueDate,
      createdAt: now,
      updatedAt: now
    };
    this.tasks.push(task);
    return task;
  }

  listTasks(filter?: Partial<SmartTask>): SmartTask[] {
    if (!filter) return this.tasks;
    return this.tasks.filter(task =>
      Object.entries(filter).every(([k, v]) => (task as any)[k] === v)
    );
  }

  updateTask(id: string, updates: Partial<Omit<SmartTask, 'id' | 'createdAt'>>): SmartTask | undefined {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return undefined;
    Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    return task;
  }

  deleteTask(id: string): boolean {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.tasks.splice(idx, 1);
    return true;
  }
}
