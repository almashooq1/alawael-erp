"use strict";
// index.ts
// 🧠 AGI System - Main Export File
// Central export point for all AGI components
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPONENTS = exports.VERSION = exports.server = exports.agiRoutes = exports.AGIContextUnderstanding = exports.AGILongtermPlanning = exports.AGICreativityInnovation = exports.AGIAutonomousDecision = exports.AGIContinualLearning = exports.AGIReasoningEngine = exports.AGICoreSystem = void 0;
// Core System
var agi_core_1 = require("./agi.core");
Object.defineProperty(exports, "AGICoreSystem", { enumerable: true, get: function () { return __importDefault(agi_core_1).default; } });
// Components
var reasoning_engine_1 = require("./reasoning.engine");
Object.defineProperty(exports, "AGIReasoningEngine", { enumerable: true, get: function () { return reasoning_engine_1.AGIReasoningEngine; } });
var continual_learning_1 = require("./continual.learning");
Object.defineProperty(exports, "AGIContinualLearning", { enumerable: true, get: function () { return continual_learning_1.AGIContinualLearning; } });
var autonomous_decision_1 = require("./autonomous.decision");
Object.defineProperty(exports, "AGIAutonomousDecision", { enumerable: true, get: function () { return autonomous_decision_1.AGIAutonomousDecision; } });
var creativity_innovation_1 = require("./creativity.innovation");
Object.defineProperty(exports, "AGICreativityInnovation", { enumerable: true, get: function () { return __importDefault(creativity_innovation_1).default; } });
var longterm_planning_1 = require("./longterm.planning");
Object.defineProperty(exports, "AGILongtermPlanning", { enumerable: true, get: function () { return __importDefault(longterm_planning_1).default; } });
var context_understanding_1 = require("./context.understanding");
Object.defineProperty(exports, "AGIContextUnderstanding", { enumerable: true, get: function () { return __importDefault(context_understanding_1).default; } });
// API Routes
var agi_routes_1 = require("./agi.routes");
Object.defineProperty(exports, "agiRoutes", { enumerable: true, get: function () { return __importDefault(agi_routes_1).default; } });
// Server
var server_1 = require("./server");
Object.defineProperty(exports, "server", { enumerable: true, get: function () { return __importDefault(server_1).default; } });
// Version
exports.VERSION = '1.0.0';
exports.COMPONENTS = [
    'Reasoning Engine',
    'Continual Learning',
    'Autonomous Decision',
    'Creativity & Innovation',
    'Long-term Planning',
    'Context Understanding',
];
console.log('🧠 AGI System v' + exports.VERSION + ' loaded successfully!');
