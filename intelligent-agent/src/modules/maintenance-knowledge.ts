// src/modules/maintenance-knowledge.ts
// Maintenance & AI-powered Knowledge Base Module

export interface MaintenanceTask {
  id: string;
  title: string;
  description?: string;
  scheduledAt: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  aiSummary?: string;
}

const maintenanceTasks: MaintenanceTask[] = [];
const knowledgeBase: KnowledgeArticle[] = [];

function generateId() {
  return 'MK' + Math.random().toString(36).slice(2, 10);
}

export class MaintenanceKnowledge {
  // Maintenance tasks
  listTasks() { return maintenanceTasks; }
  getTask(id: string) { return maintenanceTasks.find(t => t.id === id); }
  createTask(data: Omit<MaintenanceTask, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: MaintenanceTask['status'] }) {
    const task: MaintenanceTask = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: data.status || 'pending',
      ...data,
    };
    maintenanceTasks.push(task);
    return task;
  }
  updateTask(id: string, data: Partial<Omit<MaintenanceTask, 'id' | 'createdAt'>>) {
    const t = maintenanceTasks.find(t => t.id === id);
    if (!t) return null;
    Object.assign(t, data);
    t.updatedAt = new Date().toISOString();
    return t;
  }
  deleteTask(id: string) {
    const idx = maintenanceTasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    maintenanceTasks.splice(idx, 1);
    return true;
  }
  // Knowledge base
  listArticles() { return knowledgeBase; }
  getArticle(id: string) { return knowledgeBase.find(a => a.id === id); }
  createArticle(data: Omit<KnowledgeArticle, 'id' | 'createdAt' | 'updatedAt' | 'aiSummary'>) {
    const article: KnowledgeArticle = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };
    // Simulate AI summary
    article.aiSummary = `AI Summary: ${article.content.slice(0, 60)}...`;
    knowledgeBase.push(article);
    return article;
  }
  updateArticle(id: string, data: Partial<Omit<KnowledgeArticle, 'id' | 'createdAt'>>) {
    const a = knowledgeBase.find(a => a.id === id);
    if (!a) return null;
    Object.assign(a, data);
    a.updatedAt = new Date().toISOString();
    // Update AI summary if content changed
    if (data.content) a.aiSummary = `AI Summary: ${a.content.slice(0, 60)}...`;
    return a;
  }
  deleteArticle(id: string) {
    const idx = knowledgeBase.findIndex(a => a.id === id);
    if (idx === -1) return false;
    knowledgeBase.splice(idx, 1);
    return true;
  }
  searchArticles(query: string) {
    return knowledgeBase.filter(a => a.title.includes(query) || a.content.includes(query) || a.tags.some(tag => tag.includes(query)));
  }
}
