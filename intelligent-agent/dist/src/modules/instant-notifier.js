"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstantNotifier = void 0;
class InstantNotifier {
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
    sendInstant(message, channel) {
        for (const d of this.destinations.filter(x => x.enabled && x.channel === channel)) {
            // postWebhook(d.target, { text: message }) -- mock only
        }
    }
}
exports.InstantNotifier = InstantNotifier;
