import config from './config';
import { UserProfile } from './user-profile';
import fetch from 'node-fetch';

export class AIRecommender {
  openaiApiKey: string;
  constructor(openaiApiKey: string) {
    this.openaiApiKey = openaiApiKey;
  }

  async recommend(user: UserProfile, items: string[], context?: string): Promise<string[]> {
    // Use OpenAI API to rank items for the user
    const prompt = `User: ${user.name} (${user.email})\nContext: ${context || 'N/A'}\nItems: ${items.join(', ')}\nRank the items in order of best fit for this user, return as a comma-separated list.`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
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
    const data: any = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    return text.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
}

if (!config.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in config.');
}
export const aiRecommender = new AIRecommender(config.OPENAI_API_KEY);
