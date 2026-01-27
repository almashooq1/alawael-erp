"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// جدولة تنبيهات العقود الذكية
const scheduler_1 = require("./scheduler");
const contract_smart_alerts_1 = require("./contract-smart-alerts");
const scheduler = new scheduler_1.Scheduler();
// كل يوم الساعة 8 صباحًا
scheduler.repeat(24 * 60 * 60 * 1000, () => {
    (0, contract_smart_alerts_1.checkAndSendSmartContractAlerts)();
});
