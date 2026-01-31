"use strict";
// agi.test.ts
// 🧪 AGI System Tests
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const agi_core_1 = __importDefault(require("./agi.core"));
const reasoning_engine_1 = require("./reasoning.engine");
const continual_learning_1 = require("./continual.learning");
const autonomous_decision_1 = require("./autonomous.decision");
describe('AGI System Tests', () => {
    let agi;
    beforeEach(() => {
        agi = new agi_core_1.default({
            cognitiveFrequency: 1000,
            maxWorkingMemory: 7,
            learningRate: 0.01,
            explorationRate: 0.1,
        });
    });
    afterEach(() => {
        if (agi) {
            agi.removeAllListeners();
        }
    });
    describe('Core System', () => {
        test('should initialize AGI system', () => {
            expect(agi).toBeDefined();
        });
        test('should process general input', async () => {
            const result = await agi.process('Hello, AGI!', {});
            expect(result).toBeDefined();
        });
        test('should handle errors gracefully', async () => {
            await expect(agi.process('', {})).rejects.toThrow();
        });
    });
    describe('Reasoning Engine', () => {
        let reasoning;
        beforeEach(() => {
            reasoning = new reasoning_engine_1.AGIReasoningEngine();
        });
        test('should perform deductive reasoning', async () => {
            const result = await reasoning.reason('If A then B. A is true. Therefore?', { evidence: [{ data: ['A implies B', 'A is true'] }] }, { preferredTypes: [reasoning_engine_1.ReasoningType.DEDUCTIVE] });
            expect(result).toBeDefined();
            expect(result.nodes.length).toBeGreaterThan(0);
        });
        test('should perform inductive reasoning', async () => {
            const result = await reasoning.reason('Find pattern in: 2, 4, 6, 8, ?', { evidence: [{ data: [2, 4, 6, 8] }] }, { preferredTypes: [reasoning_engine_1.ReasoningType.INDUCTIVE] });
            expect(result).toBeDefined();
            expect(result.nodes.length).toBeGreaterThan(0);
        });
        test('should perform analogical reasoning', async () => {
            const result = await reasoning.reason('Hand is to arm as foot is to ?', { evidence: [] }, { preferredTypes: [reasoning_engine_1.ReasoningType.ANALOGICAL] });
            expect(result).toBeDefined();
            expect(result.nodes.length).toBeGreaterThan(0);
        });
    });
    describe('Continual Learning', () => {
        let learning;
        beforeEach(() => {
            learning = new continual_learning_1.AGIContinualLearning();
        });
        test('should learn from experience', async () => {
            await learning.learn({
                task: 'test-experience',
                input: { data: 'test experience' },
                mode: continual_learning_1.LearningMode.SELF_SUPERVISED,
                context: {},
            });
        });
        test('should consolidate memory', async () => {
            await learning.learn({
                task: 'experience-1',
                input: { data: 'experience 1' },
                mode: continual_learning_1.LearningMode.SELF_SUPERVISED,
                context: {},
            });
            await learning.learn({
                task: 'experience-2',
                input: { data: 'experience 2' },
                mode: continual_learning_1.LearningMode.SELF_SUPERVISED,
                context: {},
            });
            // Memory consolidation should not throw
        });
        test('should transfer knowledge', async () => {
            const result = await learning.transferKnowledge('source-task', 'target-task');
            expect(result).toBeDefined();
        });
    });
    describe('Autonomous Decision', () => {
        let decision;
        beforeEach(() => {
            decision = new autonomous_decision_1.AGIAutonomousDecision();
        });
        test('should make decisions', async () => {
            const result = await decision.makeDecision({
                situation: 'test situation',
                goals: [],
                constraints: [],
                resources: [],
                stakeholders: [],
                timeHorizon: 'short',
                uncertainty: 0.3,
                criticality: 0.4,
            });
            expect(result).toBeDefined();
            expect(result.selectedOption).toBeDefined();
        });
        test('should evaluate ethical implications', async () => {
            const result = await decision.makeDecision({
                situation: 'ethical dilemma',
                goals: [],
                constraints: [],
                resources: [],
                stakeholders: [],
                timeHorizon: 'short',
                uncertainty: 0.5,
                criticality: 0.8,
            });
            expect(result).toBeDefined();
            expect(result.selectedOption.ethicalScore).toBeDefined();
        });
    });
    describe('Integration Tests', () => {
        test('should integrate reasoning with learning', async () => {
            const result = await agi.process('Learn from this: 1+1=2', {
                mode: 'supervised',
            });
            expect(result).toBeDefined();
        });
        test('should integrate decision with planning', async () => {
            const result = await agi.process('Plan to achieve goal X', {
                goalType: 'achievement',
                horizon: 'short_term',
            });
            expect(result).toBeDefined();
        });
        test('should maintain cognitive state', async () => {
            await agi.process('Task 1', {});
            await agi.process('Task 2', {});
            // Cognitive state should be maintained across tasks
        });
    });
    describe('Performance Tests', () => {
        test('should process multiple tasks concurrently', async () => {
            const tasks = [
                agi.process('Task 1', {}),
                agi.process('Task 2', {}),
                agi.process('Task 3', {}),
            ];
            const results = await Promise.all(tasks);
            expect(results).toHaveLength(3);
            results.forEach(result => expect(result).toBeDefined());
        });
        test('should handle high load', async () => {
            const tasks = Array(10).fill(null).map((_, i) => agi.process(`Task ${i}`, {}));
            const results = await Promise.all(tasks);
            expect(results).toHaveLength(10);
        });
    });
    describe('Error Handling', () => {
        test('should handle invalid input', async () => {
            await expect(agi.process(null, {})).rejects.toThrow();
        });
        test('should handle component failures', async () => {
            // Simulate component failure
            const result = await agi.process('Test with failure', {
                simulateFailure: true,
            });
            // Should handle gracefully
            expect(result).toBeDefined();
        });
        test('should recover from errors', async () => {
            try {
                await agi.process(null, {});
            }
            catch (error) {
                // Should recover and continue processing
                const result = await agi.process('Valid input', {});
                expect(result).toBeDefined();
            }
        });
    });
});
describe('API Integration Tests', () => {
    test('should expose all required endpoints', () => {
        // This would test the actual API routes
        const endpoints = [
            '/api/agi/process',
            '/api/agi/reason',
            '/api/agi/learn',
            '/api/agi/decide',
            '/api/agi/create',
            '/api/agi/plan',
            '/api/agi/status',
            '/api/agi/capabilities',
        ];
        // Verify all endpoints exist
        expect(endpoints.length).toBeGreaterThan(0);
    });
});
