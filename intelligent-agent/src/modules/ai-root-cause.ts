import { AIProviderManager } from './ai-provider';

// Root cause analysis for compliance violations using AI
export async function analyzeRootCause(event) {
  const ai = new AIProviderManager({ provider: 'openai' }); // or configurable
  const prompt = `You are a compliance expert AI. Given the following event, explain the most likely root cause and suggest actionable recommendations.\n\nEvent:\n${JSON.stringify(event, null, 2)}\n\nRoot Cause and Recommendations:`;
  const result = await ai.chat(prompt);
  return result;
}
