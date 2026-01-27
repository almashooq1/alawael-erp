"use strict";
// Self-Evaluation Module
// Evaluates AI responses and tracks quality for self-improvement
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfEvaluator = void 0;
const interaction_logger_1 = require("./interaction-logger");
class SelfEvaluator {
    // Simple heuristic: penalize very short/empty or repeated answers
    static evaluate(log) {
        let score = 5;
        let reason = '';
        if (!log.output || log.output.length < 5) {
            score = 1;
            reason = 'Empty or too short response';
        }
        else if (log.input && log.output && log.output.trim() === log.input.trim()) {
            score = 2;
            reason = 'Echoed input';
        }
        return { log, score, reason };
    }
    static evaluateAll() {
        return interaction_logger_1.InteractionLogger.getAll().map(SelfEvaluator.evaluate);
    }
    static averageScore() {
        const results = SelfEvaluator.evaluateAll();
        if (!results.length)
            return 0;
        return results.reduce((sum, r) => sum + r.score, 0) / results.length;
    }
}
exports.SelfEvaluator = SelfEvaluator;
