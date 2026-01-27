"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkContractExpirations = checkContractExpirations;
// تنبيهات انتهاء العقود
const scheduler_1 = require("./scheduler");
const contract_manager_1 = require("./contract-manager");
const notification_center_1 = require("./notification-center");
const scheduler = new scheduler_1.Scheduler();
const manager = new contract_manager_1.ContractManager();
const notifier = new notification_center_1.NotificationCenter();
function checkContractExpirations() {
    const now = new Date();
    const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 أيام
    for (const c of manager.listContracts()) {
        if (c.status === 'active') {
            const end = new Date(c.endDate);
            if (end > now && end <= soon) {
                notifier.sendNotification({
                    userId: 'admin',
                    title: `تنبيه انتهاء عقد: ${c.title}`,
                    message: `العقد مع ${c.parties.join(', ')} ينتهي بتاريخ ${c.endDate}`,
                    channel: 'in-app',
                });
            }
        }
    }
}
// جدولة الفحص يومياً
scheduler.repeat(24 * 60 * 60 * 1000, checkContractExpirations);
