// process.model.ts
// نموذج بيانات أساسي لإدارة العمليات والمهام

export interface Process {
  _id?: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  steps: ProcessStep[];
  createdAt: string;
  updatedAt: string;
}

export interface ProcessStep {
  id: string;
  name: string;
  type: 'manual' | 'automated' | 'approval';
  assignee?: string;
  status: 'pending' | 'in_progress' | 'done' | 'skipped';
  dueDate?: string;
  actions?: StepAction[];
}

export interface StepAction {
  label: string;
  type: 'notify' | 'update' | 'api_call' | 'custom';
  config?: any;
}

export interface Task {
  _id?: string;
  processId: string;
  stepId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'done' | 'skipped';
  assignee?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}
