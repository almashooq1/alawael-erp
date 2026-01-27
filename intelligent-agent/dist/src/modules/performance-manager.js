"use strict";
// src/modules/performance-manager.ts
// Advanced Performance Management Module
// Provides KPIs, goals, reviews, and performance tracking for users and teams
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceManager = void 0;
const kpis = [];
const performanceRecords = [];
const goals = [];
function generateId() {
    return 'P' + Math.random().toString(36).slice(2, 10);
}
class PerformanceManager {
    // KPI management
    listKPIs() { return kpis; }
    getKPI(id) { return kpis.find(k => k.id === id); }
    createKPI(data) {
        const kpi = { id: generateId(), ...data };
        kpis.push(kpi);
        return kpi;
    }
    updateKPI(id, data) {
        const k = kpis.find(k => k.id === id);
        if (!k)
            return null;
        Object.assign(k, data);
        return k;
    }
    deleteKPI(id) {
        const idx = kpis.findIndex(k => k.id === id);
        if (idx === -1)
            return false;
        kpis.splice(idx, 1);
        return true;
    }
    // Performance records
    listPerformance(userId) {
        return userId ? performanceRecords.filter(r => r.userId === userId) : performanceRecords;
    }
    addPerformanceRecord(data) {
        const rec = { id: generateId(), ...data };
        performanceRecords.push(rec);
        return rec;
    }
    // Goals
    listGoals(userId) {
        return userId ? goals.filter(g => g.userId === userId) : goals;
    }
    createGoal(data) {
        const goal = { id: generateId(), status: data.status || 'active', ...data };
        goals.push(goal);
        return goal;
    }
    updateGoal(id, data) {
        const g = goals.find(g => g.id === id);
        if (!g)
            return null;
        Object.assign(g, data);
        return g;
    }
    deleteGoal(id) {
        const idx = goals.findIndex(g => g.id === id);
        if (idx === -1)
            return false;
        goals.splice(idx, 1);
        return true;
    }
}
exports.PerformanceManager = PerformanceManager;
