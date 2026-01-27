"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AITicketClassifier = void 0;
const KEYWORDS = {
    technical: ['error', 'bug', 'crash', 'issue', 'problem', 'fail'],
    billing: ['invoice', 'payment', 'refund', 'charge', 'billing'],
    account: ['login', 'password', 'account', 'signup', 'register'],
    feature_request: ['feature', 'request', 'add', 'improve', 'enhance'],
    other: []
};
class AITicketClassifier {
    classify(ticket) {
        const text = `${ticket.title} ${ticket.description}`.toLowerCase();
        for (const [cat, words] of Object.entries(KEYWORDS)) {
            if (words.some(w => text.includes(w)))
                return cat;
        }
        return 'other';
    }
}
exports.AITicketClassifier = AITicketClassifier;
