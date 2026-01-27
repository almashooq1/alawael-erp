// Project Collaboration, Chat, and Notifications Module
// Simple in-memory chat and notification system for demo.
export interface ProjectMessage {
  id: string;
  projectId: string;
  userId: string;
  message: string;
  createdAt: string;
}

export interface ProjectNotification {
  id: string;
  projectId: string;
  userId: string;
  type: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export class ProjectCollab {
  private messages: ProjectMessage[] = [];
  private notifications: ProjectNotification[] = [];

  postMessage(projectId: string, userId: string, message: string): ProjectMessage {
    const m: ProjectMessage = {
      id: Math.random().toString(36).slice(2),
      projectId, userId, message,
      createdAt: new Date().toISOString(),
    };
    this.messages.push(m);
    return m;
  }

  listMessages(projectId: string): ProjectMessage[] {
    return this.messages.filter(m => m.projectId === projectId);
  }

  notify(projectId: string, userId: string, type: string, content: string): ProjectNotification {
    const n: ProjectNotification = {
      id: Math.random().toString(36).slice(2),
      projectId, userId, type, content, read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.push(n);
    return n;
  }

  listNotifications(userId: string): ProjectNotification[] {
    return this.notifications.filter(n => n.userId === userId);
  }

  markRead(id: string): boolean {
    const n = this.notifications.find(x => x.id === id);
    if (n) n.read = true;
    return !!n;
  }
}
