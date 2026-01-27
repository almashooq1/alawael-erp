"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentimentAnalyzer = void 0;
exports.saveSentimentResult = saveSentimentResult;
exports.searchSentimentResults = searchSentimentResults;
exports.batchAnalyze = batchAnalyze;
// تخزين النتائج في الذاكرة
const sentimentResults = [];
function saveSentimentResult(result) {
    sentimentResults.push(result);
}
function searchSentimentResults(filter) {
    if (!filter)
        return sentimentResults;
    return sentimentResults.filter(r => Object.entries(filter).every(([k, v]) => r[k] === v));
}
async function batchAnalyze(analyzer, texts) {
    const results = [];
    for (const text of texts) {
        const r = await analyzer.analyze(text);
        results.push(r);
        saveSentimentResult(r);
    }
    // إحصائيات
    const stats = {
        total: results.length,
        positive: results.filter(r => r.sentiment === 'positive').length,
        negative: results.filter(r => r.sentiment === 'negative').length,
        neutral: results.filter(r => r.sentiment === 'neutral').length,
        avgScore: results.reduce((a, b) => a + b.score, 0) / (results.length || 1)
    };
    return { results, stats };
}
// وحدة تحليل المشاعر (Sentiment Analysis)
const node_fetch_1 = __importDefault(require("node-fetch"));
class SentimentAnalyzer {
    // استخدم نموذج بسيط أو API خارجي (OpenAI)
    async analyze(text) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey)
            throw new Error('OPENAI_API_KEY not set');
        const prompt = `Analyze the following text and return a JSON object with these fields: sentiment (positive, negative, neutral), score (-1 to 1), confidence (0-1), emotion (main emotion word), language (ISO code), and echo the text.\nText: ${text}`;
        const res = await (0, node_fetch_1.default)('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: 'You are a professional sentiment and emotion analysis engine. Always return valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 100
            })
        });
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        try {
            const result = JSON.parse(content);
            return result;
        }
        catch {
            // fallback: try to extract fields manually
            return {
                sentiment: 'neutral',
                score: 0,
                confidence: 0.5,
                emotion: 'neutral',
                language: 'und',
                text
            };
        }
    }
}
exports.SentimentAnalyzer = SentimentAnalyzer;
