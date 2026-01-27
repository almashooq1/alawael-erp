"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiemIntegration = void 0;
class SiemIntegration {
    constructor() {
        this.destinations = [];
    }
    addDestination(dest) {
        const d = { ...dest, id: Math.random().toString(36).slice(2) };
        this.destinations.push(d);
        return d;
    }
    removeDestination(id) {
        this.destinations = this.destinations.filter(d => d.id !== id);
    }
    listDestinations() {
        return this.destinations;
    }
    setEnabled(id, enabled) {
        const d = this.destinations.find(x => x.id === id);
        if (d)
            d.enabled = enabled;
    }
    sendSecurityEvent(event) {
        for (const d of this.destinations.filter(x => x.enabled && (x.type === 'security_event' || x.type === 'all'))) {
            // postWebhook(d.url, event) -- mock only
        }
    }
    sendPolicyChange(change) {
        for (const d of this.destinations.filter(x => x.enabled && (x.type === 'policy_change' || x.type === 'all'))) {
            // postWebhook(d.url, change) -- mock only
        }
    }
}
exports.SiemIntegration = SiemIntegration;
