"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContractsWithRisk = getContractsWithRisk;
exports.analyzeContractsSmartly = analyzeContractsSmartly;
// إرجاع العقود مع تصنيف المخاطر
function getContractsWithRisk() {
    const manager = new contract_manager_1.ContractManager();
    const contracts = manager.listContracts();
    const analysis = analyzeContractsSmartly();
    return contracts.map(c => {
        const a = analysis.find(a => a.contractId === c.id);
        return {
            ...c,
            riskLevel: a?.riskLevel || 'غير محدد',
            recommendation: a?.recommendation || '',
            daysToExpire: a?.daysToExpire ?? null
        };
    });
}
// تحليلات وتوصيات ذكية للعقود
const contract_manager_1 = require("./contract-manager");
function analyzeContractsSmartly() {
    const manager = new contract_manager_1.ContractManager();
    const contracts = manager.listContracts();
    const now = new Date();
    // حساب متوسطات تاريخية
    const avgValue = contracts.length ? contracts.reduce((sum, c) => sum + (c.value || 0), 0) / contracts.length : 0;
    return contracts.map((c) => {
        const end = new Date(c.endDate);
        const daysToExpire = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let risk = 'منخفض';
        let rec = 'العقد في وضع جيد.';
        // منطق تقليدي
        if (c.status === 'terminated') {
            risk = 'مرتفع';
            rec = 'العقد منتهي مبكراً. راجع الأسباب.';
        }
        else if (c.status === 'pending') {
            risk = 'متوسط';
            rec = 'العقد معلق. يفضل المتابعة مع الأطراف.';
        }
        else if (c.status === 'active') {
            if (daysToExpire <= 7) {
                risk = 'مرتفع';
                rec = 'ينصح بالتجديد أو إعادة التفاوض فوراً.';
            }
            else if (daysToExpire <= 30) {
                risk = 'متوسط';
                rec = 'اقترب موعد انتهاء العقد. راجع الشروط.';
            }
        }
        else if (c.status === 'expired') {
            risk = 'مرتفع';
            rec = 'العقد منتهي. تحقق من الحاجة للتجديد.';
        }
        // منطق AI مبسط: إذا القيمة أعلى من المتوسط بكثير أو الطرف متكرر في عقود منتهية مبكراً، زد المخاطر
        let aiScore = 0;
        if (c.value > avgValue * 2)
            aiScore += 1;
        const terminatedParties = contracts.filter(x => x.status === 'terminated').flatMap(x => x.parties);
        if (c.parties.some(p => terminatedParties.includes(p)))
            aiScore += 1;
        if (daysToExpire < 0)
            aiScore += 1;
        if (aiScore >= 2) {
            risk = 'مرتفع';
            rec += ' (توصية AI: راقب القيمة العالية أو الأطراف ذات سجل إنهاء مبكر)';
        }
        else if (aiScore === 1 && risk !== 'مرتفع') {
            risk = 'متوسط';
            rec += ' (توصية AI: انتبه لمؤشرات المخاطر)';
        }
        return {
            contractId: c.id,
            riskLevel: risk,
            recommendation: rec,
            daysToExpire
        };
    });
}
