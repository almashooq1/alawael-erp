// index.ts
// 🧠 AGI System - Main Export File
// Central export point for all AGI components

// Core System
export { default as AGICoreSystem } from './agi.core';

// Components
export { AGIReasoningEngine } from './reasoning.engine';
export { AGIContinualLearning } from './continual.learning';
export { AGIAutonomousDecision } from './autonomous.decision';
export { default as AGICreativityInnovation } from './creativity.innovation';
export { default as AGILongtermPlanning } from './longterm.planning';
export { default as AGIContextUnderstanding } from './context.understanding';

// API Routes
export { default as agiRoutes } from './agi.routes';

// Server
export { default as server } from './server';

// Version
export const VERSION = '1.0.0';
export const COMPONENTS = [
  'Reasoning Engine',
  'Continual Learning',
  'Autonomous Decision',
  'Creativity & Innovation',
  'Long-term Planning',
  'Context Understanding',
];

console.log('🧠 AGI System v' + VERSION + ' loaded successfully!');
