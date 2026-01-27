"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIIntegration = void 0;
// تكامل مع OpenAI API (GPT)
const axios_1 = __importDefault(require("axios"));
const secrets_1 = require("./secrets");
class OpenAIIntegration {
    constructor() {
        this.apiKey = secrets_1.Secrets.get('OPENAI_API_KEY') || '';
    }
    async chat(prompt) {
        const res = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }]
        }, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        return res.data.choices[0].message.content;
    }
}
exports.OpenAIIntegration = OpenAIIntegration;
