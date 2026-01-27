"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditTrail = void 0;
// Audit Trail Module
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const AUDIT_PATH = path_1.default.join(__dirname, '../../data/audit-trail.jsonl');
class AuditTrail {
    static log(entry) {
        const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
        fs_1.default.appendFileSync(AUDIT_PATH, line + '\n', 'utf8');
    }
    static getAll() {
        if (!fs_1.default.existsSync(AUDIT_PATH))
            return [];
        return fs_1.default.readFileSync(AUDIT_PATH, 'utf8')
            .split('\n')
            .filter(Boolean)
            .map(line => JSON.parse(line));
    }
    static getByResource(resource, resourceId) {
        return this.getAll().filter(l => l.resource === resource && (!resourceId || l.resourceId === resourceId));
    }
    static query(filter) {
        return this.getAll().filter(e => (!filter?.userId || e.userId === filter.userId) &&
            (!filter?.action || e.action === filter.action) &&
            (!filter?.resource || e.resource === filter.resource));
    }
}
exports.AuditTrail = AuditTrail;
