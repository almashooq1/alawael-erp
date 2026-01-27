"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContractReport = getContractReport;
// تقارير وتحليلات العقود
const contract_manager_1 = require("./contract-manager");
function getContractReport() {
    const manager = new contract_manager_1.ContractManager();
    const contracts = manager.listContracts();
    const now = new Date();
    let soonToExpire = 0;
    const byParty = {};
    for (const c of contracts) {
        for (const p of c.parties)
            byParty[p] = (byParty[p] || 0) + 1;
        const end = new Date(c.endDate);
        if (c.status === 'active' && end > now && end <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))
            soonToExpire++;
    }
    const totalValue = contracts.reduce((sum, c) => sum + (c.value || 0), 0);
    return {
        total: contracts.length,
        active: contracts.filter(c => c.status === 'active').length,
        expired: contracts.filter(c => c.status === 'expired').length,
        terminated: contracts.filter(c => c.status === 'terminated').length,
        pending: contracts.filter(c => c.status === 'pending').length,
        totalValue,
        avgValue: contracts.length ? Math.round(totalValue / contracts.length) : 0,
        soonToExpire,
        byParty
    };
}
