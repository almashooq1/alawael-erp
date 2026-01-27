// Self-Evaluation Module
// Evaluates AI responses and tracks quality for self-improvement

import { InteractionLog, InteractionLogger } from './interaction-logger';

export interface EvaluationResult {
  log: InteractionLog;
  score: number; // 1-5
  reason?: string;
}

export class SelfEvaluator {
  // Simple heuristic: penalize very short/empty or repeated answers
  static evaluate(log: InteractionLog): EvaluationResult {
    let score = 5;
    let reason = '';
    if (!log.output || log.output.length < 5) {
      score = 1;
      reason = 'Empty or too short response';
    } else if (log.input && log.output && log.output.trim() === log.input.trim()) {
      score = 2;
      reason = 'Echoed input';
    }
    return { log, score, reason };
  }
  static evaluateAll(): EvaluationResult[] {
    return InteractionLogger.getAll().map(SelfEvaluator.evaluate);
  }
  static averageScore(): number {
    const results = SelfEvaluator.evaluateAll();
    if (!results.length) return 0;
    return results.reduce((sum, r) => sum + r.score, 0) / results.length;
  }
}
