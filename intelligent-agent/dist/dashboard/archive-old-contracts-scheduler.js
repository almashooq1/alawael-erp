"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// أرشفة العقود المنتهية تلقائياً بعد 90 يوم
const contract_manager_1 = require("../src/modules/contract-manager");
const scheduler_1 = require("../src/modules/scheduler");
const ARCHIVE_AFTER_DAYS = 90;
const scheduler = new scheduler_1.Scheduler();
function archiveOldContracts() {
    const manager = new contract_manager_1.ContractManager();
    const now = new Date();
    const contracts = manager.listContracts();
    for (const c of contracts) {
        if ((c.status === 'expired' || c.status === 'terminated') && !c.metadata?.archived) {
            const end = new Date(c.endDate);
            const daysSinceEnd = (now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceEnd >= ARCHIVE_AFTER_DAYS) {
                c.metadata = { ...c.metadata, archived: true, archivedAt: now.toISOString() };
            }
        }
    }
}
// جدولة الأرشفة يومياً
scheduler.repeat(24 * 60 * 60 * 1000, archiveOldContracts);
console.log('Archive old contracts scheduler started.');
