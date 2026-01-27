// Advanced Compliance & Policy Management Module
// Manages compliance requirements, policies, and audits for projects

export interface Policy {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceAudit {
  id: string;
  projectId: string;
  policyId: string;
  result: 'pass' | 'fail' | 'pending';
  notes?: string;
  auditedAt: string;
}

export class ComplianceManager {
  private policies: Policy[] = [];
  private audits: ComplianceAudit[] = [];

  addPolicy(data: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Policy {
    const p: Policy = {
      ...data,
      id: Math.random().toString(36).slice(2),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.policies.push(p);
    return p;
  }

  updatePolicy(id: string, updates: Partial<Policy>): Policy | undefined {
    const p = this.policies.find(x => x.id === id);
    if (p) {
      Object.assign(p, updates);
      p.updatedAt = new Date().toISOString();
    }
    return p;
  }

  listPolicies(): Policy[] {
    return this.policies;
  }

  addAudit(data: Omit<ComplianceAudit, 'id' | 'auditedAt'>): ComplianceAudit {
    const a: ComplianceAudit = {
      ...data,
      id: Math.random().toString(36).slice(2),
      auditedAt: new Date().toISOString(),
    };
    this.audits.push(a);
    return a;
  }

  listAudits(projectId?: string): ComplianceAudit[] {
    return projectId ? this.audits.filter(a => a.projectId === projectId) : this.audits;
  }
}
