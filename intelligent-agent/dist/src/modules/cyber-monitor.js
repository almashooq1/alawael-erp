"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyberMonitor = void 0;
const ai_threat_detector_1 = require("./ai-threat-detector");
class CyberMonitor {
    constructor(autoEscalation, instantNotifier) {
        this.autoEscalation = autoEscalation;
        this.instantNotifier = instantNotifier;
        this.aiDetector = new ai_threat_detector_1.AIThreatDetector();
        this.integrations = [];
        this.events = [];
        this.alerts = [];
    }
    // Integration management
    addIntegration(dest) {
        const d = { ...dest, id: Math.random().toString(36).slice(2) };
        this.integrations.push(d);
        return d;
    }
    removeIntegration(id) {
        this.integrations = this.integrations.filter(d => d.id !== id);
    }
    listIntegrations() {
        return this.integrations;
    }
    setIntegrationEnabled(id, enabled) {
        const d = this.integrations.find(i => i.id === id);
        if (d)
            d.enabled = enabled;
    }
    logEvent(event) {
        const e = {
            ...event,
            id: Math.random().toString(36).slice(2),
            timestamp: new Date().toISOString(),
        };
        this.events.push(e);
        // تحليل التهديد بالذكاء الاصطناعي
        const aiResult = this.aiDetector.analyze(e);
        if (e.severity === 'critical' || this.isSuspicious(e) || aiResult.threat) {
            this.alerts.push({ ...e, details: { ...e.details, aiReason: aiResult.reason } });
            this.sendIntegrations(e);
            // التصعيد التلقائي
            if (this.autoEscalation && this.instantNotifier) {
                this.autoEscalation.checkAndEscalate(e, this.events, (channels, eventObj) => {
                    if (this.instantNotifier) {
                        for (const ch of channels) {
                            this.instantNotifier.sendInstant(`[تصعيد تلقائي] حدث أمني: ${eventObj.type} (${eventObj.severity})`, ch);
                        }
                    }
                });
            }
        }
        return e;
    }
    // Send to all enabled integrations (mocked)
    sendIntegrations(event) {
        for (const dest of this.integrations.filter(i => i.enabled)) {
            if (dest.type === 'email') {
                // Integrate with real email service
                // sendEmail(dest.target, event)
            }
            else if (dest.type === 'sms') {
                // Integrate with real SMS service
                // sendSMS(dest.target, event)
            }
            else if (dest.type === 'webhook') {
                // Integrate with real webhook
                // postWebhook(dest.target, event)
            }
        }
    }
    isSuspicious(event) {
        // Example: flag multiple failed logins, privilege escalation, etc.
        if (event.type === 'failed_login' && event.details?.count >= 3)
            return true;
        if (event.type === 'privilege_escalation')
            return true;
        return false;
    }
    listEvents(filter) {
        return this.events.filter(e => (!filter?.userId || e.userId === filter.userId) &&
            (!filter?.type || e.type === filter.type) &&
            (!filter?.severity || e.severity === filter.severity));
    }
    listAlerts() {
        return this.alerts;
    }
}
exports.CyberMonitor = CyberMonitor;
