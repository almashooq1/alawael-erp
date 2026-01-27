"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceManager = void 0;
class FinanceManager {
    constructor() {
        this.budgets = [];
    }
    setBudget(data) {
        const b = {
            ...data,
            id: Math.random().toString(36).slice(2),
            spent: 0,
            forecast: data.initialBudget,
            status: 'on_track',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.budgets.push(b);
        return b;
    }
    addExpense(projectId, amount) {
        const b = this.budgets.find(x => x.projectId === projectId);
        if (!b)
            return false;
        b.spent += amount;
        b.forecast = Math.max(b.spent, b.forecast);
        b.status = b.spent > b.initialBudget ? 'over_budget' : (b.spent < b.initialBudget ? 'under_budget' : 'on_track');
        b.updatedAt = new Date().toISOString();
        return true;
    }
    updateForecast(projectId, forecast) {
        const b = this.budgets.find(x => x.projectId === projectId);
        if (!b)
            return false;
        b.forecast = forecast;
        b.status = b.spent > b.forecast ? 'over_budget' : (b.spent < b.forecast ? 'under_budget' : 'on_track');
        b.updatedAt = new Date().toISOString();
        return true;
    }
    getBudget(projectId) {
        return this.budgets.find(b => b.projectId === projectId);
    }
    listBudgets() {
        return this.budgets;
    }
}
exports.FinanceManager = FinanceManager;
