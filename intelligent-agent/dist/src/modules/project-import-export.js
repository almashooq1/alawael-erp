"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectImportExport = void 0;
class ProjectImportExport {
    constructor(projectManager, ticketing, fileManager) {
        this.projectManager = projectManager;
        this.ticketing = ticketing;
        this.fileManager = fileManager;
    }
    // Export all projects, tasks, milestones to JSON
    async exportAll(path) {
        const data = {
            projects: this.projectManager.listProjects(),
            tasks: this.projectManager.listTasks(),
            milestones: this.projectManager.listMilestones(),
        };
        await this.fileManager.write(path, JSON.stringify(data, null, 2));
    }
    // Import projects, tasks, milestones from JSON
    async importAll(path) {
        if (!(await this.fileManager.exists(path)))
            throw new Error('File not found');
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
    linkProjectToTicket(projectId, ticketId) {
        const project = this.projectManager.getProject(projectId);
        const ticket = this.ticketing.getTicket(ticketId);
        if (!project || !ticket)
            return false;
        project.linkedTickets = [...(project.linkedTickets || []), ticketId];
        ticket.linkedProjects = [...(ticket.linkedProjects || []), projectId];
        return true;
    }
    // List all tickets linked to a project
    listProjectTickets(projectId) {
        const project = this.projectManager.getProject(projectId);
        if (!project || !project.linkedTickets)
            return [];
        return project.linkedTickets.map(id => this.ticketing.getTicket(id)).filter(Boolean);
    }
    // List all projects linked to a ticket
    listTicketProjects(ticketId) {
        const ticket = this.ticketing.getTicket(ticketId);
        if (!ticket || !ticket.linkedProjects)
            return [];
        return ticket.linkedProjects.map(id => this.projectManager.getProject(id)).filter(Boolean);
    }
}
exports.ProjectImportExport = ProjectImportExport;
