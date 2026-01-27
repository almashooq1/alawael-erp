"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRecommender = exports.AIRecommender = void 0;
const config_1 = __importDefault(require("./config"));
const node_fetch_1 = __importDefault(require("node-fetch"));
class AIRecommender {
    constructor(openaiApiKey) {
        this.openaiApiKey = openaiApiKey;
    }
    async recommend(user, items, context) {
        // Use OpenAI API to rank items for the user
        const prompt = `User: ${user.name} (${user.email})\nContext: ${context || 'N/A'}\nItems: ${items.join(', ')}\nRank the items in order of best fit for this user, return as a comma-separated list.`;
        const res = await (0, node_fetch_1.default)('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.openaiApiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: 'You are a smart recommendation engine.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 100
            })
        });
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        return text.split(',').map((s) => s.trim()).filter(Boolean);
    }
}
exports.AIRecommender = AIRecommender;
if (!config_1.default.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in config.');
}
exports.aiRecommender = new AIRecommender(config_1.default.OPENAI_API_KEY);
