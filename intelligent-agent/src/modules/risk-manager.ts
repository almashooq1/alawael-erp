// Advanced Risk Management & Mitigation Module
// Identifies, tracks, and mitigates risks across projects
import { Project, ProjectTask, ProjectMilestone } from './smart-project-manager';

export interface ProjectRisk {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'mitigated' | 'closed';
  detectedAt: string;
  mitigatedAt?: string;
  relatedTaskIds?: string[];
  relatedMilestoneIds?: string[];
}

export class RiskManager {
  private risks: ProjectRisk[] = [];

  addRisk(data: Omit<ProjectRisk, 'id' | 'detectedAt' | 'status'>): ProjectRisk {
    const r: ProjectRisk = {
      ...data,
      id: Math.random().toString(36).slice(2),
      status: 'open',
      detectedAt: new Date().toISOString(),
    };
    this.risks.push(r);
    return r;
  }

  mitigateRisk(id: string): boolean {
    const r = this.risks.find(x => x.id === id);
    if (!r || r.status !== 'open') return false;
    r.status = 'mitigated';
    r.mitigatedAt = new Date().toISOString();
    return true;
  }

  closeRisk(id: string): boolean {
    const r = this.risks.find(x => x.id === id);
    if (!r || (r.status !== 'open' && r.status !== 'mitigated')) return false;
    r.status = 'closed';
    r.mitigatedAt = new Date().toISOString();
    return true;
  }

  listRisks(projectId?: string): ProjectRisk[] {
    return projectId ? this.risks.filter(r => r.projectId === projectId) : this.risks;
  }

  getRisk(id: string): ProjectRisk | undefined {
    return this.risks.find(r => r.id === id);
  }
}
