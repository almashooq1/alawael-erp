// Project Portfolio Management Module
// Manages multiple projects as a portfolio, with advanced analytics and reporting
import { SmartProjectManager, Project } from './smart-project-manager';

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  projectIds: string[];
  createdAt: string;
  updatedAt: string;
}

export class PortfolioManager {
  private portfolios: Portfolio[] = [];
  constructor(private projectManager: SmartProjectManager) {}

  createPortfolio(data: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt' | 'projectIds'>): Portfolio {
    const p: Portfolio = {
      ...data,
      id: Math.random().toString(36).slice(2),
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.portfolios.push(p);
    return p;
  }

  addProjectToPortfolio(portfolioId: string, projectId: string): boolean {
    const portfolio = this.portfolios.find(p => p.id === portfolioId);
    const project = this.projectManager.getProject(projectId);
    if (!portfolio || !project) return false;
    if (!portfolio.projectIds.includes(projectId)) portfolio.projectIds.push(projectId);
    portfolio.updatedAt = new Date().toISOString();
    return true;
  }

  removeProjectFromPortfolio(portfolioId: string, projectId: string): boolean {
    const portfolio = this.portfolios.find(p => p.id === portfolioId);
    if (!portfolio) return false;
    portfolio.projectIds = portfolio.projectIds.filter(id => id !== projectId);
    portfolio.updatedAt = new Date().toISOString();
    return true;
  }

  listPortfolios(): Portfolio[] {
    return this.portfolios;
  }

  getPortfolio(id: string): Portfolio | undefined {
    return this.portfolios.find(p => p.id === id);
  }

  listProjectsInPortfolio(portfolioId: string): Project[] {
    const portfolio = this.getPortfolio(portfolioId);
    if (!portfolio) return [];
    return portfolio.projectIds.map(id => this.projectManager.getProject(id)).filter(Boolean) as Project[];
  }
}
