// تكامل مع OpenAI API (GPT)
import axios from 'axios';
import { Secrets } from './secrets';

export class OpenAIIntegration {
  private apiKey: string;
  constructor() {
    this.apiKey = Secrets.get('OPENAI_API_KEY') || '';
  }

  async chat(prompt: string): Promise<string> {
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return res.data.choices[0].message.content;
  }
}
