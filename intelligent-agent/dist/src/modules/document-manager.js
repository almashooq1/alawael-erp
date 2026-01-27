"use strict";
// src/modules/document-manager.ts
// Advanced Document Management Module (e-signature, versioning, AI search)
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentManager = void 0;
const documents = [];
function generateId() {
    return 'D' + Math.random().toString(36).slice(2, 10);
}
class DocumentManager {
    listDocuments(ownerId) {
        return ownerId ? documents.filter(d => d.ownerId === ownerId) : documents;
    }
    getDocument(id) {
        return documents.find(d => d.id === id);
    }
    createDocument(data) {
        const doc = {
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
    updateDocument(id, data) {
        const d = documents.find(d => d.id === id);
        if (!d)
            return null;
        Object.assign(d, data);
        d.version += 1;
        d.updatedAt = new Date().toISOString();
        return d;
    }
    deleteDocument(id) {
        const idx = documents.findIndex(d => d.id === id);
        if (idx === -1)
            return false;
        documents.splice(idx, 1);
        return true;
    }
    signDocument(id, userId) {
        const d = documents.find(d => d.id === id);
        if (!d)
            return null;
        d.signatures.push({ userId, signedAt: new Date().toISOString() });
        return d;
    }
    // Simulated AI search (simple keyword match)
    searchDocuments(query) {
        return documents.filter(d => d.title.includes(query) || d.content.includes(query));
    }
}
exports.DocumentManager = DocumentManager;
