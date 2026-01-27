import { AIChat } from '../src/modules/ai-chat';

describe('AIChat', () => {
  it('should reply to greeting', async () => {
    const ai = new AIChat();
    const reply = await ai.chat('مرحبا');
    expect(reply).toContain('مرحباً');
  });
});
