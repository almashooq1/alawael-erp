// Project Import/Export & Ticket Integration Module
// Provides import/export for projects, tasks, milestones, and ticket linking
import { SmartProjectManager, Project, ProjectTask, ProjectMilestone } from './smart-project-manager';
import { SmartTicketing, Ticket } from './smart-ticketing';
import { FileManager } from './file-manager';

export class ProjectImportExport {
  constructor(
    private projectManager: SmartProjectManager,
    private ticketing: SmartTicketing,
    private fileManager: FileManager
  ) {}

  // Export all projects, tasks, milestones to JSON
  async exportAll(path: string): Promise<void> {
    const data = {
      projects: this.projectManager.listProjects(),
      tasks: this.projectManager.listTasks(),
      milestones: this.projectManager.listMilestones(),
    };
    await this.fileManager.write(path, JSON.stringify(data, null, 2));
  }

  // Import projects, tasks, milestones from JSON
  async importAll(path: string): Promise<{ imported: number }> {
    if (!(await this.fileManager.exists(path))) throw new Error('File not found');
    const raw = await this.fileManager.read(path);
    const data = JSON.parse(raw);
    let count = 0;
    if (Array.isArray(data.projects)) {
      for (const p of data.projects) {
        if (!this.projectManager.getProject(p.id)) {
          this.projectManager.createProject(p);
          count++;
        }
      }
    }
    if (Array.isArray(data.tasks)) {
      for (const t of data.tasks) {
        if (!this.projectManager.getTask(t.id)) {
          this.projectManager.createTask(t);
          count++;
        }
      }
    }
    if (Array.isArray(data.milestones)) {
      for (const m of data.milestones) {
        if (!this.projectManager.getMilestone(m.id)) {
          this.projectManager.createMilestone(m);
          count++;
        }
      }
    }
    return { imported: count };
  }

  // Link a project to a ticket (for cross-referencing)
  linkProjectToTicket(projectId: string, ticketId: string): boolean {
    const project = this.projectManager.getProject(projectId);
    const ticket = this.ticketing.getTicket(ticketId);
    if (!project || !ticket) return false;
    (project as any).linkedTickets = [...((project as any).linkedTickets || []), ticketId];
    (ticket as any).linkedProjects = [...((ticket as any).linkedProjects || []), projectId];
    return true;
  }

  // List all tickets linked to a project
  listProjectTickets(projectId: string): Ticket[] {
    const project = this.projectManager.getProject(projectId);
    if (!project || !(project as any).linkedTickets) return [];
    return ((project as any).linkedTickets as string[]).map(id => this.ticketing.getTicket(id)).filter(Boolean) as Ticket[];
  }

  // List all projects linked to a ticket
  listTicketProjects(ticketId: string): Project[] {
    const ticket = this.ticketing.getTicket(ticketId);
    if (!ticket || !(ticket as any).linkedProjects) return [];
    return ((ticket as any).linkedProjects as string[]).map(id => this.projectManager.getProject(id)).filter(Boolean) as Project[];
  }
}
