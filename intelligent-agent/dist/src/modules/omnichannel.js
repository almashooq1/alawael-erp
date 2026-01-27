"use strict";
// src/modules/omnichannel.ts
// Omnichannel Support Module (WhatsApp, Email, Web)
Object.defineProperty(exports, "__esModule", { value: true });
exports.Omnichannel = void 0;
const messages = [];
function generateId() {
    return 'OM' + Math.random().toString(36).slice(2, 10);
}
class Omnichannel {
    listMessages(channel) {
        return channel ? messages.filter(m => m.channel === channel) : messages;
    }
    getMessage(id) {
        return messages.find(m => m.id === id);
    }
    receiveMessage(data) {
        const msg = {
            id: generateId(),
            receivedAt: new Date().toISOString(),
            status: data.status || 'received',
            ...data,
        };
        messages.push(msg);
        return msg;
    }
    updateMessageStatus(id, status) {
        const m = messages.find(m => m.id === id);
        if (!m)
            return null;
        m.status = status;
        return m;
    }
}
exports.Omnichannel = Omnichannel;
