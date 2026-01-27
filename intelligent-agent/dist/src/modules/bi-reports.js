"use strict";
// Advanced Business Intelligence (BI) & Interactive Reporting Module
// Provides interactive dashboards, charts, and analytics for projects
Object.defineProperty(exports, "__esModule", { value: true });
exports.BIReports = void 0;
class BIReports {
    constructor() {
        this.reports = [];
    }
    createReport(title, type, data) {
        const r = {
            id: Math.random().toString(36).slice(2),
            title,
            type,
            data,
            createdAt: new Date().toISOString(),
        };
        this.reports.push(r);
        return r;
    }
    listReports() {
        return this.reports;
    }
    getReport(id) {
        return this.reports.find(r => r.id === id);
    }
}
exports.BIReports = BIReports;
