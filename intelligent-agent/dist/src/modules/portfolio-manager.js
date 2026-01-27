"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioManager = void 0;
class PortfolioManager {
    constructor(projectManager) {
        this.projectManager = projectManager;
        this.portfolios = [];
    }
    createPortfolio(data) {
        const p = {
            ...data,
            id: Math.random().toString(36).slice(2),
            projectIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.portfolios.push(p);
        return p;
    }
    addProjectToPortfolio(portfolioId, projectId) {
        const portfolio = this.portfolios.find(p => p.id === portfolioId);
        const project = this.projectManager.getProject(projectId);
        if (!portfolio || !project)
            return false;
        if (!portfolio.projectIds.includes(projectId))
            portfolio.projectIds.push(projectId);
        portfolio.updatedAt = new Date().toISOString();
        return true;
    }
    removeProjectFromPortfolio(portfolioId, projectId) {
        const portfolio = this.portfolios.find(p => p.id === portfolioId);
        if (!portfolio)
            return false;
        portfolio.projectIds = portfolio.projectIds.filter(id => id !== projectId);
        portfolio.updatedAt = new Date().toISOString();
        return true;
    }
    listPortfolios() {
        return this.portfolios;
    }
    getPortfolio(id) {
        return this.portfolios.find(p => p.id === id);
    }
    listProjectsInPortfolio(portfolioId) {
        const portfolio = this.getPortfolio(portfolioId);
        if (!portfolio)
            return [];
        return portfolio.projectIds.map(id => this.projectManager.getProject(id)).filter(Boolean);
    }
}
exports.PortfolioManager = PortfolioManager;
