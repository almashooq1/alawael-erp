// Project Calendar, Meetings, and Resource Allocation Module
// Simple in-memory calendar and resource allocation for demo.
export interface ProjectEvent {
  id: string;
  projectId: string;
  title: string;
  start: string;
  end: string;
  type: 'meeting' | 'deadline' | 'milestone' | 'custom';
  attendees: string[];
  location?: string;
  notes?: string;
  createdAt: string;
}

export interface ProjectResource {
  id: string;
  projectId: string;
  name: string;
  type: string;
  assignedTo?: string;
  allocationPercent?: number;
  createdAt: string;
}

export class ProjectCalendar {
  private events: ProjectEvent[] = [];
  private resources: ProjectResource[] = [];

  addEvent(event: Omit<ProjectEvent, 'id' | 'createdAt'>) {
    const e: ProjectEvent = { ...event, id: Math.random().toString(36).slice(2), createdAt: new Date().toISOString() };
    this.events.push(e);
    return e;
  }

  listEvents(projectId: string) {
    return this.events.filter(e => e.projectId === projectId);
  }

  removeEvent(id: string) {
    this.events = this.events.filter(e => e.id !== id);
  }

  addResource(resource: Omit<ProjectResource, 'id' | 'createdAt'>) {
    const r: ProjectResource = { ...resource, id: Math.random().toString(36).slice(2), createdAt: new Date().toISOString() };
    this.resources.push(r);
    return r;
  }

  listResources(projectId: string) {
    return this.resources.filter(r => r.projectId === projectId);
  }

  removeResource(id: string) {
    this.resources = this.resources.filter(r => r.id !== id);
  }
}
