"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeRootCause = analyzeRootCause;
const ai_provider_1 = require("./ai-provider");
// Root cause analysis for compliance violations using AI
async function analyzeRootCause(event) {
    const ai = new ai_provider_1.AIProviderManager({ provider: 'openai' }); // or configurable
    const prompt = `You are a compliance expert AI. Given the following event, explain the most likely root cause and suggest actionable recommendations.\n\nEvent:\n${JSON.stringify(event, null, 2)}\n\nRoot Cause and Recommendations:`;
    const result = await ai.chat(prompt);
    return result;
}
