"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalIntegrations = void 0;
class ExternalIntegrations {
    constructor() {
        this.configs = [];
    }
    addIntegration(cfg) {
        const c = { ...cfg, id: Math.random().toString(36).slice(2) };
        this.configs.push(c);
        return c;
    }
    removeIntegration(id) {
        this.configs = this.configs.filter(c => c.id !== id);
    }
    listIntegrations() {
        return this.configs;
    }
    setEnabled(id, enabled) {
        const c = this.configs.find(x => x.id === id);
        if (c)
            c.enabled = enabled;
    }
    // Example: send ticket to integration (stub)
    sendTicket(type, ticket) {
        // In production, call real API
        return { ok: true, type, ticket };
    }
}
exports.ExternalIntegrations = ExternalIntegrations;
