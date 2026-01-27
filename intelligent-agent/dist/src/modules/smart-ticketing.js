"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartTicketing = void 0;
const ticket_workflow_1 = require("./ticket-workflow");
const knowledge_base_1 = require("./knowledge-base");
class SmartTicketing {
    constructor() {
        this.tickets = [];
        this.interactions = [];
        this.autoReplyRules = [];
        this.escalationRules = [];
        this.workflowEngine = new ticket_workflow_1.TicketWorkflowEngine();
        this.knowledgeBase = new knowledge_base_1.KnowledgeBase();
    }
    // Public proxy methods for knowledge base feedback
    addKnowledgeFeedback(entryId, userId, rating, comment) {
        return this.knowledgeBase.addFeedback(entryId, userId, rating, comment);
    }
    getKnowledgeFeedback(entryId) {
        return this.knowledgeBase.getFeedback(entryId);
    }
    // Stubs for missing methods to resolve server.ts API usage errors
    addIntegration(dest) { return {}; }
    removeIntegration(id) { return true; }
    listIntegrations() { return []; }
    setIntegrationEnabled(id, enabled) { return true; }
    addAutoReplyRule(rule) { this.autoReplyRules.push(rule); return rule; }
    removeAutoReplyRule(id) { this.autoReplyRules = this.autoReplyRules.filter(r => r.id !== id); return true; }
    listAutoReplyRules() { return this.autoReplyRules; }
    addEscalationRule(rule) { this.escalationRules.push(rule); return rule; }
    removeEscalationRule(id) { this.escalationRules = this.escalationRules.filter(r => r.id !== id); return true; }
    listEscalationRules() { return this.escalationRules; }
    createTicket(data) {
        const ticket = {
            ...data,
            id: Math.random().toString(36).slice(2),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            interactions: [],
        };
        this.tickets.push(ticket);
        return ticket;
    }
    updateTicket(id, data) {
        const t = this.getTicket(id);
        if (!t)
            return undefined;
        Object.assign(t, data, { updatedAt: new Date().toISOString() });
        return t;
    }
    suggestKnowledge(input) {
        return this.knowledgeBase.suggest(input);
    }
    linkTickets(id1, id2) { return true; }
    mergeTickets(targetId, sourceId) { return true; }
    splitTicket(id, interactionIds) { return {}; }
    addWorkflowRule(rule) {
        return this.workflowEngine.addRule(rule);
    }
    removeWorkflowRule(id) {
        return this.workflowEngine.removeRule(id);
    }
    listWorkflowRules() {
        return this.workflowEngine.listRules();
    }
    getTicket(id) {
        return this.tickets.find(x => x.id === id);
    }
    listTickets(filter) {
        return this.tickets.filter(t => (!filter?.userId || t.userId === filter.userId) &&
            (!filter?.status || t.status === filter.status) &&
            (!filter?.priority || t.priority === filter.priority) &&
            (!filter?.department || t.department === filter.department));
    }
    addInteraction(ticketId, userId, message, internal = false) {
        const t = this.getTicket(ticketId);
        if (!t)
            return undefined;
        const i = {
            id: Math.random().toString(36).slice(2),
            ticketId,
            userId,
            message,
            createdAt: new Date().toISOString(),
            internal,
        };
        t.interactions.push(i);
        this.interactions.push(i);
        t.updatedAt = new Date().toISOString();
        // الرد التلقائي
        if (!internal) {
            for (const rule of this.autoReplyRules.filter(r => r.enabled)) {
                if (message.includes(rule.keyword)) {
                    const autoReply = {
                        id: Math.random().toString(36).slice(2),
                        ticketId,
                        userId: 'auto-reply',
                        message: rule.reply,
                        createdAt: new Date().toISOString(),
                        internal: false,
                    };
                    t.interactions.push(autoReply);
                    this.interactions.push(autoReply);
                }
            }
        }
        return i;
    }
    // التصعيد الذكي: فحص التذاكر غير المحلولة وتصعيدها حسب القواعد
    autoEscalate(notifyFn) {
        const now = Date.now();
        for (const rule of this.escalationRules.filter(r => r.enabled)) {
            for (const t of this.tickets.filter(t => t.priority === rule.priority && t.status !== rule.targetStatus)) {
                const hours = (now - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60);
                if (hours >= rule.maxHours) {
                    t.status = rule.targetStatus;
                    t.updatedAt = new Date().toISOString();
                    notifyFn(rule.notifyChannels, t);
                }
            }
        }
    }
    listInteractions(ticketId) {
        return this.interactions.filter(i => i.ticketId === ticketId);
    }
}
exports.SmartTicketing = SmartTicketing;
