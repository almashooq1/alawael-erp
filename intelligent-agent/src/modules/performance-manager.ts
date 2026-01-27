// src/modules/performance-manager.ts
// Advanced Performance Management Module
// Provides KPIs, goals, reviews, and performance tracking for users and teams

export interface KPI {
  id: string;
  name: string;
  description?: string;
  target: number;
  unit: string;
}

export interface PerformanceRecord {
  id: string;
  userId: string;
  kpiId: string;
  value: number;
  date: string;
  notes?: string;
}

export interface Goal {
  id: string;
  userId: string;
  kpiId: string;
  target: number;
  deadline: string;
  status: 'active' | 'completed' | 'missed';
}

const kpis: KPI[] = [];
const performanceRecords: PerformanceRecord[] = [];
const goals: Goal[] = [];

function generateId() {
  return 'P' + Math.random().toString(36).slice(2, 10);
}

export class PerformanceManager {
  // KPI management
  listKPIs() { return kpis; }
  getKPI(id: string) { return kpis.find(k => k.id === id); }
  createKPI(data: Omit<KPI, 'id'>) {
    const kpi: KPI = { id: generateId(), ...data };
    kpis.push(kpi);
    return kpi;
  }
  updateKPI(id: string, data: Partial<Omit<KPI, 'id'>>) {
    const k = kpis.find(k => k.id === id);
    if (!k) return null;
    Object.assign(k, data);
    return k;
  }
  deleteKPI(id: string) {
    const idx = kpis.findIndex(k => k.id === id);
    if (idx === -1) return false;
    kpis.splice(idx, 1);
    return true;
  }
  // Performance records
  listPerformance(userId?: string) {
    return userId ? performanceRecords.filter(r => r.userId === userId) : performanceRecords;
  }
  addPerformanceRecord(data: Omit<PerformanceRecord, 'id'>) {
    const rec: PerformanceRecord = { id: generateId(), ...data };
    performanceRecords.push(rec);
    return rec;
  }
  // Goals
  listGoals(userId?: string) {
    return userId ? goals.filter(g => g.userId === userId) : goals;
  }
  createGoal(data: Omit<Goal, 'id' | 'status'> & { status?: Goal['status'] }) {
    const goal: Goal = { id: generateId(), status: data.status || 'active', ...data };
    goals.push(goal);
    return goal;
  }
  updateGoal(id: string, data: Partial<Omit<Goal, 'id'>>) {
    const g = goals.find(g => g.id === id);
    if (!g) return null;
    Object.assign(g, data);
    return g;
  }
  deleteGoal(id: string) {
    const idx = goals.findIndex(g => g.id === id);
    if (idx === -1) return false;
    goals.splice(idx, 1);
    return true;
  }
}
