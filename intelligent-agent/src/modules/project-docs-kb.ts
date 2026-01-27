// Project Document Management & Knowledge Base Module
// Simple in-memory document and knowledge base for demo.
export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  type: string;
  url?: string;
  content?: string;
  uploadedBy: string;
  createdAt: string;
}

export interface ProjectKBEntry {
  id: string;
  projectId: string;
  question: string;
  answer: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
}

export class ProjectDocsKB {
  private docs: ProjectDocument[] = [];
  private kb: ProjectKBEntry[] = [];

  addDoc(doc: Omit<ProjectDocument, 'id' | 'createdAt'>) {
    const d: ProjectDocument = { ...doc, id: Math.random().toString(36).slice(2), createdAt: new Date().toISOString() };
    this.docs.push(d);
    return d;
  }

  listDocs(projectId: string) {
    return this.docs.filter(d => d.projectId === projectId);
  }

  removeDoc(id: string) {
    this.docs = this.docs.filter(d => d.id !== id);
  }

  addKB(entry: Omit<ProjectKBEntry, 'id' | 'createdAt'>) {
    const e: ProjectKBEntry = { ...entry, id: Math.random().toString(36).slice(2), createdAt: new Date().toISOString() };
    this.kb.push(e);
    return e;
  }

  listKB(projectId: string) {
    return this.kb.filter(e => e.projectId === projectId);
  }

  removeKB(id: string) {
    this.kb = this.kb.filter(e => e.id !== id);
  }
}
