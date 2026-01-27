// Advanced Project Financial Management & Budgeting Module
// Tracks budgets, costs, and forecasts for projects
import { Project } from './smart-project-manager';

export interface ProjectBudget {
  id: string;
  projectId: string;
  initialBudget: number;
  spent: number;
  forecast: number;
  currency: string;
  status: 'on_track' | 'over_budget' | 'under_budget';
  createdAt: string;
  updatedAt: string;
}

export class FinanceManager {
  private budgets: ProjectBudget[] = [];

  setBudget(data: Omit<ProjectBudget, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'spent' | 'forecast'>): ProjectBudget {
    const b: ProjectBudget = {
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

  addExpense(projectId: string, amount: number): boolean {
    const b = this.budgets.find(x => x.projectId === projectId);
    if (!b) return false;
    b.spent += amount;
    b.forecast = Math.max(b.spent, b.forecast);
    b.status = b.spent > b.initialBudget ? 'over_budget' : (b.spent < b.initialBudget ? 'under_budget' : 'on_track');
    b.updatedAt = new Date().toISOString();
    return true;
  }

  updateForecast(projectId: string, forecast: number): boolean {
    const b = this.budgets.find(x => x.projectId === projectId);
    if (!b) return false;
    b.forecast = forecast;
    b.status = b.spent > b.forecast ? 'over_budget' : (b.spent < b.forecast ? 'under_budget' : 'on_track');
    b.updatedAt = new Date().toISOString();
    return true;
  }

  getBudget(projectId: string): ProjectBudget | undefined {
    return this.budgets.find(b => b.projectId === projectId);
  }

  listBudgets(): ProjectBudget[] {
    return this.budgets;
  }
}
