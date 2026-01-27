// تخزين النتائج في الذاكرة
const sentimentResults: SentimentResult[] = [];

export function saveSentimentResult(result: SentimentResult) {
  sentimentResults.push(result);
}

export function searchSentimentResults(filter?: Partial<SentimentResult>): SentimentResult[] {
  if (!filter) return sentimentResults;
  return sentimentResults.filter(r =>
    Object.entries(filter).every(([k, v]) => (r as any)[k] === v)
  );
}

export async function batchAnalyze(analyzer: SentimentAnalyzer, texts: string[]): Promise<{ results: SentimentResult[]; stats: any }> {
  const results: SentimentResult[] = [];
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
import fetch from 'node-fetch';

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  emotion: string;
  language: string;
  text: string;
}

export class SentimentAnalyzer {
  // استخدم نموذج بسيط أو API خارجي (OpenAI)
  async analyze(text: string): Promise<SentimentResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');
    const prompt = `Analyze the following text and return a JSON object with these fields: sentiment (positive, negative, neutral), score (-1 to 1), confidence (0-1), emotion (main emotion word), language (ISO code), and echo the text.\nText: ${text}`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
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
    const data: any = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    try {
      const result = JSON.parse(content);
      return result;
    } catch {
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
