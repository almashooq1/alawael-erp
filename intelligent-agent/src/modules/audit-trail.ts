// Audit Trail Module
import fs from 'fs';
import path from 'path';

export interface AuditEntry {
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  timestamp: string;
  details?: any;
}

const AUDIT_PATH = path.join(__dirname, '../../data/audit-trail.jsonl');

export class AuditTrail {
  static log(entry: Omit<AuditEntry, 'timestamp'>) {
    const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
    fs.appendFileSync(AUDIT_PATH, line + '\n', 'utf8');
  }
  static getAll() {
    if (!fs.existsSync(AUDIT_PATH)) return [];
    return fs.readFileSync(AUDIT_PATH, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
  }
  static getByResource(resource: string, resourceId?: string) {
    return this.getAll().filter(l => l.resource === resource && (!resourceId || l.resourceId === resourceId));
  }
  static query(filter?: { userId?: string; action?: string; resource?: string }): AuditEntry[] {
    return this.getAll().filter(e =>
      (!filter?.userId || e.userId === filter.userId) &&
      (!filter?.action || e.action === filter.action) &&
      (!filter?.resource || e.resource === filter.resource)
    );
  }
}
