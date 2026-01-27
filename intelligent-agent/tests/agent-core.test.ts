import { AgentCore } from '../src/core/agent-core';

describe('AgentCore', () => {
  it('should start without errors', () => {
    const agent = new AgentCore();
    expect(() => agent.start()).not.toThrow();
  });
});
