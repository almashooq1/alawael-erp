#!/usr/bin/env node
// CLI بسيط لإدارة النظام الذكي
import { AgentCore } from './core/agent-core';

const agent = new AgentCore();

const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case 'start':
    agent.start();
    break;
  case 'nlp':
    const text = args.join(' ');
    if (!text) {
      console.log('يرجى إدخال نص للتحليل');
      process.exit(1);
    }
    const result = agent.nlp.analyzeText(text);
    console.log('NLP Result:', result);
    break;
  default:
    console.log('أوامر متاحة: start | nlp <text>');
}
