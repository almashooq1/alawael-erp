// src/modules/document-manager.ts
// Advanced Document Management Module (e-signature, versioning, AI search)

export interface Document {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  signatures: Signature[];
  metadata?: Record<string, any>;
}

export interface Signature {
  userId: string;
  signedAt: string;
}

const documents: Document[] = [];

function generateId() {
  return 'D' + Math.random().toString(36).slice(2, 10);
}

export class DocumentManager {
  listDocuments(ownerId?: string) {
    return ownerId ? documents.filter(d => d.ownerId === ownerId) : documents;
  }
  getDocument(id: string) {
    return documents.find(d => d.id === id);
  }
  createDocument(data: Omit<Document, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'signatures'>) {
    const doc: Document = {
      id: generateId(),
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      signatures: [],
      ...data,
    };
    documents.push(doc);
    return doc;
  }
  updateDocument(id: string, data: Partial<Omit<Document, 'id' | 'version' | 'createdAt' | 'signatures'>>) {
    const d = documents.find(d => d.id === id);
    if (!d) return null;
    Object.assign(d, data);
    d.version += 1;
    d.updatedAt = new Date().toISOString();
    return d;
  }
  deleteDocument(id: string) {
    const idx = documents.findIndex(d => d.id === id);
    if (idx === -1) return false;
    documents.splice(idx, 1);
    return true;
  }
  signDocument(id: string, userId: string) {
    const d = documents.find(d => d.id === id);
    if (!d) return null;
    d.signatures.push({ userId, signedAt: new Date().toISOString() });
    return d;
  }
  // Simulated AI search (simple keyword match)
  searchDocuments(query: string) {
    return documents.filter(d => d.title.includes(query) || d.content.includes(query));
  }
}
