"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scheduler_1 = require("../src/modules/scheduler");
const contract_smart_alerts_1 = require("../src/modules/contract-smart-alerts");
// جدولة التنبيهات الذكية للعقود كل ساعة
const scheduler = new scheduler_1.Scheduler();
scheduler.repeat(60 * 60 * 1000, () => {
    (0, contract_smart_alerts_1.checkAndSendSmartContractAlerts)().catch(console.error);
});
console.log('Smart contract alerts scheduler started.');
